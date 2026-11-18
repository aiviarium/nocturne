# Nocturne

Nocturne is a dark-first design system for dense tool interfaces, and `@aiviarium/nocturne` is its SolidJS
component library: typed wrappers over the `nc-*` classes, plus layout, overlay, data, form and phone
components and a collaborative rich text editor. The stylesheets in `src/styles/` are the design system itself:
`tokens.css` holds the tokens and `bundle.css` the base classes.

## Install

The package is not published to a registry yet. Add it from a Git checkout or a packed tarball:

```sh
bun add solid-js
bun add @aiviarium/nocturne@file:../nocturne   # or a tarball from `bun pm pack`
```

`solid-js` 1.9 is a peer dependency. The package contains TypeScript sources (`exports` points at `src/index.ts`),
so build it with a bundler that compiles Solid JSX, such as Vite with `vite-plugin-solid`.

```ts
import "@aiviarium/nocturne/styles/index.css"
import { Button, DataTable, Composer } from "@aiviarium/nocturne"
```

`styles/index.css` loads `tokens.css`, `bundle.css` and `extra.css` in cascade layers (`reset`, `tokens`,
`components`, then `app` for your own CSS). Import each file yourself if you manage layers another way.

## Theming

```html
<div class="nc" data-theme="dark" style="--accent: #8b7cf6">…</div>
```

- Put `class="nc"` and `data-theme="dark"` or `data-theme="light"` on the app root.
- Set `--accent` on that element to change the accent. `ACCENTS` and `accentValue()` give the six presets the
  gallery offers.
- Popovers, menus, dialogs, tooltips and toasts mount inside the nearest `[data-theme]` element, so they
  inherit theme and accent.
- Component roots have a stable `data-part` attribute. Props are documented with TSDoc.

## What is in it

- Layout: `AppShell` (sidebar, top bar, status bar, phone drawer), `Frame` (with a `TabStrip` header),
  `ViewLayout` and `ViewHeader`, `Panel`, `Split` and `SplitGroup` (draggable, keyboard-resizable dividers),
  `Dialog` (centred, bare, near the top, or a bottom sheet). `LinkProvider` sends `NavItem` and `Button` links
  through your router.
- Overlays stack in a fixed order, lowest first: the phone drawer, the dialog's scrim, popovers, tooltips and
  toasts. A `Select`, menu or tooltip opened in a `Dialog` shows above it.
- `SchemaForm` builds a form from a JSON Schema (strings, numbers, booleans, enums, optional fields, nested
  objects, arrays of scalars, and arrays of small records as a `DataList`) and says what is wrong under each
  field. Secret strings (`writeOnly`, `format: "password"`, or the names in `secretFields`) are password inputs;
  those in `storedSecrets` already hold a value, are not required and are left out when blank. `x-multiline`
  strings are text areas. Numbers are `NumberField`s (`x-unit` for the unit). A number with both bounds and
  `"x-control": "slider"` is a `Slider` with its field.
- `RichTextEditor` is one editor for every rich text (documents, descriptions, comments, `richtext` fields):
  ProseMirror with one schema (`richTextSchema`), bound to a collaborative Yjs document (`provider`) or to a
  JSON value (`value`, `onChange`). It has block handles and a block menu, the `/` insert menu, a format bar,
  `@` mentions, `[[` page links, Markdown shortcuts and paste, tables, images and files, block types the app
  adds, remote cursors, read-only mode, `page`, `field` and `comment` variants and a phone layout. Top-level
  blocks of a `page` editor are `reading`, `wide` or `full` (`src/editor/width.ts`); the host sets the text
  column with `--nc-editor-measure` and the side space with `--nc-editor-inset`. The editor has no network
  code: mentions, chips, previews, uploads, the writing assistant's model call (and its wording, `aiCopy`),
  dictation and added block types come from `EditorServices` (`EditorServicesProvider`, or the `services`
  prop). `toMarkdown` and `parseMarkdown` convert documents to and from Markdown. Styles are
  `src/styles/editor.css`.
- `QueryBuilder` edits a `QueryGroup` (`src/lib/query.ts`): rules of field, operator and value in AND/OR groups
  one level deep. `toWhere` turns it into a structured `where` filter (text `contains` comes back as a
  `residual` for `matchQuery`, relative dates resolve against `now`), `fromWhere` reads one back, and
  `parseQueryText`/`printQueryText` read and write a query bar's text form. `NumberField`'s arithmetic is
  `evaluateExpression` (`src/lib/expression.ts`), a parser with no `eval`.
- `Composer` is a contenteditable field: picked `/` commands, `@` mentions and `$` skills are atomic chips, and
  its value is a list of text and chip segments (`ComposerValue`).
- Icons: `<Icon name="home" />` (the 48 core icons in `icons/`) or `<Icon node={Camera} />` with any icon from
  `lucide`.
- The phone layout and its scale are described in [docs/phone.md](docs/phone.md).
- CSS that the bundle lacks is in `src/styles/extra.css`, `parts.css` and the other files next to it.

## Which part for what

<!-- vale off -->

Build every view from these parts, so views look and behave alike however many teams or modules write them.
Do not restyle a part for one view: if it lacks something, add a variant here. Sizes are the tokens in
`src/styles/tokens.css` (`--control-*`, `--row-*`, `--header`, `--space-*`, `--radius-*`); on a phone each part
takes the phone scale by itself (`src/lib/phone.ts`, [docs/phone.md](docs/phone.md)).

| You are showing | Use | Size and rules |
| --- | --- | --- |
| A view's frame | `ViewLayout`, `ViewHeader` | Header 38px. Actions in one order: icon actions, pin, overflow, the primary action, the panel toggle. The view's name is in the tab, never repeated as a heading |
| A list of things | `RowList` + `ListRow` | `density="compact"` 30px (default), `"comfortable"` 36px; `lines={2|3}` for rows that carry more (title 13/20, secondary 12/16, 6px vertical padding; the time ends the first line, the state the second); 44px and 58px on a phone. Leading `icon` (16px) or `leading` (an `Avatar size="sm"`) in a fixed 20px box, `title`, `secondary`, then `status` (one `State`), `meta` (text-3, a time or count), `actions` (`IconButton size="sm"`, shown on hover, focus and selection; on a phone or touch screen they take no width and are a left swipe and a long-press menu away) or `persistentActions` (answer buttons, always shown); `leadingActions`/`trailingActions` are swipe actions and `menu` the context menu. The rows of a `RowList` share one grid (a subgrid each), so icons, titles, states, times and actions each line up down the list; the title keeps the width of the longest title, up to 40% of the row, before the trailing columns take theirs, and the secondary text gives way first. `selected` is the inset fill (bg-4, 6px from the list's edge); `unread` bolds the title and puts a dot at the row's leading edge inside the fill (pass `unread={false}` on the read rows of a list that tracks it, so the dot's column stays and nothing moves); `muted` dims it; `movable={false}` pins a row in a list with `onReorder`; no row has a grip or a delete button (the row itself is dragged, and Delete is in its menu and on the Delete key). With `href` or `onClick` the whole row is one link or button. `RowList items={…}` virtualises past 150 rows (give it a height); its rows then take the widest trailing cell seen so far for each column. `divided` adds hairlines for multi-line rows. `density` and `variant` are the list's: `inset` in a card, panel or inspector at any depth (titles on the container's text edge, the fill 6px from its edge), `inline` in a property value or form (28px rows on the content's edge), `boxed` as a group of its own. The arrow keys, Home and End move between rows (one tab stop). With `items` and `getKey`: `onReorder(from, to)` (the row itself: a press that moves past 4px, on touch a move after the long press that opened its menu, Alt+arrow; a drop line, auto-scroll; indices of `items`, so it works virtualised), `selectable` (a click opens, Cmd/Ctrl+click toggles, Shift+click a range, Shift+arrow extends, Space, Cmd/Ctrl+A, Escape; a bar at the foot only while something is selected, with `bulkActions`), `onRemove` (the Delete key, Delete in the menu, a swipe; return an undo for a toast), `onAdd` (an add row), `editing` (iOS edit mode: a selection circle, then the content), `rowMenu` (the context menu: a right click, the Menu key or Shift+F10, a long press; on a row of a selection of several it acts on the selection, any other row is selected alone first; default Open, the row's actions, Rename and Delete, or for a selection the bar's actions and "Delete 3"). A row's `onRename` edits its title in place (F2, double click); a row's `children` nest under it as a tree. A table of columns is `DataTable` (rows 30/36) |
| Records in lanes | `Board`, `BoardLane`, `BoardCard` | Lanes 272px side by side, scrolling sideways inside the board when they do not fit, never squeezed; a lane's head 30px (dot or icon, name, count, add), a drop highlight. A card is a fixed 112px slot: top row (a key, a person), a title clamped to two lines, the meta row on the bottom edge (`BoardCardTop`/`Title`/`Meta` for an entity's card renderer). `fill` in a board view (lanes scroll inside, `placed` cards for virtualised lanes); in a document lanes are as tall as their cards. Below 560px of the board's own width (a container query; `useBoard().stacked()`), grouped lists with 44px rows. Selection a neutral fill, the cursor the focus ring |
| A table of records | `DataTable` | Rows 30px compact, 36 comfortable; sortable columns; `selectable` (a click opens, Cmd/Ctrl and Shift select; checkboxes shown on hover, focus and while something is selected; select-all; a neutral fill; the toolbar becomes the bulk bar only while something is selected); `onReorder` (the row itself, a drop line, auto-scroll, Alt+arrow; only while not sorted by a column); `onRemove` with Undo; `rowMenu`, as a `RowList`'s. One tab stop, the arrows between rows. Not for a list of things with one title each: that is a `RowList` |
| Records edited in place | `DataList` | Tags and URLs (one field), environment variables (`fields`: a name and a value), any record of a few short fields. The compact form in a form (`boxed`, a field-like box) or an inspector (`inline`, rows on the edge); `variant="table"` with a header row for many records. Selects, reorders, removes with Undo, adds and moves by keyboard as a `DataTable` does, and has the same row menu; in a field the keys are the caret's (Enter, Backspace, the arrows), Escape goes to the row. An iOS form group on a phone. `SchemaForm` uses it for arrays of strings and of small records. Not for records that open: those are a `RowList` with `onAdd` |
| A surface with content | `Card` | Padding 12px (`--nc-pad`), radius 8, `line-soft` edge, bg-1 (`nested` bg-2). As tall as its content; `fill` when a grid gives it a box (the body takes the height: a `RowList` scrolls inside, an `EmptyState` centres, a lone `Stat` keeps its label and figure at the top, the figure 32px in a tall box, and its chart takes the rest). `title`/`count`/`action` put a `SectionHeading` inside. `padding="none"` for media or edge-to-edge tables. `href`/`onClick` make the whole card one link. A card inside a card, or a list in a card, does not add a second padding |
| A tool region with a header | `Panel` | Header 38px with title, `state`, `actions`; body padded 12px; `footer` only for totals or pagination; `fill` as for `Card`; `flush` for a table or terminal |
| A section's heading | `SectionHeading` | One treatment: 13px semibold text-1, in a 24px row; `count` (a total in text-3) and one `action` at the right (a ghost `Button size="sm"`, an `IconButton size="sm"`, a link, or a `State`). Not 16, 20 or 26px. Group labels in a sidebar or menu are the nav label (11px text-3), not a section heading |
| An action | `Button` | `md` 28px (forms, panels, dialogs), `sm` 24px (dense rows, list rows, table bars, toolbars), `lg` 32px (empty states). Radius 6 at every size. `primary` is for the one action that completes a flow: a dialog's or form's last button, a row's answer, a sign-in. Adding an item is a ghost plus `IconButton` among the view's header actions (the navigation bar's trailing actions on a phone), never a primary or text button; an empty state's starting action is a secondary `Button`. `accent` starts AI work, `danger` destroys |
| An icon-only action | `IconButton` | 28px with a 16px icon, `size="sm"` 24px with 13px. `label` is required: it is the accessible name and the tooltip, so no icon-only control goes unexplained. Never a bare `<button>` with an icon |
| Text edited in place | `InlineField` | A title (`variant="title"`, 20/28, `multiline` to wrap), a property value (`text`, 28px), an ID or path (`mono`). Text at rest, bg-3 on hover, the edge and focus ring on focus; Enter commits, Escape reverts, blur commits. Not a raw `<input>` styled flat |
| A form field | `TextField`, `TextArea`, `Select`, `Switch`, `SchemaForm` | 30px fields with the label above in 12px text-2 |
| A number | `NumberField` | 30px like the other fields; `variant="inline"` 28px in a `PropertyList` or a table cell. Takes sums (`12*4`, `100-15%`, `+5` from the value, `1.5h` with `units`); arrow keys step (Shift ten, Alt a tenth); drag the label, or the field at rest with a mouse, to scrub; a click places the caret, Tab selects the value; `steppers` stacked at the end on a desktop, − and + around the value on a phone. The unit is `unit`, after the number, never in the label. Unreadable input keeps the old value and says why |
| A bounded value, roughly | `Slider`, `RangeSlider` | A 28px row, 4px track, 14px thumb, the value at the label's right; `ticks` and `marks` for named steps; `field` for the exact number. 44px hit area and a 22px thumb on a phone. Not for exact numbers over a large range |
| Label and value pairs | `PropertyList` | Label column 120px (or `labelWidth="auto"`) in 12px text-3, values in text-1, rows 28px so an `InlineField` or `Select` keeps the row; an empty value is an em dash, never "None" |
| Search and filters | `FilterBar` | One row that wraps: `search` first (grows, 220–420px), then segmented `Tabs`, `Select`s and `Switch`es at their width, `end` at the right (a count, Clear). A filter's name is inside the control (its value, or `aria-label`), never a caption above it. On a phone the filters scroll sideways under the search field |
| Filters over a list's fields | `QueryBuilder` | In the `FilterBar`: a 30px chip per rule ("State is Open", "Estimate > 3") opening a popover, "Filter" to add one, the grouped AND/OR builder behind the sliders button. Fields typed by a schema (`QueryField`); `toWhere`/`fromWhere` convert to the store's `where`. On a phone one sheet of grouped rows |
| State of an item | `State` | A dot plus a word, everywhere; the word is coloured only for warn and error; only `live` and `ai` glow. One per row, in `ListRow`'s `status`. Show it only when it is out of the ordinary (no "Live", "Idle", "Ready" on every row) |
| A kind, category or count | `Badge`, `LabelChip`, `Count` | A badge is for a kind ("Draft", "Admin") or a category, never for a state that a `State` shows; never two treatments for the same fact in one list. `Count` (accent) is an attention count; totals are plain text-3 numbers |
| Facts about an item | `MetaLine` | One line in 12px text-3 joined by " · ", empty parts dropped, cut at the end with the full line as its title. No state, nothing always true ("Created today") |
| A figure | `Stat` (in a `Card`), `StatCard` | Value 24px tabular (32px when it fills a tall box), unit 12px text-3, label 12px text-2, a signal at the right of the label. In a box it fills (a `fill` card's lone `Stat`, `StatCard fill`) the label and figure stay at the top and a chart (`WidgetSparkline`) or meter takes the rest of the height, never a gap above the figure |
| Nothing to show | `EmptyState` | `md` for a whole view or main column, `sm` in a card, panel or section. Only a whole view, or a list the person filtered, gets one: an empty part of a view renders nothing |
| Text that may not fit | `Truncate` | One line (or `lines`) with an ellipsis and the full text as its title. Every part above that cuts text (row titles, meta lines, crumbs) already does |
| A live value | `Widget` | Radius 20, one hue, only the moving part glows. `fill` in a grid cell: the title at the top, a sparkline or list grows, a bar, strip or gauge sits with the caption at the bottom |
| A page of widgets | `WidgetGrid` | 12 columns of 80px rows; drag and resize while `editing`. Outside editing it draws the stored layout compacted: items in `empty` (nothing to show) take no space, each item is as tall as its content up to its size (`fit`, default on), items of one height on one row end on one line, everything moves up. Every card on it takes the widget frame (18/20px padding, radius 20) |

**Focus.** Every interactive element shows the focus ring (`--focus-ring`) on keyboard focus; the parts above
draw it themselves, and a global rule in `parts.css` gives it to any other button, link, tab or field inside
`.nc`. Do not set `outline: none` without a replacement.

**Contrast.** `text-3` is the faintest text colour for anything a person reads; `text-4` is for disabled and
decorative marks only (separators, an empty value's dash). Status text on a tint uses the `-ink` shades in light.

**Colour: surfaces stay neutral.** Cards, panels, rows, strips, banners and callouts are the neutral `bg-*` steps
with hairlines; hue goes in the foreground: an icon, a dot and a word (`State`), the text's ink. A small inline
chip or badge may keep a slight tint with a stronger foreground of the same hue (the mention chip's treatment:
`Badge`, `LabelChip`, the composer's tokens, the "Modified" chip). Coloured fills are for icon tiles and buttons
(an accent or danger button, the tile behind an icon). Never a hue edge around a hue fill (a danger button has no
red edge), and never a hue edge as the only mark of a state on a card (an approval card's edge is a hairline; its
state is its dot and word). Selection and hover are neutral fills (bg-4, bg-3), as are the table's selected rows
and its bulk bar, a running tool step (the hue is in its text) and the composer while the assistant works.
`bundle.css` still carries status tints behind callouts, approval cards, the bulk bar, selected table rows and
running steps, and hue edges around danger buttons and stream pills; `src/styles/parts.css` overrides those rules
("Colour: surfaces stay neutral").

**Spacing.** Spacing is the 4px grid (`--space-*`), plus three values the library uses on purpose: 6px (the
selection inset, a row's inner padding, the gap in a `MetaLine`, the radius of controls), 10px (the gap between an
icon and its label in navigation and menus) and 14px (the larger widget and panel insets).
Anything else is a mistake.

<!-- vale on -->

## Commands

| Command | What it does |
| --- | --- |
| `bun install` | Installs the dependencies |
| `bun run gallery` | Component gallery on `127.0.0.1:4800`, one page per component, theme switch and six accent presets |
| `bun run gallery:build` | Builds the gallery into `gallery/dist` |
| `bun test` | Behaviour tests with happy-dom (no layout, caret or IME) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | Biome |
| `bun run lint:tokens [path ...]` | Fails on hard-coded colours, radii or font sizes in `.css`/`.tsx`/`.ts` under the paths (default `src gallery examples`). `lint-tokens-ignore` on a line opts out. Apps can run it on their own folders |
| `bun run gen:icons` | Regenerates `src/components/icon-data.ts` from `icons/*.svg` |
| `scripts/screenshots.py`, `scripts/screenshot-states.py` | Playwright (Python) screenshots of every gallery page and of interactive states; `--chrome PATH` uses an installed Chrome |

## Moving from earlier names

These older names still work alongside the new ones:

| New | Also read |
| --- | --- |
| `--nc-editor-measure`, `--nc-editor-inset`, `--nc-editor-gutter-start`, `--nc-editor-gutter-end` | `--crow-editor-*` of the same names |
| `localStorage` key `nc.viewLayout.v1` | `crow.viewLayout.v1`, while the new key is empty |
| Cascade layer `app` | `shell` and `plugins`, which stay in the layer order after `app` |

The editor's classes are `nc-editor`, `nc-editor__content` and `nc-editor-*` (callouts, code blocks, images,
cursors and the rest). The older `crow-*` classes are no longer added.

## Third-party code

`src/components/lucide-data.ts` holds icon data from [Lucide](https://lucide.dev), ISC licence.
