import type { JSX } from "@solidjs/web"
import { createMemo, omit, Show } from "solid-js"
import { cx } from "../lib/cx"

export interface PanelProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  /** The panel title, in the 44px header. */
  title?: JSX.Element
  /** Replaces the title with other header content, such as underline `Tabs`. Name the panel with `aria-label`. */
  header?: JSX.Element
  /** Next to the title: a `StreamState` or `State`. */
  state?: JSX.Element
  /** Right-aligned actions in the header: `IconButton`s and small `Button`s. */
  actions?: JSX.Element
  /** Only for pagination or totals. */
  footer?: JSX.Element
  /** Remove the body padding, for tables and lists that run edge to edge. */
  flush?: boolean
  /**
   * The panel fills a box its parent gives it: the body takes the rest of the height, a list scrolls inside it
   * and an empty state centres. Without it the panel is as tall as its content.
   */
  fill?: boolean
}

/**
 * A tool region: a bg-1 card with a 44px header (title, state, actions), content padded by the card padding
 * (12px) underneath and an optional footer. For a plain surface with an optional heading, use `Card`.
 */
export function Panel(props: PanelProps): JSX.Element {
  const rest = omit(
    props,
    "title",
    "state",
    "actions",
    "header",
    "footer",
    "flush",
    "fill",
    "class",
    "children",
  )
  return (
    <section
      data-part="panel"
      data-fill={props.fill ? "" : undefined}
      class={cx("nc-card nc-panel", props.class)}
      {...rest}
    >
      <header class="nc-panel-header" data-part="panel-header">
        <Show when={props.header} fallback={<h2 class="nc-panel-title">{props.title}</h2>}>
          {props.header}
        </Show>
        <Show when={props.state}>{props.state}</Show>
        <Show when={props.actions}>
          <span class="nc-panel-header__actions">{props.actions}</span>
        </Show>
      </header>
      <div data-part="panel-body" class={cx("nc-panel__body", props.flush && "nc-panel__body--flush")}>
        {props.children}
      </div>
      <Show when={props.footer}>
        <footer data-part="panel-footer" class="nc-panel__footer">
          {props.footer}
        </footer>
      </Show>
    </section>
  )
}

export interface FrameProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Remove the inner padding so the content runs to the frame edge. */
  flush?: boolean
  /** A header bar above the content, such as a `TabStrip`. The content then scrolls under it. */
  header?: JSX.Element
  /** The frame that has the person's attention among several: a stronger edge. */
  focused?: boolean
  /**
   * No edge, radius or fill: the frame is the view itself, as a lone log or terminal that runs to the view's edges.
   * Tile several frames with their edges.
   */
  bare?: boolean
}

/** A content frame: bg-1, radius 8, a hairline edge, with an optional header bar. For tiled frames such as a `Dock`. */
export function Frame(props: FrameProps): JSX.Element {
  const rest = omit(props, "flush", "header", "focused", "bare", "class", "children")
  // Read once, as in AppShell: the header is a TabStrip with state and listeners, and must not be built twice.
  const header = createMemo(() => props.header)
  return (
    <div
      data-part="frame"
      data-focused={props.focused ? "" : undefined}
      class={cx(
        "nc-frame",
        Boolean(props.flush || header()) && "nc-frame--flush",
        Boolean(header()) && "nc-frame--stacked",
        props.bare && "nc-frame--bare",
        props.class,
      )}
      {...rest}
    >
      <Show when={header()} fallback={props.children}>
        <div data-part="frame-header" class="nc-frame__header">
          {header()}
        </div>
        <div data-part="frame-body" class={cx("nc-frame__body", !props.flush && "nc-frame__body--padded")}>
          {props.children}
        </div>
      </Show>
    </div>
  )
}
