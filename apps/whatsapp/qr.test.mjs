// Self-check: a 21x21 QR (version 1) rendered at a non-integer scale must be recovered exactly.
import assert from 'node:assert/strict';
import { extractGrid, renderQR } from './qr.mjs';
const F = ['1111111', '1000001', '1011101', '1011101', '1011101', '1000001', '1111111'];
const n = 21, g = Array.from({ length: n }, () => Array(n).fill(0));
const put = (ox, oy) => F.forEach((r, y) => [...r].forEach((b, x) => g[oy + y][ox + x] = +b));
put(0, 0); put(n - 7, 0); put(0, n - 7);
for (let i = 8; i < n - 8; i++) g[6][i] = g[i][6] = i % 2 === 0 ? 1 : 0;
let seed = 7; for (let y = 9; y < n; y++) for (let x = 9; x < n; x++) g[y][x] = (seed = (seed * 1103515245 + 12345) & 0x7fffffff) & 1;
const w = 79; // 3.76 px per module, like WhatsApp's 228px/61
const dark = (x, y) => !!g[Math.min(n - 1, Math.floor(y / (w / n)))][Math.min(n - 1, Math.floor(x / (w / n)))];
const rows = extractGrid(dark, w);
assert.deepEqual(rows, g.map(r => r.join('')));
assert.equal(renderQR(rows).split('\n').length - 1, Math.ceil((n + 4) / 2));
assert.equal(extractGrid(() => false, w), null);
console.log('ok');
