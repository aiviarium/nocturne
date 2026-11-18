import { type JSX, splitProps } from "solid-js"
import { cx } from "../lib/cx"

/** `live` and `ai` glow because they are moving; the rest never glow. */
export type DotStatus = "live" | "ok" | "ai" | "warn" | "error" | "idle" | "off" | "neutral"

export interface StatusDotProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** `live` running or reachable, `ai` an agent working now, `ok` done, `warn` needs you, `error` failed, `idle` a ring, `off` a dashed ring. */
  status: DotStatus
}

/** The 6px dot alone. Pair it with a word: use `State`. */
export function StatusDot(props: StatusDotProps): JSX.Element {
  const [local, rest] = splitProps(props, ["status", "class"])
  return (
    <span
      data-part="status-dot"
      data-status={local.status}
      aria-hidden="true"
      class={cx("nc-dot", local.status !== "neutral" && `nc-dot--${local.status}`, local.class)}
      {...rest}
    />
  )
}

export interface StateProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Which dot to show. */
  status: DotStatus
  /** The state word, such as "Running". State is never colour alone. */
  children: JSX.Element
}

/** A dot plus a word: the one way state is shown. The word is coloured only for `warn` and `error`. */
export function State(props: StateProps): JSX.Element {
  const [local, rest] = splitProps(props, ["status", "class", "children"])
  return (
    <span
      data-part="state"
      data-status={local.status}
      class={cx(
        "nc-state",
        (local.status === "warn" || local.status === "error") && `nc-state--${local.status}`,
        local.class,
      )}
      {...rest}
    >
      <StatusDot status={local.status} />
      {local.children}
    </span>
  )
}
