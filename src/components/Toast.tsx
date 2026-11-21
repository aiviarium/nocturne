import type { JSX } from "@solidjs/web"
import {
  createToaster,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion as ToastRegionRoot,
  Toast as ToastRoot,
  ToastTitle,
  type ToastType,
} from "@ui-sdk/solid/toast"
import { Show } from "solid-js"
import { Icon } from "./Icon"
import { type DotStatus, StatusDot } from "./StatusDot"

export type ToastTone = "neutral" | "success" | "warning" | "danger" | "info"

export interface ToastOptions {
  /** One line that says what happened. */
  title: string
  /** An optional second line: the fix, or the detail. */
  description?: string
  /** Default `neutral`. Danger toasts are announced assertively. */
  tone?: ToastTone
  /** Milliseconds before it goes away. 0 keeps it until dismissed. Default 5000. */
  duration?: number
  /** An action such as Undo or Retry. */
  action?: { label: string; onClick: () => void }
}

export interface ToastItem extends ToastOptions {
  id: number
}

// One queue for the app; ui-sdk's toaster times, stacks, pauses on hover and focus, and announces them.
const toaster = createToaster()
let nextId = 1

const TYPE: Record<ToastTone, ToastType> = {
  neutral: "default",
  success: "success",
  warning: "warning",
  danger: "error",
  info: "info",
}

const DOT: Record<ToastTone, DotStatus> = {
  neutral: "neutral",
  success: "ok",
  warning: "warn",
  danger: "error",
  info: "ai",
}

const toneOf = (type: string | undefined): ToastTone =>
  (Object.keys(TYPE) as ToastTone[]).find((t) => TYPE[t] === type) ?? "neutral"

/** Show a toast. Returns its id for `dismissToast`. */
export function toast(options: ToastOptions): number {
  const id = nextId++
  const tone = options.tone ?? "neutral"
  toaster(options.title, {
    id: String(id),
    description: options.description,
    type: TYPE[tone],
    priority: tone === "danger" ? "assertive" : "polite",
    duration: options.duration === 0 ? Number.POSITIVE_INFINITY : (options.duration ?? 5000),
    action: options.action
      ? { label: options.action.label, onAction: () => options.action?.onClick() }
      : undefined,
  })
  return id
}

/** Remove a toast. */
export function dismissToast(id: number): void {
  toaster.dismiss(String(id))
}

/** Remove every toast. */
export function clearToasts(): void {
  toaster.dismiss()
}

/** Where toasts appear: bottom right, stacked. Mount once near the app root. */
export function ToastRegion(_props: {
  /** @deprecated The region renders in the top layer where it sits, and keeps that place's theme. */
  anchor?: HTMLElement
}): JSX.Element {
  return (
    <ToastRegionRoot
      toaster={toaster}
      side="bottom"
      align="end"
      data-part="toast-region"
      aria-label="Notifications"
      class="nc-toast-region"
    >
      {(item) => (
        <ToastRoot data-part="toast" data-tone={toneOf(item.type)} class="nc-toast">
          <StatusDot status={DOT[toneOf(item.type)]} />
          <span class="nc-toast__text">
            <ToastTitle class="nc-toast__title" />
            <Show when={item.description}>
              <ToastDescription class="nc-toast__desc nc-meta" />
            </Show>
          </span>
          <Show when={item.action}>
            <ToastAction class="nc-btn nc-btn--ghost nc-btn--sm" />
          </Show>
          <ToastClose class="nc-icon-btn" aria-label="Dismiss">
            <Icon name="close" />
          </ToastClose>
        </ToastRoot>
      )}
    </ToastRegionRoot>
  )
}
