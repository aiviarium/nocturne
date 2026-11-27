# Working on the Nocturne docs

This folder is the documentation site of Nocturne.
It follows aiviarium/docs-base at commit dcffeac: a static Fumadocs site on Next.js.
This file is for coding agents working in it.

## Layout

| Path | What it is |
| --- | --- |
| `docs.config.ts` | The name, colour, links, badges and assets of the site |
| `public/brand/` | The icon and the wordmarks |
| `content/docs/` | The pages, in MDX, with `meta.json` for the order |
| `src/app/` | The routes of the landing page, docs, search index, `llms.txt`, `llms-full.txt` and `/md/*.md` |
| `src/app/global.css` | The theme of the base. See `docs/design.md` |
| `src/app/nocturne.css` | The token tables, the icon grid and the frames of the examples |
| `src/components/tokens.tsx` | The token tables, drawn from the generated data |
| `src/components/example.tsx` | `Example` and `GalleryLink`, the frames of the gallery |
| `src/components/demo.tsx` | `DemoFrame` and `DemoLink`: the demo app embedded, and links to a place in it |
| `scripts/nocturne-data.ts` | Writes `src/generated/nocturne.json` from `tokens.css`, the accents, the examples and the icons |
| `scripts/gallery.ts` | Builds the gallery into `public/gallery/` with relative URLs and the site's fonts |
| `scripts/demo.ts` | Builds the demo app into `public/demo/` the same way |
| `scripts/check-links.ts` | The link check |
| `scripts/screens.py` | Screenshots of the built site into `screens/`, which is ignored and never committed |
| `docs/design.md` | The design rules of the base |

`public/gallery/`, `public/demo/` and `src/generated/` are made by the build and are not committed.

## Build and check

```bash
bun install          # in the repository root, then here
bun run dev          # http://localhost:3000
bun run typecheck
bun run lint
bun run links
bun run vale         # must print nothing
bun run build        # writes out/; DOCS_BASE_PATH=/nocturne for the site in a folder
```

`bun run check` runs them all in that order, as CI does. Vale needs the `vale` binary. The packages include `mdx2vast`, which Vale uses for MDX.

## Conventions

- Next.js 16 and Fumadocs 16 differ from older versions. Read `node_modules/next/dist/docs/` and the types in `node_modules/fumadocs-*` before changing routes or layouts.
- The site is a static export. Route handlers export `dynamic = 'force-static'`. Plain URLs to files in `public/` go through `asset()` so they get the base path.
- Take token values from the generated data, never copy them into a page.
- Show a component with `<Example id="part/example" />`, where the id is a file in `../examples/`. Do not port components to React.
- Point at a part in context with `<DemoLink to="projects/atlas/explore/issues/WEB-142">`. The test in `../test/demo.test.tsx` checks that each address leads to a place of the demo.
- Follow `docs/design.md`. The project colour never fills a panel, card, button or callout. Only the value of a badge is filled with it.
- Prose is short, plain sentences, with project names in title case. It has to pass Vale with no output.
- Commits follow Conventional Commits with a short subject.

<!-- vale off -->
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
<!-- vale on -->
