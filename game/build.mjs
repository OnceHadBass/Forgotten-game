// Bundles the game into one self-contained page (dist/index.html) and a
// head-less fragment (dist/artifact.html) for publishing as an artifact.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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
cpSync('public/assets', 'dist/assets', { recursive: true });
console.log(`built: ${(js.length / 1024).toFixed(0)} kB js`);
