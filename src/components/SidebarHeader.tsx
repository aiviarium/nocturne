import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import { cx } from "../lib/cx"
import { Icon } from "./Icon"
import { IconButton } from "./IconButton"
import { DropdownMenu, type MenuEntry } from "./Menu"
import { SidebarToggle } from "./ShellSidebar"
import type { PathShow } from "./ViewHeader"

/** A level above the place a drilled-down sidebar shows. */
export interface SidebarPathItem {
  label: string
  onClick: () => void
  /**
   * Whether the level is in the row, in the `…` menu, or left out. Default: the last level is in the row and the
   * ones before it are in the menu.
   */
  show?: PathShow
}

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
  /**
   * Levels above the place worth showing, from the top down, each a button that goes to it: `Fleet` above a host.
   * The row shows the last one beside the place, as `Fleet / build-01`; the ones before it fold into a `…` menu, so
   * the place keeps room for its name. Optional: the view picks what helps and leaves out the rest, such as the
   * app itself, which back already names.
   */
  path?: SidebarPathItem[]
  /** Makes the title a menu button that switches to another place of the same kind: workspaces, projects. */
  switcher?: { label: string; items: MenuEntry[]; onSelect: (id: string) => void }
  /** Opens the command palette. */
  onCommand?: () => void
  /** The command palette's shortcut, shown in the button's tooltip: "Ctrl K". */
  commandShortcut?: string
  /** Under the row: a search field. */
  children?: JSX.Element
  class?: string
}

/**
 * The top of the app's sidebar: back when drilled down, the place it shows (a switcher when there are others),
 * the command palette and the sidebar toggle in one row, and a search field under it. The toggle is there when the
 * `AppShell` has `onSidebarHiddenChange`. The frames beside it start at the top of the window.
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
        <Show when={props.path?.length}>
          <SidebarPath path={props.path!} />
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
        <SidebarToggle />
      </div>
      <Show when={props.children}>
        <div class="nc-sidebar-header__below">{props.children}</div>
      </Show>
    </div>
  )
}

const FOLD = "nc-sidebar-path-fold:"

/** The levels above the place: those in the row as buttons, the folded ones in a menu before them. */
function SidebarPath(props: { path: SidebarPathItem[] }): JSX.Element {
  const showOf = (item: SidebarPathItem, i: number): PathShow =>
    item.show ?? (i === props.path.length - 1 ? "inline" : "fold")
  const folded = () => props.path.filter((item, i) => showOf(item, i) === "fold")
  const inline = () => props.path.filter((item, i) => showOf(item, i) === "inline")
  const sep = () => (
    <span class="nc-sidebar-header__sep" aria-hidden="true">
      /
    </span>
  )
  return (
    <Show when={folded().length + inline().length > 0}>
      <span class="nc-sidebar-header__path" data-part="sidebar-path">
        <Show when={folded().length > 0}>
          <DropdownMenu
            label="Levels above"
            items={folded().map((item, i) => ({ id: `${FOLD}${i}`, label: item.label }))}
            onSelect={(id) => folded()[Number(id.slice(FOLD.length))]?.onClick()}
            trigger={(t) => (
              <button {...t} type="button" class="nc-sidebar-header__crumb" data-part="sidebar-fold">
                …
              </button>
            )}
          />
          {sep()}
        </Show>
        <For each={inline()}>
          {(item) => (
            <>
              <button
                type="button"
                class="nc-sidebar-header__crumb"
                data-part="sidebar-crumb"
                onClick={() => item.onClick()}
              >
                {item.label}
              </button>
              {sep()}
            </>
          )}
        </For>
      </span>
    </Show>
  )
}
