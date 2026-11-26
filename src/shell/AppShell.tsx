// The window: the title bar across the top, then a row of the sidebar, the raised view surface with its docked bottom
// and right panels, and the panel rail at the window's right edge. The sidebar resizes by its edge and folds to a
// 48px icon rail when dragged below 140px, by ⌘B or ⌘\, or by its minimise button; unfolding restores the last full
// width. The surface is square (radius 0) and runs to the window's bottom edge. Every frame stays mounted while its
// content swaps, and the fold and the panels settle in the same frame: nothing here animates.
import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, onCleanup, onSettled, Show, untrack } from "solid-js"
import { cx } from "../lib/cx"
import { pushLayer } from "../lib/layers"
import { usePhone } from "../lib/phone"
import {
  type PanelReport,
  type PanelSide,
  ShellFrameContext,
  type ShellFrameState,
  ShellSidebarContext,
  type ShellSidebarState,
} from "./context"
import { createStoredWidth, ResizeHandle, type SizeModel } from "./ResizeHandle"
import { readJson, type ShellStorage, writeJson } from "./storage"

/** The icon rail's width. */
export const SIDEBAR_RAIL = 48
/** Dragged below this width, the sidebar folds to its rail; dragged back past it, it opens again. */
export const SIDEBAR_FOLD_AT = 140
/** The narrowest the view gets beside a docked right panel; below it the panel floats over the view. */
export const MIN_VIEW = 480

export interface AppShellProps {
  /** The `TitleBar`, 44px, across the whole window. */
  titleBar?: JSX.Element
  /** The top of the sidebar: a `SidebarHeader`. */
  sidebarHeader?: JSX.Element
  /** The sidebar's body, which scrolls: a `Nav`. */
  sidebar?: JSX.Element
  /** The foot of the sidebar: an `AccountMenu`. */
  sidebarFoot?: JSX.Element
  /** Accessible name of the sidebar landmark. Default "Sidebar". */
  sidebarLabel?: string
  /** Whether the sidebar is folded to its rail, for an app that keeps it. Left out, the shell keeps it. */
  sidebarFolded?: boolean
  onSidebarFoldedChange?: (folded: boolean) => void
  /** The sidebar's full width. Default 240px, 200 to 360, remembered in `storage`. */
  sidebarWidth?: SizeModel
  /**
   * Below this shell width the sidebar starts folded, and unfolding opens it only until the window widens.
   * Default 900; 0 turns it off.
   */
  foldBelow?: number
  /** Where the fold and the widths are remembered. Without it they last as long as the page. */
  storage?: ShellStorage
  /** The panel docked at the view's right: a `ShellPanel` with `at="right"`. */
  right?: JSX.Element
  /** The panel docked under the view: a `ShellPanel` with `at="bottom"`. */
  bottom?: JSX.Element
  /** The `PanelRail` at the window's right edge. */
  rail?: JSX.Element
  /** Ids of the panels whose content the view already shows: the rail hides them and they stay hidden. */
  covers?: readonly string[]
  /** On a phone, whether the sidebar drawer is open. */
  drawerOpen?: boolean
  /** Called when the drawer's scrim is pressed, Escape is pressed or something in the drawer is chosen. */
  onDrawerClose?: () => void
  /** Binds ⌘B and ⌘\ (Ctrl on other systems) to fold and unfold the sidebar. Default true. */
  keys?: boolean
  class?: string
  /** The view. */
  children?: JSX.Element
}

/** The app shell: title bar, sidebar, the raised view surface with its panels, and the panel rail. */
export function AppShell(props: AppShellProps): JSX.Element {
  const phone = usePhone()
  const width = untrack(
    () =>
      props.sidebarWidth ??
      createStoredWidth("sidebar", { initial: 240, min: 200, max: 360, storage: props.storage }),
  )
  const [ownFolded, setOwnFolded] = createSignal(
    untrack(() => readJson<boolean>(props.storage, "sidebar/folded") === true),
    { ownedWrite: true },
  )
  const [narrow, setNarrow] = createSignal(false, { ownedWrite: true })
  const [peek, setPeek] = createSignal(false, { ownedWrite: true })
  const folded = () => (phone() ? false : narrow() ? !peek() : (props.sidebarFolded ?? ownFolded()))
  const setFolded = (next: boolean) => {
    if (phone()) {
      if (!next) return
      props.onDrawerClose?.()
      return
    }
    if (narrow()) return setPeek(!next)
    if (props.sidebarFolded === undefined) {
      setOwnFolded(next)
      writeJson(props.storage, "sidebar/folded", next || undefined)
    }
    props.onSidebarFoldedChange?.(next)
  }
  const sidebarState: ShellSidebarState = {
    folded,
    setFolded,
    toggle: () => setFolded(!folded()),
    drawer: phone,
    closeDrawer: () => props.onDrawerClose?.(),
    shortcut: "⌘ B",
  }
  // The handle drives this: below the fold point the sidebar folds, past it it opens at the dragged width.
  const sidebarSize: SizeModel = {
    value: () => (folded() ? SIDEBAR_RAIL : width.value()),
    set: (px) => {
      if (px < SIDEBAR_FOLD_AT) {
        if (!folded()) setFolded(true)
        return
      }
      if (folded()) setFolded(false)
      width.set(px)
    },
    reset: () => (folded() ? setFolded(false) : width.reset()),
    min: SIDEBAR_RAIL,
    max: width.max,
  }

  // ── Panels: each mounted ShellPanel reports its size; the right one floats when the view would get too narrow.
  const [reports, setReports] = createSignal<Partial<Record<PanelSide, PanelReport>>>(
    {},
    { ownedWrite: true },
  )
  const [area, setArea] = createSignal(0, { ownedWrite: true })
  const shownAt = (at: PanelSide) => {
    const r = reports()[at]
    return r?.shown() ? r : undefined
  }
  const overlay = createMemo(() => {
    const r = shownAt("right")
    return !!r && (phone() || (area() > 0 && area() - r.size() < MIN_VIEW))
  })
  const frameState: ShellFrameState = {
    covers: () => props.covers ?? [],
    overlay,
    phone,
    register: (at, report) => {
      setReports((all) => ({ ...all, [at]: report }))
      return () =>
        setReports((all) => {
          if (all[at] !== report) return all
          const next = { ...all }
          delete next[at]
          return next
        })
    },
  }

  let root: HTMLDivElement | undefined
  let surface: HTMLDivElement | undefined
  onSettled(() => {
    const read = () => {
      if (surface) setArea(surface.clientWidth)
      const below = props.foldBelow ?? 900
      const w = root?.clientWidth ?? 0
      const n = below > 0 && w > 0 && w < below
      if (n !== untrack(narrow)) setPeek(false)
      setNarrow(n)
    }
    read()
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(read) : undefined
    if (root) ro?.observe(root)
    if (surface) ro?.observe(surface)
    window.addEventListener("resize", read)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", read)
    }
  })

  if (untrack(() => props.keys) !== false && typeof window !== "undefined") {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.defaultPrevented) return
      if (e.key.toLowerCase() !== "b" && e.key !== "\\") return
      e.preventDefault()
      if (phone()) props.onDrawerClose?.()
      else setFolded(!folded())
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  }

  // The drawer on a phone is a layer: Escape closes it, and so does a choice in it.
  const drawerOpen = () => phone() && !!props.drawerOpen
  let layer: ReturnType<typeof pushLayer> | undefined
  const onDrawerKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented || !layer?.isTop()) return
    e.preventDefault()
    props.onDrawerClose?.()
  }
  const syncDrawer = (open: boolean) => {
    if (open && !layer) {
      layer = pushLayer()
      document.addEventListener("keydown", onDrawerKey, true)
    } else if (!open && layer) {
      layer.remove()
      layer = undefined
      document.removeEventListener("keydown", onDrawerKey, true)
    }
  }
  createEffect(drawerOpen, (open) => syncDrawer(open))
  onCleanup(() => syncDrawer(false))
  const choseInDrawer = (e: MouseEvent) => {
    if (!drawerOpen() || e.defaultPrevented) return
    const t = e.target as HTMLElement
    if (t.closest("a[href], [data-part=nav-item], [role=menuitem], [role=treeitem]")) props.onDrawerClose?.()
  }

  const hasSidebar = () =>
    props.sidebarHeader !== undefined || props.sidebar !== undefined || props.sidebarFoot !== undefined

  return (
    <ShellSidebarContext value={sidebarState}>
      <ShellFrameContext value={frameState}>
        <div
          ref={(el) => {
            root = el
          }}
          data-part="app-shell"
          data-folded={folded() ? "" : undefined}
          data-phone={phone() ? "" : undefined}
          data-drawer={drawerOpen() ? "open" : undefined}
          class={cx("nc-app-shell", props.class)}
          style={{ "--nc-sidebar-w": `${sidebarSize.value()}px` }}
        >
          {props.titleBar}
          <div class="nc-app-shell__row">
            <Show when={hasSidebar()}>
              <aside
                data-part="sidebar"
                data-folded={folded() ? "" : undefined}
                aria-label={props.sidebarLabel ?? "Sidebar"}
                class="nc-app-shell__sidebar"
                onClick={choseInDrawer}
              >
                {props.sidebarHeader}
                <div class="nc-app-shell__sidebar-body" data-part="sidebar-body">
                  {props.sidebar}
                </div>
                <div class="nc-app-shell__sidebar-foot" data-part="sidebar-foot">
                  {props.sidebarFoot}
                </div>
                <Show when={!phone()}>
                  <ResizeHandle
                    at="right"
                    size={sidebarSize}
                    label="Resize sidebar"
                    class="nc-app-shell__edge"
                  />
                </Show>
              </aside>
              <button
                type="button"
                data-part="scrim"
                class="nc-app-shell__scrim"
                aria-label="Close navigation"
                tabindex="-1"
                hidden={!drawerOpen()}
                onClick={() => props.onDrawerClose?.()}
              />
            </Show>
            <div
              ref={(el) => {
                surface = el
              }}
              data-part="shell-surface"
              data-overlay={overlay() ? "" : undefined}
              data-bottom={shownAt("bottom") ? "" : undefined}
              class="nc-app-shell__surface"
              style={{ "--nc-shell-bottom": `${shownAt("bottom")?.size() ?? 0}px` }}
            >
              <div class="nc-app-shell__main">
                <main data-part="shell-view" class="nc-app-shell__view">
                  {props.children}
                </main>
                {props.bottom}
              </div>
              {props.right}
            </div>
            {props.rail}
          </div>
        </div>
      </ShellFrameContext>
    </ShellSidebarContext>
  )
}
