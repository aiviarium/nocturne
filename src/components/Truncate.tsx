import { type JSX, splitProps } from "solid-js"
import { cx } from "../lib/cx"

export interface TruncateProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The full text. It is cut with an ellipsis where it does not fit, and the whole of it is the `title`. */
  text: string
  /** Clamp to this many lines instead of one. */
  lines?: number
  /** Mono, for paths, IDs and hashes. */
  mono?: boolean
}

/**
 * Text that may not fit: one line (or `lines`) with an ellipsis, and the full text always reachable as its
 * `title` (the browser's tooltip on hover, and the accessible description). Use it for every cut label: list
 * titles, paths, breadcrumbs, metadata. Never cut text without it.
 */
export function Truncate(props: TruncateProps): JSX.Element {
  const [local, rest] = splitProps(props, ["text", "lines", "mono", "class", "style"])
  return (
    <span
      data-part="truncate"
      class={cx(
        "nc-truncate",
        (local.lines ?? 1) > 1 && "nc-truncate--clamp",
        local.mono && "nc-mono",
        local.class,
      )}
      style={{
        ...((local.lines ?? 1) > 1 ? { "-webkit-line-clamp": String(local.lines) } : {}),
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      title={local.text}
      {...rest}
    >
      {local.text}
    </span>
  )
}

/** The text of a label for its `title`: a string as is, anything else nothing (a node carries its own). */
export function titleOf(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined
}
