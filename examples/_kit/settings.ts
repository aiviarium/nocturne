import type { RowDensity } from "@aiviarium/nocturne"
import { type Accessor, createContext, useContext } from "solid-js"

/** Settings the site's theme panel applies to every example of a page at once. */
export interface ExampleSettings {
  density: Accessor<RowDensity | undefined>
}

export const ExampleSettingsContext = createContext<ExampleSettings>()

/** The row density the page asks for, or `fallback` (the gallery, or a page that sets none). */
export function useDensity(fallback: RowDensity = "compact"): Accessor<RowDensity> {
  const settings = useContext(ExampleSettingsContext)
  return () => settings?.density() ?? fallback
}
