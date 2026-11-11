const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu, Tray, Notification, nativeImage } = require('electron');
const { moveOne } = require('./fsops');
const { readNfe, hashFile } = require('./extras');
const { Worker } = require('worker_threads');
const crypto = require('crypto');
const { createWatcher } = require('./background');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();
if (process.env.PRUMO_TEST) global.prumoRequire = require; // só para testes automáticos
app.setAppUserModelId('org.prumo.app');

// ---- configuração salva em %APPDATA%\Prumo\prumo.json ----
const storeFile = () => path.join(app.getPath('userData'), 'prumo.json');
let state = {};
const oldStore = () => path.join(app.getPath('appData'), 'Arrumei', 'arrumei.json'); // versões antigas
const loadState = () => {
  for (const f of [storeFile(), oldStore()]) { try { state = JSON.parse(fsSync.readFileSync(f, 'utf8')); return; } catch {} }
  state = {};
};
// entradas do histórico de versões antigas não têm id
const fixIds = () => (state.history || []).forEach((e) => { if (!e.id) e.id = crypto.randomUUID(); });
const persist = () => { try { fsSync.mkdirSync(path.dirname(storeFile()), { recursive: true }); fsSync.writeFileSync(storeFile(), JSON.stringify(state, null, 1)); } catch {} };

// ---- nomes seguros para o Windows ----
function friendly(err) {
  if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) return 'arquivo em uso ou sem permissão';
  if (err.code === 'ENOENT') return 'arquivo não encontrado';
  if (err.code === 'ENOSPC') return 'disco cheio';
  return err.message;
}

// ---- leitura recursiva (até 4 níveis, 5000 arquivos) ----
async function walk(dir, root, out, depth) {
  if (out.length >= 5000 || depth > 4) return;
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('$') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, root, out, depth + 1);
    else if (e.isFile()) {
      try {
        const st = await fs.stat(p);
        out.push({ name: e.name, path: p, size: st.size, mtime: st.mtimeMs, atime: st.atimeMs, rel: path.relative(root, dir).split(path.sep).join('/') });
      } catch {}
    }
  }
}
async function scan(root) { const files = []; await walk(root, root, files, 0); return { root, files }; }

// ---- mover sem nunca sobrescrever ----
ipcMain.handle('state:get', () => state);
ipcMain.handle('state:set', (_e, k, v) => { if (['rules', 'board', 'prefs', 'bg', 'update', 'events', 'colors', 'meta', 'tagdefs', 'notes', 'recur'].includes(k)) { state[k] = v; persist(); if (k === 'bg') applyBg(); if (k === 'update') setupUpdater(); } });
// Após diálogos nativos o Windows pode deixar os campos de texto sem foco; devolve o foco à janela
const refocus = () => { if (mainWin && !mainWin.isDestroyed()) { mainWin.focus(); mainWin.webContents.focus(); } };
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  refocus();
  if (r.canceled) return null;
  state.root = r.filePaths[0]; persist();
  return scan(state.root);
});
ipcMain.handle('scan', (_e, root) => scan(root));
// favoritos e etiquetas ficam por caminho; acompanham o arquivo quando ele muda de lugar
const remapMeta = (from, to) => { const m = state.meta; if (m && m[from]) { m[to] = m[from]; delete m[from]; } };
const HMAX = 200, HDAYS = 90; // retenção do histórico (ver PRIVACIDADE.md)
const pruneHistory = () => { const lim = Date.now() - HDAYS * 864e5; state.history = (state.history || []).filter((e) => e.time >= lim).slice(-HMAX); };
const record = (items, extra) => { state.history = [...(state.history || []), { id: crypto.randomUUID(), time: Date.now(), items, ...extra }]; pruneHistory(); };
ipcMain.handle('apply', async (_e, { root, dest, ops, kind }) => {
  const res = [], done = [];
  for (const o of ops) {
    try {
      const to = await moveOne(dest || root || path.dirname(o.from), o);
      res.push({ from: o.from, to });
      if (to !== o.from) { done.push({ from: o.from, to }); remapMeta(o.from, to); }
    } catch (err) { res.push({ from: o.from, error: friendly(err) }); }
  }
  if (done.length) record(done, { kind: kind || 'org' });
  persist();
  return { res, undo: (state.history || []).length };
});
// desfaz itens de uma entrada do histórico (todos, ou só os índices pedidos)
async function undoEntry(id, idx) {
  const h = state.history || [], e = id == null ? h[h.length - 1] : h.find((x) => x.id === id);
  if (!e) return { ok: 0, fail: 0 };
  const pick = new Set(idx && idx.length ? idx : e.items.map((_, i) => i));
  let ok = 0, fail = 0; const keep = [];
  for (let i = e.items.length - 1; i >= 0; i--) {
    const { from, to } = e.items[i];
    if (!pick.has(i)) { keep.unshift(e.items[i]); continue; }
    try {
      if (await fs.access(from).then(() => true, () => false)) throw new Error('ocupado');
      await fs.mkdir(path.dirname(from), { recursive: true });
      await fs.rename(to, from); ok++; remapMeta(to, from);
      await fs.rmdir(path.dirname(to)).catch(() => {}); // remove pasta vazia criada pela organização
    } catch { fail++; keep.unshift(e.items[i]); }
  }
  e.items = keep;
  state.history = h.filter((x) => x.items.length); persist();
  return { ok, fail };
}
ipcMain.handle('undo', async () => ({ ...(await undoEntry(null)), undo: (state.history || []).length }));
ipcMain.handle('undo-items', async (_e, id, idx) => ({ ...(await undoEntry(id, idx)), undo: (state.history || []).length }));
ipcMain.handle('history', () => [...(state.history || [])].reverse().map((e) => ({ id: e.id, time: e.time, kind: e.kind || (e.auto ? 'auto' : 'org'), items: e.items.map((x) => ({ name: path.basename(x.to), from: x.from, to: x.to })) })));
ipcMain.handle('undo-info', () => {
  const h = state.history || [], l = h[h.length - 1];
  if (!l) return null;
  return { time: l.time, count: l.items.length, items: l.items.slice(0, 8).map((x) => ({ name: path.basename(x.to), back: path.dirname(x.from) })) };
});
ipcMain.handle('paths', () => ({ documents: app.getPath('documents'), downloads: app.getPath('downloads'), version: app.getVersion(), userData: app.getPath('userData') }));
ipcMain.handle('undo-count', () => (state.history || []).length);
ipcMain.handle('pick-dir', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  refocus();
  return r.canceled ? null : r.filePaths[0];
});
// pré-visualização de texto, Word (texto) e Excel (primeira planilha)
const TEXT = new Set(['txt', 'md', 'csv', 'json', 'xml', 'log', 'html', 'css', 'js', 'ini', 'yml', 'yaml']);
ipcMain.handle('preview', async (_e, p) => {
  try {
    const e = path.extname(p).slice(1).toLowerCase(), st = await fs.stat(p);
    if (TEXT.has(e)) {
      const fh = await fs.open(p, 'r'), buf = Buffer.alloc(Math.min(st.size, 65536));
      await fh.read(buf, 0, buf.length, 0); await fh.close();
      return { kind: 'text', text: buf.toString('utf8') };
    }
    if (st.size > 25e6) return { kind: 'none' };
    if (e === 'docx') {
      const r = await require('mammoth').extractRawText({ path: p });
      return { kind: 'text', text: r.value.slice(0, 8000) || '(documento sem texto)' };
    }
    if (e === 'xlsx') {
      const rows = await require('read-excel-file/node')(p);
      return { kind: 'table', rows: rows.slice(0, 40).map((r) => r.slice(0, 12).map((c) => (c instanceof Date ? c.toLocaleDateString('pt-BR') : c))) };
    }
  } catch { return { kind: 'error' }; }
  return { kind: 'none' };
});
ipcMain.handle('copy', (_e, t) => clipboard.writeText(String(t)));
// copia uma imagem das notas (arquivo salvo pelo Prumo ou imagem embutida)
ipcMain.handle('copy-img', (_e, src) => {
  src = String(src || '');
  let img;
  if (src.startsWith('data:image/')) img = nativeImage.createFromDataURL(src);
  else if (src.startsWith('file:///')) img = nativeImage.createFromPath(decodeURIComponent(src.slice(8)).split('/').join(path.sep));
  if (!img || img.isEmpty()) return false;
  clipboard.writeImage(img); return true;
});
ipcMain.handle('open', (_e, p) => shell.openPath(p));
ipcMain.handle('reveal', (_e, p) => shell.showItemInFolder(p));
// exclui para a Lixeira do Windows (nunca apaga de vez); só arquivos dentro da pasta aberta
ipcMain.handle('trash', async (_e, paths) => {
  const out = { done: [], failed: [] };
  const root = state.root ? path.resolve(state.root) : null;
  for (const p of Array.isArray(paths) ? paths : []) {
    try {
      const abs = path.resolve(String(p));
      const rel = root ? path.relative(root, abs) : '..';
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('fora da pasta');
      if (!(await fs.lstat(abs)).isFile()) throw new Error('não é arquivo');
      await shell.trashItem(abs);
      if (state.meta) delete state.meta[abs];
      out.done.push(p);
    } catch { out.failed.push(p); }
  }
  persist();
  return out;
});
// NF-e, duplicados e busca no conteúdo (extras.js); só arquivos dentro da pasta aberta
const insideRoot = (p) => { if (!state.root) return false; const r = path.relative(path.resolve(state.root), path.resolve(String(p))); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
ipcMain.handle('nfe', async (_e, paths) => {
  const out = [];
  for (const p of (paths || []).filter(insideRoot)) { try { const n = await readNfe(p); if (n) out.push({ path: p, ...n }); } catch {} }
  return out;
});
ipcMain.handle('hash', async (_e, paths) => {
  const out = {};
  for (const p of (paths || []).filter(insideRoot)) { try { out[p] = await hashFile(p); } catch {} }
  return out;
});
// busca no conteúdo num worker: ler PDF/Word/Excel no processo principal travava a janela
let sWorker = null, sId = 0;
const sWait = new Map();
function searchWorker() {
  if (sWorker) return sWorker;
  sWorker = new Worker(path.join(__dirname, 'search-worker.js'));
  sWorker.on('message', ({ id, r }) => { const f = sWait.get(id); if (f) { sWait.delete(id); f(r); } });
  const reset = () => { for (const f of sWait.values()) f([]); sWait.clear(); sWorker = null; };
  sWorker.on('error', reset); sWorker.on('exit', reset);
  return sWorker;
}
ipcMain.handle('search', (_e, q, paths) => new Promise((res) => {
  for (const [k, f] of sWait) { f(null); sWait.delete(k); } // a busca anterior perde a vez
  const id = ++sId; sWait.set(id, res);
  searchWorker().postMessage({ id, q, paths: (paths || []).filter(insideRoot) });
}));
// regras em arquivo, para levar a outro computador
const cleanRules = (r) => (Array.isArray(r) ? r : []).filter((x) => x && typeof x.folder === 'string' && x.folder.trim()).slice(0, 200)
  .map((x) => ({ folder: x.folder.trim().slice(0, 200), kw: String(x.kw || '').slice(0, 500), ext: String(x.ext || '').slice(0, 500), auto: !!x.auto }));
ipcMain.handle('rules-export', async (_e, rules) => {
  const r = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('documents'), 'prumo-regras.json'), filters: [{ name: 'Regras do Prumo', extensions: ['json'] }] });
  refocus();
  if (r.canceled || !r.filePath) return false;
  await fs.writeFile(r.filePath, JSON.stringify({ app: 'Prumo', version: app.getVersion(), rules: cleanRules(rules) }, null, 2));
  return r.filePath;
});
ipcMain.handle('rules-import', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Regras do Prumo', extensions: ['json'] }] });
  refocus();
  if (r.canceled) return null;
  try { const j = JSON.parse(await fs.readFile(r.filePaths[0], 'utf8')); const rules = cleanRules(Array.isArray(j) ? j : j.rules); return rules.length ? rules : { error: 'O arquivo não tem regras.' }; }
  catch { return { error: 'Arquivo inválido.' }; }
});
// imagens das notas ficam em %APPDATA%\Prumo\notas
// shortcut: imagens apagadas da nota continuam no disco; limpar órfãs quando a pasta crescer
ipcMain.handle('note-img', async (_e, dataUrl) => {
  const m = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) return null;
  const dir = path.join(app.getPath('userData'), 'notas');
  await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, crypto.randomUUID() + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]));
  await fs.writeFile(f, Buffer.from(m[2], 'base64'));
  return 'file:///' + f.split(path.sep).join('/');
});

// ---- avisos do Windows na hora dos lembretes ----
const pad2 = (n) => String(n).padStart(2, '0');
const dkey = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
// mesma regra de repetição do renderer (recurs)
function recurs(r, d) {
  if (r.start && dkey(d) < r.start) return false;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (r.kind === 'daily') return true;
  if (r.kind === 'weekly') return d.getDay() === r.wd;
  if (r.kind === 'monthly') return d.getDate() === Math.min(r.day, last);
  if (r.kind === 'yearly') return d.getMonth() === r.m && d.getDate() === Math.min(r.day, last);
  return false;
}
function checkReminders() {
  const now = new Date(), k = dkey(now), hm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  const due = [
    ...((state.events || {})[k] || []).filter((e) => e.time && !e.done),
    ...(state.recur || []).filter((r) => r.time && recurs(r, now) && !(r.done || []).includes(k))
  ].filter((e) => e.time <= hm);
  const sent = state.notified || {};
  let ch = false;
  for (const e of due) {
    const key = k + '|' + e.id;
    if (sent[key]) continue;
    sent[key] = 1; ch = true;
    const n = new Notification({ title: 'Lembrete do Prumo', body: `${e.time} · ${e.t}` });
    n.on('click', () => { showWindow(); send('open-cal', k); });
    n.show();
  }
  if (ch) { const old = dkey(new Date(Date.now() - 3 * 864e5)); for (const x of Object.keys(sent)) if (x.slice(0, 10) < old) delete sent[x]; state.notified = sent; persist(); }
}

// ---- segundo plano: bandeja + organização automática ----
let mainWin = null, tray = null, readyUpdate = null, updaterOn = false;
const bgc = () => state.bg || {};
const send = (ch, p) => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(ch, p); };
const watcher = createWatcher({
  getConfig: () => ({ on: !!bgc().on, folder: bgc().folder || app.getPath('downloads'), rules: state.rules || [], prefs: state.prefs || {} }),
  moveOne,
  onMoved: (moved, root) => {
    moved.forEach((x) => remapMeta(x.from, x.to)); record(moved, { auto: true, kind: 'auto' }); persist();
    new Notification({ title: 'Prumo', body: `${moved.length} ${moved.length === 1 ? 'arquivo organizado' : 'arquivos organizados'} em ${path.basename(root)}. Abra o Prumo para desfazer.` }).show();
    send('files-changed');
  }
});
function showWindow() { if (!mainWin || mainWin.isDestroyed()) createWindow(); else { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } }
function makeTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 }));
  tray.setToolTip('Prumo');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir o Prumo', click: showWindow },
    { label: 'Organização automática', type: 'checkbox', checked: true, click: () => { state.bg = { ...bgc(), on: false }; persist(); applyBg(); send('bg-changed'); } },
    { type: 'separator' }, { label: 'Sair', click: () => app.quit() }
  ]));
  tray.on('click', showWindow);
}
function applyBg() {
  const b = bgc();
  try { app.setLoginItemSettings({ openAtLogin: !!b.startup, args: ['--hidden'] }); } catch {}
  if (b.on) { if (!tray) makeTray(); watcher.start(); } else { watcher.stop(); if (tray) { tray.destroy(); tray = null; } }
}
// ---- atualização automática (endereço definido nas configurações) ----
// sem endereço nas configurações, usa as versões publicadas no GitHub
const UPDATE_URL = 'https://github.com/Halfszin/prumo/releases/latest/download';
// estado do download mostrado na tela (progresso, pronto, erro); registro em %APPDATA%\Prumo\update.log
let updInfo = { phase: 'idle' }, lastProg = 0;
const updSend = (p) => { updInfo = p; send('update-status', p); };
const updLog = (lvl) => (m) => {
  try {
    const f = path.join(app.getPath('userData'), 'update.log');
    if (fsSync.existsSync(f) && fsSync.statSync(f).size > 256 * 1024) fsSync.renameSync(f, f.replace(/\.log$/, '.old.log')); // retenção: no máximo ~512 KB
    fsSync.appendFileSync(f, `${new Date().toISOString()} ${lvl} ${m}\n`);
  } catch {}
};
function updater() {
  const u = { ...state.update, url: (state.update || {}).url || UPDATE_URL };
  const { autoUpdater } = require('electron-updater');
  // instala em silêncio ao fechar, a menos que o usuário desligue
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = false; // ver installUpdate e window-all-closed
  // o GitHub responde 501 ao download por partes; baixa o arquivo inteiro direto
  autoUpdater.disableDifferentialDownload = true; autoUpdater.disableWebInstaller = true;
  autoUpdater.setFeedURL({ provider: 'generic', url: u.url });
  if (!updaterOn) {
    updaterOn = true;
    autoUpdater.logger = { info: updLog('INFO'), warn: updLog('WARN'), error: updLog('ERRO'), debug: () => {} };
    autoUpdater.on('checking-for-update', () => updSend({ phase: 'checking' }));
    autoUpdater.on('update-not-available', () => updSend({ phase: 'latest' }));
    autoUpdater.on('update-available', (i) => updSend({ phase: 'downloading', version: i.version, percent: 0 }));
    autoUpdater.on('download-progress', (p) => {
      if (Date.now() - lastProg < 400) return; lastProg = Date.now();
      updSend({ phase: 'downloading', version: updInfo.version, percent: Math.floor(p.percent), done: p.transferred, total: p.total });
    });
    autoUpdater.on('update-downloaded', (i) => { readyUpdate = { version: i.version, file: i.downloadedFile }; updLog('INFO')('instalador baixado em ' + i.downloadedFile); updSend({ phase: 'ready', version: i.version }); send('update', readyUpdate); });
    autoUpdater.on('error', (e) => updSend({ phase: 'error', message: String((e && e.message) || e).split('\n')[0].slice(0, 200) }));
    setInterval(() => { if ((state.update || {}).check !== false) autoUpdater.checkForUpdates().catch(() => {}); }, 4 * 3600e3);
  }
  return autoUpdater;
}
function setupUpdater() {
  if (!app.isPackaged || (state.update || {}).check === false) return;
  try { updater().checkForUpdates().catch(() => {}); } catch {}
}
ipcMain.handle('update:state', () => readyUpdate);
ipcMain.handle('update:status', () => (updFailed ? { ...updInfo, failed: updFailed.version } : updInfo));
// silencioso (sem as telas do instalador) e abre o Prumo de novo ao terminar
// O instalador silencioso desiste sem avisar se o Prumo não fecha a tempo; por isso encerra tudo antes,
// avisa que vai reabrir e anota a tentativa para perceber, na próxima abertura, se não deu certo.
let updFailed = null;
// silent: sem as telas do instalador; run: abrir o Prumo depois; hidden: reabrir só na bandeja (atualização feita ao fechar)
let installing = false;
const autoOn = () => (state.update || {}).auto !== false;
function installUpdate({ silent = true, run = true, hidden = false } = {}) {
  if (installing || !readyUpdate) return false;
  installing = true;
  try {
    state.updPending = { version: readyUpdate.version, from: app.getVersion(), time: Date.now(), silent, hidden }; persist();
    updLog('INFO')(`instalar ${readyUpdate.version} (silencioso: ${silent}, reabrir: ${run}, bandeja: ${hidden})`);
    if (silent && run && !hidden) new Notification({ title: 'Atualizando o Prumo', body: 'Leva alguns segundos. O Prumo abre sozinho quando terminar; não precisa abrir de novo.' }).show();
    watcher.stop();
    if (tray) { tray.destroy(); tray = null; }
    if (sWorker) sWorker.terminate();
    const f = readyUpdate.file || require('electron-updater').autoUpdater.installerPath; let size = -1; try { size = fsSync.statSync(f).size; } catch {}
    updLog('INFO')(`arquivo do instalador: ${f} (${size} bytes)`);
    if (!f || size <= 0) { installing = false; updLog('ERRO')('instalador baixado não encontrado'); return false; }
    // clique duplo no Explorer: mostra as telas do instalador e o aviso do Windows, se houver
    const openByShell = (why) => {
      if (why) updLog('ERRO')(why);
      shell.openPath(f).then((err) => { if (err) updLog('ERRO')('não abriu o instalador: ' + err); });
      setTimeout(() => app.exit(0), 1500);
    };
    if (!silent) openByShell();
    else setTimeout(() => {
      // O Windows às vezes recusa abrir o instalador sem assinatura ("spawn UNKNOWN", depois de 10 a 18 s);
      // o atualizador então tentava com elevate.exe e a pergunta sumia. Aqui, se recusar, cai no clique duplo.
      const args = ['--updated', '/S']; if (run) args.push('--force-run');
      let p;
      try { p = require('child_process').spawn(f, args, { detached: true, stdio: 'ignore' }); }
      catch (e) { openByShell(`o Windows não deixou abrir o instalador (${e.code || e.message}); abrindo com as telas normais`); return; }
      p.once('spawn', () => { updLog('INFO')('instalador aberto: ' + args.join(' ')); p.unref(); setTimeout(() => app.exit(0), 300); });
      p.once('error', (e) => openByShell(`o Windows não deixou abrir o instalador (${e.code || e.message}); abrindo com as telas normais`));
    }, 400);
    return true;
  } catch (e) { installing = false; updLog('ERRO')('instalar: ' + e.message); return false; }
}
ipcMain.handle('update:install', (_e, silent = true) => installUpdate({ silent: !!silent, run: true }));
ipcMain.handle('update:reveal', () => { if (readyUpdate && readyUpdate.file) shell.showItemInFolder(readyUpdate.file); return !!(readyUpdate && readyUpdate.file); });
ipcMain.handle('update:log', () => shell.openPath(path.join(app.getPath('userData'), 'update.log')));
let reopenHidden = false;
function checkPendingUpdate() {
  const p = state.updPending;
  if (!p) return;
  reopenHidden = !!p.hidden;
  delete state.updPending; persist();
  if (p.version && p.version !== app.getVersion() && Date.now() - p.time < 3600e3) { updFailed = p; updLog('ERRO')(`a atualização para ${p.version} não terminou; continua na ${app.getVersion()}`); }
  else updLog('INFO')(`atualizado de ${p.from} para ${app.getVersion()}`);
}
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return 'A verificação funciona no programa instalado.';
  if (updInfo.phase === 'downloading') return `Baixando a versão ${updInfo.version}… ${updInfo.percent || 0}%`;
  if (readyUpdate) return `A versão ${readyUpdate.version} está pronta. Clique em Reiniciar e atualizar.`;
  try {
    const r = await updater().checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    return v && v !== app.getVersion() ? `Versão ${v} encontrada. Baixando…` : 'Você está na versão mais recente';
  } catch (e) { return 'Não foi possível verificar: ' + e.message; }
});

// links das notas abrem no navegador padrão; só http, https e e-mail
const webUrl = (u) => { try { const x = new URL(String(u)); return ['http:', 'https:', 'mailto:'].includes(x.protocol) ? x.href : null; } catch { return null; } };
ipcMain.handle('open-url', (_e, u) => { const x = webUrl(u); if (x) shell.openExternal(x); return !!x; });

// seus dados: exportar, abrir a pasta e apagar tudo (os arquivos organizados não são tocados)
const notesDir = () => path.join(app.getPath('userData'), 'notas');
ipcMain.handle('data:export', async () => {
  const r = await dialog.showOpenDialog({ title: 'Onde salvar seus dados', properties: ['openDirectory', 'createDirectory'] });
  refocus();
  if (r.canceled) return null;
  const out = path.join(r.filePaths[0], 'Prumo - meus dados ' + new Date().toISOString().slice(0, 10));
  await fs.mkdir(path.join(out, 'notas'), { recursive: true });
  const { notified, ...data } = state;
  await fs.writeFile(path.join(out, 'prumo-dados.json'), JSON.stringify({ app: 'Prumo', versao: app.getVersion(), exportado: new Date().toISOString(), dados: data }, null, 2));
  for (const f of await fs.readdir(notesDir()).catch(() => [])) await fs.copyFile(path.join(notesDir(), f), path.join(out, 'notas', f)).catch(() => {});
  return out;
});
ipcMain.handle('data:open', () => shell.openPath(app.getPath('userData')));
ipcMain.handle('licenses', () => shell.openPath(app.isPackaged ? path.join(process.resourcesPath, 'THIRD_PARTY_LICENSES.txt') : path.join(__dirname, 'THIRD_PARTY_LICENSES.txt')));
ipcMain.handle('data:wipe', async () => {
  watcher.stop();
  try { app.setLoginItemSettings({ openAtLogin: false }); } catch {}
  state = {};
  for (const f of [storeFile(), oldStore(), path.join(app.getPath('userData'), 'update.log'), path.join(app.getPath('userData'), 'update.old.log')]) await fs.rm(f, { force: true }).catch(() => {});
  await fs.rm(notesDir(), { recursive: true, force: true }).catch(() => {});
  app.relaunch(); app.exit(0);
});
// retenção: imagens que nenhuma nota usa mais são apagadas (as de menos de 1 dia ficam, podem estar sendo salvas)
async function cleanNoteImages() {
  const used = JSON.stringify(state.notes || []);
  for (const f of await fs.readdir(notesDir()).catch(() => [])) {
    const p = path.join(notesDir(), f);
    try { if (!used.includes(f) && Date.now() - (await fs.stat(p)).mtimeMs > 864e5) await fs.rm(p); } catch {}
  }
}
// corretor ortográfico: usa o corretor do próprio Windows, que funciona sem internet
ipcMain.handle('spell', (_e, on) => { if (mainWin) mainWin.webContents.session.setSpellCheckerEnabled(!!on); });
function contextMenu(w, p) {
  const items = [];
  if (p.misspelledWord) {
    for (const s of p.dictionarySuggestions.slice(0, 6)) items.push({ label: s, click: () => w.webContents.replaceMisspelling(s) });
    if (!p.dictionarySuggestions.length) items.push({ label: 'Sem sugestões', enabled: false });
    items.push({ label: 'Adicionar ao dicionário', click: () => w.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: 'separator' });
  }
  const link = webUrl(p.linkURL);
  if (link) items.push({ label: 'Abrir link no navegador', click: () => shell.openExternal(link) }, { label: 'Copiar link', click: () => clipboard.writeText(link) }, { type: 'separator' });
  if (p.mediaType === 'image') items.push({ label: 'Copiar imagem', click: () => w.webContents.copyImageAt(p.x, p.y) }, { type: 'separator' });
  if (p.isEditable) items.push({ label: 'Recortar', role: 'cut', enabled: p.editFlags.canCut }, { label: 'Copiar', role: 'copy', enabled: p.editFlags.canCopy }, { label: 'Colar', role: 'paste', enabled: p.editFlags.canPaste }, { label: 'Selecionar tudo', role: 'selectAll' });
  else if (p.selectionText.trim()) items.push({ label: 'Copiar', role: 'copy' });
  while (items.length && items[items.length - 1].type === 'separator') items.pop();
  if (items.length) Menu.buildFromTemplate(items).popup({ window: w });
}

function createWindow() {
  const w = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, backgroundColor: '#17283b', title: 'Prumo',
    icon: fsSync.existsSync(path.join(__dirname, 'build', 'icon.png')) ? path.join(__dirname, 'build', 'icon.png') : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, plugins: true, spellcheck: (state.prefs || {}).spell !== false }
  });
  w.setMenuBarVisibility(false);
  w.webContents.setWindowOpenHandler(({ url }) => { const x = webUrl(url); if (x) shell.openExternal(x); return { action: 'deny' }; });
  w.webContents.on('will-navigate', (e, url) => { e.preventDefault(); const x = webUrl(url); if (x) shell.openExternal(x); });
  w.webContents.on('context-menu', (_e, p) => contextMenu(w, p));
  // no Windows o corretor usa os idiomas do próprio sistema, sem baixar dicionários
  mainWin = w; w.on('closed', () => { mainWin = null; });
  w.on('focus', () => { if (!w.isDestroyed()) w.webContents.focus(); });
  w.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
app.whenReady().then(() => {
  loadState(); fixIds(); pruneHistory(); checkPendingUpdate(); persist();
  setTimeout(cleanNoteImages, 15000);
  Menu.setApplicationMenu(null);
  applyBg(); setupUpdater();
  setInterval(checkReminders, 20e3); setTimeout(checkReminders, 3000);
  if (!((process.argv.includes('--hidden') || reopenHidden) && bgc().on)) createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('second-instance', showWindow);
app.on('window-all-closed', () => {
  if (readyUpdate && autoOn() && installUpdate({ silent: true, run: bgc().on, hidden: true })) return;
  if (process.platform !== 'darwin' && !bgc().on) app.quit();
});
app.on('before-quit', (e) => { if (!installing && readyUpdate && autoOn()) { e.preventDefault(); installUpdate({ silent: true, run: false }); } });
