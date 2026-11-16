// Roda só no celular, quando a página vem do Prumo do computador (ver remote.js).
// Faz o papel do window.api do Electron conversando com o PC pela rede de casa.
(function () {
  var m = location.hash.match(/t=([\w-]+)/);
  if (m) { try { localStorage.setItem('prumo-token', m[1]); } catch (e) {} history.replaceState(null, '', location.pathname); }
  var T = ''; try { T = localStorage.getItem('prumo-token') || ''; } catch (e) {}
  // QR lido com a página já aberta: guarda o código novo e recarrega
  window.addEventListener('hashchange', function () { var h = location.hash.match(/t=([\w-]+)/); if (h) { try { localStorage.setItem('prumo-token', h[1]); } catch (e) {} location.replace(location.pathname); } });
  var ver = null, NU = '';
  function unpaired() {
    document.documentElement.classList.add('unpaired');
    var show = function () {
      if (document.getElementById('unpaired')) return;
      var d = document.createElement('div'); d.id = 'unpaired';
      d.innerHTML = '<div><b>Conecte ao Prumo do computador</b><p>No computador, abra o Prumo em <b>Configurações &gt; Celular</b>, ligue o acesso e leia o QR code com a câmera deste celular.</p><p>Os dois precisam estar no mesmo Wi-Fi.</p></div>';
      document.body.appendChild(d);
    };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show);
  }
  if (!T) unpaired();
  function rpc(n) {
    var a = [].slice.call(arguments, 1);
    return fetch('/rpc/' + n, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Prumo-Token': T }, body: JSON.stringify(a) }).then(function (r) {
      if (r.status === 401) { unpaired(); throw new Error('pareamento'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.error || 'erro ' + r.status); return j; });
    });
  }
  // imagens das notas: no PC são file:///…/notas/x.png; no celular vêm do servidor
  function toWeb(h) { return NU && h ? h.split(NU).join('/img/').replace(/\/img\/([\w-]+\.(?:png|jpe?g|gif|webp))(?!\?t=)/g, '/img/$1?t=' + T) : h; }
  function toPc(h) { return NU && h ? h.replace(/\/img\/([\w-]+\.(?:png|jpe?g|gif|webp))\?t=[\w-]*/g, function (_, n) { return NU + n; }) : h; }
  var LP = 'prumo-m-prefs';
  function lprefs() { try { return JSON.parse(localStorage.getItem(LP)) || {}; } catch (e) { return {}; } }
  var ok = function (v) { return function () { return Promise.resolve(v); }; };
  var noop = function () {};
  var pcOnly = function () { return Promise.reject(new Error('Disponível só no computador')); };
  var api = {
    remote: true,
    getState: function () {
      return rpc('getState').then(function (s) {
        NU = s.notesUrl || '';
        (s.notes || []).forEach(function (n) { n.html = toWeb(n.html); });
        s.prefs = Object.assign({ privacyOk: s.privacyOk }, lprefs(), { welcomed: true }); // a política já foi aceita no computador
        return s;
      });
    },
    setState: function (k, v) {
      if (k === 'prefs') { try { localStorage.setItem(LP, JSON.stringify(v)); } catch (e) {} return Promise.resolve(); }
      if (k === 'rules' || k === 'bg' || k === 'update' || k === 'colors') return Promise.resolve(); // ajustes do PC ficam no PC
      if (k === 'notes') v = v.map(function (n) { return Object.assign({}, n, { html: toPc(n.html) }); });
      return rpc('setState', k, v).then(function (nv) { ver = nv; });
    },
    scan: function () { return rpc('scan'); },
    extraScan: function () { return rpc('extraScan'); },
    extraList: function () { return rpc('extraList'); },
    search: function (q, p) { return rpc('search', q, p); },
    preview: function (p) { return rpc('preview', p); },
    noteImg: function (d) { return rpc('noteImg', d).then(function (u) { return u ? toWeb(u) : u; }); },
    paths: function () { return rpc('paths'); },
    open: function (p) { window.open('/f?p=' + encodeURIComponent(p) + '&t=' + encodeURIComponent(T), '_blank'); return Promise.resolve(''); },
    fileUrl: function (p) { return '/f?p=' + encodeURIComponent(p) + '&t=' + encodeURIComponent(T); },
    download: function (p) { location.href = '/f?baixar=1&p=' + encodeURIComponent(p) + '&t=' + encodeURIComponent(T); },
    copy: function (t) { try { navigator.clipboard.writeText(t); } catch (e) {} return Promise.resolve(); },
    openUrl: function (u) { if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); return Promise.resolve(true); },
    undoCount: ok(0), undoInfo: ok(null), history: ok([]), updateStatus: ok({}), updateState: ok(null), hash: ok({}), nfe: ok([]),
    reveal: ok(), setSpell: noop,
    onFilesChanged: noop, onBgChanged: noop, onUpdate: noop, onUpdateStatus: noop, onSearchProgress: noop, onOpenCal: noop, onRemoteSet: noop,
  };
  ['pickFolder', 'apply', 'undo', 'pickDir', 'trash', 'undoItems', 'exportRules', 'importRules', 'copyImage', 'exportData', 'openData', 'openLicenses',
    'wipeData', 'installUpdate', 'revealUpdate', 'openUpdateLog', 'checkUpdate', 'extraAdd', 'extraDel', 'favPick', 'pathOf', 'mobileInfo', 'mobileSet', 'mobileNewCode'].forEach(function (k) { api[k] = pcOnly; });
  window.api = api;
  document.documentElement.classList.add('remote');
  // mudanças feitas no computador aparecem aqui (sem atrapalhar quem está digitando)
  setInterval(function () {
    if (document.hidden || !T) return;
    rpc('ver').then(function (v) {
      var a = document.activeElement, typing = a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || document.querySelector('dialog[open]');
      if (ver !== null && v !== ver && !typing) location.reload();
      if (!typing || ver === null) ver = v;
    }).catch(noop);
  }, 5000);
})();
