# Phones

`PHONE_QUERY` in `src/lib/phone.ts` decides when a window counts as a phone: at most 720px wide, or a touch
screen in landscape under 500px tall. A narrow desktop window gets the same layout without touch. In phone
mode `lib/phone.ts` sets `data-phone` on the document element and `usePhone()` returns true. `PhoneOverride`
forces either answer for a subtree.

## The compact phone scale

Every part takes this scale by itself on a phone, so a view built from the parts doesn't need phone code.
The numbers are `PHONE_SCALE` in `src/lib/phone.ts` and the `--phone-*` variables in `src/styles/phone.css`.
Change both together. Sizes are CSS pixels (iOS points).

| What | Size |
| --- | --- |
| Navigation bar | 44px, 36px in landscape |
| Tab bar | 50px without the home indicator, 36px in landscape |
| Smallest hit area | 44px (the visible control may be smaller) |
| Bar button glyph, compact control | 30px |
| List row | 44px one line, 58px two lines |
| Side gutter | 12px |
| Gap between groups | 20px |
| Large title | 26/32, weight 700 |
| Bar title | 15/20, weight 600 |
| Body | 15/20 |
| Secondary text | 13/18 |
| Caption | 11/14, weight 500 |
| Tab label | 10/12, weight 500 |
| Text fields | 16/22, so Safari does not zoom in |

## Proportions

`PHONE_BOUNDS` holds the proportions a phone screen keeps, for browser tests to check:

- With the keyboard closed, the navigation bar and the tab bar together take at most 12% of the screen's
  height in portrait and 20% in landscape, not counting the safe-area insets.
- A bar's title is no larger than the body text and no heavier than 600. A large title is at most 1.8 times
  the body size.
- There is one bar at the top and one at the bottom, never a second bar stacked on either.

## Navigation

A phone app has a tab bar, a navigation stack for each tab, and one navigation bar for each screen. The bar
has the back control, the title and at most two actions. List and root screens have a large title. A view
built from `ViewLayout` and `ViewHeader` gets this with no extra code.

A drill-down on a desktop is a stack on a phone. In the app shell the sidebar is a drawer and the right panel
covers the view. The panel rail is hidden. The trail's parent crumb becomes the screen's back control, named
after the parent. `ViewHeader` doesn't show the trail or the stepper there, because the stack is the way back.
Time is the system's back gesture, and where the two differ, the gesture decides.

## Sheets and lists

Sheets come from the bottom with a grab handle. A sheet rests at the height of its content, up to nearly the
whole screen, and taller content scrolls inside it. A long list can rest at medium and large instead: drag or
press the handle between them, or drag down to dismiss. Destructive confirmations and short choices are action
sheets. Grouped inset lists hold settings and pickers. `Sheet` and `ActionSheet` draw the sheets, and
`InsetList`, `InsetGroup` and `InsetRow` the grouped lists.

## The on-screen keyboard

`trackViewport()` follows the visual viewport and keeps `--nc-keyboard`, `--nc-vv-height` and `--nc-vv-top` on
the document element. `BottomArea` stays above the keyboard; `keyboardOpen()` and `keyboardInset()` give the
same facts to code. A test that swaps in a visual viewport of its own can dispatch an `nc:viewport` event on
`window` to make the module read it.

`PullToRefresh` refreshes a list pulled down from its top, and `ScreenRefresh` gives a screen of a
`NavigationStack` the same.
