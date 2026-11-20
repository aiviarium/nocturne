/** Anything Solid accepts for `class`: strings, arrays and objects of conditions. */
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | undefined>
  | ClassValue[]

/** Join class names, skipping falsy parts. Arrays and objects (Solid's `class` forms) are flattened. */
export function cx(...parts: ClassValue[]): string {
  let out = ""
  const add = (part: ClassValue) => {
    if (Array.isArray(part)) {
      for (const item of part) add(item)
      return
    }
    if (part && typeof part === "object") {
      for (const [name, on] of Object.entries(part)) if (on) add(name)
      return
    }
    if (part === null || part === undefined || typeof part === "boolean") return
    const text = String(part)
    if (!text) return
    out = out ? `${out} ${text}` : text
  }
  for (const part of parts) add(part)
  return out
}
