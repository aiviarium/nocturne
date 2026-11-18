# Nocturne docs

The documentation site of Nocturne, served at https://nocturne.helight.dev/.
It follows [aiviarium/docs-base](https://github.com/aiviarium/docs-base) at commit dcffeac: a static site built with Fumadocs and Next.js.

The token tables are made from `../src/styles/tokens.css` when the site is built.
The live examples are frames of Nocturne's gallery, which the build writes to `public/gallery/`.

## Commands

Run `bun install` in the repository root first: the build compiles the gallery from the library.

| Command | What it does |
| --- | --- |
| `bun install` | Installs the dependencies of the site |
| `bun run dev` | Builds the gallery and the data, then runs the site at `http://localhost:3000` |
| `bun run build` | Writes the static site to `out/` |
| `bun run start` | Serves `out/` |
| `bun run typecheck` | Checks the TypeScript code |
| `bun run lint` | Runs ESLint |
| `bun run links` | Checks the links between pages |
| `bun run vale` | Checks the prose of every Markdown and MDX file in the repository |
| `bun run check` | Runs all of the checks and the build |

Set `DOCS_BASE_PATH=/nocturne` for the site served from a folder, as on GitHub Pages.

The design rules of the base are in [docs/design.md](docs/design.md). The guide for working on the site is [AGENTS.md](AGENTS.md).

## License

The site's code comes from the docs base and is licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT), at your option.
