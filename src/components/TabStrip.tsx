import type { JSX } from "@solidjs/web"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@ui-sdk/solid/command"
import { PopoverContent, Popover as PopoverRoot, PopoverTrigger } from "@ui-sdk/solid/popover"
import { createEffect, createSignal, For, onCleanup, onSettled, Show } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { mergeParts } from "../lib/merge"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"
import { Menu, type MenuEntry } from "./Menu"
import { OpenLayer } from "./Popover"
import { Tooltip } from "./Tooltip"

export interface TabStripItem {
  /** Stable id, passed to the callbacks. */
  id: string
  /** Visible text. It truncates with an ellipsis, and the full text is in the tooltip. */
  label: string
  /** A core icon. */
  icon?: IconName
  /** Dimmed words after the title that tell tabs with the same title apart: the space, the parent. */
  detail?: string
  /** Pinned tabs are compact (the icon, with the title in the tooltip), have no close button, and the owner keeps them at the left. */
  pinned?: boolean
  /** Unsaved changes: a dot in place of the close button until the tab is hovered or focused. */
  dirty?: boolean
  /** Loading: a spinner in place of the icon. */
  loading?: boolean
}

export interface TabStripDrop {
  /** The tab that was dragged or moved with the keyboard. */
  tabId: string
  /** The `stripId` of the strip it came from. */
  from: string
  /** Where it goes in this strip, among the tabs it has now (0 puts it first, the length last). */
  index: number
}

export type TabEdge = "left" | "right" | "top" | "bottom" | "center"

export interface TabStripProps {
  /** The open tabs, in order. */
  items: TabStripItem[]
  /** The selected tab id. */
  value: string
  /** Called when a tab is chosen. */
  onChange: (id: string) => void
  /** Shows a close button on each tab (and closes on a middle click). */
  onClose?: (id: string) => void
  /** Accessible name of the tab list. */
  label: string
  /** Accessible name of a tab's close button. Default "Close <label>". */
  closeLabel?: (item: TabStripItem) => string
  /** Identifies this strip as the source and target of drags. */
  stripId?: string
  /** Strips with the same group accept each other's tabs. Setting it turns on drag and drop and Alt+Arrow moves. */
  dragGroup?: string
  /** Called when a tab is dropped here, or moved with Alt+Arrow Left or Right. */
  onDrop?: (drop: TabStripDrop) => void
  /** The entries of a tab's context menu. Opens on a right click, a long press, the menu key and Shift+F10. */
  menu?: (id: string) => MenuEntry[]
  /** Called with the tab and the chosen entry's id. */
  onMenuSelect?: (id: string, entry: string) => void
  /** Called on a double click on the empty part of the strip: open a new tab. */
  onNewTab?: () => void
  /** Content before the tabs, such as the button that brings back a hidden sidebar. */
  leading?: JSX.Element
  /** Buttons after the tabs: split, close the frame. They stay in view while the tabs scroll. */
  actions?: JSX.Element
  class?: string
}

const dragType = (group: string) => `application/x-nc-tab-${group}`

// The tab being dragged, for drop targets that cannot read the drag's data before the drop.
const [dragged, setDragged] = createSignal<{ group: string; id: string; from: string } | null>(null)

/**
 * A row of document tabs: 28px pills with an icon, a title and a close button. Tabs shrink to a minimum width,
 * then the strip scrolls (the wheel too, with the active tab kept in view) and an "All tabs" menu with a filter
 * lists them all. Arrow keys move between tabs, Alt+Arrow moves the focused tab, a middle click closes, a
 * context menu offers what the owner gives it, and with a `dragGroup` tabs drag between strips of the same group
 * (and onto the edges of a `TabDropFrame`).
 */
export function TabStrip(props: TabStripProps): JSX.Element {
  const prefix = createId("tabstrip")
  const [dropAt, setDropAt] = createSignal<number | null>(null)
  const [overflow, setOverflow] = createSignal(false)
  const [touch, setTouch] = createSignal(false)
  const [menuAt, setMenuAt] = createSignal<{ id: string; x: number; y: number } | null>(null)
  const stripId = () => props.stripId ?? prefix
  // A strip removed in the middle of a drag gets no dragend: forget its tab, or drop zones elsewhere stay up.
  onCleanup(() => {
    if (dragged()?.from === stripId()) setDragged(null)
  })
  const buttons = new Map<string, HTMLButtonElement>()
  const tabs = new Map<string, HTMLElement>()
  let root!: HTMLDivElement
  let list!: HTMLDivElement

  const focusTab = (index: number) => {
    const item = props.items[(index + props.items.length) % props.items.length]
    if (item) buttons.get(item.id)?.focus()
  }

  const openMenu = (id: string, x: number, y: number) => {
    if (!props.menu || props.menu(id).length === 0) return
    setMenuAt({ id, x, y })
  }
  const closeMenu = (restoreFocus = true) => {
    const at = menuAt()
    setMenuAt(null)
    if (restoreFocus && at) queueMicrotask(() => buttons.get(at.id)?.focus())
  }

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const item = props.items[index] as TabStripItem
    if ((event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) && props.menu) {
      event.preventDefault()
      const box = (tabs.get(item.id) ?? (event.currentTarget as HTMLElement)).getBoundingClientRect()
      openMenu(item.id, box.left, box.bottom)
      return
    }
    if (event.altKey && props.dragGroup && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      const target = event.key === "ArrowLeft" ? index - 1 : index + 2
      if (target < 0 || target > props.items.length) return
      props.onDrop?.({ tabId: item.id, from: stripId(), index: target })
      queueMicrotask(() => buttons.get(item.id)?.focus())
      return
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === "ArrowRight") focusTab(index + 1)
    else if (event.key === "ArrowLeft") focusTab(index - 1)
    else if (event.key === "Home") focusTab(0)
    else if (event.key === "End") focusTab(props.items.length - 1)
    else if (event.key === "Delete" && props.onClose) props.onClose(item.id)
    else return
    event.preventDefault()
  }

  /** Where a drop at this x position goes: before the first tab whose middle is to the right. */
  const indexAt = (x: number) => {
    const els = Array.from(list.querySelectorAll<HTMLElement>("[data-part=tab-strip-tab]"))
    const at = els.findIndex((t) => {
      const r = t.getBoundingClientRect()
      return x < r.left + r.width / 2
    })
    return at < 0 ? els.length : at
  }
  const accepts = (event: DragEvent) =>
    Boolean(props.dragGroup) && event.dataTransfer?.types.includes(dragType(props.dragGroup as string))

  // Long press, for touch: the menu opens at the finger, and the click that follows the release does nothing.
  let press: { id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> } | undefined
  let swallowClick = false
  const cancelPress = () => {
    if (press) clearTimeout(press.timer)
    press = undefined
  }
  onCleanup(cancelPress)

  // Overflow: the strip scrolls once the tabs are at their minimum width.
  const measure = () => setOverflow(list.scrollWidth > list.clientWidth + 1)
  onSettled(() => {
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  })
  const keepActiveInView = () => {
    const el = tabs.get(props.value)
    if (!el || !list) return
    const a = el.getBoundingClientRect()
    const l = list.getBoundingClientRect()
    const margin = 8
    if (a.left < l.left + margin) list.scrollLeft += a.left - l.left - margin
    else if (a.right > l.right - margin) list.scrollLeft += a.right - l.right + margin
  }
  createEffect(
    () => [props.value, props.items.length] as const,
    () =>
      queueMicrotask(() =>
        requestAnimationFrame(() => {
          measure()
          keepActiveInView()
        }),
      ),
  )
  const onWheel = (event: WheelEvent) => {
    if (list.scrollWidth <= list.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.preventDefault()
    list.scrollLeft += event.deltaY
  }

  const tip = (item: TabStripItem) => (item.detail ? `${item.label} · ${item.detail}` : item.label)

  return (
    <div
      ref={root}
      data-part="tab-strip"
      data-overflow={overflow() ? "" : undefined}
      class={cx("nc-tabstrip", props.class)}
      onDblClick={(event) => {
        // The empty part: the strip itself, the gaps between tabs, the space after them.
        const t = event.target as HTMLElement
        if (
          !props.onNewTab ||
          t.closest("[data-part=tab-strip-tab], .nc-tabstrip__actions, .nc-tabstrip__more")
        )
          return
        props.onNewTab()
      }}
    >
      <Show when={props.leading}>
        <div class="nc-tabstrip__leading">{props.leading}</div>
      </Show>
      <div
        ref={list}
        role="tablist"
        aria-label={props.label}
        class="nc-tabstrip__tabs"
        data-drop-end={dropAt() === props.items.length ? "" : undefined}
        onWheel={onWheel}
        onDragOver={(event) => {
          if (!accepts(event)) return
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
          setDropAt(indexAt(event.clientX))
        }}
        onDragLeave={(event) => {
          if (!list.contains(event.relatedTarget as Node | null)) setDropAt(null)
        }}
        onDrop={(event) => {
          if (!accepts(event)) return
          event.preventDefault()
          const index = indexAt(event.clientX)
          setDropAt(null)
          setDragged(null)
          try {
            const data = JSON.parse(
              event.dataTransfer?.getData(dragType(props.dragGroup as string)) ?? "null",
            ) as { id: string; from: string } | null
            if (data) props.onDrop?.({ tabId: data.id, from: data.from, index })
          } catch {
            /* not one of ours */
          }
        }}
      >
        <For each={props.items}>
          {(item, index) => (
            <div
              ref={(el) => tabs.set(item.id, el)}
              data-part="tab-strip-tab"
              data-tab={item.id}
              data-active={props.value === item.id ? "" : undefined}
              data-pinned={item.pinned ? "" : undefined}
              data-dirty={item.dirty ? "" : undefined}
              data-loading={item.loading ? "" : undefined}
              data-drop-before={dropAt() === index() ? "" : undefined}
              class="nc-tabstrip__tab"
              draggable={props.dragGroup && !touch() ? "true" : undefined}
              onDragStart={(event) => {
                if (!props.dragGroup || !event.dataTransfer) return
                event.dataTransfer.setData(
                  dragType(props.dragGroup),
                  JSON.stringify({ id: item.id, from: stripId() }),
                )
                event.dataTransfer.effectAllowed = "move"
                setDragged({ group: props.dragGroup, id: item.id, from: stripId() })
              }}
              onDragEnd={() => {
                setDropAt(null)
                setDragged(null)
              }}
              onMouseDown={(event) => {
                // A middle press would start the browser's autoscroll.
                if (event.button === 1 && props.onClose) event.preventDefault()
              }}
              onAuxClick={(event) => {
                if (event.button === 1 && props.onClose) {
                  event.preventDefault()
                  props.onClose(item.id)
                }
              }}
              onContextMenu={(event) => {
                if (!props.menu) return
                event.preventDefault()
                openMenu(item.id, event.clientX, event.clientY)
              }}
              onPointerDown={(event) => {
                setTouch(event.pointerType === "touch" || event.pointerType === "pen")
                if (event.pointerType === "mouse" || !props.menu) return
                cancelPress()
                const { clientX: x, clientY: y } = event
                press = {
                  id: item.id,
                  x,
                  y,
                  timer: setTimeout(() => {
                    press = undefined
                    swallowClick = true
                    openMenu(item.id, x, y)
                  }, 500),
                }
              }}
              onPointerMove={(event) => {
                if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) cancelPress()
              }}
              onPointerUp={cancelPress}
              onPointerCancel={cancelPress}
            >
              {/* The tab is the tooltip's trigger: the full title shows over a truncated or pinned one. */}
              <Tooltip content={tip(item)} placement="bottom" delay={600} type="description">
                {(trigger) => (
                  <button
                    {...mergeParts(
                      {
                        ref: (el: HTMLButtonElement) => buttons.set(item.id, el),
                        onClick: (event: MouseEvent) => {
                          if (swallowClick) {
                            swallowClick = false
                            event.preventDefault()
                            return
                          }
                          props.onChange(item.id)
                        },
                        onKeyDown: (e: KeyboardEvent) => onKeyDown(e, index()),
                      },
                      trigger,
                    )}
                    type="button"
                    role="tab"
                    aria-selected={aria(props.value === item.id)}
                    aria-label={item.pinned ? tip(item) : undefined}
                    tabindex={props.value === item.id ? 0 : -1}
                    class="nc-tabstrip__main label"
                  >
                    <Show
                      when={item.loading}
                      fallback={
                        <Show when={item.icon}>
                          <Icon name={item.icon} size="sm" />
                        </Show>
                      }
                    >
                      <span class="nc-spinner" role="status" aria-label="Loading" />
                    </Show>
                    <Show when={!item.pinned}>
                      <span class="nc-tabstrip__title">{item.label}</span>
                      <Show when={item.detail}>
                        <span class="nc-tabstrip__detail">{item.detail}</span>
                      </Show>
                    </Show>
                    <Show when={item.pinned && item.dirty}>
                      <span
                        class="nc-tabstrip__dirty nc-tabstrip__dirty--pinned"
                        aria-label="Unsaved changes"
                      />
                    </Show>
                  </button>
                )}
              </Tooltip>
              <Show when={props.onClose && !item.pinned}>
                <button
                  type="button"
                  class="nc-tabstrip__close"
                  tabindex="-1"
                  aria-label={props.closeLabel?.(item) ?? `Close ${item.label}`}
                  onClick={() => props.onClose?.(item.id)}
                >
                  <Show when={item.dirty}>
                    <span class="nc-tabstrip__dirty" role="img" aria-label="Unsaved changes" />
                  </Show>
                  <Icon name="close" size="sm" />
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <Show when={overflow()}>
        <AllTabs items={props.items} value={props.value} onChange={props.onChange} />
      </Show>
      <Show when={props.actions}>
        <div class="nc-tabstrip__actions">{props.actions}</div>
      </Show>
      <Show when={menuAt()} keyed>
        {(at) => (
          <Menu
            open
            anchor={{ x: at.x, y: at.y }}
            label="Tab"
            minWidth="264px"
            items={props.menu?.(at.id) ?? []}
            onClose={() => closeMenu()}
            onSelect={(entry) => {
              closeMenu()
              props.onMenuSelect?.(at.id, entry)
            }}
          />
        )}
      </Show>
    </div>
  )
}

/** The button at the end of a strip with many tabs: every tab, with a filter, in a popover. */
function AllTabs(props: {
  items: TabStripItem[]
  value: string
  onChange: (id: string) => void
}): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const choose = (id: string) => {
    setOpen(false)
    props.onChange(id)
  }
  return (
    <div class="nc-tabstrip__more" data-part="all-tabs">
      <PopoverRoot open={open()} onOpenChange={setOpen}>
        <PopoverTrigger
          render={(trigger: Record<string, unknown>) => (
            <IconButton {...trigger} label="All tabs" icon="chevron-down" />
          )}
        />
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          class="nc-popover"
          initialFocus="auto"
        >
          <OpenLayer />
          <div class="nc-alltabs" data-part="all-tabs-list">
            {/* A command list: the filter keeps focus, arrows move the highlight and Enter opens the tab. */}
            <Command onAction={choose} defaultValue={props.value}>
              <CommandInput aria-label="Filter tabs" placeholder="Filter tabs" class="nc-input nc-search" />
              <CommandEmpty class="nc-menu__empty">No tab matches.</CommandEmpty>
              <CommandList class="nc-alltabs__list nc-menu" aria-label="Tabs">
                <For each={props.items}>
                  {(item) => (
                    <CommandItem
                      value={item.id}
                      keywords={[item.label, item.detail ?? ""]}
                      class="nc-menu__item"
                      aria-current={props.value === item.id ? "true" : undefined}
                    >
                      <Show when={item.icon} fallback={<span class="nc-menu__slot" aria-hidden="true" />}>
                        <Icon name={item.icon} size="sm" />
                      </Show>
                      <span class="nc-menu__text">{item.label}</span>
                      <Show when={props.value === item.id}>
                        <Icon name="check" size="sm" class="nc-menu__check" />
                      </Show>
                      <Show
                        when={[item.detail, item.pinned ? "Pinned" : "", item.dirty ? "Unsaved" : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {(note) => <span class="nc-menu__key">{note()}</span>}
                      </Show>
                    </CommandItem>
                  )}
                </For>
              </CommandList>
            </Command>
          </div>
        </PopoverContent>
      </PopoverRoot>
    </div>
  )
}

export interface TabDropFrameProps {
  /** The same `dragGroup` as the strips. */
  dragGroup: string
  /** The `stripId` of the strip in this frame. */
  stripId: string
  /** A tab was dropped on an edge (a new frame there) or on the middle (this frame, at the end). */
  onDrop: (drop: { tabId: string; from: string; edge: TabEdge }) => void
  children: JSX.Element
  class?: string
}

/**
 * Wraps a frame's body. While a tab of the group is being dragged, the body shows drop zones: the left, right,
 * top and bottom quarters split the frame there, the middle moves the tab into the frame.
 */
export function TabDropFrame(props: TabDropFrameProps): JSX.Element {
  const [edge, setEdge] = createSignal<TabEdge | null>(null)
  const active = () => dragged()?.group === props.dragGroup
  let box!: HTMLDivElement
  let zones: HTMLDivElement | undefined
  const edgeAt = (x: number, y: number): TabEdge => {
    const r = (zones ?? box).getBoundingClientRect()
    const fx = (x - r.left) / r.width
    const fy = (y - r.top) / r.height
    const dx = Math.min(fx, 1 - fx)
    const dy = Math.min(fy, 1 - fy)
    if (Math.min(dx, dy) > 0.25) return "center"
    if (dx <= dy) return fx < 0.5 ? "left" : "right"
    return fy < 0.5 ? "top" : "bottom"
  }
  return (
    <div ref={box} class={cx("nc-dropframe", props.class)} data-part="drop-frame">
      {props.children}
      <Show when={active()}>
        <div
          ref={zones}
          class="nc-dropframe__zones"
          data-part="drop-zones"
          onDragOver={(event) => {
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
            setEdge(edgeAt(event.clientX, event.clientY))
          }}
          onDragLeave={(event) => {
            if (!box.contains(event.relatedTarget as Node | null)) setEdge(null)
          }}
          onDrop={(event) => {
            event.preventDefault()
            const at = edgeAt(event.clientX, event.clientY)
            const d = dragged()
            setEdge(null)
            setDragged(null)
            if (d) props.onDrop({ tabId: d.id, from: d.from, edge: at })
          }}
        >
          <Show when={edge()}>
            <div class="nc-dropframe__target" data-edge={edge()} />
          </Show>
        </div>
      </Show>
    </div>
  )
}
