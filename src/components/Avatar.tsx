import type { JSX } from "@solidjs/web"
import { For, omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import type { LabelHue } from "./Badge"
import { Icon } from "./Icon"

export type AvatarKind = "person" | "agent" | "ai"

export interface AvatarProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** A circle for a person, a rounded square for an agent, the sparkle mark for the assistant. Default `person`. */
  kind?: AvatarKind
  /** Used for the initials and the accessible name. */
  name?: string
  /** 20, 24 (default) or 32px. */
  size?: "sm" | "md" | "lg"
  /** Colour family. Default is derived from the name for people and agents, the accent for the assistant. */
  hue?: LabelHue
}

const HUES: LabelHue[] = ["sky", "teal", "mint", "amber", "ember", "rose", "orchid"]

/** Two initials from a name, or one letter for a single word. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase()
  return (
    ((parts[0] as string)[0] as string).toUpperCase() +
    ((parts[parts.length - 1] as string)[0] as string).toUpperCase()
  )
}

function hueFor(name: string): LabelHue {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return HUES[hash % HUES.length] as LabelHue
}

/** Initials in a circle for people, a rounded square for agents, the sparkle mark for the assistant. */
export function Avatar(props: AvatarProps): JSX.Element {
  const rest = omit(props, "kind", "name", "size", "hue", "class")
  const kind = () => props.kind ?? "person"
  const hue = () => props.hue ?? (kind() === "ai" || !props.name ? undefined : hueFor(props.name))
  return (
    <span
      data-part="avatar"
      data-kind={kind()}
      data-hue={hue()}
      role="img"
      aria-label={props.name ?? (kind() === "ai" ? "Assistant" : undefined)}
      class={cx(
        "nc-avatar",
        props.size === "sm" && "nc-avatar--sm",
        props.size === "lg" && "nc-avatar--lg",
        kind() === "agent" && "nc-avatar--agent",
        kind() === "ai" && "nc-avatar--ai",
        props.class,
      )}
      {...rest}
    >
      <Show
        when={kind() === "ai"}
        fallback={kind() === "agent" ? initials(props.name ?? "").slice(0, 1) : initials(props.name ?? "")}
      >
        <Icon name="sparkle" size="sm" />
      </Show>
    </span>
  )
}

export interface AvatarStackProps {
  /** People or agents to show, overlapping by 6px. */
  people: Array<{ name: string; kind?: AvatarKind; hue?: LabelHue }>
  /** Show this many, then a `+N` chip. Default 4. */
  max?: number
  /** 20px (default), 24px or 32px. */
  size?: "sm" | "md" | "lg"
}

/** Overlapping avatars with a 2px ring in the surface colour. */
export function AvatarStack(props: AvatarStackProps): JSX.Element {
  const max = () => props.max ?? 4
  const shown = () => props.people.slice(0, max())
  const extra = () => props.people.length - shown().length
  return (
    <span
      data-part="avatar-stack"
      class="nc-avatars"
      role="group"
      aria-label={`${props.people.length} people`}
    >
      <For each={shown()}>{(p) => <Avatar {...p} size={props.size ?? "sm"} />}</For>
      <Show when={extra() > 0}>
        <span
          class={cx(
            "nc-avatar nc-avatar--more",
            (props.size ?? "sm") === "sm" && "nc-avatar--sm",
            props.size === "lg" && "nc-avatar--lg",
          )}
          aria-label={`${extra()} more`}
        >
          +{extra()}
        </span>
      </Show>
    </span>
  )
}
