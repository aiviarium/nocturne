import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, For, omit, onCleanup, Show } from "solid-js"
import { cx } from "../lib/cx"
import { applyErrors, type CodeToken, highlight } from "../lib/highlight"
import { Button } from "./Button"

export interface CodeBlockProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title" | "onCopy"> {
  /** The source text. */
  code: string
  /** Language for syntax colours: ts, js, tsx, rust, py, sh, go, json, css. Anything else is plain. */
  language?: string
  /** File name or language shown in the bar, in mono text-3. Defaults to `language`. */
  title?: string
  /** Number of the first line. Default 1. */
  startLine?: number
  /** Show line numbers. Default true. */
  lineNumbers?: boolean
  /** The current line (by displayed number), on bg-2. */
  currentLine?: number
  /** Diagnostics drawn as a wavy danger underline. `line` is the displayed number; columns are 0-based. */
  errors?: Array<{ line: number; from: number; to: number }>
  /** Show the Copy button. Default true. */
  copyable?: boolean
  /** Called after copying, with the text. The component copies with the Clipboard API when it exists. */
  onCopy?: (code: string) => void
  /** Shows an Apply button (secondary) and calls this with the code. */
  onApply?: (code: string) => void
  /** Hide the bar entirely. */
  bare?: boolean
}

/** Code with line numbers and syntax colours from the `syn-*` tokens. */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const rest = omit(
    props,
    "code",
    "language",
    "title",
    "startLine",
    "lineNumbers",
    "currentLine",
    "errors",
    "copyable",
    "onCopy",
    "onApply",
    "bare",
    "class",
  )
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))
  const first = () => props.startLine ?? 1
  const lines = createMemo(() => {
    const tokens = highlight(props.code.replace(/\n$/, ""), props.language)
    const errors = (props.errors ?? []).map((e) => ({ ...e, line: e.line - first() }))
    return errors.length ? applyErrors(tokens, errors) : tokens
  })
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(props.code)
    } catch {
      /* clipboard may be unavailable; the callback still fires */
    }
    props.onCopy?.(props.code)
    setCopied(true)
    clearTimeout(timer)
    timer = setTimeout(() => setCopied(false), 1500)
  }
  const kindClass = (t: CodeToken) => (t.kind ? `syn-${t.kind}` : undefined)
  return (
    <div
      data-part="code-block"
      data-language={props.language}
      class={cx("nc-codeblock", props.class)}
      {...rest}
    >
      <Show when={!props.bare}>
        <div class="nc-codeblock__bar">
          <span>{props.title ?? props.language}</span>
          <span class="nc-row nc-row--tight">
            <Show when={props.copyable !== false}>
              <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
                {copied() ? "Copied" : "Copy"}
              </Button>
            </Show>
            <Show when={props.onApply}>
              <Button variant="secondary" size="sm" onClick={() => props.onApply?.(props.code)}>
                Apply
              </Button>
            </Show>
          </span>
        </div>
      </Show>
      <pre
        class={cx("nc-code", props.lineNumbers === false && "nc-code--plain")}
        tabindex="0"
        aria-label={props.title ?? "Code"}
      >
        <For each={lines()}>
          {(tokens, index) => (
            <span
              class={cx("nc-code__line", props.currentLine === first() + index() && "nc-code__line--current")}
            >
              <Show when={props.lineNumbers !== false}>
                <span class="nc-code__num" aria-hidden="true">
                  {first() + index()}
                </span>
              </Show>
              <span class="nc-code__text">
                <For each={tokens}>
                  {(token) => (
                    <span class={cx(kindClass(token), token.error && "syn-err")}>{token.text}</span>
                  )}
                </For>
              </span>
            </span>
          )}
        </For>
      </pre>
    </div>
  )
}
