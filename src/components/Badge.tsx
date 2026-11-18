import { type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { Icon, type IconName } from "./Icon"

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "outline"

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Meaning of the pill. Never colour alone: the word says the state. Default `neutral`. */
  tone?: BadgeTone
  /** Squarer corners (radius-xs), for tags that sit in dense rows. */
  square?: boolean
  /** A core icon before the word. */
  icon?: IconName
}

/** A status pill: a word on its tint. */
export function Badge(props: BadgeProps): JSX.Element {
  const [local, rest] = splitProps(props, ["tone", "square", "icon", "class", "children"])
  return (
    <span
      data-part="badge"
      data-tone={local.tone ?? "neutral"}
      class={cx(
        "nc-badge",
        local.tone && local.tone !== "neutral" && `nc-badge--${local.tone}`,
        local.square && "nc-badge--square",
        local.class,
      )}
      {...rest}
    >
      <Show when={local.icon}>
        <Icon name={local.icon} size="sm" />
      </Show>
      {local.children}
    </span>
  )
}

export interface CountProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** The number of unread or attention items. */
  value: number
  /** Show `max+` above this. Default 99. */
  max?: number
}

/** An unread or attention count on an accent fill. Totals are plain text-3 numbers instead. */
export function Count(props: CountProps): JSX.Element {
  const [local, rest] = splitProps(props, ["value", "max", "class"])
  const max = () => local.max ?? 99
  return (
    <span data-part="count" class={cx("nc-count", local.class)} aria-label={`${local.value}`} {...rest}>
      {local.value > max() ? `${max()}+` : local.value}
    </span>
  )
}

export interface DeltaProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Direction of the arrow. */
  direction: "up" | "down"
  /** The figure, for example `4.2%`. */
  value: string
  /** Whether the change is good (success) or bad (danger). Default: up is good, down is bad. Invert when lower is better. */
  sentiment?: "good" | "bad"
}

/** A change since last time: an arrow and tabular numbers. */
export function Delta(props: DeltaProps): JSX.Element {
  const [local, rest] = splitProps(props, ["direction", "value", "sentiment", "class"])
  const good = () => (local.sentiment ? local.sentiment === "good" : local.direction === "up")
  return (
    <span
      data-part="delta"
      data-direction={local.direction}
      class={cx("nc-delta", good() ? "nc-delta--up" : "nc-delta--down", local.class)}
      {...rest}
    >
      <span aria-hidden="true">{local.direction === "up" ? "▲" : "▼"}</span>
      <span class="nc-visually-hidden">{local.direction === "up" ? "Up" : "Down"}</span>
      {local.value}
    </span>
  )
}

/** An identifier such as `TSK-41`. Always mono. */
export function IdBadge(props: JSX.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  const [local, rest] = splitProps(props, ["class"])
  return <span data-part="id-badge" class={cx("nc-id", local.class)} {...rest} />
}

export interface CodeBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Danger (default) or the tone of the surrounding callout. */
  tone?: "danger" | "warning" | "info"
}

/** An API error code such as `409` or `502`. Lead a callout with it when a call was refused. */
export function CodeBadge(props: CodeBadgeProps): JSX.Element {
  const [local, rest] = splitProps(props, ["tone", "class"])
  return (
    <span
      data-part="code-badge"
      data-tone={local.tone ?? "danger"}
      class={cx("nc-code-badge", local.tone && `nc-code-badge--${local.tone}`, local.class)}
      {...rest}
    />
  )
}

export type LabelHue =
  | "sky"
  | "teal"
  | "mint"
  | "amber"
  | "ember"
  | "rose"
  | "orchid"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"

export interface LabelChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** The dot colour: one of the `label-*` hues, the accent, or a status colour. */
  hue?: LabelHue
}

/** An outline pill with a coloured dot, for tags, projects and areas. */
export function LabelChip(props: LabelChipProps): JSX.Element {
  const [local, rest] = splitProps(props, ["hue", "class", "children"])
  return (
    <span data-part="label-chip" class={cx("nc-chip", local.class)} {...rest}>
      <span class="nc-chip__dot" data-hue={local.hue ?? "accent"} aria-hidden="true" />
      {local.children}
    </span>
  )
}
