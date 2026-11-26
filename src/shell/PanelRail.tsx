// The rail at the window's right edge, 44px on the canvas: how panels are picked. The top group opens panels at the
// view's right, the bottom group under it. A panel whose content the view already shows (the shell's `covers`) has
// no button while that view is shown.
import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import { Icon, type IconName } from "../components/Icon"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import { type PanelSide, useShellFrame } from "./context"

export interface RailPanel {
  id: string
  label: string
  icon: IconName
  at: PanelSide
  /** Shown in the tooltip: "⌥ D". */
  shortcut?: string
}

export interface PanelRailProps {
  panels: RailPanel[]
  /** The open panel on each side. */
  open?: { right?: string; bottom?: string }
  /** Opens the panel, or closes it when it is the open one. */
  onToggle: (id: string) => void
  /** Ids to leave out, on top of the shell's `covers`. */
  covers?: readonly string[]
  class?: string
}

/** The panel rail: one icon button per panel, pressed while its panel is open. */
export function PanelRail(props: PanelRailProps): JSX.Element {
  const frame = useShellFrame()
  const hidden = (id: string) => !!props.covers?.includes(id) || !!frame?.covers().includes(id)
  const of = (at: PanelSide) => props.panels.filter((p) => p.at === at && !hidden(p.id))
  const button = (p: () => RailPanel) => {
    const on = () => props.open?.[p().at] === p().id
    return (
      <Tooltip content={p().label} shortcut={p().shortcut} placement="left">
        {(t) => (
          <button
            {...t}
            type="button"
            class="nc-panel-rail__btn"
            data-panel={p().id}
            aria-label={p().label}
            aria-pressed={on() ? "true" : "false"}
            onClick={() => props.onToggle(p().id)}
          >
            <Icon name={p().icon} />
          </button>
        )}
      </Tooltip>
    )
  }
  return (
    <aside data-part="panel-rail" aria-label="Panels" class={cx("nc-panel-rail", props.class)}>
      <div class="nc-panel-rail__group">
        <For each={of("right")} keyed={(p) => p.id}>
          {(p) => button(p)}
        </For>
      </div>
      <span class="nc-panel-rail__grow" />
      <Show when={of("bottom").length}>
        <div class="nc-panel-rail__group">
          <For each={of("bottom")} keyed={(p) => p.id}>
            {(p) => button(p)}
          </For>
        </div>
      </Show>
    </aside>
  )
}
