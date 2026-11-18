import { type JSX, Show } from "solid-js"
import { cx } from "../lib/cx"
import { Icon } from "./Icon"
import { IconButton } from "./IconButton"
import { DropdownMenu, type MenuEntry } from "./Menu"

export interface SidebarHeaderProps {
  /** The place the sidebar shows: the workspace at the top level, the project or host you drilled into below it. */
  title: string
  /** A mark before the title: the workspace's logo or a coloured square. */
  mark?: JSX.Element
  /**
   * A drilled-down sidebar's way back: a chevron button at the start of the row, to the place above. `to` names
   * that place for the button's accessible name.
   */
  back?: { to: string; onClick: () => void }
  /** Makes the title a menu button that switches to another place of the same kind: workspaces, projects. */
  switcher?: { label: string; items: MenuEntry[]; onSelect: (id: string) => void }
  /** Opens the command palette. */
  onCommand?: () => void
  /** The command palette's shortcut, shown in the button's tooltip: "Ctrl K". */
  commandShortcut?: string
  /** Hides the sidebar. The app shows a way to bring it back, such as an action in the view's header. */
  onHideSidebar?: () => void
  /** Under the row: a search field. */
  children?: JSX.Element
  class?: string
}

/**
 * The top of the app's sidebar: back when drilled down, the place it shows (a switcher when there are others),
 * the command palette and the sidebar toggle in one row, and a search field under it. The frames beside it start
 * at the top of the window.
 */
export function SidebarHeader(props: SidebarHeaderProps): JSX.Element {
  const title = (extra?: JSX.Element) => (
    <>
      <Show when={props.mark}>
        <span class="nc-sidebar-header__mark">{props.mark}</span>
      </Show>
      <span class="nc-sidebar-header__name">{props.title}</span>
      {extra}
    </>
  )
  return (
    <div class={cx("nc-sidebar-header", props.class)} data-part="sidebar-header">
      <div class="nc-sidebar-header__row">
        <Show when={props.back}>
          {(b) => (
            <IconButton
              size="sm"
              icon="chevron-left"
              label={`Back to ${b().to}`}
              data-part="sidebar-back"
              onClick={() => b().onClick()}
            />
          )}
        </Show>
        <Show when={props.switcher} fallback={<span class="nc-sidebar-header__place">{title()}</span>}>
          {(s) => (
            <DropdownMenu
              label={s().label}
              items={s().items}
              onSelect={s().onSelect}
              trigger={(t) => (
                <button
                  {...t}
                  type="button"
                  class="nc-sidebar-header__place nc-sidebar-header__place--menu"
                  data-part="sidebar-switcher"
                >
                  {title(<Icon name="chevron-down" size="sm" />)}
                </button>
              )}
            />
          )}
        </Show>
        <Show when={props.onCommand}>
          <IconButton
            size="sm"
            icon="command"
            label="Command palette"
            shortcut={props.commandShortcut}
            data-part="sidebar-command"
            onClick={() => props.onCommand?.()}
          />
        </Show>
        <Show when={props.onHideSidebar}>
          <IconButton
            size="sm"
            icon="sidebar"
            label="Hide the sidebar"
            data-part="sidebar-toggle"
            onClick={() => props.onHideSidebar?.()}
          />
        </Show>
      </div>
      <Show when={props.children}>
        <div class="nc-sidebar-header__below">{props.children}</div>
      </Show>
    </div>
  )
}
