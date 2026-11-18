import type { JSX } from "solid-js"

/** What an example file exports besides its component. */
export interface ExampleMeta {
  /** The gallery's section title and the site's caption. */
  title: string
  /** One or two sentences under the title. */
  note?: string
  /**
   * For the design rules' pairs: `do` is the right way, `dont` the wrong way it is compared with. The site and the
   * gallery label each one and edge a `dont` in the danger colour. Every example in `examples/design/` sets it.
   */
  verdict?: "do" | "dont"
  /**
   * What the example sits on. `card` (default): a padded bg-1 surface, as in a view. `well`: a padded bg-0
   * surface, as the canvas between frames. `none`: the example brings its own surface (a table, a panel).
   */
  surface?: "card" | "well" | "none"
  /**
   * Shown on a phone: the gallery in a phone frame, the site in an iframe at a phone's width, in an iPhone's
   * device frame with its safe-area insets. The example is the content of a screen (a navigation bar titled with
   * the part's name above it, the gutter around it) unless it says `screen`.
   */
  phone?: boolean
  /**
   * The example draws a whole phone screen itself (a `NavigationScreen` or `NavigationBar`, a tab bar, a stack),
   * so it brings the navigation bar and takes the safe areas. Set it only for that: the phone frame puts a screen
   * around every other example. A browser test can check every phone example against it.
   */
  screen?: boolean
  /** Toasts it raises need a region next to it. */
  toasts?: boolean
  /**
   * Why the site shows it in an iframe of the gallery's /frame route instead of a shadow root. Set for parts
   * whose caret and selection code reads `window.getSelection()` and `document.activeElement`, which do not see
   * into a shadow root.
   */
  frame?: string
  /** Height of the frame on the site, for `phone` and `frame` examples (px). */
  height?: number
}

export interface ExampleModule {
  default: () => JSX.Element
  meta: ExampleMeta
}
