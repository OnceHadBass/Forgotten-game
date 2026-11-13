// Bundles the game into one self-contained page (dist/index.html) and a
// head-less fragment (dist/artifact.html) for publishing as an artifact.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.ts'], bundle: true, minify: true, write: false,
  format: 'iife', target: 'es2020',
});
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = readFileSync('src/style.css', 'utf8');
const head = `<title>Forgotten</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil:wght@500;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<style>${css}</style>`;
const body = `<div id="app"></div>\n<script>${js}</script>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/artifact.html', `${head}\n${body}\n`);
writeFileSync('dist/index.html', `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}</head><body>${body}</body></html>\n`);
// Textures are copied as they are. Models are packed as base64 inside JSON, because some
// hosts (the artifact viewer among them) will serve data files but not .glb.
cpSync('public/assets/tex', 'dist/assets/tex', { recursive: true });
rmSync('dist/assets/models', { recursive: true, force: true });
mkdirSync('dist/assets/models', { recursive: true });
const wanted = /const MODELS = \[([^\]]*)\]/.exec(readFileSync('src/assets.ts', 'utf8'))[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
for (const name of wanted) writeFileSync(`dist/assets/models/${name}.json`, JSON.stringify({ glb: readFileSync(`public/assets/models/${name}.glb`).toString('base64') }));
console.log(`built: ${(js.length / 1024).toFixed(0)} kB js`);
