// QR canvas -> module grid -> terminal text. Zero deps.
// extractGrid: try every valid QR size, accept the one whose finder + timing patterns match.
export function extractGrid(dark, w) {
  const F = ['1111111', '1000001', '1011101', '1011101', '1011101', '1000001', '1111111'];
  for (let n = 21; n <= 177; n += 4) {
    const mod = w / n, at = (x, y) => dark(Math.floor((x + .5) * mod), Math.floor((y + .5) * mod));
    const finder = (ox, oy) => F.every((row, y) => [...row].every((b, x) => at(ox + x, oy + y) === (b === '1')));
    if (!finder(0, 0) || !finder(n - 7, 0) || !finder(0, n - 7)) continue;
    let timing = true;
    for (let x = 8; x < n - 8; x++) if (at(x, 6) !== (x % 2 === 0)) timing = false;
    if (!timing) continue;
    const rows = [];
    for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) s += at(x, y) ? '1' : '0'; rows.push(s); }
    return rows;
  }
  return null;
}

// Half-block rendering, 2 modules per line, 2-module quiet zone. invert=true prints light-on-dark.
export function renderQR(rows, invert = false) {
  const n = rows[0].length, q = '0'.repeat(n + 4), R = [q, q, ...rows.map(r => '00' + r + '00'), q, q];
  const on = invert ? '0' : '1';
  let out = '';
  for (let y = 0; y < R.length; y += 2) {
    const a = R[y], b = R[y + 1] || q; let line = '';
    for (let x = 0; x < a.length; x++) { const t = a[x] === on, u = b[x] === on; line += t && u ? '█' : t ? '▀' : u ? '▄' : ' '; }
    out += line + '\n';
  }
  return out;
}

// Runs inside the page: returns {w, dark[]} for the first canvas, or null.
export const CANVAS_PIXELS = `(() => {
  const c = document.querySelector('canvas'); if (!c) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, out = [];
  for (let i = 0; i < d.length; i += 4) out.push(d[i] < 128 ? 1 : 0);
  const r = c.getBoundingClientRect();
  return { w: c.width, dark: out, clip: { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 } };
})()`;
