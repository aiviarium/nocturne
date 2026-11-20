import { type Accessor, createSignal, untrack } from "solid-js"

/**
 * A value that is controlled when `value()` is not undefined and local otherwise.
 * Returns the current value and a setter that also calls `onChange`.
 */
export function createControllable<T>(options: {
  value: Accessor<T | undefined>
  defaultValue: T
  onChange?: (next: T) => void
}): [Accessor<T>, (next: T) => void] {
  // The default is read once: a later change to it must not replace what the person chose. The cast is the
  // signal's own narrowing: a value a caller passes is never a write function, but a bare `T` may be.
  // biome-ignore lint/complexity/noBannedTypes: the signature of `createSignal` excludes callables
  const [local, setLocal] = createSignal<T>(untrack(() => options.defaultValue) as Exclude<T, Function>)
  const current = () => {
    const controlled = options.value()
    return controlled === undefined ? local() : controlled
  }
  const set = (next: T) => {
    if (options.value() === undefined) setLocal(() => next)
    options.onChange?.(next)
  }
  return [current, set]
}
