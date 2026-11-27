// What every area of the demo shares: the appearance, the store and whether the demo plays a desktop window.
import type { Appearance, ShellStorage } from "@aiviarium/nocturne"
import { createContext, useContext } from "solid-js"

export type RunsIn = "browser" | "desktop"

export interface Demo {
  appearance: Appearance
  storage: ShellStorage
  runsIn: () => RunsIn
  setRunsIn: (v: RunsIn) => void
}

// `null` is "no demo": in Solid 2 a default-less context throws instead of reading as undefined.
export const DemoContext = createContext<Demo | null>(null)

/** The demo around a view. Views only render inside `DemoApp`, which provides it. */
export function useDemo(): Demo {
  const demo = useContext(DemoContext)
  if (!demo) throw new Error("useDemo outside DemoApp")
  return demo
}
