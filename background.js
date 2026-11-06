// Vigia uma pasta e organiza arquivos novos, sem nunca mexer em arquivos temporários ou em andamento.
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const TEMP = /\.(crdownload|part|partial|tmp|temp|download|opdownload|aria2|!ut|bc!|filepart)$/i;
const skip = (n) => TEMP.test(n) || /^(~\$|\.)/.test(n) || /^(desktop\.ini|thumbs\.db)$/i.test(n);
const norm = (t) => ' ' + t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_.]+/g, ' ').trim() + ' ';
const list = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);

function matchRule(rules, name) {
  const e = path.extname(name).slice(1).toLowerCase(), b = norm(name.replace(/\.[^.]*$/, ''));
  return rules.find((r) => list(r.kw).some((k) => { const q = norm(k); return k.length > 3 ? b.includes(q.trim()) : b.includes(q); }))
    || rules.find((r) => list(r.ext).some((x) => x.toLowerCase().replace('.', '') === e));
}
function subOf(prefs, ms) {
  if (!prefs.subOn) return '';
  const d = new Date(ms), y = String(d.getFullYear());
  return prefs.subFmt === 'y' ? y : y + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function createWatcher({ getConfig, moveOne, onMoved, stableMs = 5000, every = 3000 }) {
  const pending = new Map();
  let watcher = null, timer = null, root = null;

  async function add(name) {
    if (!name || skip(name) || pending.has(name)) return;
    try {
      const st = await fs.stat(path.join(root, name));
      if (st.isFile()) pending.set(name, { size: st.size, mtime: st.mtimeMs, since: Date.now(), first: Date.now() });
    } catch {}
  }

  async function tick() {
    const c = getConfig(), moved = [];
    for (const [name, info] of [...pending]) {
      const p = path.join(root, name);
      try {
        const st = await fs.stat(p);
        if (!st.isFile() || skip(name)) { pending.delete(name); continue; }
        if (st.size !== info.size || st.mtimeMs !== info.mtime) { Object.assign(info, { size: st.size, mtime: st.mtimeMs, since: Date.now() }); continue; } // ainda crescendo
        if (Date.now() - info.since < stableMs) continue;                                                    // pode estar chegando
        try { (await fs.open(p, 'r+')).close(); } catch { if (Date.now() - info.first > 600000) pending.delete(name); continue; } // em uso
        pending.delete(name);
        const r = matchRule(c.rules, name);
        if (!r || !r.auto) continue;                                                                          // sem regra automática: não mexe
        const sub = subOf(c.prefs, st.mtimeMs);
        const to = await moveOne(root, { from: p, name, folder: sub ? r.folder + '/' + sub : r.folder });
        if (to !== p) moved.push({ from: p, to });
      } catch { pending.delete(name); }
    }
    if (moved.length) onMoved(moved, root);
  }

  function stop() { if (watcher) watcher.close(); watcher = null; clearInterval(timer); timer = null; pending.clear(); }
  function start() {
    stop();
    const c = getConfig();
    if (!c.on) return false;
    root = c.folder;
    try { watcher = fsSync.watch(root, (_e, n) => n && add(String(n))); } catch { return false; }
    timer = setInterval(tick, every);
    return true;
  }
  return { start, stop, tick, add, pending };
}
module.exports = { createWatcher, matchRule, subOf, skip };
