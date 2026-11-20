import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { CodeBadge } from "./Badge"

export interface CalloutProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** `warning` needs a decision, `info` is context, `danger` failed. Default `info`. */
  tone?: "warning" | "info" | "danger"
  /** An API code that leads the message when a call was refused, such as `409`. */
  code?: string
  /** An action at the end, such as a link or a Retry button. */
  action?: JSX.Element
}

/** An inline message on a status tint. One or two sentences: what happened and what to do next. */
export function Callout(props: CalloutProps): JSX.Element {
  const rest = omit(props, "tone", "code", "action", "class", "children")
  const tone = () => props.tone ?? "info"
  return (
    <div
      data-part="callout"
      data-tone={tone()}
      role={tone() === "info" ? "status" : "alert"}
      class={cx("nc-callout", `nc-callout--${tone()}`, props.class)}
      {...rest}
    >
      <Show when={props.code}>
        <CodeBadge tone={tone()}>{props.code}</CodeBadge>
      </Show>
      <span class="nc-callout__body">{props.children}</span>
      <Show when={props.action}>
        <span class="nc-callout__action">{props.action}</span>
      </Show>
    </div>
  )
}
