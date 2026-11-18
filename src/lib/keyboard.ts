/** Index of the next enabled entry from `from` in direction `dir`, wrapping around. -1 when none. */
export function nextEnabled(disabled: ReadonlyArray<boolean>, from: number, dir: 1 | -1): number {
  const n = disabled.length
  if (n === 0) return -1
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n
    if (!disabled[i]) return i
  }
  return -1
}

/** First or last enabled index. -1 when none. */
export function edgeEnabled(disabled: ReadonlyArray<boolean>, edge: "first" | "last"): number {
  if (edge === "first") return disabled.findIndex((d) => !d)
  for (let i = disabled.length - 1; i >= 0; i--) if (!disabled[i]) return i
  return -1
}

/** Type-ahead: the next enabled label starting with `query`, searching after `from` and wrapping. */
export function typeahead(
  labels: ReadonlyArray<string>,
  disabled: ReadonlyArray<boolean>,
  from: number,
  query: string,
): number {
  const q = query.toLowerCase()
  const n = labels.length
  for (let step = 0; step < n; step++) {
    const start = query.length > 1 ? Math.max(from, 0) : from + 1
    const i = (((start + step) % n) + n) % n
    if (!disabled[i] && (labels[i] as string).toLowerCase().startsWith(q)) return i
  }
  return -1
}
