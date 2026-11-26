// The window's own buttons, drawn by the library at the title bar's right end on every platform. The app passes
// the handlers that talk to its native window; the library calls nothing itself.
import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Icon } from "../components/Icon"
import { cx } from "../lib/cx"

export interface WindowControlsProps {
  /** `mac`: three dots, neutral until the group is hovered. `win`: minimise, maximise and close, 46px each. */
  style?: "mac" | "win"
  onMinimise?: () => void
  onMaximise?: () => void
  onClose?: () => void
  /** The window fills the screen: the maximise button reads "Restore". */
  maximised?: boolean
  class?: string
}

/** Minimise, maximise (zoom) and close, in the platform's arrangement. */
export function WindowControls(props: WindowControlsProps): JSX.Element {
  const style = () => props.style ?? "mac"
  const zoom = () => (props.maximised ? "Restore" : style() === "mac" ? "Zoom" : "Maximise")
  return (
    <div
      data-part="window-controls"
      data-style={style()}
      role="group"
      aria-label="Window"
      class={cx("nc-window", props.class)}
    >
      <Show
        when={style() === "win"}
        fallback={
          <>
            <button
              type="button"
              class="nc-window__dot"
              data-k="close"
              aria-label="Close window"
              onClick={() => props.onClose?.()}
            />
            <button
              type="button"
              class="nc-window__dot"
              data-k="min"
              aria-label="Minimise"
              onClick={() => props.onMinimise?.()}
            />
            <button
              type="button"
              class="nc-window__dot"
              data-k="zoom"
              aria-label={zoom()}
              onClick={() => props.onMaximise?.()}
            />
          </>
        }
      >
        <button
          type="button"
          class="nc-window__btn"
          data-k="min"
          aria-label="Minimise"
          onClick={() => props.onMinimise?.()}
        >
          <Icon name="minus" size="sm" />
        </button>
        <button
          type="button"
          class="nc-window__btn"
          data-k="zoom"
          aria-label={zoom()}
          onClick={() => props.onMaximise?.()}
        >
          <Icon name="square" size="sm" />
        </button>
        <button
          type="button"
          class="nc-window__btn"
          data-k="close"
          aria-label="Close window"
          onClick={() => props.onClose?.()}
        >
          <Icon name="close" size="sm" />
        </button>
      </Show>
    </div>
  )
}
