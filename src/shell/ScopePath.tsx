// The title bar's path: the scopes from the workspace down to the one the window shows, at the drill size with "/"
// between them. The workspace (the first segment) and the scope the window shows (the last) read in --text-1; the
// segments between go up and are quiet --text-3 text. Only colour tells them apart: size and weight stay. A segment
// with a switcher has a caret that opens it. The title bar decides how many leading segments fold into "…".
import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, For, Show } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { DropdownMenu } from "../components/Menu"
import { cx } from "../lib/cx"
import { EntryLead, Switcher, type SwitcherEntry, type SwitcherSection } from "./Switcher"
import type { ShellMark } from "./types"

export interface ScopeSegment {
  /** Stable across renders: the title bar measures by it. */
  id: string
  label: string
  /** Drawn before the label: a scope's mark, such as a project's. The workspace and the modules have none. */
  mark?: ShellMark
  icon?: IconName
  /** Goes to this scope. Without it, a press on the label opens the switcher. */
  onClick?: () => void
  /** Siblings to switch to, in the filter format ("Switch project…"); the current one checked. */
  switcher?: {
    noun: string
    sections: SwitcherSection[]
    onPick: (entry: SwitcherEntry) => void
    wide?: boolean
  }
}

export interface ScopePathProps {
  segments: ScopeSegment[]
  /** How many leading segments fold into one "…" menu. The last never folds. Default 0. */
  fold?: number
  /** Names the path for a screen reader. Default "Path". */
  label?: string
  ref?: (el: HTMLElement) => void
  class?: string
}

/** The scopes as a path of segments, each going up or opening its switcher. */
export function ScopePath(props: ScopePathProps): JSX.Element {
  const folded = createMemo(() => Math.max(0, Math.min(props.fold ?? 0, props.segments.length - 1)))
  const hidden = createMemo(() => props.segments.slice(0, folded()))
  const shown = createMemo(() => props.segments.slice(folded()))
  const lastId = () => props.segments[props.segments.length - 1]?.id
  return (
    <nav
      ref={(el) => props.ref?.(el)}
      data-part="scope-path"
      data-folded={folded() || undefined}
      aria-label={props.label ?? "Path"}
      class={cx("nc-scope-path", props.class)}
    >
      <Show when={hidden().length}>
        <div class="nc-scope-path__seg" data-fold="">
          <DropdownMenu
            label="Folded path"
            matchWidth={false}
            minWidth="200px"
            items={hidden().map((s) => ({
              id: s.id,
              label: s.label,
              leading: s.mark || s.icon ? <EntryLead mark={s.mark} icon={s.icon} /> : undefined,
            }))}
            onSelect={(id) =>
              hidden()
                .find((s) => s.id === id)
                ?.onClick?.()
            }
            trigger={(t) => (
              <button {...t} type="button" class="nc-scope-path__fold" aria-label="Show the folded path">
                <Icon name="more" size="sm" />
              </button>
            )}
          />
        </div>
      </Show>
      <For each={shown()} keyed={(s) => s.id}>
        {(seg, i) => (
          <SegmentView
            seg={seg()}
            sep={i() > 0 || hidden().length > 0}
            first={i() === 0 && hidden().length === 0}
            last={seg().id === lastId()}
          />
        )}
      </For>
    </nav>
  )
}

function SegmentView(props: { seg: ScopeSegment; sep: boolean; first: boolean; last: boolean }): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const s = () => props.seg
  const label = (onClick: () => void) => (
    <button
      type="button"
      class="nc-scope-path__label"
      aria-current={props.last ? "page" : undefined}
      onClick={onClick}
    >
      <Show when={s().mark || s().icon}>
        <EntryLead mark={s().mark} icon={s().icon} />
      </Show>
      <span class="nc-scope-path__text">{s().label}</span>
    </button>
  )
  return (
    <div
      class="nc-scope-path__seg"
      data-seg={s().id}
      data-last={props.last ? "" : undefined}
      data-strong={props.last || props.first ? "" : undefined}
      data-open={open() ? "" : undefined}
    >
      <Show when={props.sep}>
        <span class="nc-scope-path__sep" aria-hidden="true">
          /
        </span>
      </Show>
      <Show
        when={s().switcher}
        fallback={<div class="nc-scope-path__pill">{label(() => s().onClick?.())}</div>}
      >
        {(sw) => (
          <Switcher
            noun={sw().noun}
            sections={sw().sections}
            onPick={(e) => sw().onPick(e)}
            wide={sw().wide}
            open={open()}
            onOpenChange={setOpen}
            trigger={(t) => (
              <div class="nc-scope-path__pill" ref={t.ref}>
                {label(() => (s().onClick ? s().onClick!() : t.onClick()))}
                <button
                  type="button"
                  class="nc-scope-path__caret"
                  data-part={t["data-part"]}
                  aria-haspopup={t["aria-haspopup"]}
                  aria-expanded={t["aria-expanded"]}
                  aria-label={`Switch ${sw().noun}`}
                  onClick={() => t.onClick()}
                >
                  <Icon name="chevron-down" size="sm" />
                </button>
              </div>
            )}
          />
        )}
      </Show>
    </div>
  )
}
