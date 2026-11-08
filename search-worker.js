// Lê PDF, Word, Excel e textos fora do processo principal, para a janela não travar.
const { parentPort } = require('worker_threads');
const { searchContent } = require('./extras');
let current = 0;
parentPort.on('message', async ({ id, q, paths }) => {
  current = id;
  let r = null;
  try { r = await searchContent(q, paths, () => current !== id); } catch { r = []; }
  if (r && current === id) parentPort.postMessage({ id, r });
});
