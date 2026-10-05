// Health Hub build · src/app.jsx → app.js (minified, es2020) plus vendored React.
// Run with `npm run build`. Output is committed at the repo root for quick diffing,
// then copied into ./public so Vercel serves only the app shell and static assets.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'app.jsx');
const out = join(root, 'app.js');
const pub = join(root, 'public');

const source = readFileSync(src, 'utf8');
const hash = createHash('sha1').update(source).digest('hex').slice(0, 8);

await build({
  entryPoints: [src],
  outfile: out,
  bundle: true,
  format: 'iife',
  minify: true,
  charset: 'utf8',
  target: ['es2020', 'safari15', 'chrome90'],
  loader: { '.jsx': 'jsx' },
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  legalComments: 'none',
  logLevel: 'error',
  define: { __BUILD__: JSON.stringify(hash) },
});

// Vendored React (UMD) · stable across app builds so it stays cached long-term.
mkdirSync(join(root, 'vendor'), { recursive: true });
for (const [from, to] of [
  ['react/umd/react.production.min.js', 'react.production.min.js'],
  ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
]) copyFileSync(join(root, 'node_modules', from), join(root, 'vendor', to));

// Vercel static output. Keep repo docs, SQL, env examples and audits out of the public site.
rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
for (const file of ['index.html', 'app.js', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'privacy.html', 'update.html']) {
  copyFileSync(join(root, file), join(pub, file));
}
for (const dir of ['vendor', 'fonts']) cpSync(join(root, dir), join(pub, dir), { recursive: true });

const kb = (f) => (statSync(f).size / 1024).toFixed(1) + ' KB';
console.log(`app.js ${kb(out)} · source ${kb(src)} · build ${hash}`);
