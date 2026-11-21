import type { JSX } from "@solidjs/web"
import {
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  Dialog as DialogRoot,
  DialogTitle,
} from "@ui-sdk/solid/dialog"
import { omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { focusableIn } from "../lib/focus"
import { usePhone } from "../lib/phone"
import { IconButton } from "./IconButton"
import { OpenLayer } from "./Popover"
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
  /** @deprecated The dialog renders in the top layer where it sits, and keeps that place's theme. */
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
    <Show when={asSheet()} fallback={<DialogSurface {...props} />}>
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
  const rest = omit(
    props,
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
  )
  let surface: HTMLDivElement | undefined
  // The first control in the body, not the header's close button: the person came to fill the form in.
  const firstFocus = () =>
    props.initialFocus?.() ??
    (surface ? focusableIn(surface).find((el) => !el.hasAttribute("data-dialog-close")) : undefined) ??
    surface
  return (
    <DialogRoot
      open={props.open}
      closeOnOutsidePress={props.closeOnBackdrop !== false}
      onOpenChange={(next) => {
        if (!next) props.onClose()
      }}
    >
      <DialogBackdrop
        data-part="dialog-backdrop"
        class={cx("nc-scrim", `nc-scrim--${props.placement ?? "center"}`)}
      />
      <DialogContent
        ref={(el: HTMLDivElement) => {
          surface = el
        }}
        initialFocus={firstFocus}
        data-part="dialog"
        aria-label={props.bare ? props.label : undefined}
        data-placement={props.placement ?? "center"}
        class={cx(
          "nc-dialog",
          `nc-dialog--${props.size ?? "md"}`,
          `nc-dialog--at-${props.placement ?? "center"}`,
          props.bare && "nc-dialog--bare",
          props.placement === "bottom" && "nc-dialog--sheet",
          props.class,
        )}
        {...(rest as Record<string, unknown>)}
      >
        <OpenLayer />
        <Show when={!props.bare}>
          <header class="nc-dialog__header">
            <DialogTitle class="nc-dialog__title heading">{props.title}</DialogTitle>
            <DialogClose
              render={(close: Record<string, unknown>) => (
                <IconButton label="Close" icon="close" data-dialog-close="" {...close} />
              )}
            />
          </header>
        </Show>
        <Show when={props.description}>
          <DialogDescription class="nc-dialog__desc">{props.description}</DialogDescription>
        </Show>
        <div class={cx("nc-dialog__body", props.bare && "nc-dialog__body--bare")}>{props.children}</div>
        <Show when={props.footer}>
          <footer class="nc-dialog__footer">{props.footer}</footer>
        </Show>
      </DialogContent>
    </DialogRoot>
  )
}
