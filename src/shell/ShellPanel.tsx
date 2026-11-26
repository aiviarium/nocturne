// A panel docked in the view's raised surface: at its right, or under it. A 44px header (the panel's name or its
// trail, real content tabs when it has them, its actions, close), then its body. The panel's edge resizes it. It
// never repeats the rail as tabs, and it has no split or tiling. A panel whose content the view already shows (the
// shell's `covers`) stays mounted but hidden, and comes back when the view changes. The right panel floats over the
// view when docking it would leave the view narrower than 480px.
import type { JSX } from "@solidjs/web"
import { createEffect, createSignal, onCleanup, onSettled, Show, untrack } from "solid-js"
import { IconButton } from "../components/IconButton"
import type { MenuEntry } from "../components/Menu"
import { Popover } from "../components/Popover"
import { type TabStatus, TabStrip, type TabStripItem } from "../components/TabStrip"
import { cx } from "../lib/cx"
import { type PanelSide, useShellFrame } from "./context"
import { createStoredWidth, ResizeHandle, type SizeModel } from "./ResizeHandle"
import type { ShellStorage } from "./storage"
import { Trail, type TrailCrumb } from "./Trail"

export interface ShellPanelTab {
  id: string
  label: string
  /** Dimmed words after the label: "exit 2". */
  detail?: string
  /** The state of what the tab runs, as its dot. */
  status?: TabStatus
}

/** A panel's own content tabs, such as a terminal's sessions, with full tab management. */
export interface ShellPanelTabs {
  /** Names the tab list: "Sessions". */
  label: string
  items: ShellPanelTab[]
  value: string
  onChange: (id: string) => void
  /** Opens a new tab: the + button, ⌘T while the panel shows, a double click on the strip's empty part. */
  onNew?: () => void
  /** Names the + button: "New session". Default "New tab". */
  newLabel?: string
  /** Closes tabs: one from its × or a middle click, several from "Close others" and "Close to the right". */
  onClose?: (ids: string[]) => void
  /** Renames a tab: a double click on it, or Rename in its menu. */
  onRename?: (id: string, name: string) => void
  /** The tabs in their new order, after a drag or Alt+Arrow. */
  onReorder?: (ids: string[]) => void
}

export interface ShellPanelProps {
  /** What `covers` names: a panel whose id the shell's `covers` holds is hidden. */
  id?: string
  at: PanelSide
  /** The panel's name in its header. */
  title?: string
  /** Where the panel is, when it drilled (Details › WEB-127): replaces the title, the last crumb current. */
  trail?: TrailCrumb[]
  /** Real content tabs after the name. */
  tabs?: ShellPanelTabs
  /** Buttons at the header's right, before close. */
  actions?: JSX.Element
  /** Closes the panel: the × at the header's end and Escape inside the panel. */
  onClose?: () => void
  /** The shortcut shown on close's tooltip. Default "Esc". */
  closeShortcut?: string
  /** Its width (right) or height (bottom). Default 340px (280 to 520) or 280px (140 to 600), kept in `storage`. */
  size?: SizeModel
  storage?: ShellStorage
  class?: string
  children?: JSX.Element
}

/** A docked panel: header, body and a resizable edge. */
export function ShellPanel(props: ShellPanelProps): JSX.Element {
  const frame = useShellFrame()
  const at = untrack(() => props.at)
  const size = untrack(
    () =>
      props.size ??
      createStoredWidth(`panel/${at}`, {
        initial: at === "right" ? 340 : 280,
        min: at === "right" ? 280 : 140,
        max: at === "right" ? 520 : 600,
        storage: props.storage,
      }),
  )
  const covered = () => !!props.id && (frame?.covers().includes(props.id) ?? false)
  if (frame) onCleanup(frame.register(at, { size: size.value, shown: () => !covered() }))
  const overlay = () => at === "right" && (frame?.overlay() ?? false)
  const name = () => props.title ?? props.trail?.at(-1)?.label ?? "Panel"
  let root: HTMLElement | undefined

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented || !props.onClose) return
    const t = e.target as HTMLElement | null
    if (t?.closest("[data-part=popover], [role=menu], [role=dialog], [role=listbox]")) return
    e.preventDefault()
    props.onClose()
  }

  return (
    <section
      ref={(el) => {
        root = el
      }}
      data-part="shell-panel"
      data-at={at}
      data-overlay={overlay() ? "" : undefined}
      data-panel={props.id}
      hidden={covered()}
      aria-label={name()}
      class={cx("nc-shell-panel", props.class)}
      style={{ "--nc-panel-size": `${size.value()}px` }}
      onKeyDown={onKeyDown}
    >
      <Show when={!overlay()}>
        <ResizeHandle at={at === "right" ? "left" : "top"} size={size} label={`Resize ${name()}`} />
      </Show>
      <header class="nc-shell-panel__head" data-part="shell-panel-header">
        <Show when={props.trail?.length} fallback={<h2 class="nc-shell-panel__title">{props.title}</h2>}>
          <Trail crumbs={props.trail ?? []} label={`Where ${name()} is`} class="nc-shell-panel__trail" />
        </Show>
        <Show when={props.tabs}>
          {(tabs) => (
            <>
              <span class="nc-shell-panel__sep" aria-hidden="true" />
              <PanelTabs tabs={tabs()} shown={() => !covered()} root={() => root} />
            </>
          )}
        </Show>
        <span class="nc-shell-panel__actions">
          {props.actions}
          <Show when={props.tabs?.onNew}>
            <IconButton
              icon="plus"
              label={props.tabs?.newLabel ?? "New tab"}
              shortcut="⌘ T"
              data-part="shell-panel-new"
              onClick={() => props.tabs?.onNew?.()}
            />
          </Show>
          <Show when={props.onClose}>
            <IconButton
              icon="close"
              label="Close"
              shortcut={props.closeShortcut ?? "Esc"}
              data-part="shell-panel-close"
              onClick={() => props.onClose?.()}
            />
          </Show>
        </span>
      </header>
      <div class="nc-shell-panel__body" data-part="shell-panel-body">
        {props.children}
      </div>
    </section>
  )
}

const RENAME = "nc-panel-tab-rename"
const CLOSE = "nc-panel-tab-close"
const OTHERS = "nc-panel-tab-others"
const RIGHT = "nc-panel-tab-right"

/** The panel's tabs on a `TabStrip`: drag to reorder, rename, close, a context menu, ⌃Tab to cycle, ⌘T for new. */
function PanelTabs(props: {
  tabs: ShellPanelTabs
  shown: () => boolean
  root: () => HTMLElement | undefined
}): JSX.Element {
  const [renaming, setRenaming] = createSignal<string | undefined>(undefined, { ownedWrite: true })
  const t = () => props.tabs
  const ids = () => t().items.map((i) => i.id)
  const tabEl = (id: string) =>
    props.root()?.querySelector<HTMLElement>(`[data-part=tab-strip-tab][data-tab="${CSS.escape(id)}"]`) ??
    undefined
  const close = (list: string[]) => {
    if (list.length) t().onClose?.(list)
  }
  const cycle = (d: number) => {
    const all = ids()
    if (!all.length) return
    const i = all.indexOf(t().value)
    t().onChange(all[(i + d + all.length) % all.length]!)
  }

  onSettled(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!props.shown() || e.defaultPrevented) return
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key === "Tab") {
        e.preventDefault()
        cycle(e.shiftKey ? -1 : 1)
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "t") {
        if (!t().onNew) return
        e.preventDefault()
        t().onNew?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // A tab that went away while it was being renamed ends the rename.
  createEffect(
    () => renaming() !== undefined && !ids().includes(renaming()!),
    (gone) => {
      if (gone) setRenaming(undefined)
    },
  )

  const items = (): TabStripItem[] =>
    t().items.map((i) => ({ id: i.id, label: i.label, detail: i.detail, status: i.status }))
  const menu = (id: string): MenuEntry[] => {
    const all = ids()
    const i = all.indexOf(id)
    const out: MenuEntry[] = []
    if (t().onRename) out.push({ id: RENAME, label: "Rename", icon: "edit" }, { type: "separator" })
    if (t().onClose)
      out.push(
        { id: CLOSE, label: "Close" },
        { id: OTHERS, label: "Close others", disabled: all.length < 2 },
        { id: RIGHT, label: "Close to the right", disabled: i >= all.length - 1 },
      )
    return out
  }

  return (
    <div
      class="nc-shell-panel__tabs"
      data-part="shell-panel-tabs"
      onDblClick={(e) => {
        const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-part=tab-strip-tab]")
        if (!tab?.dataset.tab || !t().onRename) return
        e.preventDefault()
        e.stopPropagation()
        setRenaming(tab.dataset.tab)
      }}
    >
      <TabStrip
        label={t().label}
        items={items()}
        value={t().value}
        onChange={(id) => t().onChange(id)}
        onClose={t().onClose ? (id) => close([id]) : undefined}
        dragGroup={t().onReorder ? "nc-shell-panel" : undefined}
        onDrop={(d) => {
          const all = ids().filter((x) => x !== d.tabId)
          const from = ids().indexOf(d.tabId)
          if (from < 0) return
          const to = from < d.index ? d.index - 1 : d.index
          all.splice(Math.max(0, Math.min(to, all.length)), 0, d.tabId)
          t().onReorder?.(all)
        }}
        onNewTab={t().onNew ? () => t().onNew?.() : undefined}
        menu={menu}
        onMenuSelect={(id, entry) => {
          const all = ids()
          if (entry === RENAME) queueMicrotask(() => setRenaming(id))
          else if (entry === CLOSE) close([id])
          else if (entry === OTHERS) close(all.filter((x) => x !== id))
          else if (entry === RIGHT) close(all.slice(all.indexOf(id) + 1))
        }}
      />
      <Popover
        open={renaming() !== undefined}
        anchor={renaming() ? tabEl(renaming()!) : undefined}
        onClose={() => setRenaming(undefined)}
        placement="bottom-start"
        initialFocus="auto"
        class="nc-shell-panel__rename"
      >
        <Show when={renaming()} keyed>
          {(id) => (
            <form
              data-part="shell-panel-rename"
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem("name") as HTMLInputElement
                const v = input.value.trim()
                if (v) t().onRename?.(id, v)
                setRenaming(undefined)
              }}
            >
              <input
                name="name"
                class="nc-input"
                value={t().items.find((i) => i.id === id)?.label ?? ""}
                aria-label="Tab name"
                spellcheck={false}
                autocomplete="off"
                ref={(el) => queueMicrotask(() => el.select())}
              />
            </form>
          )}
        </Show>
      </Popover>
    </div>
  )
}
