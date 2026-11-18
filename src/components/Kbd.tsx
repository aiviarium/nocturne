import { For, type JSX, splitProps } from "solid-js"
import { cx } from "../lib/cx"

export interface KbdProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The key text, for example `Ctrl K`. Ignored when children are given. */
  keys?: string
}

/** A keyboard shortcut hint. Always mono and never wraps. */
export function Kbd(props: KbdProps): JSX.Element {
  const [local, rest] = splitProps(props, ["keys", "class", "children"])
  return (
    <kbd data-part="kbd" class={cx("nc-kbd", local.class)} {...rest}>
      {local.children ?? local.keys}
    </kbd>
  )
}

/** Several keys in a row, such as `["Ctrl", "K"]`. */
export function KbdGroup(props: { keys: string[] }): JSX.Element {
  return (
    <span data-part="kbd-group" class="nc-row nc-row--tight">
      <For each={props.keys}>{(k) => <Kbd keys={k} />}</For>
    </span>
  )
}
