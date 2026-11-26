# Working on Nocturne

Nocturne is a design system and its SolidJS component library, published as one package,
`@aiviarium/nocturne`. Bun runs everything.

## Layout

- `src/styles/`: the design system. `tokens.css` holds the tokens and `bundle.css` the base `nc-*` classes.
  `extra.css`, `parts.css`, `editor.css` and the other files add what the components need. `index.css` loads
  them in cascade layers.
- `src/shell/`: the app shell. `createShell` is the registry of scopes, lenses, places, records and panels, and
  `Shell` draws the window from it. The title bar, scope path, lens box, palette, switcher, trail, sidebar header,
  panel rail and panels, resize handles, history, window controls and appearance are its parts.
- `src/components/` holds the components, `src/fields/` the field kinds, `src/editor/` the rich text editor and
  `src/lib/` the helpers. `src/index.ts` is the public API.
- `icons/`: every icon `name` takes, as SVG for the site. `scripts/icons.ts` maps each name to a Lucide icon, and
  `bun run gen:icons` writes `src/components/icon-data.ts` and `icons/` from it and the `lucide` package. Lucide is
  the only family, so never draw an icon by hand.
- `examples/`: one file per example. `gallery/` shows them (`bun run gallery`).
- `test/`: `bun test` with happy-dom (`test/setup.ts` is preloaded by `bunfig.toml`).
- `scripts/`: `lint-tokens.ts`, `gen-icons.ts` and the Playwright screenshot scripts.
- `skills/nocturne/`: the skill apps and agents follow to build views with Nocturne.
- `site/`: the documentation site, which follows aiviarium/docs-base at commit dcffeac. See `site/AGENTS.md`.
  `site/content/docs/shell/` documents the app shell.
- `drafts/`, where it exists, holds design drafts on one machine. It is not part of the package or the repository,
  and nothing in `src/`, `examples/` or the site imports from it.

## ui-sdk

Popovers, menus, Select, dialogs, sheets, tooltips, toasts, the controls and the sliders are built on ui-sdk
(`@ui-sdk/core` and `@ui-sdk/solid`, pinned in `package.json`). Before you change or add one:

- Follow the `ui-sdk` skill (`.claude/skills/ui-sdk`, a link to the copy in `node_modules`) and read
  `node_modules/@ui-sdk/solid/docs/llms.txt`, then only the component pages you need. To build a component ui-sdk
  lacks, search `node_modules/@ui-sdk/solid/docs/core.md` by heading and read `rendering.md` next to it.
- Keep Nocturne's props. Render ui-sdk's parts with the `nc-*` classes, style them by ui-sdk's state attributes
  (`data-open`, `data-checked`, `data-highlighted`), and test Nocturne's wiring rather than ui-sdk's behaviour.
- Pass `value` or `defaultValue`, never both. Don't wrap a control in ui-sdk's `Field`: it draws its children again
  when its state changes, which replaces them and loses focus.
- An app that uses Nocturne excludes `@ui-sdk/core` from Vite's `optimizeDeps` and declares `@layer ui-sdk` before
  its own layers, as `src/styles/index.css` does.
- `test/setup.ts` turns on strict mode for ui-sdk and fills in the browser APIs happy-dom lacks. The gallery
  doesn't print ui-sdk or Solid warnings in the console.

The `nocturne` skill (`skills/nocturne/SKILL.md`, linked from `.claude/skills` and `.agents/skills`) is how apps build
views from these parts. Keep it in step when a part's API or a rule changes. Apps link it from
`node_modules/@aiviarium/nocturne/skills/nocturne`.

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

- Build the window with `createShell` and `Shell`, and views from the parts on the site's "Which part for what"
  pages (`site/content/docs/parts/`, starting at `index.mdx`). If a part lacks something, add a variant to it, and
  update its page. A new kind of thing a view shows gets a row in that table.
- When tokens, examples or icons change, the site picks them up at build time. When a rule or a size changes,
  update the matching page in `site/content/docs/`. `docs/phone.md` and the Phones page of the site say the same.
- Use tokens for colours, radii and font sizes. `lint:tokens` fails on literals.
- Each exported component has a stable `data-part` on its root and at least one test that renders it, checks
  the `data-part` and exercises its main interaction.
- The library has no network code. Anything that talks to a backend comes in through a provider or a prop
  (`EditorServices`, `TranscriberProvider`, the field runtime, `ViewLayoutHost`, `ViewChrome`). The shell takes the
  router (`HistoryRouter`: `memoryRouter`, `hashRouter` or the app's), the storage (`ShellStorage`: `webStorage`,
  `memoryStorage` or the app's) and the native window's handlers (`ShellWindow`) as adapters. Only `hashRouter`
  touches `location` and `history`, when the app passes it, and `webStorage` wraps the store the app gives it.
- Keep prose plain and factual. Vale must print nothing on the Markdown and MDX files.
- Never commit screenshots. `screens/` is ignored, and review shots stay outside the repository.
- Commits follow Conventional Commits.
