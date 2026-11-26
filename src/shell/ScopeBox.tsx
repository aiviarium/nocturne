// The box on the title bar's centre: how the person is looking at the scope. With lenses it is a magnifier at its left
// end, then the lens switch; without, it is a search field ("Search Docs…  ⌘K"). The magnifier and the field open
// the command palette, which the title bar anchors to this box.
import type { JSX } from "@solidjs/web"
import { Show, untrack } from "solid-js"
import { Icon } from "../components/Icon"
import { Kbd } from "../components/Kbd"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import type { Appearance } from "./appearance"
import { LensSwitch, lensById } from "./LensSwitch"
import type { Lens, LensPrefs } from "./types"

export interface ScopeBoxProps {
  /** What the box searches, for its field and tooltip: "Search Atlas web…". */
  scope: string
  /** The scope's lenses. Empty or left out, the box is a search field. */
  lenses?: Lens[]
  /** The id of the lens that is on. */
  lens?: string
  onLensChange?: (id: string) => void
  lensPrefs?: LensPrefs
  onLensPrefsChange?: (prefs: LensPrefs) => void
  /** Opens the command palette: the magnifier and the field call it. */
  onSearch?: () => void
  /** The accent follows the lens that is on while this box lives (and the appearance's `followLens` is on). */
  appearance?: Appearance
  /** Icons only, for a narrow title bar. */
  compact?: boolean
  /** How many of the last lenses fold into the `+N` menu. */
  squeeze?: number
  /** Binds ⌘1…⌘9 for the lenses. Default true. */
  keys?: boolean
  ref?: (el: HTMLDivElement) => void
  class?: string
  style?: JSX.CSSProperties
}

/** The scope's lens switch behind a magnifier, or a search field when the scope has no lenses. */
export function ScopeBox(props: ScopeBoxProps): JSX.Element {
  const hasLenses = () => (props.lenses?.length ?? 0) > 0
  const appearance = untrack(() => props.appearance)
  appearance?.follow(() => lensById(props.lenses ?? [], props.lens)?.hue)
  const name = () => `Search ${props.scope}`
  return (
    <div
      ref={(el) => props.ref?.(el)}
      data-part="scope-box"
      data-mode={hasLenses() ? "lenses" : "find"}
      class={cx("nc-scope-box", props.class)}
      style={props.style}
    >
      <Show
        when={hasLenses()}
        fallback={
          <Tooltip content={name()} shortcut="⌘ K" placement="bottom" type="description">
            {(t) => (
              <button
                {...t}
                type="button"
                class="nc-scope-box__find"
                aria-label={name()}
                aria-keyshortcuts="Meta+K Control+K"
                onClick={() => props.onSearch?.()}
              >
                <Icon name="search" size="sm" />
                <span class="nc-scope-box__placeholder" data-label="">
                  {name()}…
                </span>
                <Show when={!props.compact}>
                  <Kbd keys="⌘K" class="nc-scope-box__kbd" />
                </Show>
              </button>
            )}
          </Tooltip>
        }
      >
        <Tooltip content={name()} shortcut="⌘ K" placement="bottom">
          {(t) => (
            <button
              {...t}
              type="button"
              class="nc-scope-box__search"
              aria-label={name()}
              aria-keyshortcuts="Meta+K Control+K"
              onClick={() => props.onSearch?.()}
            >
              <Icon name="search" size="sm" />
            </button>
          )}
        </Tooltip>
        <LensSwitch
          lenses={props.lenses ?? []}
          value={props.lens}
          onChange={(id) => props.onLensChange?.(id)}
          prefs={props.lensPrefs}
          onPrefsChange={props.onLensPrefsChange}
          compact={props.compact}
          squeeze={props.squeeze}
          keys={props.keys}
          label={`Lenses for ${props.scope}`}
        />
      </Show>
    </div>
  )
}
