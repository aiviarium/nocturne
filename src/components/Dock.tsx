import type { JSX } from "@solidjs/web"
import { createMemo, createRenderEffect, For, Show } from "solid-js"
import { cx } from "../lib/cx"
import {
  type DockFrame,
  type DockLayout,
  dockFocus,
  dockFrames,
  dockMove,
  dockResizeColumns,
  dockResizeFrames,
  dockShow,
  dockSplit,
} from "../lib/dock"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { IconButton } from "./IconButton"
import type { MenuEntry } from "./Menu"
import { Frame } from "./Panel"
import { SplitGroup } from "./Split"
import { TabDropFrame, TabStrip, type TabStripItem } from "./TabStrip"
import { ViewHeaderSlot } from "./ViewHeader"

export interface DockProps {
  /** The frames, their tabs and sizes. The app keeps it and passes back what `onLayoutChange` gives. */
  layout: DockLayout
  onLayoutChange: (layout: DockLayout) => void
  /** What a tab shows in its strip. */
  tab: (id: string) => Omit<TabStripItem, "id">
  /**
   * A tab's content. It is drawn once its tab is in a frame, and stays while the tab is there, hidden behind the
   * frame's other tabs; moving the tab to another frame draws it there afresh. `shown` is true while it is in view.
   */
  children: (id: string, shown: () => boolean) => JSX.Element
  /** Accessible name of the dock: its strips are "<label>, frame 2". */
  label: string
  /** Shows a close button on each tab. The app closes the tab and passes the layout without it (`dockRemove`). */
  onClose?: (id: string) => void
  closeLabel?: (item: TabStripItem) => string
  /** A double click on the empty part of a frame's strip: open a tab in that frame. */
  onNewTab?: (frameId: string) => void
  /**
   * Shows split buttons at the end of each strip: a new tab in a frame to the right of this one, or below it. The
   * app opens the tab and places it with `dockAdd` and `dockSplit`, or moves the frame's tab itself.
   */
  onSplit?: (frameId: string, edge: "right" | "bottom") => void
  /** The entries of a tab's context menu, and what to do with the chosen one. */
  menu?: (id: string) => MenuEntry[]
  onMenuSelect?: (id: string, entry: string) => void
  /** Smallest width or height of a frame in px. Default 200. */
  min?: number
  class?: string
}

/**
 * Tiled frames, each with its tabs: columns side by side, frames stacked in a column, dividers between them. A tab
 * moves to another frame by dragging it onto that frame's strip, or onto a frame's side to split it there. The
 * focused frame has a stronger edge, and new tabs open in it. The layout is data (`dockLayout`, `dockAdd`,
 * `dockSplit` and the rest), so the app can keep it per person or per device.
 */
export function Dock(props: DockProps): JSX.Element {
  const group = createId("dock")
  // A phone shows one frame at a time, so there is nothing to split into.
  const phone = usePhone()
  const min = () => props.min ?? 200
  // The layout functions give back the same layout when nothing changes, such as focusing the focused frame; the app
  // hears only of a change, so a press on a frame does not draw it again under the pointer.
  const change = (layout: DockLayout) => {
    if (layout !== props.layout) props.onLayoutChange(layout)
  }
  const many = () => dockFrames(props.layout).length > 1
  const columnOf = (id: string) => props.layout.columns.find((column) => column.id === id)
  const frameOf = (id: string) => dockFrames(props.layout).find((frame) => frame.id === id)
  const number = (id: string) => dockFrames(props.layout).findIndex((frame) => frame.id === id) + 1

  // Each tab has a place at the end of its frame's strip, shown while the tab is: a view header with only actions
  // draws them there (ViewHeaderSlot), so the frame has one bar.
  const slots = new Map<string, HTMLElement>()
  const slotOf = (id: string) => {
    let slot = slots.get(id)
    if (!slot) {
      slot = document.createElement("div")
      slot.className = "nc-dock__header"
      slot.dataset.part = "dock-header"
      slots.set(id, slot)
    }
    return slot
  }

  const FrameView = (view: { id: string }) => {
    const frame = (): DockFrame => frameOf(view.id) ?? { id: view.id, weight: 1, tabs: [], active: "" }
    const items = () => frame().tabs.map((id) => ({ ...props.tab(id), id }))
    return (
      <TabDropFrame
        dragGroup={group}
        stripId={view.id}
        onDrop={(drop) => change(dockSplit(props.layout, drop.tabId, view.id, drop.edge))}
      >
        <Frame
          flush
          focused={many() && props.layout.focused === view.id}
          data-dock-frame={view.id}
          class="nc-dock__frame"
          onPointerDown={() => change(dockFocus(props.layout, view.id))}
          onFocusIn={() => change(dockFocus(props.layout, view.id))}
          header={
            <TabStrip
              label={many() ? `${props.label}, frame ${number(view.id)}` : props.label}
              items={items()}
              value={frame().active}
              onChange={(id) => change(dockShow(props.layout, id))}
              onClose={props.onClose}
              closeLabel={props.closeLabel}
              stripId={view.id}
              dragGroup={group}
              onDrop={(drop) => change(dockMove(props.layout, drop.tabId, view.id, drop.index))}
              menu={props.menu}
              onMenuSelect={props.onMenuSelect}
              onNewTab={props.onNewTab ? () => props.onNewTab?.(view.id) : undefined}
              actions={
                <>
                  <For each={frame().tabs}>
                    {(id) => {
                      const slot = slotOf(id)
                      createRenderEffect(
                        () => frame().active === id,
                        (shown) => {
                          slot.hidden = !shown
                        },
                      )
                      return slot
                    }}
                  </For>
                  <Show when={props.onSplit && !phone()}>
                    <IconButton
                      size="sm"
                      icon="split-right"
                      label="Split right"
                      data-part="dock-split-right"
                      onClick={() => props.onSplit?.(view.id, "right")}
                    />
                    <IconButton
                      size="sm"
                      icon="split-down"
                      label="Split down"
                      data-part="dock-split-down"
                      onClick={() => props.onSplit?.(view.id, "bottom")}
                    />
                  </Show>
                </>
              }
            />
          }
        >
          <div class="nc-dock__panes">
            <For each={frame().tabs}>
              {(id) => {
                // Only a real change reaches the content: a layout change that leaves the tab where it was is not one.
                const shown = createMemo(() => frame().active === id)
                return (
                  <div class="nc-dock__pane" data-dock-tab={id} hidden={!shown()}>
                    <ViewHeaderSlot value={{ mount: () => slotOf(id) }}>
                      {props.children(id, shown)}
                    </ViewHeaderSlot>
                  </div>
                )
              }}
            </For>
          </div>
        </Frame>
      </TabDropFrame>
    )
  }

  return (
    <div class={cx("nc-dock", props.class)} data-part="dock">
      <SplitGroup
        items={props.layout.columns.map((column) => column.id)}
        weights={props.layout.columns.map((column) => column.weight)}
        onResize={(weights) => change(dockResizeColumns(props.layout, weights))}
        min={min()}
        label={(i) => `Resize columns ${i} and ${i + 1}`}
      >
        {(columnId) => (
          <SplitGroup
            orientation="vertical"
            items={columnOf(columnId)?.frames.map((frame) => frame.id) ?? []}
            weights={columnOf(columnId)?.frames.map((frame) => frame.weight) ?? []}
            onResize={(weights) => change(dockResizeFrames(props.layout, columnId, weights))}
            min={min()}
            label={(i) => `Resize frames ${i} and ${i + 1}`}
          >
            {(frameId) => <FrameView id={frameId} />}
          </SplitGroup>
        )}
      </SplitGroup>
    </div>
  )
}
