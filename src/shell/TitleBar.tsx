// The window's title bar, 44px, in three zones: the app icon, the history arrows (desktop only) and the scope path at
// the left; the scope box on the window's absolute centre; the app's status items and the window controls at the
// right. The box moves only to clear the path or the right-hand items by 16px; with still no room the path folds,
// then the lenses drop their labels, then they fold one by one into the box's +N menu. A 1px line under the bar takes
// the lens's hue, strongest under the lens that is on. In a desktop window the bar is the drag region.
import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, onCleanup, onSettled, Show, untrack } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { DropdownMenu, type MenuEntry } from "../components/Menu"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import type { Appearance } from "./appearance"
import {
  CommandPalette,
  type PaletteChip,
  type PaletteCommand,
  type PaletteQuery,
  type PaletteSection,
} from "./CommandPalette"
import { HistoryArrows } from "./HistoryArrows"
import type { ShellHistory } from "./history"
import { lensById, shownLenses } from "./LensSwitch"
import { ScopeBox } from "./ScopeBox"
import { ScopePath, type ScopeSegment } from "./ScopePath"
import type { Lens, LensPrefs } from "./types"
import { WindowControls, type WindowControlsProps } from "./WindowControls"

/** The room kept between the path, the box and the right-hand items. */
export const TITLE_BAR_GAP = 16
/** The "…" button that stands for the folded segments. */
const FOLD_W = 28
/** What the "+N" count adds to the box's menu button when it was not showing. */
const PLUS_W = 16
/** The gap between a lens's icon and its label. */
const LABEL_GAP = 6

/** What the title bar measures to place the box, in px. The path's and the box's widths are taken unfolded. */
export interface TitleBarMetrics {
  /** The bar's width. */
  width: number
  /** Where the path starts. */
  pathStart: number
  /** Each segment's width, a leading "/" included, in order. */
  segments: number[]
  /** Where the right-hand items start. */
  end: number
  /** The box's width with every label shown and nothing folded. */
  box: number
  /** What dropping the labels saves (the search field's key caps, without lenses). */
  labels: number
  /** One lens button without its label. */
  lens: number
  /** How many lens buttons the box shows. */
  lenses: number
  /** What the "+N" count adds when it is not showing yet. */
  plus: number
}

/** Where the box goes and how much gives way for it. */
export interface TitleBarPlacement {
  /** Leading segments folded into "…". */
  fold: number
  /** Lenses as icons only. */
  compact: boolean
  /** Lenses folded into the +N menu. */
  squeeze: number
  /** The box's left edge, from the bar's. */
  left: number
}

/**
 * Places the box: centred on the bar, pushed right just enough to clear the path or left to clear the right-hand
 * items. When it does not fit, the path folds from the start, then the lenses drop their labels, then they fold into
 * +N one by one. The last segment never folds and the lens that is on never leaves the box.
 */
export function placeScopeBox(m: TitleBarMetrics): TitleBarPlacement {
  const n = m.segments.length
  const pathW = (k: number) => m.segments.slice(k).reduce((s, w) => s + w, 0) + (k > 0 ? FOLD_W : 0)
  const boxW = (c: boolean, q: number) => m.box - (c ? m.labels : 0) - q * m.lens + (q > 0 ? m.plus : 0)
  const tries: Array<[number, boolean, number]> = []
  for (let k = 0; k < Math.max(1, n); k++) tries.push([k, false, 0])
  const most = Math.max(0, n - 1)
  if (m.labels > 0) tries.push([most, true, 0])
  for (let q = 1; q < m.lenses; q++) tries.push([most, m.labels > 0, q])
  const right = m.end - TITLE_BAR_GAP
  const fits = ([k, c, q]: [number, boolean, number]) =>
    m.pathStart + pathW(k) + TITLE_BAR_GAP + boxW(c, q) <= right
  const [fold, compact, squeeze] = tries.find(fits) ?? tries[tries.length - 1]!
  const bw = boxW(compact, squeeze)
  const min = m.pathStart + pathW(fold) + TITLE_BAR_GAP
  const left = Math.round(Math.max(min, Math.min(m.width / 2 - bw / 2, right - bw)))
  return { fold, compact, squeeze, left }
}

/** Reads the metrics from the bar as drawn. */
export function measureTitleBar(bar: HTMLElement): TitleBarMetrics {
  const path = bar.querySelector<HTMLElement>('[data-part="scope-path"]')
  const end = bar.querySelector<HTMLElement>("[data-title-bar-end]")
  const box = bar.querySelector<HTMLElement>('[data-part="scope-box"]')
  const segments = path
    ? [...path.querySelectorAll<HTMLElement>("[data-seg]")].map((el) => el.offsetWidth)
    : []
  const labelEls = box ? [...box.querySelectorAll<HTMLElement>("[data-label]")] : []
  const lensMode = box?.getAttribute("data-mode") === "lenses"
  const labels = lensMode
    ? labelEls.reduce((s, el) => s + el.offsetWidth + LABEL_GAP, 0)
    : (box?.querySelector<HTMLElement>(".nc-kbd")?.offsetWidth ?? 0)
  const buttons = box ? [...box.querySelectorAll<HTMLElement>("[data-lens]")] : []
  const one = buttons.find((b) => !b.hasAttribute("data-checked")) ?? buttons[0]
  const oneLabel = one?.querySelector<HTMLElement>("[data-label]")?.offsetWidth ?? 0
  return {
    width: bar.clientWidth,
    pathStart: path ? path.offsetLeft : 0,
    segments,
    end: end ? end.offsetLeft : bar.clientWidth,
    box: box?.offsetWidth ?? 0,
    labels,
    lens: one ? one.offsetWidth - oneLabel - LABEL_GAP : 0,
    lenses: buttons.length,
    plus: box?.querySelector("[data-more]") ? 0 : PLUS_W,
  }
}

export interface TitleBarPaletteOptions {
  /** The results for a search, section by section. */
  search: (query: PaletteQuery) => PaletteSection[]
  /** What `>` lists. */
  actions?: PaletteSection[]
  /** The chips the field starts with. Default: the path's last segment, then the lens that is on. */
  chips?: PaletteChip[]
  /** What `:` lists. Default: the scope's lenses, each switching to itself. */
  lenses?: PaletteCommand[]
  /** The search's name with no chips left: "Acme". */
  workspace?: string
}

export interface TitleBarProps {
  /** A desktop window shows the history arrows and the window controls and is the drag region. Default desktop. */
  runsIn?: "desktop" | "browser"
  /** The app's icon at the left: a name from the icon set, or any element. No chip behind it. */
  icon?: IconName | JSX.Element
  /** Makes the icon a menu button: the application menu. */
  appMenu?: { label: string; items: MenuEntry[]; onSelect: (id: string) => void }
  /** The window's history: its arrows sit after the icon in a desktop window. */
  history?: ShellHistory
  /** The scopes, from the workspace down. */
  path: ScopeSegment[]
  /** What the box searches: "Search Atlas web…". Default the last segment's label. */
  scope?: string
  /** The scope's lenses. Empty or left out, the box is a search field and the line is neutral. */
  lenses?: Lens[]
  lens?: string
  onLensChange?: (id: string) => void
  lensPrefs?: LensPrefs
  onLensPrefsChange?: (prefs: LensPrefs) => void
  /** The command palette the box opens. Without it the magnifier and ⌘K do nothing. */
  palette?: TitleBarPaletteOptions
  /** Controlled palette state. */
  paletteOpen?: boolean
  onPaletteOpenChange?: (open: boolean) => void
  /** The app's status items, before the window controls: `TitleBarItem`s. */
  status?: JSX.Element
  /** The window controls' style and handlers, in a desktop window. Default the mac style with no handlers. */
  windowControls?: Omit<WindowControlsProps, "class">
  /** The theme, the accent that follows the lens and whether the line takes the lens's hue. */
  appearance?: Appearance
  /** The line under the bar takes the lens's hue. Default the appearance's `tintLine`, or on. */
  tintLine?: boolean
  /** The attribute a desktop runtime reads for its drag region. Default `data-drag-region`. */
  dragAttribute?: string
  /** Binds ⌘K for the palette and ⌘1…⌘9 for the lenses on `window`. Default true. */
  keys?: boolean
  /** Reads the metrics the box is placed by. For tests and for bars drawn outside the DOM's layout. */
  measure?: (bar: HTMLElement) => TitleBarMetrics
  class?: string
}

/** The title bar: icon, arrows and path; the scope box on the centre; status items and window controls. */
export function TitleBar(props: TitleBarProps): JSX.Element {
  let bar: HTMLElement | undefined
  let box: HTMLDivElement | undefined
  const desktop = () => (props.runsIn ?? "desktop") === "desktop"
  const scope = () => props.scope ?? props.path[props.path.length - 1]?.label ?? ""
  const lenses = () => props.lenses ?? []
  const active = () => lensById(lenses(), props.lens)

  const [fold, setFold] = createSignal(0, { ownedWrite: true })
  const [compact, setCompact] = createSignal(false, { ownedWrite: true })
  const [squeeze, setSqueeze] = createSignal(0, { ownedWrite: true })
  const [left, setLeft] = createSignal<number | undefined>(undefined, { ownedWrite: true })
  let metrics: TitleBarMetrics | undefined

  const [localOpen, setLocalOpen] = createSignal(false, { ownedWrite: true })
  const paletteOpen = () => props.paletteOpen ?? localOpen()
  const setPaletteOpen = (next: boolean) => {
    if (props.paletteOpen === undefined) setLocalOpen(next)
    props.onPaletteOpenChange?.(next)
  }

  const read = () => (bar ? (props.measure ?? measureTitleBar)(bar) : undefined)
  const layout = () => {
    if (!metrics) return
    const p = placeScopeBox(metrics)
    setFold(p.fold)
    setCompact(p.compact)
    setSqueeze(p.squeeze)
    setLeft(p.left)
  }
  const measure = () => {
    metrics = read()
    layout()
  }
  // A resize keeps the widths taken unfolded and reads only where the path starts and the right-hand items begin.
  const resize = () => {
    const now = read()
    if (!metrics || !now) return
    metrics = { ...metrics, width: now.width, end: now.end, pathStart: now.pathStart }
    layout()
  }
  // Measured unfolded: with nothing folded the bar already shows every width in full, so it is measured at once and
  // the box placed before the frame is drawn. Folded, it unfolds and measures in the microtask after the DOM update,
  // still before the frame.
  const remeasure = () =>
    untrack(() => {
      if (!fold() && !compact() && !squeeze()) return measure()
      setFold(0)
      setCompact(false)
      setSqueeze(0)
      queueMicrotask(measure)
    })
  createEffect(
    () =>
      [
        props.path.map((s) => `${s.id}:${s.label}`).join("/"),
        lenses()
          .map((l) => `${l.id}:${l.label}`)
          .join(),
        JSON.stringify(props.lensPrefs ?? null),
        props.lens,
        scope(),
        desktop(),
        props.windowControls?.style,
        !!props.history,
      ].join("|"),
    () => remeasure(),
  )

  // The line's bright spot sits under the lens that is on; the bar sets it once the box is placed.
  const placeLine = () => {
    if (!bar) return
    const on = bar.querySelector<HTMLElement>('[data-part="lens-switch"] [data-checked]')
    if (!on) return
    const a = bar.getBoundingClientRect()
    const b = on.getBoundingClientRect()
    if (!b.width) return
    bar.style.setProperty("--nc-lens-x", `${Math.round(b.left + b.width / 2 - a.left)}px`)
  }
  createEffect(
    () => `${left()}|${compact()}|${squeeze()}|${props.lens}`,
    () => placeLine(),
  )

  onSettled(() => {
    if (!bar) return
    const disposers: Array<() => void> = []
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => {
        resize()
        placeLine()
      })
      ro.observe(bar)
      // A status item that changes width moves the right-hand edge.
      const end = bar.querySelector("[data-title-bar-end]")
      const ends = new ResizeObserver(() => remeasure())
      if (end) ends.observe(end)
      disposers.push(
        () => ro.disconnect(),
        () => ends.disconnect(),
      )
    }
    document.fonts?.ready.then(() => remeasure())
    return () => {
      for (const d of disposers) d()
    }
  })

  if (untrack(() => props.keys) !== false && typeof window !== "undefined") {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return
      if (!props.palette || e.defaultPrevented) return
      e.preventDefault()
      setPaletteOpen(!paletteOpen())
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  }

  const tint = () => {
    const on = props.tintLine ?? props.appearance?.tintLine() ?? true
    return on && active() ? "lens" : "neutral"
  }

  // The palette searches the scope the window shows, through the lens that is on; Backspace widens from there.
  const chips = (): PaletteChip[] => {
    if (props.palette?.chips) return props.palette.chips
    const here = props.path[props.path.length - 1]
    const scopes: PaletteChip[] = here
      ? [{ id: here.id, label: here.label, mark: here.mark, icon: here.icon }]
      : []
    const on = active()
    return on ? [...scopes, { id: `lens:${on.id}`, label: on.label, icon: on.icon, hue: on.hue }] : scopes
  }
  const lensCommands = createMemo((): PaletteCommand[] => {
    if (props.palette?.lenses) return props.palette.lenses
    const shown = shownLenses(lenses(), props.lensPrefs)
    return lenses().map((l) => {
      const i = shown.indexOf(l)
      return {
        id: `lens:${l.id}`,
        label: l.label,
        hint: l.id === props.lens ? "On" : l.purpose,
        icon: l.icon,
        hue: l.hue,
        keywords: ["lens", ...(l.purpose ? [l.purpose] : [])],
        shortcut: i >= 0 && i < 9 ? `⌘ ${i + 1}` : undefined,
        run: () => props.onLensChange?.(l.id),
      }
    })
  })

  const drag = () => (desktop() ? { [props.dragAttribute ?? "data-drag-region"]: "" } : {})

  return (
    <header
      ref={(el) => {
        bar = el
      }}
      data-part="title-bar"
      data-runs-in={desktop() ? "desktop" : "browser"}
      data-tint={tint()}
      data-hue={tint() === "lens" ? active()?.hue : undefined}
      data-palette={paletteOpen() ? "" : undefined}
      data-placed={left() === undefined ? undefined : ""}
      class={cx("nc-title-bar", props.class)}
      {...drag()}
    >
      <div class="nc-title-bar__lead">
        <AppIcon icon={props.icon} menu={props.appMenu} />
        <Show when={desktop() && props.history}>{(h) => <HistoryArrows history={h()} />}</Show>
        <ScopePath segments={props.path} fold={fold()} />
      </div>
      <ScopeBox
        ref={(el) => {
          box = el
        }}
        class="nc-title-bar__box"
        style={{ left: left() === undefined ? "50%" : `${left()}px` }}
        scope={scope()}
        lenses={lenses()}
        lens={props.lens}
        onLensChange={props.onLensChange}
        lensPrefs={props.lensPrefs}
        onLensPrefsChange={props.onLensPrefsChange}
        onSearch={() => props.palette && setPaletteOpen(true)}
        appearance={props.appearance}
        compact={compact()}
        squeeze={squeeze()}
        keys={props.keys}
      />
      <div class="nc-title-bar__end" data-title-bar-end="">
        {props.status}
        <Show when={desktop()}>
          <WindowControls {...(props.windowControls ?? {})} />
        </Show>
      </div>
      <Show when={props.palette}>
        {(p) => (
          <CommandPalette
            open={paletteOpen()}
            onClose={() => setPaletteOpen(false)}
            anchor={box}
            chips={chips()}
            search={p().search}
            lenses={lensCommands()}
            actions={p().actions}
            workspace={p().workspace}
          />
        )}
      </Show>
    </header>
  )
}

function AppIcon(props: { icon?: IconName | JSX.Element; menu?: TitleBarProps["appMenu"] }): JSX.Element {
  const glyph = () =>
    typeof props.icon === "string" || props.icon === undefined ? (
      <Icon name={(props.icon as IconName | undefined) ?? "sparkle"} size="md" />
    ) : (
      props.icon
    )
  return (
    <Show when={props.menu} fallback={<span class="nc-title-bar__app">{glyph()}</span>}>
      {(m) => (
        <DropdownMenu
          label={m().label}
          matchWidth={false}
          minWidth="240px"
          items={m().items}
          onSelect={(id) => m().onSelect(id)}
          trigger={(t) => (
            <button {...t} type="button" class="nc-title-bar__app" aria-label={m().label}>
              {glyph()}
            </button>
          )}
        />
      )}
    </Show>
  )
}

export interface TitleBarItemProps {
  label: string
  icon?: IconName
  /** A status colour for text that needs attention: "1 failing" in warning. */
  tone?: "warning" | "danger" | "success"
  /** The tooltip: what the item stands for in full. */
  tooltip?: string
  onClick?: () => void
  /** The item is the current place: the faint fill. */
  current?: boolean
}

/** A status item at the bar's right: an icon and a few words at the drill size, quiet until hovered. */
export function TitleBarItem(props: TitleBarItemProps): JSX.Element {
  const button = (t: Record<string, unknown> = {}) => (
    <button
      {...t}
      type="button"
      data-part="title-bar-item"
      data-tone={props.tone}
      aria-current={props.current ? "page" : undefined}
      class="nc-title-bar__item"
      onClick={() => props.onClick?.()}
    >
      <Show when={props.icon}>{(i) => <Icon name={i()} size="sm" />}</Show>
      {props.label}
    </button>
  )
  return (
    <Show when={props.tooltip} fallback={button()}>
      {(tip) => (
        <Tooltip content={tip()} placement="bottom" type="description">
          {(t) => button(t)}
        </Tooltip>
      )}
    </Show>
  )
}
