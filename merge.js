// Junta o que o computador e o celular mudaram ao mesmo tempo, em vez de um apagar o do outro.
// cur: o que está salvo agora; inc: a versão que chegou; since: quando quem mandou leu os dados pela última vez.
// Itens com o mesmo id ficam com a versão alterada por último (campo updated).
const stamp = (x) => (x && (x.updated || x.created)) || 0;
const clone = (v) => JSON.parse(JSON.stringify(v));

function mergeList(cur, inc, since) {
  const out = clone(inc || []), byId = new Map(out.map((x, i) => [x.id, i]));
  for (const c of cur || []) {
    if (!c || c.id == null) continue;
    if (!byId.has(c.id)) { if (stamp(c) > since) out.push(clone(c)); } // novo do outro lado; senão, foi apagado aqui
    else if (stamp(c) > stamp(out[byId.get(c.id)])) out[byId.get(c.id)] = clone(c);
  }
  return out;
}

function mergeBoard(cur, inc, since) {
  const out = clone(inc || []);
  const where = new Map();
  out.forEach((col) => (col.c || []).forEach((k) => where.set(k.id, col)));
  for (const col of cur || []) {
    for (const c of col.c || []) {
      const dest = out.find((x) => x.id === col.id) || out[0];
      if (!dest) continue;
      const at = where.get(c.id);
      if (!at) { if (stamp(c) > since) { dest.c = dest.c || []; dest.c.push(clone(c)); } continue; }
      const mine = at.c.find((k) => k.id === c.id);
      if (stamp(c) > stamp(mine)) { at.c = at.c.filter((k) => k.id !== c.id); dest.c = dest.c || []; dest.c.push(clone(c)); where.set(c.id, dest); }
    }
  }
  return out;
}

// lembretes por dia: junta pelos ids; o que só existe de um lado continua
function mergeEvents(cur, inc) {
  const out = clone(inc || {});
  for (const [day, list] of Object.entries(cur || {})) {
    const have = new Set((out[day] || []).map((x) => x.id));
    const add = (list || []).filter((x) => !have.has(x.id));
    if (add.length) out[day] = [...(out[day] || []), ...clone(add)];
  }
  return out;
}

function merge(key, cur, inc, since) {
  if (cur == null) return inc;
  if (key === 'notes') return mergeList(cur, inc, since);
  if (key === 'board') return mergeBoard(cur, inc, since);
  if (key === 'events') return mergeEvents(cur, inc);
  if (key === 'recur') return mergeList(cur, inc, Infinity).concat((cur || []).filter((c) => !(inc || []).some((x) => x.id === c.id)));
  if (key === 'meta') return { ...cur, ...inc };
  return inc;
}
module.exports = { merge };
