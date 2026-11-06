const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');

// ---- nomes seguros para o Windows e mover sem sobrescrever ----
const BAD = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
const clean = (s) => { s = String(s).replace(BAD, '_').replace(/[. ]+$/, '').trim() || '_'; return RESERVED.test(s) ? '_' + s : s; };
const segments = (f) => f.split(/[\\/]/).filter((x) => x && x !== '.' && x !== '..').map(clean);

async function freeName(dest) {
  const { dir, name, ext } = path.parse(dest);
  let p = dest, i = 1;
  for (;;) {
    try { await fs.access(p); p = path.join(dir, `${name} (${i++})${ext}`); } catch { return p; }
  }
}
async function moveOne(base, { from, name, folder }) {
  const segs = segments(folder);
  if (segs.length && path.basename(base).toLowerCase() === segs[0].toLowerCase()) segs.shift(); // não repete o nome da pasta aberta
  const dir = path.isAbsolute(folder) ? path.resolve(folder) : path.join(base, ...segs);
  const to = path.join(dir, clean(name));
  if (path.resolve(to) === path.resolve(from)) return from;
  await fs.mkdir(dir, { recursive: true });
  if (path.resolve(to).toLowerCase() === path.resolve(from).toLowerCase()) { await fs.rename(from, to); return to; } // só maiúsculas/minúsculas
  const dest = await freeName(to);
  try { await fs.rename(from, dest); }
  catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(from, dest, fsSync.constants.COPYFILE_EXCL); await fs.unlink(from);
  }
  return dest;
}

module.exports = { moveOne, clean, segments };
