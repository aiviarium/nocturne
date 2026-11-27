// The app shell drawn from a `createShell` registry: the title bar with its path, lens box and palette; the sidebar
// with its header and the current scope's tree; the place's view; the rail and the docked panels. One key binding
// layer serves all of it, so the parts inside get `keys={false}`. With several shells in a page, a key goes to the
// shell it was pressed in; with focus on the page itself, to the shell used last, else the one marked `main`.
//
// Nothing remounts for a data change: the frame, the sidebar and the panels stay mounted and take new data, and the
// view is mounted once per scope, lens and place (a record, a saved view or a panel's drill swaps its data only).
import type { JSX } from "@solidjs/web"
import {
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  onSettled,
  Show,
  untrack,
  useContext,
} from "solid-js"
import { AccountMenu, type AccountMenuProps } from "../components/AccountMenu"
import type { IconName } from "../components/Icon"
import { Nav } from "../components/NavItem"
import { ViewHeader, type ViewHeaderProps } from "../components/ViewHeader"
import { type ViewLayoutHandle, ViewLayoutHost, type ViewLayoutHostValue } from "../components/ViewLayout"
import { cx } from "../lib/cx"
import { usePhone } from "../lib/phone"
import { AppShell } from "./AppShell"
import type { Appearance } from "./appearance"
import { useShellSidebar } from "./context"
import type { ShellKeyHost, ShellPanelSpec, ShellRegistry } from "./createShell"
import { PanelRail } from "./PanelRail"
import { ShellPanel } from "./ShellPanel"
import { SidebarHeader } from "./SidebarHeader"
import { TitleBar, type TitleBarProps } from "./TitleBar"

/** What the app passes for its native window: the controls' style and handlers. */
export interface ShellWindow {
  style?: "mac" | "win"
  onMinimise?: () => void
  onMaximise?: () => void
  onClose?: () => void
  maximised?: () => boolean
}

export interface ShellProps {
  shell: ShellRegistry
  /** A desktop window shows the history arrows and the window controls. Default desktop. */
  runsIn?: "desktop" | "browser"
  icon?: IconName | JSX.Element
  appMenu?: TitleBarProps["appMenu"]
  window?: ShellWindow
  /** The theme and the accent that follows the lens; the title bar's line reads its `tintLine`. */
  appearance?: Appearance
  /** The account at the sidebar's foot. */
  account?: AccountMenuProps
  /** Status items at the title bar's right: `TitleBarItem`s. */
  status?: JSX.Element
  /** Takes the keys pressed outside every shell in the page. Default: the only shell, or the one used last. */
  main?: boolean
  /** Binds the keyboard model. Default true. */
  keys?: boolean
  /** Below this width the sidebar starts folded. Default 900. */
  foldBelow?: number
  class?: string
}

const ShellContext = createContext<ShellRegistry | null>(null)

/** The registry of the `Shell` around a view or panel. */
export const useShell = (): ShellRegistry | undefined => useContext(ShellContext) ?? undefined

// ── Which shell a key belongs to ────────────────────────────────────────────────────────────────────
interface Instance {
  root: () => HTMLElement | undefined
  main: () => boolean
  used: number
}
const instances: Instance[] = []
let clock = 0
const LAYER = "[data-part=popover], [role=dialog], [role=menu], [role=listbox], [data-part=palette]"

/** The shell an event belongs to: the one it happened in; from the page or a floating layer, the one used last. */
function ownerOf(e: Event): Instance | undefined {
  const t = e.target instanceof Node ? e.target : null
  const inside = t && instances.find((i) => i.root()?.contains(t))
  if (inside) return inside
  const loose =
    !t ||
    t === document.body ||
    t === document.documentElement ||
    t === document ||
    (t instanceof Element && !!t.closest(LAYER))
  if (!loose) return undefined
  let last: Instance | undefined
  for (const i of instances) if (i.used > 0 && (!last || i.used > last.used)) last = i
  return last ?? instances.find((i) => i.main()) ?? (instances.length === 1 ? instances[0] : undefined)
}

/** The shell's window: everything derived from the registry, and its keyboard model. */
export function Shell(props: ShellProps): JSX.Element {
  const shell = untrack(() => props.shell)
  let root: HTMLElement | undefined
  let sidebarCtl: ReturnType<typeof useShellSidebar>

  const host: ShellKeyHost = {
    toggleSidebar: () => sidebarCtl?.toggle(),
    focusFilter: () => {
      const input = root?.querySelector<HTMLInputElement>("[data-part=sidebar-filter] input")
      if (!input || sidebarCtl?.folded()) return false
      input.focus()
      return true
    },
  }

  const me: Instance = { root: () => root, main: () => !!props.main, used: 0 }
  instances.push(me)
  onCleanup(() => {
    const i = instances.indexOf(me)
    if (i >= 0) instances.splice(i, 1)
  })

  onSettled(() => {
    if (untrack(() => props.keys) === false || !root) return
    const el = root
    const onKey = (e: KeyboardEvent) => {
      if (ownerOf(e) !== me) return
      shell.handleKey(e, host)
    }
    const used = () => {
      me.used = ++clock
    }
    // The mouse's back and forward buttons walk the history, inside this shell.
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return
      e.preventDefault()
      if (e.type === "mouseup") e.button === 3 ? shell.history.back() : shell.history.forward()
    }
    window.addEventListener("keydown", onKey)
    el.addEventListener("pointerdown", used, true)
    el.addEventListener("focusin", used, true)
    el.addEventListener("mousedown", onMouse)
    el.addEventListener("mouseup", onMouse)
    return () => {
      window.removeEventListener("keydown", onKey)
      el.removeEventListener("pointerdown", used, true)
      el.removeEventListener("focusin", used, true)
      el.removeEventListener("mousedown", onMouse)
      el.removeEventListener("mouseup", onMouse)
    }
  })

  const phone = usePhone()
  shell.setPhone(untrack(phone))
  createEffect(phone, (v) => shell.setPhone(v))

  const desktop = () => (props.runsIn ?? "desktop") === "desktop"
  const box = () => shell.lensBox()
  const viewKey = createMemo(() => {
    const l = shell.loc()
    return `${l.frame.key}/${l.lens?.id ?? ""}/${l.place?.id ?? ""}`
  })

  /** Catches the sidebar's fold from inside the AppShell, and draws the header. */
  function Head(): JSX.Element {
    sidebarCtl = useShellSidebar()
    const s = () => shell.sidebar()
    return (
      <SidebarHeader
        up={s().up}
        filter={shell.filter()}
        onFilterChange={shell.setFilter}
        filterLabel={`Filter ${s().label}`}
        onCollapseAll={s().parents.length ? () => shell.setCollapsed(s().parents) : undefined}
      />
    )
  }

  // A view whose layout lacks room for its own sidebar beside the shell's folds the shell's sidebar to its rail,
  // and the sidebar comes back once the view has the room again. One the person folded or opened stays so.
  const lacking = new Map<ViewLayoutHandle, number>()
  let auto: { before: number; gain?: number } | undefined
  const layoutHost: ViewLayoutHostValue = {
    storage: shell.storage,
    mount: () => () => {},
    // Called from the layout's effect: what it reads of the sidebar it reads once.
    report: (handle, shortfall) =>
      untrack(() => {
        if (shortfall === null) lacking.delete(handle)
        else lacking.set(handle, shortfall)
        const ctl = sidebarCtl
        if (!ctl || ctl.drawer()) return
        const worst = lacking.size ? Math.max(...lacking.values()) : Number.NEGATIVE_INFINITY
        if (!auto) {
          if (worst > 0 && !ctl.folded()) {
            auto = { before: worst }
            ctl.setFolded(true)
          }
          return
        }
        if (!ctl.folded()) {
          auto = undefined
          return
        }
        if (auto.gain === undefined && Number.isFinite(worst)) {
          auto.gain = Math.max(0, auto.before - worst)
          return
        }
        if (!Number.isFinite(worst) || worst + (auto.gain ?? 0) <= 0) {
          auto = undefined
          ctl.setFolded(false)
        }
      }),
  }

  const panel = (p: ShellPanelSpec) => (
    <ShellPanel
      id={p.id}
      at={p.at}
      title={p.label}
      trail={shell.panelTrail(p.id)}
      tabs={p.tabs?.({ shell })}
      actions={p.actions?.({ shell })}
      storage={shell.storage}
      closeShortcut={p.at === "bottom" ? "⌘ J" : "Esc"}
      onClose={() => shell.closePanel(p.at)}
    >
      {p.render({ shell })}
    </ShellPanel>
  )

  return (
    <ShellContext value={shell}>
      <div
        ref={(el) => {
          root = el
        }}
        data-part="shell"
        class={cx("nc", props.class)}
        style={{ display: "contents" }}
      >
        <AppShell
          storage={shell.storage}
          keys={false}
          foldBelow={props.foldBelow}
          covers={shell.panels().covers}
          sidebarLabel={shell.sidebar().label}
          titleBar={
            <TitleBar
              runsIn={props.runsIn}
              icon={props.icon}
              appMenu={props.appMenu}
              history={shell.history}
              path={shell.path()}
              scope={box().scope}
              lenses={box().lenses}
              lens={box().lens}
              onLensChange={shell.wear}
              lensPrefs={box().prefs}
              onLensPrefsChange={box().setPrefs}
              palette={{
                search: shell.search,
                actions: shell.actions(),
                workspace: shell.options.workspace.name,
              }}
              paletteOpen={shell.paletteOpen()}
              onPaletteOpenChange={shell.setPaletteOpen}
              status={props.status}
              windowControls={
                desktop()
                  ? {
                      style: props.window?.style,
                      onMinimise: props.window?.onMinimise,
                      onMaximise: props.window?.onMaximise,
                      onClose: props.window?.onClose,
                      maximised: props.window?.maximised?.(),
                    }
                  : undefined
              }
              appearance={props.appearance}
              keys={false}
            />
          }
          sidebarHeader={<Head />}
          sidebar={
            <Nav
              label={shell.sidebar().label}
              groups={shell.sidebar().groups}
              filter={shell.filter()}
              collapsed={shell.collapsed()}
              onCollapsedChange={shell.setCollapsed}
            />
          }
          sidebarFoot={<Show when={props.account}>{(a) => <AccountMenu {...a()} />}</Show>}
          rail={
            <PanelRail panels={shell.panels().rail} open={shell.panels().open} onToggle={shell.togglePanel} />
          }
          right={
            <Show when={shell.panels().right} keyed>
              {(p) => panel(p)}
            </Show>
          }
          bottom={
            <Show when={shell.panels().bottom} keyed>
              {(p) => panel(p)}
            </Show>
          }
        >
          <ViewLayoutHost value={layoutHost}>
            <Show when={viewKey()} keyed>
              {(_key) => {
                const View = untrack(() => shell.loc().render)
                return View ? <View shell={shell} /> : null
              }}
            </Show>
          </ViewLayoutHost>
        </AppShell>
      </div>
    </ShellContext>
  )
}

/**
 * The view's header inside a `Shell`: the place's title, or at a record the trail ("Issues / WEB-142 ⌄") and the
 * stepper, from the registry. The view adds its actions and content.
 */
export function ShellViewHeader(props: Omit<ViewHeaderProps, "trail" | "stepper">): JSX.Element {
  const shell = useShell()
  const h = () => shell?.header()
  return (
    <ViewHeader
      title={h()?.trail ? undefined : (props.title ?? h()?.title)}
      trail={h()?.trail}
      stepper={h()?.stepper}
      context={props.context}
      actions={props.actions}
      noPin={props.noPin}
      class={props.class}
    >
      {props.children}
    </ViewHeader>
  )
}
