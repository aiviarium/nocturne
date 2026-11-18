# Working on Nocturne

Nocturne is a design system and its SolidJS component library, published as one package,
`@aiviarium/nocturne`. Bun runs everything.

## Layout

- `src/styles/`: the design system. `tokens.css` holds the tokens and `bundle.css` the base `nc-*` classes.
  `extra.css`, `parts.css`, `editor.css` and the other files add what the components need. `index.css` loads
  them in cascade layers.
- `src/components/`, `src/fields/`, `src/editor/`, `src/lib/`: the components, field kinds, rich text editor
  and helpers. `src/index.ts` is the public API.
- `icons/`: the 48 core icons. `bun run gen:icons` writes `src/components/icon-data.ts` from them.
- `examples/`: one file per example. `gallery/` shows them (`bun run gallery`).
- `test/`: `bun test` with happy-dom (`test/setup.ts` is preloaded by `bunfig.toml`).
- `scripts/`: `lint-tokens.ts`, `gen-icons.ts` and the Playwright screenshot scripts.
- `site/`: the documentation site, which follows aiviarium/docs-base at commit dcffeac. See `site/AGENTS.md`.

## Checks

Run these before a commit. CI runs the same ones.

```sh
bun run lint          # Biome
bun run typecheck     # tsc --noEmit
bun test
bun run lint:tokens
bun run gallery:build
cd site && bun run check   # typecheck, lint, links, Vale on all Markdown and MDX, build
```

The site check needs `bun install` in `site/` and the `vale` binary.

## Rules

- Build views from the parts on the site's "Which part for what" pages (`site/content/docs/parts/`). If a part
  lacks something, add a variant to it, and update its page.
- When tokens, examples or icons change, the site picks them up at build time. When a rule or a size changes,
  update the matching page in `site/content/docs/`. `docs/phone.md` and the site's phones page say the same.
- Use tokens for colours, radii and font sizes. `lint:tokens` fails on literals.
- Each exported component has a stable `data-part` on its root and at least one test that renders it, checks
  the `data-part` and exercises its main interaction.
- The library has no network code. Anything that talks to a backend comes in through a provider or a prop
  (`EditorServices`, `TranscriberProvider`, the field runtime, `ViewLayoutHost`, `ViewChrome`).
- Keep prose plain and factual. Vale must print nothing on the Markdown and MDX files.
- Never commit screenshots. `screens/` is ignored, and review shots stay outside the repository.
- Commits follow Conventional Commits.
