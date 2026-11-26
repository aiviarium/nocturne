// The integrated shell: one registry of scopes, lenses, places, panels and records, from which every part of the
// window is derived. The app declares what exists; the shell resolves the address into where the person is, and
// derives the title bar's path and lens box, the sidebar's tree for the current scope, the view header's trail and
// stepper, the panels the rail offers (and which ones the view `covers`), the palette's search, the history's names
// and the keyboard model. The address comes from the app's router; prefs come from the app's store. Nothing here
// talks to a network, the location bar or the native window.
//
// An address is a list of segments: `/projects/atlas/build/issues/backlog/WEB-142`. The module (a top-level scope),
// then its item (a project), then the lens, the place, the saved view and the record; a place that `enters` a scope
// adds that scope's item and continues with its lens and place. A trailing `@details:WEB-127,WEB-126` is a panel's
// drill. A short address (`/projects/atlas`) means "the lens worn last there, at the place it remembers"; the history
// writes every stop out in full.
import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, untrack } from "solid-js"
import type { LabelHue } from "../components/Badge"
import type { IconName } from "../components/Icon"
import { Mark } from "../components/Mark"
import type { NavGroup, NavItemProps } from "../components/NavItem"
import type { ViewStepper } from "../components/ViewHeader"
import { openLayers } from "../lib/layers"
import type { PaletteCommand, PaletteQuery, PaletteSection } from "./CommandPalette"
import { createHistory, type HistoryRouter, type ShellHistory, type StopInfo } from "./history"
import { shownLenses } from "./LensSwitch"
import type { RailPanel } from "./PanelRail"
import type { ScopeSegment } from "./ScopePath"
import type { ShellPanelTabs } from "./ShellPanel"
import type { SwitcherEntry, SwitcherSection } from "./Switcher"
import { readJson, type ShellStorage, writeJson } from "./storage"
import type { TrailCrumb } from "./Trail"
import type { Lens, LensPrefs, ShellMark } from "./types"

/** What a place's view and a panel receive: the shell, which they read `loc()` and the rest from. */
export interface ShellViewProps {
  shell: ShellRegistry
}

/** A saved view of a place: a child row under it in the sidebar. The first is the place's own. */
export interface ShellSavedView {
  id: string
  label: string
  icon?: IconName
}

/** One record of a place's list: what the stepper steps over and the record crumb's switcher lists. */
export interface ShellRecord {
  /** Its segment in the address. */
  id: string
  /** Its name in the trail and the switcher: "WEB-142". */
  label: string
  /** Quiet text after it: the title. */
  hint?: string
  icon?: IconName
  mark?: ShellMark
}

/** A place in a scope's sidebar tree. */
export interface ShellPlace<T = any> {
  id: string
  label: string
  icon?: IconName
  /** The view the place shows. Left out, a child place uses its parent's, and then the scope's. */
  view?: (props: ShellViewProps) => JSX.Element
  /** Saved views: child rows in the sidebar; the first is the place's own and takes no segment. */
  views?: ShellSavedView[]
  /** Shown in the sidebar above zero. */
  count?: (item: T) => number | undefined
  /**
   * The place's records, in the order and filter of the saved view: the segment after the place (or the view) is
   * one of them. The view header steps over this list and its record crumb switches within it.
   */
  records?: (item: T, view: string | undefined) => ShellRecord[]
  /** A record's name, when the list does not hold it (an address from elsewhere). Default its id. */
  recordLabel?: (id: string) => string | undefined
  /** What a record is called: "issue" reads "Switch issue…", "Next issue". Default "item". */
  noun?: string
  /** `false` for a view that names its record itself (a workbench's tabs): no trail and no stepper. */
  trail?: false
  /** Places nested under this one. */
  children?: ShellPlace<T>[]
  /** The place lists scopes: opening one of its rows (`shell.enter`) nests that scope in the path. */
  enters?: ShellScope<any>
  /** Panels whose content this place's view already is: the rail hides them, and an open one steps aside. */
  covers?: string[]
  /** What a panel such as Details shows for one of the place's records. */
  inspect?: (record: string, item: T) => JSX.Element
}

/** A way of looking at a scope: its places, its panels and its hue. */
export interface ShellLens<T = any> extends Lens {
  places: ShellPlace<T>[]
  /** The panels the rail offers through this lens, by id. Default the scope's, then every panel. */
  panels?: PanelChoice
  /** The panels open the first time the lens is put on. */
  open?: { right?: string; bottom?: string }
  /** `false`: in Customise's hidden list until the person shows it (a plugin's lens). Default shown. */
  pinned?: boolean
}

/** Which panels the rail offers, by id. */
export interface PanelChoice {
  right?: string[]
  bottom?: string[]
}

/** Something the palette's `>` runs. */
export interface ShellCommand {
  id: string
  label: string
  icon?: IconName
  /** Shown as key caps: "C", "G S". The shell does not bind it. */
  shortcut?: string
  keywords?: string[]
  run: (shell: ShellRegistry) => void
}

/** A kind of scope: a module (Projects, Hosts), the items under it (a project), or a scope a place enters. */
export interface ShellScope<T = any> {
  /** The kind's id: the module's segment, and the key its lens prefs are kept under. */
  id: string
  /** A module's name, or a function naming one item. */
  label: string | ((item: T) => string)
  icon?: IconName
  mark?: (item: T) => ShellMark
  /** What one item is called: "project" reads "Switch project…". */
  noun?: string
  /** The items of a parameter scope, given the parent's item. Also the siblings its switcher lists. */
  items?: (parent?: unknown) => T[]
  /** An item's segment. Default its `id`. */
  itemId?: (item: T) => string
  /** The parameter scope under a module: a project under Projects. */
  child?: ShellScope<any>
  /** The scope's sidebar tree, when it has no lenses. */
  places?: ShellPlace<T>[]
  /** Ways of looking at the scope. With lenses, the lens's places replace `places`. */
  lenses?: ShellLens<T>[]
  /** The scope's own view, when the address names no place in it (Projects listing its projects). */
  view?: (props: ShellViewProps) => JSX.Element
  /** The rail's panels in this scope when its lens names none. */
  panels?: PanelChoice
  /** The `>` actions while the person is in the scope. */
  commands?: ShellCommand[]
  /** A module's count in the workspace's sidebar. */
  count?: () => number | undefined
  /** What a panel such as Details shows when nothing in the scope is selected. */
  inspect?: (item: T) => JSX.Element
}

/** A panel the rail opens at the view's right or under it. */
export interface ShellPanelSpec {
  id: string
  label: string
  icon: IconName
  at: "right" | "bottom"
  /** The letter it toggles with ⌥: "d" for ⌥D. */
  key?: string
  render: (props: ShellViewProps) => JSX.Element
  /** Its own content tabs, such as a terminal's sessions. */
  tabs?: () => ShellPanelTabs | undefined
  /** Buttons in its header before close. */
  actions?: () => JSX.Element
}

export interface ShellWorkspace {
  id: string
  name: string
  hue?: LabelHue
}

export interface ShellOptions {
  /** Where the address comes from and goes to: `memoryRouter()`, `hashRouter()` or the app's own. */
  router: HistoryRouter
  /** Where lens prefs and the history are kept. Without one they last as long as the page. */
  storage?: ShellStorage
  /** Tells two shells in one page apart in the store and the router's state. Default `shell`. */
  id?: string
  /** The workspace: the path's first segment. */
  workspace: ShellWorkspace
  /** The workspaces its switcher lists; with one or none it has no switcher. */
  workspaces?: ShellWorkspace[]
  onWorkspaceChange?: (id: string) => void
  /** The modules: top-level scopes, in the sidebar's order. The first is home. */
  scopes: ShellScope<any>[]
  panels?: ShellPanelSpec[]
  /** Workspace commands, in reach everywhere. */
  commands?: ShellCommand[]
}

/** A scope the person is in, with the lens and place they see it through. */
export interface ShellFrame {
  scope: ShellScope<any>
  item?: unknown
  parent?: ShellFrame
  /** The address up to and including this scope. */
  prefix: string[]
  /** Unique per scope and item along its parents: `projects:>project:atlas`. */
  key: string
  lens?: ShellLens
  place?: ShellPlace
}

/** A panel's drill: the Details panel moved on from its subject to a linked record, then another. */
export interface ShellAside {
  panel: string
  trail: string[]
}

/** Where the person is, resolved from the address. */
export interface ShellLoc {
  /** The module, then every scope entered below it. */
  frames: ShellFrame[]
  module: ShellScope<any>
  /** The deepest frame. */
  frame: ShellFrame
  lens?: ShellLens
  /** The deepest scope's lenses in the person's order, hidden ones last. */
  lenses: ShellLens[]
  place?: ShellPlace
  /** The place's parents in its tree. */
  placeTrail: ShellPlace[]
  /** The saved view, or the place's first. */
  view?: ShellSavedView
  record?: string
  aside?: ShellAside
  /** The address in full, without the panel's drill. */
  path: string[]
  /** What the lens remembers: the segments after it. */
  tail: string[]
  /** What the view area renders. */
  render?: (props: ShellViewProps) => JSX.Element
}

/** The view header's share: a title at a place, a trail and a stepper at a record. */
export interface ShellHeader {
  title?: string
  trail?: TrailCrumb[]
  stepper?: ViewStepper
}

export interface ShellSidebar {
  /** Changes with the scope and the lens: what the filter and the collapsed parents are kept by. */
  key: string
  label: string
  groups: NavGroup[]
  up?: { label: string; onClick: () => void }
  /** The parents in the tree, for collapse all. */
  parents: string[]
}

/** What the Shell component lends the keyboard model: the sidebar's fold and its filter field. */
export interface ShellKeyHost {
  toggleSidebar?: () => void
  focusFilter?: () => boolean
}

const flat = (places: ShellPlace[]): ShellPlace[] => places.flatMap((p) => [p, ...flat(p.children ?? [])])
const trailTo = (
  places: ShellPlace[],
  target: ShellPlace,
  above: ShellPlace[] = [],
): ShellPlace[] | undefined => {
  for (const p of places) {
    if (p === target) return above
    const hit = trailTo(p.children ?? [], target, [...above, p])
    if (hit) return hit
  }
  return undefined
}
const holds = (lens: ShellLens, place?: string) => !!place && flat(lens.places).some((p) => p.id === place)
const split = (path: string) => path.split("/").filter(Boolean).map(decodeURIComponent)
const addr = (segs: Array<string | undefined>) =>
  `/${segs
    .filter((s): s is string => !!s)
    .map((s) => encodeURIComponent(s).replace(/%40/g, "@").replace(/%3A/g, ":").replace(/%2C/g, ","))
    .join("/")}`
const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** Kept in a plain variable (a signal read right after its write has the old value), with a version to track. */
function box<T>(initial: T) {
  let value = initial
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  return {
    get: () => {
      version()
      return value
    },
    peek: () => value,
    set: (next: T) => {
      value = next
      setVersion((v) => v + 1)
    },
  }
}

export type ShellRegistry = ReturnType<typeof createShell>

/** Creates the shell from its registrations. Inside a component, its history is disposed with it. */
export function createShell(options: ShellOptions) {
  const router = options.router
  const storage = options.storage
  const id = options.id ?? "shell"
  const scopes = options.scopes
  const panelSpecs = options.panels ?? []
  const ws = options.workspace

  // ── Lens prefs per scope kind, in the store ───────────────────────────────────────────────────────
  const prefs = box<Record<string, LensPrefs>>({})
  const prefsOf = (scope: ShellScope): LensPrefs => {
    // Read without tracking: `loc` tracks the prefs itself, and the imperative callers must not.
    if (!prefs.peek()[scope.id]) {
      const stored = readJson<LensPrefs>(storage, `${id}/lenses/${scope.id}`)
      if (stored) prefs.peek()[scope.id] = stored
    }
    const p = prefs.peek()[scope.id]
    return {
      order: p?.order ?? [],
      hidden: p?.hidden ?? (scope.lenses ?? []).filter((l) => l.pinned === false).map((l) => l.id),
    }
  }
  const setPrefsOf = (scope: ShellScope, next: LensPrefs) => {
    prefs.set({ ...prefs.peek(), [scope.id]: next })
    writeJson(storage, `${id}/lenses/${scope.id}`, next)
  }
  /** The scope's lenses in the person's order, the shown ones first. */
  const lensesOf = (scope: ShellScope): ShellLens[] => {
    const all = scope.lenses ?? []
    if (!all.length) return []
    const p = prefsOf(scope)
    const shown = shownLenses(all, p) as ShellLens[]
    return [...shown, ...all.filter((l) => !shown.includes(l))]
  }

  // ── Resolving an address ──────────────────────────────────────────────────────────────────────────
  const idOf = (scope: ShellScope, item: unknown) =>
    scope.itemId?.(item) ?? String((item as { id: string }).id)
  const labelOf = (f: { scope: ShellScope; item?: unknown }) =>
    typeof f.scope.label === "function" ? f.scope.label(f.item) : f.scope.label
  const frame = (scope: ShellScope, item: unknown, parent: ShellFrame | undefined, prefix: string[]) => ({
    scope,
    item,
    parent,
    prefix,
    key: `${parent ? `${parent.key}>` : ""}${scope.id}:${item === undefined ? "" : idOf(scope, item)}`,
  })
  /** The lens last worn in each scope (by frame key), and what each lens remembers there (by frame key and lens). */
  const worn = new Map<string, string>()
  const memory = new Map<string, string[]>()
  const memKey = (f: ShellFrame, lens?: string) => `${f.key}/${lens ?? ""}`

  const resolve = (all: string[]): ShellLoc => {
    const asideSeg = all.find((s) => s.startsWith("@"))
    const segs = all.filter((s) => !s.startsWith("@"))
    const module = scopes.find((m) => m.id === segs[0]) ?? scopes[0]!
    let f: ShellFrame = frame(module, undefined, undefined, [module.id])
    const frames: ShellFrame[] = [f]
    // An address that names no module is home.
    let rest = module.id === segs[0] ? segs.slice(1) : []
    const child = module.child
    const item = child && rest[0] ? child.items?.().find((i) => idOf(child, i) === rest[0]) : undefined
    if (child && item !== undefined) {
      f = frame(child, item, f, [module.id, rest[0]!])
      frames.push(f)
      rest = rest.slice(1)
    }
    let lens: ShellLens | undefined
    let lenses: ShellLens[] = []
    let place: ShellPlace | undefined
    let tree: ShellPlace[] = []
    for (;;) {
      lenses = lensesOf(f.scope)
      lens = undefined
      if (lenses.length) {
        lens = lenses.find((g) => g.id === rest[0])
        if (lens) rest = rest.slice(1)
        else {
          // No lens in the address: the one worn last if it holds the place, else the first that does.
          const last = lenses.find((g) => g.id === worn.get(f.key))
          lens =
            (last && (!rest[0] || holds(last, rest[0])) ? last : undefined) ??
            lenses.find((g) => holds(g, rest[0])) ??
            last ??
            lenses[0]
          if (!rest[0]) {
            const remembered = memory.get(memKey(f, lens!.id))
            if (remembered) rest = [...remembered.filter((x) => x !== lens!.id)]
          }
        }
      } else if (!rest[0] && !f.scope.view) {
        const remembered = memory.get(memKey(f))
        if (remembered) rest = [...remembered]
      }
      tree = lens ? lens.places : (f.scope.places ?? [])
      const places = flat(tree)
      place = places.find((p) => p.id === rest[0])
      if (place) rest = rest.slice(1)
      else if (!f.scope.view || lens) place = places[0]
      f.lens = lens
      f.place = place
      const enters = place?.enters
      const next =
        enters && rest[0] ? enters.items?.(f.item).find((i) => idOf(enters, i) === rest[0]) : undefined
      if (!enters || next === undefined) break
      f = frame(enters, next, f, [...f.prefix, ...(lens ? [lens.id] : []), place!.id, rest[0]!])
      frames.push(f)
      rest = rest.slice(1)
    }
    let view: ShellSavedView | undefined
    if (place?.views?.length) {
      view = place.views.find((v) => v.id === rest[0])
      if (view) rest = rest.slice(1)
      else view = place.views[0]
    }
    const record = place?.records || place?.recordLabel ? rest[0] : undefined
    const tail: string[] = []
    if (place) tail.push(place.id)
    if (view && view !== place?.views?.[0]) tail.push(view.id)
    if (record) tail.push(record)
    const placeTrail = place ? (trailTo(tree, place) ?? []) : []
    let aside: ShellAside | undefined
    if (asideSeg) {
      const [panel, ids] = asideSeg.slice(1).split(":")
      const trail = (ids ?? "").split(",").filter(Boolean)
      if (panel && trail.length) aside = { panel, trail }
    }
    const render = place
      ? (place.view ?? [...placeTrail].reverse().find((p) => p.view)?.view ?? f.scope.view)
      : f.scope.view
    return {
      frames,
      module,
      frame: f,
      lens,
      lenses,
      place,
      placeTrail,
      view,
      record,
      aside,
      path: [...f.prefix, ...(lens ? [lens.id] : []), ...tail],
      tail,
      render,
    }
  }

  /** Where the person is now, read imperatively: the router's address is current even before a flush. */
  const now = () => resolve(split(untrack(() => router.path())))
  const signature = (l: ShellLoc) =>
    `${l.path.join("/")}|${l.aside ? `${l.aside.panel}:${l.aside.trail.join()}` : ""}|${l.lenses.map((x) => x.id).join()}`
  const loc = createMemo(
    () => {
      prefs.get()
      return resolve(split(router.path()))
    },
    { equals: (a, b) => !!a && !!b && signature(a) === signature(b) },
  )

  /** Remembers the lens worn in a scope and where it was, on every move, before the history names the stop. */
  const remember = () => {
    const l = now()
    for (const f of l.frames) if (f.lens) worn.set(f.key, f.lens.id)
    memory.set(memKey(l.frame, l.lens?.id), l.tail)
    // A parent remembers where the person entered the child from.
    for (const f of l.frames.slice(0, -1)) if (f.place) memory.set(memKey(f, f.lens?.id), [f.place.id])
  }
  const unsubscribe = router.subscribe(remember)
  remember()

  // ── Going places ──────────────────────────────────────────────────────────────────────────────────
  const markOf = (f: ShellFrame): ShellMark | undefined =>
    f.item !== undefined ? f.scope.mark?.(f.item) : undefined
  const recordName = (l: ShellLoc, rid: string) =>
    l.place?.records?.(l.frame.item, l.view?.id).find((r) => r.id === rid)?.label ??
    l.place?.recordLabel?.(rid) ??
    rid
  const keepView = (l: ShellLoc) => (l.view && l.view !== l.place?.views?.[0] ? l.view.id : undefined)
  const asideSeg = (a?: ShellAside) => (a ? `@${a.panel}:${a.trail.join(",")}` : undefined)

  const describe = (path: string): StopInfo | undefined => {
    const l = resolve(split(path))
    if (!l.module) return undefined
    const record = l.record ? recordName(l, l.record) : undefined
    const view = keepView(l) ? l.view?.label : undefined
    const parts = record ? [record] : [l.lens?.label, l.place?.label, view]
    const scope = labelOf(l.frame)
    const label = parts.filter(Boolean).join(" · ") || scope
    const panel = l.aside && panelSpecs.find((p) => p.id === l.aside!.panel)
    return {
      path: addr([...l.path, asideSeg(l.aside)]),
      base: addr(l.path),
      frame: l.frame.key,
      label,
      scope: label === scope ? ws.name : scope,
      mark: markOf(l.frame),
      icon: l.frame.item !== undefined ? undefined : l.module.icon,
      aside: panel ? `${panel.label} › ${recordName(l, l.aside!.trail.at(-1)!)}` : undefined,
    }
  }
  const history: ShellHistory = createHistory({ router, describe, storage, id: `${id}/history`, keys: false })

  const navigate = (segs: Array<string | undefined>) => history.navigate(addr(segs))
  /** The lens a frame is seen through: the current one in the person's frame, else the one worn last. */
  const lensFor = (f: ShellFrame, l = now()): ShellLens | undefined => {
    const all = lensesOf(f.scope)
    if (!all.length) return undefined
    if (l.frame.key === f.key && l.lens) return l.lens
    return all.find((g) => g.id === worn.get(f.key)) ?? all[0]
  }
  const segsOf = (f: ShellFrame, place?: string, view?: string, record?: string) => {
    const cur = lensFor(f)
    const g = place && cur && !holds(cur, place) ? lensesOf(f.scope).find((x) => holds(x, place)) : cur
    return [...f.prefix, g?.id, place ?? (g ? g.places[0]?.id : undefined), view, record]
  }
  /** Goes to a place of a scope (the current one when left out), its saved view and a record. */
  const toPlace = (f: ShellFrame | undefined, place?: string, view?: string, record?: string) =>
    navigate(segsOf(f ?? now().frame, place, view, record))
  /** Goes to a scope as the person left it: the lens worn last there, and where that lens was. */
  const returnTo = (f: ShellFrame) => {
    const all = lensesOf(f.scope)
    const g = all.find((x) => x.id === worn.get(f.key)) ?? f.lens ?? all[0]
    const tail = memory.get(memKey(f, g?.id)) ?? (f.place && g === f.lens ? [f.place.id] : [])
    navigate([...f.prefix, g?.id, ...tail])
  }
  /** Enters a scope the current place lists: it nests in the path and opens as it was left. */
  const enter = (scope: ShellScope, item: unknown) => {
    const l = now()
    returnTo(
      frame(scope, item, l.frame, [
        ...l.frame.prefix,
        ...(l.lens ? [l.lens.id] : []),
        ...(l.place ? [l.place.id] : []),
        idOf(scope, item),
      ]),
    )
  }
  /** Goes to an address of the app's own: "/hosts". */
  const go = (path: string) => history.navigate(path)
  /** Goes to a top-level scope by id. */
  const open = (scopeId: string, ...rest: string[]) => navigate([scopeId, ...rest])
  /** Puts a lens on. Switches in a row are one stop; switching back to where the run began undoes it. */
  const wear = (lensId: string) => {
    const l = now()
    const g = l.lenses.find((x) => x.id === lensId)
    if (!g) return
    const tail = memory.get(memKey(l.frame, g.id)) ?? []
    history.switchLens(addr([...l.frame.prefix, g.id, ...(tail.length ? tail : [g.places[0]?.id])]))
  }
  /** Up one level: a panel's drill, a record to its list, a scope to the one above. */
  const up = () => {
    const l = now()
    if (l.aside) return drillUp(l.aside.panel)
    if (l.record) return toPlace(l.frame, l.place?.id, keepView(l))
    if (l.frames.length > 1) return returnTo(l.frames[l.frames.length - 2]!)
  }

  // ── Panels, per scope and lens ────────────────────────────────────────────────────────────────────
  interface Seen {
    right?: string
    bottom?: string
    picked?: { place?: string; id: string }
  }
  const seen = box<Record<string, Seen>>({})
  const stateKey = (l: ShellLoc) => memKey(l.frame, l.lens?.id)
  const seenAt = (l: ShellLoc, read = seen.get): Seen =>
    read()[stateKey(l)] ?? { right: l.lens?.open?.right, bottom: l.lens?.open?.bottom }
  const patch = (p: Seen) => {
    const l = now()
    seen.set({ ...seen.peek(), [stateKey(l)]: { ...seenAt(l, seen.peek), ...p } })
  }
  const railOf = (l: ShellLoc) => {
    const choice = l.lens?.panels ?? [...l.frames].reverse().find((f) => f.scope.panels)?.scope.panels
    const pick = (at: "right" | "bottom", ids?: string[]) =>
      ids
        ? ids.map((x) => panelSpecs.find((p) => p.id === x)).filter((p): p is ShellPanelSpec => p?.at === at)
        : panelSpecs.filter((p) => p.at === at)
    return { right: pick("right", choice?.right), bottom: pick("bottom", choice?.bottom) }
  }
  const coversOf = (l: ShellLoc) => l.place?.covers ?? []
  const openOf = (l: ShellLoc, read = seen.get) => {
    const rail = railOf(l)
    const s = seenAt(l, read)
    const right = l.aside?.panel ?? s.right
    return {
      right: rail.right.find((p) => p.id === right),
      bottom: rail.bottom.find((p) => p.id === s.bottom),
    }
  }
  const panels = createMemo(() => {
    const l = loc()
    const rail = railOf(l)
    const o = openOf(l)
    const railList: RailPanel[] = [...rail.right, ...rail.bottom].map((p) => ({
      id: p.id,
      label: p.label,
      icon: p.icon,
      at: p.at,
      shortcut: p.key ? `⌥ ${p.key.toUpperCase()}` : undefined,
    }))
    return {
      rail: railList,
      right: o.right,
      bottom: o.bottom,
      covers: coversOf(l),
      open: { right: o.right?.id, bottom: o.bottom?.id },
    }
  })
  const closePanel = (at: "right" | "bottom") => {
    const l = now()
    if (at === "right" && l.aside) navigate(l.path)
    patch(at === "right" ? { right: undefined } : { bottom: undefined })
  }
  const togglePanel = (pid: string) => {
    const p = panelSpecs.find((x) => x.id === pid)
    if (!p) return
    const o = openOf(now(), seen.peek)
    if (o[p.at]?.id === pid) closePanel(p.at)
    else patch(p.at === "right" ? { right: pid } : { bottom: pid })
  }
  const showPanel = (pid: string) => {
    const p = panelSpecs.find((x) => x.id === pid)
    if (p) patch(p.at === "right" ? { right: pid } : { bottom: pid })
  }

  /** The record a panel shows: the picked row in this place, else the open record. */
  const selection = createMemo(() => {
    const l = loc()
    const p = seenAt(l).picked
    if (p && p.place === l.place?.id) return p.id
    return l.record
  })
  /** Picks a row as the panels' subject without opening it. */
  const select = (rid: string | undefined) => {
    const l = now()
    patch({ picked: rid ? { place: l.place?.id, id: rid } : undefined })
    if (l.aside) navigate(l.path)
  }
  const asideOf = (panel: string, l = loc()) => (l.aside?.panel === panel ? l.aside.trail : [])
  const asideTo = (panel: string, trail: string[]) => {
    showPanel(panel)
    const l = now()
    navigate([...l.path, asideSeg(trail.length ? { panel, trail } : undefined)])
  }
  /** Drills a panel to a linked record: a stop of its own. */
  const drill = (panel: string, rid: string) => {
    const t = asideOf(panel, now())
    if (t.at(-1) === rid || (!t.length && rid === untrack(selection))) return
    asideTo(panel, [...t, rid])
  }
  /** Up a panel's drill to level `n` (0 is its subject). */
  const drillUp = (panel: string, n?: number) => {
    const t = asideOf(panel, now())
    asideTo(panel, t.slice(0, Math.max(0, n ?? t.length - 1)))
  }
  /** A panel's trail from its subject to what it drilled to; empty while it shows its subject. */
  const panelTrail = (panel: string): TrailCrumb[] => {
    const l = loc()
    const t = asideOf(panel, l)
    const sub = selection()
    if (!t.length || !sub) return []
    return [sub, ...t].map((rid, i, all) => ({
      id: `${i}:${rid}`,
      label: recordName(l, rid),
      onClick: i < all.length - 1 ? () => drillUp(panel, i) : undefined,
    }))
  }
  /** What a panel's subject is: the record it drilled to, else the selection. */
  const subject = (panel: string) => asideOf(panel).at(-1) ?? selection()
  /** The place's `inspect` for the panel's subject, else the scope's for its item. */
  const inspect = (panel = "details"): JSX.Element | undefined => {
    const l = loc()
    const s = subject(panel)
    if (s && l.place?.inspect) return l.place.inspect(s, l.frame.item)
    if (l.frame.item !== undefined) return l.frame.scope.inspect?.(l.frame.item)
    return undefined
  }

  // ── The records of the place, and the view header ─────────────────────────────────────────────────
  const recordList = (l: ShellLoc) => l.place?.records?.(l.frame.item, l.view?.id) ?? []
  const step = (d: number) => {
    const l = now()
    if (!l.record || l.place?.trail === false) return false
    const list = recordList(l)
    const i = list.findIndex((r) => r.id === l.record)
    const next = i >= 0 ? list[i + d] : undefined
    if (!next) return false
    toPlace(l.frame, l.place?.id, keepView(l), next.id)
    return true
  }
  const header = createMemo((): ShellHeader => {
    const l = loc()
    const p = l.place
    if (!p) return { title: labelOf(l.frame) }
    if (!l.record || p.trail === false) return { title: keepView(l) ? l.view!.label : p.label }
    const list = recordList(l)
    const i = list.findIndex((r) => r.id === l.record)
    const noun = p.noun ?? "item"
    const view = keepView(l)
    const sections: SwitcherSection[] = [
      {
        title: l.view?.label ?? p.label,
        entries: list.map((r) => ({
          id: r.id,
          label: r.label,
          hint: r.hint,
          icon: r.icon,
          mark: r.mark,
          current: r.id === l.record,
        })),
      },
    ]
    return {
      trail: [
        { id: "place", label: p.label, onClick: () => toPlace(l.frame, p.id, view) },
        {
          id: "record",
          label: recordName(l, l.record),
          switcher: list.length
            ? { noun, sections, onPick: (e: SwitcherEntry) => toPlace(l.frame, p.id, view, e.id) }
            : undefined,
        },
      ],
      stepper:
        i >= 0
          ? { index: i, total: list.length, noun, prev: () => step(-1), next: () => step(1) }
          : undefined,
    }
  })

  // ── The title bar: path and lens box ──────────────────────────────────────────────────────────────
  const moduleEntries = (current?: ShellScope): SwitcherEntry[] =>
    scopes.map((m) => ({
      id: `m:${m.id}`,
      label: labelOf({ scope: m }),
      icon: m.icon,
      count: m.count?.() || undefined,
      current: m === current,
    }))
  const siblingFrame = (at: ShellFrame, it: unknown) =>
    frame(at.scope, it, at.parent, [...at.prefix.slice(0, -1), idOf(at.scope, it)])
  const itemEntries = (scope: ShellScope, parent: ShellFrame | undefined, current?: unknown) =>
    (scope.items?.(parent?.item) ?? []).map((it) => ({
      id: idOf(scope, it),
      label: labelOf({ scope, item: it }),
      mark: scope.mark?.(it),
      current: current !== undefined && idOf(scope, it) === idOf(scope, current),
    }))

  const path = createMemo((): ScopeSegment[] => {
    const l = loc()
    const out: ScopeSegment[] = []
    const others = options.workspaces ?? []
    out.push({
      id: "ws",
      label: ws.name,
      onClick: () => navigate([scopes[0]!.id]),
      switcher:
        others.length > 1
          ? {
              noun: "workspace",
              sections: [
                {
                  title: "Workspaces",
                  entries: others.map((w) => ({
                    id: w.id,
                    label: w.name,
                    mark: { name: w.name, hue: w.hue },
                    current: w.id === ws.id,
                  })),
                },
              ],
              onPick: (e) => options.onWorkspaceChange?.(e.id),
            }
          : undefined,
    })
    const mod = l.frames[0]!
    const modLast = l.frames.length === 1
    const child = l.module.child
    out.push({
      id: mod.key,
      label: labelOf(mod),
      onClick: modLast ? undefined : () => navigate([l.module.id]),
      // A module that goes up is plain text, as every parent is; at the end of the path it switches.
      switcher: !modLast
        ? undefined
        : {
            noun: "module",
            sections: [
              { title: "Modules", entries: moduleEntries(l.module) },
              ...(child
                ? [
                    {
                      title: "Open",
                      entries: itemEntries(child, mod).map((e) => ({ ...e, id: `i:${e.id}` })),
                    },
                  ]
                : []),
            ],
            onPick: (e) => {
              if (e.id.startsWith("m:")) return navigate([e.id.slice(2)])
              const it = child?.items?.().find((x) => idOf(child, x) === e.id.slice(2))
              if (child && it !== undefined) returnTo(frame(child, it, mod, [l.module.id, idOf(child, it)]))
            },
          },
    })
    l.frames.slice(1).forEach((f, i, rest) => {
      const last = i === rest.length - 1
      const siblings = itemEntries(f.scope, f.parent, f.item)
      out.push({
        id: f.key,
        label: labelOf(f),
        mark: markOf(f),
        onClick: last ? undefined : () => returnTo(f),
        switcher: {
          noun: f.scope.noun ?? "item",
          sections: [{ title: f.parent?.place?.label ?? labelOf(f.parent ?? mod), entries: siblings }],
          onPick: (e) => {
            const it = f.scope.items?.(f.parent?.item).find((x) => idOf(f.scope, x) === e.id)
            if (it === undefined) return
            const sib = siblingFrame(f, it)
            const cur = now()
            // The same place in the sibling, when the person switches the scope they are in.
            if (last && cur.place) navigate(segsOfSibling(sib, cur))
            else returnTo(sib)
          },
        },
      })
    })
    return out
  })
  const segsOfSibling = (sib: ShellFrame, cur: ShellLoc) => [
    ...sib.prefix,
    cur.lens?.id,
    cur.place?.id,
    keepView(cur),
  ]

  const lensBox = createMemo(() => {
    const l = loc()
    const scope = l.frame.scope
    return {
      lenses: (scope.lenses ?? []) as Lens[],
      lens: l.lens?.id,
      prefs: (scope.lenses?.length ? prefsOf(scope) : undefined) as LensPrefs | undefined,
      setPrefs: (next: LensPrefs) => setPrefsOf(scope, next),
      scope: labelOf(l.frame),
    }
  })

  // ── The sidebar ───────────────────────────────────────────────────────────────────────────────────
  const sidebarFrame = (l: ShellLoc) => {
    for (let i = l.frames.length - 1; i >= 0; i--) {
      const s = l.frames[i]!.scope
      if (s.places?.length || s.lenses?.length) return l.frames[i]!
    }
    return undefined
  }
  const filters = box<Record<string, string>>({})
  const collapsedBox = box<Record<string, string[]>>({})
  const sidebar = createMemo((): ShellSidebar => {
    const l = loc()
    const f = sidebarFrame(l)
    if (!f) {
      const groups: NavGroup[] = [
        {
          items: scopes.map((m) => ({
            id: `m:${m.id}`,
            label: labelOf({ scope: m }),
            icon: m.icon,
            count: m.count?.() || undefined,
            current: l.module === m && l.frames.length === 1,
            onClick: () => navigate([m.id]),
          })),
        },
      ]
      for (const m of scopes) {
        const child = m.child
        if (!child?.items) continue
        const mf = frame(m, undefined, undefined, [m.id])
        groups.push({
          label: labelOf({ scope: m }),
          items: child.items().map((it) => {
            const mark = child.mark?.(it)
            return {
              id: `${m.id}/${idOf(child, it)}`,
              label: labelOf({ scope: child, item: it }),
              leading: mark ? (
                <Mark name={mark.name} hue={mark.hue} icon={mark.icon} size="sm" decorative />
              ) : undefined,
              icon: mark ? undefined : child.icon,
              drill: true,
              onClick: () => returnTo(frame(child, it, mf, [m.id, idOf(child, it)])),
            }
          }),
        })
      }
      return { key: "workspace", label: ws.name, groups, parents: [] }
    }
    const here = f.key === l.frame.key
    const lens = f.lens
    const tree = lens ? lens.places : (f.scope.places ?? [])
    const parents: string[] = []
    const items = (places: ShellPlace[]): NavItemProps[] =>
      places.map((p) => {
        const views = (p.views ?? []).slice(1)
        const kids = [
          ...views.map((v) => ({
            id: `${p.id}/${v.id}`,
            label: v.label,
            current: here && l.place === p && l.view === v && !l.record,
            onClick: () => toPlace(f, p.id, v.id),
          })),
          ...items(p.children ?? []),
        ]
        if (kids.length) parents.push(p.id)
        const inside = here && l.place === p
        return {
          id: p.id,
          label: p.label,
          icon: p.icon ?? (kids.length ? "folder" : "file"),
          count: p.count?.(f.item) || undefined,
          current: inside && (!keepView(l) || !views.length) && !l.record,
          onClick: () => toPlace(f, p.id),
          items: kids.length ? kids : undefined,
        }
      })
    const groups: NavGroup[] = [{ items: items(tree) }]
    const i = l.frames.indexOf(f)
    const parent = i > 0 ? l.frames[i - 1] : undefined
    return {
      key: `${f.key}/${lens?.id ?? ""}`,
      label: labelOf(f),
      groups,
      parents,
      up: parent ? { label: labelOf(parent), onClick: () => returnTo(parent) } : undefined,
    }
  })
  const filter = () => filters.get()[sidebar().key] ?? ""
  const setFilter = (v: string) => filters.set({ ...filters.peek(), [untrack(sidebar).key]: v })
  const collapsed = () => collapsedBox.get()[sidebar().key] ?? []
  const setCollapsed = (v: string[]) =>
    collapsedBox.set({ ...collapsedBox.peek(), [untrack(sidebar).key]: v })

  // ── The palette ───────────────────────────────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpenRaw] = createSignal(false, { ownedWrite: true })
  let paletteNow = false
  const setPaletteOpen = (v: boolean) => {
    paletteNow = v
    setPaletteOpenRaw(v)
  }
  const cmd = (c: ShellCommand): PaletteCommand => ({
    id: `cmd:${c.id}`,
    label: c.label,
    icon: c.icon,
    shortcut: c.shortcut,
    keywords: c.keywords,
    run: () => c.run(shell),
  })
  const placesIn = (f: ShellFrame, onlyLens: ShellLens | undefined): PaletteCommand[] => {
    const all = lensesOf(f.scope)
    const use = all.length ? (onlyLens ? [onlyLens] : all) : [undefined]
    return use.flatMap((g) =>
      flat(g ? g.places : (f.scope.places ?? [])).flatMap((p) => [
        {
          id: `place:${f.key}:${g?.id ?? ""}:${p.id}`,
          label: p.label,
          icon: p.icon ?? "file",
          hint: use.length > 1 ? g?.label : undefined,
          run: () => navigate([...f.prefix, g?.id, p.id]),
        },
        ...(p.views ?? []).slice(1).map((v) => ({
          id: `view:${f.key}:${g?.id ?? ""}:${p.id}:${v.id}`,
          label: `${p.label}: ${v.label}`,
          icon: v.icon ?? ("layers" as IconName),
          run: () => navigate([...f.prefix, g?.id, p.id, v.id]),
        })),
      ]),
    )
  }
  const recordsIn = (f: ShellFrame, hint?: string): PaletteCommand[] =>
    lensesOf(f.scope).length
      ? lensesOf(f.scope).flatMap((g) => recordsOfPlaces(f, g, flat(g.places), hint))
      : recordsOfPlaces(f, undefined, flat(f.scope.places ?? []), hint)
  const recordsOfPlaces = (f: ShellFrame, g: ShellLens | undefined, places: ShellPlace[], hint?: string) =>
    places.flatMap((p) =>
      (p.records?.(f.item, undefined) ?? []).map((r) => ({
        id: `rec:${f.key}:${p.id}:${r.id}`,
        label: r.label,
        hint: hint ? [r.hint, hint].filter(Boolean).join(" · ") : r.hint,
        icon: r.icon ?? p.icon,
        mark: r.mark,
        keywords: r.hint ? [r.hint] : undefined,
        run: () => navigate([...f.prefix, g?.id, p.id, undefined, r.id]),
      })),
    )
  const itemsOf = (m: ShellScope, skip?: unknown): PaletteCommand[] => {
    const child = m.child
    if (!child?.items) return []
    const mf = frame(m, undefined, undefined, [m.id])
    return child
      .items()
      .filter((it) => it !== skip)
      .map((it) => ({
        id: `scope:${child.id}:${idOf(child, it)}`,
        label: labelOf({ scope: child, item: it }),
        mark: child.mark?.(it),
        hint: labelOf({ scope: m }),
        run: () => returnTo(frame(child, it, mf, [m.id, idOf(child, it)])),
      }))
  }
  const search = (q: PaletteQuery): PaletteSection[] => {
    const l = untrack(loc)
    const text = q.text
    const lensChip = q.chips.some((c) => c.id.startsWith("lens:"))
    const scopeChip = [...q.chips].reverse().find((c) => !c.id.startsWith("lens:"))
    const f = scopeChip ? l.frames.find((x) => x.key === scopeChip.id) : undefined
    const out: PaletteSection[] = []
    const owner = f ? l.frames[0]!.scope : undefined
    if (f && f.item !== undefined) {
      const g = lensChip && f.key === l.frame.key ? l.lens : undefined
      const inner: PaletteCommand[] = text
        ? (g ? flat(g.places) : flat(lensFor(f, l)?.places ?? f.scope.places ?? [])).flatMap((p) =>
            p.enters
              ? (p.enters.items?.(f.item) ?? []).map((it) => ({
                  id: `enter:${p.id}:${idOf(p.enters!, it)}`,
                  label: labelOf({ scope: p.enters!, item: it }),
                  hint: p.label,
                  mark: p.enters!.mark?.(it),
                  run: () =>
                    returnTo(
                      frame(p.enters!, it, f, [
                        ...(segsOf(f, p.id).filter(Boolean) as string[]),
                        idOf(p.enters!, it),
                      ]),
                    ),
                }))
              : [],
          )
        : []
      out.push({
        title: g ? `${labelOf(f)} · ${g.label}` : labelOf(f),
        commands: [...placesIn(f, g), ...(text ? recordsIn(f) : []), ...inner],
      })
      if (text && f.key === l.frame.key && l.lenses.length)
        out.push({
          title: "Lenses",
          commands: l.lenses
            .filter((x) => x !== l.lens)
            .map((x) => ({
              id: `lens:${x.id}`,
              label: x.label,
              hint: x.purpose,
              icon: x.icon,
              hue: x.hue,
              run: () => wear(x.id),
            })),
        })
      if (f.scope.commands?.length) out.push({ title: "Actions", commands: f.scope.commands.map(cmd) })
      const siblings = (f.scope.items?.(f.parent?.item) ?? [])
        .filter((it) => idOf(f.scope, it) !== idOf(f.scope, f.item))
        .map((it) => ({
          id: `sib:${f.scope.id}:${idOf(f.scope, it)}`,
          label: labelOf({ scope: f.scope, item: it }),
          mark: f.scope.mark?.(it),
          run: () => returnTo(siblingFrame(f, it)),
        }))
      out.push({ title: f.parent?.place?.label ?? labelOf(f.parent ?? l.frames[0]!), commands: siblings })
    } else if (f && owner) {
      const commands = [...placesIn(f, undefined), ...itemsOf(owner)]
      if (text && owner.child)
        for (const it of owner.child.items?.() ?? [])
          commands.push(
            ...recordsIn(
              frame(owner.child, it, f, [owner.id, idOf(owner.child, it)]),
              labelOf({ scope: owner.child, item: it }),
            ),
          )
      out.push({ title: labelOf(f), commands })
      if (owner.commands?.length) out.push({ title: "Actions", commands: owner.commands.map(cmd) })
    }
    const wsHits: PaletteCommand[] = []
    for (const m of scopes) {
      if (m === owner) continue
      wsHits.push({
        id: `mod:${m.id}`,
        label: labelOf({ scope: m }),
        icon: m.icon,
        run: () => navigate([m.id]),
      })
      if (!f || text) wsHits.push(...itemsOf(m))
      if (text && m.child)
        for (const it of m.child.items?.() ?? [])
          wsHits.push(
            ...recordsIn(
              frame(m.child, it, frame(m, undefined, undefined, [m.id]), [m.id, idOf(m.child, it)]),
              labelOf({ scope: m.child, item: it }),
            ),
          )
    }
    wsHits.push(...(options.commands ?? []).map(cmd))
    out.push({ title: ws.name, commands: wsHits })
    return out
  }
  const actions = createMemo((): PaletteSection[] => {
    const l = loc()
    const p = panels()
    const scoped = [...l.frames].reverse().flatMap((f) => (f.scope.commands ?? []).map(cmd))
    return [
      ...(scoped.length ? [{ title: labelOf(l.frame), commands: scoped }] : []),
      {
        title: "Panels",
        commands: p.rail
          .filter((r) => !p.covers.includes(r.id))
          .map((r) => ({
            id: `panel:${r.id}`,
            label: `${p.open[r.at] === r.id ? "Close" : "Open"} ${r.label}`,
            icon: r.icon,
            shortcut: r.shortcut,
            keywords: ["panel"],
            run: () => togglePanel(r.id),
          })),
      },
      ...(options.commands?.length ? [{ title: ws.name, commands: options.commands.map(cmd) }] : []),
    ]
  })

  // ── Escape and the keyboard model ─────────────────────────────────────────────────────────────────
  const escStack: Array<() => void> = []
  /** Registers something Esc closes first (a view's peek, a composer); returns its removal. */
  const pushEsc = (close: () => void) => {
    escStack.push(close)
    return () => {
      const i = escStack.lastIndexOf(close)
      if (i >= 0) escStack.splice(i, 1)
    }
  }
  /**
   * Esc closes the topmost thing: what a view pushed, the palette, a panel's drill, the open record (back to its
   * list), then the sidebar's filter. Returns whether it closed anything.
   */
  const closeTop = () => {
    const top = escStack[escStack.length - 1]
    if (top) {
      top()
      return true
    }
    if (paletteNow) {
      setPaletteOpen(false)
      return true
    }
    const l = now()
    if (l.aside) {
      drillUp(l.aside.panel)
      return true
    }
    if (l.record && l.place?.trail !== false) {
      toPlace(l.frame, l.place?.id, keepView(l))
      return true
    }
    if (filters.peek()[untrack(sidebar).key]) {
      setFilter("")
      return true
    }
    return false
  }

  /**
   * The shell's one key binding layer. ⌘K the palette; ⌘[ ⌘] and Alt+←/→ the history; ⌘1…⌘9 the shown lenses;
   * ⌘B and ⌘\ the sidebar's fold; ⌘F and / the sidebar's filter; ⌘J the bottom panel; ⌥ and a panel's letter
   * that panel; J and K the records; Esc the stack above. Returns whether the key was taken (and prevents it).
   */
  const handleKey = (e: KeyboardEvent, host: ShellKeyHost = {}): boolean => {
    if (e.defaultPrevented) return false
    const mod = e.metaKey || e.ctrlKey
    const typing = editable(e.target)
    const take = () => {
      e.preventDefault()
      return true
    }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (mod && !e.altKey && !e.shiftKey && k === "k") {
      setPaletteOpen(!paletteNow)
      return take()
    }
    // A menu, a dialog or the palette's own field takes Esc first; the stack below is the shell's.
    if (e.key === "Escape") {
      if (typing || openLayers() > 0) return false
      return closeTop() ? take() : false
    }
    if (paletteNow || openLayers() > 0) return false
    if ((mod && !e.altKey && k === "[") || (e.altKey && !mod && !typing && k === "ArrowLeft")) {
      history.back()
      return take()
    }
    if ((mod && !e.altKey && k === "]") || (e.altKey && !mod && !typing && k === "ArrowRight")) {
      history.forward()
      return take()
    }
    if (mod && !e.altKey && !e.shiftKey) {
      if (/^[1-9]$/.test(k)) {
        const l = now()
        const lens = shownLenses(l.frame.scope.lenses ?? [], prefsOf(l.frame.scope))[Number(k) - 1]
        if (!lens) return false
        if (lens.id !== l.lens?.id) wear(lens.id)
        return take()
      }
      if (k === "b" || k === "\\") {
        if (!host.toggleSidebar) return false
        host.toggleSidebar()
        return take()
      }
      if (k === "j") {
        const l = now()
        const covered = coversOf(l)
        const b = openOf(l, seen.peek).bottom ?? railOf(l).bottom.find((p) => !covered.includes(p.id))
        if (!b) return false
        togglePanel(b.id)
        return take()
      }
      if (k === "f" && !typing) return host.focusFilter?.() ? take() : false
      return false
    }
    if (typing || mod) return false
    if (e.altKey && !e.shiftKey && /^Key[A-Z]$/.test(e.code)) {
      const letter = e.code.slice(3).toLowerCase()
      const l = now()
      const rail = railOf(l)
      const p = [...rail.right, ...rail.bottom].find((x) => x.key?.toLowerCase() === letter)
      if (!p || coversOf(l).includes(p.id)) return false
      togglePanel(p.id)
      return take()
    }
    if (e.altKey) return false
    if (k === "/" && !e.shiftKey) return host.focusFilter?.() ? take() : false
    if (!e.shiftKey && (k === "j" || k === "k")) return step(k === "j" ? 1 : -1) ? take() : false
    return false
  }

  /** The window's title: the record or place, the lens, the scopes, the workspace. */
  const title = createMemo(() => {
    const l = loc()
    const record = l.record ? recordName(l, l.record) : undefined
    const parts = [record, l.place?.label, l.lens?.label, ...[...l.frames].reverse().map(labelOf), ws.name]
    return [...new Set(parts.filter(Boolean))].join(" · ")
  })

  const shell = {
    options,
    storage,
    router,
    history,
    /** Where the person is, reactive. */
    loc,
    /** The address in full. */
    address: () => addr([...loc().path, asideSeg(loc().aside)]),
    resolve: (p: string) => resolve(split(p)),
    labelOf,
    idOf,
    go,
    open,
    toPlace,
    returnTo,
    enter,
    wear,
    up,
    step,
    path,
    lensBox,
    sidebar,
    filter,
    setFilter,
    collapsed,
    setCollapsed,
    header,
    panels,
    togglePanel,
    showPanel,
    closePanel,
    selection,
    select,
    drill,
    drillUp,
    panelTrail,
    subject,
    inspect,
    paletteOpen,
    setPaletteOpen,
    search,
    actions,
    pushEsc,
    escape: closeTop,
    handleKey,
    title,
    dispose: () => {
      unsubscribe()
      history.dispose()
    },
  }
  return shell
}
