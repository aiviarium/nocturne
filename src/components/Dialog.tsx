import { createEffect, type JSX, onCleanup, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { activeElement, focusableIn, trapTab } from "../lib/focus"
import { createId } from "../lib/id"
import { pushLayer } from "../lib/layers"
import { Overlay } from "../lib/overlay"
import { usePhone } from "../lib/phone"
import { IconButton } from "./IconButton"
import { Sheet } from "./Sheet"

export interface DialogProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Whether the dialog is shown. */
  open: boolean
  /** Called on Escape, the close button, or a click on the backdrop. */
  onClose: () => void
  /** The dialog title. It names the dialog for assistive technology. Not needed with `bare`. */
  title?: JSX.Element
  /** Accessible name for a `bare` dialog, which has no title. */
  label?: string
  /** No header and no padding: the content is the dialog, as in a command palette. Click outside or Escape closes it. */
  bare?: boolean
  /** Where it sits: `center` (default), near the `top` like a palette, or as a `bottom` sheet that fills the width. */
  placement?: "center" | "top" | "bottom"
  /** One line under the title. Linked with `aria-describedby`. */
  description?: JSX.Element
  /** Buttons at the bottom right. The primary one gives the confirmation. */
  footer?: JSX.Element
  /** Content width. Default `md` (480px). */
  size?: "sm" | "md" | "lg"
  /** Element to focus on open, instead of the first focusable element. */
  initialFocus?: () => HTMLElement | undefined
  /** Close when the backdrop is clicked. Default true; turn it off for forms with unsaved input. */
  closeOnBackdrop?: boolean
  /** Where to mount; defaults to the themed root of `anchor`, or `document.body`. */
  anchor?: HTMLElement
}

/**
 * A modal dialog. Focus moves in on open, Tab and Shift+Tab cycle inside it, Escape closes it, and
 * focus returns to whatever had it before. On a phone a dialog with a title (a create dialog, the share dialog,
 * a confirmation) and a bottom sheet are a `Sheet`; a bare dialog near the top (the palette) stays as it is.
 */
export function Dialog(props: DialogProps): JSX.Element {
  const phone = usePhone()
  const asSheet = () => phone() && (!props.bare || props.placement === "bottom")
  return (
    <Show
      when={asSheet()}
      fallback={
        <Show when={props.open}>
          <Overlay anchor={props.anchor}>
            <DialogSurface {...props} />
          </Overlay>
        </Show>
      }
    >
      <Sheet
        open={props.open}
        onClose={props.onClose}
        title={props.bare ? undefined : props.title}
        label={props.label}
        footer={props.footer}
        flush={props.bare}
        dismissible={props.closeOnBackdrop !== false}
        initialFocus={props.initialFocus}
        class={cx(props.class, "nc-dialog-sheet")}
      >
        <Show when={props.description}>
          <p class="nc-dialog__desc nc-dialog-sheet__desc">{props.description}</p>
        </Show>
        {props.children}
      </Sheet>
    </Show>
  )
}

function DialogSurface(props: DialogProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "open",
    "onClose",
    "title",
    "label",
    "bare",
    "placement",
    "description",
    "footer",
    "size",
    "initialFocus",
    "closeOnBackdrop",
    "anchor",
    "class",
    "children",
  ])
  const titleId = createId("dialog-title")
  const descId = createId("dialog-desc")
  const previous = activeElement() as HTMLElement | null
  const layer = pushLayer()
  let surface!: HTMLDivElement
  const onKeyDown = (event: KeyboardEvent) => {
    if (!layer.isTop()) return
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      local.onClose()
    } else if (event.key === "Tab" && surface) {
      trapTab(event, surface)
    }
  }
  document.addEventListener("keydown", onKeyDown, true)
  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown, true)
    layer.remove()
    if (previous?.isConnected) previous.focus()
  })
  createEffect(() => {
    const target =
      local.initialFocus?.() ??
      focusableIn(surface).find((el) => !el.hasAttribute("data-dialog-close")) ??
      surface
    target.focus()
  })
  return (
    <div
      data-part="dialog-backdrop"
      class={cx("nc-scrim", `nc-scrim--${local.placement ?? "center"}`)}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && local.closeOnBackdrop !== false) local.onClose()
      }}
    >
      <div
        data-part="dialog"
        ref={surface}
        role="dialog"
        aria-modal="true"
        aria-labelledby={local.bare ? undefined : titleId}
        aria-label={local.bare ? local.label : undefined}
        aria-describedby={local.description ? descId : undefined}
        tabindex="-1"
        data-placement={local.placement ?? "center"}
        class={cx(
          "nc-dialog",
          `nc-dialog--${local.size ?? "md"}`,
          local.bare && "nc-dialog--bare",
          local.placement === "bottom" && "nc-dialog--sheet",
          local.class,
        )}
        {...rest}
      >
        <Show when={!local.bare}>
          <header class="nc-dialog__header">
            <h2 id={titleId} class="nc-dialog__title heading">
              {local.title}
            </h2>
            <IconButton label="Close" icon="close" data-dialog-close="" onClick={() => local.onClose()} />
          </header>
        </Show>
        <Show when={local.description}>
          <p id={descId} class="nc-dialog__desc">
            {local.description}
          </p>
        </Show>
        <div class={cx("nc-dialog__body", local.bare && "nc-dialog__body--bare")}>{local.children}</div>
        <Show when={local.footer}>
          <footer class="nc-dialog__footer">{local.footer}</footer>
        </Show>
      </div>
    </div>
  )
}
