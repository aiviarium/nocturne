import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, onCleanup, onSettled, Show } from "solid-js"
import { cx } from "../lib/cx"
import { activeElement, focusableIn, trapTab } from "../lib/focus"
import { type Detent, detentHeights, settleDetent } from "../lib/gestures"
import { createId } from "../lib/id"
import { pushLayer } from "../lib/layers"
import { Overlay } from "../lib/overlay"
import { keyboardInset, keyboardOpen, usePhone } from "../lib/phone"
import { Button } from "./Button"
import { Dialog } from "./Dialog"
import { IconButton } from "./IconButton"

// A sheet from the bottom of the screen (iOS's page sheet): what the desktop shows as an inspector, a right-hand
// panel, a picker, a menu, the share dialog or a create dialog. A grab handle on top; it opens at its content's
// own height when that fits on the screen, and only content taller than that rests at its detents (medium and
// large by default); it is dragged between them and down to dismiss. The screen behind is dimmed and inert, focus
// stays inside, Escape closes it, and it rides above the on-screen keyboard: a field focused in it goes to the
// largest detent and scrolls into view.

export interface SheetProps {
  open: boolean
  /** Called when the person dismisses it: drag down, a tap on the dimmed screen, Escape or the close button. */
  onClose: () => void
  /** The title in the sheet's header. It names the sheet. */
  title?: JSX.Element
  /** Accessible name when there is no title. */
  label?: string
  /** Where it may rest when its content is taller than the screen. Default medium and large; content that fits
   * rests at its own height. */
  detents?: Detent[]
  /** The detent tall content opens at. Default the smallest. */
  initialDetent?: "medium" | "large"
  /** Content beside the title, at the right (a Done or Add button). Replaces the close button. */
  action?: JSX.Element
  /** Pinned under the content: buttons that confirm. */
  footer?: JSX.Element
  /** Turn off dismissing by drag, Escape and a tap outside (unsaved input); the close button still works. */
  dismissible?: boolean
  /** The body runs edge to edge (a list), without the sheet's padding. */
  flush?: boolean
  class?: string
  children?: JSX.Element
  /** Element to focus when it opens, instead of the first focusable element. */
  initialFocus?: () => HTMLElement | undefined
}

/** A bottom sheet with detents. */
export function Sheet(props: SheetProps): JSX.Element {
  return (
    <Show when={props.open}>
      <Overlay>
        <SheetSurface {...props} />
      </Overlay>
    </Show>
  )
}

/**
 * The top safe-area inset where `el` is, in px: the `--nc-safe-top` variable (styles/phone.css), which is the
 * device's `env(safe-area-inset-top)` or what a preview of a device set it to.
 */
function safeTop(el: HTMLElement): number {
  const probe = document.createElement("div")
  probe.style.cssText =
    "position:absolute;top:0;width:0;height:var(--nc-safe-top,env(safe-area-inset-top,0px));visibility:hidden"
  el.appendChild(probe)
  const h = probe.offsetHeight
  probe.remove()
  return h
}

/** A field the on-screen keyboard is for. */
const isField = (el: Element | null): el is HTMLElement =>
  Boolean(
    el?.matches(
      "input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]",
    ),
  )

/** Makes everything else in the overlay host inert while the sheet is open, and gives it back after. */
function inertOthers(container: HTMLElement): () => void {
  const parent = container.parentElement
  if (!parent) return () => {}
  const changed: HTMLElement[] = []
  for (const el of Array.from(parent.children) as HTMLElement[]) {
    if (el === container || el.inert) continue
    // Earlier siblings only: what opens after the sheet (a menu from inside it, a toast) stays usable.
    if (container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) continue
    el.inert = true
    changed.push(el)
  }
  return () => {
    for (const el of changed) el.inert = false
  }
}

const ANIMATION = 240

function SheetSurface(props: SheetProps): JSX.Element {
  const titleId = createId("sheet-title")
  const previous = activeElement() as HTMLElement | null
  const layer = pushLayer()
  let root!: HTMLDivElement
  let surface!: HTMLDivElement
  let content!: HTMLDivElement
  let body!: HTMLDivElement
  const [natural, setNatural] = createSignal(0)
  const [viewport, setViewport] = createSignal(window.innerHeight)
  const [top, setTop] = createSignal(0)
  const [index, setIndex] = createSignal<number | null>(null)
  const [drag, setDrag] = createSignal<number | null>(null)
  const [phase, setPhase] = createSignal<"enter" | "open" | "leave">("enter")
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

  const available = () => Math.max(120, viewport() - keyboardInset() - top())
  const heights = createMemo(() =>
    detentHeights({
      available: available(),
      content: natural(),
      detents: props.detents ?? ["medium", "large"],
    }),
  )
  // The detent it opens at, once the content is measured. While the keyboard is up for a field in the sheet, the
  // largest, so the field has room above the keyboard.
  createEffect(heights, (h) => {
    if (keyboardOpen() && surface?.contains(activeElement()) && isField(activeElement())) {
      setIndex(h.length - 1)
      return
    }
    if (index() !== null) {
      setIndex(Math.min(index()!, h.length - 1))
      return
    }
    if (!natural()) return
    setIndex(props.initialDetent === "large" ? h.length - 1 : 0)
  })
  // The focused field stays in view: when it is focused, and when the keyboard or the sheet's height changes.
  let revealTimer: ReturnType<typeof setTimeout> | undefined
  const reveal = () => {
    clearTimeout(revealTimer)
    // After the height's transition, so it is measured where it ends.
    revealTimer = setTimeout(
      () => {
        const el = activeElement()
        if (body?.contains(el) && isField(el)) el.scrollIntoView({ block: "nearest" })
      },
      reduced ? 0 : 280,
    )
  }
  createEffect(() => [keyboardInset(), index()], reveal, { defer: true })
  onCleanup(() => clearTimeout(revealTimer))
  const height = () => drag() ?? heights()[index() ?? 0] ?? 0

  const close = () => {
    if (phase() === "leave") return
    setPhase("leave")
    setTimeout(() => props.onClose(), reduced ? 0 : ANIMATION)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!layer.isTop()) return
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      if (props.dismissible !== false) close()
    } else if (event.key === "Tab") trapTab(event, surface)
  }
  const measure = () => {
    setViewport(window.innerHeight)
    // The content's own height: header, the body's content and padding, footer and the sheet's top edge.
    const header = surface.querySelector<HTMLElement>("[data-part=sheet-header]")?.offsetHeight ?? 0
    const footer = surface.querySelector<HTMLElement>("[data-part=sheet-footer]")?.offsetHeight ?? 0
    const style = getComputedStyle(body)
    const padding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
    const edge = Number.parseFloat(getComputedStyle(surface).borderTopWidth) || 0
    setNatural(Math.ceil(header + content.offsetHeight + padding + footer + edge))
  }
  let restore = () => {}
  // Read in the body: a prop getter can make a memo, and onSettled may not create one.
  const initialFocus = createMemo(() => props.initialFocus)
  onSettled(() => {
    setTop(safeTop(root) + 10)
    restore = inertOthers(root.parentElement as HTMLElement)
    document.addEventListener("keydown", onKeyDown, true)
    const ro = new ResizeObserver(measure)
    ro.observe(content)
    window.addEventListener("resize", measure)
    measure()
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")))
    const target =
      initialFocus()?.() ??
      focusableIn(body).find((el) => !el.matches("input, textarea, [contenteditable]")) ??
      surface
    target.focus({ preventScroll: true })
    // The tap that opened the sheet may still move focus back to what it tapped (a row's own handlers): once the
    // sheet is drawn, focus is inside it.
    requestAnimationFrame(() => {
      if (!surface.contains(activeElement())) target.focus({ preventScroll: true })
    })
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  })
  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown, true)
    layer.remove()
    restore()
    if (previous?.isConnected) previous.focus({ preventScroll: true })
  })

  // Dragging: the handle and header always; the body only when it is scrolled to the top and the drag goes down.
  let start: { y: number; h: number; t: number; id: number; fromBody: boolean } | null = null
  let last = { y: 0, t: 0, v: 0 }
  const down = (e: PointerEvent, fromBody: boolean) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    if (fromBody && body.scrollTop > 0) return
    start = { y: e.clientY, h: height(), t: e.timeStamp, id: e.pointerId, fromBody }
    last = { y: e.clientY, t: e.timeStamp, v: 0 }
  }
  const move = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return
    const dy = e.clientY - start.y
    if (start.fromBody && drag() === null && (dy < 6 || body.scrollTop > 0)) {
      if (dy < -6) start = null
      return
    }
    if (drag() === null && Math.abs(dy) < 4) return
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
    const dt = Math.max(1, e.timeStamp - last.t)
    last = { y: e.clientY, t: e.timeStamp, v: (e.clientY - last.y) / dt }
    const max = heights()[heights().length - 1]!
    let h = start.h - dy
    // Past the largest detent it gives a little, like a rubber band.
    if (h > max) h = max + (h - max) * 0.2
    setDrag(Math.max(0, h))
    e.preventDefault()
  }
  const up = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return
    const h = drag()
    start = null
    if (h === null) return
    const at = settleDetent(heights(), h, last.v, props.dismissible !== false)
    setDrag(null)
    if (at < 0) close()
    else setIndex(at)
  }

  const scrimTap = (e: PointerEvent) => {
    if (e.target === e.currentTarget && props.dismissible !== false) close()
  }

  return (
    <div
      ref={root}
      class="nc-sheet-scrim"
      data-part="sheet-scrim"
      data-phase={phase()}
      onPointerDown={scrimTap}
    >
      <div
        ref={surface}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.title ? titleId : undefined}
        aria-label={props.title ? undefined : props.label}
        tabindex="-1"
        data-part="sheet"
        data-phase={phase()}
        data-detent={index() ?? 0}
        data-detents={heights().length}
        data-dragging={drag() !== null ? "" : undefined}
        class={cx("nc-sheet", props.class)}
        style={{
          height: `${Math.round(height())}px`,
          bottom: `${keyboardInset()}px`,
        }}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div class="nc-sheet__header" data-part="sheet-header" onPointerDown={(e) => down(e, false)}>
          <span class="nc-sheet__grab" data-part="sheet-grab" aria-hidden="true" />
          <Show when={props.title || props.action}>
            <div class="nc-sheet__titlebar">
              <h2 id={titleId} class="nc-sheet__title">
                {props.title}
              </h2>
              <Show
                when={props.action}
                fallback={
                  <IconButton
                    label="Close"
                    icon="close"
                    tooltip={false}
                    class="nc-sheet__close"
                    data-part="sheet-close"
                    onClick={close}
                  />
                }
              >
                <span class="nc-sheet__action">{props.action}</span>
              </Show>
            </div>
          </Show>
        </div>
        <div
          ref={body}
          class={cx("nc-sheet__body", props.flush && "nc-sheet__body--flush")}
          data-part="sheet-body"
          onPointerDown={(e) => down(e, true)}
          onFocusIn={(e) => {
            if (isField(e.target as Element)) reveal()
          }}
        >
          <div ref={content} class="nc-sheet__content">
            {props.children}
          </div>
        </div>
        <Show when={props.footer}>
          <div class="nc-sheet__footer" data-part="sheet-footer">
            {props.footer}
          </div>
        </Show>
      </div>
    </div>
  )
}

export interface ActionSheetAction {
  id: string
  label: string
  /** Destructive: shown in the danger colour. Put it first, as iOS does, or last. */
  danger?: boolean
  disabled?: boolean
}

export interface ActionSheetProps {
  open: boolean
  onClose: () => void
  /** What the choice is about, in one short line. */
  title?: string
  /** A sentence under the title. */
  message?: string
  actions: ActionSheetAction[]
  onSelect: (id: string) => void
  /** The button that chooses nothing. Default "Cancel". */
  cancelLabel?: string
}

/**
 * A short choice or a destructive confirmation: the actions in one group and Cancel apart from them, from the
 * bottom of the screen. On a desktop the same choice is a small dialog.
 */
export function ActionSheet(props: ActionSheetProps): JSX.Element {
  const phone = usePhone()
  const choose = (id: string) => {
    props.onClose()
    props.onSelect(id)
  }
  return (
    <Show
      when={phone()}
      fallback={
        <Dialog
          open={props.open}
          onClose={props.onClose}
          title={props.title}
          label={props.title ?? "Choose"}
          description={props.message}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={props.onClose}>
                {props.cancelLabel ?? "Cancel"}
              </Button>
              <For each={props.actions}>
                {(a) => (
                  <Button
                    variant={a.danger ? "danger" : "primary"}
                    disabled={a.disabled}
                    data-action={a.id}
                    onClick={() => choose(a.id)}
                  >
                    {a.label}
                  </Button>
                )}
              </For>
            </>
          }
        />
      }
    >
      <Sheet
        open={props.open}
        onClose={props.onClose}
        label={props.title ?? "Choose"}
        detents={["fit"]}
        flush
        class="nc-action-sheet"
      >
        <div class="nc-action-sheet__group" data-part="action-sheet">
          <Show when={props.title || props.message}>
            <div class="nc-action-sheet__head">
              <Show when={props.title}>
                <span class="nc-action-sheet__title">{props.title}</span>
              </Show>
              <Show when={props.message}>
                <span class="nc-action-sheet__message">{props.message}</span>
              </Show>
            </div>
          </Show>
          <For each={props.actions}>
            {(a) => (
              <button
                type="button"
                class="nc-action-sheet__button"
                data-danger={a.danger ? "" : undefined}
                data-action={a.id}
                disabled={a.disabled}
                onClick={() => choose(a.id)}
              >
                {a.label}
              </button>
            )}
          </For>
        </div>
        <button
          type="button"
          class="nc-action-sheet__button nc-action-sheet__cancel"
          data-action="cancel"
          onClick={props.onClose}
        >
          {props.cancelLabel ?? "Cancel"}
        </button>
      </Sheet>
    </Show>
  )
}
