/** One of the six accent presets of the Nocturne system README, with the value to use in each theme. */
export interface AccentPreset {
  id: string
  name: string
  dark: string
  light: string
}

/** The accent presets. Set `--accent` to `dark` or `light` on an element that carries `data-theme`. */
export const ACCENTS: readonly AccentPreset[] = [
  { id: "iris", name: "Iris", dark: "#6872E5", light: "#5E68D8" }, // lint-tokens-ignore
  { id: "azure", name: "Azure", dark: "#3B82F6", light: "#2563EB" }, // lint-tokens-ignore
  { id: "jade", name: "Jade", dark: "#10B981", light: "#0E9F6E" }, // lint-tokens-ignore
  { id: "ember", name: "Ember", dark: "#F97316", light: "#EA580C" }, // lint-tokens-ignore
  { id: "rose", name: "Rose", dark: "#F43F5E", light: "#E11D48" }, // lint-tokens-ignore
  { id: "graphite", name: "Graphite", dark: "#8E8E99", light: "#6B6B75" }, // lint-tokens-ignore
]

/** The preset with this id, or Iris. */
export function accentPreset(id: string | null | undefined): AccentPreset {
  return ACCENTS.find((a) => a.id === id) ?? (ACCENTS[0] as AccentPreset)
}

/** The `--accent` value of a preset in a theme. */
export function accentValue(id: string | null | undefined, theme: "dark" | "light"): string {
  return accentPreset(id)[theme]
}
