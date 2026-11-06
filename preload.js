const { contextBridge, ipcRenderer, webUtils } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  getState: () => call('state:get'),
  setState: (k, v) => call('state:set', k, v),
  pickFolder: () => call('pick-folder'),
  scan: (root) => call('scan', root),
  apply: (args) => call('apply', args),
  undo: () => call('undo'),
  undoInfo: () => call('undo-info'),
  paths: () => call('paths'),
  undoCount: () => call('undo-count'),
  pickDir: () => call('pick-dir'),
  preview: (p) => call('preview', p),
  onFilesChanged: (cb) => ipcRenderer.on('files-changed', () => cb()),
  onBgChanged: (cb) => ipcRenderer.on('bg-changed', () => cb()),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, m) => cb(m)),
  updateState: () => call('update:state'),
  installUpdate: () => call('update:install'),
  checkUpdate: () => call('update:check'),
  copy: (t) => call('copy', t),
  open: (p) => call('open', p),
  reveal: (p) => call('reveal', p),
  trash: (paths) => call('trash', paths),
  pathOf: (file) => webUtils.getPathForFile(file)
});
