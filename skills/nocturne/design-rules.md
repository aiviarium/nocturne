# Design rules

The owner set these rules in reviews of the built product. Every app built with Nocturne follows them, from
Rookery's shell to Crow and each plugin. Where a part's page and a rule differ, follow the rule.

## Navigation

- Scope by drilling. Going into a domain, such as a space, a host or a project, drills the sidebar into that
  domain's places, and the domain is part of the address. The places change with the scope.
- Inside a domain the sidebar header has back and the domain's name with a switcher to its siblings. Switching to
  a sibling keeps the page when the sibling has it.
- Entering a domain opens its places and leaves the choice of page to the person.
- The core and the plugins contribute the navigation. Shell code reads their contributions for a plugin's places.

## Space and proportion

- Content gets the room. Chrome is small, and side columns are clearly narrower than the main one.
- A view has one bar at its top, its header.
- A card is as tall as its content.
- Rarely used actions go in a menu or behind an icon button in an existing row.
- Text and controls are drawn whole. Long text ends in an ellipsis with the full text in a tooltip, and a long list
  scrolls with its page.

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

- Backgrounds use the neutral `--bg-*` steps and hairlines. Hue goes in the foreground, in an icon, a dot or a
  word.
- A small chip or badge may have a slight tint with a stronger foreground of the same hue.
- A state on a card shows in its foreground, with a neutral outline.

## Lists

- Deleting a row is in its menu, with a confirmation or an undo.
- Selected rows take the neutral fill. The accent marks primary buttons, links, focus rings and unread rows.
- A dropdown hangs from its trigger, at least as wide as a select-like trigger.

## Phone

- Phones follow iOS conventions in Nocturne's look, such as push navigation with back and bottom sheets.
- Hit areas are 44pt, and visible controls stay compact.
