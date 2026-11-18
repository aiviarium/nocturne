import { createSignal, type JSX, onMount, Show } from "solid-js"
import { cx } from "../lib/cx"
import { pullRefreshes, rubberBand } from "../lib/gestures"
import { keyboardOpen, trackViewport } from "../lib/phone"

// Two small phone pieces: the area at the bottom of a screen that rides above the on-screen keyboard (a
// composer, a bar of buttons), and a scroll container with pull to refresh for lists outside a navigation
// screen (a `NavigationScreen` has its own, see `ScreenRefresh`).

/**
 * The bottom of a screen: it stays above the on-screen keyboard (the phone shell sizes itself to the visual
 * viewport, so the area only has to sit at the end of a column that fills it), and pads for the home indicator
 * while the keyboard is closed and nothing (a tab bar) is under it. `data-keyboard` is set while the keyboard is
 * open.
 */
export function BottomArea(props: {
  class?: string
  children?: JSX.Element
  /** A tab bar is under it, which pads for the home indicator itself. */
  aboveTabBar?: boolean
}): JSX.Element {
  trackViewport()
  return (
    <div
      class={cx("nc-bottom-area", props.class)}
      data-part="bottom-area"
      data-keyboard={keyboardOpen() ? "" : undefined}
      data-above-tabs={props.aboveTabBar ? "" : undefined}
    >
      {props.children}
    </div>
  )
}

/** A scroll container that refreshes when it is pulled down from the top. */
export function PullToRefresh(props: {
  onRefresh: () => Promise<unknown> | unknown
  class?: string
  children?: JSX.Element
  label?: string
}): JSX.Element {
  let el!: HTMLDivElement
  const [pull, setPull] = createSignal(0)
  const [busy, setBusy] = createSignal(false)
  onMount(() => {
    let y: number | null = null
    let d = 0
    el.addEventListener(
      "touchstart",
      (e) => {
        if (el.scrollTop > 0 || busy()) return
        y = e.touches[0]!.clientY
        d = 0
      },
      { passive: true },
    )
    el.addEventListener(
      "touchmove",
      (e) => {
        if (y === null) return
        d = e.touches[0]!.clientY - y
        if (d <= 0 || el.scrollTop > 0) return setPull(0)
        if (e.cancelable) e.preventDefault()
        setPull(rubberBand(d))
      },
      { passive: false },
    )
    const end = async () => {
      if (y === null) return
      y = null
      const go = pullRefreshes(d)
      setPull(0)
      if (!go) return
      setBusy(true)
      try {
        await props.onRefresh()
      } finally {
        setBusy(false)
      }
    }
    el.addEventListener("touchend", end)
    el.addEventListener("touchcancel", end)
  })
  return (
    <div
      ref={el}
      class={cx("nc-ptr", props.class)}
      data-part="pull-to-refresh"
      aria-label={props.label}
      style={pull() ? { "--nc-pull": `${pull()}px` } : undefined}
    >
      <Show when={pull() > 0 || busy()}>
        <div class="nc-screen__refresh" data-part="refresh" aria-live="polite">
          <span class="nc-spinner" role="status" aria-label={busy() ? "Refreshing" : "Pull to refresh"} />
        </div>
      </Show>
      <div class="nc-ptr__content">{props.children}</div>
    </div>
  )
}
