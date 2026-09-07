#!/usr/bin/env node
// Headless Chrome CDP server for WhatsApp Web + embeddable screencast viewer. Zero deps (Node >= 22).
// Commands: start [--detach] | stop | status | login
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { homedir } from 'node:os';
import path from 'node:path';
import { extractGrid, renderQR, CANVAS_PIXELS } from './qr.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PORT = +(process.env.WA_PORT || 9222);          // Chrome CDP
const VIEW = +(process.env.WA_VIEW_PORT || 9223);     // viewer http
// The linked WhatsApp session lives outside the package, never in the repo.
const PROFILE = path.resolve(process.env.WA_PROFILE || path.join(homedir(), '.dsh/flykit/whatsapp'));
const CHROME = process.env.WA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PIDFILE = path.join(PROFILE, 'wa.pid');
const URL_WA = 'https://web.whatsapp.com/';
// Browser pages allowed to open Chrome's CDP websocket (the viewer). Add the DSH origin via WA_ORIGINS.
const ORIGINS = [`http://127.0.0.1:${VIEW}`, `http://localhost:${VIEW}`, ...(process.env.WA_ORIGINS || '').split(',').filter(Boolean)];
// Phase 1: with "HeadlessChrome" in the UA WhatsApp hides the "Stay logged in on this browser" checkbox.
// A plain Chrome UA makes it appear (checked). Nothing else needed a flag.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const ARGS = ['--headless=new', `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, `--remote-allow-origins=${ORIGINS.join(',')}`,
  `--user-agent=${UA}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,800', URL_WA];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };
const getJSON = url => fetch(url, { signal: AbortSignal.timeout(2000) }).then(r => r.json()).catch(() => null);
const version = () => getJSON(`http://127.0.0.1:${PORT}/json/version`);
const viewerUp = () => getJSON(`http://127.0.0.1:${VIEW}/json/list`);
const portBusy = (port, host) => new Promise(r => { const s = net.connect(port, host); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); });
const anyBusy = async port => (await portBusy(port, '127.0.0.1')) || (await portBusy(port, '::1'));
const pid = () => { try { return +readFileSync(PIDFILE, 'utf8'); } catch { return 0; } };
const alive = p => { try { return p > 0 && process.kill(p, 0); } catch { return false; } };

// --- minimal CDP client (flat sessions) ---
async function cdp() {
  const v = await version(); if (!v) return null;
  const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}, sessionId) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { result: { targetInfos } } = await send('Target.getTargets');
  let t = targetInfos.find(t => t.type === 'page' && t.url.startsWith(URL_WA));
  if (!t) t = { targetId: (await send('Target.createTarget', { url: URL_WA })).result.targetId };
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId); return r.result?.result?.value; };
  const page = (method, params) => send(method, params, sessionId);
  return { ws: v.webSocketDebuggerUrl, send, page, evaluate, close: () => ws.close() };
}

// ready = chat list present | qr = QR canvas present | blocked = unsupported-browser wall | loading = anything else
const STATE = `document.querySelector('#pane-side') ? 'ready' : document.querySelector('canvas') ? 'qr'
  : /works with Google Chrome/.test(document.body.innerText) ? 'blocked' : 'loading'`;

// Viewer server: static viewer.html + /json/list (Chrome's target list, same-origin for the viewer). Localhost only.
function serveViewer() {
  const html = readFileSync(path.join(ROOT, 'viewer.html'));
  return http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/viewer.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(html);
    if (req.url === '/json/list' || req.url === '/json') {
      const list = await getJSON(`http://127.0.0.1:${PORT}/json`);
      return res.writeHead(list ? 200 : 502, { 'content-type': 'application/json' }).end(JSON.stringify(list || { error: 'cdp down' }));
    }
    res.writeHead(404).end();
  }).listen(VIEW, '127.0.0.1');
}

async function start(detach) {
  if (await version()) die(`already running on port ${PORT}`);
  if (await anyBusy(PORT)) die(`port ${PORT} is in use by another process (set WA_PORT)`);
  if (await anyBusy(VIEW)) die(`viewer port ${VIEW} is in use (set WA_VIEW_PORT)`);
  if (alive(pid())) die(`pid ${pid()} still alive with this profile; run: node wa.mjs stop`);
  if (!existsSync(CHROME)) die(`chrome not found at ${CHROME} (set WA_CHROME)`);
  mkdirSync(PROFILE, { recursive: true });
  const log = openSync(path.join(PROFILE, 'chrome.log'), 'a');
  if (detach) { // re-run ourselves in the background; that process owns Chrome + the viewer server
    const child = spawn(process.execPath, [new URL(import.meta.url).pathname, 'start'], { detached: true, stdio: ['ignore', log, log], env: process.env });
    child.unref();
    for (let i = 0; i < 100; i++) { await sleep(200); const v = await version(); if (v && await viewerUp()) return banner(v, child.pid); if (child.exitCode !== null) break; }
    die(`background start failed; see ${PROFILE}/chrome.log`);
  }
  const child = spawn(CHROME, ARGS, { stdio: ['ignore', log, log] });
  writeFileSync(PIDFILE, String(process.pid));
  let v; for (let i = 0; i < 100 && !v; i++) { await sleep(200); v = await version(); if (child.exitCode !== null) break; }
  if (!v) { child.kill(); rmSync(PIDFILE, { force: true }); die(`chrome exited or never opened CDP (exit ${child.exitCode}); see ${PROFILE}/chrome.log`); }
  serveViewer(); banner(v, process.pid);
  const bye = () => { const c = cdp(); c.then(c => c && c.send('Browser.close')); setTimeout(() => child.kill('SIGTERM'), 8000).unref(); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
  child.on('exit', () => { rmSync(PIDFILE, { force: true }); process.exit(0); });
}
const banner = (v, p) => console.log(`${v.Browser} pid ${p}\n${v.webSocketDebuggerUrl}\nviewer http://127.0.0.1:${VIEW}/`);

async function stop() {
  const p = pid(); const c = await cdp();
  if (c) { c.send('Browser.close'); c.close(); } else if (!alive(p)) { rmSync(PIDFILE, { force: true }); return console.log('not running'); }
  for (let i = 0; i < 50 && (alive(p) || await version()); i++) await sleep(200);
  if (alive(p)) { process.kill(p, 'SIGTERM'); for (let i = 0; i < 50 && alive(p); i++) await sleep(200); }
  if (alive(p)) die(`pid ${p} did not exit`);
  rmSync(PIDFILE, { force: true }); console.log('stopped');
}

async function status() {
  const c = await cdp(); if (!c) die(`cdp down (port ${PORT})`, 2);
  const s = await c.evaluate(STATE); c.close();
  const view = (await viewerUp()) ? `viewer http://127.0.0.1:${VIEW}/` : 'viewer down';
  console.log(`${s} ${c.ws} ${view}`); process.exit(s === 'ready' ? 0 : 1);
}

async function login() {
  let c = await cdp();
  if (!c) { await start(true); c = await cdp(); }
  let lastRef = '', idle = 0;
  for (;;) {
    const s = await c.evaluate(STATE);
    if (s === 'ready') { await sleep(3000); console.log(`logged in. server running: ${c.ws}`); c.close(); return; }
    if (s === 'blocked') die('WhatsApp rejected this browser (unsupported-browser wall)');
    if (s === 'qr') {
      idle = 0;
      const ref = await c.evaluate(`document.querySelector('[data-ref]')?.getAttribute('data-ref') || ''`);
      if (ref && ref !== lastRef) {
        lastRef = ref;
        const px = await c.evaluate(CANVAS_PIXELS);
        const rows = px && extractGrid((x, y) => px.dark[y * px.w + x] === 1, px.w);
        const shot = await c.page('Page.captureScreenshot', { format: 'png', clip: px.clip });
        writeFileSync(path.join(PROFILE, 'qr.png'), Buffer.from(shot.result.data, 'base64'));
        console.log(rows ? '\n' + renderQR(rows, !!process.env.WA_QR_INVERT) : '(grid not found)');
        console.log(`scan with WhatsApp > Linked devices. Also live at http://127.0.0.1:${VIEW}/ or ${PROFILE}/qr.png`);
      }
    } else if (++idle > 15) { idle = 0; await c.page('Page.reload'); } // ponytail: expired-QR "click to reload" handled by a plain reload
    await sleep(1000);
  }
}

const cmd = process.argv[2];
if (cmd === 'start') start(process.argv.includes('--detach'));
else if (cmd === 'stop') stop();
else if (cmd === 'status') status();
else if (cmd === 'login') login();
else die('usage: node wa.mjs start [--detach] | stop | status | login');
