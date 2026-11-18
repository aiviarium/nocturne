import { For, type JSX, Show } from "solid-js"
import { cx } from "../lib/cx"
import { Icon, type IconName } from "./Icon"

// The phone's tab bar (iOS's tab bar): the top-level destinations along the bottom of the screen, above the
// home indicator. The active one is marked by an inset fill behind its icon and a heavier label as well as by
// colour. A tap on the active tab is reported separately, so the app can pop its stack to the root and then
// scroll to the top. It hides while the keyboard is open (the app decides, with `hidden`).

export interface TabBarItem {
  id: string
  label: string
  icon?: IconName
  /** A count (unread) or a short word on the icon. Not shown when 0 or empty. */
  badge?: number | string
}

export interface TabBarProps {
  items: readonly TabBarItem[]
  active: string
  onSelect: (id: string) => void
  /** A tap on the tab that is already active. */
  onReselect?: (id: string) => void
  hidden?: boolean
  label?: string
  class?: string
}

export function TabBar(props: TabBarProps): JSX.Element {
  return (
    <nav
      class={cx("nc-tabbar", props.class)}
      data-part="tab-bar"
      aria-label={props.label ?? "Tabs"}
      hidden={props.hidden}
    >
      <For each={props.items}>
        {(item) => {
          const active = () => item.id === props.active
          const badge = () => {
            const b = item.badge
            if (b === undefined || b === 0 || b === "") return undefined
            return typeof b === "number" && b > 99 ? "99+" : String(b)
          }
          return (
            <button
              type="button"
              class="nc-tabbar__item"
              data-tab={item.id}
              aria-label={item.label}
              aria-current={active() ? "page" : undefined}
              aria-description={badge() ? `${badge()} new` : undefined}
              onClick={() => (active() ? props.onReselect?.(item.id) : props.onSelect(item.id))}
            >
              <span class="nc-tabbar__icon">
                <Icon name={item.icon ?? "file"} class="nc-tabbar__glyph" />
                <Show when={badge()}>
                  <span class="nc-tabbar__badge" data-part="tab-badge" aria-hidden="true">
                    {badge()}
                  </span>
                </Show>
              </span>
              <span class="nc-tabbar__label" aria-hidden="true">
                {item.label}
              </span>
            </button>
          )
        }}
      </For>
    </nav>
  )
}
