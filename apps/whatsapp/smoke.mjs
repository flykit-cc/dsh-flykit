// End-to-end check: opens viewer.html in a second headless Chrome and verifies frames + click forwarding.
// Needs the server running (node wa.mjs start --detach) and WhatsApp on the QR screen.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
const CHROME = process.env.WA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEW = +(process.env.WA_VIEW_PORT || 9223), PORT = 9250, sleep = ms => new Promise(r => setTimeout(r, ms));
const dir = mkdtempSync(`${tmpdir()}/wa-smoke-`);
const chrome = spawn(CHROME, ['--headless=new', `--user-data-dir=${dir}`, `--remote-debugging-port=${PORT}`, '--no-first-run', '--window-size=1000,700', `http://127.0.0.1:${VIEW}/`], { stdio: 'ignore' });
try {
  let list; for (let i = 0; i < 50 && !list; i++) { await sleep(200); list = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json()).catch(() => null); }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (m, p = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result.result.value;
  await sleep(4000);
  const painted = await ev(`(() => { const c = document.getElementById('c'); if (!c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] < 200) n++; return n; })()`);
  console.log('viewer canvas', await ev(`c.width + 'x' + c.height`), 'dark samples', painted, 'banner:', await ev(`bar.textContent`));
  assert.ok(painted > 50, 'viewer canvas shows frames');
  assert.match(await ev(`bar.textContent`), /Scan this QR/);
  // click "Log in with phone number" through the viewer: find it in the WhatsApp page, map to viewer coords, click
  const wa = (await fetch(`http://127.0.0.1:${VIEW}/json/list`).then(r => r.json())).find(t => t.type === 'page' && t.url.includes('web.whatsapp'));
  const w2 = new WebSocket(wa.webSocketDebuggerUrl); await new Promise(r => w2.onopen = r);
  const p2 = new Map(); w2.onmessage = e => { const m = JSON.parse(e.data); if (p2.has(m.id)) { p2.get(m.id)(m); p2.delete(m.id); } };
  const ev2 = x => new Promise(r => { p2.set(++id, m => r(m.result.result.value)); w2.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: x, returnByValue: true } })); });
  const tgt = await ev2(`(()=>{const a=[...document.querySelectorAll('div[role=button],button,a')].find(e=>/Log in with phone number/i.test(e.innerText)&&e.getBoundingClientRect().x>0);const r=a.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const toViewer = t => ev(`(()=>{const r=c.getBoundingClientRect(),s=Math.min(r.width/c.width,r.height/c.height),ox=(r.width-c.width*s)/2,oy=(r.height-c.height*s)/2;return{x:r.left+ox+${t.x}/(meta.deviceWidth/c.width)*s,y:r.top+oy+${t.y}/(meta.deviceHeight/c.height)*s}})()`);
  const vc = await toViewer(tgt);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: vc.x, y: vc.y, button: 'left', clickCount: 1 });
  await sleep(1500);
  const text = await ev2(`document.body.innerText.replace(/\\s+/g,' ').slice(0,60)`);
  console.log('after click through viewer:', text);
  assert.match(text, /Enter phone number/);
  // click the phone input through the viewer, then type into it
  const inp = await ev2(`(()=>{const i=[...document.querySelectorAll('input')].find(i=>i.type!=='checkbox'&&i.getBoundingClientRect().width>0);const r=i.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const vi = await toViewer(inp);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: vi.x, y: vi.y, button: 'left', clickCount: 1 });
  await sleep(300);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '7', code: 'Digit7', text: '7', unmodifiedText: '7', windowsVirtualKeyCode: 55 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: '7', code: 'Digit7', windowsVirtualKeyCode: 55 });
  await sleep(800);
  const val = await ev2(`document.activeElement.value`); console.log('typed through viewer, input value:', JSON.stringify(val));
  assert.match(val, /7/);
  // put WhatsApp back on the QR screen
  const back = await ev2(`(()=>{const a=[...document.querySelectorAll('div[role=button],button,a')].find(e=>/QR code/i.test(e.innerText)&&e.getBoundingClientRect().x>0);if(!a)return null;a.click();return 1})()`);
  console.log('ok', back ? '(back to QR)' : '');
} finally { chrome.kill(); await sleep(500); rmSync(dir, { recursive: true, force: true }); }
process.exit(0);
