const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Menu, Tray, Notification, nativeImage } = require('electron');
const { moveOne } = require('./fsops');
const { createWatcher } = require('./background');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();
app.setAppUserModelId('org.prumo.app');

// ---- configuração salva em %APPDATA%\Arrumei\arrumei.json ----
const storeFile = () => path.join(app.getPath('userData'), 'prumo.json');
let state = {};
const oldStore = () => path.join(app.getPath('appData'), 'Arrumei', 'arrumei.json'); // versões antigas
const loadState = () => {
  for (const f of [storeFile(), oldStore()]) { try { state = JSON.parse(fsSync.readFileSync(f, 'utf8')); return; } catch {} }
  state = {};
};
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
        out.push({ name: e.name, path: p, size: st.size, mtime: st.mtimeMs, rel: path.relative(root, dir).split(path.sep).join('/') });
      } catch {}
    }
  }
}
async function scan(root) { const files = []; await walk(root, root, files, 0); return { root, files }; }

// ---- mover sem nunca sobrescrever ----
ipcMain.handle('state:get', () => state);
ipcMain.handle('state:set', (_e, k, v) => { if (['rules', 'board', 'prefs', 'bg', 'update', 'events', 'colors'].includes(k)) { state[k] = v; persist(); if (k === 'bg') applyBg(); if (k === 'update') setupUpdater(); } });
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
ipcMain.handle('apply', async (_e, { root, dest, ops }) => {
  const res = [], done = [];
  for (const o of ops) {
    try {
      const to = await moveOne(dest || root || path.dirname(o.from), o);
      res.push({ from: o.from, to });
      if (to !== o.from) done.push({ from: o.from, to });
    } catch (err) { res.push({ from: o.from, error: friendly(err) }); }
  }
  if (done.length) { state.history = [...(state.history || []), { time: Date.now(), items: done }].slice(-20); persist(); }
  return { res, undo: (state.history || []).length };
});
ipcMain.handle('undo', async () => {
  const h = state.history || [], last = h.pop();
  if (!last) return { ok: 0, fail: 0, undo: 0 };
  let ok = 0, fail = 0;
  for (const { from, to } of [...last.items].reverse()) {
    try {
      const taken = await fs.access(from).then(() => true, () => false);
      if (taken) throw new Error('ocupado');
      await fs.mkdir(path.dirname(from), { recursive: true });
      await fs.rename(to, from); ok++;
      await fs.rmdir(path.dirname(to)).catch(() => {}); // remove pasta vazia criada pela organização
    } catch { fail++; }
  }
  state.history = h; persist();
  return { ok, fail, undo: h.length };
});
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
      out.done.push(p);
    } catch { out.failed.push(p); }
  }
  return out;
});


// ---- segundo plano: bandeja + organização automática ----
let mainWin = null, tray = null, readyUpdate = null, updaterOn = false;
const bgc = () => state.bg || {};
const send = (ch, p) => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(ch, p); };
const watcher = createWatcher({
  getConfig: () => ({ on: !!bgc().on, folder: bgc().folder || app.getPath('downloads'), rules: state.rules || [], prefs: state.prefs || {} }),
  moveOne,
  onMoved: (moved, root) => {
    state.history = [...(state.history || []), { time: Date.now(), auto: true, items: moved }].slice(-20); persist();
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
function setupUpdater() {
  const u = state.update || {};
  if (!app.isPackaged || !u.url) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({ provider: 'generic', url: u.url });
    if (!updaterOn) {
      updaterOn = true;
      autoUpdater.on('update-downloaded', (i) => { readyUpdate = { version: i.version }; send('update', readyUpdate); });
      setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600e3);
    }
    autoUpdater.checkForUpdates().catch(() => {});
  } catch {}
}
ipcMain.handle('update:state', () => readyUpdate);
ipcMain.handle('update:install', () => { try { require('electron-updater').autoUpdater.quitAndInstall(); } catch {} });
ipcMain.handle('update:check', async () => {
  const u = state.update || {};
  if (!app.isPackaged) return 'A verificação funciona no programa instalado.';
  if (!u.url) return 'Informe o endereço das atualizações.';
  try {
    setupUpdater();
    const r = await require('electron-updater').autoUpdater.checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    return v && v !== app.getVersion() ? `Versão ${v} encontrada. Baixando em segundo plano.` : 'Você já está na versão mais recente.';
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
  loadState();
  Menu.setApplicationMenu(null);
  applyBg(); setupUpdater();
  if (!(process.argv.includes('--hidden') && bgc().on)) createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('second-instance', showWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !bgc().on) app.quit(); });
