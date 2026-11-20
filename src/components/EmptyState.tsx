import type { JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { Icon, type IconName } from "./Icon"

export interface EmptyStateProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** A core icon, shown at 20px. */
  icon?: IconName
  /** Says what is missing: "No sessions match". */
  title: JSX.Element
  /** One line of detail, such as the active filters. */
  description?: JSX.Element
  /** The way out: a Clear filters or Create button. */
  children?: JSX.Element
  /**
   * `md` (default) for a whole view or a main column; `sm` for a card, a panel or a section: less padding, no
   * large icon. In a box of fixed height (a filled `Card` or `Panel`) it centres itself.
   */
  size?: "sm" | "md"
}

/**
 * What a view shows when there is nothing to list yet, or nothing matches: one line that says what is missing,
 * one line of detail, and the way out. Only a whole view or a list the person filtered has one: an empty part of
 * a view renders nothing instead (README, "Which part for what").
 */
export function EmptyState(props: EmptyStateProps): JSX.Element {
  const rest = omit(props, "icon", "title", "description", "children", "size", "class")
  return (
    <div
      data-part="empty-state"
      class={cx("nc-empty", props.size === "sm" && "nc-empty--sm", props.class)}
      {...rest}
    >
      <Show when={props.icon}>
        <Icon name={props.icon} size={props.size === "sm" ? undefined : "lg"} class="nc-empty__icon" />
      </Show>
      <span class="nc-empty__title label">{props.title}</span>
      <Show when={props.description}>
        <span class="nc-empty__desc nc-meta">{props.description}</span>
      </Show>
      <Show when={props.children}>
        <div class="nc-empty__actions">{props.children}</div>
      </Show>
    </div>
  )
}
