---
name: nocturne
description: Builds Solid 2 apps and views with Nocturne (@aiviarium/nocturne), the Aiviarium design system and component library on ui-sdk. Covers the app shell (createShell and Shell, the title bar with its scope path and lens box, the sidebar that folds to a rail, view headers with trails, the panel rail and docked panels, history, Appearance, the keyboard model), choosing the part for each thing a view shows, dialogs, sheets, menus, selects, tabs, forms, lists and toasts, tokens, the selection and accent rules, phones, and testing. Use whenever a project imports @aiviarium/nocturne, or works on Rookery's web shell, Crow's plugins or Nocturne itself.
---

# Build views with Nocturne

Nocturne is an app shell and a set of parts for building views, such as lists, records, forms, status and overlays.
The shell draws the window from one registry, and each view is built from the parts.
Views then look and behave alike whoever writes them.
Its overlays and controls are built on ui-sdk, which has a skill of its own.
Nocturne draws them with its `nc-*` classes and keeps a data-driven API.

## Read first

- For the window, read `site/content/docs/shell/` in Nocturne, or under `node_modules/@aiviarium/nocturne/` in an
  app, starting at `index.mdx`. `create-shell.mdx` lists what an app registers.
- For a view, start at `site/content/docs/parts/index.mdx`. Its tables give the part to use for each thing a view
  shows, from the shell down, with the page for the part and a place in the demo that uses it. Read the page it
  links for the part you need.
- `demo/` in Nocturne is a whole app on the shell that uses every exported part. Read the view of a place that
  shows what you are building, such as `demo/projects/build/issues.tsx` for a grouped list with records.
- Read the component's own file in `src/components/` or `src/shell/` for its props. Each prop has a doc comment.
- `examples/` has one file per example. The gallery (`bun run gallery` in Nocturne) shows them all.

## Rules

Read `design-rules.md` beside this file before you build or change a view. These are the ones views break most:

- **Labels hold the meaning.** Text in a view is limited to titles, labels and values, with a description in an
  `InfoTip` beside its label. Subtitles, paragraphs above lists and help text under fields are left out. An empty
  state has a title, its action and one short line at most.
- **Indicators mark the unusual.** A count appears when it is above zero, and a state while something is wrong or
  running.
- **A view shows what the person can change.** A setting or a scope they can't set is hidden.
- **An add action is a ghost plus icon button** in the view header: `icon: "plus"`, leaving `primary` out. Primary
  buttons submit a dialog or a form.
- **Scope by drilling.** Entering a space, a host or a project drills the sidebar into its places, and the domain is
  a segment of the path and the address.

The parts:

1. **Use a part, don't build one.** A list is `RowList` and `ListRow`, a table `DataTable`, facts `PropertyList`,
   a figure `Stat`, a setting `SettingRow`, nothing to show `EmptyState`, a state `State`. If a part lacks something, add a variant to the
   part in Nocturne, not a one-off in the app.
2. **No raw colours, radii or font sizes.** Use the tokens in `src/styles/tokens.css` (`--bg-*`, `--text-*`,
   `--line*`, `--accent*`, `--space-*`, `--radius-*`, `--control-*`, `--row-*`). Nocturne's `lint:tokens` fails on
   literals.
3. **Don't restyle a part for one view.** App CSS lays parts out with grid, gap and width. It leaves their look alone.
4. **Icon-only controls have a label.** `IconButton` requires `label`, which is its name and its tooltip.
5. **Phones come for free.** Parts switch to the phone scale under `:root[data-phone]`. A titled `Dialog` becomes a
   `Sheet`, menus and selects become sheets, splits stack, and the view header's trail becomes a back button.
   Check a view at 390px wide instead of writing phone variants. Show a phone preview on a desktop page in a
   `PhoneFrame`, whose sheets open over the frame.

## The app shell

Every app's window is the shell. Register what exists with `createShell` and draw it with `<Shell>`. Don't
assemble `AppShell`, `TitleBar` and `SidebarHeader` by hand in an app, and don't add a second header, top bar or
status bar.

```tsx
const storage = webStorage(localStorage)
const shell = createShell({
  router: hashRouter(),            // or memoryRouter() in a desktop window, or the app's own HistoryRouter
  storage,
  workspace: { id: "acme", name: "Acme" },
  scopes: [inbox, projects, hosts, settings],   // modules; a module's `child` is its items, with `lenses`
  panels: [details, terminal],
})
<Shell shell={shell} appearance={createAppearance({ storage })} account={account}
  window={{ style: "mac", onMinimise, onMaximise, onClose }} status={<TitleBarItem … />} />
```

A place's view receives `{ shell }` and draws its header with `ShellViewHeader`, adding only its actions and the
header's middle. Read `loc()`, `selection()` and the rest from the registry, or `useShell()` inside a `Shell`.

- **Title bar, 44px.** From the left: the app icon alone (no chip), with `appMenu` as its menu. Then
  `HistoryArrows`, in a desktop window only (`runsIn="desktop"`). Then the `ScopePath`, from the workspace down,
  each one-of-a-kind segment with a `Switcher`. The `ScopeBox` sits on the window's absolute centre: a magnifier,
  then the scope's lenses (`LensSwitch`), or a search field when the scope has none. It moves only to clear the
  path or the right-hand items by 16px, then the path folds into "…", the lenses drop their labels and fold into
  `+N`. At the right are the status items (`TitleBarItem`) and the `WindowControls`, always last, on every
  platform. The library draws the controls and the app passes the handlers. A 1px tint line under the bar takes
  the hue of the lens that is on. In a browser tab (`runsIn="browser"`) there are no arrows and no window
  controls.
- **Lenses.** A lens is a way of looking at a scope, with its own places, panels and hue. ⌘1 to ⌘9 put them on,
  Customise hides and orders them, and `pinned: false` starts a plugin's lens hidden. Each lens remembers its
  place. Call them lenses in code, docs and UI copy.
- **Command palette.** ⌘K or the magnifier turns the box into `CommandPalette` in place. `:` lists lenses and `>`
  actions (`commands` on the scope or the workspace, plus the panels).
- **Sidebar header, 44px.** `[↑] [Filter… filling the width] [collapse all] [minimise]`. From a record ↑ goes to
  its list, elsewhere to the scope above. At the top it is disabled but keeps its place.
  The title bar's path shows the scope. The header has no scope name, switcher or back. ⌘F or / focuses the
  filter, which filters the tree in place, and Esc clears it.
- **Sidebar tree.** `Nav` at the drill size: 30px rows, 12px/500 labels, 15px icons, 8px gap, 11px counts. Child
  views start at the parent's label. Scope by drilling: a place with `enters` nests the scope it opens in the
  path, and the tree becomes that scope's places. Entering a scope opens it as the person left it. A place with few
  entries (open pull requests, sessions, chats) sets `entries`, and the tree lists its records or the scopes it
  enters under its row, so they open without the list. Past `limit` (8) the rest fold into "Show N more", which
  expands in place. Long lists, such as issues, stay in the view. A parent's fold chevron is at the row's end, in
  the count's place on hover. Its icon never changes.
- **One menu per record.** A container's list is a managed `RowList` or `DataTable` (selection, `rowMenu`, rename,
  remove with undo, an add action in the header). The place's `menu` (a scope's `menu` for its items) builds the
  same entries, so the record's sidebar entry opens the menu its row does.
- **Icon rail.** Minimise, ⌘B or ⌘\, or a drag below 140px folds the sidebar to a 48px rail: top-level places as
  icons with tooltips, a neutral dot for counts, the account's avatar at the foot, and one unfold button where ↑
  was. Below 900px window width (`foldBelow`) it starts folded. There is no show-sidebar button in the title bar.
- **The account** is an `AccountMenu` at the sidebar's foot: who is signed in, the app's items, "Appearance…"
  (`onAppearance`), the theme row, sign out.
- **View header, 44px.** At a place, its title. At a record, the trail in place of the title:
  `Issues / WEB-142 ⌄`. Crumbs that go up are `text-3`, the current one `text-1`, by colour only. The record crumb
  is a switcher over the list the person came from, in its order and filter, current one checked ("Switch
  issue…"). ↑/↓ and "4 / 10" at the right step the same list, as do J and K. There is no back chevron: the first
  crumb goes up, and so does Esc. A trail never repeats the path. A place whose view names its own record (a
  terminal workbench's tabs) sets `trail: false`. Never put a toolbar row under the header. A view switch goes in
  its middle.
- **Right rail and panels.** `PanelRail` (44px) at the window's right edge opens one `ShellPanel` at the view's
  right and one under it. A panel's 44px header holds its name or trail, real content tabs only (a terminal's
  sessions, on `TabStrip`), its actions and close. It never repeats the rail as tabs, and there is no split or
  tiling. A place's `covers` lists the panels its view already is: the rail hides them there and they come back
  after. A panel drills with `shell.drill("details", id)`, which is a stop in the history. The right panel
  floats over the view when docking leaves it under 480px.
- **Borders.** Every border between columns is a `ResizeHandle`: invisible until hovered, 4px hit area, only the
  dragged one lights, double click resets, widths kept by `createStoredWidth`.
- **History.** One list of stops for the window (scope, lens, place, view, record, panel drill), walked by ⌘[ ⌘],
  Alt+←/→, the mouse buttons, the desktop arrows or the browser's own. A run of lens switches is one stop. Each
  arrow's tooltip says where it goes, and a long press lists ten. Trails are structure, history is time: no surface
  gets its own back button.
- **Appearance.** `createAppearance({ storage })` with `AppearanceSettings`: theme System/Light/Dark, "Accent
  follows lens", "Lens tint line". It applies at once on `<html>`, so overlays take it too.
- **Keyboard model.** `Shell` binds one layer: ⌘K, ⌘[ ⌘], Alt+←/→, ⌘1 to ⌘9, ⌘B and ⌘\, ⌘F and /, ⌘J for the bottom
  panel, ⌥ and a panel's `key`, J and K, Esc. Parts inside it get `keys={false}`. Don't bind these again in a
  view.
- **Esc stack.** Esc closes the topmost thing: a menu, dialog or field first, then what a view registered with
  `shell.pushEsc` (a peek, a composer), the palette, a panel's drill, the open record (back to its list), the
  sidebar's filter.
- **No network code.** Routing, storage and the native window come in through adapters: `hashRouter()`,
  `memoryRouter()` or the app's `HistoryRouter`. `webStorage(localStorage)`, `memoryStorage()` or the app's
  `ShellStorage`. The `window` handlers. The library never touches `location`, `localStorage` or a native API.
- **`Dock` is a view's content,** such as a host's terminals side by side, never a part of the shell. Keep its
  layout (`dockLayout`, `dockAdd`, `dockSplit`, `dockSync`) in the app.
- **A `Skeleton` fades in after 400ms.** Show it only while there is nothing to show, not on a refresh of data
  already on screen.
- **Lists fill, documents centre.** Lists, boards, tables, forms and settings fill the main column from the left. A
  record that reads as a document (an issue, a pull request, a report, a message, a spec) is a centred reading
  column: `ViewLayout`'s `reading`, or the `nc-reading` class on its body when it shares a pane with its properties.

## The look

These hold in every view and every part. Check them before you call a view done.

- **Selection is a fill and a text colour.** Selected rows, current nav items, active tabs, segments and crumbs
  take the `--active` fill and step from `text-2` to `text-1`. Never an edge bar, an underline or an inset ring,
  and never a change of weight or size, so nothing reflows. A selected card takes a `--line-strong` ring.
- **Hover lightens.** Rows, nav items, chips and text buttons only lighten their text and icons. Icon-only buttons
  keep a faint `--hover` fill so their hit area shows.
- **The accent marks a few things only,** namely focus rings, the icon of the lens that is on, the tint line,
  checked switches and boxes, text links, and the palette's focus glow. A primary button is ink, filled with the
  text colour. Not for selection, counts, badges, unread dots, tags, progress, toggled buttons, menu checks, filter
  matches or drop lines. The accent follows the lens that is on, set on `<html>`.
- **One drill size.** The path, view titles and trails, panel names and trails, the box's labels, the bar's status
  items and the sidebar's labels are all 12px/500 on a 20px line. A title and the same label as a crumb share
  size, weight and baseline. Body 13px, page headings 15px, small labels 11px/500 in `text-3`, never in capitals.
  Tabular figures for counts, keys, dates and meters.
- **30px rows only.** There is no comfortable density. Every header is 44px.
- **Content swaps never animate, so nothing flickers.** A place, lens, record, tab or panel drill replaces the content in
  the same frame. Frames stay mounted and take new data, and nothing shows a transient fallback. Only things that
  appear fade (menus, popovers, the palette, dialogs, toasts), over `--dur-fade`.
- **Square viewport containers.** The view area, docked panels, sidebar and rail have no radius. Buttons, fields,
  chips, cards, selection fills and floating things keep theirs.
- **Text selection is neutral.** `::selection` is `--selection` and the caret is `text-1`, never the accent.
- **Tooltips are dark in both themes.**

## Overlays and controls

The caller keeps `open` or `value` and changes it in `onClose` or `onChange`.

- `Dialog` takes `open`, `onClose`, `title`, `description`, `footer` (buttons, the primary one last) and `size`. A form
  with unsaved input passes `closeOnBackdrop={false}`. It renders in place, in the top layer, without a portal.
- `Sheet` is a bottom sheet with `title`, `footer` and `detents`, and rests at its content's height by default.
  `ActionSheet` is for a short choice or a destructive confirmation.
- `DropdownMenu` takes a `trigger` and `items` (`MenuEntry[]`: items, separators, labels, choices). `Menu` is anchored
  to an element or a point. `RowMenu` and `ContextMenu` give a row its menu and its right click.
- `Select` takes `options`, and `Tabs` takes `items`. Segmented tabs switch a view and work like a radio group.
  `variant="underline"` tabs move between sections and take their `TabPanel`s as children. Their active tab is a
  fill too, with no underline.
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
