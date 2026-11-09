// npm test: teste das funções de extras.js
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os');
const { parseNfe, hashFile, searchContent } = require('../extras');
const xml = `<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe35240112345678000199550010000010421000010421" versao="4.00"><ide><nNF>1042</nNF><dhEmi>2024-01-15T10:30:00-03:00</dhEmi></ide><emit><CNPJ>12345678000199</CNPJ><xNome>ACME COMERCIO &amp; CIA LTDA</xNome></emit><total><ICMSTot><vNF>1250.90</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
const n = parseNfe(xml);
assert.deepStrictEqual(n, { fornecedor: 'ACME COMERCIO & CIA LTDA', data: '2024-01-15', numero: '1042', valor: 1250.9, cnpj: '12345678000199', chave: '35240112345678000199550010000010421000010421' });
assert.strictEqual(parseNfe('<a>nada</a>'), null);
(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prumo-'));
  fs.writeFileSync(path.join(d, 'a.txt'), 'Relatório de Vendas'); fs.writeFileSync(path.join(d, 'b.txt'), 'Relatório de Vendas');
  assert.strictEqual(await hashFile(path.join(d, 'a.txt')), await hashFile(path.join(d, 'b.txt')));
  const r = await searchContent('relatorio de', [path.join(d, 'a.txt')]);
  assert.strictEqual(r.length, 1);
  if (process.argv[2]) { const p = await searchContent(process.argv[3] || 'a', [process.argv[2]]); console.log('pdf:', p); }
  console.log('extras ok');
})().catch((e) => { console.error(e); process.exit(1); });
