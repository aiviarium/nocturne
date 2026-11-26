// Where the shell's parts remember things (widths, appearance, history). The library never reaches for
// localStorage or sessionStorage itself: the app passes a store in, and without one nothing is remembered.

/** A string store by key. `set` with `undefined` removes the key. */
export interface ShellStorage {
  get(key: string): string | null | undefined
  set(key: string, value: string | undefined): void
}

/**
 * Wraps a Web Storage object the app passes (`webStorage(localStorage)`), with every key under `prefix`. A store
 * that throws (private mode, quota, blocked site data) reads as empty and drops writes.
 */
export function webStorage(store: Storage | undefined, prefix = "nc:"): ShellStorage {
  return {
    get(key) {
      try {
        return store?.getItem(prefix + key) ?? null
      } catch {
        return null
      }
    },
    set(key, value) {
      try {
        if (value === undefined) store?.removeItem(prefix + key)
        else store?.setItem(prefix + key, value)
      } catch {}
    },
  }
}

/** A store that lives as long as the page: for tests, examples and a window that should not remember. */
export function memoryStorage(initial: Record<string, string> = {}): ShellStorage {
  const map = new Map(Object.entries(initial))
  return {
    get: (key) => map.get(key) ?? null,
    set(key, value) {
      if (value === undefined) map.delete(key)
      else map.set(key, value)
    },
  }
}

/** Reads a JSON value from a store, or `undefined` when it is missing or unreadable. */
export function readJson<T>(storage: ShellStorage | undefined, key: string): T | undefined {
  const raw = storage?.get(key)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export function writeJson(storage: ShellStorage | undefined, key: string, value: unknown): void {
  storage?.set(key, value === undefined ? undefined : JSON.stringify(value))
}
