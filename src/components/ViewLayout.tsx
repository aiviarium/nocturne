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
import { Sheet } from "./Sheet"

// The standard layout of a view with navigation of its own: a view sidebar on the left (a tree, a list of chats,
// sections), the main column, and optionally a secondary panel on the right (an outline, properties, context).
// Every view uses this one, so they all behave the same: the sidebar resizes by its edge and collapses with a
// control and a shortcut to a slim rail; the panel on the right does the same and, when the frame is not wide
// enough for it beside a comfortable main column, collapses behind a button and opens over the main column.
// Widths and collapsed state are remembered per view on this device. A reading view centres its column in the
// space that remains.
//
// When the frame is too narrow for the app's sidebar, the view sidebar and the main column at a comfortable
// width together, the view says so to its host (`ViewLayoutHost`, which the app may provide): the app's sidebar
// can then collapse to its rail by itself, and come back when there is room again.

export interface ViewLayoutHandle {
  readonly id: string
  readonly element: HTMLElement
  toggleSidebar(): void
  toggleAside(): void
}

export interface ViewLayoutHostValue {
  /** A layout is shown. The returned function says it went. */
  mount(handle: ViewLayoutHandle): () => void
  /**
   * How many px the layout lacks for its sidebar and a comfortable main column (negative: how many it has to
   * spare), or null when it has no sidebar. The host collapses its own sidebar while some layout lacks room.
   */
  report(handle: ViewLayoutHandle, shortfall: number | null): void
  /** The keys that toggle the sidebar and the panel, as people read them, for tooltips. */
  keys?: { sidebar?: string; aside?: string }
}

// `null` is "no host": in Solid 2 a default-less context throws instead of reading as undefined.
export const ViewLayoutHost = createContext<ViewLayoutHostValue | null>(null)

/** What a view header learns from the layout it is in: whether there are toggles to show. */
interface LayoutState {
  hasSidebar: () => boolean
  sidebarOpen: () => boolean
  toggleSidebar: () => void
  hasAside: () => boolean
  asideOpen: () => boolean
  asideLabel: () => string
  toggleAside: () => void
  keys: () => { sidebar?: string; aside?: string }
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
  /** A strip always shown at the far left (an activity bar), in place of the rail a collapsed sidebar leaves. */
  rail?: JSX.Element
  /** A secondary panel on the right: an outline, properties, context. */
  aside?: JSX.Element
  asideLabel?: string
  /** Its width until the person resizes it (it may change with what the panel shows). Default 260; never more than 360. */
  asideWidth?: number
  /** The panel starts collapsed until the person opens it. */
  asideCollapsed?: boolean
  /** Opens the panel each time this number changes (a view's own button for it, such as Comments). */
  asideRequest?: number
  /** A `ViewHeader` over the main column and the panel. */
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
const ASIDE = { min: 200, max: 360, fallback: 260 }
const EDGE = 1
const RAIL = 36
/**
 * The narrowest the main column gets beside a column the person opened. Below the comfortable width (`minMain`)
 * a column collapses by itself as the frame narrows; opened by hand it docks as long as the main column keeps
 * this much, and only opens over the main column below that.
 */
const MAIN_FLOOR = 360

interface Saved {
  w?: number
  collapsed?: boolean
  aw?: number
  asideCollapsed?: boolean
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
 * content is the screen pushed from it. Otherwise the header (the bar) and the main column show. The right-hand
 * panel is a sheet behind a button in the bar. A main column that scrolls itself (`scroll={false}`) fills the
 * screen between the bars.
 */
function PhoneViewLayout(props: ViewLayoutProps): JSX.Element {
  const screen = useScreen()!
  const [asideOpen, setAsideOpen] = createSignal(false)
  // Read the sidebar only at a view's start: elsewhere it is not shown, and reading a slot builds it.
  const sidebar = screen.level() === "index" ? props.sidebar : undefined
  const present = (x: unknown) => x !== undefined && x !== null && x !== false
  const showSidebar = present(sidebar)
  const hasAside = () =>
    !showSidebar && props.aside !== undefined && props.aside !== null && props.aside !== false
  const state: LayoutState = {
    hasSidebar: () => false,
    sidebarOpen: () => false,
    toggleSidebar: () => {},
    hasAside: () => false,
    asideOpen,
    asideLabel: () => props.asideLabel ?? "Details",
    toggleAside: () => setAsideOpen((o) => !o),
    keys: () => ({}),
  }
  provideScreen(() => ({
    largeTitle: showSidebar ? true : undefined,
    mode: !showSidebar && props.scroll === false ? "fill" : undefined,
    actions: hasAside()
      ? [
          {
            id: "aside",
            label: props.asideLabel ?? "Details",
            icon: "panel-right",
            rank: 1,
            pressed: asideOpen(),
            onClick: () => setAsideOpen(true),
          },
        ]
      : [],
  }))
  createEffect(
    () => props.asideRequest,
    (n) => {
      if (n && hasAside()) setAsideOpen(true)
    },
    { defer: true },
  )
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
        <Show when={hasAside()}>
          <Sheet
            open={asideOpen()}
            title={props.asideLabel ?? "Details"}
            onClose={() => setAsideOpen(false)}
            flush
          >
            <div class="nc-view-layout__aside-sheet" data-part="view-aside">
              {props.aside}
            </div>
          </Sheet>
        </Show>
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
  // The person's width once they resized it; until then the view's, which can follow what the panel shows.
  const [ownAsideWidth, setAsideWidth] = createSignal<number | undefined>(
    saved.aw === undefined ? undefined : clamp(saved.aw, ASIDE.min, ASIDE.max),
  )
  const asideWidth = () => ownAsideWidth() ?? clamp(props.asideWidth ?? ASIDE.fallback, ASIDE.min, ASIDE.max)
  const [asideCollapsed, setAsideCollapsed] = createSignal(
    saved.asideCollapsed ?? Boolean(props.asideCollapsed),
  )
  /** The panel is opened over the main column, because there is no room beside it. */
  const [asideOver, setAsideOver] = createSignal(false)
  const [sidebarOver, setSidebarOver] = createSignal(false)
  /** The person opened the column while it lacked its comfortable room: it docks down to MAIN_FLOOR. */
  const [sidebarAsked, setSidebarAsked] = createSignal(false)
  const [asideAsked, setAsideAsked] = createSignal(false)
  const [frame, setFrame] = createSignal(0)
  const [dragging, setDragging] = createSignal<"sidebar" | "aside" | null>(null)
  let root!: HTMLDivElement

  // The slots are read once each (a slot given as JSX is built each time it is read, see AppShell), and built
  // inside the layout's context, so a ViewHeader in them finds the layout (Body below makes them). They are a
  // plain object, made by Body before its JSX is built, so the first render already sees them.
  let slots:
    | {
        sidebar: () => JSX.Element
        aside: () => JSX.Element
        header: () => JSX.Element
        rail: () => JSX.Element
      }
    | undefined
  const railSlot = () => slots?.rail()
  const sidebarSlot = () => slots?.sidebar()
  const asideSlot = () => slots?.aside()
  const headerSlot = () => slots?.header()
  const present = (x: unknown) => x !== undefined && x !== null && x !== false
  const hasSidebar = () => present(sidebarSlot())
  const hasAside = () => present(asideSlot())
  const readingWidth = () =>
    props.reading === true ? 720 : typeof props.reading === "number" ? props.reading : 0
  const minMain = () => props.minMain ?? (readingWidth() ? readingWidth() - 80 : 560)

  // What fits: the sidebar collapses by itself when even the main column alone would be too narrow beside it,
  // and the panel when it does not fit beside a comfortable main column.
  const railWidth = () => (present(railSlot()) ? RAIL : 0)
  const sidebarRoom = createMemo(() => frame() - railWidth() - minMain() - EDGE >= width())
  const sidebarFloor = createMemo(() => frame() - railWidth() - MAIN_FLOOR - EDGE >= width())
  const sidebarShown = () =>
    hasSidebar() && !collapsed() && (sidebarRoom() || (sidebarAsked() && sidebarFloor()) || frame() === 0)
  const asideLeft = () =>
    railWidth() + (sidebarShown() ? width() + EDGE : hasSidebar() && !railWidth() ? RAIL : 0)
  const asideComfort = createMemo(() => frame() - asideLeft() - minMain() - EDGE >= asideWidth())
  const asideFloor = createMemo(() => frame() - asideLeft() - MAIN_FLOOR - EDGE >= asideWidth())
  const asideFits = () => asideComfort() || (asideAsked() && asideFloor())
  const asideColumn = () => hasAside() && !asideCollapsed() && asideFits()
  const asideOpen = () => asideColumn() || asideOver()

  const handle: ViewLayoutHandle = {
    id: props.id,
    get element() {
      return root
    },
    toggleSidebar: () => toggleSidebar(),
    toggleAside: () => toggleAside(),
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
  function toggleAside() {
    if (!hasAside()) return
    if (!asideComfort()) {
      if (asideColumn()) return setAsideAsked(false)
      if (asideFloor()) {
        setAsideAsked(true)
        setAsideOver(false)
        setAsideCollapsed(false)
        save(props.id, { asideCollapsed: false })
        return
      }
      setAsideOver((o) => !o)
      return
    }
    setAsideAsked(false)
    const next = !asideCollapsed()
    setAsideCollapsed(next)
    setAsideOver(false)
    save(props.id, { asideCollapsed: next })
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
                ? railWidth() + width() + EDGE + (sidebarAsked() ? MAIN_FLOOR : minMain()) - frame()
                : null,
          },
    (next) => next?.host.report(handle, next.value),
  )
  // A view asked for its panel: open it, beside the main column or over it.
  createEffect(
    () => props.asideRequest,
    (n) => {
      if (!n || !hasAside()) return
      if (asideComfort() || asideFloor()) {
        if (!asideComfort()) setAsideAsked(true)
        setAsideCollapsed(false)
        save(props.id, { asideCollapsed: false })
      } else setAsideOver(true)
    },
    { defer: true },
  )
  // An overlay closes when there is room for the column again.
  createEffect(asideFits, (fits) => {
    if (fits) setAsideOver(false)
  })
  createEffect(sidebarRoom, (room) => {
    if (room) setSidebarOver(false)
  })

  // A column opened over the main column is an overlay: a scrim behind it, Escape and a click on the scrim close
  // it, the sidebar has a close control and closes when something in it is chosen. Focus moves into it when it
  // opens and goes back to what opened it (the toggle) when it closes.
  const COLUMNS = "[data-part=view-sidebar], [data-part=view-aside]"
  const overlay = () => (sidebarOver() ? "sidebar" : asideOver() ? "aside" : null)
  const closeOverlay = () => {
    setSidebarOver(false)
    setAsideOver(false)
  }
  createEffect(overlay, (which) => {
    if (!which) return
    const opener = activeElement() as HTMLElement | null
    const layer = pushLayer()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !layer.isTop()) return
      e.preventDefault()
      e.stopPropagation()
      closeOverlay()
    }
    document.addEventListener("keydown", onKey, true)
    queueMicrotask(() => {
      const panel = root?.querySelector<HTMLElement>(
        which === "sidebar" ? "[data-part=view-sidebar]" : "[data-part=view-aside]",
      )
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
      const lost = !now || now === document.body || !now.isConnected || Boolean(now.closest(COLUMNS))
      if (!lost) return
      const back =
        opener?.isConnected && opener !== document.body && !opener.closest(COLUMNS)
          ? opener
          : root?.querySelector<HTMLElement>(
              which === "sidebar" ? "[data-part=view-sidebar-toggle]" : "[data-part=view-aside-toggle]",
            )
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

  // A press on an edge that does not move is a click: it hides that column. No control floats over either column.
  let pressAt: number | null = null
  let moved = false
  const startDrag = (which: "sidebar" | "aside", e: PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pressAt = e.clientX
    moved = false
    setDragging(which)
  }
  // The width the pointer last asked for: a read of the signal would be a step behind within one event.
  let dragged: { which: "sidebar" | "aside"; width: number } | null = null
  const drag = (e: PointerEvent) => {
    const which = dragging()
    if (!which) return
    if (pressAt !== null && Math.abs(e.clientX - pressAt) < 3) return
    moved = true
    const box = root.getBoundingClientRect()
    if (which === "sidebar") {
      dragged = { which, width: clamp(e.clientX - box.left, SIDEBAR.min, SIDEBAR.max) }
      setWidth(dragged.width)
    } else {
      dragged = {
        which,
        width: clamp(box.right - e.clientX, ASIDE.min, Math.min(ASIDE.max, box.width * 0.35)),
      }
      setAsideWidth(dragged.width)
    }
  }
  const endDrag = () => {
    const which = dragging()
    const last = dragged
    dragged = null
    setDragging(null)
    pressAt = null
    if (which && !moved) {
      if (which === "sidebar") toggleSidebar()
      else toggleAside()
      return
    }
    if (which === "sidebar") save(props.id, { w: last?.width ?? width() })
    if (which === "aside") save(props.id, { aw: asideWidth() })
  }
  const keyStep = (which: "sidebar" | "aside", e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 16 : e.key === "ArrowLeft" ? -16 : 0
    if (!step) return
    e.preventDefault()
    // One write, then what was written: a read of the signal would be a step behind.
    if (which === "sidebar") {
      const next = clamp(width() + step, SIDEBAR.min, SIDEBAR.max)
      setWidth(next)
      save(props.id, { w: next })
    } else {
      const next = clamp(asideWidth() - step, ASIDE.min, ASIDE.max)
      setAsideWidth(next)
      save(props.id, { aw: next })
    }
  }

  const keys = () => host?.keys ?? {}
  const state: LayoutState = {
    hasSidebar,
    sidebarOpen: () => sidebarShown() || sidebarOver(),
    toggleSidebar,
    hasAside,
    asideOpen,
    asideLabel: () => props.asideLabel ?? "Details",
    toggleAside,
    keys,
  }

  const Body = () => {
    slots = {
      sidebar: () => props.sidebar,
      aside: () => props.aside,
      header: () => props.header,
      rail: () => props.rail,
    }
    return (
      <div
        ref={root}
        data-part="view-layout"
        data-layout={props.id}
        data-sidebar={
          !hasSidebar() ? undefined : sidebarShown() ? "open" : sidebarOver() ? "over" : "collapsed"
        }
        data-aside={!hasAside() ? undefined : asideColumn() ? "open" : asideOver() ? "over" : "collapsed"}
        data-dragging={dragging() ?? undefined}
        class={cx("nc-view-layout", props.class)}
        style={{ "--nc-view-sidebar": `${width()}px`, "--nc-view-aside": `${asideWidth()}px` }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Show when={present(railSlot())}>
          <div class="nc-view-layout__activity" data-part="view-activity">
            {railSlot()}
          </div>
        </Show>
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
                onPointerDown={(e) => startDrag("sidebar", e)}
                onKeyDown={(e) => keyStep("sidebar", e)}
              />
            </Show>
          </Show>
          <Show when={!sidebarShown() && !present(railSlot())}>
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
        <Show when={overlay()}>
          <div
            class="nc-view-layout__scrim"
            data-part="view-scrim"
            aria-hidden="true"
            onPointerDown={(e) => {
              e.preventDefault()
              closeOverlay()
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
            <Show when={asideOpen()}>
              <Show when={!asideOver()}>
                <div
                  role="separator"
                  tabindex="0"
                  aria-orientation="vertical"
                  aria-label={`Resize ${props.asideLabel ?? "the panel"}`}
                  aria-valuenow={asideWidth()}
                  aria-valuemin={ASIDE.min}
                  aria-valuemax={ASIDE.max}
                  class="nc-view-layout__edge"
                  data-part="view-aside-edge"
                  onPointerDown={(e) => startDrag("aside", e)}
                  onKeyDown={(e) => keyStep("aside", e)}
                />
              </Show>
              <aside
                class={["nc-view-layout__aside", { "nc-view-layout__aside--over": asideOver() }]}
                aria-label={props.asideLabel ?? "Details"}
                data-part="view-aside"
              >
                {asideSlot()}
              </aside>
            </Show>
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

/** The toggles a view header shows for the layout it is in. */
export function useViewLayout(): LayoutState | undefined {
  return useContext(ViewLayoutState) ?? undefined
}
