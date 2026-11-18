import { type Accessor, createSignal } from "solid-js"

/**
 * A value that is controlled when `value()` is not undefined and local otherwise.
 * Returns the current value and a setter that also calls `onChange`.
 */
export function createControllable<T>(options: {
  value: Accessor<T | undefined>
  defaultValue: T
  onChange?: (next: T) => void
}): [Accessor<T>, (next: T) => void] {
  const [local, setLocal] = createSignal<T>(options.defaultValue)
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
