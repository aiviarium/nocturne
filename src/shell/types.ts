import type { LabelHue } from "../components/Badge"
import type { IconName } from "../components/Icon"

/** The mark of a scope or record in the shell's parts: its name's letter (or an icon) in its hue. */
export interface ShellMark {
  name: string
  hue?: LabelHue | "neutral"
  icon?: IconName
}

/** The hues a lens can wear, which the window's accent can follow. */
export type LensHue = "sky" | "teal" | "mint" | "amber" | "ember" | "rose" | "orchid"

/** A way of looking at a scope: its places, its accent and the hue of the title bar's line. */
export interface Lens {
  id: string
  label: string
  icon: IconName
  hue: LensHue
  /** What the lens is for: its tooltip, and its line in Customise. */
  purpose?: string
  /** Who added it, when a plugin did: "Crow". */
  source?: string
}

/** The person's arrangement of a scope's lenses: their order, and the ones kept out of the box. */
export interface LensPrefs {
  order: string[]
  hidden: string[]
}
