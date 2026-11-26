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
