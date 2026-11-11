// Funções sem Electron: NF-e, duplicados, texto de documentos. Testadas em test/extras.test.js.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

// ---- NF-e (XML) ----
const tag = (xml, t) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${t}[^>]*>([^<]*)</(?:\\w+:)?${t}>`)); return m ? m[1].trim() : ''; };
const block = (xml, t) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${t}[\\s>][\\s\\S]*?</(?:\\w+:)?${t}>`)); return m ? m[0] : ''; };
const unent = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
function parseNfe(xml) {
  if (!/<(?:\w+:)?infNFe[\s>]/.test(xml)) return null;
  const emit = block(xml, 'emit'), ide = block(xml, 'ide');
  const fornecedor = unent(tag(emit, 'xFant') || tag(emit, 'xNome'));
  const data = (tag(ide, 'dhEmi') || tag(ide, 'dEmi')).slice(0, 10);
  const id = (xml.match(/<(?:\w+:)?infNFe[^>]*\bId="NFe(\d{44})"/) || [])[1] || '';
  if (!fornecedor || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  return { fornecedor, data, numero: tag(ide, 'nNF'), valor: Number(tag(block(xml, 'ICMSTot'), 'vNF')) || 0, cnpj: tag(emit, 'CNPJ') || tag(emit, 'CPF'), chave: id };
}
async function readNfe(p) {
  const st = await fsp.stat(p);
  if (st.size > 5e6) return null;
  return parseNfe(await fsp.readFile(p, 'utf8'));
}

// ---- duplicados: hash só dos arquivos com tamanho repetido (o renderer já filtra) ----
const hashFile = (p) => new Promise((res, rej) => {
  const h = crypto.createHash('sha1');
  fs.createReadStream(p).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej);
});

// ---- texto de PDF, Word, Excel e texto simples, com cache por caminho+data ----
const TEXT = new Set(['txt', 'md', 'csv', 'json', 'xml', 'log', 'html', 'ini', 'yml', 'yaml']);
const SEARCHABLE = new Set([...TEXT, 'pdf', 'docx', 'xlsx']);
const cache = new Map();
const issues = new Map(); // caminho -> motivo ('scan' = PDF só com imagem)
let pdfjs = null;
async function pdfText(p) {
  if (!pdfjs) pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fsp.readFile(p)), useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
  let out = '';
  for (let i = 1; i <= Math.min(doc.numPages, 60); i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    out += c.items.map((x) => x.str).join(' ') + '\n';
  }
  await doc.destroy();
  return out;
}
async function textOf(p) {
  const e = path.extname(p).slice(1).toLowerCase();
  if (!SEARCHABLE.has(e)) return '';
  const st = await fsp.stat(p);
  if (st.size > 25e6) return '';
  const k = p + '|' + st.mtimeMs, hit = cache.get(k);
  if (hit !== undefined) return hit;
  let t = '';
  issues.delete(p);
  try {
    if (TEXT.has(e)) t = (await fsp.readFile(p, 'utf8')).slice(0, 2e6);
    else if (e === 'pdf') t = await pdfText(p);
    else if (e === 'docx') t = (await require('mammoth').extractRawText({ path: p })).value;
    else if (e === 'xlsx') t = (await require('read-excel-file/node')(p)).map((r) => r.join(' ')).join('\n');
  } catch (err) { const msg = String((err && err.message) || err); issues.set(p, /password/i.test(msg) ? 'o arquivo tem senha' : /Invalid PDF|XRef|Missing PDF|Corrupt|zip/i.test(msg) ? 'o arquivo parece danificado' : msg.slice(0, 160)); return ''; } // falha não fica no cache: tenta de novo na próxima busca
  if (e === 'pdf' && !t.trim()) issues.set(p, 'scan');
  cache.set(k, t);
  return t;
}
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// stop(): devolve true quando uma busca mais nova chegou; aí esta para no próximo arquivo
async function searchContent(q, paths, stop) {
  const nq = fold(String(q).trim());
  const out = [];
  if (nq.length < 2) return out;
  for (const p of paths) {
    await new Promise((r) => setImmediate(r)); // deixa chegar o pedido de cancelamento
    if (stop && stop()) return null;
    const t = await textOf(p).catch(() => '');
    const i = fold(t).indexOf(nq);
    if (i >= 0) out.push({ path: p, snip: t.slice(Math.max(0, i - 40), i + nq.length + 60).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

const issuesFor = (paths) => paths.filter((p) => issues.has(p)).map((p) => ({ path: p, why: issues.get(p) }));
module.exports = { parseNfe, readNfe, hashFile, textOf, searchContent, issuesFor, SEARCHABLE };
