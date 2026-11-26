// What `AppShell` tells the parts inside it. The sidebar's fold reaches `SidebarHeader`, `Nav` and `AccountMenu`, so
// they draw their folded variants without props; the frame's state reaches `ShellPanel` and `PanelRail`, so a panel
// knows whether it docks or floats and which panels the view already shows. No imports from the components, so
// they can read it without a cycle.
import { createContext, useContext } from "solid-js"

export interface ShellSidebarState {
  /** The sidebar is the 48px icon rail. */
  folded: () => boolean
  /** Folds it to the rail, or unfolds it to the last full width. */
  setFolded: (folded: boolean) => void
  toggle: () => void
  /** On a phone the sidebar is a drawer, never a rail. */
  drawer: () => boolean
  /** Closes the drawer on a phone. */
  closeDrawer: () => void
  /** The keys that fold and unfold it, for tooltips: "⌘ B". */
  shortcut: string
}

// `null` is "no shell above": in Solid 2 a default-less context throws instead of reading as undefined.
export const ShellSidebarContext = createContext<ShellSidebarState | null>(null)

/** The sidebar's fold, inside an `AppShell`. */
export const useShellSidebar = (): ShellSidebarState | undefined =>
  useContext(ShellSidebarContext) ?? undefined

export type PanelSide = "right" | "bottom"

/** What a mounted panel tells the shell: its size along the axis it docks on, and whether it shows. */
export interface PanelReport {
  size: () => number
  shown: () => boolean
}

export interface ShellFrameState {
  /** Ids of the panels whose content the view already shows: the rail hides them and they stay hidden. */
  covers: () => readonly string[]
  /** The right panel floats over the view, because docked it would leave the view narrower than 480px. */
  overlay: () => boolean
  /** The shell is on a phone: panels open over the whole view. */
  phone: () => boolean
  /** A panel says it is there; the returned function says it went. */
  register: (at: PanelSide, report: PanelReport) => () => void
}

export const ShellFrameContext = createContext<ShellFrameState | null>(null)

export const useShellFrame = (): ShellFrameState | undefined => useContext(ShellFrameContext) ?? undefined
