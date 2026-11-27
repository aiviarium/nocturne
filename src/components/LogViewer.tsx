import type { JSX } from "@solidjs/web"
import { createEffect, createSignal, For, omit, onCleanup, Show } from "solid-js"
import { aria } from "../lib/aria"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { Button } from "./Button"
import { StreamState, type StreamStatus } from "./StreamState"

export type LogLevel = "debug" | "info" | "warn" | "error" | "state"

export interface LogEntry {
  /** Stable identifier for the line (for example a stream sequence number). */
  id?: string | number
  /** Line content. May span multiple lines. */
  text: string
  /** Optional ISO timestamp or pre-formatted time label. */
  at?: string
  /** Severity or stream-event level. Default `info`. */
  level?: LogLevel
}

export interface LogViewerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "onCopy"> {
  /** Log entries in chronological order. */
  entries: readonly LogEntry[]
  /** Header title. Default `"Output"`. */
  title?: JSX.Element
  /** Optional stream status shown beside the title. */
  streamState?: StreamStatus
  /** Resuming cursor or offset passed to `StreamState`. */
  streamOffset?: number | string
  /** Error code or reason passed to `StreamState`. */
  streamCode?: string
  /** Custom metadata text passed to `StreamState`. */
  streamMeta?: string
  /** Extra right-aligned actions in the header. */
  actions?: JSX.Element
  /** Auto-scroll to the newest line while the viewer stays at the bottom. Default `true`. */
  follow?: boolean
  /** Wrap long lines instead of horizontal scrolling. Controlled when set. */
  wrap?: boolean
  /** Initial wrap state when uncontrolled. Default `false`. */
  defaultWrap?: boolean
  /** Called when the wrap toggle changes. */
  onWrapChange?: (wrap: boolean) => void
  /** Show entry timestamps when `at` is present. Default `false`. */
  showTimestamps?: boolean
  /** Show a Copy button in the header. Default `true`. */
  copyable?: boolean
  /** Called after copying the full plain-text log. */
  onCopy?: (text: string) => void
  /** Placeholder shown when `entries` is empty. Default `"No output yet."`. */
  empty?: JSX.Element
  /** Optional CSS max-height on the scroll body when `fill` is false. */
  maxHeight?: string
  /** Fill the parent container and scroll inside the log body. */
  fill?: boolean
  /** Omit the surrounding card edge and header. */
  bare?: boolean
  /** Accessible name for the log region. Default `"Log output"`. */
  label?: string
}

function formatLogTime(at: string): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return at
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

/**
 * A scrollable monospace log viewer for live and completed job or service streams.
 * Sticks to the bottom while following new entries, pauses auto-scroll when the reader
 * scrolls up, and offers a one-click jump back to the latest line.
 */
export function LogViewer(props: LogViewerProps): JSX.Element {
  const rest = omit(
    props,
    "entries",
    "title",
    "streamState",
    "streamOffset",
    "streamCode",
    "streamMeta",
    "actions",
    "follow",
    "wrap",
    "defaultWrap",
    "onWrapChange",
    "showTimestamps",
    "copyable",
    "onCopy",
    "empty",
    "maxHeight",
    "fill",
    "bare",
    "label",
    "class",
  )

  const [wrap, setWrap] = createControllable<boolean>({
    value: () => props.wrap,
    defaultValue: props.defaultWrap ?? false,
    onChange: (next) => props.onWrapChange?.(next),
  })

  const [following, setFollowing] = createSignal(props.follow !== false)
  const [copied, setCopied] = createSignal(false)
  let bodyEl: HTMLDivElement | undefined
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(copyTimer))

  createEffect(
    () => props.follow !== false,
    (follow) => {
      setFollowing(follow)
    },
  )

  createEffect(
    () => [props.entries.length, following()] as const,
    ([count, follow]) => {
      if (count === 0 || !follow || !bodyEl) return
      bodyEl.scrollTop = bodyEl.scrollHeight
    },
  )

  const onScroll = () => {
    if (!bodyEl || props.follow === false) return
    const distance = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight
    const nearBottom = distance <= 24
    if (nearBottom !== following()) setFollowing(nearBottom)
  }

  const jumpToBottom = () => {
    setFollowing(true)
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight
  }

  const copy = async () => {
    const text = props.entries.map((entry) => entry.text).join("\n")
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      /* clipboard may be unavailable; the callback still fires */
    }
    props.onCopy?.(text)
    setCopied(true)
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => setCopied(false), 1500)
  }

  const showJump = () => props.follow !== false && !following() && props.entries.length > 0

  return (
    <section
      data-part="log-viewer"
      data-following={following() ? "" : undefined}
      data-wrap={wrap() ? "" : undefined}
      data-fill={props.fill ? "" : undefined}
      class={cx("nc-log", !props.bare && "nc-card", props.fill && "nc-log--fill", props.class)}
      {...rest}
    >
      <Show when={!props.bare}>
        <header class="nc-panel-header nc-log__header" data-part="log-header">
          <h2 class="nc-panel-title">{props.title ?? "Output"}</h2>
          <Show when={props.streamState}>
            {(state) => (
              <StreamState
                state={state()}
                offset={props.streamOffset}
                code={props.streamCode}
                meta={props.streamMeta}
              />
            )}
          </Show>
          <span class="nc-panel-header__actions">
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={aria(wrap())}
              data-part="log-wrap"
              onClick={() => setWrap(!wrap())}
            >
              {wrap() ? "No wrap" : "Wrap"}
            </Button>
            <Show when={props.copyable !== false}>
              <Button
                size="sm"
                variant="ghost"
                disabled={props.entries.length === 0}
                aria-live="polite"
                data-part="log-copy"
                onClick={copy}
              >
                {copied() ? "Copied" : "Copy"}
              </Button>
            </Show>
            {props.actions}
          </span>
        </header>
      </Show>

      <div class="nc-log__stage">
        <div
          ref={bodyEl}
          role="log"
          aria-live="off"
          aria-label={props.label ?? "Log output"}
          tabindex="0"
          data-part="log-body"
          class={cx("nc-terminal nc-log__body", wrap() && "nc-log__body--wrap")}
          style={!props.fill && props.maxHeight ? { "max-height": props.maxHeight } : undefined}
          onScroll={onScroll}
        >
          <Show
            when={props.entries.length > 0}
            fallback={
              <div class="nc-log__empty" data-part="log-empty">
                {props.empty ?? "No output yet."}
              </div>
            }
          >
            <For each={props.entries} keyed={(entry) => entry.id ?? entry}>
              {(entry) => (
                <div
                  class={cx("nc-log__line", entry().level && `nc-log__line--${entry().level}`)}
                  data-part="log-line"
                  data-level={entry().level ?? "info"}
                >
                  <Show when={props.showTimestamps && entry().at}>
                    {(at) => <span class="nc-log__time">{formatLogTime(at())}</span>}
                  </Show>
                  <span class="nc-log__text">{entry().text}</span>
                </div>
              )}
            </For>
          </Show>
        </div>

        <Show when={showJump()}>
          <Button
            size="sm"
            variant="secondary"
            class="nc-log__jump"
            data-part="log-jump"
            onClick={jumpToBottom}
          >
            Jump to bottom
          </Button>
        </Show>
      </div>
    </section>
  )
}
