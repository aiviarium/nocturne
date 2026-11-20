import type { JSX } from "@solidjs/web"
import { createSignal, For, omit, onCleanup, Show } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { useLinkClick } from "../lib/link"
import { overlayHost } from "../lib/overlay"
import { usePhone } from "../lib/phone"
import { createRowSwipe } from "../lib/swipe"
import { Icon, type IconName } from "./Icon"
import { Menu, type MenuEntry } from "./Menu"
import { Popover } from "./Popover"
import { Sheet } from "./Sheet"

// Grouped inset lists (iOS's inset grouped table): rounded groups of rows on the canvas, a small heading over
// each group and an optional note under it. For settings, pickers and the phone's lists. A row can carry swipe
// actions (archive, mark read) revealed by dragging it sideways, run at once by a full swipe, and a context menu
// on a long press (the same menu a right click opens on a desktop).

export interface InsetGroupProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  /** The heading over the group. */
  title?: JSX.Element
  /** Content at the right of the heading (a small link). */
  titleAction?: JSX.Element
  /** A note under the group. */
  footer?: JSX.Element
  class?: string
  children?: JSX.Element
  /** Name of the list for assistive technology, when there is no title. */
  label?: string
}

export function InsetGroup(props: InsetGroupProps): JSX.Element {
  const rest = omit(props, "title", "titleAction", "footer", "class", "children", "label")
  return (
    <section
      class={cx("nc-inset-group", props.class)}
      data-part="inset-group"
      aria-label={props.label}
      {...rest}
    >
      <Show when={props.title || props.titleAction}>
        <div class="nc-inset-group__head">
          <h3 class="nc-inset-group__title">{props.title}</h3>
          {props.titleAction}
        </div>
      </Show>
      <div class="nc-inset-group__rows" role="list">
        {props.children}
      </div>
      <Show when={props.footer}>
        <p class="nc-inset-group__footer">{props.footer}</p>
      </Show>
    </section>
  )
}

/** Groups stacked with the gap between them. */
export function InsetList(props: { class?: string; children?: JSX.Element }): JSX.Element {
  return (
    <div class={cx("nc-inset-list", props.class)} data-part="inset-list">
      {props.children}
    </div>
  )
}

export interface SwipeAction {
  id: string
  label: string
  icon?: IconName
  tone?: "danger" | "accent" | "warning" | "neutral"
  onAction: () => void
}

export interface InsetRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick" | "title"> {
  label: JSX.Element
  /** A second line in secondary text. Makes the row taller. */
  detail?: JSX.Element
  /** Trailing text in secondary colour (a value, a time). */
  value?: JSX.Element
  icon?: IconName
  /** Leading content instead of an icon (an avatar). */
  leading?: JSX.Element
  /** Trailing content (a switch, a count). */
  trailing?: JSX.Element
  /** Content under the text, inside the row (inline buttons). */
  below?: JSX.Element
  href?: string
  onClick?: () => void
  /** A chevron at the right. Default on for a row that navigates (href) without trailing content. */
  chevron?: boolean
  /** A radio row: a check mark when chosen. */
  checked?: boolean
  danger?: boolean
  /** Dimmed text, for a row that is read or done. */
  muted?: boolean
  /** Revealed by dragging the row to the right, the first runs on a full swipe. */
  leadingActions?: SwipeAction[]
  /** Revealed by dragging the row to the left, the first runs on a full swipe. */
  trailingActions?: SwipeAction[]
  /** The context menu: a long press, or a right click with a mouse. */
  menu?: MenuEntry[]
  menuLabel?: string
  onMenuSelect?: (id: string) => void
}

/** Width of one swipe action button. */
export const SWIPE_ACTION_WIDTH = 76

export function InsetRow(props: InsetRowProps): JSX.Element {
  const rest = omit(
    props,
    "label",
    "detail",
    "value",
    "icon",
    "leading",
    "trailing",
    "below",
    "href",
    "onClick",
    "chevron",
    "checked",
    "danger",
    "muted",
    "leadingActions",
    "trailingActions",
    "menu",
    "menuLabel",
    "onMenuSelect",
    "class",
  )
  const linkClick = useLinkClick()
  const leadingWidth = () => (props.leadingActions?.length ?? 0) * SWIPE_ACTION_WIDTH
  const trailingWidth = () => (props.trailingActions?.length ?? 0) * SWIPE_ACTION_WIDTH
  let row!: HTMLDivElement
  const phone = usePhone()
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number } | null>(null)
  const swipe = createRowSwipe({
    element: () => row,
    leading: leadingWidth,
    trailing: trailingWidth,
    onFull: (side) => (side === "leading" ? props.leadingActions : props.trailingActions)?.[0]?.onAction(),
    menu: () => Boolean(props.menu?.length),
    onLongPress: setMenuAt,
  })
  const offset = swipe.offset
  const swipeable = () => leadingWidth() > 0 || trailingWidth() > 0

  const activate = (e: MouseEvent & { currentTarget: HTMLElement }) => {
    if (swipe.swallowClick(e)) return
    if (props.href) linkClick(e as never, props.href)
    props.onClick?.()
  }
  const showChevron = () =>
    props.chevron ?? (Boolean(props.href) && !props.trailing && props.checked === undefined)
  const inner = () => (
    <>
      <Show when={props.leading || props.icon}>
        <span class="nc-inset-row__leading">
          <Show when={props.leading} fallback={<Icon name={props.icon} />}>
            {props.leading}
          </Show>
        </span>
      </Show>
      <span class="nc-inset-row__text">
        <span class="nc-inset-row__label">{props.label}</span>
        <Show when={props.detail}>
          <span class="nc-inset-row__detail">{props.detail}</span>
        </Show>
      </span>
      <Show when={props.value}>
        <span class="nc-inset-row__value">{props.value}</span>
      </Show>
      <Show when={props.trailing}>
        <span class="nc-inset-row__trailing">{props.trailing}</span>
      </Show>
      <Show when={props.checked}>
        <Icon name="check" class="nc-inset-row__check" />
      </Show>
      <Show when={showChevron()}>
        <Icon name="chevron-right" class="nc-inset-row__chevron" />
      </Show>
    </>
  )
  const interactive = () => Boolean(props.href || props.onClick)
  return (
    <div
      ref={row}
      role="listitem"
      class={cx("nc-inset-row", props.class)}
      data-part="inset-row"
      data-danger={props.danger ? "" : undefined}
      data-muted={props.muted ? "" : undefined}
      data-two-line={props.detail ? "" : undefined}
      data-open={offset() > 0 ? "leading" : offset() < 0 ? "trailing" : undefined}
      style={swipeable() ? { "touch-action": "pan-y" } : undefined}
      {...swipe.handlers}
      onContextMenu={(e) => {
        if (!props.menu?.length) return
        e.preventDefault()
        setMenuAt({ x: e.clientX, y: e.clientY })
      }}
      {...rest}
    >
      <Show when={leadingWidth() && offset() > 0}>
        <div
          class="nc-inset-row__actions nc-inset-row__actions--leading"
          style={{ width: `${Math.max(offset(), 0)}px` }}
        >
          <For each={props.leadingActions}>
            {(a) => <SwipeButton action={a} close={() => swipe.setOpen(null)} />}
          </For>
        </div>
      </Show>
      <Show when={trailingWidth() && offset() < 0}>
        <div
          class="nc-inset-row__actions nc-inset-row__actions--trailing"
          style={{ width: `${Math.max(-offset(), 0)}px` }}
        >
          <For each={props.trailingActions}>
            {(a) => <SwipeButton action={a} close={() => swipe.setOpen(null)} />}
          </For>
        </div>
      </Show>
      <div
        class="nc-inset-row__face"
        data-dragging={swipe.dragging() ? "" : undefined}
        style={offset() ? { transform: `translateX(${offset()}px)` } : undefined}
      >
        <Show when={interactive()} fallback={<div class="nc-inset-row__main">{inner()}</div>}>
          <Show
            when={props.href}
            fallback={
              <button
                type="button"
                class="nc-inset-row__main"
                role={props.checked !== undefined ? "menuitemradio" : undefined}
                aria-checked={props.checked !== undefined ? aria(props.checked) : undefined}
                onClick={activate}
              >
                {inner()}
              </button>
            }
          >
            <a class="nc-inset-row__main" href={props.href} onClick={activate}>
              {inner()}
            </a>
          </Show>
        </Show>
        <Show when={props.below}>
          <div class="nc-inset-row__below">{props.below}</div>
        </Show>
      </div>
      <Show when={menuAt()}>
        {(at) => (
          <RowMenu
            at={at()}
            phone={phone()}
            label={props.menuLabel ?? "Actions"}
            items={props.menu ?? []}
            onClose={() => setMenuAt(null)}
            onSelect={(id) => {
              setMenuAt(null)
              props.onMenuSelect?.(id)
            }}
          />
        )}
      </Show>
    </div>
  )
}

/** One swipe action: a full-height button with its icon over its label. */
export function SwipeButton(props: { action: SwipeAction; close: () => void }): JSX.Element {
  return (
    <button
      type="button"
      class="nc-inset-row__action"
      data-tone={props.action.tone ?? "neutral"}
      data-swipe-action={props.action.id}
      onClick={() => {
        props.close()
        props.action.onAction()
      }}
    >
      <Show when={props.action.icon}>
        <Icon name={props.action.icon} />
      </Show>
      <span>{props.action.label}</span>
    </button>
  )
}

/**
 * A context menu: a sheet on a phone, a menu at the pointer elsewhere, kept inside the viewport (it flips above
 * the pointer near the bottom and shifts in from the edges). `origin`, the row it was opened on, gives it its
 * theme; `returnFocus` gets focus back when it closes with nothing chosen from the keyboard.
 */
export function RowMenu(props: {
  at: { x: number; y: number }
  phone: boolean
  label: string
  items: MenuEntry[]
  onClose: () => void
  onSelect: (id: string) => void
  origin?: Element
  returnFocus?: () => HTMLElement | undefined
}): JSX.Element {
  const anchor = document.createElement("span")
  anchor.setAttribute("aria-hidden", "true")
  anchor.style.cssText = `position:fixed;left:${props.at.x}px;top:${props.at.y}px;width:0;height:0;pointer-events:none`
  // In the themed root of the row, so the menu takes the row's theme and accent (a docs example's, a frame's).
  overlayHost(props.origin).appendChild(anchor)
  onCleanup(() => {
    anchor.remove()
    // Focus left with the menu (Escape, or a click on nothing): back to the row.
    const back = props.returnFocus?.()
    const now = document.activeElement
    if (back?.isConnected && (!now || now === document.body)) queueMicrotask(() => back.focus())
  })
  return (
    <Show
      when={props.phone}
      fallback={
        <Popover open anchor={anchor} placement="bottom-start" onClose={props.onClose}>
          <Menu
            label={props.label}
            items={props.items}
            onSelect={props.onSelect}
            onRequestClose={props.onClose}
          />
        </Popover>
      }
    >
      <Sheet open label={props.label} detents={["fit"]} flush onClose={props.onClose}>
        <Menu label={props.label} items={props.items} onSelect={props.onSelect} class="nc-menu--sheet" />
      </Sheet>
    </Show>
  )
}

/**
 * The context menu for any element: a right click with a mouse, a long press on a touch screen, the menu key or
 * Shift+F10. On a phone it opens as a sheet.
 */
export function ContextMenu(props: {
  items: () => MenuEntry[]
  onSelect: (id: string) => void
  label?: string
  children: JSX.Element
  class?: string
}): JSX.Element {
  const phone = usePhone()
  const [at, setAt] = createSignal<{ x: number; y: number } | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number; y: number } | null = null
  let fired = false
  const items = () => (at() ? props.items() : [])
  let area!: HTMLDivElement
  return (
    <div
      data-part="context-area"
      class={cx("nc-context-area", props.class)}
      onContextMenu={(e) => {
        e.preventDefault()
        setAt({ x: e.clientX, y: e.clientY })
      }}
      onKeyDown={(e) => {
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
          e.preventDefault()
          const r = (e.target as HTMLElement).getBoundingClientRect()
          setAt({ x: r.left + 8, y: r.bottom })
        }
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return
        fired = false
        start = { x: e.clientX, y: e.clientY }
        timer = setTimeout(() => {
          fired = true
          setAt(start)
        }, 500)
      }}
      onPointerMove={(e) => {
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) clearTimeout(timer)
      }}
      onPointerUp={() => clearTimeout(timer)}
      onPointerCancel={() => clearTimeout(timer)}
      ref={(el) => {
        area = el
        el.addEventListener(
          "click",
          (e) => {
            if (fired) {
              e.preventDefault()
              e.stopPropagation()
              fired = false
            }
          },
          true,
        )
      }}
    >
      {props.children}
      <Show when={at()}>
        {(p) => (
          <RowMenu
            at={p()}
            phone={phone()}
            label={props.label ?? "Actions"}
            items={items()}
            origin={area}
            onClose={() => setAt(null)}
            onSelect={(id) => {
              setAt(null)
              props.onSelect(id)
            }}
          />
        )}
      </Show>
    </div>
  )
}
