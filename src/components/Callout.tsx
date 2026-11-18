import { type JSX, Show, splitProps } from "solid-js"
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
  const [local, rest] = splitProps(props, ["tone", "code", "action", "class", "children"])
  const tone = () => local.tone ?? "info"
  return (
    <div
      data-part="callout"
      data-tone={tone()}
      role={tone() === "info" ? "status" : "alert"}
      class={cx("nc-callout", `nc-callout--${tone()}`, local.class)}
      {...rest}
    >
      <Show when={local.code}>
        <CodeBadge tone={tone()}>{local.code}</CodeBadge>
      </Show>
      <span class="nc-callout__body">{local.children}</span>
      <Show when={local.action}>
        <span class="nc-callout__action">{local.action}</span>
      </Show>
    </div>
  )
}
