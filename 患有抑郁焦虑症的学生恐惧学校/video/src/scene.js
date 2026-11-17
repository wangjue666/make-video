import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/700.css';
import timeline from './timeline.json';
import { LINES, SOURCE } from './script.js';

const logoUrl = new URL('../assets/sooon-logo.png', import.meta.url).href;

// ---------- palette & helpers ----------
const C = {
  bg: '#09090d',
  text: '#ece7dd',
  em: '#e0b67c',      // warm amber: light, courage, 1.01
  dim: 'rgba(236,231,221,0.55)',
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (p) => { p = clamp(p); return p * p * (3 - 2 * p); };
const easeOut = (p) => 1 - (1 - clamp(p)) ** 3;
const easeIn = (p) => clamp(p) ** 2;
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
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

const CSS = `
.mh-root{position:relative;overflow:hidden;background:${C.bg};color:${C.text};
  font-family:'Noto Serif SC',serif;font-weight:400}
.mh-root *{box-sizing:border-box}
.layer{position:absolute;inset:0}
.blk{position:absolute;left:0;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;transform:translateY(-50%)}
.line span.c{display:inline-block;white-space:pre;will-change:opacity,transform,filter}
.s-xl{font-size:118px;font-weight:700;letter-spacing:.12em;line-height:1.4}
.s-l{font-size:74px;font-weight:700;letter-spacing:.08em;line-height:1.5}
.s-q{font-size:62px;font-weight:700;letter-spacing:.06em;line-height:1.6}
.s-m{font-size:52px;letter-spacing:.05em;line-height:1.7}
.s-g{font-size:40px;letter-spacing:.04em;line-height:1.5;margin:10px 0}
.s-beat{font-size:66px;font-weight:700;letter-spacing:.14em;line-height:1.45}
.tag{font-size:26px;letter-spacing:.5em;color:${C.em};margin-bottom:36px}
.lbl{position:absolute;left:0;top:0;white-space:nowrap;transform:translate(-50%,-50%);opacity:0;
  font-size:24px;letter-spacing:.25em;color:${C.dim}}
.rule{height:1px;background:${C.em};opacity:.5;margin:40px 0 44px}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.src-title{font-size:34px;letter-spacing:.06em;max-width:1500px;line-height:1.6}
.src-title b{color:${C.em};font-weight:400;margin-right:.6em}
.src-url{font-size:22px;letter-spacing:.06em;margin-top:22px;color:rgba(236,231,221,.5);font-family:Georgia,'Noto Serif SC',serif}
`;

// Split "[emphasis]" markup into per-character spans, grouped into phrases.
// A phrase ends after punctuation or a line break; each phrase appears as one unit.
const PUNCT = /[，。、！？；：—…“”!?;]/; // no ASCII "." — it's the decimal point in 1.01
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
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// Burst of sparks: an "applause" for a small victory.
function burst(ctx, x, y, t, t0, { n = 22, seed = 1, radius = 120, life = 1.4 } = {}) {
  const tau = t - t0;
  if (tau < 0 || tau > life) return;
  const rnd = mulberry32(seed);
  const p = tau / life;
  for (let k = 0; k < n; k++) {
    const ang = rnd() * TAU, sp = 0.5 + rnd() * 0.5, sz = 1.4 + rnd() * 2.2;
    const d = easeOut(p) * radius * sp;
    const a = (1 - p) ** 1.5;
    ctx.fillStyle = amber(a);
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d + p * p * 20, sz * (1 - p * 0.5), 0, TAU); ctx.fill();
  }
  softGlow(ctx, x, y, radius * 0.9, 0.35 * (1 - p) ** 2);
}

// Line figure, feet at (x, y), height h. `walk` 0..1 blends in a stride at `phase`.
function drawPerson(ctx, x, y, h, { phase = 0, walk = 0, alpha = 1, color = cream(0.92), armUp = 0, bow = 0, dir = 1 } = {}) {
  if (alpha <= 0) return;
  const u = h / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6.5 * u;
  const sw = Math.sin(phase) * 0.42 * walk;
  const bob = Math.abs(Math.cos(phase)) * 2.2 * u * walk;
  const hipY = -50 * u + bob;
  const lean = 0.06 * walk + bow * 0.25;
  const neck = [Math.sin(lean) * 32 * u, hipY - 32 * u];
  // legs
  for (const s of [sw, -sw]) {
    const knee = [Math.sin(s) * 25 * u, hipY + Math.cos(s) * 25 * u];
    const shin = s - Math.max(0, -s) * 0.9;
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(knee[0], knee[1]);
    ctx.lineTo(knee[0] + Math.sin(shin) * 25 * u, knee[1] + Math.cos(shin) * 25 * u); ctx.stroke();
  }
  // body
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(neck[0], neck[1]); ctx.stroke();
  // arms
  const sh = [neck[0] * 0.9, neck[1] + 4 * u];
  const arms = [-sw * 0.8, sw * 0.8];
  arms.forEach((a, k) => {
    let ang = a;
    if (k === 1 && armUp > 0) ang = lerp(a, Math.PI * 0.85, armUp);
    const el = [sh[0] + Math.sin(ang) * 17 * u, sh[1] + Math.cos(ang) * 17 * u];
    const ang2 = ang + (k === 1 && armUp > 0 ? 0.25 * armUp : -0.25 * walk);
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]);
    ctx.lineTo(el[0] + Math.sin(ang2) * 16 * u, el[1] + Math.cos(ang2) * 16 * u); ctx.stroke();
  });
  // head
  const hd = [neck[0] + Math.sin(lean + bow * 0.6) * 11 * u, neck[1] - Math.cos(bow * 0.6) * 11 * u];
  ctx.beginPath(); ctx.arc(hd[0], hd[1], 8.5 * u, 0, TAU); ctx.fill();
  ctx.restore();
}

// School gate: two posts, a beam and a name plate. `lit` fills the opening with warm light.
function drawGate(ctx, cx, gy, s, alpha, lit = 0, draw = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const half = 200 * s, ph = 330 * s, pw = 34 * s;
  if (lit > 0) {
    const g = ctx.createLinearGradient(0, gy - ph, 0, gy);
    g.addColorStop(0, amber(0.05 * lit));
    g.addColorStop(1, amber(0.32 * lit));
    ctx.fillStyle = g;
    ctx.fillRect(cx - half + pw / 2, gy - ph, 2 * half - pw, ph);
    softGlow(ctx, cx, gy - ph * 0.4, half * 1.5, 0.22 * lit);
  }
  ctx.strokeStyle = cream(0.7);
  ctx.fillStyle = 'rgba(14,14,18,0.95)';
  ctx.lineWidth = 2.2;
  const pp = ramp(draw, 0, 0.6), bp = ramp(draw, 0.4, 1);
  for (const sx of [-1, 1]) {
    const x = cx + sx * half - pw / 2;
    const h = ph * pp;
    ctx.fillRect(x, gy - h, pw, h);
    ctx.strokeRect(x, gy - h, pw, h);
  }
  if (bp > 0) {
    const bw = (2 * half + 80 * s) * bp;
    ctx.fillRect(cx - bw / 2, gy - ph - 26 * s, bw, 24 * s);
    ctx.strokeRect(cx - bw / 2, gy - ph - 26 * s, bw, 24 * s);
    ctx.globalAlpha *= bp;
    ctx.fillRect(cx - 80 * s, gy - ph - 84 * s, 160 * s, 58 * s);
    ctx.strokeRect(cx - 80 * s, gy - ph - 84 * s, 160 * s, 58 * s);
  }
  ctx.restore();
}

function drawFoot(ctx, x, y, s, a, left) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * (left ? 1 : -1));
  ctx.fillStyle = amber(a);
  ctx.beginPath(); ctx.ellipse(10, 0, 18, 10, 0.08, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-19, 1, 9, 7.5, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 5; k++) {
    const ang = -0.55 + k * 0.27;
    ctx.beginPath(); ctx.arc(10 + Math.cos(ang) * 25, Math.sin(ang) * 13, 3.4 - k * 0.35, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Mountain silhouette, base centre at (cx, by).
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
  // snow-cap hint
  ctx.strokeStyle = cream(0.25);
  ctx.beginPath();
  ctx.moveTo(cx - 0.13 * w, by - 0.78 * h); ctx.lineTo(cx - 0.06 * w, by - h); ctx.lineTo(cx + 0.03 * w, by - 0.84 * h);
  ctx.stroke();
  ctx.restore();
}

function bez(p0, p1, p2, p3, u) {
  const v = 1 - u;
  return [
    v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
  ];
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
  return pts[pts.length - 1];
}

function strokePoly(ctx, pts, p) {
  if (p <= 0) return;
  const [ex, ey, k] = polyAt(pts, p);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let j = 1; j <= k; j++) ctx.lineTo(pts[j][0], pts[j][1]);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

// Ambient dust.
const DUST = (() => {
  const rnd = mulberry32(7), out = [];
  for (let k = 0; k < 90; k++) out.push({ x: rnd() * 1920, y: rnd() * 1080, v: 6 + rnd() * 14, f: 0.1 + rnd() * 0.3, ph: rnd() * 6.28, r: 0.6 + rnd() * 1.8, a: 0.15 + rnd() * 0.45 });
  return out;
})();

// Where each section's text block sits (vertical centre, px).
const TEXT_Y = {
  question: 250, self: 230, brave: 255, start: 360, walk: 380, stairs: 220, graph: 190,
  late: 330, weeks: 200, advantage: 520, dark: 215, canyon: 190, lesson: 520, redox: 240,
  gate: 220, mountain: 210, heart: 500, dawn: 250, go: 360,
};
const ART_OF = { go: 'dawn' };

export default function ({ root, width, height, pixelRatio }) {
  root.classList.add('mh-root');
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const items = timeline.items;
  const END = timeline.endCard;
  const S = (i) => items[i].start;
  const D = (i) => items[i].duration;
  const E = (i) => items[i].start + items[i].duration;

  // Art runs: consecutive lines sharing an illustration.
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
  mkLabel('gateSign', '学 校', 'font-size:22px;letter-spacing:.4em;color:rgba(236,231,221,.75)');
  mkLabel('others', '别人', '');
  mkLabel('yesterday', '昨天的你', '');
  mkLabel('today', '今天的你', AMB);
  mkLabel('b1', '走到校门', '');
  mkLabel('b2', '坐进教室', '');
  mkLabel('b3', '和老师打招呼', '');
  mkLabel('startLbl', '起 点', 'font-size:30px;letter-spacing:.4em;color:rgba(236,231,221,.75)');
  mkLabel('footL', '左', `font-size:28px;${AMB}`);
  mkLabel('footR', '右', `font-size:28px;${AMB}`);
  mkLabel('rest', '歇一歇', `font-size:24px;${AMB}`);
  mkLabel('linLbl', '1 + 1 + 1 + 1 …', 'font-size:26px;letter-spacing:.1em');
  mkLabel('expLbl', '1.01 × 1.01 × 1.01 …', `font-size:26px;letter-spacing:.1em;${AMB}`);
  mkLabel('tenYears', '十 年', '');
  mkLabel('age12', '12 岁 · 开始识字', '');
  for (let k = 1; k <= 7; k++) mkLabel(`dec${k}`, '十年', 'font-size:22px');
  mkLabel('weekLbl', '', 'font-size:26px;letter-spacing:.2em');
  mkLabel('counter', '', `font-size:120px;font-weight:700;letter-spacing:.02em;${AMB};font-family:Georgia,'Noto Serif SC',serif`);
  mkLabel('yr1', '第 1 年', 'font-size:18px;letter-spacing:.1em');
  mkLabel('yr10', '第 10 年', 'font-size:18px;letter-spacing:.1em');
  mkLabel('wk', '每一格 = 一个星期 × 1.01', 'font-size:20px;letter-spacing:.15em');
  mkLabel('canyon', '峡 谷', '');
  mkLabel('plain', '平 原', '');
  mkLabel('peak', '别人的山', '');
  mkLabel('you', '你', `font-size:30px;font-weight:700;${AMB}`);
  mkLabel('later', '后来的人', 'font-size:22px');
  mkLabel('taCard', 'ta 们', 'font-size:28px');
  mkLabel('youCard', '你', `font-size:30px;font-weight:700;${AMB}`);
  mkLabel('eq1', 'Zn + Cu²⁺ → Zn²⁺ + Cu', `font-size:40px;letter-spacing:.06em;color:${C.text};font-family:Georgia,'Noto Serif SC',serif`);
  mkLabel('eq2', 'Zn + Cu²⁺ → Zn²⁺ + Cu', `font-size:40px;letter-spacing:.06em;color:${C.text};font-family:Georgia,'Noto Serif SC',serif`);
  mkLabel('pressure', '重 压', 'font-size:26px;letter-spacing:.5em;color:rgba(236,231,221,.6)');
  mkLabel('plusLesson', '＋ 如何顶住重压', `font-size:36px;letter-spacing:.12em;${AMB}`);
  mkLabel('heartMt', '心上的山', 'font-size:20px');
  mkLabel('heartKnow', '先修心', `font-size:34px;letter-spacing:.3em;${AMB}`);
  mkLabel('heartKnow2', '再修知识', 'font-size:30px;letter-spacing:.3em');

  // --- text blocks: consecutive lines in one `group` stay stacked ---
  const blocks = [];
  for (const it of items) {
    const last = blocks[blocks.length - 1];
    if (it.group && last && last.group === it.group) last.items.push(it);
    else blocks.push({ group: it.group, section: it.section, items: [it] });
  }
  const sizeOf = (it, inGroup) => {
    const show = LINES[it.i].show.replace(/[[\]]/g, '');
    const longest = Math.max(...show.split('\n').map((s) => [...s].length));
    if (it.section === 'question') return 's-q';
    if (it.group === 'beat' || it.group === 'beat2') return longest <= 12 ? 's-beat' : 's-m';
    if (it.group === 'formula') return 's-m';
    if (inGroup) return 's-g';
    if (it.section === 'go') return 's-xl';
    if (longest <= 7) return 's-xl';
    if (longest <= 12) return 's-l';
    return 's-m';
  };
  blocks.forEach((b, k) => {
    b.el = document.createElement('div');
    b.el.className = 'blk';
    b.el.style.top = `${TEXT_Y[b.section]}px`;
    if (b.section === 'question') {
      b.tag = document.createElement('div');
      b.tag.className = 'tag';
      b.tag.textContent = SOURCE.tag;
      b.el.append(b.tag);
    }
    b.lines = b.items.map((it) => {
      const ln = makeLine(LINES[it.i].show, sizeOf(it, b.items.length > 1 && b.group === 'brave'));
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
  card.append(logo, rule, srcTitle, srcUrl);
  content.append(card);

  // ================= illustrations =================
  // Each gets (t, run, A) where A is the run's fade-in/out alpha.
  const ARTS = {};

  // Lone figure, far from a cold, distant school gate.
  ARTS.question = (t, run, A) => {
    const gy = 920;
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.18); ctx.lineWidth = 1;
    lineP(ctx, 120, gy, 1800, gy, easeOut(ramp(t, 0.3, 2.5)));
    softGlow(ctx, 1320, gy - 120, 260, 0.06, '150,170,210');
    drawGate(ctx, 1320, gy, 0.55, smooth(ramp(t, 0.8, 2.4)), 0, easeOut(ramp(t, 0.8, 2.8)));
    const tremble = Math.sin(t * 23) * 0.8 + Math.sin(t * 31) * 0.6;
    drawPerson(ctx, 560 + tremble, gy, 150, { alpha: smooth(ramp(t, 0.5, 1.8)), bow: 0.6 });
    ctx.restore();
    lbl('gateSign', 1320, gy - 330 * 0.55 - 30 * 0.55 - 14, A * smooth(ramp(t, 2, 3)));
  };

  // Yesterday's you and today's you; the others fade away.
  ARTS.self = (t, run, A) => {
    const it = run.items[0];
    const gy = 880;
    const cmp = smooth(ramp(t, it.start + it.duration * 0.45, it.start + it.duration * 0.75));
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.18); ctx.lineWidth = 1;
    lineP(ctx, 160, gy, 1760, gy, 1);
    const othersA = 0.45 * (1 - cmp);
    [1380, 1500, 1610, 1720].forEach((x, k) => {
      drawPerson(ctx, x + (t - it.start) * 40, gy, 120 + (k % 2) * 14, { walk: 1, phase: t * 6 + k, alpha: othersA, color: cream(0.5) });
    });
    const p = smooth(ramp(t, it.start + 0.2, it.start + 1.4));
    drawPerson(ctx, 800, gy, 170, { alpha: 0.24 * p, color: cream(0.6) });
    const step = easeOut(ramp(t, it.start + it.duration * 0.55, it.start + it.duration * 0.95));
    softGlow(ctx, lerp(800, 980, step), gy - 60, 180, 0.18 * p * cmp);
    drawPerson(ctx, lerp(800, 980, step), gy, 170, { alpha: p, walk: Math.sin(step * Math.PI), phase: step * 6 });
    ctx.restore();
    lbl('others', 1550 + (t - it.start) * 40, gy + 40, A * othersA * 1.4);
    lbl('yesterday', 800, gy + 42, A * p * 0.8);
    lbl('today', lerp(800, 980, step), gy + 42, A * cmp * smooth(ramp(step, 0.4, 0.9)));
  };

  // Three small acts of courage, each one applauded.
  const BRAVE_X = [480, 960, 1440];
  function braveIcon(k, x, y, lit) {
    ctx.save();
    ctx.strokeStyle = lit > 0 ? mixHex('#5a5852', C.em, lit) : '#5a5852';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (k === 0) {
      ctx.strokeRect(x - 70, y - 110, 18, 110); ctx.strokeRect(x + 52, y - 110, 18, 110);
      ctx.strokeRect(x - 86, y - 128, 172, 16);
      lineP(ctx, x - 100, y, x + 100, y, 1);
      drawPerson(ctx, x - 8, y, 62, { color: ctx.strokeStyle });
    } else if (k === 1) {
      ctx.strokeRect(x - 80, y - 150, 160, 70);               // blackboard
      ctx.beginPath(); ctx.moveTo(x - 70, y - 52); ctx.lineTo(x + 70, y - 52); ctx.stroke(); // desk top
      lineP(ctx, x - 60, y - 52, x - 60, y, 1); lineP(ctx, x + 60, y - 52, x + 60, y, 1);
      lineP(ctx, x - 100, y, x + 100, y, 1);
      ctx.beginPath(); ctx.arc(x, y - 72, 8, 0, TAU); ctx.fill();           // a head at the desk
      lineP(ctx, x, y - 64, x, y - 52, 1);
    } else {
      drawPerson(ctx, x + 40, y, 110, { color: ctx.strokeStyle });
      drawPerson(ctx, x - 40, y, 78, { color: ctx.strokeStyle, armUp: lit, dir: 1 });
      lineP(ctx, x - 100, y, x + 100, y, 1);
    }
    ctx.restore();
  }
  ARTS.brave = (t, run, A) => {
    const y = 760;
    ctx.save(); ctx.globalAlpha = A;
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = amber(0.45); ctx.lineWidth = 2;
    run.items.forEach((it, k) => {
      const hit = it.start + it.duration * 0.62;
      const lit = smooth(ramp(t, hit, hit + 0.5));
      if (k > 0) {
        const pk = easeOut(ramp(t, it.start - 0.4, it.start + 0.8));
        lineP(ctx, BRAVE_X[k - 1] + 120, y - 50, BRAVE_X[k] - 120, y - 50, pk);
      }
      ctx.setLineDash([]);
      const appear = smooth(ramp(t, run.start - 0.3 + k * 0.25, run.start + 0.8 + k * 0.25));
      ctx.globalAlpha = A * appear;
      softGlow(ctx, BRAVE_X[k], y - 60, 200, 0.16 * lit);
      braveIcon(k, BRAVE_X[k], y, lit);
      burst(ctx, BRAVE_X[k], y - 70, t, hit, { seed: 11 + k, n: 30, radius: 160 });
      lbl(`b${k + 1}`, BRAVE_X[k], y + 46, A * appear * lerp(0.5, 1, lit), lit > 0.5 ? '' : '');
      labels.get(`b${k + 1}`).style.color = lit > 0.5 ? C.em : C.dim;
      ctx.globalAlpha = A;
      ctx.setLineDash([4, 10]);
    });
    ctx.restore();
  };

  // A point on the ground; the label "起点" floats away.
  ARTS.start = (t, run, A) => {
    const it = run.items[0];
    const gy = 820, x = 960;
    const gone = smooth(ramp(t, it.start + it.duration * 0.55, it.start + it.duration * 0.95));
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.2); ctx.lineWidth = 1;
    lineP(ctx, 200, gy, 1720, gy, 1);
    drawOrb(ctx, x, gy, 12, 0.9);
    ctx.setLineDash([6, 12]);
    ctx.strokeStyle = amber(0.6);
    ctx.lineWidth = 2;
    const fp = easeOut(ramp(t, it.start + it.duration * 0.7, run.end - 0.3));
    ctx.beginPath(); ctx.moveTo(x + 20, gy - 6);
    for (let k = 1; k <= 40 * fp; k++) { const u = k / 40; ctx.lineTo(x + 20 + u * 700, gy - 6 - u * u * 260); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    lbl('startLbl', x, gy - 50 - gone * 70, A * (1 - gone * 0.95), `scale(${1 + gone * 0.3})`);
    labels.get('startLbl').style.filter = `blur(${gone * 12}px)`;
  };

  // Footprints, left then right, in a steady rhythm.
  ARTS.walk = (t, run, A) => {
    const t0 = run.start + 0.15, beat = 0.6, gy = 800, spacing = 120;
    const n = Math.max(0, Math.floor((t - t0) / beat) + 1);
    const pan = Math.max(0, (n - 11) * spacing) + (n > 11 ? easeOut(((t - t0) % beat) / 0.35) * spacing - spacing : 0);
    ctx.save(); ctx.globalAlpha = A;
    for (let k = Math.max(0, n - 16); k < n; k++) {
      const tk = t0 + k * beat;
      const p = easeOut(ramp(t, tk, tk + 0.25));
      const age = n - 1 - k;
      const left = k % 2 === 0;
      const x = 260 + k * spacing - pan, y = gy + (left ? -26 : 26);
      const a = p * lerp(1, 0.12, clamp(age / 12));
      if (age === 0) softGlow(ctx, x, y, 70, 0.25 * (1 - ramp(t, tk, tk + beat)));
      drawFoot(ctx, x, y, 1.05 + (1 - p) * 0.4, a * 0.9, left);
      if (age === 0) lbl(left ? 'footL' : 'footR', x, y + (left ? -48 : 52), A * p * (1 - ramp(t, tk + 0.3, tk + beat)));
    }
    ctx.restore();
  };

  // A dot climbs tiny steps, slips, rests, and goes on.
  ARTS.stairs = (t, run, A) => {
    const N = 24, W = 50, H = 14, x0 = 360, y0 = 900;
    const [i0, , i2] = run.items;
    const t0 = i0.start + 0.3, rate = 1.5;
    const p0 = i2.start + i2.duration * 0.35, p1 = p0 + 1.9;
    const active = (Math.min(t, i2.start) - t0) + Math.max(0, Math.min(t, p0) - i2.start - 0.9) + Math.max(0, t - p1);
    const slip = smooth(ramp(t, i2.start + 0.1, i2.start + 0.8));
    const c = clamp(Math.max(0, active) * rate - slip * 1.0, 0, N - 1.01);
    const k = Math.floor(c), f = c - k;
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.55); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 - 120, y0);
    const shown = Math.min(N, k + 4);
    for (let j = 0; j < shown; j++) {
      const a = j <= k + 1 ? 1 : 1 - (j - k - 1) / 3;
      ctx.lineTo(x0 + j * W, y0 - j * H);
      ctx.lineTo(x0 + j * W, y0 - (j + 1) * H);
      ctx.lineTo(x0 + (j + 1) * W, y0 - (j + 1) * H);
      if (a < 1) { ctx.stroke(); ctx.strokeStyle = cream(0.55 * a); ctx.beginPath(); ctx.moveTo(x0 + (j + 1) * W, y0 - (j + 1) * H); }
    }
    ctx.stroke();
    const x = x0 + (k + f) * W + W * 0.5 - W;
    const y = y0 - (k + smooth(f)) * H - Math.sin(Math.PI * f) * 10 - 14;
    const resting = ramp(t, p0, p0 + 0.3) * (1 - ramp(t, p1 - 0.3, p1));
    const breathe = 1 + resting * 0.25 * Math.sin((t - p0) * 3.2);
    drawOrb(ctx, x + W, y, 11 * breathe, 0.95);
    ctx.restore();
    lbl('rest', x + W, y - 56, A * resting);
  };

  // 1+1+1+1 versus 1.01 × 1.01 × …: the curve overtakes, then leaves the frame.
  const O = [300, 950], XR = 1640;
  const gx = (n) => O[0] + (n / 520) * (XR - O[0]);
  ARTS.graph = (t, run, A) => {
    const [iSecret, iLin, iExp, iHabit, iTen, iLimit] = run.items;
    const axes = easeOut(ramp(t, iSecret.start + 0.2, iSecret.start + 2));
    const linP = easeOut(ramp(t, iLin.start, iLin.start + iLin.duration + 0.3));
    const expP = ramp(t, iExp.start, iExp.start + iExp.duration + 1.2);
    const scale = 3 * lerp(1, 7, easeIn(ramp(t, iTen.start + iTen.duration * 0.6, iLimit.start + iLimit.duration)));
    const yLin = (n) => O[1] - n * 0.42;
    const yExp = (n) => O[1] - (1.01 ** n - 1) * scale;
    ctx.save(); ctx.globalAlpha = A;
    // axes
    ctx.strokeStyle = cream(0.35); ctx.lineWidth = 1.5;
    lineP(ctx, O[0], O[1], XR + 40, O[1], axes);
    lineP(ctx, O[0], O[1], O[0], 330, axes);
    // linear
    ctx.strokeStyle = cream(0.55); ctx.lineWidth = 2.5;
    lineP(ctx, O[0], yLin(0), gx(520), yLin(520), linP);
    // exponential
    if (expP > 0) {
      const nEnd = 520 * expP;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, width, O[1] + 2); ctx.clip();
      ctx.strokeStyle = amber(0.95); ctx.lineWidth = 3.5;
      ctx.shadowColor = amber(0.8); ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(gx(0), yExp(0));
      for (let n = 0; n <= nEnd; n += 2) ctx.lineTo(gx(n), yExp(n));
      ctx.stroke();
      ctx.restore();
      const tipY = yExp(nEnd);
      if (tipY > -40) drawOrb(ctx, gx(nEnd), tipY, 9, 0.9);
      // every 1.01 applauded
      for (let j = 1; j <= 9; j++) {
        const n = j * 52;
        const tj = iHabit.start + 0.3 + j * (iHabit.duration / 10);
        if (n <= nEnd && yExp(n) > 20) burst(ctx, gx(n), yExp(n), t, tj, { seed: 40 + j, n: 12, radius: 50, life: 1.0 });
      }
      // escape streak
      const esc = ramp(t, iLimit.start - 0.5, iLimit.start + iLimit.duration);
      if (esc > 0) softGlow(ctx, gx(520), 0, 300, 0.25 * Math.sin(Math.PI * clamp(esc)) + 0.12 * esc);
    }
    // ten-year bracket
    const ten = smooth(ramp(t, iTen.start + 0.4, iTen.start + 1.4));
    if (ten > 0) {
      ctx.strokeStyle = cream(0.4 * ten); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(O[0], O[1] + 18); ctx.lineTo(O[0], O[1] + 28); ctx.lineTo(gx(520), O[1] + 28); ctx.lineTo(gx(520), O[1] + 18); ctx.stroke();
    }
    ctx.restore();
    lbl('linLbl', gx(520) - 10, yLin(520) + 40, A * smooth(ramp(t, iLin.start + 1, iLin.start + 2)) * (1 - 0.5 * ten));
    const nEnd = 520 * expP;
    lbl('expLbl', clamp(gx(nEnd) - 170, 500, 1500), Math.max(60, yExp(nEnd) - 40), A * smooth(ramp(t, iExp.start + 1, iExp.start + 2)) * (1 - smooth(ramp(t, iTen.start + iTen.duration * 0.7, iTen.start + iTen.duration))));
    lbl('tenYears', (O[0] + gx(520)) / 2, O[1] + 58, A * ten);
  };

  // A life line: started at 12, with decade after decade ahead.
  ARTS.late = (t, run, A) => {
    const [iAge, iDecades] = run.items;
    const y = 760;
    const pan = 70 * Math.max(0, t - iDecades.start);
    const draw = easeOut(ramp(t, iAge.start, iAge.start + 2.5));
    ctx.save(); ctx.globalAlpha = A;
    const g = ctx.createLinearGradient(0, 0, width, 0);
    g.addColorStop(0, cream(0.5)); g.addColorStop(0.75, cream(0.4)); g.addColorStop(1, cream(0));
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    lineP(ctx, 300 - pan, y, width + 40, y, draw);
    for (let k = 1; k <= 7; k++) {
      const x = 300 + k * 300 - pan;
      const a = smooth(ramp(t, iDecades.start + 0.2 + k * 0.35, iDecades.start + 0.8 + k * 0.35)) * clamp(1.2 - (x - 300) / 1700);
      ctx.strokeStyle = cream(0.5 * a);
      lineP(ctx, x, y - 12, x, y + 12, 1);
      lbl(`dec${k}`, x - 150, y - 34, A * a * 0.85);
    }
    const you = 300 - pan + 260 * easeOut(ramp(t, iAge.start + 1, run.end));
    drawOrb(ctx, Math.max(you, 120), y, 12, smooth(ramp(t, iAge.start + 0.5, iAge.start + 1.5)));
    ctx.restore();
    lbl('age12', 300 - pan, y + 44, A * smooth(ramp(t, iAge.start + 1.5, iAge.start + 2.5)));
  };

  // 520 weeks fill in; ×1.01 each week reaches ×176.
  ARTS.weeks = (t, run, A) => {
    const [iW, i176] = run.items;
    const cols = 52, rows = 10, sx = 20, sy = 30, x0 = 960 - (cols - 1) * sx / 2, y0 = 395;
    const fill = ramp(t, iW.start + 1.2, iW.start + iW.duration * 0.95);
    const n = Math.floor(easeIn(fill) * 520);
    const pulse = Math.exp(-3 * Math.max(0, t - i176.start)) * (t > i176.start ? 1 : 0);
    ctx.save(); ctx.globalAlpha = A;
    for (let k = 0; k < 520; k++) {
      const r = Math.floor(k / cols), c = k % cols;
      const x = x0 + c * sx, y = y0 + r * sy;
      const on = k < n;
      const v = 1.01 ** k / 176;
      ctx.fillStyle = on ? `rgba(${Math.round(lerp(200, 255, v))},${Math.round(lerp(170, 215, v))},${Math.round(lerp(120, 150, v))},${(0.45 + 0.55 * v).toFixed(3)})` : cream(0.1);
      ctx.beginPath(); ctx.arc(x, y, on ? 3.3 + 2.2 * v : 2.2, 0, TAU); ctx.fill();
    }
    if (n >= 520) softGlow(ctx, 960, y0 + 4.5 * sy, 600, 0.12 + 0.2 * pulse);
    ctx.restore();
    const v = 1.01 ** n;
    const appear = smooth(ramp(t, iW.start + 0.6, iW.start + 1.4));
    lbl('yr1', x0 - 60, y0, A * appear * 0.8);
    lbl('yr10', x0 - 66, y0 + 9 * sy, A * appear * 0.8);
    lbl('wk', 960, y0 + 10 * sy + 12, A * appear * 0.7);
    const counter = labels.get('counter');
    counter.textContent = `× ${n >= 520 ? '176' : v < 10 ? v.toFixed(2) : v.toFixed(1)}`;
    lbl('counter', 960, 860, A * appear, `scale(${1 + 0.35 * pulse})`);
    labels.get('counter').style.textShadow = `0 0 ${20 + 40 * pulse}px rgba(224,182,124,${0.3 + 0.5 * pulse})`;
    const wl = labels.get('weekLbl');
    wl.textContent = `第 ${n} 周`;
    lbl('weekLbl', 960, 762, A * appear * (1 - smooth(ramp(t, i176.start - 0.2, i176.start + 0.4))) * 0.8);
  };

  // Out of the abyss; then turning back with a lantern for the others.
  const P0 = [380, 1100], P1 = [1500, 1000], P2 = [420, 640], P3 = [1500, 480];
  const ABYSS = (() => {
    const rnd = mulberry32(99), out = [];
    for (let k = 0; k < 16; k++) out.push({ x: 160 + rnd() * 900, y: 960 + rnd() * 100, d: rnd() * 0.8, ph: rnd() * 6 });
    return out;
  })();
  ARTS.dark = (t, run, A) => {
    const [iOut, iGuide, iSelf] = run.items;
    const climb = easeOut(ramp(t, iOut.start + 0.5, iOut.start + iOut.duration + 0.5));
    const turn = smooth(ramp(t, iGuide.start + iGuide.duration * 0.15, iGuide.start + iGuide.duration * 0.45));
    const focus = smooth(ramp(t, iSelf.start, iSelf.start + 0.8));
    ctx.save(); ctx.globalAlpha = A;
    // the dark below
    const g = ctx.createLinearGradient(0, 560, 0, height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g; ctx.fillRect(0, 560, width, height - 560);
    // exit light
    softGlow(ctx, P3[0] + 60, P3[1] - 30, 420, 0.1 + 0.2 * climb);
    // path
    ctx.setLineDash([2, 12]); ctx.lineCap = 'round';
    ctx.strokeStyle = cream(0.25); ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let k = 0; k <= 80; k++) { const p = bez(P0, P1, P2, P3, k / 80); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
    ctx.strokeStyle = amber(0.75); ctx.lineWidth = 3;
    ctx.beginPath();
    const lit = Math.max(climb, turn);
    for (let k = 0; k <= 80 * lit; k++) { const p = bez(P0, P1, P2, P3, k / 80); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
    ctx.setLineDash([]);
    // the ones still below
    for (const o of ABYSS) {
      const wake = smooth(ramp(turn, o.d * 0.6, o.d * 0.6 + 0.4));
      const a = (0.12 + 0.55 * wake) * (1 - 0.4 * focus) * (0.85 + 0.15 * Math.sin(t * 2 + o.ph));
      const drift = wake * 0.35 * smooth(ramp(t, iGuide.start + 2, run.end));
      drawOrb(ctx, lerp(o.x, P0[0] + 40, drift), lerp(o.y, 1040, drift), 4 + wake * 2, a, wake);
    }
    // the lantern: you
    const [lx, ly] = bez(P0, P1, P2, P3, climb);
    if (turn > 0) {
      const ring = ((t - iGuide.start) % 2.2) / 2.2;
      ctx.strokeStyle = amber(0.35 * turn * (1 - ring) * (1 - focus));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lx, ly, 30 + ring * 700, 0, TAU); ctx.stroke();
    }
    drawOrb(ctx, lx, ly, 15 * (1 + 0.25 * focus * Math.sin((t - iSelf.start) * 4) ** 2), smooth(ramp(t, iOut.start, iOut.start + 0.8)));
    ctx.restore();
  };

  // Canyon cross-section: from the gorge up to the plain, with others following.
  const TERRAIN = [[0, 700], [180, 700], [260, 880], [330, 1000], [600, 1012], [760, 960], [860, 800], [905, 700], [1260, 700], [1530, 380], [1800, 700], [1920, 700]];
  const TRAIL = [[440, 1006], [700, 990], [640, 950], [790, 900], [740, 850], [860, 790], [905, 702], [1040, 700]];
  ARTS.canyon = (t, run, A) => {
    const [iWalk, iLater] = run.items;
    const draw = easeOut(ramp(t, iWalk.start - 0.3, iWalk.start + 2));
    const climb = smooth(ramp(t, iWalk.start + iWalk.duration * 0.45, iWalk.start + iWalk.duration + 0.4));
    const later = ramp(t, iLater.start + 0.3, run.end);
    ctx.save(); ctx.globalAlpha = A;
    ctx.beginPath();
    TERRAIN.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(1920, 1080); ctx.lineTo(0, 1080); ctx.closePath();
    ctx.fillStyle = 'rgba(5,5,8,0.9)'; ctx.fill();
    ctx.strokeStyle = cream(0.55); ctx.lineWidth = 2;
    strokePoly(ctx, TERRAIN, draw);
    // others on their mountain
    const top = smooth(ramp(t, iWalk.start + 0.8, iWalk.start + 1.8));
    drawPerson(ctx, 1530, 380, 46, { alpha: 0.45 * top, color: cream(0.6) });
    // your trail
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = amber(0.3); ctx.lineWidth = 2;
    strokePoly(ctx, TRAIL, draw);
    ctx.setLineDash([]);
    ctx.strokeStyle = amber(0.9); ctx.lineWidth = 3;
    ctx.shadowColor = amber(0.8); ctx.shadowBlur = 10 + 10 * later;
    strokePoly(ctx, TRAIL, climb);
    ctx.shadowBlur = 0;
    const [yx, yy] = polyAt(TRAIL, climb);
    drawOrb(ctx, yx, yy - 10, 11, smooth(ramp(t, iWalk.start + 0.5, iWalk.start + 1.5)));
    // those who come after
    for (let k = 0; k < 9; k++) {
      const p = clamp(later * 1.6 - k * 0.12);
      if (p <= 0) continue;
      const [x, y] = polyAt(TRAIL, p * 0.85);
      drawOrb(ctx, x, y - 8, 5, smooth(ramp(p, 0, 0.15)) * 0.75, 0.8);
    }
    ctx.restore();
    lbl('canyon', 470, 1050, A * draw * 0.9);
    lbl('plain', 1090, 670, A * draw * 0.9);
    lbl('peak', 1530, 300, A * top * 0.7);
    lbl('you', yx, yy - 52, A * smooth(ramp(t, iWalk.start + 0.8, iWalk.start + 1.6)));
    lbl('later', 520, 945, A * smooth(ramp(t, iLater.start + 1, iLater.start + 2)));
  };

  // Same equation, very different weight.
  ARTS.redox = (t, run, A) => {
    const [iDiff, iPlus] = run.items;
    const cy = 800, L = 600, R = 1320, w = 560, h = 160;
    const cards = smooth(ramp(t, iDiff.start, iDiff.start + 1));
    const press = easeIn(ramp(t, iDiff.start + iDiff.duration * 0.55, iDiff.start + iDiff.duration * 0.8));
    const settle = Math.exp(-6 * Math.max(0, t - (iDiff.start + iDiff.duration * 0.8)));
    const sink = press * 8 + (press >= 1 ? Math.sin((t - iDiff.start) * 30) * 3 * settle : 0);
    const plus = smooth(ramp(t, iPlus.start + iPlus.duration * 0.5, iPlus.start + iPlus.duration * 0.5 + 0.8));
    ctx.save(); ctx.globalAlpha = A * cards;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = cream(0.35);
    ctx.strokeRect(L - w / 2, cy - h / 2, w, h);
    softGlow(ctx, R, cy + sink, 420, 0.18 * plus);
    ctx.strokeStyle = plus > 0 ? mixHex('#8a877f', C.em, plus) : '#8a877f';
    ctx.strokeRect(R - w / 2, cy - h / 2 + sink, w, h);
    // the weight
    const wy = lerp(560, cy - h / 2 + sink - 2, press);
    if (press > 0) {
      drawMountain(ctx, R, wy, 400, 190, { alpha: smooth(ramp(press, 0, 0.4)) });
    }
    ctx.restore();
    lbl('taCard', L, cy + h / 2 + 40, A * cards * 0.8);
    lbl('youCard', R, cy + h / 2 + sink + 40, A * cards);
    lbl('eq1', L, cy, A * cards * 0.85);
    lbl('eq2', R, cy + sink, A * cards);
    lbl('pressure', R, wy - 70, A * press * 0.8);
    lbl('plusLesson', R, cy + h / 2 + 105, A * plus, `translateY(${(1 - plus) * 12}px)`);
  };

  // Walking through the school gate is the hero's act; the weight on the heart.
  ARTS.gate = (t, run, A) => {
    const [iHero, , iHeart] = run.items;
    const gy = 950;
    const walkP = smooth(ramp(t, iHero.start + 0.3, iHero.start + iHero.duration * 0.9));
    const arrive = iHero.start + iHero.duration * 0.9;
    const lit = smooth(ramp(t, arrive - 0.3, arrive + 0.6));
    const x = lerp(560, 960, walkP);
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.18); ctx.lineWidth = 1;
    lineP(ctx, 160, gy, 1760, gy, 1);
    drawGate(ctx, 960, gy, 0.85, 1, lit);
    const moving = walkP > 0 && walkP < 1 ? 1 : 0;
    drawPerson(ctx, x, gy, 160, { walk: moving * Math.sin(Math.PI * walkP) ** 0.3, phase: walkP * 16 });
    burst(ctx, 960, gy - 180, t, arrive, { seed: 77, n: 36, radius: 220, life: 1.8 });
    // the mountain on the heart
    const mt = smooth(ramp(t, iHeart.start + 0.2, iHeart.start + 1.2));
    const known = smooth(ramp(t, iHeart.start + iHeart.duration * 0.5, iHeart.start + iHeart.duration * 0.5 + 1));
    if (mt > 0) {
      softGlow(ctx, x, gy - 110, 200, 0.3 * known);
      drawMountain(ctx, x, gy - 98, 70, 46, { alpha: mt, glow: known });
    }
    ctx.restore();
    lbl('gateSign', 960, gy - 330 * 0.85 - 84 * 0.85 + 29 * 0.85, A);
    lbl('heartMt', x + 110, gy - 120, A * mt * (1 - known) * 0.8);
  };

  // Carrying the whole mountain, at your own pace.
  const STREAKS = (() => { const rnd = mulberry32(5), o = []; for (let k = 0; k < 7; k++) o.push({ d: rnd() * 1.6, y: 860 + rnd() * 60, l: 80 + rnd() * 120 }); return o; })();
  ARTS.mountain = (t, run, A) => {
    const [iDont, iCarry, iOthers] = run.items;
    const gy = 920, x = 960, h = 170;
    const carryGlow = smooth(ramp(t, iCarry.start + iCarry.duration * 0.62, iCarry.start + iCarry.duration * 0.62 + 0.8));
    ctx.save(); ctx.globalAlpha = A;
    ctx.strokeStyle = cream(0.22); ctx.lineWidth = 1;
    lineP(ctx, 120, gy, 1800, gy, 1);
    for (let k = -1; k < 18; k++) {
      const mx = ((k * 110 - (t - run.start) * 26) % 1980 + 1980) % 1980 - 30;
      lineP(ctx, mx, gy + 10, mx + 18, gy + 10, 1);
    }
    // others rushing past
    const rush = ramp(t, iCarry.start, iCarry.start + 2.6);
    if (rush > 0 && rush < 1) {
      for (const s of STREAKS) {
        const p = clamp((rush - s.d * 0.35) * 1.8);
        if (p <= 0 || p >= 1) continue;
        const sx = lerp(-200, 2100, p);
        const g = ctx.createLinearGradient(sx - s.l, 0, sx, 0);
        g.addColorStop(0, cream(0)); g.addColorStop(1, cream(0.45));
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        lineP(ctx, sx - s.l, s.y, sx, s.y, 1);
      }
    }
    // others who carry their mountains
    const oth = smooth(ramp(t, iOthers.start + 0.3, iOthers.start + 1.6));
    const link = easeOut(ramp(t, iOthers.start + iOthers.duration * 0.55, iOthers.start + iOthers.duration * 0.55 + 1.2));
    for (const [ox, oh] of [[340, 80], [1600, 70]]) {
      ctx.save(); ctx.globalAlpha = A * oth * 0.55;
      drawPerson(ctx, ox, gy, oh, { walk: 0.6, phase: (t - run.start) * 2.6 + ox, color: cream(0.7), armUp: 0.95 });
      drawMountain(ctx, ox, gy - oh * 1.08, oh * 2.6, oh * 1.9, {});
      ctx.restore();
      if (link > 0) {
        ctx.setLineDash([3, 10]);
        ctx.strokeStyle = amber(0.55 * oth); ctx.lineWidth = 2;
        lineP(ctx, x + (ox < x ? -150 : 150), gy - 120, ox + (ox < x ? 70 : -70), gy - oh * 1.3, link);
        ctx.setLineDash([]);
      }
    }
    // you
    drawPerson(ctx, x, gy, h, { walk: 0.55, phase: (t - run.start) * 2.6, bow: 0.15, armUp: 0.95 });
    drawMountain(ctx, x + 6, gy - h * 1.08, 440, 330, { glow: carryGlow });
    ctx.restore();
  };

  // Heart first: a warm pulse that grows.
  ARTS.heart = (t, run, A) => {
    const [iNot, iFirst, iStep, iFear] = run.items;
    const grow = lerp(0.5, 1.2, smooth(ramp(t, run.start, run.end)));
    const beat = (tt) => { const ph = ((tt % 1.15) + 1.15) % 1.15; return Math.exp(-(((ph - 0.1) / 0.07) ** 2)) + 0.6 * Math.exp(-(((ph - 0.32) / 0.08) ** 2)); };
    const b = beat(t - run.start);
    const warm = smooth(ramp(t, iFear.start, iFear.start + 1.5));
    ctx.save(); ctx.globalAlpha = A;
    softGlow(ctx, 960, 520, 380 * grow * (1 + 0.05 * b), 0.16 + 0.08 * b + 0.12 * warm);
    softGlow(ctx, 960, 520, 140 * grow, 0.08 + 0.06 * b, '255,226,170');
    ctx.restore();
    const kn = smooth(ramp(t, iFirst.start + iFirst.duration * 0.4, iFirst.start + iFirst.duration * 0.4 + 0.8)) * (1 - smooth(ramp(t, iStep.start - 0.3, iStep.start + 0.3)));
    const kn2 = smooth(ramp(t, iFirst.start + iFirst.duration * 0.75, iFirst.start + iFirst.duration * 0.75 + 0.8)) * (1 - smooth(ramp(t, iStep.start - 0.3, iStep.start + 0.3)));
    lbl('heartKnow', 820, 700, A * kn);
    lbl('heartKnow2', 1100, 700, A * kn2 * 0.75);
    void iNot;
  };

  // A road toward dawn; companions' lights along the way; then setting off.
  const LAMPS = (() => { const rnd = mulberry32(31), o = []; for (let k = 0; k < 26; k++) o.push({ u: 0.08 + rnd() * 0.8, side: rnd() < 0.5 ? -1 : 1, off: 1.08 + rnd() * 0.5, d: rnd(), ph: rnd() * 6 }); return o; })();
  ARTS.dawn = (t, run, A) => {
    const HZ = 700, VP = 960;
    const [iRoad, iAsk, iPal, iUs, iCan, iGo] = run.items;
    const rise = smooth(ramp(t, run.start, END));
    const roadY = (u) => HZ + (1080 - HZ) * u * u;
    const roadHalf = (u) => 12 + 560 * u * u;
    ctx.save(); ctx.globalAlpha = A;
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, HZ);
    sky.addColorStop(0, 'rgba(30,36,60,0)');
    sky.addColorStop(0.6, `rgba(70,60,80,${0.18 * rise})`);
    sky.addColorStop(1, `rgba(240,170,110,${0.1 + 0.4 * rise})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, HZ);
    // sun
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, width, HZ); ctx.clip();
    const sunY = HZ + 90 - 170 * rise;
    softGlow(ctx, VP, sunY, 520, 0.2 + 0.35 * rise, '245,190,120');
    ctx.fillStyle = `rgba(255,224,170,${0.55 + 0.4 * rise})`;
    ctx.beginPath(); ctx.arc(VP, sunY, 70, 0, TAU); ctx.fill();
    ctx.restore();
    // land
    ctx.fillStyle = 'rgba(7,7,10,1)';
    ctx.fillRect(0, HZ, width, height - HZ);
    ctx.strokeStyle = amber(0.35 + 0.3 * rise); ctx.lineWidth = 1.5;
    lineP(ctx, 0, HZ, width, HZ, 1);
    // road
    ctx.beginPath();
    ctx.moveTo(VP - roadHalf(0), HZ); ctx.lineTo(VP + roadHalf(0), HZ);
    ctx.lineTo(VP + roadHalf(1), 1080); ctx.lineTo(VP - roadHalf(1), 1080); ctx.closePath();
    const rg = ctx.createLinearGradient(0, HZ, 0, 1080);
    rg.addColorStop(0, `rgba(245,200,140,${0.25 + 0.2 * rise})`); rg.addColorStop(1, 'rgba(224,182,124,0.04)');
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = cream(0.35); ctx.lineWidth = 1.5;
    lineP(ctx, VP - roadHalf(0), HZ, VP - roadHalf(1), 1080, 1);
    lineP(ctx, VP + roadHalf(0), HZ, VP + roadHalf(1), 1080, 1);
    // centre dashes flowing toward the horizon
    for (let k = 0; k < 9; k++) {
      const u0 = 1 - (((k / 9) + (t - run.start) * 0.05) % 1);
      const u1 = u0 - 0.035;
      if (u1 <= 0.02) continue;
      ctx.strokeStyle = amber(0.5 * u0); ctx.lineWidth = 1 + 5 * u0 * u0;
      lineP(ctx, VP, roadY(u0), VP, roadY(u1), 1);
    }
    // companions' lights
    const pal = ramp(t, iPal.start + 0.3, iUs.start + iUs.duration);
    for (const l of LAMPS) {
      const a = smooth(ramp(pal, l.d * 0.8, l.d * 0.8 + 0.2));
      if (a <= 0) continue;
      const x = VP + l.side * roadHalf(l.u) * l.off, y = roadY(l.u) - 6 - 20 * l.u;
      drawOrb(ctx, x, y, 2.5 + 7 * l.u, a * (0.8 + 0.2 * Math.sin(t * 2.3 + l.ph)));
    }
    // you, setting off
    const go = easeIn(ramp(t, iGo.start + 0.3, END + 0.8));
    const u = lerp(0.95, 0.12, go);
    const fy = roadY(u), fh = 40 + 200 * u * u;
    const fa = smooth(ramp(t, iRoad.start + 0.3, iRoad.start + 1.4)) * (1 - smooth(ramp(go, 0.7, 1)));
    drawPerson(ctx, VP, fy, fh, { walk: go > 0 ? 1 : 0, phase: (t - iGo.start) * 7, alpha: fa, color: 'rgba(16,14,16,0.95)' });
    ctx.strokeStyle = amber(0.2 * fa); ctx.lineWidth = 1;
    void iAsk; void iCan;
    ctx.restore();
  };

  // ================= frame =================
  const fadeIO = (t, a, b, inLen = 0.6, outLen = 0.6) => smooth(ramp(t, a, a + inLen)) * (1 - smooth(ramp(t, b - outLen, b - 0.05)));
  let fontsReady = document.fonts.ready;

  function drawArt(t, cardOut) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    // dust (warmer and brighter as the story moves toward light)
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
      const cardOut = smooth(ramp(t, timeline.duration - 0.9, timeline.duration - 0.1));
      for (const el of labels.values()) el.style.opacity = '0';
      used.clear();

      // Ambient light: cold and dim at first, warmer toward the end.
      const warm = smooth(ramp(t, 0, END));
      const gx = 50 + 18 * Math.sin(t * 0.07), gy = 46 + 10 * Math.cos(t * 0.05);
      glow.style.background =
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(224,182,124,${lerp(0.06, 0.16, warm).toFixed(3)}) 0%, rgba(224,182,124,0) 44%),` +
        `radial-gradient(circle at ${100 - gx}% ${100 - gy}%, rgba(90,105,150,${lerp(0.16, 0.05, warm).toFixed(3)}) 0%, rgba(90,105,150,0) 52%)`;
      glow.style.opacity = String(1 - cardOut);
      drawArt(t, cardOut);

      // Text blocks
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
          const big = /s-xl|s-l|s-beat/.test(ln.el.className);
          reveal(ln.chars, t, ln.it.start, ln.it.duration, { dimTo: lerp(1, 0.32, dimP), rise: big ? 12 : 8, blur: big ? 5 : 3 });
        });
      }

      // End card
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
