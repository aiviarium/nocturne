import { createContext, useContext } from "solid-js"

/**
 * What `AppShell` tells the views inside it: where its header bar is, so a `ViewHeader` with `variant="shell"`
 * can show there while it stays in its view (and keeps the view's layout, such as the inspector toggle).
 */
export interface ShellHeaderValue {
  /** The header bar's element. */
  mount: () => HTMLElement
  /** Called by a header that shows in the bar; the returned function lets go of it. */
  claim: () => () => void
}

export const ShellHeaderContext = createContext<ShellHeaderValue>()

export const useShellHeader = () => useContext(ShellHeaderContext)
