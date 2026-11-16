// Acesso pelo celular: um servidor só na rede local (Wi-Fi de casa), desligado por padrão.
// O celular abre a mesma interface do Prumo. Tudo exige o código de pareamento e passa por
// uma lista fechada de funções: nada que mova, renomeie ou apague arquivos é exposto.
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const MIME = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8', csv: 'text/plain; charset=utf-8', log: 'text/plain; charset=utf-8',
  mp4: 'video/mp4', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const INLINE = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md', 'csv', 'log', 'mp4', 'mp3', 'm4a']);
const SET_KEYS = ['board', 'events', 'recur', 'notes', 'meta', 'tagdefs'];
// endereços da rede de casa primeiro
const rank = (ip) => (ip.startsWith('192.168.') ? 3 : ip.startsWith('10.') ? 2 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 1 : 0);
function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out.sort((a, b) => rank(b) - rank(a));
}

function createRemote({ handlers, getState, setKey, readable, notesDir, rendererDir, version }) {
  let server = null, port = 0, ver = 1;
  const call = (ch, ...a) => handlers.get(ch)({ remote: true }, ...a);
  const tokenOk = (t) => {
    const s = (getState().mobile || {}).token;
    return !!s && typeof t === 'string' && t.length === s.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(s));
  };
  const notesUrl = () => 'file:///' + notesDir().split(path.sep).join('/').replace(/^\/+/, '') + '/';
  const RPC = {
    ver: () => ver,
    getState: () => { const s = getState(); return { root: s.root || null, rules: s.rules, board: s.board, events: s.events, recur: s.recur, notes: s.notes, meta: s.meta, tagdefs: s.tagdefs, colors: s.colors, notesUrl: notesUrl(), privacyOk: (s.prefs || {}).privacyOk }; },
    setState: (k, v) => { if (!SET_KEYS.includes(k)) throw new Error('não permitido'); setKey(k, v); return ++ver; },
    scan: () => (getState().root ? call('scan', getState().root) : { root: null, files: [] }),
    extraScan: () => call('extra:scan'),
    extraList: () => call('extra:list'),
    search: (q, paths) => call('search', String(q || ''), Array.isArray(paths) ? paths.slice(0, 20000) : []),
    preview: (p) => (readable(p) ? call('preview', p) : { kind: 'none' }),
    noteImg: (d) => call('note-img', d),
    paths: () => ({ version }),
  };
  const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...extra });
    res.end(body);
  };
  function page(res) {
    let html = fs.readFileSync(path.join(rendererDir, 'index.html'), 'utf8');
    const shim = fs.readFileSync(path.join(rendererDir, 'remote-shim.js'), 'utf8');
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: 'self'; connect-src 'self'; media-src 'self'; frame-src 'self'">`);
    html = html.replace('<meta charset="utf-8">', () => '<meta charset="utf-8">\n<meta name="theme-color" content="#0c0c10">\n<script>' + shim.replace(/<\//g, '<\\/') + '</script>');
    send(res, 200, html, 'text/html; charset=utf-8');
  }
  function file(res, p, inlineOk) {
    if (!p || !readable(p)) return send(res, 404, 'não encontrado', 'text/plain; charset=utf-8');
    fs.stat(p, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, 'não encontrado', 'text/plain; charset=utf-8');
      const e = path.extname(p).slice(1).toLowerCase(), name = encodeURIComponent(path.basename(p));
      res.writeHead(200, {
        'Content-Type': MIME[e] || 'application/octet-stream', 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff',
        // arquivos do PC nunca rodam como página dentro do Prumo
        'Content-Security-Policy': 'sandbox', 'Cache-Control': 'no-store',
        'Content-Disposition': (inlineOk && INLINE.has(e) ? 'inline' : 'attachment') + "; filename*=UTF-8''" + name,
      });
      fs.createReadStream(p).pipe(res);
    });
  }
  async function onRequest(req, res) {
    try {
      const u = new URL(req.url, 'http://x');
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) return page(res);
      if (req.method === 'GET' && u.pathname === '/f') {
        if (!tokenOk(u.searchParams.get('t'))) return send(res, 401, 'pareamento necessário', 'text/plain; charset=utf-8');
        return file(res, u.searchParams.get('p'), u.searchParams.get('baixar') !== '1');
      }
      const im = /^\/img\/([\w-]+\.(?:png|jpe?g|gif|webp))$/.exec(u.pathname);
      if (req.method === 'GET' && im) {
        if (!tokenOk(u.searchParams.get('t'))) return send(res, 401, '', 'text/plain');
        const f = path.join(notesDir(), im[1]);
        return fs.readFile(f, (err, b) => (err ? send(res, 404, '', 'text/plain') : send(res, 200, b, MIME[im[1].split('.').pop()] || 'image/png', { 'Cache-Control': 'private, max-age=86400' })));
      }
      const rm = /^\/rpc\/(\w+)$/.exec(u.pathname);
      if (req.method === 'POST' && rm && Object.prototype.hasOwnProperty.call(RPC, rm[1])) {
        if (!tokenOk(req.headers['x-prumo-token'])) return send(res, 401, '{"error":"pareamento"}');
        let size = 0; const chunks = [];
        for await (const c of req) { size += c.length; if (size > 30e6) return send(res, 413, '{"error":"grande demais"}'); chunks.push(c); }
        const args = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : [];
        const out = await RPC[rm[1]](...(Array.isArray(args) ? args : []));
        return send(res, 200, JSON.stringify(out === undefined ? null : out));
      }
      send(res, 404, 'não encontrado', 'text/plain; charset=utf-8');
    } catch (e) { send(res, 500, JSON.stringify({ error: String((e && e.message) || e) })); }
  }
  const tryListen = (p, left) => new Promise((ok, fail) => {
    const s = http.createServer(onRequest);
    s.once('error', (e) => { if (left > 0 && e.code === 'EADDRINUSE') tryListen(p + 1, left - 1).then(ok, fail); else fail(e); });
    s.listen(p, '0.0.0.0', () => { server = s; port = p; ok(p); });
  });
  return {
    async start() { if (server) return port; return tryListen((getState().mobile || {}).port || 47810, 10); },
    stop() { if (server) { server.close(); server.closeAllConnections && server.closeAllConnections(); server = null; port = 0; } },
    bump() { ver++; },
    info() {
      const m = getState().mobile || {}, ips = lanIPs();
      const url = server && ips.length ? `http://${ips[0]}:${port}/#t=${m.token}` : '';
      let qr = '';
      if (url) { const q = require('qrcode-generator')(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }); }
      return { on: !!server, port, ips, url, qr };
    },
  };
}
module.exports = { createRemote, lanIPs };
