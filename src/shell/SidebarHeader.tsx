// The sidebar's header row, 44px: [↑ only when there is a parent] [Filter… filling the width] [collapse all]
// [minimise]. No scope name and no switcher: the title bar's path names the scope. Folded to the rail, the row is a
// single unfold button where ↑ was.
import type { JSX } from "@solidjs/web"
import { createSignal, onSettled, Show } from "solid-js"
import { Icon } from "../components/Icon"
import { IconButton } from "../components/IconButton"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import { useShellSidebar } from "./context"

export interface SidebarHeaderProps {
  /** The scope above the one the sidebar shows: an ↑ button at the left, "Up to Projects". */
  up?: { label: string; onClick: () => void }
  /** The filter's text, for an app that keeps it. Left out, the header keeps it and reports it in `onFilterChange`. */
  filter?: string
  onFilterChange?: (value: string) => void
  /** Names the field: "Filter Atlas web". Default "Filter the sidebar". */
  filterLabel?: string
  /** Folds every parent in the tree. Left out, the button is not shown. */
  onCollapseAll?: () => void
  /** What the minimise button does. Default: folds the `AppShell`'s sidebar to its rail. */
  onMinimise?: () => void
  class?: string
}

/** The sidebar's header: up, the filter, collapse all and minimise; folded, the unfold button alone. */
export function SidebarHeader(props: SidebarHeaderProps): JSX.Element {
  const sidebar = useShellSidebar()
  const [own, setOwn] = createSignal("", { ownedWrite: true })
  const value = () => props.filter ?? own()
  const setValue = (v: string) => {
    if (props.filter === undefined) setOwn(v)
    props.onFilterChange?.(v)
  }
  const folded = () => sidebar?.folded() ?? false
  const shortcut = () => sidebar?.shortcut ?? "⌘ B"
  let row: HTMLDivElement | undefined
  let input: HTMLInputElement | undefined

  // ⌘F or / while the sidebar has focus goes to the filter.
  onSettled(() => {
    const scope = row?.closest<HTMLElement>("[data-part=sidebar]") ?? row?.parentElement
    if (!scope) return
    const onKey = (e: KeyboardEvent) => {
      if (folded() || !input || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input, textarea, [contenteditable]")) return
      const mod = e.metaKey || e.ctrlKey
      if ((e.key === "/" && !mod && !e.altKey) || (mod && !e.altKey && e.key.toLowerCase() === "f")) {
        e.preventDefault()
        input.focus()
      }
    }
    scope.addEventListener("keydown", onKey)
    return () => scope.removeEventListener("keydown", onKey)
  })

  const minimise = () => (props.onMinimise ? props.onMinimise() : sidebar?.setFolded(true))

  return (
    <div
      ref={(el) => {
        row = el
      }}
      class={cx("nc-sidebar-header", props.class)}
      data-part="sidebar-header"
      data-folded={folded() ? "" : undefined}
    >
      <Show
        when={!folded()}
        fallback={
          <Tooltip content="Show sidebar" shortcut={shortcut()} placement="right">
            {(t) => (
              <button
                {...t}
                type="button"
                class="nc-icon-btn"
                aria-label="Show sidebar"
                aria-keyshortcuts="Meta+B Control+B"
                data-part="sidebar-unfold"
                onClick={() => sidebar?.setFolded(false)}
              >
                <Icon name="panel-left-open" />
              </button>
            )}
          </Tooltip>
        }
      >
        <Show when={props.up}>
          {(up) => (
            <IconButton
              icon="arrow-up"
              label={`Up to ${up().label}`}
              data-part="sidebar-up"
              onClick={() => up().onClick()}
            />
          )}
        </Show>
        <label class="nc-sidebar-filter" data-part="sidebar-filter" data-active={value() ? "" : undefined}>
          <Icon name="search" size="sm" />
          <input
            ref={(el) => {
              input = el
            }}
            value={value()}
            placeholder="Filter…"
            aria-label={props.filterLabel ?? "Filter the sidebar"}
            aria-keyshortcuts="/ Meta+F Control+F"
            spellcheck={false}
            autocomplete="off"
            onInput={(e) => setValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return
              e.preventDefault()
              e.stopPropagation()
              if (value()) {
                setValue("")
                e.currentTarget.value = ""
              } else e.currentTarget.blur()
            }}
          />
          <Show when={value()}>
            <button
              type="button"
              class="nc-sidebar-filter__clear"
              aria-label="Clear filter"
              data-part="sidebar-filter-clear"
              onClick={() => {
                setValue("")
                if (input) {
                  input.value = ""
                  input.focus()
                }
              }}
            >
              <Icon name="close" size="sm" />
            </button>
          </Show>
        </label>
        <Show when={props.onCollapseAll}>
          <IconButton
            icon="chevrons-down-up"
            label="Collapse all"
            data-part="sidebar-collapse-all"
            onClick={() => props.onCollapseAll?.()}
          />
        </Show>
        <Show when={sidebar || props.onMinimise}>
          <IconButton
            icon="panel-left"
            label={sidebar?.drawer() ? "Close sidebar" : "Collapse sidebar"}
            shortcut={shortcut()}
            data-part="sidebar-minimise"
            onClick={minimise}
          />
        </Show>
      </Show>
    </div>
  )
}
