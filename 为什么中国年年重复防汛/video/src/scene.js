import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/700.css';
import timeline from './timeline.json';
import { LINES, SOURCE } from './script.js';

const logoUrl = new URL('../assets/sooon-logo.png', import.meta.url).href;
const euUrl = new URL('../assets/europe.png', import.meta.url).href;
const cnUrl = new URL('../assets/china.png', import.meta.url).href;

// ---------- palette & helpers ----------
const C = {
  bg: '#09090d',
  text: '#ece7dd',
  em: '#e0b67c',      // warm amber: light, order, emphasis
  dim: 'rgba(236,231,221,0.55)',
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (p) => { p = clamp(p); return p * p * (3 - 2 * p); };
const easeOut = (p) => 1 - (1 - clamp(p)) ** 3;
const easeIn = (p) => clamp(p) ** 2;
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const frac = (v) => v - Math.floor(v);
const TAU = Math.PI * 2;
function mixHex(a, b, p) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, p));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cream = (a) => `rgba(236,231,221,${clamp(a).toFixed(3)})`;
const amber = (a) => `rgba(224,182,124,${clamp(a).toFixed(3)})`;
const water = (a) => `rgba(126,164,212,${clamp(a).toFixed(3)})`;

// Time at which the narration reaches `word` inside line `it` (proportional to characters).
const kw = (it, word, off = 0) => {
  const s = LINES[it.i].speak;
  const k = s.indexOf(word);
  return it.start + it.duration * (k < 0 ? 0.5 : k / s.length) + off;
};

const CSS = `
.mh-root{position:relative;overflow:hidden;background:${C.bg};color:${C.text};
  font-family:'Noto Serif SC',serif;font-weight:400}
.mh-root *{box-sizing:border-box}
.layer{position:absolute;inset:0}
.blk{position:absolute;left:0;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;transform:translateY(-50%)}
.line span.c{display:inline-block;white-space:pre;will-change:opacity,transform,filter}
.s-xl{font-size:118px;font-weight:700;letter-spacing:.12em;line-height:1.4}
.s-l{font-size:74px;font-weight:700;letter-spacing:.08em;line-height:1.5}
.s-q{font-size:64px;font-weight:700;letter-spacing:.06em;line-height:1.6}
.s-m{font-size:52px;letter-spacing:.05em;line-height:1.7}
.s-s{font-size:46px;letter-spacing:.04em;line-height:1.7}
.tag{font-size:28px;letter-spacing:.5em;color:${C.em};margin-bottom:40px}
.lbl{position:absolute;left:0;top:0;white-space:nowrap;transform:translate(-50%,-50%);opacity:0;
  font-size:24px;letter-spacing:.25em;color:${C.dim};text-shadow:0 2px 10px rgba(0,0,0,.85),0 0 4px rgba(0,0,0,.9)}
.rule{height:1px;background:${C.em};opacity:.5;margin:40px 0 44px}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.src-title{font-size:34px;letter-spacing:.06em;max-width:1500px;line-height:1.6}
.src-title b{color:${C.em};font-weight:400;margin-right:.6em}
.src-url{font-size:22px;letter-spacing:.06em;margin-top:22px;color:rgba(236,231,221,.5);font-family:Georgia,'Noto Serif SC',serif}
`;

// Split "[emphasis]" markup into per-character spans, grouped into phrases.
// A phrase ends after punctuation or a line break; each phrase appears as one unit.
const PUNCT = /[，。、！？；：—…“”!?;（）]/; // no ASCII "." — it can be a decimal point
function makeLine(show, className = '') {
  const el = document.createElement('div');
  el.className = `line ${className}`;
  const chars = [];
  const src = [...show];
  let em = false, k0 = 0, brk = false;
  src.forEach((ch, j) => {
    if (ch === '[') { em = true; return; }
    if (ch === ']') { em = false; return; }
    if (ch === '\n') { el.append(document.createElement('br')); brk = true; return; }
    if (brk) { k0 = chars.length; brk = false; }
    const s = document.createElement('span');
    s.className = 'c';
    s.textContent = ch;
    el.append(s);
    chars.push({ s, em, k0 });
    const next = src.slice(j + 1).find((c) => c !== '[' && c !== ']');
    if (PUNCT.test(ch) && !(next && PUNCT.test(next))) brk = true;
  });
  return { el, chars };
}

// Phrases appear in step with the narration: a phrase starts when the voice reaches it.
function reveal(chars, t, start, dur, { fade = 0.8, rise = 8, blur = 3, emDelay = 0.6, emColor = C.em, base = C.text, dimTo = 1 } = {}) {
  const n = chars.length;
  chars.forEach(({ s, em, k0 }) => {
    const ct = start - 0.15 + (k0 / n) * dur * 0.9;
    const p = easeOut(ramp(t, ct, ct + fade));
    const ep = em ? smooth(ramp(t, ct + emDelay, ct + emDelay + 0.6)) : 0;
    s.style.opacity = String(p * dimTo);
    s.style.transform = `translateY(${(1 - p) * rise}px)`;
    s.style.filter = p < 1 ? `blur(${(1 - p) * blur}px)` : 'none';
    s.style.color = em ? mixHex(base, emColor, ep) : base;
  });
}

// ---------- drawing primitives (logical px) ----------
function lineP(ctx, x1, y1, x2, y2, p) {
  if (p <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(lerp(x1, x2, p), lerp(y1, y2, p));
  ctx.stroke();
}

function drawOrb(ctx, x, y, r, a, warm = 1) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
  g.addColorStop(0, `rgba(255,226,170,${a * warm})`);
  g.addColorStop(0.35, `rgba(224,182,124,${0.5 * a * warm})`);
  g.addColorStop(1, 'rgba(224,182,124,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,238,205,${a})`;
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
}

function softGlow(ctx, x, y, r, a, rgb = '224,182,124') {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function burst(ctx, x, y, t, t0, { n = 22, seed = 1, radius = 120, life = 1.4, color = amber, glow = '224,182,124' } = {}) {
  const tau = t - t0;
  if (tau < 0 || tau > life) return;
  const rnd = mulberry32(seed);
  const p = tau / life;
  for (let k = 0; k < n; k++) {
    const ang = rnd() * TAU, sp = 0.5 + rnd() * 0.5, sz = 1.4 + rnd() * 2.2;
    const d = easeOut(p) * radius * sp;
    ctx.fillStyle = color((1 - p) ** 1.5);
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d + p * p * 20, sz * (1 - p * 0.5), 0, TAU); ctx.fill();
  }
  softGlow(ctx, x, y, radius * 0.9, 0.35 * (1 - p) ** 2, glow);
}

function drawPerson(ctx, x, y, h, { alpha = 1, color = cream(0.92), armUp = 0 } = {}) {
  if (alpha <= 0) return;
  const u = h / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6.5 * u;
  const hipY = -50 * u, neckY = hipY - 32 * u;
  for (const s of [0.22, -0.22]) {
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(Math.sin(s) * 50 * u, 0); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, neckY); ctx.stroke();
  for (const [k, a0] of [[0, -0.35], [1, 0.35]]) {
    const ang = k === 1 ? lerp(a0, Math.PI * 0.85, armUp) : a0;
    const ex = Math.sin(ang) * 17 * u, ey = neckY + 4 * u + Math.cos(ang) * 17 * u;
    ctx.beginPath(); ctx.moveTo(0, neckY + 4 * u); ctx.lineTo(ex, ey);
    ctx.lineTo(ex + Math.sin(ang) * 16 * u, ey + Math.cos(ang) * 16 * u); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, neckY - 11 * u, 8.5 * u, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawMountain(ctx, cx, by, w, h, { alpha = 1, glow = 0, fill = 'rgba(20,19,25,0.97)' } = {}) {
  if (alpha <= 0) return;
  const P = [[-0.5, 0], [-0.33, -0.42], [-0.24, -0.34], [-0.06, -1], [0.1, -0.7], [0.2, -0.78], [0.5, 0]];
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow > 0) softGlow(ctx, cx, by - h * 0.45, w * 0.75, 0.22 * glow);
  ctx.beginPath();
  P.forEach(([px, py], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, cx + px * w, by + py * h));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = glow > 0 ? mixHex('#ece7dd', C.em, glow) : cream(0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = cream(0.25);
  ctx.beginPath();
  ctx.moveTo(cx - 0.13 * w, by - 0.78 * h); ctx.lineTo(cx - 0.06 * w, by - h); ctx.lineTo(cx + 0.03 * w, by - 0.84 * h);
  ctx.stroke();
  ctx.restore();
}

// Small "^" ridge mark.
function chevron(ctx, x, y, s, a, color = cream) {
  if (a <= 0) return;
  ctx.strokeStyle = color(a);
  ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.55); ctx.lineTo(x, y - s * 0.45); ctx.lineTo(x + s, y + s * 0.55); ctx.stroke();
}

function polyAt(pts, p) {
  const lens = [];
  let total = 0;
  for (let k = 1; k < pts.length; k++) {
    const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    lens.push(l); total += l;
  }
  let d = clamp(p) * total;
  for (let k = 0; k < lens.length; k++) {
    if (d <= lens[k] || k === lens.length - 1) {
      const f = lens[k] ? clamp(d / lens[k]) : 0;
      return [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f), k];
    }
    d -= lens[k];
  }
  return [...pts[pts.length - 1], pts.length - 2];
}

function strokePoly(ctx, pts, p, from = 0) {
  if (p <= from) return;
  const [sx, sy, k0] = polyAt(pts, from);
  const [ex, ey, k] = polyAt(pts, p);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  for (let j = k0 + 1; j <= k; j++) ctx.lineTo(pts[j][0], pts[j][1]);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

// Catmull-Rom resample of a coarse polyline.
function smoothPts(P, seg = 10) {
  const out = [];
  const n = P.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n - 1)];
    for (let s = 0; s < seg; s++) {
      const u = s / seg, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  out.push([...P[n - 1]]);
  return out;
}

function wiggly(rnd, x0, y0, x1, y1, n, w) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  const P = [];
  for (let j = 0; j <= n; j++) {
    const u = j / n, o = j > 0 && j < n ? (rnd() - 0.5) * w : 0;
    P.push([lerp(x0, x1, u) + nx * o, lerp(y0, y1, u) + ny * o]);
  }
  return smoothPts(P, 8);
}

function arrowHead(ctx, x, y, ang, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
  ctx.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s);
  ctx.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s);
  ctx.closePath(); ctx.fill();
}

function arrowPoly(ctx, pts, p, color, w = 3, head = 14) {
  if (p <= 0.01) return;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  strokePoly(ctx, pts, p);
  const [x, y] = polyAt(pts, p);
  const [bx, by] = polyAt(pts, Math.max(0, p - 0.03));
  arrowHead(ctx, x, y, Math.atan2(y - by, x - bx), head, color);
}

// Moving water: dashes flowing along a path.
function flowPoly(ctx, pts, p, t, { color = water(0.8), w = 3, speed = 40, dash = [8, 14] } = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.setLineDash(dash);
  ctx.lineDashOffset = -t * speed;
  strokePoly(ctx, pts, p);
  ctx.restore();
}

// Ambient dust.
const DUST = (() => {
  const rnd = mulberry32(7), out = [];
  for (let k = 0; k < 90; k++) out.push({ x: rnd() * 1920, y: rnd() * 1080, v: 6 + rnd() * 14, f: 0.1 + rnd() * 0.3, ph: rnd() * 6.28, r: 0.6 + rnd() * 1.8, a: 0.15 + rnd() * 0.45 });
  return out;
})();

// Where each section's text block sits (vertical centre, px).
const TEXT_Y = {
  title: 400, noRiver: 220, monsoon: 190, funnel: 200, rivers: 200, bengal: 200, mapEU: 165, mapCN: 175,
  profile: 180, plain: 210, exam: 200, pass: 215, fail: 210, logic: 500, rise: 200, flood100: 200,
  refugee: 200, decline: 200, credit: 210, nomads: 200, delay: 210, concrete: 210, limit: 200,
  dragons: 210, fangxun: 470, levee: 220, source: 200, curse: 210, end: 400,
};
const ART_OF = { rise: 'cycle', flood100: 'cycle' };

// ---------- shared geometry ----------
// Monsoon cross-section terrain.
const TERR_M = [[0, 900], [620, 900], [800, 860], [950, 760], [1080, 640], [1200, 560], [1300, 470], [1380, 430], [1460, 470], [1560, 520], [1700, 600], [1920, 640]];
const groundAt = (x) => {
  for (let k = 1; k < TERR_M.length; k++) if (x <= TERR_M[k][0]) return lerp(TERR_M[k - 1][1], TERR_M[k][1], (x - TERR_M[k - 1][0]) / (TERR_M[k][0] - TERR_M[k - 1][0]));
  return TERR_M[TERR_M.length - 1][1];
};

// The funnel: tributaries fanning in to one gorge, then the main channel to the plain.
const GORGE = [1000, 720];
const TRIBS = (() => {
  const rnd = mulberry32(42), o = [];
  for (let k = 0; k < 9; k++) {
    const ang = ((148 + k * 8) * Math.PI) / 180;
    const S = [GORGE[0] + Math.cos(ang) * 520, GORGE[1] - Math.sin(ang) * 520];
    o.push(wiggly(rnd, S[0], S[1], GORGE[0], GORGE[1], 4, 70));
  }
  return o;
})();
const RIDGES = (() => { const o = []; for (let a = 140; a <= 220; a += 5) { const r = (a * Math.PI) / 180; o.push([GORGE[0] + Math.cos(r) * 580, GORGE[1] - Math.sin(r) * 580, a]); } return o; })();
const MAIN = smoothPts([[1000, 720], [1180, 700], [1340, 760], [1520, 730], [1720, 770], [1900, 760]]);

// China schematic.
const YR = smoothPts([[360, 620], [480, 590], [600, 630], [700, 560], [760, 450], [880, 420], [1000, 450], [1040, 560], [1060, 660], [1180, 640], [1320, 610], [1450, 560], [1560, 540]], 8);
const YZ = smoothPts([[340, 760], [460, 800], [540, 880], [620, 930], [720, 900], [840, 880], [960, 860], [1080, 870], [1200, 850], [1320, 820], [1440, 800], [1590, 780]], 8);
const COAST = smoothPts([[1640, 380], [1560, 520], [1620, 640], [1590, 780], [1560, 880], [1480, 1000]], 8);
const CN_MTN = (() => { const rnd = mulberry32(9), o = []; for (let k = 0; k < 26; k++) o.push([290 + rnd() * 330, 520 + rnd() * 380, 10 + rnd() * 10]); return o; })();

export default function ({ root, width, height, pixelRatio }) {
  root.classList.add('mh-root');
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const items = timeline.items;
  const END = timeline.endCard;

  const runs = [];
  for (const it of items) {
    const key = ART_OF[it.section] ?? it.section;
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.items.push(it);
    else runs.push({ key, items: [it], start: it.start });
  }
  runs.forEach((r, k) => { r.end = k + 1 < runs.length ? runs[k + 1].start : END + 0.6; });

  // --- layers ---
  const glow = document.createElement('div');
  glow.className = 'layer';
  const art = document.createElement('canvas');
  art.className = 'layer';
  art.width = Math.round(width * pixelRatio);
  art.height = Math.round(height * pixelRatio);
  art.style.cssText = 'width:100%;height:100%';
  const ctx = art.getContext('2d');
  const content = document.createElement('div');
  content.className = 'layer';
  const grain = document.createElement('canvas');
  grain.className = 'layer';
  grain.width = 640; grain.height = 360;
  grain.style.cssText = 'width:100%;height:100%;mix-blend-mode:overlay;opacity:.14';
  const vignette = document.createElement('div');
  vignette.className = 'layer';
  vignette.style.background = 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,.72) 100%)';
  root.append(glow, art, content, grain, vignette);
  {
    const gctx = grain.getContext('2d');
    const gimg = gctx.createImageData(grain.width, grain.height);
    const rnd = mulberry32(17);
    const d = gimg.data;
    for (let p = 0; p < d.length; p += 4) { const v = (rnd() * 255) | 0; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
    gctx.putImageData(gimg, 0, 0);
  }

  // --- map images (drawn on the canvas) ---
  const imgEU = new Image(); imgEU.src = euUrl;
  const imgCN = new Image(); imgCN.src = cnUrl;
  let imgReady = Promise.all([imgEU.decode(), imgCN.decode()]).catch(() => {});

  // --- labels placed by the illustrations ---
  const labelLayer = document.createElement('div');
  labelLayer.className = 'layer';
  const labels = new Map();
  const mkLabel = (key, text, css = '') => {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.textContent = text;
    if (css) el.style.cssText = css;
    labelLayer.append(el);
    labels.set(key, el);
    return el;
  };
  const used = new Set();
  const lbl = (key, x, y, a, extra = '') => {
    const el = labels.get(key);
    if (a <= 0.001) return;
    used.add(key);
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.opacity = String(clamp(a));
    el.style.transform = `translate(-50%,-50%) ${extra}`;
  };
  const AMB = `color:${C.em}`;
  const BLU = 'color:rgba(150,185,225,.85)';
  const BIG = 'font-size:30px;letter-spacing:.35em';
  // noRiver
  mkLabel('euPanel', '欧 洲', '');
  mkLabel('cnPanel', '中 国', '');
  // monsoon
  mkLabel('mSea', '海 洋', BLU);
  mkLabel('mWind', '季候风 →', BLU);
  mkLabel('mMtn', '山 脉', '');
  mkLabel('mAlt', '一定海拔', 'font-size:20px');
  mkLabel('mRain', '集中降雨', `${AMB}`);
  // funnel / source
  mkLabel('fValley', '山谷 · 收集器', '');
  mkLabel('fGorge', '峡 谷', 'font-size:22px');
  mkLabel('fCrest', '洪 峰', `${BIG};${AMB}`);
  mkLabel('fPlain', '冲积平原', '');
  mkLabel('sHengduan', '横断山脉', `${AMB}`);
  mkLabel('sHimalaya', '喜马拉雅山脉', `${AMB}`);
  mkLabel('sDam', '水利工程', `${AMB}`);
  mkLabel('sSponge', '海绵城市', `${AMB}`);
  // rivers
  mkLabel('rYR', '黄 河', `${BIG};${AMB}`);
  mkLabel('rYZ', '长 江', `${BIG};${AMB}`);
  mkLabel('rMtn', '上游山脉', '');
  mkLabel('rSea', '海', BLU);
  mkLabel('rCrest', '季节洪峰', BLU);
  // bengal
  mkLabel('bHim', '喜马拉雅山脉', '');
  mkLabel('bBd', '孟加拉', `${BIG};${AMB}`);
  // maps
  mkLabel('euAtl', '大西洋', BLU);
  mkLabel('euMed', '地中海', BLU);
  mkLabel('euMtn', '山 脉', `${BIG};${AMB}`);
  mkLabel('euPlain', '平 原', `${BIG};color:${C.text}`);
  mkLabel('cnMtn', '山 脉', `${BIG};${AMB}`);
  mkLabel('cnPlain', '平 原', `${BIG};color:${C.text}`);
  mkLabel('cnSea', '海 洋', `${BIG};color:rgba(170,200,235,.95)`);
  // profile
  mkLabel('pEU', '欧 洲', `${BIG};color:${C.text}`);
  mkLabel('pCN', '中 国', `${BIG};color:${C.text}`);
  mkLabel('pEUsea', '大 海', BLU);
  mkLabel('pEUmtn', '山 脉', 'font-size:22px');
  mkLabel('pEUplain', '平原 · 雨水少', 'font-size:22px');
  mkLabel('pEUback', '← 送回大海', `font-size:22px;${BLU}`);
  mkLabel('pEUsmall', '中小河流', `font-size:22px;${BLU}`);
  mkLabel('pCNmtn', '山 脉', 'font-size:22px');
  mkLabel('pCNplain', '平 原', 'font-size:22px');
  mkLabel('pCNsea', '大 海', BLU);
  mkLabel('pCNriver', '长江 · 黄河', `${AMB}`);
  // plain
  mkLabel('plEU', '欧洲 · 碎片化的小平原', '');
  mkLabel('plCN', '超大冲积平原', '');
  mkLabel('plUnify', '巨型统一国家', `${BIG};${AMB}`);
  // exam
  mkLabel('exCenter', '中原王朝', `${AMB}`);
  mkLabel('exFlood', '汛 期', BLU);
  mkLabel('exYear', '', 'font-size:28px;letter-spacing:.3em');
  mkLabel('exExam', '年度大考', `${BIG};${AMB}`);
  // pass / fail
  mkLabel('paTai', '泰 山', '');
  mkLabel('faLeft', '仅存的余粮', `font-size:22px;${AMB}`);
  for (const k of ['N', 'E', 'S', 'W']) mkLabel(`foe${k}`, '外 敌', 'font-size:22px;color:rgba(160,180,210,.8)');
  // cycle chart
  mkLabel('cyY', '国 力', 'font-size:22px');
  for (const y of [0, 50, 100, 150]) mkLabel(`cy${y}`, `${y}`, "font-size:20px;letter-spacing:.05em;font-family:Georgia,'Noto Serif SC',serif");
  mkLabel('cyYears', '年', 'font-size:20px');
  mkLabel('cyPeace', '太平盛世', `${AMB}`);
  mkLabel('cyExpand', '封狼居胥 ↗', `${AMB}`);
  mkLabel('cy100', '百 年', 'font-size:22px');
  mkLabel('cyFlood', '大 灾', `${BIG};${BLU}`);
  mkLabel('cyTicks', '每一点 = 一年的大考', 'font-size:18px;letter-spacing:.15em');
  // refugee
  mkLabel('rfCore', '核心地区', `${AMB}`);
  mkLabel('rfFlood', '边远灾区', BLU);
  mkLabel('rfNeigh', '周边地区', '');
  mkLabel('rfFar', '鞭长莫及', 'font-size:22px');
  mkLabel('rfLand', '有地 · 被淹', `font-size:22px;${BLU}`);
  mkLabel('rfFlow', '流 民', 'font-size:22px');
  mkLabel('rfHalf', '两倍人 · 半份粮', `${AMB}`);
  mkLabel('rfConflict', '土客矛盾', `${BIG};${AMB}`);
  mkLabel('rfFort', '坞 堡', 'font-size:22px');
  // decline
  const PAIRS = [['西周', '东周'], ['西汉', '东汉'], ['早唐', '晚唐'], ['北宋', '南宋']];
  PAIRS.forEach(([a, b], k) => { mkLabel(`dA${k}`, a, `${BIG};${AMB}`); mkLabel(`dB${k}`, b, `${BIG};color:rgba(236,231,221,.5)`); });
  mkLabel('dTurn', '由盛转衰', 'font-size:22px');
  // credit
  mkLabel('crSeal', '政府信用', `${BIG};${AMB}`);
  mkLabel('crFirst', '前半程', 'font-size:22px');
  mkLabel('crSecond', '后半程', 'font-size:22px');
  mkLabel('crKey', '每格 = 一年：金 = 考过 · 蓝 = 考不过', 'font-size:18px;letter-spacing:.12em');
  // nomads
  mkLabel('nCenter', '中 原', `${BIG};${AMB}`);
  mkLabel('nSteppe', '周边蛮族', '');
  mkLabel('nLeader', '杰出领袖', `${AMB}`);
  mkLabel('nQuota', '保送名额', `${AMB}`);
  mkLabel('nBreach', '决 口', `font-size:22px;${BLU}`);
  mkLabel('nChange', '改朝换代', `${BIG};${AMB}`);
  // delay
  mkLabel('dlBar', '', `${BIG};${AMB}`);
  mkLabel('dlFlood', '水龙发作', `font-size:22px;${BLU}`);
  mkLabel('dlLater', '推 迟 →', 'font-size:22px');
  mkLabel('dlLonger', '← 拉 长 →', 'font-size:22px');
  // concrete / limit
  mkLabel('coTech', '钢筋混凝土 · 挖掘机', `${AMB}`);
  mkLabel('coRidge', '喜马拉雅山', 'font-size:22px');
  mkLabel('liDragons', '两条水龙', BLU);
  mkLabel('liCount', '', `font-size:44px;letter-spacing:.08em;${AMB};font-family:Georgia,'Noto Serif SC',serif`);
  mkLabel('liCountT', '倒 数', 'font-size:20px');
  mkLabel('liLimit', '极 限', 'font-size:22px');
  mkLabel('liShrink', '内 缩', `${BIG};${BLU}`);
  // dragons
  mkLabel('drYR', '黄 河', `${BIG};${AMB}`);
  mkLabel('drYZ', '长 江', `${BIG};color:rgba(170,200,235,.95)`);
  mkLabel('drBarb', '蛮 族', 'font-size:22px');
  // levee
  mkLabel('lvLevee', '钢筋混凝土堤防', `${AMB}`);
  mkLabel('lv2000', '两千多年', 'font-size:22px');
  // curse
  mkLabel('cuLoop', '三千年的轮回', '');
  mkLabel('cuValve', '每年每月 · 流多少', `font-size:22px;${AMB}`);
  mkLabel('cuOpen', '史无前例 →', `${AMB}`);

  // --- text blocks: consecutive lines in one `group` stay stacked ---
  const blocks = [];
  for (const it of items) {
    const last = blocks[blocks.length - 1];
    if (it.group && last && last.group === it.group) last.items.push(it);
    else blocks.push({ group: it.group, section: it.section, items: [it] });
  }
  const sizeOf = (it) => {
    const show = LINES[it.i].show.replace(/[[\]]/g, '');
    const longest = Math.max(...show.split('\n').map((s) => [...s].length));
    if (it.section === 'title') return 's-q';
    if (longest <= 7) return 's-xl';
    if (longest <= 12) return 's-l';
    if (longest <= 26) return 's-m';
    return 's-s';
  };
  blocks.forEach((b, k) => {
    b.el = document.createElement('div');
    b.el.className = 'blk';
    b.el.style.top = `${TEXT_Y[b.section]}px`;
    if (b.section === 'title') {
      b.tag = document.createElement('div');
      b.tag.className = 'tag';
      b.tag.textContent = SOURCE.tag;
      b.el.append(b.tag);
    }
    b.lines = b.items.map((it) => {
      const ln = makeLine(LINES[it.i].show, sizeOf(it));
      b.el.append(ln.el);
      return { it, ...ln };
    });
    b.in = b.items[0].start - 0.4;
    b.out = k + 1 < blocks.length ? blocks[k + 1].items[0].start : END + 0.7;
    content.append(b.el);
  });
  content.append(labelLayer);

  // --- end card: logo + source ---
  const card = document.createElement('div');
  card.className = 'layer card';
  const logo = document.createElement('img');
  logo.src = logoUrl;
  logo.style.cssText = 'width:256px;height:128px';
  const rule = document.createElement('div');
  rule.className = 'rule';
  const srcTitle = document.createElement('div');
  srcTitle.className = 'src-title';
  srcTitle.innerHTML = '<b></b><span></span>';
  srcTitle.querySelector('b').textContent = SOURCE.tag;
  srcTitle.querySelector('span').textContent = SOURCE.title;
  const srcUrl = document.createElement('div');
  srcUrl.className = 'src-url';
  srcUrl.textContent = SOURCE.url;
  card.append(logo, rule, srcTitle);
  if (SOURCE.url) card.append(srcUrl);
  content.append(card);

  // ================= illustrations =================
  const ARTS = {};

  // A long river line; a flood crest rolls along it, year after year.
  ARTS.title = (t, run, A) => {
    const y0 = 820;
    const draw = easeOut(ramp(t, 0.4, 3));
    const crestOn = smooth(ramp(t, 1.2, 2.6));
    ctx.save(); ctx.globalAlpha = A;
    for (let L = 0; L < 3; L++) {
      ctx.beginPath();
      for (let x = 0; x <= width * draw; x += 8) {
        let y = y0 + L * 48 + Math.sin(x * 0.006 + t * 0.6 + L * 0.9) * (10 - L * 2);
        if (L === 0) {
          const cx = frac((t - 1.2) / 3.4) * 2400 - 240;
          y -= 80 * Math.exp(-(((x - cx) / 170) ** 2)) * crestOn;
        }
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = L === 0 ? water(0.75) : water(0.28 - L * 0.07);
      ctx.lineWidth = L === 0 ? 2.5 : 1.5;
      ctx.stroke();
    }
    const cx = frac((t - 1.2) / 3.4) * 2400 - 240;
    softGlow(ctx, cx, y0 - 60, 200, 0.12 * crestOn, '126,164,212');
    ctx.restore();
  };

  // Europe: many short rivers. China: two long ones.
  const EU_RIVERS = (() => {
    const rnd = mulberry32(21), o = [];
    for (let k = 0; k < 16; k++) {
      const x = 380 + rnd() * 460, y = 480 + rnd() * 420, ang = rnd() * TAU, L = 60 + rnd() * 80;
      o.push({ pts: wiggly(rnd, x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L, 4, 24), d: rnd() });
    }
    return o;
  })();
  const CN_RIVERS = [wiggly(mulberry32(3), 1070, 600, 1550, 650, 9, 60), wiggly(mulberry32(4), 1070, 820, 1550, 790, 9, 60)];
  ARTS.noRiver = (t, run, A) => {
    const [it] = run.items;
    const panels = smooth(ramp(t, it.start - 0.4, it.start + 0.6));
    const big = easeOut(ramp(t, kw(it, '贯通') - 0.2, kw(it, '径流') + 0.6));
    ctx.save(); ctx.globalAlpha = A * panels;
    ctx.strokeStyle = cream(0.16); ctx.lineWidth = 1.5;
    ctx.strokeRect(330, 440, 560, 520); ctx.strokeRect(1030, 440, 560, 520);
    ctx.lineCap = 'round';
    for (const r of EU_RIVERS) {
      ctx.strokeStyle = water(0.65); ctx.lineWidth = 2;
      strokePoly(ctx, r.pts, easeOut(ramp(t, it.start + r.d * 1.4, it.start + r.d * 1.4 + 1.2)));
    }
    ctx.shadowColor = water(0.9); ctx.shadowBlur = 14;
    ctx.strokeStyle = water(0.9); ctx.lineWidth = 6;
    for (const r of CN_RIVERS) strokePoly(ctx, r, big);
    ctx.shadowBlur = 0;
    for (const r of CN_RIVERS) flowPoly(ctx, r, big, t, { color: 'rgba(220,235,255,0.5)', w: 2 });
    ctx.restore();
    lbl('euPanel', 610, 1000, A * panels);
    lbl('cnPanel', 1310, 1000, A * panels);
  };

  // Moist monsoon wind climbs the mountains and rains out at altitude.
  const WIND = (() => { const rnd = mulberry32(13), o = []; for (let k = 0; k < 70; k++) o.push({ off: rnd(), lane: rnd(), sp: 0.8 + rnd() * 0.4 }); return o; })();
  const RAIN = (() => { const rnd = mulberry32(14), o = []; for (let k = 0; k < 90; k++) o.push({ x: 1000 + rnd() * 440, ph: rnd(), sp: 0.9 + rnd() * 0.5 }); return o; })();
  ARTS.monsoon = (t, run, A) => {
    const [iWind, iRain] = run.items;
    const draw = easeOut(ramp(t, iWind.start - 0.5, iWind.start + 1.6));
    const wind = smooth(ramp(t, kw(iWind, '季候风') - 0.8, kw(iWind, '季候风') + 0.6));
    const rain = smooth(ramp(t, kw(iRain, '季节性') - 0.6, kw(iRain, '季节性') + 0.8));
    const alt = smooth(ramp(t, kw(iRain, '海拔') - 0.4, kw(iRain, '海拔') + 0.5));
    ctx.save(); ctx.globalAlpha = A;
    // sea
    const sg = ctx.createLinearGradient(0, 880, 0, 1080);
    sg.addColorStop(0, 'rgba(60,90,130,0.35)'); sg.addColorStop(1, 'rgba(60,90,130,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 900, 640 * draw, 180);
    ctx.strokeStyle = water(0.6); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 640 * draw; x += 10) { const y = 900 + Math.sin(x * 0.03 + t * 2) * 4; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // terrain
    ctx.beginPath();
    TERR_M.slice(1).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(1920, 1080); ctx.lineTo(620, 1080); ctx.closePath();
    ctx.fillStyle = `rgba(16,15,20,${0.95 * draw})`; ctx.fill();
    ctx.strokeStyle = cream(0.55); ctx.lineWidth = 2;
    strokePoly(ctx, TERR_M.slice(1), draw);
    // altitude line
    if (alt > 0) {
      ctx.setLineDash([6, 10]); ctx.strokeStyle = cream(0.3 * alt); ctx.lineWidth = 1.2;
      lineP(ctx, 900, 640, 1700, 640, alt);
      ctx.setLineDash([]);
    }
    // clouds
    for (const [cx, cy, r] of [[1120, 540, 170], [1250, 480, 190], [1360, 420, 160], [1180, 470, 140]]) softGlow(ctx, cx, cy, r, 0.22 * rain, '150,165,190');
    // wind streaks
    for (const w of WIND) {
      const u = frac(w.off + (t - run.start) * 0.08 * w.sp);
      const x = lerp(-60, 1460, u);
      const y = Math.min(890 - 40 - w.lane * 120, groundAt(x) - 30 - w.lane * 120);
      const condense = y < 660 ? rain : 0;
      const a = wind * (1 - condense) * smooth(ramp(u, 0, 0.08)) * (1 - smooth(ramp(u, 0.85, 1)));
      if (a <= 0) continue;
      const ang = Math.atan2(groundAt(x + 20) - groundAt(x - 20), 40) * (x > 620 ? 1 : 0);
      ctx.strokeStyle = water(0.75 * a); ctx.lineWidth = 2;
      lineP(ctx, x - Math.cos(ang) * 26, y - Math.sin(ang) * 26, x, y, 1);
    }
    // rain
    if (rain > 0) {
      ctx.strokeStyle = water(0.55 * rain); ctx.lineWidth = 1.6;
      for (const d of RAIN) {
        const top = 470, bot = groundAt(d.x);
        const y = top + frac(d.ph + t * 1.4 * d.sp) * (bot - top);
        lineP(ctx, d.x, y, d.x - 5, y + 20, 1);
      }
    }
    ctx.restore();
    lbl('mSea', 300, 960, A * draw);
    lbl('mWind', 380, 760, A * wind);
    lbl('mMtn', 1560, 470, A * draw * 0.9);
    lbl('mAlt', 1640, 615, A * alt);
    lbl('mRain', 1230, 380, A * rain);
  };

  // Valleys collect the rain into one gorge; one great crest rushes to the plain.
  function drawFunnel(t, A, { draw = 1, flow = 1, tribP = () => 1, mainW = 4, ridgeA = 0.55 } = {}) {
    ctx.save(); ctx.globalAlpha = A;
    ctx.lineWidth = 2;
    for (const [x, y, a] of RIDGES) {
      const k = (a - 140) / 80;
      chevron(ctx, x, y, 16, ridgeA * smooth(ramp(draw, k * 0.5, k * 0.5 + 0.5)));
    }
    TRIBS.forEach((tr, k) => {
      const p = tribP(k);
      ctx.strokeStyle = water(0.45); ctx.lineWidth = 2.5;
      strokePoly(ctx, tr, p);
      if (flow > 0) flowPoly(ctx, tr, p, t, { color: `rgba(200,225,255,${0.5 * flow})`, w: 1.6, speed: 50 });
    });
    ctx.strokeStyle = water(0.8); ctx.lineWidth = mainW; ctx.lineCap = 'round';
    strokePoly(ctx, MAIN, draw);
    if (flow > 0) flowPoly(ctx, MAIN, draw, t, { color: `rgba(210,230,255,${0.55 * flow})`, w: Math.max(1.5, mainW * 0.4), speed: 70 });
    ctx.restore();
  }
  const BASIN_DROPS = (() => { const rnd = mulberry32(55), o = []; for (let k = 0; k < 70; k++) { const a = ((150 + rnd() * 60) * Math.PI) / 180, r = 140 + rnd() * 380; o.push({ x: GORGE[0] + Math.cos(a) * r, y: GORGE[1] - Math.sin(a) * r, ph: rnd() }); } return o; })();
  ARTS.funnel = (t, run, A) => {
    const [iCol, iCrest] = run.items;
    const draw = easeOut(ramp(t, iCol.start - 0.5, iCol.start + 1.5));
    const collect = (k) => easeOut(ramp(t, kw(iCol, '收集器') - 0.5 + k * 0.12, kw(iCol, '峡谷') + 0.6 + k * 0.08));
    const surge = easeIn(ramp(t, kw(iCrest, '洪峰') - 0.8, kw(iCrest, '扑向') + 1.4));
    const spread = smooth(ramp(t, kw(iCrest, '扑向') + 1.0, run.end - 0.2));
    drawFunnel(t, A, { draw, tribP: collect, mainW: lerp(4, 9, smooth(ramp(t, iCrest.start, kw(iCrest, '洪峰')))) });
    ctx.save(); ctx.globalAlpha = A;
    // rain on the basin
    const rainA = smooth(ramp(t, iCol.start, iCol.start + 1)) * (1 - smooth(ramp(t, iCrest.start, iCrest.start + 1.5)));
    for (const d of BASIN_DROPS) {
      const ph = frac(d.ph + t * 0.7);
      ctx.fillStyle = water(0.7 * rainA * Math.sin(Math.PI * ph));
      ctx.beginPath(); ctx.arc(d.x, d.y, 2.2, 0, TAU); ctx.fill();
    }
    // gorge glow as water gathers
    softGlow(ctx, GORGE[0], GORGE[1], 140, 0.25 * smooth(ramp(t, kw(iCol, '峡谷'), kw(iCol, '峡谷') + 1)), '126,164,212');
    // the crest
    if (surge > 0 && surge < 1) {
      const [x, y] = polyAt(MAIN, surge);
      ctx.strokeStyle = 'rgba(220,235,255,0.9)'; ctx.lineWidth = 12;
      strokePoly(ctx, MAIN, surge, Math.max(0, surge - 0.12));
      softGlow(ctx, x, y, 120, 0.45, '170,200,240');
    }
    if (spread > 0) {
      ctx.save();
      ctx.translate(1760, 770); ctx.scale(1, 0.38);
      softGlow(ctx, 0, 0, 380 * spread, 0.4 * (1 - 0.3 * spread), '126,164,212');
      ctx.restore();
    }
    ctx.restore();
    const [cx, cy] = polyAt(MAIN, clamp(surge));
    lbl('fValley', 560, 720, A * draw * 0.9);
    lbl('fGorge', GORGE[0], GORGE[1] + 52, A * draw);
    lbl('fCrest', cx, cy - 70, A * smooth(ramp(surge, 0.02, 0.15)));
    lbl('fPlain', 1700, 900, A * draw);
  };

  // Yellow River and Yangtze: mountain water carried east; seasonal crests.
  ARTS.rivers = (t, run, A) => {
    const [iRiv, iCrest] = run.items;
    const draw = easeOut(ramp(t, iRiv.start - 0.4, iRiv.start + 1.2));
    const pY = easeOut(ramp(t, kw(iRiv, '黄河') - 0.2, kw(iRiv, '黄河') + 2.4));
    const pZ = easeOut(ramp(t, kw(iRiv, '长江') - 0.2, kw(iRiv, '长江') + 2.4));
    const crest = smooth(ramp(t, kw(iCrest, '季节') - 0.6, kw(iCrest, '季节') + 0.4));
    ctx.save(); ctx.globalAlpha = A;
    ctx.lineWidth = 2;
    CN_MTN.forEach(([x, y, s], k) => chevron(ctx, x, y, s, 0.5 * smooth(ramp(draw, k / 40, k / 40 + 0.4))));
    ctx.setLineDash([3, 9]); ctx.strokeStyle = water(0.45); ctx.lineWidth = 2;
    strokePoly(ctx, COAST, draw);
    ctx.setLineDash([]);
    for (const [pts, p] of [[YR, pY], [YZ, pZ]]) {
      ctx.strokeStyle = water(0.85); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.shadowColor = water(0.7); ctx.shadowBlur = 10;
      strokePoly(ctx, pts, p);
      ctx.shadowBlur = 0;
      flowPoly(ctx, pts, p, t, { color: 'rgba(215,232,255,0.45)', w: 2, speed: 55 });
    }
    // seasonal crests
    if (crest > 0) {
      for (const [pts, off] of [[YR, 0], [YZ, 0.45]]) {
        for (let j = 0; j < 2; j++) {
          const u = frac((t - iCrest.start) / 3.2 + off + j * 0.5);
          const [x, y] = polyAt(pts, u);
          softGlow(ctx, x, y, 60, 0.55 * crest * Math.sin(Math.PI * u), '190,215,250');
        }
      }
    }
    ctx.restore();
    lbl('rYR', 880, 375, A * smooth(ramp(pY, 0.5, 0.8)));
    lbl('rYZ', 960, 920, A * smooth(ramp(pZ, 0.5, 0.8)));
    lbl('rMtn', 450, 960, A * draw * 0.9);
    lbl('rSea', 1740, 700, A * draw);
    lbl('rCrest', 1300, 720, A * crest);
  };

  // Himalaya rains drain to one delta: Bangladesh floods every year.
  const GANGES = smoothPts([[360, 640], [560, 720], [760, 800], [900, 880], [960, 960]]);
  const BRAHMA = smoothPts([[1580, 620], [1380, 680], [1200, 720], [1070, 820], [975, 960]]);
  const RIDGE_B = (x) => 520 + ((x - 960) / 700) ** 2 * 90;
  ARTS.bengal = (t, run, A) => {
    const [it] = run.items;
    const draw = easeOut(ramp(t, it.start - 0.4, it.start + 1.4));
    const rain = smooth(ramp(t, kw(it, '季节降雨') - 0.6, kw(it, '季节降雨') + 0.4));
    const riv = easeOut(ramp(t, kw(it, '季节降雨'), kw(it, '年年') + 0.6));
    const flood = smooth(ramp(t, kw(it, '洪灾') - 0.4, kw(it, '洪灾') + 0.6));
    ctx.save(); ctx.globalAlpha = A;
    ctx.lineWidth = 2;
    for (let x = 280; x <= 1640; x += 44) chevron(ctx, x, RIDGE_B(x), 18, 0.6 * smooth(ramp(draw, (x - 280) / 1700, (x - 280) / 1700 + 0.3)));
    if (rain > 0) {
      ctx.strokeStyle = water(0.5 * rain); ctx.lineWidth = 1.5;
      const rnd = mulberry32(61);
      for (let k = 0; k < 80; k++) {
        const x = 300 + rnd() * 1320, ph = rnd();
        const y = RIDGE_B(x) + 20 + frac(ph + t * 1.2) * 60;
        lineP(ctx, x, y, x - 4, y + 16, 1);
      }
    }
    for (const pts of [GANGES, BRAHMA]) {
      ctx.strokeStyle = water(0.85); ctx.lineWidth = 4; ctx.lineCap = 'round';
      strokePoly(ctx, pts, riv);
      flowPoly(ctx, pts, riv, t, { color: 'rgba(215,232,255,0.45)', w: 1.8 });
    }
    const pulse = 0.75 + 0.25 * Math.sin((t - it.start) * 2.4);
    ctx.save(); ctx.translate(965, 985); ctx.scale(1, 0.4);
    softGlow(ctx, 0, 0, 320 * flood, 0.5 * flood * pulse, '126,164,212');
    ctx.restore();
    ctx.restore();
    lbl('bHim', 960, 450, A * draw);
    lbl('bBd', 965, 1035, A * flood);
  };

  // Photographic maps (user-supplied), with overlays in image coordinates.
  const mapBuf = document.createElement('canvas');
  const mctx = mapBuf.getContext('2d');
  function drawMap(M, A, zoom) {
    const s = (M.w / M.sw) * zoom;
    const dw = M.sw * s, dh = M.sh * s, x = M.cx - dw / 2, y = M.cy - dh / 2;
    const bw = Math.ceil(dw), bh = Math.ceil(dh);
    if (mapBuf.width !== bw || mapBuf.height !== bh) { mapBuf.width = bw; mapBuf.height = bh; }
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, bw, bh);
    mctx.drawImage(M.img, M.sx, M.sy, M.sw, M.sh, 0, 0, dw, dh);
    mctx.fillStyle = 'rgba(9,9,13,0.22)';
    mctx.fillRect(0, 0, dw, dh);
    const F = 110;
    mctx.globalCompositeOperation = 'destination-in';
    for (const [ax, ay, bx, by] of [[0, 0, F, 0], [dw, 0, dw - F, 0], [0, 0, 0, F], [0, dh, 0, dh - F]]) {
      const g = mctx.createLinearGradient(ax, ay, bx, by);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, dw, dh);
    }
    ctx.save();
    ctx.globalAlpha = A * 0.88;
    ctx.drawImage(mapBuf, 0, 0, dw, dh, x, y, dw, dh);
    ctx.restore();
    return (ix, iy) => [M.cx + (ix - M.sx - M.sw / 2) * s, M.cy + (iy - M.sy - M.sh / 2) * s];
  }
  const EU = { img: imgEU, sx: 0, sy: 40, sw: 800, sh: 500, cx: 960, cy: 650, w: 1120 };
  const CN = { img: imgCN, sx: 0, sy: 0, sw: 688, sh: 628, cx: 960, cy: 690, w: 789 };
  const EU_MTN = [
    [[130, 398], [165, 392], [205, 396]],                 // Pyrenees
    [[262, 352], [290, 334], [330, 326], [372, 334]],     // Alps
    [[318, 52], [300, 100], [286, 150], [262, 200]],      // Scandinavian mountains
  ];
  const EU_WIND = [
    [[20, 330], [70, 350], [125, 378]],
    [[60, 200], [130, 200], [200, 190], [250, 180]],
    [[300, 500], [300, 450], [310, 380]],
  ];
  ARTS.mapEU = (t, run, A) => {
    const [iSmart, iMtn] = run.items;
    const zoom = lerp(1, 1.06, smooth(ramp(t, run.start - 0.5, run.end)));
    const P = drawMap(EU, A * smooth(ramp(t, iSmart.start - 0.6, iSmart.start + 0.8)), zoom);
    const mtn = easeOut(ramp(t, kw(iMtn, '山脉') - 0.2, kw(iMtn, '山脉') + 1.2));
    const sea = smooth(ramp(t, kw(iMtn, '海洋') - 0.3, kw(iMtn, '海洋') + 0.5));
    const plain = smooth(ramp(t, kw(iMtn, '平原') - 0.3, kw(iMtn, '平原') + 0.5));
    ctx.save(); ctx.globalAlpha = A;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = amber(0.9); ctx.shadowBlur = 16;
    ctx.strokeStyle = amber(0.95); ctx.lineWidth = 7;
    for (const m of EU_MTN) strokePoly(ctx, m.map(([x, y]) => P(x, y)), mtn);
    ctx.shadowBlur = 0;
    for (const w of EU_WIND) arrowPoly(ctx, w.map(([x, y]) => P(x, y)), easeOut(ramp(sea, 0, 1)), water(0.95), 4, 16);
    ctx.restore();
    const L = (k, ix, iy, a) => { const [x, y] = P(ix, iy); lbl(k, x, y, A * a); };
    L('euMtn', 320, 300, mtn);
    L('euAtl', 70, 270, sea);
    L('euMed', 360, 470, sea);
    L('euPlain', 470, 235, plain);
  };
  ARTS.mapCN = (t, run, A) => {
    const [it] = run.items;
    const zoom = lerp(1, 1.05, smooth(ramp(t, run.start - 0.5, run.end)));
    const P = drawMap(CN, A, zoom);
    const m = smooth(ramp(t, kw(it, '平原') - 0.4, kw(it, '平原') + 0.3));
    const mt = smooth(ramp(t, kw(it, '山脉') - 0.5, kw(it, '山脉') + 0.3));
    const sea = smooth(ramp(t, kw(it, '海洋') - 0.9, kw(it, '海洋') - 0.1));
    ctx.save(); ctx.globalAlpha = A;
    ctx.setLineDash([4, 12]); ctx.lineWidth = 3; ctx.strokeStyle = amber(0.9);
    const chain = [[220, 220], [340, 230], [460, 215], [560, 240], [630, 290]].map(([x, y]) => P(x, y));
    ctx.setLineDash([]);
    arrowPoly(ctx, chain, easeOut(ramp(t, kw(it, '山脉') - 0.2, kw(it, '海洋') + 0.8)), amber(0.85), 3, 14);
    ctx.restore();
    const L = (k, ix, iy, a) => { const [x, y] = P(ix, iy); lbl(k, x, y, A * a); };
    L('cnMtn', 190, 185, mt);
    L('cnPlain', 470, 175, m);
    L('cnSea', 585, 360, sea);
  };

  // Cross-sections: Europe's mountains send the rain back to the sea; China's plain gets one great river.
  const EUY = 565, CNY = 905;
  const EU_G = [[1120, EUY], [1080, EUY - 30], [980, EUY - 110], [900, EUY - 200], [820, EUY - 90], [700, EUY]];
  const CN_G = [[260, CNY], [300, CNY - 120], [380, CNY - 220], [460, CNY - 130], [560, CNY - 40], [620, CNY]];
  const EU_WINDP = [[260, EUY - 30], [700, EUY - 30], [800, EUY - 120], [870, EUY - 230]];
  const CN_WINDP = [[1660, CNY - 30], [1300, CNY - 30], [620, CNY - 50], [470, CNY - 170], [400, CNY - 250]];
  const CN_RIVER = smoothPts([[540, CNY - 30], [620, CNY - 6], [800, CNY - 8], [1000, CNY - 6], [1200, CNY - 8], [1320, CNY]]);
  function windAlong(pts, t, a, seed) {
    if (a <= 0) return;
    const rnd = mulberry32(seed);
    for (let k = 0; k < 26; k++) {
      const off = rnd(), dy = (rnd() - 0.5) * 30;
      const u = frac(off + t * 0.22);
      const [x, y] = polyAt(pts, u);
      const [bx, by] = polyAt(pts, Math.max(0, u - 0.025));
      const fa = a * Math.sin(Math.PI * u);
      ctx.strokeStyle = water(0.8 * fa); ctx.lineWidth = 2;
      lineP(ctx, bx, by + dy, x, y + dy, 1);
    }
  }
  function rainAt(x0, x1, yTop, yBot, a, t, seed) {
    if (a <= 0) return;
    const rnd = mulberry32(seed);
    ctx.strokeStyle = water(0.6 * a); ctx.lineWidth = 1.5;
    for (let k = 0; k < 28; k++) {
      const x = lerp(x0, x1, rnd()), ph = rnd();
      const y = yTop + frac(ph + t * 1.5) * (yBot - yTop);
      lineP(ctx, x, y, x - 4, y + 16, 1);
    }
    softGlow(ctx, (x0 + x1) / 2, yTop, (x1 - x0) * 0.8, 0.18 * a, '150,165,190');
  }
  ARTS.profile = (t, run, A) => {
    const [iEU, iSmall] = run.items;
    const eu = easeOut(ramp(t, iEU.start - 0.5, iEU.start + 1.2));
    const euWind = smooth(ramp(t, kw(iEU, '海风') - 0.3, kw(iEU, '海风') + 0.6));
    const euRain = smooth(ramp(t, kw(iEU, '刮出') - 0.4, kw(iEU, '刮出') + 0.4));
    const euBack = easeOut(ramp(t, kw(iEU, '送回') - 0.3, kw(iEU, '送回') + 1.2));
    const small = smooth(ramp(t, kw(iSmall, '中小河流') - 0.3, kw(iSmall, '中小河流') + 0.5));
    const cn = easeOut(ramp(t, kw(iSmall, '没有') - 1.8, kw(iSmall, '没有') - 0.2));
    const cnRiver = easeOut(ramp(t, kw(iSmall, '没有') - 0.4, kw(iSmall, '长江') + 0.8));
    ctx.save(); ctx.globalAlpha = A;
    const row = (ground, seaX0, seaX1, yb, a) => {
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = 'rgba(60,90,130,0.3)'; ctx.fillRect(seaX0, yb, seaX1 - seaX0, 26);
      ctx.strokeStyle = water(0.7); ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = seaX0; x <= seaX1; x += 10) { const y = yb + Math.sin(x * 0.04 + t * 2) * 3; x === seaX0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.beginPath(); ground.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = 'rgba(18,17,22,0.96)'; ctx.fill();
      ctx.strokeStyle = cream(0.6); ctx.stroke();
      ctx.strokeStyle = cream(0.35); ctx.lineWidth = 1.5;
      ctx.restore();
    };
    // Europe: sea | mountain | plain
    row(EU_G, 260, 700, EUY, eu);
    ctx.strokeStyle = cream(0.35 * eu); ctx.lineWidth = 1.5; lineP(ctx, 1120, EUY, 1660, EUY, eu);
    windAlong(EU_WINDP, t, euWind * eu, 3);
    rainAt(780, 900, EUY - 240, EUY - 110, euRain, t, 4);
    for (let k = 0; k < 3; k++) {
      const pts = [[860 - k * 30, EUY - 150 + k * 40], [780 - k * 20, EUY - 60 + k * 20], [700 - k * 40, EUY - 8]];
      arrowPoly(ctx, smoothPts(pts, 6), clamp(euBack * 1.4 - k * 0.2), water(0.85), 2.5, 10);
    }
    if (small > 0) {
      const rnd = mulberry32(8);
      for (let k = 0; k < 7; k++) {
        const x = 1160 + rnd() * 460;
        ctx.strokeStyle = water(0.7 * small); ctx.lineWidth = 2;
        strokePoly(ctx, wiggly(rnd, x, EUY - 6, x + 50 + rnd() * 40, EUY - 6, 3, 8), small);
      }
    }
    // China: mountain | plain | sea
    row(CN_G, 1300, 1660, CNY, cn);
    ctx.strokeStyle = cream(0.35 * cn); ctx.lineWidth = 1.5; lineP(ctx, 620, CNY, 1300, CNY, cn);
    windAlong(CN_WINDP, t, cn, 5);
    rainAt(400, 560, CNY - 260, CNY - 110, cn, t, 6);
    ctx.shadowColor = water(0.9); ctx.shadowBlur = 12;
    ctx.strokeStyle = water(0.95); ctx.lineWidth = 8; ctx.lineCap = 'round';
    strokePoly(ctx, CN_RIVER, cnRiver);
    ctx.shadowBlur = 0;
    flowPoly(ctx, CN_RIVER, cnRiver, t, { color: 'rgba(220,235,255,0.55)', w: 2.5, speed: 70 });
    ctx.restore();
    lbl('pEU', 160, EUY - 90, A * eu);
    lbl('pEUsea', 480, EUY + 50, A * eu);
    lbl('pEUmtn', 900, EUY + 40, A * eu);
    lbl('pEUplain', 1390, EUY + 40, A * eu * (1 - small));
    lbl('pEUback', 560, EUY - 90, A * euBack);
    lbl('pEUsmall', 1390, EUY + 40, A * small);
    lbl('pCN', 160, CNY - 90, A * cn);
    lbl('pCNmtn', 400, CNY + 40, A * cn);
    lbl('pCNplain', 960, CNY + 40, A * cn);
    lbl('pCNsea', 1480, CNY + 50, A * cn);
    lbl('pCNriver', 940, CNY - 60, A * smooth(ramp(cnRiver, 0.5, 0.9)));
  };

  // Fragmented small plains vs one vast plain that becomes one state.
  const cellGrid = (seed, x0, y0, cols, rows, cw, ch, jit) => {
    const rnd = mulberry32(seed), V = [];
    for (let r = 0; r <= rows; r++) { V.push([]); for (let c = 0; c <= cols; c++) V[r].push([x0 + c * cw + (c && c < cols ? (rnd() - 0.5) * jit : 0), y0 + r * ch + (r && r < rows ? (rnd() - 0.5) * jit : 0)]); }
    return V;
  };
  const PL_EU = cellGrid(71, 300, 450, 7, 6, 80, 80, 40);
  const PL_CN = cellGrid(72, 1060, 450, 7, 6, 80, 80, 30);
  const PL_EU_MTN = (() => { const rnd = mulberry32(73), o = []; for (let k = 0; k < 18; k++) o.push([320 + rnd() * 540, 470 + rnd() * 440]); return o; })();
  ARTS.plain = (t, run, A) => {
    const [it] = run.items;
    const draw = easeOut(ramp(t, it.start - 0.4, it.start + 1.4));
    const cnIn = smooth(ramp(t, kw(it, '超大') - 0.4, kw(it, '超大') + 0.6));
    const unify = smooth(ramp(t, kw(it, '巨型') - 0.3, kw(it, '巨型') + 1.0));
    ctx.save(); ctx.globalAlpha = A;
    // Europe: separated cells
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      const k = r * 7 + c;
      const a = smooth(ramp(draw, (k / 42) * 0.6, (k / 42) * 0.6 + 0.4));
      if (a <= 0) continue;
      const V = [PL_EU[r][c], PL_EU[r][c + 1], PL_EU[r + 1][c + 1], PL_EU[r + 1][c]];
      const cx = V.reduce((s, v) => s + v[0], 0) / 4, cy = V.reduce((s, v) => s + v[1], 0) / 4;
      ctx.beginPath();
      V.forEach(([x, y], j) => { const px = lerp(x, cx, 0.12), py = lerp(y, cy, 0.12); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.closePath();
      ctx.fillStyle = cream(0.04 * a); ctx.fill();
      ctx.strokeStyle = cream(0.35 * a); ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (const [x, y] of PL_EU_MTN) chevron(ctx, x, y, 12, 0.55 * draw);
    // China: one plain, unifying
    if (cnIn > 0) {
      softGlow(ctx, 1340, 690, 420, 0.18 * unify);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
        const V = [PL_CN[r][c], PL_CN[r][c + 1], PL_CN[r + 1][c + 1], PL_CN[r + 1][c]];
        ctx.beginPath(); V.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
        ctx.fillStyle = amber(0.05 * cnIn + 0.08 * unify); ctx.fill();
        ctx.strokeStyle = cream(0.3 * cnIn * (1 - unify)); ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.strokeStyle = mixHex('#8a877f', C.em, unify); ctx.globalAlpha = A * cnIn; ctx.lineWidth = 2 + 2 * unify;
      ctx.shadowColor = amber(0.8); ctx.shadowBlur = 16 * unify;
      ctx.strokeRect(1060, 450, 560, 480);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    lbl('plEU', 580, 990, A * draw);
    lbl('plCN', 1340, 990, A * cnIn);
    lbl('plUnify', 1340, 690, A * unify);
  };

  // A year-wheel: every summer the flood arc lights up — the annual exam.
  ARTS.exam = (t, run, A) => {
    const [it] = run.items;
    const cx = 960, cy = 690, R = 230, P = 2.6;
    const t0 = it.start + 0.3;
    const draw = easeOut(ramp(t, it.start - 0.4, it.start + 1));
    const tau = Math.max(0, t - t0);
    const n = Math.floor(tau / P) + 1;
    const ph = frac(tau / P);
    const ang = -Math.PI / 2 + ph * TAU;
    const fA0 = -Math.PI / 2 + (5 / 12) * TAU, fA1 = -Math.PI / 2 + (8 / 12) * TAU;
    const inFlood = ph > 5 / 12 && ph < 8 / 12 ? Math.sin(Math.PI * (ph - 5 / 12) / (3 / 12)) : 0;
    const exam = smooth(ramp(t, kw(it, '年度大考') - 0.4, kw(it, '年度大考') + 0.5));
    ctx.save(); ctx.globalAlpha = A * draw;
    ctx.strokeStyle = cream(0.3); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    for (let m = 0; m < 12; m++) {
      const a = -Math.PI / 2 + (m / 12) * TAU;
      lineP(ctx, cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10), cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10), 1);
    }
    ctx.strokeStyle = water(0.4 + 0.5 * inFlood + 0.2 * exam); ctx.lineWidth = 14 + 10 * inFlood;
    ctx.shadowColor = water(0.9); ctx.shadowBlur = 20 * inFlood;
    ctx.beginPath(); ctx.arc(cx, cy, R, fA0, fA1); ctx.stroke();
    ctx.shadowBlur = 0;
    // hand
    ctx.strokeStyle = cream(0.6); ctx.lineWidth = 2;
    lineP(ctx, cx, cy, cx + Math.cos(ang) * (R - 24), cy + Math.sin(ang) * (R - 24), 1);
    drawOrb(ctx, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 8, 0.9);
    drawOrb(ctx, cx, cy, 16, 0.9 + 0.1 * inFlood);
    // each year's exam passed: a little burst as the hand leaves the flood arc
    for (let k = 0; k < n; k++) {
      const tk = t0 + k * P + (8 / 12) * P;
      burst(ctx, cx + Math.cos(fA1) * R, cy + Math.sin(fA1) * R, t, tk, { seed: 90 + k, n: 16, radius: 70, life: 1 });
    }
    ctx.restore();
    lbl('exCenter', cx, cy + 50, A * draw);
    lbl('exFlood', cx + Math.cos((fA0 + fA1) / 2) * (R + 60), cy + Math.sin((fA0 + fA1) / 2) * (R + 60), A * draw * (1 - exam));
    lbl('exExam', cx + Math.cos((fA0 + fA1) / 2) * (R + 90), cy + Math.sin((fA0 + fA1) / 2) * (R + 70), A * exam, `scale(${1 + 0.08 * inFlood})`);
    labels.get('exYear').textContent = `第 ${n} 年`;
    lbl('exYear', cx, cy - R - 50, A * draw * 0.8);
  };

  // A good year: harvest, people, and the view from Mount Tai.
  const STALKS = (() => { const rnd = mulberry32(81), o = []; for (let k = 0; k < 70; k++) o.push({ x: 180 + k * 22.5 + (rnd() - 0.5) * 10, h: 90 + rnd() * 90, d: rnd(), sw: rnd() * 6 }); return o; })();
  const PEOPLE = (() => { const rnd = mulberry32(82), o = []; for (let k = 0; k < 120; k++) { const a = rnd() * TAU, r = Math.sqrt(rnd()); o.push({ x: 960 + Math.cos(a) * r * 520, y: 740 + Math.sin(a) * r * 110, d: rnd() }); } return o; })();
  const OUTSIDERS = (() => { const rnd = mulberry32(83), o = []; for (let k = 0; k < 36; k++) { const a = rnd() * TAU; o.push({ a, r: 0.95 + rnd() * 0.2 }); } return o; })();
  ARTS.pass = (t, run, A) => {
    const [iHarvest, iTai] = run.items;
    const grow = (d) => easeOut(ramp(t, iHarvest.start + d * 1.5, iHarvest.start + d * 1.5 + 1.6));
    const pop = ramp(t, kw(iHarvest, '人丁') - 0.6, iHarvest.start + iHarvest.duration + 1);
    const tai = smooth(ramp(t, kw(iTai, '泰山') - 3.2, kw(iTai, '泰山') - 0.6));
    const out = smooth(ramp(t, iTai.start, kw(iTai, '对手') + 0.5));
    const realm = smooth(ramp(t, kw(iTai, '普天') - 0.3, kw(iTai, '普天') + 1.2));
    ctx.save(); ctx.globalAlpha = A;
    // outsiders pushed back
    for (const o of OUTSIDERS) {
      const r = o.r + 0.25 * out;
      const x = 960 + Math.cos(o.a) * 900 * r, y = 700 + Math.sin(o.a) * 420 * r;
      ctx.fillStyle = cream(0.35 * (1 - 0.7 * out) * smooth(ramp(t, iHarvest.start, iHarvest.start + 1.5)));
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    softGlow(ctx, 960, 760, 700, 0.12 * realm);
    // people
    const nP = Math.floor(lerp(0, PEOPLE.length, clamp(pop)));
    for (let k = 0; k < nP; k++) {
      const p = PEOPLE[k];
      ctx.fillStyle = amber(0.55 * (1 - 0.5 * tai));
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
    }
    // harvest
    for (const s of STALKS) {
      const g = grow(s.d);
      if (g <= 0) continue;
      const fade = 1 - 0.82 * tai * smooth(1 - Math.abs(s.x - 960) / 260);
      const sway = Math.sin(t * 1.6 + s.sw) * 4 * g;
      const top = [s.x + sway, 1010 - s.h * g];
      ctx.strokeStyle = amber(0.55 * fade); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, 1010); ctx.quadraticCurveTo(s.x, 1010 - s.h * g * 0.6, top[0], top[1]); ctx.stroke();
      ctx.fillStyle = amber(0.85 * g * fade);
      ctx.beginPath(); ctx.ellipse(top[0], top[1] - 9, 4.5, 11, sway * 0.04, 0, TAU); ctx.fill();
    }
    // Mount Tai and the figure on top
    if (tai > 0) {
      drawMountain(ctx, 960, 1010, 620, 360 * easeOut(tai), { glow: realm });
      drawPerson(ctx, 960 - 0.06 * 620, 1010 - 360 * easeOut(tai), 62, { alpha: smooth(ramp(tai, 0.55, 0.95)), color: amber(0.95), armUp: realm });
    }
    ctx.restore();
    lbl('paTai', 960, 955, A * tai * 0.95);
  };

  // A bad year: the granary is swept away; a scramble for what's left; enemies close in.
  const BLOCKS = (() => { const o = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) o.push({ x: 960 + (c - 4) * 46, y: 940 - r * 34, keep: r === 0 && c >= 3 && c <= 5 }); return o; })();
  const CROWD = (() => { const rnd = mulberry32(91), o = []; for (let k = 0; k < 90; k++) { const a = rnd() * TAU, r = 160 + rnd() * 380; o.push({ hx: 960 + Math.cos(a) * r * 1.5, hy: 760 + Math.sin(a) * r * 0.5, ph: rnd() * 6, f: 2 + rnd() * 3 }); } return o; })();
  ARTS.fail = (t, run, A) => {
    const [iFlood, iFight] = run.items;
    const wave = easeIn(ramp(t, kw(iFlood, '一卷') - 1.2, kw(iFlood, '一卷') + 0.6));
    const xw = lerp(-300, 2200, wave);
    const recede = smooth(ramp(t, kw(iFlood, '一卷') + 0.6, iFight.start + 1));
    const crowd = smooth(ramp(t, iFight.start - 0.2, iFight.start + 1.2));
    const fight = smooth(ramp(t, kw(iFight, '攻杀') - 0.5, kw(iFight, '攻杀') + 0.5));
    const foes = easeOut(ramp(t, kw(iFight, '外敌') - 0.3, kw(iFight, '可乘') + 1));
    ctx.save(); ctx.globalAlpha = A;
    // water body
    if (wave > 0) {
      ctx.fillStyle = `rgba(70,105,150,${(0.35 * (1 - recede)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(-10, 1080);
      for (let x = -10; x <= Math.min(1930, xw); x += 20) ctx.lineTo(x, 800 + Math.sin(x * 0.02 + t * 3) * 10 - 60 * Math.exp(-(((x - xw) / 120) ** 2)));
      ctx.lineTo(Math.min(1930, xw), 1080); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = water(0.8 * (1 - recede)); ctx.lineWidth = 3;
      lineP(ctx, xw, 730, xw, 1080, 1);
    }
    // granary
    for (const b of BLOCKS) {
      const swept = b.keep ? 0 : smooth(ramp(xw, b.x - 60, b.x + 160));
      const a = (1 - swept) * smooth(ramp(t, iFlood.start - 0.6, iFlood.start + 0.4));
      if (a <= 0) continue;
      ctx.fillStyle = amber(0.65 * a);
      ctx.strokeStyle = amber(0.9 * a); ctx.lineWidth = 1.5;
      const dx = swept * 260, dy = swept * 80;
      ctx.fillRect(b.x - 20 + dx, b.y - 15 + dy, 40, 30);
      ctx.strokeRect(b.x - 20 + dx, b.y - 15 + dy, 40, 30);
    }
    // the scramble
    for (const p of CROWD) {
      const pull = 0.45 * crowd;
      const x = lerp(p.hx, 960, pull) + Math.sin(t * p.f + p.ph) * 14 * fight;
      const y = lerp(p.hy, 900, pull) + Math.cos(t * p.f * 1.3 + p.ph) * 8 * fight;
      ctx.fillStyle = cream(0.7 * crowd);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    if (fight > 0) {
      const rnd = mulberry32(93);
      for (let j = 0; j < 14; j++) {
        const bx = 960 + (rnd() - 0.5) * 900, by = 860 + (rnd() - 0.5) * 220;
        burst(ctx, bx, by, t, kw(iFight, '攻杀') - 0.3 + j * 0.55, { seed: 100 + j, n: 10, radius: 50, life: 0.9, color: cream, glow: '200,200,210' });
      }
    }
    // enemies from four sides
    const FOE = [['N', [960, 330], [960, 520]], ['E', [1880, 760], [1560, 760]], ['S', [960, 1100], [960, 1000]], ['W', [40, 760], [360, 760]]];
    for (const [k, a, b] of FOE) {
      arrowPoly(ctx, [a, b], foes, 'rgba(160,180,210,0.85)', 4, 18);
      const [lx, ly] = [lerp(a[0], b[0], 0.35), lerp(a[1], b[1], 0.35)];
      lbl(`foe${k}`, lx + (k === 'N' ? 60 : 0), ly + (k === 'N' ? 0 : -36), A * foes * (k === 'S' ? 0 : 1));
    }
    ctx.restore();
    lbl('faLeft', 960, 990, A * crowd * (1 - foes * 0.5));
  };

  // The cycle, as a faint ring with one point moving around it.
  ARTS.logic = (t, run, A) => {
    const R = 360;
    const draw = easeOut(ramp(t, run.start - 0.4, run.start + 2));
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.18); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(960, 520, R, -Math.PI / 2, -Math.PI / 2 + TAU * draw); ctx.stroke();
    const a = -Math.PI / 2 + (t - run.start) * 0.7;
    drawOrb(ctx, 960 + Math.cos(a) * R, 520 + Math.sin(a) * R, 8, 0.8 * draw);
    ctx.restore();
  };

  // Dynasty strength over time: rises, peaks, and then the hundred-year flood.
  const STR = [[0, 0.1], [15, 0.28], [35, 0.6], [60, 0.84], [80, 0.92], [99, 0.95], [104, 0.58], [112, 0.52], [130, 0.62], [160, 0.6]];
  const strengthAt = (y) => {
    for (let k = 1; k < STR.length; k++) if (y <= STR[k][0]) return lerp(STR[k - 1][1], STR[k][1], smooth((y - STR[k - 1][0]) / (STR[k][0] - STR[k - 1][0])));
    return STR[STR.length - 1][1];
  };
  const CX0 = 300, CX1 = 1640, CY0 = 960, CY1 = 430, CYRS = 140;
  const cxOf = (y) => CX0 + (y / CYRS) * (CX1 - CX0);
  const cyOf = (v) => lerp(CY0, CY1, v);
  ARTS.cycle = (t, run, A) => {
    const [iNew, iPeace, iMuscle, iShoe, iFlood] = run.items;
    const K = [[iNew.start, 0], [iPeace.start, 40], [iMuscle.start, 62], [iShoe.start, 86], [kw(iFlood, '百年') + 0.2, 100], [kw(iFlood, '泛滥') + 0.4, 108], [run.end, 122]];
    let yr = 0;
    for (let k = 1; k < K.length; k++) if (t >= K[k - 1][0]) yr = lerp(K[k - 1][1], K[k][1], clamp((t - K[k - 1][0]) / (K[k][0] - K[k - 1][0])));
    const axes = easeOut(ramp(t, iNew.start - 0.5, iNew.start + 1.2));
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.35); ctx.lineWidth = 1.5;
    lineP(ctx, CX0, CY0, CX1 + 30, CY0, axes);
    lineP(ctx, CX0, CY0, CX0, CY1 - 30, axes);
    // yearly exams on the axis
    for (let y = 1; y <= yr; y++) {
      const big = y >= 100 && y <= 104;
      ctx.fillStyle = big ? water(0.95) : amber(0.7);
      ctx.beginPath(); ctx.arc(cxOf(y), CY0 + 22, big ? 5 : 2.3, 0, TAU); ctx.fill();
    }
    // 100-year mark
    const m100 = smooth(ramp(t, kw(iShoe, '一百年') - 0.3, kw(iShoe, '一百年') + 0.6));
    if (m100 > 0) {
      ctx.setLineDash([5, 9]); ctx.strokeStyle = cream(0.35 * m100); ctx.lineWidth = 1.2;
      lineP(ctx, cxOf(100), CY0, cxOf(100), CY1 - 10, m100);
      ctx.setLineDash([]);
    }
    // curve
    ctx.strokeStyle = amber(0.95); ctx.lineWidth = 3.5;
    ctx.shadowColor = amber(0.8); ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let y = 0; y <= yr; y += 0.5) { const x = cxOf(y), v = cyOf(strengthAt(y)); y ? ctx.lineTo(x, v) : ctx.moveTo(x, v); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (yr > 0) drawOrb(ctx, cxOf(yr), cyOf(strengthAt(yr)), 9, 0.9);
    // peace bracket
    const peace = smooth(ramp(t, kw(iPeace, '五六十年') - 0.2, kw(iPeace, '五六十年') + 0.8));
    if (peace > 0) {
      ctx.strokeStyle = amber(0.5 * peace); ctx.lineWidth = 1.5;
      const by = cyOf(0.95) - 30;
      ctx.beginPath(); ctx.moveTo(cxOf(0), by + 10); ctx.lineTo(cxOf(0), by); ctx.lineTo(cxOf(60), by); ctx.lineTo(cxOf(60), by + 10); ctx.stroke();
    }
    // expansion arrow
    const exp = easeOut(ramp(t, kw(iMuscle, '追亡') - 0.3, kw(iMuscle, '封狼') + 1));
    if (exp > 0) arrowPoly(ctx, [[cxOf(70), cyOf(strengthAt(70)) - 20], [cxOf(78), cyOf(strengthAt(70)) - 140]], exp, amber(0.8), 3, 14);
    // the flood
    const fl = smooth(ramp(t, kw(iFlood, '黄河') - 0.6, kw(iFlood, '黄河') + 0.4));
    if (fl > 0) {
      ctx.save(); ctx.translate(cxOf(102), CY0); ctx.scale(1, 0.5);
      softGlow(ctx, 0, 0, 260 * fl, 0.4 * fl, '126,164,212');
      ctx.restore();
      ctx.strokeStyle = water(0.95 * fl); ctx.lineWidth = 3;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        for (let x = -120; x <= 120; x += 6) { const y = CY0 - 20 - j * 26 + Math.sin(x * 0.06 + t * 4 + j) * 6; x > -120 ? ctx.lineTo(cxOf(102) + x, y) : ctx.moveTo(cxOf(102) + x, y); }
        ctx.globalAlpha = A * fl * (1 - j * 0.25); ctx.stroke();
      }
    }
    ctx.restore();
    lbl('cyY', CX0 - 50, CY1, A * axes);
    for (const y of [0, 50, 100]) lbl(`cy${y}`, cxOf(y), CY0 + 54, A * axes * 0.8);
    lbl('cyYears', CX1 + 40, CY0 + 54, A * axes * 0.8);
    lbl('cyTicks', 1180, CY0 + 92, A * smooth(ramp(t, iNew.start + 1.5, iNew.start + 2.5)) * (1 - m100) * 0.8);
    lbl('cyPeace', cxOf(30), cyOf(0.95) - 62, A * peace);
    lbl('cyExpand', cxOf(86) + 40, cyOf(strengthAt(70)) - 170, A * exp);
    lbl('cy100', cxOf(100), CY1 - 36, A * m100 * 0.9);
    lbl('cyFlood', cxOf(102), CY0 - 130, A * fl);
  };

  // Relief holds the core; the far flood zone sends refugees to the neighbours: host vs. guest.
  const CORE = [620, 700], FZ = [1220, 560], NB = [1440, 860];
  const FIELDS = (() => { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) o.push([FZ[0] - 90 + c * 60, FZ[1] - 50 + r * 50]); return o; })();
  const REFS = (() => { const rnd = mulberry32(111), o = []; for (let k = 0; k < 46; k++) o.push({ d: rnd(), ox: (rnd() - 0.5) * 60, oy: (rnd() - 0.5) * 60, ph: rnd() * 6 }); return o; })();
  const LOCALS = (() => { const rnd = mulberry32(112), o = []; for (let k = 0; k < 40; k++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 80; o.push([NB[0] + Math.cos(a) * r, NB[1] + Math.sin(a) * r * 0.8]); } return o; })();
  ARTS.refugee = (t, run, A) => {
    const [iCore, iFar, iNot, iFlee, iHalf, iWar] = run.items;
    const core = smooth(ramp(t, iCore.start - 0.4, iCore.start + 1));
    const relief = smooth(ramp(t, kw(iCore, '赈济') - 0.3, kw(iCore, '稳住') + 0.6));
    const far = easeOut(ramp(t, iFar.start, kw(iFar, '鞭长') + 0.5));
    const fz = smooth(ramp(t, iFar.start - 0.2, iFar.start + 0.8));
    const drown = smooth(ramp(t, kw(iFlee, '淹没') - 0.4, kw(iFlee, '摧毁') + 0.4));
    const flee = ramp(t, kw(iFlee, '奔向') - 0.6, iHalf.start + 1.5);
    const half = smooth(ramp(t, kw(iHalf, '两倍') - 0.3, kw(iHalf, '两倍') + 0.6));
    const clash = smooth(ramp(t, kw(iHalf, '土客') - 0.3, kw(iHalf, '土客') + 0.5));
    const war = smooth(ramp(t, iWar.start - 0.2, iWar.start + 0.8));
    ctx.save(); ctx.globalAlpha = A;
    // core
    softGlow(ctx, CORE[0], CORE[1], 260, 0.12 + 0.18 * relief);
    ctx.strokeStyle = amber(0.7 * core); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CORE[0], CORE[1], 150, 0, TAU); ctx.stroke();
    drawOrb(ctx, CORE[0], CORE[1], 16, core);
    if (relief > 0) {
      const rnd = mulberry32(115);
      for (let k = 0; k < 36; k++) {
        const a = rnd() * TAU, u = frac(rnd() + (t - iCore.start) * 0.5);
        const r = 20 + u * 120;
        ctx.fillStyle = amber(0.7 * relief * (1 - u));
        ctx.beginPath(); ctx.arc(CORE[0] + Math.cos(a) * r, CORE[1] + Math.sin(a) * r, 2.4, 0, TAU); ctx.fill();
      }
    }
    // the long reach that doesn't arrive
    if (far > 0) {
      ctx.setLineDash([4, 10]);
      const g = ctx.createLinearGradient(CORE[0] + 150, 0, FZ[0] - 120, 0);
      g.addColorStop(0, amber(0.7)); g.addColorStop(1, amber(0));
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      lineP(ctx, CORE[0] + 150, CORE[1] - 30, lerp(CORE[0] + 150, FZ[0] - 120, 1), lerp(CORE[1] - 30, FZ[1] + 20, 1), far);
      ctx.setLineDash([]);
    }
    // flood zone with fields
    ctx.save(); ctx.translate(FZ[0], FZ[1]); ctx.scale(1, 0.75);
    softGlow(ctx, 0, 0, 200, 0.35 * fz, '90,130,180');
    ctx.restore();
    for (const [x, y] of FIELDS) {
      ctx.strokeStyle = cream(0.5 * fz * (1 - 0.6 * drown)); ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 22, y - 18, 44, 36);
      if (drown > 0) { ctx.fillStyle = water(0.5 * drown); ctx.fillRect(x - 22, y + 18 - 36 * drown, 44, 36 * drown); }
    }
    // neighbours
    const nbA = smooth(ramp(t, iFar.start, iFar.start + 1));
    ctx.strokeStyle = cream(0.4 * nbA); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(NB[0], NB[1], 140, 110, 0, 0, TAU); ctx.stroke();
    for (const [x, y] of LOCALS) {
      const jx = Math.sin(t * 5 + x) * 3 * clash;
      ctx.fillStyle = cream(0.75 * nbA);
      ctx.beginPath(); ctx.arc(x + jx, y, 3, 0, TAU); ctx.fill();
    }
    // the fort around the locals
    if (war > 0) {
      ctx.strokeStyle = amber(0.85 * war); ctx.lineWidth = 3;
      strokePoly(ctx, [[NB[0] - 105, NB[1] - 90], [NB[0] + 105, NB[1] - 90], [NB[0] + 105, NB[1] + 90], [NB[0] - 105, NB[1] + 90], [NB[0] - 105, NB[1] - 90]], war);
    }
    // refugees
    for (const r of REFS) {
      const u = easeOut(clamp(flee * 1.3 - r.d * 0.3));
      if (u <= 0) continue;
      const sx = FZ[0] + r.ox, sy = FZ[1] + r.oy;
      const ex = NB[0] - 220 + r.ox * 0.8 - 60 * war, ey = NB[1] - 70 + r.oy * 1.2;
      let x = lerp(sx, ex, u) + Math.sin(u * 6 + r.ph) * 10, y = lerp(sy, ey, u);
      if (war > 0) { const ram = Math.max(0, Math.sin((t - iWar.start) * 3.2 + r.ph * 0.3)); x += ram * 70 * war; }
      ctx.fillStyle = `rgba(170,195,230,${(0.85 * smooth(ramp(u, 0, 0.1))).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    if (war > 0) for (let j = 0; j < 8; j++) burst(ctx, NB[0] - 105, NB[1] - 60 + (j % 4) * 40, t, iWar.start + 0.4 + j * 0.5, { seed: 120 + j, n: 12, radius: 46, life: 0.9 });
    ctx.restore();
    lbl('rfCore', CORE[0], CORE[1] + 190, A * core);
    lbl('rfFlood', FZ[0], FZ[1] - 130, A * fz);
    lbl('rfFar', (CORE[0] + FZ[0]) / 2 + 40, (CORE[1] + FZ[1]) / 2 - 40, A * far * (1 - flee));
    lbl('rfLand', FZ[0], FZ[1] + 110, A * drown * (1 - smooth(ramp(t, iHalf.start, iHalf.start + 0.6))));
    lbl('rfNeigh', NB[0], NB[1] + 150, A * nbA * (1 - half));
    lbl('rfFlow', 1250, 760, A * smooth(ramp(flee, 0.1, 0.3)) * (1 - half));
    lbl('rfHalf', NB[0] - 80, NB[1] + 160, A * half * (1 - war));
    lbl('rfConflict', NB[0] - 80, NB[1] - 170, A * clash * (1 - war * 0.6));
    lbl('rfFort', NB[0], NB[1] + 130, A * war);
  };

  // Four pairs: each dynasty broken into a bright first half and a dim second half.
  ARTS.decline = (t, run, A) => {
    const [it] = run.items;
    const pairT = [kw(it, '东西周'), kw(it, '东西汉'), kw(it, '早晚唐'), kw(it, '南北宋')];
    const turn = smooth(ramp(t, kw(it, '由盛') - 0.3, kw(it, '由盛') + 0.6));
    const exhaust = smooth(ramp(t, it.start, kw(it, '元气') + 0.5));
    ctx.save(); ctx.globalAlpha = A;
    PAIRS.forEach((_, k) => {
      const y = 470 + k * 135;
      const p = easeOut(ramp(t, pairT[k] - 0.6 - (k === 0 ? 0 : 0), pairT[k] + 0.6));
      const p0 = k === 0 ? Math.max(p, exhaust) : p;
      if (p0 <= 0) return;
      const g = ctx.createLinearGradient(640, 0, 1280, 0);
      g.addColorStop(0, amber(0.9)); g.addColorStop(0.48, amber(0.9)); g.addColorStop(0.52, cream(0.3)); g.addColorStop(1, cream(0.15));
      ctx.strokeStyle = g; ctx.lineWidth = 8; ctx.lineCap = 'round';
      lineP(ctx, 640, y, 940, y, p0);
      if (p > 0.5) lineP(ctx, 980, y + 10 * turn, 1280, y + 10 * turn + 22 * turn, ramp(p, 0.5, 1));
      // the crack between
      ctx.strokeStyle = water(0.8 * ramp(p, 0.4, 0.8)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(955, y - 22); ctx.lineTo(966, y - 4); ctx.lineTo(952, y + 6); ctx.lineTo(964, y + 24); ctx.stroke();
      lbl(`dA${k}`, 560, y, A * smooth(ramp(p, 0, 0.4)));
      lbl(`dB${k}`, 1360, y + 22 * turn, A * smooth(ramp(p, 0.4, 0.9)));
    });
    ctx.restore();
    lbl('dTurn', 960, 1010, A * turn);
  };

  // Government credit cracks; failed exams become more frequent.
  const CRACKS = (() => { const rnd = mulberry32(131), o = []; for (let k = 0; k < 7; k++) { const a = rnd() * TAU; const P = [[Math.cos(a) * 140, Math.sin(a) * 140]]; let r = 140, ang = a; for (let j = 0; j < 4; j++) { r -= 22 + rnd() * 18; ang += (rnd() - 0.5) * 0.6; P.push([Math.cos(ang) * r, Math.sin(ang) * r]); } o.push({ P, d: rnd() }); } return o; })();
  const YEARS = (() => { const rnd = mulberry32(132), o = []; for (let k = 0; k < 40; k++) { const pf = k < 20 ? (k === 13 ? 1 : 0) : rnd() < 0.15 + ((k - 20) / 20) * 0.7 ? 1 : 0; o.push(pf); } return o; })();
  ARTS.credit = (t, run, A) => {
    const [iCrack, iFreq] = run.items;
    const seal = smooth(ramp(t, iCrack.start - 0.4, iCrack.start + 0.8));
    const crack = ramp(t, kw(iCrack, '政府信用'), kw(iCrack, '裂痕') + 1.0);
    const fill = easeOut(ramp(t, iFreq.start - 0.2, kw(iFreq, '大大提高') + 0.2));
    const cy = 560;
    ctx.save(); ctx.globalAlpha = A;
    ctx.globalAlpha = A * seal * (1 - 0.35 * fill);
    softGlow(ctx, 960, cy, 260, 0.18 * (1 - crack * 0.6));
    ctx.strokeStyle = amber(0.85); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(960, cy, 140, 0, TAU); ctx.stroke();
    ctx.strokeStyle = cream(0.85); ctx.lineWidth = 2;
    for (const c of CRACKS) strokePoly(ctx, c.P.map(([x, y]) => [960 + x, cy + y]), clamp(crack * 1.5 - c.d * 0.5));
    ctx.globalAlpha = A;
    // the exam row
    const n = Math.floor(fill * 40 + 0.0001);
    for (let k = 0; k < 40; k++) {
      const x = 380 + k * 29.5, y = 870;
      if (k < n) {
        const fail = YEARS[k];
        ctx.fillStyle = fail ? water(0.85) : amber(0.75);
        ctx.fillRect(x - 11, y - 11, 22, 22);
      } else {
        ctx.strokeStyle = cream(0.2 * smooth(ramp(t, iFreq.start - 0.3, iFreq.start + 0.5))); ctx.lineWidth = 1;
        ctx.strokeRect(x - 11, y - 11, 22, 22);
      }
    }
    ctx.strokeStyle = cream(0.3 * smooth(ramp(t, iFreq.start - 0.3, iFreq.start + 0.5)));
    lineP(ctx, 380 + 19.5 * 29.5, 840, 380 + 19.5 * 29.5, 900, 1);
    ctx.restore();
    const rowA = smooth(ramp(t, iFreq.start - 0.3, iFreq.start + 0.5));
    lbl('crSeal', 960, cy + 175, A * seal * (1 - 0.25 * fill));
    lbl('crFirst', 380 + 9.5 * 29.5, 930, A * rowA);
    lbl('crSecond', 380 + 29.5 * 29.5, 930, A * rowA);
    lbl('crKey', 960, 990, A * rowA * 0.8);
  };

  // The steppe recovers; river breaches hand out "admissions"; then the push south-east.
  const N_DOTS = (() => { const rnd = mulberry32(141), o = []; for (let k = 0; k < 40; k++) { const side = rnd() < 0.65; o.push(side ? { x: 320 + rnd() * 900, y: 420 + rnd() * 140, d: rnd() } : { x: 200 + rnd() * 220, y: 600 + rnd() * 340, d: rnd() }); } return o; })();
  const LEADERS = [3, 11, 22, 33];
  const NR1 = smoothPts([[700, 720], [860, 690], [1000, 730], [1150, 700], [1300, 720], [1460, 690]]);
  const NR2 = smoothPts([[700, 850], [860, 880], [1000, 840], [1150, 870], [1300, 840], [1460, 860]]);
  const BREACH = [[NR1, 0.3], [NR2, 0.55], [NR1, 0.8]];
  ARTS.nomads = (t, run, A) => {
    const [iBreath, iQuota, iSouth] = run.items;
    const draw = smooth(ramp(t, iBreath.start - 0.5, iBreath.start + 1));
    const breath = smooth(ramp(t, kw(iBreath, '喘息') - 0.3, kw(iBreath, '喘息') + 1.2));
    const leader = smooth(ramp(t, kw(iBreath, '杰出领袖') - 0.4, kw(iBreath, '杰出领袖') + 0.6));
    const breachT = kw(iQuota, '突破防线');
    const quota = easeOut(ramp(t, kw(iQuota, '保送') - 0.8, kw(iQuota, '保送') + 0.8));
    const south = easeIn(ramp(t, kw(iSouth, '南下') - 0.4, kw(iSouth, '改朝') + 0.4));
    const change = smooth(ramp(t, kw(iSouth, '改朝') - 0.2, kw(iSouth, '改朝') + 0.6));
    ctx.save(); ctx.globalAlpha = A * draw;
    // centre
    softGlow(ctx, 1080, 780, 460, 0.12 * (1 - change));
    ctx.strokeStyle = amber(0.6 * (1 - 0.7 * change)); ctx.lineWidth = 2;
    ctx.setLineDash(change > 0 ? [10, 8 + 30 * change] : []);
    ctx.beginPath(); ctx.ellipse(1080, 785, 430, 170, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (const r of [NR1, NR2]) {
      ctx.strokeStyle = water(0.8); ctx.lineWidth = 4; strokePoly(ctx, r, 1);
      flowPoly(ctx, r, 1, t, { color: 'rgba(215,232,255,0.4)', w: 1.6 });
    }
    // breaches: once at "突破防线", then often in the second half
    BREACH.forEach(([r, u], k) => {
      const [x, y] = polyAt(r, u);
      burst(ctx, x, y, t, breachT + k * 0.35, { seed: 150 + k, n: 18, radius: 90, life: 1.4, color: water, glow: '126,164,212' });
      for (let j = 0; j < 5; j++) burst(ctx, x, y, t, iSouth.start + 0.3 + k * 0.6 + j * 1.7, { seed: 160 + k * 5 + j, n: 12, radius: 70, life: 1.1, color: water, glow: '126,164,212' });
    });
    // quota lines from breaches to steppe leaders
    if (quota > 0) {
      ctx.setLineDash([3, 9]); ctx.lineWidth = 2;
      BREACH.forEach(([r, u], k) => {
        const [x, y] = polyAt(r, u);
        const L = N_DOTS[LEADERS[k + 1]];
        ctx.strokeStyle = amber(0.6 * (1 - south));
        lineP(ctx, x, y, L.x, L.y, quota);
      });
      ctx.setLineDash([]);
    }
    // steppe dots
    N_DOTS.forEach((d, k) => {
      const isL = LEADERS.indexOf(k);
      const grow = isL === 0 ? leader : isL > 0 ? quota : 0;
      const tx = lerp(d.x, lerp(d.x, 1080, 0.7), south), ty = lerp(d.y, lerp(d.y, 785, 0.7), south);
      const a = 0.3 + 0.5 * breath;
      if (grow > 0) drawOrb(ctx, tx, ty, 6 + 8 * grow, a + 0.3 * grow);
      else { ctx.fillStyle = cream(a); ctx.beginPath(); ctx.arc(tx, ty, 2.5 + 1.5 * breath, 0, TAU); ctx.fill(); }
    });
    if (south > 0) {
      for (const [a, b] of [[[520, 470], [820, 640]], [[880, 440], [1000, 620]], [[300, 760], [620, 790]]]) arrowPoly(ctx, [a, b], south, cream(0.7), 3, 16);
    }
    burst(ctx, 1080, 785, t, kw(iSouth, '改朝'), { seed: 170, n: 40, radius: 300, life: 2 });
    ctx.restore();
    const L0 = N_DOTS[LEADERS[0]];
    lbl('nCenter', 1080, 785, A * draw * (1 - change));
    lbl('nSteppe', 640, 380, A * draw * (1 - leader));
    lbl('nLeader', L0.x, L0.y - 50, A * leader * (1 - quota));
    lbl('nBreach', polyAt(NR1, 0.3)[0], polyAt(NR1, 0.3)[1] - 50, A * smooth(ramp(t, breachT, breachT + 0.5)) * (1 - quota));
    lbl('nQuota', 1180, 560, A * quota * (1 - south));
    lbl('nChange', 1080, 785, A * change);
  };

  // Push the next flood later and further apart: the dynasty bar grows.
  ARTS.delay = (t, run, A) => {
    const [it] = run.items;
    const draw = easeOut(ramp(t, it.start - 0.4, it.start + 1));
    const later = smooth(ramp(t, kw(it, '推迟') - 0.6, kw(it, '推迟') + 0.6));
    const longer = smooth(ramp(t, kw(it, '拉长') - 0.6, kw(it, '拉长') + 0.6));
    const key = smooth(ramp(t, kw(it, '国祚') - 0.3, kw(it, '国祚') + 0.6));
    const m1 = 100 + 40 * later, gap = 100 + 50 * longer;
    const px = 1400 / 360, x0 = 260, y = 760;
    const X = (yr) => x0 + yr * px;
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.35); ctx.lineWidth = 1.5;
    lineP(ctx, x0, y, 1680, y, draw);
    for (let k = 0; k <= 360; k += 20) lineP(ctx, X(k), y - 6, X(k), y + 6, draw);
    // dynasty bar
    ctx.fillStyle = amber(0.25 + 0.35 * key);
    ctx.shadowColor = amber(0.8); ctx.shadowBlur = 16 * key;
    ctx.fillRect(x0, y - 120, (X(m1 + gap) - x0) * draw, 34);
    ctx.shadowBlur = 0;
    // floods
    for (const yr of [m1, m1 + gap, m1 + 2 * gap]) {
      if (X(yr) > 1700) continue;
      softGlow(ctx, X(yr), y, 60, 0.4 * draw, '126,164,212');
      ctx.fillStyle = water(0.95 * draw);
      ctx.beginPath(); ctx.moveTo(X(yr), y - 26); ctx.quadraticCurveTo(X(yr) + 14, y - 4, X(yr), y + 6); ctx.quadraticCurveTo(X(yr) - 14, y - 4, X(yr), y - 26); ctx.fill();
    }
    ctx.restore();
    labels.get('dlBar').textContent = `国祚 ≈ ${Math.round(m1 + gap)} 年`;
    lbl('dlBar', (x0 + X(m1 + gap)) / 2, y - 168, A * draw);
    lbl('dlFlood', X(m1), y + 50, A * draw);
    lbl('dlLater', X(m1) + 10, y - 60, A * later * (1 - longer));
    lbl('dlLonger', (X(m1) + X(m1 + gap)) / 2, y + 50, A * longer);
  };

  // With concrete, the river is held and the reach is unbounded.
  ARTS.concrete = (t, run, A) => {
    const [iTech, iReach] = run.items;
    const draw = smooth(ramp(t, iTech.start - 0.4, iTech.start + 1));
    const tame = smooth(ramp(t, kw(iTech, '钢筋') - 0.2, kw(iTech, '挖掘机') + 1.2));
    const reach = easeOut(ramp(t, kw(iReach, '吞并') - 0.6, iReach.start + iReach.duration + 0.6));
    const ridge = smooth(ramp(t, kw(iReach, '喜马拉雅') - 0.6, kw(iReach, '喜马拉雅') + 0.4));
    const cx = 960, cy = 780;
    ctx.save(); ctx.globalAlpha = A * draw;
    // the river through the centre, tamed by two levees
    const amp = lerp(70, 8, tame);
    ctx.strokeStyle = water(0.85); ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = 0; x <= 1920; x += 10) { const y = cy + Math.sin(x * 0.008 - t * 1.4) * amp; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = cream(0.85); ctx.lineWidth = 4;
    lineP(ctx, 0, cy - 26, 1920, cy - 26, tame);
    lineP(ctx, 0, cy + 26, 1920, cy + 26, tame);
    // the realm expanding past the ridge
    ctx.lineWidth = 2;
    for (let x = 160; x <= 1760; x += 48) chevron(ctx, x, 530 + Math.sin(x * 0.01) * 18, 16, 0.55 * ridge);
    if (reach > 0) {
      const R = lerp(110, 390, reach);
      softGlow(ctx, cx, cy, R * 1.1, 0.14);
      for (let k = 0; k < 3; k++) {
        const rk = R * (0.45 + k * 0.275);
        ctx.strokeStyle = amber(0.35 + k * 0.18); ctx.lineWidth = k === 2 ? 2.5 : 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, rk, 0, TAU); ctx.stroke();
      }
      const ap = easeOut(ramp(reach, 0.25, 0.95));
      for (const [dx, dy] of [[-340, -300], [-150, -320], [150, -320], [340, -300]]) {
        arrowPoly(ctx, [[cx + dx * 0.35, cy - 60], [cx + dx, cy + dy]], ap, amber(0.85), 2.8, 13);
      }
    }
    drawOrb(ctx, cx, cy, 16, 0.9);
    ctx.restore();
    lbl('coTech', cx, cy + 90, A * tame * (1 - reach));
    lbl('coRidge', 960, 485, A * ridge * 0.9);
  };

  // A hundred-year countdown: the realm grows to its limit; then the dragon turns, and it shrinks.
  ARTS.limit = (t, run, A) => {
    const [iBind, iCount, iTurn] = run.items;
    const cx = 960, cy = 720;
    const draw = smooth(ramp(t, iBind.start - 0.4, iBind.start + 1));
    const bind = smooth(ramp(t, kw(iBind, '水龙') - 0.4, kw(iBind, '水龙') + 0.6));
    const count = ramp(t, kw(iCount, '倒数') - 0.4, kw(iCount, '极限') + 0.3);
    const grow = easeOut(ramp(t, kw(iCount, '武威') - 0.6, kw(iCount, '极限')));
    const limitA = smooth(ramp(t, kw(iCount, '西至') - 0.5, kw(iCount, '西至') + 0.5));
    const flip = smooth(ramp(t, kw(iTurn, '翻身') - 0.2, kw(iTurn, '翻身') + 0.5));
    const shrink = easeOut(ramp(t, kw(iTurn, '内缩') - 0.8, kw(iTurn, '内缩') + 0.8));
    const R = lerp(lerp(110, 320, grow), 170, shrink);
    ctx.save(); ctx.globalAlpha = A * draw;
    if (limitA > 0) {
      ctx.setLineDash([6, 12]); ctx.strokeStyle = cream(0.4 * limitA); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 335, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    softGlow(ctx, cx, cy, R * 1.2, 0.14);
    ctx.strokeStyle = amber(0.75); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // the two water dragons running through, binding
    const dProgress = smooth(ramp(t, iBind.start, run.end));
    const dAmp = 16 + 52 * flip * (1 - 0.55 * shrink);
    const dAlpha = 0.32 + 0.63 * bind;
    drawDragon(lerp(1440, 1780, dProgress), cy - 46, 1, t, '120,170,228', dAlpha, 0.3, { scale: 0.72, amp: dAmp, N: 115, seg: 22, pearl: false });
    drawDragon(lerp(480, 140, dProgress), cy + 52, -1, t, '120,170,228', dAlpha, 2.3, { scale: 0.72, amp: dAmp, N: 115, seg: 22, pearl: false });
    // countdown arc
    if (count > 0 && count < 1.0001) {
      ctx.strokeStyle = amber(0.9); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, 60, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - count)); ctx.stroke();
    }
    drawOrb(ctx, cx, cy, 14, 0.9);
    ctx.restore();
    labels.get('liCount').textContent = `${Math.round(100 * (1 - clamp(count)))}`;
    const cA = smooth(ramp(t, kw(iCount, '倒数') - 0.4, kw(iCount, '倒数') + 0.3)) * (1 - flip);
    lbl('liCount', cx, cy - 120, A * cA);
    lbl('liCountT', cx, cy - 165, A * cA * 0.8);
    lbl('liDragons', 300, cy - 130, A * bind * (1 - limitA));
    lbl('liLimit', cx + 335 * 0.72, cy - 335 * 0.72 - 20, A * limitA);
    lbl('liShrink', cx, cy + 240, A * shrink);
  };

  // Two dragons: Chinese traditional river dragons (antlers, whiskers, mane, scales, dorsal spines, four-clawed limbs, flaming pearl).
  function drawDragon(hx, hy, dir, t, tint, a, seed, opts = {}) {
    if (a <= 0) return;
    const { scale = 1, amp = 64, N = 76, seg = 18, pearl = true, legs = true } = opts;
    const P = [], W = [], TX = [], TY = [], NX = [], NY = [], U = [], L = [];
    for (let s = 0; s <= N; s++) {
      const p = s / N;
      const env = 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, (s + 4) / N));
      const wave = Math.sin(s * 0.18 - t * 2.4 + seed) * 0.78 + Math.cos(s * 0.09 - t * 1.3 + seed) * 0.22;
      P.push([hx - dir * s * seg * scale, hy + wave * amp * env]);
      W.push(scale * (2 + 21 * Math.sin((clamp(p * 0.95 + 0.05) ** 0.65) * Math.PI)));
    }
    for (let s = 0; s <= N; s++) {
      const a0 = P[Math.max(0, s - 1)], a1 = P[Math.min(N, s + 1)];
      const dx = a0[0] - a1[0], dy = a0[1] - a1[1];
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len, ty = dy / len;
      const nx = ty * dir, ny = -tx * dir; // always points toward dorsal/upper side
      TX.push(tx); TY.push(ty); NX.push(nx); NY.push(ny);
      U.push([P[s][0] + nx * W[s], P[s][1] + ny * W[s]]);
      L.push([P[s][0] - nx * W[s], P[s][1] - ny * W[s]]);
    }
    ctx.save(); ctx.globalAlpha *= a;

    // 1. Soft atmospheric body aura
    for (let s = 0; s <= N; s += 4) softGlow(ctx, P[s][0], P[s][1], W[s] * 2.2, 0.14, tint);

    // 2. Filled serpentine body + dorsal/ventral rims + glowing spine
    ctx.beginPath();
    U.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let s = N; s >= 0; s--) ctx.lineTo(L[s][0], L[s][1]);
    ctx.closePath();
    ctx.fillStyle = `rgba(${tint},0.25)`;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = `rgba(${tint},0.92)`; ctx.lineWidth = 2.2 * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(${tint},0.9)`; ctx.shadowBlur = 12;
    strokePoly(ctx, U, 1);
    ctx.restore();

    ctx.strokeStyle = `rgba(245,235,215,0.48)`; ctx.lineWidth = 1.6 * scale;
    strokePoly(ctx, L, 1);

    ctx.save();
    ctx.strokeStyle = `rgba(${tint},0.65)`; ctx.lineWidth = 2.6 * scale; ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(${tint},0.95)`; ctx.shadowBlur = 14;
    strokePoly(ctx, P, 1);
    ctx.restore();

    // 3. Belly plates (腹甲) & overlapping fish-scales (龙鳞纹)
    ctx.strokeStyle = 'rgba(245,238,220,0.32)'; ctx.lineWidth = 1.1 * scale;
    for (let s = 2; s <= N - 4; s += 2) {
      const [lx, ly] = L[s];
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + (NX[s] * 0.35 - TX[s] * 0.15) * W[s], ly + (NY[s] * 0.35 - TY[s] * 0.15) * W[s]);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,245,225,0.36)'; ctx.lineWidth = 1.1 * scale;
    for (let s = 3; s <= N - 6; s += 2) {
      const rScale = Math.max(3 * scale, W[s] * 0.34);
      const angBack = Math.atan2(-TY[s], -TX[s]);
      const rows = W[s] > 14 * scale ? [-0.46, 0, 0.46] : W[s] > 8 * scale ? [-0.28, 0.28] : [0];
      const stag = s % 4 === 1 ? 0.12 : -0.12;
      for (const rw of rows) {
        const off = (rw + stag) * W[s];
        const sx = P[s][0] + NX[s] * off, sy = P[s][1] + NY[s] * off;
        ctx.beginPath();
        ctx.arc(sx, sy, rScale, angBack - 0.95, angBack + 0.95);
        ctx.stroke();
      }
    }

    // 4. Dorsal fin spines (龙背鳍棘)
    ctx.lineCap = 'round';
    for (let s = 3; s <= N - 3; s += 2) {
      const p = s / N;
      const h = (18 * (1 - 0.65 * p) + 3) * scale;
      const [ux, uy] = U[s];
      const cx = ux + (NX[s] * 0.65 - TX[s] * 0.25) * h;
      const cy = uy + (NY[s] * 0.65 - TY[s] * 0.25) * h;
      const ex = ux + (NX[s] * 0.92 - TX[s] * 0.68) * h;
      const ey = uy + (NY[s] * 0.92 - TY[s] * 0.68) * h;
      ctx.strokeStyle = s % 4 === 1 ? 'rgba(255,245,220,0.72)' : `rgba(${tint},0.85)`;
      ctx.lineWidth = (2.1 - p) * scale;
      ctx.beginPath(); ctx.moveTo(ux, uy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    }

    // 5. Flame tail plumes (火焰尾羽)
    const [txEnd, tyEnd] = [TX[N], TY[N]], [nxEnd, nyEnd] = [NX[N], NY[N]];
    const [ex0, ey0] = P[N];
    for (let k = -2; k <= 2; k++) {
      const fan = k * 0.26 + Math.sin(t * 3 + k + seed) * 0.08;
      const len = (66 - Math.abs(k) * 10) * scale;
      const bx = -txEnd + nxEnd * fan, by = -tyEnd + nyEnd * fan;
      const midx = ex0 + bx * len * 0.55 + nxEnd * Math.sin(t * 4 + k) * 9 * scale;
      const midy = ey0 + by * len * 0.55 + nyEnd * Math.sin(t * 4 + k) * 9 * scale;
      ctx.strokeStyle = k === 0 ? 'rgba(255,245,220,0.85)' : `rgba(${tint},0.75)`;
      ctx.lineWidth = (2.4 - Math.abs(k) * 0.4) * scale;
      ctx.beginPath(); ctx.moveTo(ex0, ey0); ctx.quadraticCurveTo(midx, midy, ex0 + bx * len, ey0 + by * len); ctx.stroke();
    }

    // 6. Four-clawed dragon limbs (四足鹰爪)
    if (legs) {
      const drawLimb = (sIdx, phOff) => {
        if (sIdx >= N - 5) return;
        const tx = TX[sIdx], ty = TY[sIdx], nx = NX[sIdx], ny = NY[sIdx];
        const sw = Math.sin(t * 2.4 + seed + phOff) * 7 * scale;
        const bx = P[sIdx][0] - nx * W[sIdx] * 0.55, by = P[sIdx][1] - ny * W[sIdx] * 0.55;
        const ex = bx + (-tx * 22 - nx * 22) * scale, ey = by + (-ty * 22 - ny * 22) * scale;
        const ax = ex + (tx * 28 - nx * 20) * scale + dir * sw, ay = ey + (ty * 28 - ny * 20) * scale;
        ctx.strokeStyle = `rgba(${tint},0.88)`; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 6.2 * scale;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.lineWidth = 4.2 * scale;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ax, ay); ctx.stroke();
        // elbow flame tufts
        ctx.strokeStyle = 'rgba(255,242,215,0.6)'; ctx.lineWidth = 1.6 * scale;
        for (const k of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.quadraticCurveTo(ex - tx * 16 * scale, ey - ty * 16 * scale + k * 5 * scale, ex - tx * 30 * scale, ey - ty * 30 * scale + k * 9 * scale);
          ctx.stroke();
        }
        // 4 curved eagle talons
        ctx.strokeStyle = 'rgba(255,246,225,0.92)'; ctx.lineWidth = 2.0 * scale;
        for (const spread of [-0.55, -0.18, 0.18, 0.55]) {
          const cf = tx * Math.cos(spread) - nx * Math.sin(spread);
          const cu = ty * Math.cos(spread) - ny * Math.sin(spread);
          const midx = ax + cf * 11 * scale - nx * 5 * scale;
          const midy = ay + cu * 11 * scale - ny * 5 * scale;
          const tipx = ax + cf * 18 * scale - nx * 12 * scale;
          const tipy = ay + cu * 18 * scale - ny * 12 * scale;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(midx, midy, tipx, tipy); ctx.stroke();
        }
      };
      drawLimb(Math.round(N * 0.2), 0);
      drawLimb(Math.round(N * 0.58), Math.PI);
    }

    // 7. Chinese dragon head (鹿角、虾眼、狮鼻、利齿、龙须、火焰鬃、戏珠)
    const [hx0, hy0] = P[0];
    const [tx0, ty0, nx0, ny0] = [TX[0], TY[0], NX[0], NY[0]];
    const H = (f, u) => [hx0 + (f * tx0 + u * nx0) * scale, hy0 + (f * ty0 + u * ny0) * scale];
    const jawOpen = 1 + 0.16 * Math.sin(t * 2.5 + seed);

    softGlow(ctx, hx0, hy0, 100 * scale, 0.34, tint);

    // Back-side antler & whisker (dimmer for depth)
    const drawAntler = (ox, oy, alpha) => {
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.strokeStyle = 'rgba(255,245,220,0.9)'; ctx.lineCap = 'round';
      const A = (f, u) => H(f + ox, u + oy);
      ctx.lineWidth = 3.2 * scale;
      ctx.beginPath(); ctx.moveTo(...A(-8, 19)); ctx.quadraticCurveTo(...A(-32, 39), ...A(-68, 60)); ctx.stroke();
      ctx.lineWidth = 2.3 * scale;
      for (const [[f0, u0], [f1, u1]] of [[[-22, 31], [-14, 51]], [[-40, 43], [-33, 64]], [[-54, 52], [-58, 70]]]) {
        ctx.beginPath(); ctx.moveTo(...A(f0, u0)); ctx.quadraticCurveTo(...A((f0 + f1) / 2 + 3, (u0 + u1) / 2), ...A(f1, u1)); ctx.stroke();
      }
      ctx.restore();
    };
    drawAntler(7, 5, 0.42);

    // Flowing mane wisps behind the head (脑后龙鬃)
    for (let k = 0; k < 5; k++) {
      const u0 = 14 - k * 6, fl = 52 + (k % 2) * 16;
      const sway = Math.sin(t * 3.4 + k * 1.1 + seed) * 8;
      ctx.strokeStyle = k % 2 === 0 ? `rgba(${tint},0.85)` : 'rgba(255,242,215,0.72)';
      ctx.lineWidth = (2.8 - k * 0.25) * scale;
      ctx.beginPath();
      ctx.moveTo(...H(-14, u0));
      ctx.quadraticCurveTo(...H(-38, u0 + 8 + sway * 0.5), ...H(-14 - fl, u0 + 4 + sway));
      ctx.stroke();
    }

    // Upper jaw & upturned snout ridge
    const upperPts = [[-22, 13], [-6, 22], [10, 14], [28, 17], [38, 13], [40, 5], [28, 1], [10, 3], [-6, -1]];
    ctx.beginPath();
    upperPts.forEach(([f, u], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, ...H(f, u)));
    ctx.closePath();
    ctx.fillStyle = `rgba(${tint},0.48)`; ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,225,0.88)'; ctx.lineWidth = 2.2 * scale; ctx.stroke();

    // Nostril curl
    ctx.strokeStyle = 'rgba(255,245,225,0.8)'; ctx.lineWidth = 1.6 * scale;
    ctx.beginPath(); ctx.arc(...H(31, 10), 2.5 * scale, 0, TAU); ctx.stroke();

    // Lower jaw & chin beard (龙髯)
    const lowerPts = [[-6, -1], [12, -8 * jawOpen], [28, -12 * jawOpen], [32, -16 * jawOpen], [18, -21 * jawOpen], [-14, -14]];
    ctx.beginPath();
    lowerPts.forEach(([f, u], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, ...H(f, u)));
    ctx.closePath();
    ctx.fillStyle = `rgba(${tint},0.42)`; ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,225,0.82)'; ctx.lineWidth = 2.0 * scale; ctx.stroke();

    ctx.strokeStyle = `rgba(${tint},0.75)`; ctx.lineWidth = 1.6 * scale;
    for (let k = 0; k < 3; k++) {
      const bf = 18 - k * 7, bu = -19 * jawOpen;
      const sway = Math.sin(t * 3 + k + seed) * 6;
      ctx.beginPath(); ctx.moveTo(...H(bf, bu));
      ctx.quadraticCurveTo(...H(bf - 10, bu - 12), ...H(bf - 22 + sway, bu - 22));
      ctx.stroke();
    }

    // Fangs (利齿) & tongue
    ctx.fillStyle = 'rgba(255,250,240,0.95)';
    for (const [f, u, h] of [[27, 2, -6], [20, 3, -5], [12, 3, -4], [5, 2, -4]]) {
      ctx.beginPath(); ctx.moveTo(...H(f - 2, u)); ctx.lineTo(...H(f + 2, u)); ctx.lineTo(...H(f, u + h)); ctx.closePath(); ctx.fill();
    }
    for (const [f, u, h] of [[24, -12 * jawOpen, 5.5], [16, -10 * jawOpen, 4.5], [8, -8 * jawOpen, 4]]) {
      ctx.beginPath(); ctx.moveTo(...H(f - 2, u)); ctx.lineTo(...H(f + 2, u)); ctx.lineTo(...H(f, u + h)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = `rgba(${tint},0.85)`; ctx.lineWidth = 2.2 * scale;
    ctx.beginPath(); ctx.moveTo(...H(0, -3)); ctx.quadraticCurveTo(...H(14, -4 * jawOpen), ...H(22, -6 * jawOpen)); ctx.stroke();

    // Front antler
    drawAntler(0, 0, 1);

    // Fierce brow & glowing eye (虾眼剑眉)
    ctx.strokeStyle = 'rgba(255,245,225,0.92)'; ctx.lineWidth = 2.2 * scale;
    ctx.beginPath(); ctx.moveTo(...H(-12, 16)); ctx.quadraticCurveTo(...H(2, 21), ...H(12, 15)); ctx.stroke();
    drawOrb(ctx, ...H(3, 11), 3.8 * scale, 1);

    // Two long S-curved whiskers (长龙须)
    for (const [wf, wu, len, ph] of [[30, 8, 95, 0], [26, 2, 82, 1.8]]) {
      const s1 = Math.sin(t * 2.8 + ph + seed) * 14;
      const s2 = Math.cos(t * 2.3 + ph + seed) * 18;
      ctx.strokeStyle = 'rgba(255,245,225,0.85)'; ctx.lineWidth = 1.7 * scale;
      ctx.beginPath();
      ctx.moveTo(...H(wf, wu));
      ctx.bezierCurveTo(...H(wf + len * 0.35, wu + 18 + s1), ...H(wf + len * 0.7, wu - 14 + s2), ...H(wf + len, wu + 8 + s1 * 0.7));
      ctx.stroke();
    }

    // Flaming dragon pearl ahead of the mouth (火焰龙珠)
    if (pearl) {
      const [px, py] = H(72, -1 + Math.sin(t * 2.2 + seed) * 3);
      softGlow(ctx, px, py, 34 * scale, 0.55, '255,210,130');
      drawOrb(ctx, px, py, 7.5 * scale, 0.98);
      ctx.strokeStyle = amber(0.85); ctx.lineWidth = 1.6 * scale;
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * TAU + t * 1.8 + seed;
        const rx = px + Math.cos(ang) * 11 * scale, ry = py + Math.sin(ang) * 11 * scale;
        ctx.beginPath(); ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(px + Math.cos(ang + 0.5) * 18 * scale, py + Math.sin(ang + 0.5) * 18 * scale - 6 * scale, px + Math.cos(ang + 0.2) * 20 * scale, py + Math.sin(ang + 0.2) * 20 * scale - 14 * scale);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
  const BARB = (() => { const rnd = mulberry32(181), o = []; for (let k = 0; k < 30; k++) { const side = k % 3; o.push(side === 0 ? [80 + rnd() * 1760, 380 + rnd() * 50] : side === 1 ? [40 + rnd() * 120, 450 + rnd() * 560] : [1760 + rnd() * 120, 450 + rnd() * 560]); } return o; })();
  ARTS.dragons = (t, run, A) => {
    const [it] = run.items;
    const barbA = smooth(ramp(t, it.start - 0.3, it.start + 0.8)) * (1 - smooth(ramp(t, kw(it, '而是') - 0.3, kw(it, '而是') + 0.6)));
    const dr = smooth(ramp(t, it.start + 3.2, it.start + 6.2));
    const u = ramp(t, it.start, run.end);
    ctx.save(); ctx.globalAlpha = A;
    for (const [x, y] of BARB) { ctx.fillStyle = cream(0.4 * barbA); ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
    drawDragon(lerp(820, 1640, u), 600, 1, t, '224,178,104', dr, 0, { scale: 1.08, amp: 64 });
    drawDragon(lerp(1100, 280, u), 870, -1, t, '120,170,228', dr, 2.4, { scale: 1.08, amp: 64 });
    ctx.restore();
    lbl('drBarb', 960, 360, A * barbA);
    lbl('drYR', lerp(820, 1640, u) - 60, 465, A * dr);
    lbl('drYZ', lerp(1100, 280, u) + 60, 1005, A * dr);
  };

  // Water rising at the bottom; rain.
  ARTS.fangxun = (t, run, A) => {
    const [iDull, iWar] = run.items;
    const rise = smooth(ramp(t, iDull.start, iWar.start + iWar.duration));
    const crest = smooth(ramp(t, kw(iWar, '最凶险') - 0.3, kw(iWar, '最凶险') + 0.6));
    const level = lerp(1060, 860, rise);
    ctx.save(); ctx.globalAlpha = A;
    const rnd = mulberry32(191);
    ctx.strokeStyle = water(0.18 + 0.25 * rise); ctx.lineWidth = 1.3;
    for (let k = 0; k < 70; k++) {
      const x = rnd() * 1920, ph = rnd();
      const y = frac(ph + t * 0.9) * (level + 40) - 40;
      lineP(ctx, x, y, x - 5, y + 22, 1);
    }
    ctx.fillStyle = `rgba(60,90,130,${(0.35 + 0.15 * crest).toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(0, 1080);
    for (let x = 0; x <= 1920; x += 16) ctx.lineTo(x, level + Math.sin(x * 0.008 + t * 1.6) * (8 + 18 * crest) + Math.sin(x * 0.021 - t * 2.3) * 5);
    ctx.lineTo(1920, 1080); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = water(0.7 + 0.3 * crest); ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // A wild river, gradually held between straight levees.
  ARTS.levee = (t, run, A) => {
    const [it] = run.items;
    const draw = smooth(ramp(t, it.start - 0.4, it.start + 1));
    const build = easeOut(ramp(t, kw(it, '一百年') - 0.2, kw(it, '钢筋') + 1.0));
    const tame = smooth(ramp(t, kw(it, '钢筋') - 0.3, kw(it, '镇压') + 0.6));
    const cy = 760;
    ctx.save(); ctx.globalAlpha = A * draw;
    const amp = lerp(170, 6, tame);
    // spill marks along the past
    for (let k = 0; k < 9; k++) {
      const x = 120 + k * 210;
      softGlow(ctx, x, cy + Math.sin(x * 0.006 + 1) * 140, 90, 0.18 * (1 - tame), '126,164,212');
    }
    ctx.strokeStyle = water(0.9); ctx.lineWidth = lerp(26, 34, tame); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = water(0.8); ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let x = -20; x <= 1940; x += 10) { const y = cy + Math.sin(x * 0.006 + 1 - t * 0.9) * amp + Math.sin(x * 0.017 - t * 1.7) * amp * 0.25; x > -20 ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    flowPoly(ctx, [[0, cy], [1920, cy]], tame, t, { color: `rgba(220,235,255,${0.5 * tame})`, w: 2, speed: 80, dash: [20, 30] });
    // levees with concrete hatching
    ctx.strokeStyle = cream(0.85); ctx.lineWidth = 5;
    for (const dy of [-34, 34]) {
      lineP(ctx, 0, cy + dy, 1920, cy + dy, build);
      ctx.lineWidth = 1.5;
      for (let x = 10; x < 1920 * build; x += 28) lineP(ctx, x, cy + dy + Math.sign(dy) * 4, x + 14, cy + dy + Math.sign(dy) * 16, 1);
      ctx.lineWidth = 5;
    }
    ctx.restore();
    lbl('lv2000', 960, 520, A * draw * (1 - build) * 0.9);
    lbl('lvLevee', 960, cy + 100, A * smooth(ramp(build, 0.4, 0.8)));
  };

  // At the source: dams on the tributaries; sponge cities on the plain.
  const SPONGE = (() => { const o = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) o.push([1380 + c * 54 + (r % 2) * 27, 600 + r * 48]); return o; })();
  ARTS.source = (t, run, A) => {
    const [iDam, iSponge] = run.items;
    const draw = easeOut(ramp(t, iDam.start - 0.6, iDam.start + 1.2));
    const mtn = smooth(ramp(t, kw(iDam, '横断') - 0.4, kw(iDam, '横断') + 0.5));
    const him = smooth(ramp(t, kw(iDam, '喜马拉雅') - 0.4, kw(iDam, '喜马拉雅') + 0.5));
    const dam = easeOut(ramp(t, kw(iDam, '水利工程') - 0.5, kw(iDam, '水利工程') + 1.4));
    const sponge = smooth(ramp(t, kw(iSponge, '海绵') - 0.5, kw(iSponge, '海绵') + 1.2));
    const strip = smooth(ramp(t, kw(iSponge, '剥离') - 0.3, kw(iSponge, '剥离') + 1.2));
    // the funnel's power: a cold glow over the basin, stripped at the end
    ctx.save(); ctx.globalAlpha = A;
    softGlow(ctx, 760, 720, 520, 0.18 * draw * (1 - strip), '110,140,190');
    ctx.restore();
    drawFunnel(t, A, { draw, flow: lerp(1, 0.35, dam), tribP: () => draw, mainW: lerp(7, 4, dam), ridgeA: 0.55 });
    ctx.save(); ctx.globalAlpha = A;
    // highlight the two source ranges
    ctx.lineWidth = 2.5;
    for (const [x, y, a] of RIDGES) {
      const top = a < 180;
      const h = top ? mtn : him;
      if (h > 0) chevron(ctx, x, y, 16, 0.9 * h, amber);
    }
    // dams
    TRIBS.forEach((tr, k) => {
      const p = clamp(dam * 1.6 - k * 0.07);
      if (p <= 0) return;
      const [x, y] = polyAt(tr, 0.5), [bx, by] = polyAt(tr, 0.47);
      const ang = Math.atan2(y - by, x - bx) + Math.PI / 2;
      ctx.strokeStyle = amber(0.95 * p); ctx.lineWidth = 5; ctx.lineCap = 'butt';
      lineP(ctx, x - Math.cos(ang) * 16, y - Math.sin(ang) * 16, x + Math.cos(ang) * 16, y + Math.sin(ang) * 16, 1);
      softGlow(ctx, x, y, 30, 0.3 * p);
    });
    // sponge cities
    SPONGE.forEach(([x, y], k) => {
      const p = smooth(ramp(sponge, (k / SPONGE.length) * 0.6, (k / SPONGE.length) * 0.6 + 0.4));
      if (p <= 0) return;
      ctx.strokeStyle = amber(0.65 * p); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
      const soak = 0.5 + 0.5 * Math.sin(t * 2 + k);
      ctx.fillStyle = water(0.5 * p * soak); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    });
    ctx.restore();
    lbl('sHengduan', 440, 330, A * mtn);
    lbl('sHimalaya', 440, 1035, A * him);
    lbl('sDam', 760, 640, A * smooth(ramp(dam, 0.3, 0.7)) * (1 - sponge));
    lbl('sSponge', 1600, 560, A * sponge);
  };

  // Regulated flow into the loop; then the loop breaks open.
  const LOOP = [1060, 700], LR = 210;
  ARTS.curse = (t, run, A) => {
    const [it] = run.items;
    const draw = easeOut(ramp(t, it.start - 0.5, it.start + 1.2));
    const valve = smooth(ramp(t, kw(it, '决定') - 0.4, kw(it, '决定') + 0.8));
    const open = easeOut(ramp(t, kw(it, '终结') - 0.3, kw(it, '诅咒') + 1.2));
    ctx.save(); ctx.globalAlpha = A;
    // vessel into the loop
    ctx.strokeStyle = cream(0.3 * draw); ctx.lineWidth = 2;
    lineP(ctx, 160, LOOP[1] + LR, LOOP[0], LOOP[1] + LR, draw);
    // valve
    ctx.strokeStyle = amber(0.85 * draw); ctx.lineWidth = 3;
    ctx.strokeRect(500 - 22, LOOP[1] + LR - 22, 44, 44);
    const va = lerp(0.9, 0, valve);
    lineP(ctx, 500 - Math.cos(va) * 22, LOOP[1] + LR - 22 - 30 - Math.sin(va) * 0, 500 + Math.cos(va) * 22, LOOP[1] + LR - 52 + Math.sin(va) * 20, 1);
    // flowing drops: irregular before, even after
    for (let k = 0; k < 14; k++) {
      const irregular = frac(k * 0.37 + (t - it.start) * (0.35 + 0.25 * Math.sin(k * 3.1)));
      const even = frac(k / 14 + (t - it.start) * 0.18);
      const u = lerp(irregular, even, valve);
      const x = lerp(170, LOOP[0], u);
      ctx.fillStyle = water(0.8 * draw * (1 - open) * Math.sin(Math.PI * u));
      ctx.beginPath(); ctx.arc(x, LOOP[1] + LR, 4, 0, TAU); ctx.fill();
    }
    // the loop with a gap that opens at the upper right while keeping the bottom-right entry connected
    ctx.strokeStyle = cream(0.5 * draw); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(LOOP[0], LOOP[1], LR, 0, TAU * draw - open * 1.1); ctx.stroke();
    // the point circling, then leaving on a straight path
    const cyc = (t - it.start) * 1.3;
    let px, py;
    if (open <= 0) { px = LOOP[0] + Math.cos(cyc) * LR; py = LOOP[1] + Math.sin(cyc) * LR; }
    else {
      px = LOOP[0] + LR + open * 620; py = LOOP[1];
      ctx.strokeStyle = amber(0.9); ctx.lineWidth = 3; ctx.shadowColor = amber(0.9); ctx.shadowBlur = 14;
      lineP(ctx, LOOP[0] + LR, LOOP[1], px, py, 1);
      ctx.shadowBlur = 0;
      burst(ctx, LOOP[0] + LR, LOOP[1], t, kw(it, '终结') - 0.3, { seed: 205, n: 24, radius: 110, life: 1.4 });
    }
    drawOrb(ctx, px, py, 10, draw);
    ctx.restore();
    lbl('cuLoop', LOOP[0], LOOP[1] - LR - 40, A * draw * (1 - open));
    lbl('cuValve', 500, LOOP[1] + LR + 52, A * valve);
    lbl('cuOpen', Math.min(px + 40, 1740), py - 50, A * smooth(ramp(open, 0.5, 1)));
  };

  // Dawn over a calm river.
  ARTS.end = (t, run, A) => {
    const HZ = 760;
    const rise = smooth(ramp(t, run.start, END));
    ctx.save(); ctx.globalAlpha = A;
    const sky = ctx.createLinearGradient(0, 300, 0, HZ);
    sky.addColorStop(0, 'rgba(30,36,60,0)');
    sky.addColorStop(1, `rgba(240,170,110,${(0.08 + 0.3 * rise).toFixed(3)})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 300, width, HZ - 300);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, HZ); ctx.clip();
    softGlow(ctx, 960, HZ + 60 - 120 * rise, 520, 0.2 + 0.3 * rise, '245,190,120');
    ctx.restore();
    ctx.strokeStyle = amber(0.35 + 0.3 * rise); ctx.lineWidth = 1.5;
    lineP(ctx, 0, HZ, width, HZ, 1);
    const rnd = mulberry32(201);
    for (let k = 0; k < 60; k++) {
      const v = rnd(), y = HZ + 10 + v * v * 300;
      const half = (30 + v * 260) * (0.5 + 0.5 * rnd());
      const x = 960 + (rnd() - 0.5) * (80 + v * 500) + Math.sin(t * 0.8 + k) * 12;
      ctx.strokeStyle = amber((0.15 + 0.4 * rise) * (1 - v * 0.6) * (0.6 + 0.4 * Math.sin(t * 2 + k * 1.7)));
      ctx.lineWidth = 1 + v * 2;
      lineP(ctx, x - half / 2, y, x + half / 2, y, 1);
    }
    ctx.restore();
  };

  // ================= frame =================
  const fadeIO = (t, a, b, inLen = 0.6, outLen = 0.6) => smooth(ramp(t, a, a + inLen)) * (1 - smooth(ramp(t, b - outLen, b - 0.05)));
  let fontsReady = document.fonts.ready;

  function drawArt(t, cardOut) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    const warm = smooth(ramp(t, 0, END));
    for (const d of DUST) {
      const y = ((d.y - t * d.v) % height + height) % height;
      const x = d.x + Math.sin(t * d.f + d.ph) * 24;
      const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + d.ph * 3);
      ctx.fillStyle = `rgba(${Math.round(lerp(190, 245, warm))},${Math.round(lerp(200, 215, warm))},${Math.round(lerp(220, 175, warm))},${(d.a * tw * (1 - cardOut) * lerp(0.6, 1, warm)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, d.r, 0, TAU); ctx.fill();
    }
    for (const run of runs) {
      if (t < run.start - 0.8 || t > run.end + 0.1) continue;
      const A = fadeIO(t, run.start - 0.7, run.end, 0.8, 0.7);
      if (A <= 0) continue;
      ctx.save();
      ARTS[run.key]?.(t, run, A);
      ctx.restore();
    }
  }

  return {
    async prepareFrame(t) {
      if (imgReady) { await imgReady; imgReady = null; }
      const cardOut = smooth(ramp(t, timeline.duration - 0.9, timeline.duration - 0.1));
      for (const el of labels.values()) el.style.opacity = '0';
      used.clear();

      const warm = smooth(ramp(t, 0, END));
      const gx = 50 + 18 * Math.sin(t * 0.07), gy = 46 + 10 * Math.cos(t * 0.05);
      glow.style.background =
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(224,182,124,${lerp(0.05, 0.15, warm).toFixed(3)}) 0%, rgba(224,182,124,0) 44%),` +
        `radial-gradient(circle at ${100 - gx}% ${100 - gy}%, rgba(90,105,150,${lerp(0.18, 0.05, warm).toFixed(3)}) 0%, rgba(90,105,150,0) 52%)`;
      glow.style.opacity = String(1 - cardOut);
      drawArt(t, cardOut);

      for (const b of blocks) {
        if (t < b.in - 0.2 || t > b.out + 0.2) { b.el.style.opacity = '0'; b.el.style.visibility = 'hidden'; continue; }
        b.el.style.visibility = 'visible';
        const isLast = b === blocks[blocks.length - 1];
        const out = isLast ? 1 - smooth(ramp(t, END - 0.2, END + 0.9)) : 1 - smooth(ramp(t, b.out - 0.65, b.out - 0.05));
        b.el.style.opacity = String(out);
        if (b.tag) b.tag.style.opacity = String(0.75 * smooth(ramp(t, 0.3, 1.3)));
        b.lines.forEach((ln, k) => {
          const next = b.lines[k + 1];
          const dimP = next ? smooth(ramp(t, next.it.start - 0.2, next.it.start + 0.5)) : 0;
          const big = /s-xl|s-l/.test(ln.el.className);
          reveal(ln.chars, t, ln.it.start, ln.it.duration, { dimTo: lerp(1, 0.32, dimP), rise: big ? 12 : 8, blur: big ? 5 : 3 });
        });
      }

      const step = (d0, d1) => smooth(ramp(t, END + d0, END + d1));
      const logoIn = step(0.6, 1.8);
      card.style.opacity = String(t < END ? 0 : 1 - cardOut);
      logo.style.opacity = String(logoIn);
      logo.style.transform = `translateY(${(1 - logoIn) * 14}px)`;
      rule.style.width = `${lerp(0, 260, step(1.1, 2.5))}px`;
      const titleIn = step(1.6, 2.7), urlIn = step(2.1, 3.2);
      srcTitle.style.opacity = String(titleIn);
      srcTitle.style.transform = `translateY(${(1 - titleIn) * 10}px)`;
      srcUrl.style.opacity = String(urlIn);
      srcUrl.style.transform = `translateY(${(1 - urlIn) * 10}px)`;

      for (const [k, el] of labels) if (!used.has(k)) el.style.opacity = '0';
      if (fontsReady) { await fontsReady; fontsReady = null; }
    },
    dispose() {
      root.replaceChildren();
      style.remove();
      root.classList.remove('mh-root');
    },
  };
}
