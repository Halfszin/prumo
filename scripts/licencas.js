// Gera THIRD_PARTY_LICENSES.txt com as licenças de tudo o que vai no instalador.
// Uso: node scripts/licencas.js [pasta-com-LICENSE-da-Inter] [pasta-com-LICENSE-da-Pacifico]
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dirs = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8' }).trim().split('\n').slice(1);
const seen = new Set(), parts = [];
const licText = (d) => { const f = fs.readdirSync(d).find((x) => /^(licen[cs]e|copying)(\.|$)/i.test(x)); return f ? fs.readFileSync(path.join(d, f), 'utf8').trim() : null; };
const add = (name, version, license, text) => parts.push(`${'='.repeat(78)}\n${name} ${version}\nLicença: ${license}\n${'-'.repeat(78)}\n${text || '(o pacote não traz o texto da licença; veja https://spdx.org/licenses/' + license + '.html)'}\n`);
const e = path.join(root, 'node_modules', 'electron');
add('Electron', require(path.join(e, 'package.json')).version, 'MIT', licText(e));
for (const d of dirs) {
  const p = require(path.join(d, 'package.json')), key = p.name + '@' + p.version;
  if (seen.has(key)) continue; seen.add(key);
  add(p.name, p.version, typeof p.license === 'string' ? p.license : JSON.stringify(p.license || p.licenses), licText(d));
}
const [inter, pacifico] = process.argv.slice(2);
if (inter) add('Fonte Inter (embutida na interface)', '4', 'OFL-1.1', fs.readFileSync(path.join(inter, 'LICENSE'), 'utf8').trim());
if (pacifico) add('Fonte Pacifico (nome "Prumo")', '', 'OFL-1.1', fs.readFileSync(path.join(pacifico, 'LICENSE'), 'utf8').trim());
const head = `Prumo: avisos de componentes de terceiros
Gerado por scripts/licencas.js. O Chromium, incluído pelo Electron, traz as próprias licenças no arquivo LICENSES.chromium.html, na pasta do programa.
Ícones: os principais vêm de um pacote de uso livre escolhido pelo autor; os demais e o logo foram criados para o Prumo.

`;
fs.writeFileSync(path.join(root, 'THIRD_PARTY_LICENSES.txt'), head + parts.join('\n'));
console.log(parts.length + ' componentes');
