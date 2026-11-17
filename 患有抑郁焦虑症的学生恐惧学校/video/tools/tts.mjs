// Generate per-line narration with mimo-v2.5-tts (voice 茉莉).
// Usage: node tools/tts.mjs [index ...]   (no args = all missing lines)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '..');
// config.js is CommonJS inside a "type": "module" tree; read the key textually.
const configText = readFileSync(path.resolve(projectDir, '../config.js'), 'utf8');
const api_key = process.env.MIMO_API_KEY || configText.match(/api_key\s*:\s*["']([^"']+)["']/)?.[1];
if (!api_key) throw new Error('api_key not found in ../config.js');
const { LINES } = await import('../src/script.js');

const STYLE = '用温暖、真诚、带着鼓励的语气朗读，语速适中偏慢，像一位走过同样路的朋友，在身边轻声地、坚定地对一个害怕的孩子说话。';
const outDir = path.join(projectDir, 'assets/voice');
mkdirSync(outDir, { recursive: true });

function wavDuration(buf) {
  // Walk RIFF chunks to find fmt and data.
  let off = 12, byteRate = 0, dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16);
    if (id === 'data') { dataSize = Math.min(size, buf.length - off - 8); break; }
    off += 8 + size + (size & 1);
  }
  if (!byteRate) throw new Error('bad wav');
  return dataSize / byteRate;
}

async function synth(text) {
  const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': api_key },
    body: JSON.stringify({
      model: 'mimo-v2.5-tts',
      messages: [
        { role: 'user', content: STYLE },
        { role: 'assistant', content: text },
      ],
      audio: { voice: '茉莉', format: 'wav' },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  const json = JSON.parse(body);
  const data = json.choices?.[0]?.message?.audio?.data;
  if (!data) throw new Error('no audio in response: ' + body.slice(0, 500));
  return Buffer.from(data, 'base64');
}

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const only = process.argv.slice(2).map(Number);

const todo = [];
for (let i = 0; i < LINES.length; i++) {
  const file = `${String(i).padStart(2, '0')}.wav`;
  const full = path.join(outDir, file);
  const force = only.includes(i);
  if (only.length && !force) continue;
  if (!force && existsSync(full) && manifest[i]?.text === LINES[i].speak) continue;
  todo.push({ i, file, full });
}
async function worker() {
  for (let job; (job = todo.shift());) {
    const { i, file, full } = job;
    let buf;
    for (let attempt = 1; ; attempt++) {
      try { buf = await synth(LINES[i].speak); break; }
      catch (e) { if (attempt >= 3) throw e; console.warn(i, 'retry', e.message); }
    }
    writeFileSync(full, buf);
    manifest[i] = { file, text: LINES[i].speak, duration: +wavDuration(buf).toFixed(3) };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(i, manifest[i].duration.toFixed(2) + 's', LINES[i].speak);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
