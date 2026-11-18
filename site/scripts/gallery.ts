// Builds Nocturne's gallery into public/gallery/, so the site can show each example
// in an iframe of the gallery's #/frame/<example> route.
//
// The gallery is built with relative URLs, so it works under any base path. Its
// page loads Inter and JetBrains Mono from a web font service; the copy here uses
// the site's own font files instead.
//
// Run with `bun run gallery`. It needs `bun install` in the repository root.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(site, '..');
const out = join(site, 'public/gallery');

execFileSync('bun', ['run', 'gallery:build'], {
  cwd: repo,
  stdio: 'inherit',
  env: { ...process.env, GALLERY_BASE: './', GALLERY_OUT: out },
});

mkdirSync(join(out, 'fonts'), { recursive: true });
copyFileSync(join(site, 'src/fonts/inter.woff2'), join(out, 'fonts/inter.woff2'));
copyFileSync(join(site, 'src/fonts/jetbrains-mono.woff2'), join(out, 'fonts/jetbrains-mono.woff2'));

const fonts = `<style>
@font-face { font-family: Inter; src: url(fonts/inter.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "JetBrains Mono"; src: url(fonts/jetbrains-mono.woff2) format("woff2"); font-weight: 100 800; font-display: swap; }
</style>`;

const index = join(out, 'index.html');
const html = readFileSync(index, 'utf8')
  .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
  .replace(/\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '')
  .replace('</head>', `${fonts}\n</head>`);
if (html.includes('fonts.googleapis.com')) throw new Error('gallery: the web font links are still in index.html');
writeFileSync(index, html);
console.log('gallery: built into public/gallery/');
