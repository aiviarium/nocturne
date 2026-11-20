import type { JSX } from "@solidjs/web"
import { createMemo, For, Match, omit, Show, Switch } from "solid-js"
import { cx } from "../lib/cx"
import {
  countChanges,
  type DiffHunk,
  type DiffLine,
  diffStrings,
  parsePatch,
  type Segment,
  toSplitRows,
} from "../lib/diff"
import { Button } from "./Button"

export interface DiffViewProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The old text. Use with `after`. */
  before?: string
  /** The new text. Use with `before`. */
  after?: string
  /** A unified patch, instead of `before` and `after`. The first file is shown. */
  patch?: string
  /** `unified` is one column; `split` puts old on the left and new on the right. Default `unified`. */
  mode?: "unified" | "split"
  /** File path shown in the header, in mono. Defaults to the path from the patch. */
  path?: string
  /** Unchanged lines kept around each change when diffing strings. Default 3. */
  context?: number
  /** Shows Accept (primary) and calls this. */
  onAccept?: () => void
  /** Shows Reject (secondary) and calls this. */
  onReject?: () => void
  /** Hide the header with the path, counts and buttons. */
  bare?: boolean
}

/** A unified or split diff with word-level changes and optional accept and reject controls. */
export function DiffView(props: DiffViewProps): JSX.Element {
  const rest = omit(
    props,
    "before",
    "after",
    "patch",
    "mode",
    "path",
    "context",
    "onAccept",
    "onReject",
    "bare",
    "class",
  )
  const model = createMemo<{ path?: string; hunks: DiffHunk[] }>(() => {
    if (props.patch !== undefined) {
      const file = parsePatch(props.patch)[0]
      return {
        path: file ? (file.newPath && file.newPath !== "/dev/null" ? file.newPath : file.oldPath) : undefined,
        hunks: file?.hunks ?? [],
      }
    }
    return { hunks: diffStrings(props.before ?? "", props.after ?? "", { context: props.context }) }
  })
  const totals = createMemo(() => countChanges(model().hunks))
  const split = () => props.mode === "split"
  return (
    <div
      data-part="diff-view"
      data-mode={split() ? "split" : "unified"}
      class={cx("nc-card nc-diffview", props.class)}
      {...rest}
    >
      <Show when={!props.bare}>
        <div class="nc-panel-header">
          <span class="nc-mono nc-diffview__path">{props.path ?? model().path ?? "Changes"}</span>
          <span class="nc-mono nc-diffview__count nc-diffview__count--add">+{totals().added}</span>
          <span class="nc-mono nc-diffview__count nc-diffview__count--del">−{totals().removed}</span>
          <Show when={props.onAccept || props.onReject}>
            <span class="nc-row nc-panel-header__actions">
              <Show when={props.onReject}>
                <Button size="sm" onClick={() => props.onReject?.()}>
                  Reject
                </Button>
              </Show>
              <Show when={props.onAccept}>
                <Button size="sm" variant="primary" onClick={() => props.onAccept?.()}>
                  Accept
                </Button>
              </Show>
            </span>
          </Show>
        </div>
      </Show>
      <div class="nc-diffview__scroll">
        <div
          class={cx("nc-diff", !split() && "nc-diff--unified")}
          role="table"
          aria-label={`Diff of ${props.path ?? model().path ?? "changes"}`}
        >
          <Show when={model().hunks.length === 0}>
            <div class="nc-diff__hunk nc-diff__hunk--none">No changes</div>
          </Show>
          <For each={model().hunks}>
            {(hunk, index) => (
              <>
                <Show when={index() > 0}>
                  <div class="nc-diff__fold" role="row">
                    {foldLabel(model().hunks[index() - 1] as DiffHunk, hunk)}
                  </div>
                </Show>
                <div class="nc-diff__hunk" role="row">
                  {hunk.header}
                </div>
                <Switch>
                  <Match when={split()}>
                    <For each={toSplitRows(hunk.lines)}>
                      {(row) => (
                        <>
                          <Line line={row.left} side="old" />
                          <Line line={row.right} side="new" />
                        </>
                      )}
                    </For>
                  </Match>
                  <Match when={!split()}>
                    <For each={hunk.lines}>
                      {(line) => <Line line={line} side={line.kind === "del" ? "old" : "new"} />}
                    </For>
                  </Match>
                </Switch>
              </>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

function foldLabel(prev: DiffHunk, next: DiffHunk): string {
  const last = [...prev.lines].reverse().find((l) => l.oldNo)?.oldNo ?? 0
  const first = next.lines.find((l) => l.oldNo)?.oldNo ?? last
  const n = Math.max(0, first - last - 1)
  return `${n} unchanged line${n === 1 ? "" : "s"}`
}

function Line(props: { line?: DiffLine; side: "old" | "new" }): JSX.Element {
  return (
    <Show
      when={props.line}
      fallback={
        <div class="nc-diff__line nc-diff__line--empty" role="row" aria-hidden="true">
          <span class="nc-diff__num" />
          <span class="nc-diff__sign" />
        </div>
      }
    >
      {(line) => (
        <div
          class={cx(
            "nc-diff__line",
            line().kind === "add" && "nc-diff__line--add",
            line().kind === "del" && "nc-diff__line--del",
          )}
          role="row"
          data-kind={line().kind}
        >
          <span class="nc-diff__num" role="cell">
            {props.side === "old" ? (line().oldNo ?? line().newNo) : (line().newNo ?? line().oldNo)}
          </span>
          <span
            class="nc-diff__sign"
            role="cell"
            aria-label={line().kind === "add" ? "added" : line().kind === "del" ? "removed" : undefined}
          >
            {line().kind === "add" ? "+" : line().kind === "del" ? "−" : ""}
          </span>
          <span class="nc-diff__text" role="cell">
            <Show when={line().segments} fallback={line().text || " "}>
              <For each={line().segments}>{(seg) => <Words seg={seg} kind={line().kind} />}</For>
            </Show>
          </span>
        </div>
      )}
    </Show>
  )
}

function Words(props: { seg: Segment; kind: DiffLine["kind"] }): JSX.Element {
  return (
    <Show when={props.seg.changed} fallback={props.seg.text}>
      {props.kind === "del" ? <del>{props.seg.text}</del> : <ins>{props.seg.text}</ins>}
    </Show>
  )
}
