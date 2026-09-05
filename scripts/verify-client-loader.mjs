import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const PLATFORM = new Set([
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-slots',
])

const artifact = new URL('../lib/client.js', import.meta.url)
const registrations = []
const window = { __ModuleLoader__: { load(r) { registrations.push(r) } } }

// Inlined libraries (xterm) probe the DOM at module init. A permissive stub
// answers every property with another stub, so init runs without a browser.
const stub = () => new Proxy(function () {}, {
  get: (_t, key) => key === Symbol.toPrimitive ? () => '' : key === 'then' ? undefined : stub(),
  apply: () => stub(),
  construct: () => stub(),
})
const dom = { document: stub(), navigator: stub(), self: window, getComputedStyle: stub(), requestAnimationFrame: stub(), matchMedia: stub(), queueMicrotask, setTimeout, clearTimeout, console }

runInNewContext(readFileSync(artifact, 'utf8'), { window, ...dom }, { filename: artifact.pathname })

if (registrations.length !== 1) {
  throw new Error(`dsh-flykit client registered ${registrations.length} Loader modules, expected 1`)
}
const [registration] = registrations
if (registration.id !== 'dsh-flykit' || typeof registration.factory !== 'function') {
  throw new Error('dsh-flykit client did not register the expected Loader module')
}

const requested = new Set()
registration.factory((specifier) => { requested.add(specifier); return {} })
const foreign = [...requested].filter((s) => !PLATFORM.has(s))
if (foreign.length > 0) {
  throw new Error(`dsh-flykit client requires non-platform modules: ${foreign.join(', ')}`)
}

process.stdout.write('verify-client-loader: dsh-flykit registered one client module\n')
