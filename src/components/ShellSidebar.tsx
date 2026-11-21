import type { JSX } from "@solidjs/web"
import { createContext, createSignal, onCleanup, useContext } from "solid-js"
import { IconButton } from "./IconButton"

/**
 * What `AppShell` tells the parts inside it about its sidebar: whether it is hidden, and how to hide or show it.
 * It is there only when the app passes `onSidebarHiddenChange`, so the sidebar can be hidden at all.
 */
export interface ShellSidebarValue {
  /** Whether the sidebar is hidden. */
  hidden: () => boolean
  /** Hides or shows the sidebar. */
  setHidden: (hidden: boolean) => void
  /** The sidebar's element id, for `aria-controls`. */
  id: string
  /**
   * Called by a view header that can hold the control that brings the sidebar back. The first header still
   * mounted holds it; the others stay as they are. The returned function lets go.
   */
  claimShow: () => { holds: () => boolean; release: () => void }
}

// `null` is "no shell above, or a sidebar that can't be hidden".
export const ShellSidebarContext = createContext<ShellSidebarValue | null>(null)

/** The shell's sidebar control, when the app's `AppShell` lets the sidebar be hidden. */
export const useShellSidebar = (): ShellSidebarValue | undefined =>
  useContext(ShellSidebarContext) ?? undefined

/** The claims on the show control, in the order the headers mounted. */
export function createShowClaims(): {
  claim: ShellSidebarValue["claimShow"]
  count: () => number
} {
  const [claims, setClaims] = createSignal<number[]>([], { ownedWrite: true })
  let next = 0
  return {
    count: () => claims().length,
    claim: () => {
      const me = next++
      setClaims((list) => [...list, me])
      return {
        holds: () => claims()[0] === me,
        release: () => setClaims((list) => list.filter((n) => n !== me)),
      }
    },
  }
}

export interface SidebarToggleProps {
  class?: string
}

/**
 * The control that hides the shell's sidebar, or brings it back when it is hidden: the same small button, with
 * the same icon, at the top-left of the window either way. `SidebarHeader` and `ViewHeader` place it by
 * themselves; use it only in a header of the app's own. Outside an `AppShell` with `onSidebarHiddenChange` it
 * renders nothing.
 */
export function SidebarToggle(props: SidebarToggleProps): JSX.Element {
  const sidebar = useShellSidebar()
  if (!sidebar) return null
  return (
    <IconButton
      size="sm"
      icon="sidebar"
      label={sidebar.hidden() ? "Show the sidebar" : "Hide the sidebar"}
      aria-expanded={sidebar.hidden() ? "false" : "true"}
      aria-controls={sidebar.id}
      data-part="sidebar-toggle"
      class={props.class}
      onClick={() => sidebar.setHidden(!sidebar.hidden())}
    />
  )
}

/** In a view header: holds the show control while the sidebar is hidden and no header before it holds it. */
export function useSidebarShow(): () => boolean {
  const sidebar = useShellSidebar()
  if (!sidebar) return () => false
  const claim = sidebar.claimShow()
  onCleanup(claim.release)
  return () => sidebar.hidden() && claim.holds()
}
