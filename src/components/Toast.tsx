import type { JSX } from "@solidjs/web"
import { createSignal, For, onCleanup, Show } from "solid-js"
import { Overlay } from "../lib/overlay"
import { Button } from "./Button"
import { IconButton } from "./IconButton"
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

const [toasts, setToasts] = createSignal<ToastItem[]>([])
let nextId = 1

/** Show a toast. Returns its id for `dismissToast`. */
export function toast(options: ToastOptions): number {
  const id = nextId++
  setToasts((list) => [...list, { ...options, id }])
  return id
}

/** Remove a toast. */
export function dismissToast(id: number): void {
  setToasts((list) => list.filter((t) => t.id !== id))
}

/** Remove every toast. */
export function clearToasts(): void {
  setToasts([])
}

const DOT: Record<ToastTone, DotStatus> = {
  neutral: "neutral",
  success: "ok",
  warning: "warn",
  danger: "error",
  info: "ai",
}

function ToastView(props: { item: ToastItem }): JSX.Element {
  const duration = () => props.item.duration ?? 5000
  let timer: ReturnType<typeof setTimeout> | undefined
  const arm = () => {
    clearTimeout(timer)
    if (duration() > 0) timer = setTimeout(() => dismissToast(props.item.id), duration())
  }
  arm()
  onCleanup(() => clearTimeout(timer))
  return (
    <div
      data-part="toast"
      data-tone={props.item.tone ?? "neutral"}
      role={props.item.tone === "danger" ? "alert" : "status"}
      class="nc-toast"
      onPointerEnter={() => clearTimeout(timer)}
      onPointerLeave={arm}
    >
      <StatusDot status={DOT[props.item.tone ?? "neutral"]} />
      <span class="nc-toast__text">
        <span class="nc-toast__title">{props.item.title}</span>
        <Show when={props.item.description}>
          <span class="nc-toast__desc nc-meta">{props.item.description}</span>
        </Show>
      </span>
      <Show when={props.item.action}>
        {(action) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              action().onClick()
              dismissToast(props.item.id)
            }}
          >
            {action().label}
          </Button>
        )}
      </Show>
      <IconButton label="Dismiss" icon="close" tooltip={false} onClick={() => dismissToast(props.item.id)} />
    </div>
  )
}

/** Where toasts appear: bottom right, stacked. Mount once near the app root. */
export function ToastRegion(props: { anchor?: HTMLElement }): JSX.Element {
  return (
    <Overlay anchor={props.anchor}>
      <div
        data-part="toast-region"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        class="nc-toast-region"
      >
        <For each={toasts()}>{(item) => <ToastView item={item} />}</For>
      </div>
    </Overlay>
  )
}
