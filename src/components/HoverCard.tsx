import type { JSX } from "@solidjs/web"
import { HoverCardContent, HoverCard as HoverCardRoot, HoverCardTrigger } from "@ui-sdk/solid/hover-card"
import { For, Show } from "solid-js"
import { type Placement, placementSide } from "../lib/placement"

/** HoverCardTriggerProps are what a trigger spreads on the element the card previews. */
export type HoverCardTriggerProps = Record<string, unknown>

/** One line of a hover card's details: a label in text-3 and its value. */
export interface HoverCardRow {
  label: string
  value: JSX.Element
}

export interface HoverCardProps {
  /** The card's heading: what the element is, in full, such as a pull request's title. */
  title?: JSX.Element
  /** A quiet line under the title, such as "#418 · Mira · 12m". */
  meta?: JSX.Element
  /** Details as label and value lines: checks, review, state. */
  rows?: HoverCardRow[]
  /** Anything else, after the rows. */
  content?: JSX.Element
  /** Names the element the card previews, when its content has no text of its own (an avatar, an icon). */
  label?: string
  /** Default `right-start`. */
  placement?: Placement
  /** Positions the card against this element instead of the trigger, such as the whole row of an icon. */
  anchor?: HTMLElement
  /** Hover delay in ms before it opens. Default 500. */
  delay?: number
  /** The element the card previews, wrapped in a span that takes the trigger's props. */
  children?: JSX.Element
  /**
   * Draws the element the card previews from the trigger's props, to spread on an element of its own, in place of
   * `children`. A prop of its own, since a Solid child can itself be a function.
   */
  trigger?: (trigger: HoverCardTriggerProps) => JSX.Element
  class?: string
}

/**
 * Details that appear while the pointer rests on an element: a pull request's checks on its icon, a chat's state on
 * its entry. Hover shows what is otherwise hidden; everything in the card is also reachable where the element leads,
 * so a person on a touch screen or a keyboard loses nothing.
 */
export function HoverCard(props: HoverCardProps): JSX.Element {
  const side = () => placementSide(props.placement ?? "right-start")
  const render = (given: HoverCardTriggerProps): JSX.Element => {
    if (props.trigger) return props.trigger(given)
    return (
      <span {...given} aria-label={props.label} data-part="hover-card-anchor" class="nc-hover-card-anchor">
        {props.children}
      </span>
    )
  }
  return (
    <HoverCardRoot delay={props.delay ?? 500} closeDelay={150}>
      <HoverCardTrigger render={render} />
      <HoverCardContent
        side={side().side}
        align={side().align}
        sideOffset={8}
        collisionPadding={8}
        anchor={props.anchor}
        data-part="hover-card"
        class={props.class ? `nc-hover-card ${props.class}` : "nc-hover-card"}
      >
        <Show when={props.title}>
          <div class="nc-hover-card__title">{props.title}</div>
        </Show>
        <Show when={props.meta}>
          <div class="nc-hover-card__meta">{props.meta}</div>
        </Show>
        <Show when={props.rows?.length}>
          <dl class="nc-hover-card__rows">
            <For each={props.rows}>
              {(row) => (
                <>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </>
              )}
            </For>
          </dl>
        </Show>
        {props.content}
      </HoverCardContent>
    </HoverCardRoot>
  )
}
