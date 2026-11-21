---
name: nocturne
description: Builds Solid 2 views with Nocturne (@aiviarium/nocturne), the Aiviarium design system and component library on ui-sdk. Covers choosing the part for each thing a view shows, the shell layout (sidebar header, ViewLayout and ViewHeader, the account card at the sidebar's foot), dialogs, sheets, menus, selects, tabs, forms, lists and toasts, tokens, phones, and testing. Use whenever a project imports @aiviarium/nocturne, or works on Rookery's web shell, Crow's plugins or Nocturne itself.
---

# Build views with Nocturne

Nocturne is a set of parts for building views: the frame, lists, records, forms, status and overlays.
Build each view from these parts, and views look and behave alike whoever writes them.
Its overlays and controls are built on ui-sdk, which has a skill of its own.
Nocturne draws them with its `nc-*` classes and keeps a data-driven API.

## Read first

- Start at `site/content/docs/parts/index.mdx` in Nocturne, or under `node_modules/@aiviarium/nocturne/` in an app.
  It's a table of the part to use for each thing a view shows. Read the page it links for the part you need.
- Read the component's own file in `src/components/` for its props. Each prop has a doc comment.
- `examples/` has one file per example. The gallery (`bun run gallery` in Nocturne) shows them all.

## Rules

1. **Use a part, don't build one.** A list is `RowList` and `ListRow`, a table `DataTable`, facts `PropertyList`,
   a figure `Stat`, a setting `SettingRow`, nothing to show `EmptyState`, a state `State`. If a part lacks something, add a variant to the
   part in Nocturne, not a one-off in the app.
2. **No raw colours, radii or font sizes.** Use the tokens in `src/styles/tokens.css` (`--bg-*`, `--text-*`,
   `--line*`, `--accent*`, `--space-*`, `--radius-*`, `--control-*`, `--row-*`). Nocturne's `lint:tokens` fails on
   literals.
3. **Don't restyle a part for one view.** App CSS lays parts out with grid, gap and width. It leaves their look alone.
4. **Icon-only controls have a label.** `IconButton` requires `label`, which is its name and its tooltip.
5. **Phones come for free.** Parts switch to the phone scale under `:root[data-phone]`. A titled `Dialog` becomes a
   `Sheet`, and menus and selects become sheets. Check a view at 390px wide instead of writing phone variants.

## The shell layout

Rookery's shell and Crow follow one layout. Keep to it:

- **No top bar on desktop.** The sidebar's head is a `SidebarHeader` with back, the current place and search.
  Drilling into an item, such as a host or a job, replaces the sidebar's content with that item's places. Back
  returns.
- **Each view has its own `ViewHeader`** inside `ViewLayout`. It holds crumbs or a title and the view's state. The
  primary action is at the right, and the others are in an overflow menu. Views don't share a header.
- **The account card is at the sidebar's foot**, not in a corner of the page.
- **Views keep their actions out of the status bar.** It shows whether the server is reachable and which jobs run. A view puts its actions in its own header.

## Overlays and controls

The caller keeps `open` or `value` and changes it in `onClose` or `onChange`.

- `Dialog` takes `open`, `onClose`, `title`, `description`, `footer` (buttons, the primary one last) and `size`. A form
  with unsaved input passes `closeOnBackdrop={false}`. It renders in place, in the top layer, without a portal.
- `Sheet` is a bottom sheet with `title`, `footer` and `detents`, and rests at its content's height by default.
  `ActionSheet` is for a short choice or a destructive confirmation.
- `DropdownMenu` takes a `trigger` and `items` (`MenuEntry[]`: items, separators, labels, choices). `Menu` is anchored
  to an element or a point. `RowMenu` and `ContextMenu` give a row its menu and its right click.
- `Select` takes `options`, and `Tabs` takes `items`. Segmented tabs switch a view and work like a radio group.
  Underline tabs move between sections and take their `TabPanel`s as children.
- The form controls are `Switch`, `Checkbox`, `RadioGroup`, `Slider`, `RangeSlider`, `NumberField`, `TextField`,
  `TextArea` and `SchemaForm`.
- `toast({ title, description, tone, action })` shows a toast. Mount one `ToastRegion` at the app's root.
- `Popover` is a box next to an element the caller passes as `anchor`. Use `PopoverButton` when a button opens it.

## Solid 2

Nocturne is Solid 2 (`docs/solid-2.md` in Nocturne). These mistakes break views:

- Don't spread `props` into a plain object or destructure them, because reads stop updating. Use `omit` and `merge`.
- `onSettled` returns its cleanup. Don't call `onCleanup` inside it or inside a ref callback.
- `createMemo(fn, options)` takes two arguments. `<For>` passes the item and an index accessor.
- Read a prop once, on purpose, with `untrack(() => props.x)`. Strict mode warns about any other untracked read.
- Make a `<Show>` `keyed` when its child keeps running after the condition clears, as a closing popover does. The
  child then gets the value itself.

## Testing

Nocturne tests run in `bun test` with happy-dom. Find parts by `data-part` and by role, not by class. Each exported
component has a `data-part` on its root and a test that renders it and exercises its main interaction. ui-sdk
controls render hidden form inputs (`input[aria-hidden]`), so leave them out when you count inputs. A slider commits a
key's change on keyup.
