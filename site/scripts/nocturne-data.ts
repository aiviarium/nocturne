// Reads Nocturne's design system from the repository and writes it as data for
// the pages: src/generated/nocturne.json.
//
// - the tokens of src/styles/tokens.css: the colours of each theme, the scales
//   and the type classes
// - the accent presets of src/lib/accents.ts
// - the meta of each example in examples/, and the gallery's pages
// - the named icons in icons/, which gen:icons writes
//
// Run with `bun run tokens`. The build and the typecheck run it first.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../../gallery/pages';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(site, '..');
const read = (path: string) => readFileSync(join(repo, path), 'utf8');

type Declarations = Record<string, string>;

/** The custom properties and declarations of each rule, by selector. */
function rules(css: string): Map<string, Declarations> {
  const map = new Map<string, Declarations>();
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    const declarations: Declarations = { ...map.get(selector) };
    for (const part of match[2].split(';')) {
      const colon = part.indexOf(':');
      if (colon < 0) continue;
      declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
    map.set(selector, declarations);
  }
  return map;
}

const tokenRules = rules(read('src/styles/tokens.css'));
const pick = (selector: string) => {
  const found = tokenRules.get(selector);
  if (!found) throw new Error(`tokens.css has no rule for ${selector}`);
  return found;
};
const vars = (declarations: Declarations) =>
  Object.fromEntries(
    Object.entries(declarations)
      .filter(([name]) => name.startsWith('--'))
      .map(([name, value]) => [name.slice(2), value]),
  );

const dark = vars(pick(':root, [data-theme="dark"]'));
const light = vars(pick('[data-theme="light"]'));
const scale = vars(pick(':root'));
for (const name of Object.keys(dark)) {
  if (!(name in light)) throw new Error(`tokens.css: --${name} has no light value`);
}

const type = [...tokenRules.entries()]
  .filter(([selector]) => /^\.[a-z-]+$/.test(selector))
  .map(([selector, d]) => ({
    name: selector.slice(1),
    family: d['font-family'].includes('mono') ? 'mono' : 'sans',
    size: d['font-size'],
    lineHeight: d['line-height'],
    weight: d['font-weight'],
    letterSpacing: d['letter-spacing'] ?? null,
  }));

const accents = [
  ...read('src/lib/accents.ts').matchAll(
    /\{ id: "([a-z]+)", name: "([A-Za-z]+)", dark: "(#[0-9A-Fa-f]{6})", light: "(#[0-9A-Fa-f]{6})" \}/g,
  ),
].map(([, id, name, darkValue, lightValue]) => ({ id, name, dark: darkValue, light: lightValue }));
if (accents.length === 0) throw new Error('accents.ts: no presets found');

/** The object literal after `export const meta: ExampleMeta =`, evaluated. The metas are plain literals. */
function exampleMeta(source: string, id: string): Record<string, unknown> {
  const start = source.indexOf('{', source.indexOf('export const meta: ExampleMeta ='));
  if (start < 0) throw new Error(`examples/${id}.tsx: no meta`);
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      return new Function(`return (${source.slice(start, i + 1)})`)() as Record<string, unknown>;
    }
  }
  throw new Error(`examples/${id}.tsx: the meta does not end`);
}

const examples: Record<string, Record<string, unknown>> = {};
for (const folder of readdirSync(join(repo, 'examples'), { withFileTypes: true })) {
  if (!folder.isDirectory() || folder.name.startsWith('_')) continue;
  for (const file of readdirSync(join(repo, 'examples', folder.name))) {
    if (!file.endsWith('.tsx')) continue;
    const id = `${folder.name}/${file.slice(0, -4)}`;
    const meta = exampleMeta(read(`examples/${id}.tsx`), id);
    examples[id] = {
      title: meta.title,
      ...(meta.note ? { note: meta.note } : {}),
      ...(meta.verdict ? { verdict: meta.verdict } : {}),
      ...(meta.phone ? { phone: true } : {}),
      ...(meta.height ? { height: meta.height } : {}),
    };
  }
}

const icons = readdirSync(join(repo, 'icons'))
  .filter((file) => file.endsWith('.svg'))
  .sort()
  .map((file) => ({
    name: file.slice(0, -4),
    svg: read(`icons/${file}`)
      .replace(/<\?xml[^>]*>\s*/, '')
      .replace(/\s(width|height)="[^"]*"/g, '')
      .trim(),
  }));

const pages = PAGES.map((page) => ({
  id: page.id,
  title: page.title,
  group: page.group,
  sections: page.sections.flat(),
}));
for (const page of pages) {
  for (const id of page.sections) {
    if (!examples[id]) throw new Error(`gallery page ${page.id}: no example ${id}`);
  }
}

const data = { colours: { dark, light }, scale, type, accents, examples, pages, icons };
mkdirSync(join(site, 'src/generated'), { recursive: true });
writeFileSync(join(site, 'src/generated/nocturne.json'), `${JSON.stringify(data, null, 1)}\n`);
console.log(
  `tokens: ${Object.keys(dark).length} colours, ${Object.keys(scale).length} scale tokens, ${type.length} type styles, ` +
    `${Object.keys(examples).length} examples, ${icons.length} icons`,
);
