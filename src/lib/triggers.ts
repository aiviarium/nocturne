// The `/`, `@` and `$` triggers of the Composer: finding the one at the caret, filtering items, and inserting a pick.

export type TriggerChar = "/" | "@" | "$"

export interface ActiveTrigger {
  char: TriggerChar
  /** Index of the trigger character in the text. */
  start: number
  /** What was typed after it. */
  query: string
}

/**
 * The trigger the caret is inside, if any. `@` and `$` start a word; `/` must start a line.
 * Returns null when the word under the caret does not begin with a trigger.
 */
export function findTrigger(text: string, caret: number): ActiveTrigger | null {
  let i = Math.min(caret, text.length)
  while (i > 0 && !/\s/.test(text[i - 1] as string)) i--
  const word = text.slice(i, caret)
  const char = word[0]
  if (char !== "/" && char !== "@" && char !== "$") return null
  if (char === "/" && !(i === 0 || text[i - 1] === "\n")) return null
  return { char, start: i, query: word.slice(1) }
}

export interface Matchable {
  label: string
  description?: string
  keywords?: string
}

export interface Match<T> {
  item: T
  /** Matched character range inside `label`, for highlighting. */
  range?: [start: number, end: number]
}

/** Filter by the typed query: label prefix first, then label substring, then description or keywords. An empty query keeps every item. */
export function filterItems<T extends Matchable>(items: readonly T[], query: string): Match<T>[] {
  const q = query.toLowerCase()
  if (!q) return items.map((item) => ({ item }))
  const prefix: Match<T>[] = []
  const inside: Match<T>[] = []
  const other: Match<T>[] = []
  for (const item of items) {
    const label = item.label.toLowerCase()
    const at = label.indexOf(q)
    if (at === 0) prefix.push({ item, range: [0, q.length] })
    else if (at > 0) inside.push({ item, range: [at, at + q.length] })
    else if (`${item.description ?? ""} ${item.keywords ?? ""}`.toLowerCase().includes(q))
      other.push({ item })
  }
  return [...prefix, ...inside, ...other]
}
