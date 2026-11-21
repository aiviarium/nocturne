import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import type { LabelHue } from "./Badge"
import { Icon, type IconName } from "./Icon"

export interface MarkProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The name of what it marks: its first letter is the mark, and it is the accessible name. */
  name: string
  /** An icon in place of the letter. */
  icon?: IconName
  /** A logo image in place of the letter, filling the square. */
  src?: string
  /** 16px for rows and crumbs, 20px (default) for the sidebar header, 32px for a page or sign-in. */
  size?: "sm" | "md" | "lg"
  /** Its colour: `neutral` (default), the accent, a status colour or a `label-*` hue. */
  hue?: LabelHue | "neutral"
  /** Filled with the hue instead of tinted: for the product's own mark. */
  solid?: boolean
  /** Hidden from assistive technology, when a name beside it says the same. */
  decorative?: boolean
}

/** The first letter or digit of a name, upper case. */
export function markLetter(name: string): string {
  const match = name.trim().match(/[\p{L}\p{N}]/u)
  return match ? match[0].toLocaleUpperCase() : "?"
}

/**
 * The mark of a place: a workspace, a space, a project or the product. A rounded square with its first letter, an
 * icon or a logo, sized to the row it sits in, so marks line up with the icons of the rows around them.
 */
export function Mark(props: MarkProps): JSX.Element {
  const rest = omit(props, "name", "icon", "src", "size", "hue", "solid", "decorative", "class")
  return (
    <span
      data-part="mark"
      data-size={props.size ?? "md"}
      data-hue={props.hue ?? "neutral"}
      data-solid={props.solid ? "" : undefined}
      role={props.decorative ? undefined : "img"}
      aria-label={props.decorative ? undefined : props.name}
      aria-hidden={props.decorative ? "true" : undefined}
      class={cx("nc-mark", props.class)}
      {...rest}
    >
      <Show
        when={props.src}
        fallback={
          <Show when={props.icon} fallback={markLetter(props.name)}>
            {(name) => <Icon name={name()} size="sm" />}
          </Show>
        }
      >
        {(src) => <img class="nc-mark__image" src={src()} alt="" />}
      </Show>
    </span>
  )
}
