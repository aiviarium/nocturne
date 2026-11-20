import { type Accessor, createEffect, createSignal } from "solid-js"

/**
 * Loads `load(source())` into a signal whenever the source changes and keeps the last answer while the next
 * one is in flight. The Solid 1.x resources in these fields read `.latest` and `.loading`; this is the same
 * behaviour without a loading boundary: a field shows its last known name or hits while the next search runs.
 */
export function createLoaded<S, T>(
  source: () => S | null | undefined,
  load: (value: S) => Promise<T> | undefined,
): { value: Accessor<T | null>; loading: Accessor<boolean> } {
  const [value, setValue] = createSignal<T | null>(null)
  const [loading, setLoading] = createSignal(false)
  createEffect(source, (input) => {
    if (input === null || input === undefined) {
      setValue(null)
      setLoading(false)
      return
    }
    const run = load(input)
    if (!run) {
      setLoading(false)
      return
    }
    let live = true
    setLoading(true)
    run.then(
      (next) => {
        if (!live) return
        setValue(() => next)
        setLoading(false)
      },
      () => {
        if (!live) return
        setValue(null)
        setLoading(false)
      },
    )
    return () => {
      live = false
    }
  })
  return { value, loading }
}
