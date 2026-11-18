/// <reference types="vite/client" />
// Every example, by id: `button/variants` is `button/variants.tsx`. Folders starting with `_` hold what the
// examples share and are not examples themselves.
import type { ExampleModule } from "./_kit/types"

const modules = import.meta.glob<ExampleModule>(["./*/*.tsx", "!./_*/**"], { eager: true })

export const EXAMPLES: Record<string, ExampleModule> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.slice(2, -".tsx".length), mod]),
)

export type { ExampleMeta, ExampleModule } from "./_kit/types"
