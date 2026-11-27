// Removal with Undo for the demo's in-memory lists: the undo puts each item back at its place, and keeps what
// changed in the list meanwhile.

/** Removes the items `gone` picks from the list `get` reads and `set` writes; returns the undo. */
export function removeFrom<T>(
  get: () => T[],
  set: (list: T[]) => void,
  gone: (item: T) => boolean,
): () => void {
  const before = get()
  const removed = before.flatMap((item, at) => (gone(item) ? [{ item, at }] : []))
  set(before.filter((item) => !gone(item)))
  return () => {
    const list = [...get()]
    for (const { item, at } of removed) list.splice(Math.min(at, list.length), 0, item)
    set(list)
  }
}
