import type { JSX } from "@solidjs/web"
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onSettled,
  Show,
  untrack,
  useContext,
} from "solid-js"
import { cx } from "../lib/cx"
import { activeElement, focusableIn } from "../lib/focus"
import { pushLayer } from "../lib/layers"
import { IconButton } from "./IconButton"
import { provideScreen, useScreen } from "./NavigationBar"

// The standard layout of a view with navigation of its own: a view sidebar on the left (a tree, a list of chats,
// sections) and the main column. Every view uses this one, so they all behave the same: the sidebar resizes by its
// edge and collapses with a control and a shortcut to a slim rail, and when the frame is not wide enough for it
// beside a comfortable main column, it collapses behind a button and opens over the main column. Widths and
// collapsed state are remembered per view on this device. A reading view centres its column in the space that
// remains. What used to be a right-hand inspector is the shell's right panel now (`ShellPanel`).
//
// When the frame is too narrow for the app's sidebar, the view sidebar and the main column at a comfortable
// width together, the view says so to its host (`ViewLayoutHost`, which the app may provide): the app's sidebar
// can then collapse to its rail by itself, and come back when there is room again.

export interface ViewLayoutHandle {
  readonly id: string
  readonly element: HTMLElement
  toggleSidebar(): void
}

export interface ViewLayoutHostValue {
  /** A layout is shown. The returned function says it went. */
  mount(handle: ViewLayoutHandle): () => void
  /**
   * How many px the layout lacks for its sidebar and a comfortable main column (negative: how many it has to
   * spare), or null when it has no sidebar. The host collapses its own sidebar while some layout lacks room.
   */
  report(handle: ViewLayoutHandle, shortfall: number | null): void
  /** The key that toggles the sidebar, as people read it, for tooltips. */
  keys?: { sidebar?: string }
}

// `null` is "no host": in Solid 2 a default-less context throws instead of reading as undefined.
export const ViewLayoutHost = createContext<ViewLayoutHostValue | null>(null)

/** What the parts inside a layout learn from it: whether it has a sidebar, and its toggle. */
interface LayoutState {
  hasSidebar: () => boolean
  sidebarOpen: () => boolean
  toggleSidebar: () => void
  keys: () => { sidebar?: string }
}

export const ViewLayoutState = createContext<LayoutState | null>(null)

export interface ViewLayoutProps {
  /** Remembers the widths and what is collapsed: one key per kind of view, such as `docs.page`. */
  id: string
  /** The view's own navigation, on the left. */
  sidebar?: JSX.Element
  /** Accessible name of the sidebar. */
  sidebarLabel?: string
  /** Its width before the person resizes it. Default 240. */
  sidebarWidth?: number
  /**
   * Whether the sidebar is open, for a view that keeps that itself (the workbench: which of its panels shows).
   * With it, the control and the shortcut call `onSidebarToggle` instead of collapsing it here.
   */
  sidebarOpen?: boolean
  onSidebarToggle?: (open: boolean) => void
  /** A `ViewHeader` over the main column. */
  header?: JSX.Element
  /** Centre the main column at a reading width (720 px, or the number given). */
  reading?: boolean | number
  /** The narrowest the main column is comfortable at. Default 560, or the reading width less 80. */
  minMain?: number
  /** The main column scrolls by itself (default). False for a main column that manages its own scrolling. */
  scroll?: boolean
  class?: string
  children?: JSX.Element
}

const KEY = "nc.viewLayout.v1"
const SIDEBAR = { min: 180, max: 420, fallback: 240 }
const EDGE = 1
/**
 * The narrowest the main column gets beside a sidebar the person opened. Below the comfortable width (`minMain`)
 * it collapses by itself as the frame narrows; opened by hand it docks as long as the main column keeps this much,
 * and only opens over the main column below that.
 */
const MAIN_FLOOR = 360

interface Saved {
  w?: number
  collapsed?: boolean
}

function readAll(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}
  } catch {
    return {}
  }
}

function save(id: string, patch: Saved) {
  try {
    const all = readAll()
    all[id] = { ...all[id], ...patch }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

/**
 * A view layout on a phone screen (inside a `NavigationScreen`): a stack, not columns. At a view's start (the
 * screen's level is `index`) a view with a sidebar shows its sidebar as the screen, with a large title; the view's
 * content is the screen pushed from it. Otherwise the header (the bar) and the main column show. A main column that
 * scrolls itself (`scroll={false}`) fills the screen between the bars.
 */
function PhoneViewLayout(props: ViewLayoutProps): JSX.Element {
  const screen = useScreen()!
  // Read the sidebar only at a view's start: elsewhere it is not shown, and reading a slot builds it.
  const sidebar = screen.level() === "index" ? props.sidebar : undefined
  const present = (x: unknown) => x !== undefined && x !== null && x !== false
  const showSidebar = present(sidebar)
  const state: LayoutState = {
    hasSidebar: () => false,
    sidebarOpen: () => false,
    toggleSidebar: () => {},
    keys: () => ({}),
  }
  provideScreen(() => ({
    largeTitle: showSidebar ? true : undefined,
    mode: !showSidebar && props.scroll === false ? "fill" : undefined,
  }))
  const Body = () => (
    <Show
      when={!showSidebar}
      fallback={
        <div
          class={cx("nc-view-layout nc-view-layout--phone", props.class)}
          data-layout={props.id}
          data-part="view-layout"
          data-sidebar="screen"
        >
          <div
            class="nc-view-layout__sidebar-screen"
            data-part="view-sidebar"
            aria-label={props.sidebarLabel ?? "Navigation"}
          >
            {sidebar}
          </div>
        </div>
      }
    >
      <div
        class={cx("nc-view-layout nc-view-layout--phone", props.class)}
        data-layout={props.id}
        data-part="view-layout"
        data-fill={props.scroll === false ? "" : undefined}
      >
        {props.header}
        <main class="nc-view-layout__main" data-part="view-main">
          {props.children}
        </main>
      </div>
    </Show>
  )
  return (
    <ViewLayoutState value={state}>
      <Body />
    </ViewLayoutState>
  )
}

export function ViewLayout(props: ViewLayoutProps): JSX.Element {
  if (useScreen()) return <PhoneViewLayout {...props} />
  const host = useContext(ViewLayoutHost)
  const saved = untrack(() => readAll()[props.id] ?? {})
  const [width, setWidth] = createSignal(
    clamp(saved.w ?? props.sidebarWidth ?? SIDEBAR.fallback, SIDEBAR.min, SIDEBAR.max),
  )
  const [ownCollapsed, setCollapsed] = createSignal(Boolean(saved.collapsed))
  const collapsed = () => (props.sidebarOpen === undefined ? ownCollapsed() : !props.sidebarOpen)
  const [sidebarOver, setSidebarOver] = createSignal(false)
  /** The person opened the column while it lacked its comfortable room: it docks down to MAIN_FLOOR. */
  const [sidebarAsked, setSidebarAsked] = createSignal(false)
  const [frame, setFrame] = createSignal(0)
  const [dragging, setDragging] = createSignal(false)
  let root!: HTMLDivElement

  // The slots are read once each (a slot given as JSX is built each time it is read), and built inside the
  // layout's context, so a ViewHeader in them finds the layout (Body below makes them). They are a plain object,
  // made by Body before its JSX is built, so the first render already sees them.
  let slots: { sidebar: () => JSX.Element; header: () => JSX.Element } | undefined
  const sidebarSlot = () => slots?.sidebar()
  const headerSlot = () => slots?.header()
  const present = (x: unknown) => x !== undefined && x !== null && x !== false
  const hasSidebar = () => present(sidebarSlot())
  const readingWidth = () =>
    props.reading === true ? 720 : typeof props.reading === "number" ? props.reading : 0
  const minMain = () => props.minMain ?? (readingWidth() ? readingWidth() - 80 : 560)

  // What fits: the sidebar collapses by itself when even the main column alone would be too narrow beside it.
  const sidebarRoom = createMemo(() => frame() - minMain() - EDGE >= width())
  const sidebarFloor = createMemo(() => frame() - MAIN_FLOOR - EDGE >= width())
  const sidebarShown = () =>
    hasSidebar() && !collapsed() && (sidebarRoom() || (sidebarAsked() && sidebarFloor()) || frame() === 0)

  const handle: ViewLayoutHandle = {
    id: props.id,
    get element() {
      return root
    },
    toggleSidebar: () => toggleSidebar(),
  }

  function toggleSidebar() {
    if (props.sidebarOpen !== undefined) return props.onSidebarToggle?.(!props.sidebarOpen)
    if (!hasSidebar()) return
    if (!sidebarRoom() && frame() > 0) {
      // Short of its comfortable room: hide it if it is docked, dock it if the main column can spare the room,
      // and only otherwise open it over the main column.
      if (sidebarShown()) return setSidebarAsked(false)
      if (sidebarFloor()) {
        setSidebarAsked(true)
        setSidebarOver(false)
        if (collapsed()) {
          setCollapsed(false)
          save(props.id, { collapsed: false })
        }
        return
      }
      setSidebarOver((o) => !o)
      return
    }
    setSidebarAsked(false)
    const next = !collapsed()
    setCollapsed(next)
    save(props.id, { collapsed: next })
  }

  onSettled(() => {
    const ro = new ResizeObserver(() => setFrame(root.getBoundingClientRect().width))
    ro.observe(root)
    setFrame(root.getBoundingClientRect().width)
    const off = host?.mount(handle)
    return () => {
      ro.disconnect()
      host?.report(handle, null)
      off?.()
    }
  })

  // Tell the host how much room the sidebar and a comfortable main column lack (or have to spare).
  createEffect(
    () =>
      !host || frame() === 0
        ? undefined
        : {
            host,
            value:
              hasSidebar() && !collapsed()
                ? width() + EDGE + (sidebarAsked() ? MAIN_FLOOR : minMain()) - frame()
                : null,
          },
    (next) => next?.host.report(handle, next.value),
  )
  createEffect(sidebarRoom, (room) => {
    if (room) setSidebarOver(false)
  })

  // A sidebar opened over the main column is an overlay: a scrim behind it, Escape and a click on the scrim close
  // it, it has a close control and closes when something in it is chosen. Focus moves into it when it opens and
  // goes back to what opened it (the toggle) when it closes.
  const COLUMN = "[data-part=view-sidebar]"
  createEffect(sidebarOver, (over) => {
    if (!over) return
    const opener = activeElement() as HTMLElement | null
    const layer = pushLayer()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !layer.isTop()) return
      e.preventDefault()
      e.stopPropagation()
      setSidebarOver(false)
    }
    document.addEventListener("keydown", onKey, true)
    queueMicrotask(() => {
      const panel = root?.querySelector<HTMLElement>(COLUMN)
      if (!panel || panel.contains(activeElement())) return
      const first =
        panel.querySelector<HTMLElement>("[aria-current=page], [aria-current=true]") ?? focusableIn(panel)[0]
      ;(first ?? panel).focus({ preventScroll: true })
    })
    return () => {
      document.removeEventListener("keydown", onKey, true)
      layer.remove()
      // Back to the toggle, unless focus has already gone somewhere outside the closed column.
      const now = activeElement()
      const lost = !now || now === document.body || !now.isConnected || Boolean(now.closest(COLUMN))
      if (!lost) return
      const back =
        opener?.isConnected && opener !== document.body && !opener.closest(COLUMN)
          ? opener
          : root?.querySelector<HTMLElement>("[data-part=view-sidebar-toggle]")
      back?.focus({ preventScroll: true })
    }
  })
  /** A choice in the sidebar opened over the main column closes it (a link or a navigation item). */
  const choseInSidebar = (e: MouseEvent) => {
    if (!sidebarOver() || e.defaultPrevented) return
    const target = e.target as HTMLElement
    if (target.closest("a[href], [data-part=nav-item], [role=option], [role=menuitem], [role=treeitem]"))
      setSidebarOver(false)
  }

  // A press on the edge that does not move is a click: it hides the column. No control floats over it.
  let pressAt: number | null = null
  let moved = false
  // The width the pointer last asked for: a read of the signal would be a step behind within one event.
  let dragged: number | null = null
  const startDrag = (e: PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pressAt = e.clientX
    moved = false
    setDragging(true)
  }
  const drag = (e: PointerEvent) => {
    if (!dragging()) return
    if (pressAt !== null && Math.abs(e.clientX - pressAt) < 3) return
    moved = true
    dragged = clamp(e.clientX - root.getBoundingClientRect().left, SIDEBAR.min, SIDEBAR.max)
    setWidth(dragged)
  }
  const endDrag = () => {
    const was = dragging()
    const last = dragged
    dragged = null
    setDragging(false)
    pressAt = null
    if (!was) return
    if (!moved) return toggleSidebar()
    save(props.id, { w: last ?? width() })
  }
  const keyStep = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 16 : e.key === "ArrowLeft" ? -16 : 0
    if (!step) return
    e.preventDefault()
    // One write, then what was written: a read of the signal would be a step behind.
    const next = clamp(width() + step, SIDEBAR.min, SIDEBAR.max)
    setWidth(next)
    save(props.id, { w: next })
  }

  const keys = () => host?.keys ?? {}
  const state: LayoutState = {
    hasSidebar,
    sidebarOpen: () => sidebarShown() || sidebarOver(),
    toggleSidebar,
    keys,
  }

  const Body = () => {
    slots = {
      sidebar: () => props.sidebar,
      header: () => props.header,
    }
    return (
      <div
        ref={root}
        data-part="view-layout"
        data-layout={props.id}
        data-sidebar={
          !hasSidebar() ? undefined : sidebarShown() ? "open" : sidebarOver() ? "over" : "collapsed"
        }
        data-dragging={dragging() ? "sidebar" : undefined}
        class={cx("nc-view-layout", props.class)}
        style={{ "--nc-view-sidebar": `${width()}px` }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Show when={hasSidebar()}>
          <Show when={sidebarShown() || sidebarOver()}>
            <aside
              class={["nc-view-layout__sidebar", { "nc-view-layout__sidebar--over": sidebarOver() }]}
              aria-label={props.sidebarLabel ?? "Navigation"}
              data-part="view-sidebar"
              onClick={choseInSidebar}
            >
              <Show when={sidebarOver()}>
                <div class="nc-view-layout__over-head">
                  <IconButton
                    label="Hide the sidebar"
                    icon="close"
                    size="sm"
                    shortcut={keys().sidebar}
                    data-part="view-sidebar-close"
                    onClick={() => setSidebarOver(false)}
                  />
                </div>
              </Show>
              {sidebarSlot()}
            </aside>
            <Show when={!sidebarOver()}>
              <div
                role="separator"
                tabindex="0"
                aria-orientation="vertical"
                aria-label="Resize the sidebar"
                title={`Drag to resize, click to hide${keys().sidebar ? ` (${keys().sidebar})` : ""}`}
                aria-valuenow={width()}
                aria-valuemin={SIDEBAR.min}
                aria-valuemax={SIDEBAR.max}
                class="nc-view-layout__edge"
                data-part="view-sidebar-edge"
                onPointerDown={startDrag}
                onKeyDown={keyStep}
              />
            </Show>
          </Show>
          <Show when={!sidebarShown()}>
            <div class="nc-view-layout__rail" data-part="view-sidebar-rail">
              <IconButton
                label="Show the sidebar"
                icon="panel-left"
                shortcut={keys().sidebar}
                pressed={sidebarOver()}
                data-part="view-sidebar-toggle"
                onClick={toggleSidebar}
              />
            </div>
          </Show>
        </Show>
        <Show when={sidebarOver()}>
          <div
            class="nc-view-layout__scrim"
            data-part="view-scrim"
            aria-hidden="true"
            onPointerDown={(e) => {
              e.preventDefault()
              setSidebarOver(false)
            }}
          />
        </Show>
        <div class="nc-view-layout__body">
          {headerSlot()}
          <div class="nc-view-layout__row">
            <main
              class={["nc-view-layout__main", { "nc-view-layout__main--scroll": props.scroll !== false }]}
              data-part="view-main"
              data-reading={readingWidth() ? "" : undefined}
              style={readingWidth() ? { "--nc-view-reading": `${readingWidth()}px` } : undefined}
            >
              {props.children}
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ViewLayoutState value={state}>
      <Body />
    </ViewLayoutState>
  )
}

/** The layout a part is in: whether it has a sidebar, and its toggle. */
export function useViewLayout(): LayoutState | undefined {
  return useContext(ViewLayoutState) ?? undefined
}
