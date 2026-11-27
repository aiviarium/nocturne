// The lenses of the demo's scopes, with their hues: a project wears Explore, Product and Build, a host Operate.
import type { Lens, ShellLens, ShellPlace } from "@aiviarium/nocturne"

export const LENSES = {
  explore: { id: "explore", label: "Explore", icon: "sparkle", hue: "orchid", purpose: "Triage and ideas" },
  product: {
    id: "product",
    label: "Product",
    icon: "book-open",
    hue: "amber",
    purpose: "Specs and the roadmap",
  },
  build: { id: "build", label: "Build", icon: "code", hue: "mint", purpose: "Issues, the board and cycles" },
  operate: {
    id: "operate",
    label: "Operate",
    icon: "server",
    hue: "sky",
    purpose: "Sessions, logs and files",
  },
} satisfies Record<string, Lens>

/** A lens of one scope kind with its places. */
export const lens = <T>(
  id: keyof typeof LENSES,
  places: ShellPlace<T>[],
  extra: Partial<ShellLens<T>> = {},
): ShellLens<T> => ({ ...LENSES[id], places, ...extra })
