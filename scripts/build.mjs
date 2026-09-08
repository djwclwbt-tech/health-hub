// Health Hub build · src/app.jsx → app.js (minified, es2020) plus vendored React.
// Run with `npm run build`. Output is committed; CI rebuilds it on every push so a
// forgotten build never ships stale UI.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'app.jsx');
const out = join(root, 'app.js');

const source = readFileSync(src, 'utf8');
const hash = createHash('sha1').update(source).digest('hex').slice(0, 8);
const stamp = new Date().toISOString().slice(0, 10);

await build({
  entryPoints: [src],
  outfile: out,
  bundle: false,
  minify: true,
  charset: 'utf8',
  target: ['es2020', 'safari15', 'chrome90'],
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  legalComments: 'none',
  logLevel: 'error',
  define: { __BUILD__: JSON.stringify(`${stamp}.${hash}`) },
});

// Vendored React (UMD) · stable across app builds so it stays cached long-term.
mkdirSync(join(root, 'vendor'), { recursive: true });
for (const [from, to] of [
  ['react/umd/react.production.min.js', 'react.production.min.js'],
  ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
]) copyFileSync(join(root, 'node_modules', from), join(root, 'vendor', to));

const kb = (f) => (statSync(f).size / 1024).toFixed(1) + ' KB';
console.log(`app.js ${kb(out)} · source ${kb(src)} · build ${stamp}.${hash}`);
