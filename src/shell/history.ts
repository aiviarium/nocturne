// The window's history: one list of stops (scope, lens, place, view, record, a panel's drill), walked by the
// title bar's arrows, ⌘[ / ⌘], Alt+←/→, the mouse's back and forward buttons and, in a browser tab, the browser's
// own arrows. Every stop is one entry of the router, and each entry carries its stop's index, so all of them walk
// the same list. The router comes in through an adapter: this file never touches `location` or `history` except
// in `hashRouter`, the browser adapter an app may pass.
import { createSignal, getOwner, onCleanup, untrack } from "solid-js"
import type { IconName } from "../components/Icon"
import { readJson, type ShellStorage, writeJson } from "./storage"
import type { ShellMark } from "./types"

/** What the history needs from the app's router. Paths are the app's own addresses, such as `/projects/atlas`. */
export interface HistoryRouter {
  /** The current address. */
  path(): string
  /** The state the current entry carries (what `replace` last stored on it), or undefined. */
  state(): unknown
  /** Adds an entry. Its state starts empty. */
  push(path: string): void
  /** Replaces the current entry's address and state. */
  replace(path: string, state?: unknown): void
  /** Walks `delta` entries; the change may land later, as the browser's does. */
  go(delta: number): void
  /** Calls `listener` after every change of address or entry, including the router's own push and replace. */
  subscribe(listener: () => void): () => void
}

/** How the app names an address, for the arrows' tooltips and the back list. */
export interface StopInfo {
  /**
   * The address in full. A short address (`/projects/atlas`, meaning "the lens worn last") changes meaning as the
   * person moves, so the history writes the full one onto the entry when it records the stop. Default the address.
   */
  path?: string
  /** The scope the stop is in: lens switches in a row within one scope fold into one stop. */
  frame?: string
  /** "Build · Agents", "WEB-139", "Fleet". */
  label: string
  /** The scope, when the label does not name it: "Atlas web". */
  scope?: string
  mark?: ShellMark
  icon?: IconName
  /** A panel's drill at the stop, named: "Details › WEB-127". */
  aside?: string
  /** The address without the panel's drill, so two stops that differ only there name the drill. Default `path`. */
  base?: string
}

/** One location in the history. */
export interface HistoryStop extends StopInfo {
  path: string
  key: string
  frame: string
  base: string
  /** Reached by a lens switch: the next switch in the same scope replaces this stop instead of adding one. */
  byLens?: boolean
}

export interface HistoryOptions {
  router: HistoryRouter
  /** Names an address. Return undefined for an address that is not a stop (a redirect on its way). */
  describe: (path: string) => StopInfo | undefined
  /** Keeps the stops across a reload, under `history/{id}`. */
  storage?: ShellStorage
  /** Tells one history from another in the router's state and the storage. Default `history`. */
  id?: string
  /** Most stops kept. Default 50. */
  limit?: number
  /** Binds ⌘[ / ⌘], Alt+←/→ and the mouse's buttons on `window`. Default true; call `bindKeys` for another target. */
  keys?: boolean
}

export interface ShellHistory {
  /** Where back goes, nearest first, up to ten. */
  behind(): HistoryStop[]
  /** Where forward goes, nearest first, up to ten. */
  ahead(): HistoryStop[]
  /** Where the person is. */
  here(): HistoryStop | undefined
  /** Every stop, oldest first, and the index of `here`. */
  stops(): HistoryStop[]
  index(): number
  canBack(): boolean
  canForward(): boolean
  /** A stop's name as seen from here: the panel's drill when only the panel differs. */
  nameOf(stop: HistoryStop): string
  back(): void
  forward(): void
  /** Walks to a stop from the back or forward list. */
  jump(stop: HistoryStop): void
  /** Goes to an address: a new stop. */
  navigate(path: string): void
  /**
   * Puts a lens on: goes to `path` (the scope's address with the lens and the place it remembers). A switch right
   * after a switch in the same scope replaces that stop; switching back to where the run began undoes it. While a
   * switch is still landing, the latest request waits and applies once it has.
   */
  switchLens(path: string): void
  /** Binds the keys and mouse buttons on a target; returns the unbind. */
  bindKeys(target?: EventTarget): () => void
  dispose(): void
}

interface Tag {
  sid: string
  i: number
}

/** How long a move may take to land before the history stops waiting for it. */
const SETTLE_MS = 400

/** Creates the history over a router. Inside a component it is disposed with it. */
export function createHistory(options: HistoryOptions): ShellHistory {
  const router = options.router
  const id = options.id ?? "history"
  const storeKey = `history/${id}`
  const tagKey = `nc:${id}`
  const limit = options.limit ?? 50
  const saved = readJson<{ sid: string; first: number; stops: HistoryStop[] }>(options.storage, storeKey)
  const sid = saved?.sid ?? Math.random().toString(36).slice(2)

  // Plain variables are the truth (a signal read right after its write still has the old value); `version` tells
  // readers that something changed.
  let list: HistoryStop[] = saved?.stops ?? []
  /** The absolute index of list[0]: entries keep their index when old stops drop off the front. */
  let first = saved?.first ?? 0
  let at = -1
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  const changed = () => setVersion((v) => v + 1)

  const tagOf = (): Tag | undefined => {
    const s = router.state() as Record<string, unknown> | null | undefined
    const t = s && typeof s === "object" ? (s[tagKey] as Tag | undefined) : undefined
    return t && t.sid === sid ? t : undefined
  }
  const tag = (i: number, path?: string) => {
    const s = router.state()
    const base = s && typeof s === "object" ? (s as Record<string, unknown>) : {}
    router.replace(path ?? router.path(), { ...base, [tagKey]: { sid, i: first + i } satisfies Tag })
  }
  const persist = () => writeJson(options.storage, storeKey, { sid, first, stops: list })

  const stopOf = (path: string, byLens?: boolean): HistoryStop | undefined => {
    const info = options.describe(path)
    if (!info) return undefined
    const full = info.path ?? path
    return { ...info, path: full, key: full, frame: info.frame ?? "", base: info.base ?? full, byLens }
  }

  /** How the next change was made: by a lens switch, which folds into the switch before it. */
  let via: "lens" | undefined
  let moving = false
  let queued: string | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const settle = () => {
    if (!moving) return
    moving = false
    clearTimeout(timer)
    const q = queued
    queued = undefined
    if (q !== undefined) queueMicrotask(() => switchLens(q))
  }
  const startMoving = () => {
    moving = true
    clearTimeout(timer)
    // A move that leaves the address as it was never lands; don't wait for it forever.
    timer = setTimeout(settle, SETTLE_MS)
  }

  const onChange = () =>
    untrack(() => {
      const stop = stopOf(router.path())
      if (!stop) return
      queueMicrotask(settle)
      const how = via
      via = undefined
      const mine = tagOf()
      const local = mine ? mine.i - first : -1
      // The router walked to an entry it already had (back, forward, a jump from a list, a reload).
      if (mine && list[local]) {
        list = [...list]
        list[local] = { ...stop, byLens: list[local]!.byLens }
        at = local
        persist()
        changed()
        return
      }
      // The same place spelled out in full: nothing new happened, the entry only needs its tag.
      if (at >= 0 && list[at]?.key === stop.key) {
        tag(at, stop.path === router.path() ? undefined : stop.path)
        return
      }
      if (how === "lens" && at >= 0 && list[at]?.byLens && list[at]!.frame === stop.frame) {
        list = [...list]
        list[at] = { ...stop, byLens: true }
      } else {
        list = [...list.slice(0, at + 1), { ...stop, byLens: how === "lens" }]
        const drop = Math.max(0, list.length - limit)
        if (drop) {
          list = list.slice(drop)
          first += drop
        }
        at = list.length - 1
      }
      persist()
      changed()
      tag(at, stop.path === router.path() ? undefined : stop.path)
    })

  const walkTo = (i: number) => {
    const d = i - at
    if (d && list[i]) router.go(d)
  }

  function switchLens(path: string) {
    if (moving) {
      queued = path
      return
    }
    const target = stopOf(path)
    if (!target) return
    const cur = list[at]
    if (cur && cur.key === target.key) return
    startMoving()
    if (cur?.byLens && cur.frame === target.frame) {
      // Back on the lens the run began on: undo the run instead of adding to it.
      if (list[at - 1]?.key === target.key) return router.go(-1)
      via = "lens"
      router.replace(path)
      return
    }
    via = "lens"
    router.push(path)
  }

  const read = <T>(fn: () => T): T => {
    version()
    return fn()
  }
  const history: ShellHistory = {
    behind: () => read(() => list.slice(0, Math.max(0, at)).reverse().slice(0, 10)),
    ahead: () => read(() => list.slice(at + 1, at + 11)),
    here: () => read(() => list[at]),
    stops: () => read(() => list),
    index: () => read(() => at),
    canBack: () => read(() => at > 0),
    canForward: () => read(() => at >= 0 && at < list.length - 1),
    nameOf: (s) =>
      read(() => {
        const here = list[at]
        if (here && here.base === s.base) return s.aside ?? s.label
        return s.aside ? `${s.label}, ${s.aside}` : s.label
      }),
    back: () => {
      if (at > 0) router.go(-1)
    },
    forward: () => {
      if (at >= 0 && at < list.length - 1) router.go(1)
    },
    jump: (s) => {
      const i = list.findIndex((x) => x === s || (x.key === s.key && x.label === s.label))
      if (i >= 0) walkTo(i)
    },
    navigate: (path) => router.push(path),
    switchLens,
    bindKeys: (target = window) => {
      const editable = (t: EventTarget | null) =>
        t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      const onKey = (e: Event) => {
        const k = e as KeyboardEvent
        const mod = k.metaKey || k.ctrlKey
        const alt = k.altKey && !mod && !editable(k.target)
        if ((mod && k.key === "[") || (alt && k.key === "ArrowLeft")) {
          k.preventDefault()
          history.back()
        } else if ((mod && k.key === "]") || (alt && k.key === "ArrowRight")) {
          k.preventDefault()
          history.forward()
        }
      }
      // The mouse's back and forward buttons walk this history, not the browser's.
      const onMouse = (e: Event) => {
        const m = e as MouseEvent
        if (m.button !== 3 && m.button !== 4) return
        m.preventDefault()
        if (m.type === "mouseup") m.button === 3 ? history.back() : history.forward()
      }
      target.addEventListener("keydown", onKey, true)
      target.addEventListener("mousedown", onMouse, true)
      target.addEventListener("mouseup", onMouse, true)
      return () => {
        target.removeEventListener("keydown", onKey, true)
        target.removeEventListener("mousedown", onMouse, true)
        target.removeEventListener("mouseup", onMouse, true)
      }
    },
    dispose: () => {
      unsubscribe()
      unbind?.()
      clearTimeout(timer)
    },
  }

  const unsubscribe = router.subscribe(onChange)
  const unbind =
    options.keys !== false && typeof window !== "undefined" ? history.bindKeys(window) : undefined
  if (getOwner()) onCleanup(history.dispose)
  onChange()
  return history
}

/** A router kept in memory: for tests, examples and a desktop window without an address bar. */
export function memoryRouter(initial = "/"): HistoryRouter & { entries(): string[] } {
  const entries: Array<{ path: string; state: unknown }> = [{ path: initial, state: undefined }]
  let i = 0
  const listeners = new Set<() => void>()
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  const notify = () => {
    setVersion((v) => v + 1)
    for (const l of [...listeners]) l()
  }
  return {
    path: () => {
      version()
      return entries[i]!.path
    },
    state: () => entries[i]!.state,
    push(path) {
      entries.splice(i + 1, entries.length, { path, state: undefined })
      i = entries.length - 1
      notify()
    },
    replace(path, state) {
      entries[i] = { path, state }
      notify()
    },
    go(delta) {
      const to = Math.max(0, Math.min(entries.length - 1, i + delta))
      if (to === i) return
      // Like the browser's, a walk lands a moment later.
      setTimeout(() => {
        i = to
        notify()
      }, 0)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    entries: () => entries.map((e) => e.path),
  }
}

/**
 * The browser's own history, with the app's address in the hash (`#/projects/atlas`). Its back and forward buttons
 * walk the same stops as the shell's.
 */
export function hashRouter(): HistoryRouter {
  const read = () => location.hash.replace(/^#/, "") || "/"
  const listeners = new Set<() => void>()
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  let last = { path: read(), state: history.state as unknown }
  const notify = () => {
    last = { path: read(), state: history.state }
    setVersion((v) => v + 1)
    for (const l of [...listeners]) l()
  }
  // A fragment change fires popstate and then hashchange: tell the listeners once.
  const fromBrowser = () => {
    if (last.path === read() && last.state === history.state) return
    notify()
  }
  return {
    path: () => {
      version()
      return read()
    },
    state: () => history.state,
    push(path) {
      history.pushState(null, "", `#${path}`)
      notify()
    },
    replace(path, state) {
      history.replaceState(state ?? null, "", `#${path}`)
      notify()
    },
    go: (delta) => history.go(delta),
    subscribe(listener) {
      if (!listeners.size) {
        window.addEventListener("popstate", fromBrowser)
        window.addEventListener("hashchange", fromBrowser)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          window.removeEventListener("popstate", fromBrowser)
          window.removeEventListener("hashchange", fromBrowser)
        }
      }
    },
  }
}
