import { type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { type DotStatus, StatusDot } from "./StatusDot"

export type StreamStatus = "connecting" | "live" | "resuming" | "paused" | "dropped" | "ended" | "error"

export interface StreamStateProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** The connection state of the stream. */
  state: StreamStatus
  /** Resuming: the byte offset or cursor the stream will resume from. */
  offset?: number | string
  /** Paused: how many entries are buffered. */
  buffered?: number
  /** Dropped: what was lost, such as `12 KB`. */
  lost?: string
  /** Ended: the exit code. */
  exitCode?: number
  /** Ended with error: the API code and a short reason, such as `504 timeout`. */
  code?: string
  /** Overrides the computed meta text. */
  meta?: string
}

const LABEL: Record<StreamStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  resuming: "Resuming",
  paused: "Paused",
  dropped: "Dropped",
  ended: "Ended",
  error: "Ended",
}
const DOT: Record<StreamStatus, DotStatus> = {
  connecting: "idle",
  live: "live",
  resuming: "ai",
  paused: "off",
  dropped: "warn",
  ended: "neutral",
  error: "error",
}

/** The connection state of any stream. Put it in the panel header next to the title. */
export function StreamState(props: StreamStateProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "state",
    "offset",
    "buffered",
    "lost",
    "exitCode",
    "code",
    "meta",
    "class",
  ])
  const meta = () => {
    if (local.meta !== undefined) return local.meta
    switch (local.state) {
      case "resuming":
        return local.offset !== undefined ? `since ${local.offset}` : undefined
      case "paused":
        return local.buffered !== undefined ? `${local.buffered} buffered` : undefined
      case "dropped":
        return local.lost
      case "ended":
        return local.exitCode !== undefined ? `exit ${local.exitCode}` : undefined
      case "error":
        return local.code
      default:
        return undefined
    }
  }
  return (
    <span
      data-part="stream-state"
      data-state={local.state}
      role="status"
      class={cx(
        "nc-stream",
        local.state === "dropped" && "nc-stream--warn",
        local.state === "error" && "nc-stream--error",
        local.class,
      )}
      {...rest}
    >
      <StatusDot status={DOT[local.state]} />
      {LABEL[local.state]}
      <Show when={meta()}>
        <span class="nc-stream__meta">{meta()}</span>
      </Show>
    </span>
  )
}
