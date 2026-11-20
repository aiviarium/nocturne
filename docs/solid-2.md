# Solid 2

Nocturne is a Solid 2 library. It needs `solid-js` 2 and `@solidjs/web` 2, and has no compatibility
layer for Solid 1. Components, props and `data-part`s are the same as before; this page lists what a
consumer has to do and the few places where Solid 2 forced a change.

## Setup

```sh
bun add solid-js@^2 @solidjs/web@^2
```

`@solidjs/web` is a peer dependency as well: it holds `render`, `Portal`, `dynamic` and the JSX types.

`tsconfig.json` points the JSX transform at the web runtime, not at `solid-js`:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@solidjs/web"
  }
}
```

The bundler plugin is the Solid 2 one, `@solidjs/vite-plugin`. The Solid 2 release of
`vite-plugin-solid` is a shim over it, so Nocturne depends on the plugin directly:

```ts
import { defineConfig } from "vite"
import solid from "@solidjs/vite-plugin"

export default defineConfig({ plugins: [solid()] })
```

## What moved

| Before | In Solid 2 |
| --- | --- |
| `import { render } from "solid-js/web"` | `import { render } from "@solidjs/web"` |
| `import { createStore } from "solid-js/store"` | `import { createStore } from "solid-js"` |
| `import type { JSX } from "solid-js"` | `import type { JSX } from "@solidjs/web"` |
| `splitProps(local, [..])` | `omit(local, ...)` |
| `<Index each={xs}>` | `<For keyed={false} each={xs}>` |
| `classList={{ live: x() }}` | `class={{ live: x() }}`, or `class={["nc-badge", { live: x() }]}` |
| `tabIndex`, `readOnly` | `tabindex`, `readonly` |

## What Nocturne's own code had to change

- `classList` is gone, so every part that toggled a class uses the object or array form of `class`.
  `cx()` accepts the same values, so `cx("nc-badge", props.class, { "nc-badge--live": live() })`
  works.
- ARIA boolean attributes take the strings `"true"` and `"false"`, not booleans. Nocturne exports two
  helpers for the same reason its own parts use them:
  `aria(value)` returns `"true"` or `"false"`, and `ariaChecked(value)` also returns `"mixed"`.
- `Portal` no longer takes a `ref`, so an overlay root is an element the library creates and mounts
  the portal into. The DOM is the same: a `div.nc` outside the app root.
- Contexts without a default read as `null` rather than `undefined`, because Solid 2 throws
  `ContextNotFoundError` instead of returning `undefined`. The public hooks still return
  `undefined` when there is no provider, except `PhoneOverride`, whose context value is
  `boolean | null` (pass `null` for "not a phone" rather than `undefined`).
- `createEffect` takes a compute and an apply function, so effects that read reactive values and
  then write to the DOM were split. Effects that read a ref do their first run in `onSettled`,
  because a ref is assigned after the component body has run.
- Solid 2 batches writes until the next microtask. Nothing in Nocturne's public API depends on a
  write being readable at once, but tests that write a signal and then assert need `flush()`.
- `DropdownTriggerProps["aria-expanded"]` is typed `"true" | "false"` because it is spread onto a
  button, and a bare boolean is not a valid ARIA value there.

## Additions

- `aria` and `ariaChecked` are exported for apps that write ARIA attributes themselves.
- `createControllable`, `usePhone` and the rest of the helpers keep their signatures.

## Tests

`bun test` compiles `.tsx` with `@solidjs/compiler`, Solid 2's Oxc-based transform, and renders the
browser build of `solid-js` and `@solidjs/web` under Bun's `node` condition.

## Dev diagnostics

In a dev build, Solid reports a few one-time reads in Nocturne's own parts as `STRICT_READ_UNTRACKED`.
Each of them is wrapped in `untrack`, because the part needs that value once when it is first made and
never again. Production builds do not run the diagnostics.
