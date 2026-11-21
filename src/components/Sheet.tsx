import type { JSX } from "@solidjs/web"
import {
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  Drawer as DrawerRoot,
  DrawerTitle,
  type SnapPoint,
} from "@ui-sdk/solid/drawer"
import { For, Show } from "solid-js"
import { cx } from "../lib/cx"
import { focusableIn } from "../lib/focus"
import type { Detent } from "../lib/gestures"
import { usePhone } from "../lib/phone"
import { Button } from "./Button"
import { Dialog } from "./Dialog"
import { IconButton } from "./IconButton"
import { OpenLayer } from "./Popover"

// A sheet from the bottom of the screen (iOS's page sheet): what the desktop shows as an inspector, a right-hand
// panel, a picker, a menu, the share dialog or a create dialog. ui-sdk's Drawer moves it: it opens at its
// content's own height, up to nearly the whole screen, rests at its detents when it has several, follows a drag and a
// fling, closes on a drag down, and rides above the on-screen keyboard with the focused field in view. The page
// behind is dimmed and inert, focus stays inside, and Escape closes it.

export interface SheetProps {
  open: boolean
  /** Called when the person dismisses it: drag down, a tap on the dimmed screen, Escape or the close button. */
  onClose: () => void
  /** The title in the sheet's header. It names the sheet. */
  title?: JSX.Element
  /** Accessible name when there is no title. */
  label?: string
  /** Where it may rest. By default it rests at its content's own height, up to nearly the whole screen, and
   * taller content scrolls inside; `["medium", "large"]` lets a long list open at half the screen. A detent larger
   * than the content rests at the content's height. */
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

const SNAP: Record<Detent, SnapPoint> = { medium: 0.5, large: 1, fit: "content" }

/** A bottom sheet with detents. */
export function Sheet(props: SheetProps): JSX.Element {
  const snaps = () => (props.detents ?? ["fit"]).map((d) => SNAP[d])
  let surface: HTMLDivElement | undefined
  // The first control that is not a text field, so opening a sheet does not raise the keyboard.
  const firstFocus = () =>
    props.initialFocus?.() ??
    (surface
      ? focusableIn(surface).find(
          (el) =>
            !el.matches("input, textarea, [contenteditable]") && !el.closest("[data-part=sheet-header]"),
        )
      : undefined) ??
    surface
  return (
    <DrawerRoot
      open={props.open}
      side="bottom"
      snapPoints={snaps()}
      defaultSnapPoint={props.initialDetent === "large" ? snaps()[snaps().length - 1] : snaps()[0]}
      dismissible={props.dismissible !== false}
      onOpenChange={(next) => {
        if (!next) props.onClose()
      }}
    >
      <DrawerBackdrop class="nc-sheet-scrim" data-part="sheet-scrim" />
      <DrawerContent
        ref={(el: HTMLDivElement) => {
          surface = el
        }}
        initialFocus={firstFocus}
        aria-label={props.title ? undefined : props.label}
        data-part="sheet"
        class={cx("nc-sheet", props.class)}
      >
        <OpenLayer />
        <div class="nc-sheet__header" data-part="sheet-header">
          <Show
            when={snaps().length > 1}
            fallback={<span class="nc-sheet__grab" data-part="sheet-grab" aria-hidden="true" />}
          >
            <DrawerHandle
              class="nc-sheet__grab nc-sheet__grab--handle"
              data-part="sheet-grab"
              aria-label="Resize"
            />
          </Show>
          <Show when={props.title || props.action}>
            <div class="nc-sheet__titlebar">
              <DrawerTitle class="nc-sheet__title">{props.title}</DrawerTitle>
              <Show
                when={props.action}
                fallback={
                  <DrawerClose
                    render={(close: Record<string, unknown>) => (
                      <IconButton
                        label="Close"
                        icon="close"
                        tooltip={false}
                        class="nc-sheet__close"
                        data-part="sheet-close"
                        {...close}
                      />
                    )}
                  />
                }
              >
                <span class="nc-sheet__action">{props.action}</span>
              </Show>
            </div>
          </Show>
        </div>
        <div class={cx("nc-sheet__body", props.flush && "nc-sheet__body--flush")} data-part="sheet-body">
          <div class="nc-sheet__content">{props.children}</div>
        </div>
        <Show when={props.footer}>
          <div class="nc-sheet__footer" data-part="sheet-footer">
            {props.footer}
          </div>
        </Show>
      </DrawerContent>
    </DrawerRoot>
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
