# dsh-flykit

Fly your agents.

A plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that turns the
`dsh web` GUI into an agent cockpit. It adds a Claude-Code-style status line under the composer
(idle / thinking / running *tool*, a turn timer, the session's git branch and dirty count, and it
recolours the shell's context ring as the window fills); an **Explorer** side panel with a file
tree, a CodeMirror editor that saves back to disk, Markdown and HTML/SVG preview, and a live file
watch that refreshes the tree, dots changed files and follows the open file as it changes on disk;
and an **Agents** tab that runs real PTY terminals in the session's workspace — Claude Code, Pi,
Codex, or a plain shell — in an xterm view, with Claude subscription usage bars (5-hour, weekly,
weekly top model) shown beside a Claude Code terminal.

## Install

```sh
dsh plugin --profile web add dsh-flykit
```

From a git checkout:

```sh
git clone https://github.com/flykit-cc/dsh-flykit
cd dsh-flykit
npm install && npm run build
dsh plugin --profile web add .
```

Check the layer landed, then start the GUI:

```sh
dsh --profile web --dump-config | grep flykit
dsh web
```

Remove it with `dsh plugin --profile web remove dsh-flykit`.

## Requirements

- Node ≥ 22
- DSH 0.1.2-rc.1
- macOS or Linux. The Agents tab uses [node-pty](https://github.com/microsoft/node-pty), a native
  module; there is no Windows build here.
- `git` on `PATH` for the branch segment and for the Explorer's file list (without a repo it falls
  back to a plain directory walk).

## How it works

The package ships two halves from one manifest:

- **Host half** (`lib/index.js`, a Cordis plugin) runs in the `dsh` process. It registers routes on
  DSH's web server under `/api/flykit/*`: `git`, `files`, `file` (GET/PUT), `watch` (SSE), `terms`,
  `term/input`, `term/resize`, `term/stream` (SSE) and `claude-usage`.
- **Client half** (`lib/client.js`) is a CommonJS bundle the shell loads in the browser. It injects
  React components into the shell's slots and reaches the host over those routes with `fetch` and
  `EventSource`. Everything outside the shell's own platform modules (React, Cordis, the DSH client
  packages) is inlined, so the bundle is large.

**The routes have no authentication.** DSH's web server binds to loopback, and that is the only
thing keeping them private — anything that can reach the port can call them, and `term/input` writes
to a live shell. Two limits do apply: the working directory always comes from the session header,
never from the request, and file reads and writes are confined below it. Do not expose `dsh web` on
a public interface with this plugin installed.

## Development

```sh
npm install
npm run dev                         # tsdown --watch: client bundle hot-reloads
dsh plugin --profile web add .      # once
dsh web --port 3080 --no-open
```

Client bundle edits reload in the browser; host-half edits need `dsh web` restarted.
`npm run typecheck` and `npm test` cover both halves — the test run also verifies the client bundle
registers exactly one module and pulls in no non-platform imports.

## Privacy

The Claude usage bars read the Claude Code login already on this machine — the macOS Keychain entry
`Claude Code-credentials`, or `~/.claude/.credentials.json` elsewhere — and call Anthropic's usage
endpoint from the host process. The OAuth token never leaves that process and is never sent to the
browser; the browser receives only the plan name, the percentages and their reset times. With no
Claude Code login present, the feature reports nothing and the bars stay hidden.

Nothing else in flykit talks to a network service. File contents, terminal output and git status
stay between the `dsh` host process and your browser.

## License

MIT. [flykit.cc](https://flykit.cc)
