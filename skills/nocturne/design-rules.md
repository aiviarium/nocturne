# Design rules

The owner set these rules in reviews of the built product. Every app built with Nocturne follows them, from
Rookery's shell to Crow and each plugin. Where a part's page and a rule differ, follow the rule.

## Navigation

- The window is the shell from `createShell`. Apps don't add a top bar, a status bar or a second header.
- Scope by drilling. Going into a domain, such as a space, a host or a project, drills the sidebar into that
  domain's places, and the domain is a segment of the title bar's path and of the address.
- The title bar's path shows the scope once. The sidebar header has ↑ when there is a parent scope, the filter, collapse all
  and minimise, and no scope name or switcher. A one-of-a-kind segment of the path has a switcher to its siblings.
- Entering a domain opens it as the person left it, with the lens worn last and the place that lens remembers.
- Structure and time are separate. Trails and ↑ go up, and each crumb goes to what it names. Back and forward walk
  the window's one history. No view or panel has a back button of its own.
- A view at its place shows its title. A view at a record shows its trail, `Issues / WEB-142 ⌄`, with the record
  crumb as a switcher and the stepper at the right. A trail never repeats the path.
- Panels don't duplicate navigation. The rail picks them, and a panel's header has its name or trail, its real
  tabs and its actions, then close. A panel whose content the view already shows is hidden there (`covers`).
- The shell has no standing create button. A create action is the ghost plus in a view's header, or a command
  an app registers.
- The core and the plugins contribute scopes, lenses, places and panels to the registry. The shell derives the
  rest.

## Space and proportion

- Content gets the room. Chrome is small, and side columns are clearly narrower than the main one.
- A view has one bar at its top, its header. Every header in the window is 44px.
- Rows are 30px. There is no comfortable density.
- Viewport containers are square, such as the view area and the docked panels.
- A card is as tall as its content, and cards in a row of a grid share its height, with their footers at the
  bottom.
- Rarely used actions go in a menu or behind an icon button in an existing row.
- Text and controls are drawn whole. Long text ends in an ellipsis with the full text in a tooltip, and a long list
  scrolls with its page.

## Type

- One drill size, 12px/500 on a 20px line, for the path, view titles and trails, panel names and trails, the
  box's labels, the title bar's status items and the sidebar's labels.
- A label keeps its size, weight and baseline when it changes role, such as a place's title becoming the first
  crumb.
- State never changes type. Selected, current and hovered text keep their size and weight.
- Body 13px, page headings 15px, small labels 11px/500 in `--text-3` with no capitals. Counts, keys, dates and
  meters use tabular figures.

## Information

- Indicators mark the unusual. A state appears while something is wrong or running, and goes when it ends.
- A fact appears once on a screen.
- A tab, heading or navigation entry shows a count when there is something to count.
- An empty section is hidden. Where a first item must be addable, the section shows a small add control.
- Titles, labels, values and controls hold the meaning. An explanation goes in a tooltip, in an `InfoTip` beside
  the label (a field's, a setting's or a section's description), or in the docs.
- Text in a view is limited to titles, labels and values. Subtitles under titles, paragraphs above lists and help
  text under fields are left out.
- A view with nothing to show has one empty state: a short title and the action that starts it, with one short line
  at most.
- A view shows what the person can change or use. A setting they can't set at the scope shown is hidden, and so
  is a scope they can't set.

## Actions

- An action that adds an item to the view, such as Add host or New space, is a ghost icon button with the plus icon
  and a label that says what it makes, among the view's header actions. In a `ViewAction` that means
  `icon: "plus"` and leaving `primary` out.
- A primary button completes a flow, such as a dialog's submit or a sign-in.
- An empty state's starting action may be a secondary button with text.
- A choice between a few values in a toolbar, such as a scope, is a `Select`. Segmented tabs switch a whole view.

## Colour

- Backgrounds use the neutral `--bg-*` steps and translucent hairlines. Hue goes in the foreground, in an icon, a
  dot or a word. Headers and list group heads have no fill.
- Avatars, project and scope marks, status, priority and type glyphs, labels and charts keep their hues, because
  their colour means something.
- A small chip or badge may have a slight tint with a stronger foreground of the same hue.
- A state on a card shows in its foreground, with a neutral outline.
- The accent is used for focus rings, the icon of the lens that is on, the tint line, checked switches and boxes,
  text links and the palette's focus glow. Nothing else. A primary button is ink, filled with the text colour.
- The accent follows the lens that is on, across the whole window and its overlays, unless the person turns it off
  in Appearance.
- Text selection and the caret are neutral, never the accent or a lens's hue.
- Tooltips are dark in both themes.

## Lists and selection

- Selection is the faint neutral fill (`--active`) and a step up in text colour, from `--text-2` to `--text-1`.
  No edge bars, underlines or inset rings, and no change of weight or size. This holds for rows, nav items, tabs,
  segments and crumbs. A selected card takes a `--line-strong` ring.
- Hover on rows, nav items, chips and text buttons only lightens text and icons. Icon-only buttons keep a faint
  `--hover` fill.
- Unread dots, counts, filter matches and drop lines are neutral.
- Deleting a row is in its menu, with a confirmation or an undo.
- A dropdown hangs from its trigger, at least as wide as a select-like trigger.

## Motion

- Content swaps never animate. Switching a place, a lens, a record, an inbox item, a tab or a panel's drill
  replaces the content in the same frame, with no fade, blank frame or late placement.
- Frames stay mounted and take new data. There are no transient fallbacks, and the layout settles in the frame
  the address changes.
- Only things that appear fade, such as menus, popovers, the palette, dialogs and toasts.
- Hover changes colour only. Under reduced motion nothing moves or fades.

## Phone

- Phones follow iOS conventions in Nocturne's look, such as push navigation with back and bottom sheets.
- A trail's parent crumb becomes the screen's back button. Time is the system's back gesture.
- Hit areas are 44pt, and visible controls stay compact.
