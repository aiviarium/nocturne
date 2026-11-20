import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
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
  const rest = omit(props, "state", "offset", "buffered", "lost", "exitCode", "code", "meta", "class")
  const meta = () => {
    if (props.meta !== undefined) return props.meta
    switch (props.state) {
      case "resuming":
        return props.offset !== undefined ? `since ${props.offset}` : undefined
      case "paused":
        return props.buffered !== undefined ? `${props.buffered} buffered` : undefined
      case "dropped":
        return props.lost
      case "ended":
        return props.exitCode !== undefined ? `exit ${props.exitCode}` : undefined
      case "error":
        return props.code
      default:
        return undefined
    }
  }
  return (
    <span
      data-part="stream-state"
      data-state={props.state}
      role="status"
      class={cx(
        "nc-stream",
        props.state === "dropped" && "nc-stream--warn",
        props.state === "error" && "nc-stream--error",
        props.class,
      )}
      {...rest}
    >
      <StatusDot status={DOT[props.state]} />
      {LABEL[props.state]}
      <Show when={meta()}>
        <span class="nc-stream__meta">{meta()}</span>
      </Show>
    </span>
  )
}
