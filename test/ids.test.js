// npm test: a tela não pode ter dois elementos com o mesmo id (um handler sobrescreve o outro)
const fs = require('fs'), path = require('path'), assert = require('assert');
const s = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const html = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const ids = [...html.matchAll(/\bid="([^"$]+)"/g)].map((m) => m[1]);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
assert.deepStrictEqual(dup, [], 'ids repetidos: ' + dup.join(', '));
console.log('ids ok (' + ids.length + ')');
