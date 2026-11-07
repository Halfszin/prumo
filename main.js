const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu, Tray, Notification, nativeImage } = require('electron');
const { moveOne } = require('./fsops');
const { readNfe, hashFile, searchContent } = require('./extras');
const crypto = require('crypto');
const { createWatcher } = require('./background');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();
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
const HMAX = 200;
const record = (items, extra) => { state.history = [...(state.history || []), { id: crypto.randomUUID(), time: Date.now(), items, ...extra }].slice(-HMAX); };
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
ipcMain.handle('search', (_e, q, paths) => searchContent(q, (paths || []).filter(insideRoot)));
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
const updLog = (lvl) => (m) => { try { fsSync.appendFileSync(path.join(app.getPath('userData'), 'update.log'), `${new Date().toISOString()} ${lvl} ${m}\n`); } catch {} };
function updater() {
  const u = { ...state.update, url: (state.update || {}).url || UPDATE_URL };
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
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
    autoUpdater.on('update-downloaded', (i) => { readyUpdate = { version: i.version }; updSend({ phase: 'ready', version: i.version }); send('update', readyUpdate); });
    autoUpdater.on('error', (e) => updSend({ phase: 'error', message: String((e && e.message) || e).split('\n')[0].slice(0, 200) }));
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600e3);
  }
  return autoUpdater;
}
function setupUpdater() {
  if (!app.isPackaged) return;
  try { updater().checkForUpdates().catch(() => {}); } catch {}
}
ipcMain.handle('update:state', () => readyUpdate);
ipcMain.handle('update:status', () => updInfo);
ipcMain.handle('update:install', () => { try { require('electron-updater').autoUpdater.quitAndInstall(); } catch {} });
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return 'A verificação funciona no programa instalado.';
  if (updInfo.phase === 'downloading') return `Baixando a versão ${updInfo.version}… ${updInfo.percent || 0}%`;
  if (readyUpdate) return `A versão ${readyUpdate.version} está pronta. Clique em "Atualizar para ${readyUpdate.version}" no alto da tela.`;
  try {
    const r = await updater().checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    return v && v !== app.getVersion() ? `Versão ${v} encontrada. Baixando… o progresso aparece no alto da tela.` : 'Você já está na versão mais recente.';
  } catch (e) { return 'Não foi possível verificar: ' + e.message; }
});

function createWindow() {
  const w = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, backgroundColor: '#17283b', title: 'Prumo',
    icon: fsSync.existsSync(path.join(__dirname, 'build', 'icon.png')) ? path.join(__dirname, 'build', 'icon.png') : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, plugins: true }
  });
  w.setMenuBarVisibility(false);
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  mainWin = w; w.on('closed', () => { mainWin = null; });
  w.on('focus', () => { if (!w.isDestroyed()) w.webContents.focus(); });
  w.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
app.whenReady().then(() => {
  loadState(); fixIds();
  Menu.setApplicationMenu(null);
  applyBg(); setupUpdater();
  setInterval(checkReminders, 20e3); setTimeout(checkReminders, 3000);
  if (!(process.argv.includes('--hidden') && bgc().on)) createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('second-instance', showWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !bgc().on) app.quit(); });
