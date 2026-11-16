// junta mudanças do computador e do celular sem perder nada
const assert = require('assert');
const { merge } = require('../merge');
const since = 1000;
// nota nova no PC depois que o celular leu + celular editou outra
let r = merge('notes', [{ id: 'a', updated: 900, text: 'a' }, { id: 'b', updated: 1500, text: 'nova no PC' }], [{ id: 'a', updated: 1600, text: 'a editada no celular' }], since);
assert.deepStrictEqual(r.map((n) => n.id + ':' + n.text), ['a:a editada no celular', 'b:nova no PC']);
// nota apagada no celular (existia antes da leitura) continua apagada
r = merge('notes', [{ id: 'a', updated: 900 }, { id: 'c', updated: 800 }], [{ id: 'a', updated: 900 }], since);
assert.deepStrictEqual(r.map((n) => n.id), ['a']);
// mesma nota editada nos dois: fica a mais recente
r = merge('notes', [{ id: 'a', updated: 2000, text: 'PC' }], [{ id: 'a', updated: 1500, text: 'cel' }], since);
assert.strictEqual(r[0].text, 'PC');
// quadro: cartão novo do PC entra na coluna certa; cartão movido no PC depois vai para a coluna nova
const cur = [{ id: 'x', c: [{ id: 1, updated: 900 }, { id: 3, updated: 1200 }] }, { id: 'y', c: [{ id: 2, updated: 1700 }] }];
const inc = [{ id: 'x', c: [{ id: 1, updated: 900 }, { id: 2, updated: 1100 }, { id: 9, updated: 1300 }] }, { id: 'y', c: [] }];
r = merge('board', cur, inc, since);
assert.deepStrictEqual(r.map((c) => c.id + ':' + c.c.map((k) => k.id).join(',')), ['x:1,9,3', 'y:2']);
// lembretes: junta pelos ids
r = merge('events', { '2026-11-20': [{ id: 'p' }] }, { '2026-11-20': [{ id: 'q' }], '2026-11-21': [{ id: 'z' }] });
assert.deepStrictEqual(Object.fromEntries(Object.entries(r).map(([d, l]) => [d, l.map((x) => x.id).join(',')])), { '2026-11-20': 'q,p', '2026-11-21': 'z' });
console.log('merge ok');
