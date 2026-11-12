// Lê PDF, Word, Excel e textos fora do processo principal, para a janela não travar.
const { parentPort } = require('worker_threads');
const { searchContent, issuesFor } = require('./extras');
let current = 0;
parentPort.on('message', async ({ id, q, paths }) => {
  current = id;
  let r = null;
  let last = 0;
  const prog = (done, total, hit) => { const now = Date.now(); if (hit || now - last > 300 || done === total) { last = now; parentPort.postMessage({ id, prog: [done, total], hit }); } };
  try { r = await searchContent(q, paths, () => current !== id, prog); } catch (e) { r = []; }
  if (r && current === id) parentPort.postMessage({ id, r, bad: issuesFor(paths) });
});
