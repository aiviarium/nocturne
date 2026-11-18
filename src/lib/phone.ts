// The phone layout's facts, in one place: when a window counts as a phone, the compact phone scale, the
// proportion bounds a browser test can check, and the visual viewport (the on-screen keyboard). Components read
// `usePhone()`; CSS reads `:root[data-phone]` and the `--nc-keyboard`, `--nc-vv-height` and `--nc-vv-top`
// variables this module keeps on the document element. A narrow desktop window is a phone too: same layout,
// without touch.
import { createContext, createSignal, useContext } from "solid-js"

/**
 * A phone: a window up to 720 px wide, or a touch screen in landscape that is less than 500 px tall (an iPhone
 * on its side is 844 or 932 px wide, but still a phone). A short, wide desktop window with a mouse is not.
 */
export const PHONE_QUERY = "(max-width: 720px), (max-height: 500px) and (hover: none) and (pointer: coarse)"

/**
 * The compact phone scale (docs/phone.md). The same numbers are CSS variables in `styles/phone.css`
 * (`--phone-*`); change both together. Sizes are CSS px (iOS points).
 */
export const PHONE_SCALE = {
  /** The navigation bar at the top of a screen. iOS uses 44. */
  bar: 44,
  /** The navigation bar in landscape, where height is short. */
  barCompact: 36,
  /** The tab bar, without the home indicator's inset. iOS uses 49. */
  tabBar: 50,
  /** The tab bar in landscape: icon and label side by side. */
  tabBarCompact: 36,
  /** The smallest hit area of anything tapped. The visible control may be smaller; the rest is invisible. */
  hit: 44,
  /** Visible size of a bar button's glyph and of a compact control (a pill button, a chip). */
  control: 30,
  /** A one-line list row, and a two-line one (title and secondary text). */
  row: 44,
  rowTwoLine: 58,
  /** The side gutter of screens and inset lists, and the gap between groups. */
  gutter: 12,
  groupGap: 20,
  /** Type: [size, line height, weight]. */
  type: {
    largeTitle: [26, 32, 700],
    barTitle: [15, 20, 600],
    body: [15, 20, 400],
    secondary: [13, 18, 400],
    caption: [11, 14, 500],
    tabLabel: [10, 12, 500],
    /** Every text field: Safari zooms into a field whose text is under 16 px. */
    input: [16, 22, 400],
  },
} as const

/**
 * The proportions the phone keeps (docs/phone.md), for browser tests to check against. With the keyboard closed, the chrome
 * (the navigation bar plus the tab bar, not counting the safe-area insets) takes at most `chromeShare` of the
 * screen's height in portrait and `chromeShareLandscape` in landscape; the content has the rest. A bar's title
 * is at most `titleToBody` times the body size and no heavier than `titleWeight`; a large title at most
 * `largeTitleToBody` times. There is one bar at the top and one at the bottom, never a second bar stacked on
 * either.
 */
export const PHONE_BOUNDS = {
  chromeShare: 0.12,
  chromeShareLandscape: 0.2,
  titleToBody: 1,
  titleWeight: 600,
  largeTitleToBody: 1.8,
} as const

/** Overrides the media query below it (the gallery shows phone pieces on a desktop page). */
export const PhoneOverride = createContext<boolean>()

const [phoneNow, setPhoneNow] = createSignal(false)
let watching = false

function watch() {
  if (watching || typeof window === "undefined" || typeof window.matchMedia !== "function") return
  watching = true
  const mq = window.matchMedia(PHONE_QUERY)
  const apply = () => {
    setPhoneNow(mq.matches)
    if (mq.matches) document.documentElement.dataset.phone = ""
    else delete document.documentElement.dataset.phone
  }
  mq.addEventListener?.("change", apply)
  apply()
}

/** Whether the window is a phone (or the nearest `PhoneOverride` says so). Reactive. */
export function usePhone(): () => boolean {
  const forced = useContext(PhoneOverride)
  watch()
  return () => forced ?? phoneNow()
}

/** The same outside a component. */
export function isPhone(): boolean {
  watch()
  return phoneNow()
}

// ── the visual viewport ─────────────────────────────────────────────────────────────────────────────

/** How tall the on-screen keyboard is (or anything else covering the bottom of the layout viewport). */
const [keyboard, setKeyboard] = createSignal(0)
let tracking = false

/** The keyboard's height in px; 0 when it is closed. Reactive. */
export function keyboardInset(): number {
  trackViewport()
  return keyboard()
}

/** Whether the on-screen keyboard is open (more than 80 px of the screen covered). Reactive. */
export function keyboardOpen(): boolean {
  return keyboardInset() > 80
}

/**
 * Follows the visual viewport, which shrinks when the on-screen keyboard opens (the layout viewport does not, on
 * iOS), and keeps three variables on the document element for CSS: `--nc-vv-height` (the visible height),
 * `--nc-vv-top` (how far iOS scrolled the visual viewport) and `--nc-keyboard` (what is covered at the bottom).
 * `data-keyboard` is set while it is open. Reads `window.visualViewport` each time, so a test can replace it.
 */
export function trackViewport(): void {
  if (tracking || typeof window === "undefined") return
  tracking = true
  const update = () => {
    const vv = window.visualViewport
    const root = document.documentElement
    const layout = window.innerHeight
    if (!vv) {
      setKeyboard(0)
      return
    }
    const covered = Math.max(0, Math.round(layout - vv.height - vv.offsetTop))
    setKeyboard(covered)
    root.style.setProperty("--nc-vv-height", `${Math.round(vv.height)}px`)
    root.style.setProperty("--nc-vv-top", `${Math.round(vv.offsetTop)}px`)
    root.style.setProperty("--nc-keyboard", `${covered}px`)
    if (covered > 80) root.dataset.keyboard = ""
    else delete root.dataset.keyboard
  }
  let bound: VisualViewport | null = null
  const bind = () => {
    const vv = window.visualViewport ?? null
    if (vv === bound) return
    bound?.removeEventListener("resize", update)
    bound?.removeEventListener("scroll", update)
    bound = vv
    vv?.addEventListener("resize", update)
    vv?.addEventListener("scroll", update)
  }
  bind()
  window.addEventListener("resize", () => {
    bind()
    update()
  })
  // Tests swap the visual viewport for one they drive; they announce it with this event.
  window.addEventListener("nc:viewport", () => {
    bind()
    update()
  })
  update()
}
