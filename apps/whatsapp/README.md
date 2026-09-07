# apps/whatsapp

Headless Google Chrome running WhatsApp Web, reachable over CDP, with the screencast viewer the flykit
Apps tab embeds. Zero dependencies (Node >= 22 has `fetch` and `WebSocket`). Tested on macOS with Chrome 152 and Node 26.
All commands below run from this directory.

## Setup

```sh
node wa.mjs login          # starts the server if needed, prints the QR in the terminal (also profile/qr.png and the viewer)
```

Scan with WhatsApp > Linked devices > Link a device. The linked session lives in `~/.dsh/flykit/whatsapp/`, outside the package.

## Commands

| command | does |
|---|---|
| `node wa.mjs start` | headless Chrome on port 9222 + viewer on 9223, foreground, Ctrl-C shuts down cleanly |
| `node wa.mjs start --detach` | same, in the background |
| `node wa.mjs status` | prints `ready|qr|loading|blocked <ws url> viewer ...`. Exit 0 only when logged in, 1 otherwise, 2 when CDP is down |
| `node wa.mjs stop` | `Browser.close` over CDP, waits for exit, falls back to SIGTERM |
| `node wa.mjs login` | prints the QR (re-prints when it rotates) until the chat list appears |
| `node qr.test.mjs` | self-check of the QR grid extractor |
| `node smoke.mjs` | end-to-end viewer check (needs `start --detach` and the QR screen) |

Env: `WA_PORT` (9222), `WA_VIEW_PORT` (9223), `WA_PROFILE` (`~/.dsh/flykit/whatsapp`), `WA_CHROME` (Google Chrome binary), `WA_ORIGINS` (extra origins allowed to open the CDP socket, comma separated), `WA_QR_INVERT=1` (light-on-dark QR for dark terminals if your phone will not read the default).

## Attach over CDP from Node

```js
const { webSocketDebuggerUrl } = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws = new WebSocket(webSocketDebuggerUrl);            // Node >= 22, no library needed
// or: puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' })
// or: chromium.connectOverCDP('http://127.0.0.1:9222')   (Playwright)
```

The WhatsApp tab is the `page` target whose url starts with `https://web.whatsapp.com/` in `http://127.0.0.1:9222/json`.

## Viewer

`http://127.0.0.1:9223/` is a single page: a canvas fed by `Page.startScreencast` (jpeg, q60, acks delayed to cap at ~30 fps) and mouse/keyboard/wheel/paste forwarded with `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` / `Input.insertText`. A green banner appears while WhatsApp is on the QR screen.

Chrome's viewport follows the viewer's own size (`Emulation.setDeviceMetricsOverride` on load and resize), so the page reflows to the panel instead of being letterboxed. WhatsApp's two-column layout needs about 800 CSS px; in a narrower viewer the page is laid out at 800 and the frame is scaled down. Every open viewer sets the size, so the last one to load or resize wins.

The page talks to Chrome's CDP websocket directly (Chrome is started with `--remote-allow-origins=http://127.0.0.1:9223,http://localhost:9223` plus `WA_ORIGINS`). There is no bridge and no token: everything binds to 127.0.0.1 only, and any local process can already reach port 9222.

## In the panel

The **Apps** tab is an iframe of `http://127.0.0.1:9223/`. The host route `/api/flykit/apps` runs `node wa.mjs start --detach` here when the viewer is down, so nothing has to be started by hand. The iframe keeps its own origin (9223), which Chrome already allows. A second app (Telegram Web) is one more row in `src/apps.ts` plus a sibling directory with its own profile, port pair and start URL.

## What was verified (Phase 1)

- Only `/Applications/Google Chrome.app` (152) passes WhatsApp's browser check headless. Chrome for Testing 146 and both headless-shell builds get the "WhatsApp works with Google Chrome 100+" wall: their client-hint brands lack `Google Chrome`. A UA override fixes Chrome for Testing, but Chrome 152 needs none.
- Chrome 152 has only new headless (`--headless` == `--headless=new`); old headless exists only in headless-shell, which fails on WhatsApp.
- No anti-detection flag was needed. `navigator.webdriver` is false and plugins are present in plain headless Chrome 152.
- The one flag kept for WhatsApp: a `--user-agent` without "Headless". With `HeadlessChrome` in the UA WhatsApp hides the "Stay logged in on this browser" checkbox; with a plain UA it is shown and checked.
- QR over CDP: the canvas pixels are read with `getImageData`, the module grid is found by trying every QR size against the finder and timing patterns, and it decodes with jsQR to the real `wa.me/settings/linked_devices` link. The clipped PNG decodes too.
- Persistence: after a real QR scan, `stop` + `start --detach` came back as `ready` (chat list present) within 4 s, and the session also survived a `dsh web` restart. The QR printed in the terminal was scanned successfully by a phone.
- Port taken: Chrome stays alive and silently listens on `[::1]` only. `start` therefore probes 127.0.0.1 and ::1 first and fails loudly. A second Chrome on the same profile aborts by itself (exit 21, `ProcessSingleton`).
- Screencast: frames only arrive on change (1 frame in 10 s on the static QR page, ~0.5% CPU). First frame lands ~11 ms after a click or keystroke. A CSS-animated page yields 120 fps at ~30% CPU with no cap, which is why the viewer delays acks. Typing incl. emoji and Enter works in a contenteditable via `Input.dispatchKeyEvent`.

## Known limitations

- WhatsApp's own composer, emoji picker and chat scrolling were not exercised (they need a logged-in session). Only the QR screen, the phone-number screen and a generic contenteditable were.
- Copy (Cmd-C) out of the viewer and editing shortcuts like Cmd-A are not forwarded; paste (text only) is.
- Screencast is per viewer connection; several open viewers each get their own stream.
- The first launch of a freshly downloaded Chrome build took >10 s to open CDP (Gatekeeper). `start` waits 20 s.
