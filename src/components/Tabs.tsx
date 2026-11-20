import type { JSX } from "@solidjs/web"
import { For, Show, untrack } from "solid-js"
import { aria } from "../lib/aria"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { Icon, type IconName } from "./Icon"

export interface TabItem {
  /** Stable id, passed to `onChange`. */
  id: string
  /** Visible text. */
  label: string
  /** A count after the label, in text-3. Underline tabs only; a zero count is not shown. */
  count?: number | string
  /** A core icon before the label. */
  icon?: IconName
  /** Greys the tab out and skips it. */
  disabled?: boolean
}

export interface TabsProps {
  /** The tabs, in order. Keep segmented to two to five short labels. */
  items: TabItem[]
  /** The selected tab id. Controlled when set. */
  value?: string
  /** Initially selected tab id when uncontrolled. Defaults to the first tab. */
  defaultValue?: string
  /** Called with the id of the tab the person chose. */
  onChange?: (id: string) => void
  /** `segmented` switches the view of the same data; `underline` moves between sections. Default `segmented`. */
  variant?: "segmented" | "underline"
  /** Accessible name of the tab list. */
  label: string
  /** Prefix for generated ids; pass the same value to `TabPanel`. */
  idPrefix?: string
  class?: string
}

/** Tabs with roving focus: arrow keys, Home and End move and select. */
export function Tabs(props: TabsProps): JSX.Element {
  const prefix = props.idPrefix ?? createId("tabs")
  const [value, setValue] = createControllable<string>({
    value: () => props.value,
    defaultValue: untrack(() => props.defaultValue ?? props.items.find((i) => !i.disabled)?.id ?? ""),
    onChange: (v) => props.onChange?.(v),
  })
  const buttons = new Map<string, HTMLButtonElement>()
  const underline = () => props.variant === "underline"
  const go = (index: number) => {
    const item = props.items[index]
    if (!item) return
    setValue(item.id)
    buttons.get(item.id)?.focus()
  }
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const enabled = props.items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0)
    const at = enabled.indexOf(index)
    let target: number | undefined
    if (event.key === "ArrowRight") target = enabled[(at + 1) % enabled.length]
    else if (event.key === "ArrowLeft") target = enabled[(at - 1 + enabled.length) % enabled.length]
    else if (event.key === "Home") target = enabled[0]
    else if (event.key === "End") target = enabled[enabled.length - 1]
    if (target !== undefined) {
      event.preventDefault()
      go(target)
    }
  }
  return (
    <div
      data-part="tabs"
      data-variant={underline() ? "underline" : "segmented"}
      role="tablist"
      aria-label={props.label}
      class={cx(underline() ? "nc-tabs" : "nc-seg", props.class)}
    >
      <For each={props.items}>
        {(item, index) => (
          <button
            ref={(el) => buttons.set(item.id, el)}
            type="button"
            role="tab"
            id={tabId(prefix, item.id)}
            aria-controls={panelId(prefix, item.id)}
            aria-selected={aria(value() === item.id)}
            tabindex={value() === item.id ? 0 : -1}
            disabled={item.disabled}
            class={underline() ? "nc-tab" : "nc-seg__item"}
            onClick={() => setValue(item.id)}
            onKeyDown={(e) => onKeyDown(e, index())}
          >
            <Show when={item.icon}>
              <Icon name={item.icon} size="sm" />
            </Show>
            {item.label}
            <Show when={item.count !== undefined && item.count !== 0 && item.count !== "0" && underline()}>
              <span class="nc-tab__count">{item.count}</span>
            </Show>
          </button>
        )}
      </For>
    </div>
  )
}

const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`

export interface TabPanelProps {
  /** The `idPrefix` given to `Tabs`. */
  idPrefix: string
  /** The tab id this panel belongs to. */
  id: string
  /** The currently selected tab id. The panel is hidden unless it matches `id`. */
  value: string
  children: JSX.Element
  class?: string
}

/** The content for one tab, labelled by it and hidden while another tab is selected. */
export function TabPanel(props: TabPanelProps): JSX.Element {
  return (
    <div
      data-part="tab-panel"
      role="tabpanel"
      id={panelId(props.idPrefix, props.id)}
      aria-labelledby={tabId(props.idPrefix, props.id)}
      hidden={props.value !== props.id}
      class={props.class}
    >
      {props.value === props.id ? props.children : null}
    </div>
  )
}
