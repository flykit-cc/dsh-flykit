import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const PACKAGE_NAME = 'dsh-flykit'

export default defineConfig({
  name: `${PACKAGE_NAME}/client`,
  entry: { client: 'src/client/index.ts' },
  tsconfig: 'tsconfig.client.json',
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: false,
  sourcemap: true,
  // xterm ships a stylesheet; the shell serves no plugin CSS, so it rides along as a string.
  define: { __XTERM_CSS__: JSON.stringify(readFileSync('node_modules/@xterm/xterm/css/xterm.css', 'utf8')) },
  // The shell's platform modules: `require`d at run time, never bundled.
  // Everything else must be inlined — the shell resolves nothing else.
  deps: {
    neverBundle: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-slots',
    ],
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
