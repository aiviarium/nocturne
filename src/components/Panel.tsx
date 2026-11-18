import { createMemo, createSignal, type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { ShellHeaderContext } from "./ShellHeader"

export interface PanelProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  /** The panel title, in the 38px header. */
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
 * A tool region: a bg-1 card with a 38px header (title, state, actions), content padded by the card padding
 * (12px) underneath and an optional footer. For a plain surface with an optional heading, use `Card`.
 */
export function Panel(props: PanelProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "title",
    "state",
    "actions",
    "header",
    "footer",
    "flush",
    "fill",
    "class",
    "children",
  ])
  return (
    <section
      data-part="panel"
      data-fill={local.fill ? "" : undefined}
      class={cx("nc-card nc-panel", local.class)}
      {...rest}
    >
      <header class="nc-panel-header" data-part="panel-header">
        <Show when={local.header} fallback={<h2 class="nc-panel-title">{local.title}</h2>}>
          {local.header}
        </Show>
        <Show when={local.state}>{local.state}</Show>
        <Show when={local.actions}>
          <span class="nc-panel-header__actions">{local.actions}</span>
        </Show>
      </header>
      <div data-part="panel-body" class={cx("nc-panel__body", local.flush && "nc-panel__body--flush")}>
        {local.children}
      </div>
      <Show when={local.footer}>
        <footer data-part="panel-footer" class="nc-panel__footer">
          {local.footer}
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
}

/** A content frame of the app shell: bg-1, radius 8, a hairline edge, with an optional header bar. */
export function Frame(props: FrameProps): JSX.Element {
  const [local, rest] = splitProps(props, ["flush", "header", "focused", "class", "children"])
  // Read once, as in AppShell: the header is a TabStrip with state and listeners, and must not be built twice.
  const header = createMemo(() => local.header)
  return (
    <div
      data-part="frame"
      data-focused={local.focused ? "" : undefined}
      class={cx(
        "nc-frame",
        Boolean(local.flush || header()) && "nc-frame--flush",
        Boolean(header()) && "nc-frame--stacked",
        local.class,
      )}
      {...rest}
    >
      <Show when={header()} fallback={local.children}>
        <div data-part="frame-header" class="nc-frame__header">
          {header()}
        </div>
        <div data-part="frame-body" class={cx("nc-frame__body", !local.flush && "nc-frame__body--padded")}>
          {local.children}
        </div>
      </Show>
    </div>
  )
}

export interface AppShellProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The sidebar, on bg-0. Usually a `Nav`. At phone width it is a drawer. */
  sidebar?: JSX.Element
  /** Accessible name of the sidebar landmark. Default "Sidebar". */
  sidebarLabel?: string
  /** Sidebar width in px. Default 232. */
  sidebarWidth?: number
  /**
   * Makes the sidebar resizable: its edge drags, and the arrow keys move it when focused. Called with the new
   * width (180 to 420 px); the app keeps it and passes it back as `sidebarWidth`.
   */
  onSidebarResize?: (width: number) => void
  /** A bar across the top at phone width only, with the button that opens the drawer. */
  topbar?: JSX.Element
  /**
   * The app's header: a bar on bg-0 at the top of the main column, beside the sidebar and above the frames, for
   * the path to the open view and its actions. A view fills it with a `ViewHeader` with `variant="shell"`, which
   * shows here by itself; this slot is for content the app puts there.
   */
  header?: JSX.Element
  /**
   * Where the header bar goes. `beside` (default): at the top of the main column, beside the sidebar. `across`: a
   * top bar over the whole window, sidebar included, with the product at its start and search in its middle.
   */
  headerPlacement?: "beside" | "across"
  /** Hides the sidebar on a desktop: the frames take its room. The app keeps a way to bring it back. */
  sidebarHidden?: boolean
  /** A bar of small indicators along the bottom. */
  statusbar?: JSX.Element
  /** Whether the sidebar drawer is open at phone width. Setting it turns on the scrim. */
  drawerOpen?: boolean
  /** Called when the scrim is pressed. */
  onDrawerClose?: () => void
  /** Fill the height of the parent instead of growing with the content, so frames scroll inside it. */
  fill?: boolean
}

/**
 * The app shell pattern: a sidebar on bg-0 and one or more bg-1 frames with an 8px gap. Frames wrap and stack
 * at phone width, where the sidebar is a drawer behind a top bar.
 */
export function AppShell(props: AppShellProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "sidebar",
    "sidebarLabel",
    "sidebarWidth",
    "onSidebarResize",
    "topbar",
    "header",
    "headerPlacement",
    "sidebarHidden",
    "statusbar",
    "drawerOpen",
    "onDrawerClose",
    "fill",
    "class",
    "style",
    "children",
  ])
  // Read once: a slot given as JSX is built each time it is read, and reading it for the `when` as well as for the
  // content would mount it twice (the first copy never shown, but with its effects and listeners running).
  const topbar = createMemo(() => local.topbar)
  const sidebar = createMemo(() => local.sidebar)
  const statusbar = createMemo(() => local.statusbar)
  const header = createMemo(() => local.header)
  // Headers of the views that show in the bar. The bar takes room only while one does, or the app fills it.
  const [claims, setClaims] = createSignal(0)
  let headerBar!: HTMLDivElement
  const shellHeader = {
    mount: () => headerBar,
    claim: () => {
      setClaims((n) => n + 1)
      return () => setClaims((n) => n - 1)
    },
  }
  const width = () => local.sidebarWidth ?? 232
  const resize = (w: number) => local.onSidebarResize?.(Math.max(180, Math.min(420, Math.round(w))))
  let root!: HTMLDivElement
  let dragging = false
  return (
    <div
      ref={root}
      data-part="app-shell"
      data-fill={local.fill ? "" : undefined}
      data-drawer={local.drawerOpen ? "open" : undefined}
      data-header={local.headerPlacement === "across" ? "across" : undefined}
      data-sidebar={local.sidebarHidden ? "hidden" : undefined}
      class={cx("nc-shell", local.class)}
      style={{
        "--nc-sidebar-width": `${width()}px`,
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      {...rest}
    >
      <Show when={topbar()}>
        <header data-part="topbar" class="nc-shell__topbar">
          {topbar()}
        </header>
      </Show>
      <Show when={local.drawerOpen !== undefined}>
        <button
          type="button"
          data-part="scrim"
          class="nc-shell__scrim"
          aria-label="Close navigation"
          tabindex="-1"
          onClick={() => local.onDrawerClose?.()}
        />
      </Show>
      <Show when={sidebar()}>
        <aside data-part="sidebar" aria-label={local.sidebarLabel ?? "Sidebar"} class="nc-shell__sidebar">
          {sidebar()}
        </aside>
        <Show when={local.onSidebarResize}>
          <div
            role="separator"
            tabindex="0"
            aria-orientation="vertical"
            aria-label="Resize the sidebar"
            aria-valuenow={width()}
            aria-valuemin={180}
            aria-valuemax={420}
            title="Drag to resize"
            class="nc-shell__edge"
            data-part="sidebar-edge"
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture?.(e.pointerId)
              dragging = true
            }}
            onPointerMove={(e) => {
              if (dragging) resize(e.clientX - root.getBoundingClientRect().left)
            }}
            onPointerUp={() => {
              dragging = false
            }}
            onPointerCancel={() => {
              dragging = false
            }}
            onKeyDown={(e) => {
              const step = e.key === "ArrowRight" ? 16 : e.key === "ArrowLeft" ? -16 : 0
              if (!step) return
              e.preventDefault()
              resize(width() + step)
            }}
          />
        </Show>
      </Show>
      <div
        ref={headerBar}
        data-part="shell-header"
        class="nc-shell__header"
        hidden={!header() && claims() === 0}
      >
        {header()}
      </div>
      <main data-part="shell-content" class="nc-shell__content">
        <ShellHeaderContext.Provider value={shellHeader}>{local.children}</ShellHeaderContext.Provider>
      </main>
      <Show when={statusbar()}>
        <footer data-part="statusbar" class="nc-shell__status">
          {statusbar()}
        </footer>
      </Show>
    </div>
  )
}
