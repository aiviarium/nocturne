declare module "@solidjs/compiler" {
  export function transform(
    code: string,
    options?: { filename?: string; generate?: "dom" | "ssr" | "universal" | "dynamic"; hydratable?: boolean },
  ): { code: string; map?: unknown }
}
