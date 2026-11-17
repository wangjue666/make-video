// Build src/timeline.json and mh.json (duration + audio tracks) from the voice manifest.
// Usage: node tools/timeline.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LINES, LEAD_IN, OUTRO } from '../src/script.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(projectDir, 'assets/voice/manifest.json'), 'utf8'));

let t = LEAD_IN;
const items = LINES.map((line, i) => {
  const m = manifest[i];
  if (!m || m.text !== line.speak) throw new Error(`voice ${i} missing or stale; run tools/tts.mjs`);
  const item = { i, section: line.section, group: line.group ?? null, start: +t.toFixed(3), duration: m.duration, file: m.file };
  t += m.duration + line.gap;
  return item;
});
const duration = Math.ceil((t + OUTRO) * 10) / 10;
const timeline = { duration, endCard: +t.toFixed(3), items };
writeFileSync(path.join(projectDir, 'src/timeline.json'), JSON.stringify(timeline, null, 2) + '\n');

const mhPath = path.join(projectDir, 'mh.json');
const mh = JSON.parse(readFileSync(mhPath, 'utf8'));
mh.duration = duration;
mh.audio = items.map((it) => ({ src: `assets/voice/${it.file}`, start: it.start, duration: it.duration, volume: 0 }));
writeFileSync(mhPath, JSON.stringify(mh, null, 2) + '\n');
console.log(`duration ${duration}s, end card at ${timeline.endCard}s`);
