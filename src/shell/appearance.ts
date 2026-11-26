// The person's appearance: the theme, whether the accent follows the lens that is on, and whether the title bar's
// line takes the lens's tint. Applied at once to <html> (so overlays take it too) and remembered in the store the
// app passes.
import { createEffect, createSignal, getOwner, onCleanup } from "solid-js"
import { readJson, type ShellStorage, writeJson } from "./storage"
import type { LensHue } from "./types"

export type ThemeChoice = "system" | "light" | "dark"

export interface AppearanceOptions {
  /** Where the choices are remembered, under `appearance`. Without one they last as long as the page. */
  storage?: ShellStorage
  /** The element that takes `data-theme` and the accent. Default `<html>`. */
  root?: HTMLElement | (() => HTMLElement | undefined)
  /**
   * The theme before the person chooses one. Default: none, so the root keeps the theme it has until a choice is
   * made.
   */
  defaultTheme?: ThemeChoice
}

export interface Appearance {
  /** The chosen theme, or with none chosen the theme the root is in. */
  theme(): ThemeChoice
  setTheme(theme: ThemeChoice): void
  /** The theme on screen: a `system` choice resolved. */
  resolved(): "light" | "dark"
  /** Flips the window between light and dark and remembers the result. */
  toggleTheme(): void
  /** Whether the accent follows the lens that is on. Off: the base accent everywhere. Default on. */
  followLens(): boolean
  setFollowLens(on: boolean): void
  /** Whether the title bar's line takes the lens's hue. Off: the plain hairline. Default on. */
  tintLine(): boolean
  setTintLine(on: boolean): void
  /** The hue of the lens that is on, which the accent follows while `followLens` is on. */
  lensHue(): LensHue | undefined
  setLensHue(hue: LensHue | undefined): void
  /** Follows a lens's hue for as long as the calling component lives; the base accent comes back after. */
  follow(hue: () => LensHue | undefined): void
  /** The accent on the root now: the lens's hue, or undefined for the base accent. */
  accent(): LensHue | undefined
  /** Writes the theme and accent to the root again, such as once a `root` accessor has its element. */
  apply(): void
  dispose(): void
}

interface Stored {
  theme?: ThemeChoice
  follow?: boolean
  tint?: boolean
}

const KEY = "appearance"
const THEMES: ThemeChoice[] = ["system", "light", "dark"]

/** Creates the appearance and applies it. Inside a component it stops listening to the system theme with it. */
export function createAppearance(options: AppearanceOptions = {}): Appearance {
  const stored = readJson<Stored>(options.storage, KEY) ?? {}
  const state: Stored & { hue?: LensHue } = {
    theme: THEMES.includes(stored.theme as ThemeChoice) ? stored.theme : options.defaultTheme,
    follow: stored.follow ?? true,
    tint: stored.tint ?? true,
  }
  const [version, setVersion] = createSignal(0, { ownedWrite: true })
  const read = <T>(fn: () => T): T => {
    version()
    return fn()
  }
  // The lens's hue changes with every lens switch, from an effect: it has its own version, so what reads only the
  // person's choices (the tint line, the theme) is not written again a flush after the switch.
  const [hueVersion, setHueVersion] = createSignal(0, { ownedWrite: true })
  const readHue = <T>(fn: () => T): T => {
    version()
    hueVersion()
    return fn()
  }
  const root = () =>
    typeof options.root === "function"
      ? options.root()
      : (options.root ?? (typeof document === "undefined" ? undefined : document.documentElement))
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: light)") : undefined
  const resolvedNow = (): "light" | "dark" => {
    const t = state.theme
    if (t === "light" || t === "dark") return t
    if (t === "system") return media?.matches ? "light" : "dark"
    return root()?.getAttribute("data-theme") === "light" ? "light" : "dark"
  }
  const accentNow = () => (state.follow ? state.hue : undefined)

  const apply = () => {
    const el = root()
    if (!el) return
    if (state.theme) el.setAttribute("data-theme", resolvedNow())
    const hue = accentNow()
    if (hue) el.setAttribute("data-nc-accent", hue)
    else el.removeAttribute("data-nc-accent")
  }
  const update = (patch: Partial<typeof state>, save: boolean) => {
    Object.assign(state, patch)
    if (save) writeJson(options.storage, KEY, { theme: state.theme, follow: state.follow, tint: state.tint })
    apply()
    setVersion((v) => v + 1)
  }
  const onSystem = () => {
    if (state.theme === "system") update({}, false)
  }
  media?.addEventListener?.("change", onSystem)

  const appearance: Appearance = {
    theme: () => read(() => state.theme ?? resolvedNow()),
    setTheme: (theme) => update({ theme }, true),
    resolved: () => read(resolvedNow),
    toggleTheme: () => update({ theme: resolvedNow() === "light" ? "dark" : "light" }, true),
    followLens: () => read(() => state.follow !== false),
    setFollowLens: (on) => update({ follow: on }, true),
    tintLine: () => read(() => state.tint !== false),
    setTintLine: (on) => update({ tint: on }, true),
    lensHue: () => readHue(() => state.hue),
    setLensHue: (hue) => {
      if (hue === state.hue) return
      state.hue = hue
      apply()
      setHueVersion((v) => v + 1)
    },
    follow: (hue) => {
      createEffect(hue, (h) => appearance.setLensHue(h))
      onCleanup(() => appearance.setLensHue(undefined))
    },
    accent: () => readHue(accentNow),
    apply: () => {
      apply()
      setVersion((v) => v + 1)
    },
    dispose: () => {
      media?.removeEventListener?.("change", onSystem)
      const el = root()
      el?.removeAttribute("data-nc-accent")
    },
  }
  if (getOwner()) onCleanup(appearance.dispose)
  apply()
  return appearance
}
