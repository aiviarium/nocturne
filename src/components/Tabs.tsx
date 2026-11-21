import type { JSX } from "@solidjs/web"
import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/solid/segmented-control"
import { TabsList, TabsPanel, Tabs as TabsRoot, TabsTab } from "@ui-sdk/solid/tabs"
import { createContext, For, Show, useContext } from "solid-js"
import { cx } from "../lib/cx"
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
  /**
   * `segmented` switches the view of the same data, as a segmented control (one choice of a few, like a radio
   * group); `underline` moves between sections, as tabs with panels. Default `segmented`.
   */
  variant?: "segmented" | "underline"
  /** Accessible name of the tab list. */
  label: string
  /** @deprecated ui-sdk links the tabs to their panels; put the `TabPanel`s inside `Tabs` instead. */
  idPrefix?: string
  class?: string
  /** The `TabPanel`s of underline tabs, which ui-sdk links to their tabs. */
  children?: JSX.Element
}

const InTabs = createContext(false)

/**
 * A row of choices with roving focus: arrow keys, Home and End move and select. Segmented tabs are ui-sdk's
 * SegmentedControl; underline tabs are its Tabs, with their panels as children.
 */
export function Tabs(props: TabsProps): JSX.Element {
  const label = (item: TabItem, underline: boolean) => (
    <>
      <Show when={item.icon}>
        <Icon name={item.icon} size="sm" />
      </Show>
      {item.label}
      <Show when={underline && item.count !== undefined && item.count !== 0 && item.count !== "0"}>
        <span class="nc-tab__count">{item.count}</span>
      </Show>
    </>
  )
  return (
    <Show
      when={props.variant === "underline"}
      fallback={
        <SegmentedControl
          data-part="tabs"
          data-variant="segmented"
          aria-label={props.label}
          value={props.value}
          defaultValue={
            props.value === undefined
              ? (props.defaultValue ?? props.items.find((i) => !i.disabled)?.id)
              : undefined
          }
          onValueChange={(next: string | null) => {
            if (next !== null) props.onChange?.(next)
          }}
          loop
          class={cx("nc-seg", props.class)}
        >
          <For each={props.items}>
            {(item) => (
              <SegmentedControlItem value={item.id} disabled={item.disabled} class="nc-seg__item">
                {label(item, false)}
              </SegmentedControlItem>
            )}
          </For>
        </SegmentedControl>
      }
    >
      <TabsRoot
        value={props.value}
        defaultValue={props.value === undefined ? props.defaultValue : undefined}
        onValueChange={(next: string | null) => {
          if (next !== null) props.onChange?.(next)
        }}
        loop
      >
        <TabsList
          data-part="tabs"
          data-variant="underline"
          aria-label={props.label}
          class={cx("nc-tabs", props.class)}
        >
          <For each={props.items}>
            {(item) => (
              <TabsTab value={item.id} disabled={item.disabled} class="nc-tab">
                {label(item, true)}
              </TabsTab>
            )}
          </For>
        </TabsList>
        <InTabs value={true}>{props.children}</InTabs>
      </TabsRoot>
    </Show>
  )
}

export interface TabPanelProps {
  /** @deprecated Only for a panel outside `Tabs`, which nothing links to its tab. */
  idPrefix?: string
  /** The tab id this panel belongs to. */
  id: string
  /** Only for a panel outside `Tabs`: the selected tab id. Inside `Tabs` the tabs say which panel shows. */
  value?: string
  children: JSX.Element
  class?: string
}

/** The content for one tab, labelled by it and hidden while another tab is selected. */
export function TabPanel(props: TabPanelProps): JSX.Element {
  const inside = useContext(InTabs)
  return (
    <Show
      when={inside}
      fallback={
        <div data-part="tab-panel" role="tabpanel" hidden={props.value !== props.id} class={props.class}>
          {props.value === props.id ? props.children : null}
        </div>
      }
    >
      <TabsPanel value={props.id} data-part="tab-panel" class={props.class}>
        {props.children}
      </TabsPanel>
    </Show>
  )
}
