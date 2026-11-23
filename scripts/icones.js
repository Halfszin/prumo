// Gera todos os ícones do Prumo a partir de build/logo.svg (o desenho vetorial).
// Cada tamanho é desenhado direto do vetor pelo Chromium, sem reduzir imagem grande, para não serrilhar.
// Uso: node scripts/icones.js   (precisa do playwright com Chromium; o .ico sai com o ImageMagick)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), B = (...p) => path.join(root, 'build', ...p);
const d = /<path d="([^"]+)"/.exec(fs.readFileSync(B('logo.svg'), 'utf8'))[1];
const [vx, vy, vw, vh] = /viewBox="([^"]+)"/.exec(fs.readFileSync(B('logo.svg'), 'utf8'))[1].split(/\s+/).map(Number);

// ícone do app: fundo roxo arredondado + símbolo branco. Em tamanhos pequenos o símbolo fica maior para continuar legível.
function icon(size, { frac = size <= 32 ? 0.74 : 0.59, bg = true, color = '#fff' } = {}) {
  const s = (frac * 512) / vh, w = vw * s, h = vh * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">` +
    (bg ? '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3bed"/><stop offset="1" stop-color="#8a5af6"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/>' : '') +
    `<path fill="${color}" transform="translate(${(512 - w) / 2} ${(512 - h) / 2}) scale(${s}) translate(${-vx} ${-vy})" d="${d}"/></svg>`;
}
const wide = (w, h, ih) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><svg x="${(w - ih) / 2}" y="${(h - ih) / 2}" width="${ih}" height="${ih}" viewBox="0 0 512 512">${icon(512).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></svg>`;

const out = [
  ['build/icon.png', icon(512)],
  ['build/logo.png', icon(128, { bg: false, color: '#000', frac: 0.92 })],
  ['build/tray.png', icon(16)], ['build/tray@2x.png', icon(32)],
  ['build/appx/StoreLogo.png', icon(50)], ['build/appx/Square44x44Logo.png', icon(44)], ['build/appx/SmallTile.png', icon(71)],
  ['build/appx/Square150x150Logo.png', icon(150)], ['build/appx/LargeTile.png', icon(310)], ['build/appx/Wide310x150Logo.png', wide(310, 150, 120)],
  ['mobile/www/icon.png', icon(128)],
  ...[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].flatMap(([dp, n]) =>
    ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'].map((f) => [`mobile/res/mipmap-${dp}/${f}.png`, icon(n)])),
];
const ICO = [16, 20, 24, 32, 40, 48, 64, 128, 256];
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const shot = async (svg, file) => {
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg);
    await p.setViewportSize({ width: +w, height: +h });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await p.screenshot({ path: path.join(root, file), omitBackground: true });
  };
  for (const [f, svg] of out) await shot(svg, f);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ico-'));
  for (const n of ICO) await shot(icon(n), path.relative(root, path.join(tmp, n + '.png')));
  await b.close();
  execFileSync('convert', [...ICO.map((n) => path.join(tmp, n + '.png')), B('icon.ico')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ícones gerados:', out.length + 1);
})();
