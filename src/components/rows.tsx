// What `RowList`, `DataTable` and `DataList` share besides the controllers in lib/: the selection bar at a list's
// foot, the toast that undoes a removal, and a row's buttons read as menu entries. Internal: not exported from the
// package.

import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import type { RowMenuEntry } from "../lib/rowmenu"
import { Button } from "./Button"
import { Kbd } from "./Kbd"
import { toast } from "./Toast"

/**
 * The bar shown while something is selected: the count, Select all while not everything is, the caller's bulk
 * actions, Delete when the list removes, and Clear. Nothing of it shows while nothing is selected.
 */
export function SelectionBar(props: {
  count: number
  total: number
  phone?: boolean
  onSelectAll: () => void
  onClear: () => void
  onDelete?: () => void
  actions?: JSX.Element
  class?: string
}): JSX.Element {
  return (
    <div class={`nc-bulkbar ${props.class ?? ""}`} data-part="bulk-bar" role="toolbar" aria-label="Selection">
      <span class="nc-rows__count">{props.count} selected</span>
      <Show when={props.count < props.total}>
        <Button size="sm" variant="ghost" onClick={props.onSelectAll}>
          Select all
        </Button>
      </Show>
      <span class="nc-bulkbar__spacer" />
      <span class="nc-bulkbar__actions" data-bulk-actions="">
        {props.actions}
      </span>
      <Show when={props.onDelete}>
        <Button size="sm" variant="ghost" icon="trash" onClick={() => props.onDelete?.()}>
          Delete
        </Button>
      </Show>
      <Button size="sm" variant="ghost" onClick={props.onClear}>
        Clear
        <Show when={!props.phone}>
          <Kbd keys="Esc" />
        </Show>
      </Button>
    </div>
  )
}

/** Tell what was removed, with Undo when the caller can put it back. */
export function removalToast(name: string, count: number, undo: undefined | (() => void)): void {
  if (typeof undo !== "function") return
  toast({
    title: count === 1 ? `Removed “${name}”` : `Removed ${count} ${name}`,
    action: { label: "Undo", onClick: undo },
  })
}

/**
 * The enabled buttons and links in `container` as menu entries that click them: a long press or a right click
 * offers what a hover shows, and the bulk bar's actions become the menu of a selection.
 */
export function entriesFromButtons(container: ParentNode | null | undefined): RowMenuEntry[] {
  const buttons = [...(container?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])].filter(
    // The row's own remove button is the menu's Delete.
    (b) =>
      !b.hasAttribute("disabled") &&
      b.getAttribute("aria-disabled") !== "true" &&
      !b.closest("[data-row-remove]"),
  )
  return buttons.map((b, i) => ({
    id: `action-${i}`,
    label: b.getAttribute("aria-label") || b.textContent?.trim() || `Action ${i + 1}`,
    leading: (b.querySelector("svg")?.cloneNode(true) as Element | undefined) ?? undefined,
    danger: b.classList.contains("nc-btn--danger") || undefined,
    onSelect: () => b.click(),
  }))
}
