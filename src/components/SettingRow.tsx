import type { JSX } from "@solidjs/web"
import { createUniqueId, omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import { Icon } from "./Icon"

/** The ids a setting's control takes, so the row's title names it and its description describes it. */
export interface SettingControlIds {
  labelId: string
  descriptionId: string
}

export interface SettingRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The setting's name as a person reads it. */
  title: string
  /** What it changes, in a sentence, under the title. */
  description?: JSX.Element
  /** Its key, in mono under the description, such as `rookery/timezone`. */
  name?: string
  /** A group within the section, before the title in text-3. */
  category?: string
  /**
   * The value is set at the scope shown. The row draws a "Modified" chip, and with `onReset` the chip resets
   * the value to the one the scope inherits.
   */
  modified?: boolean
  /** Reset the value at the scope shown. */
  onReset?: () => void
  /** Where the value shown comes from when it is not set here, such as "From Server". */
  inherited?: string
  /** The value is fixed and no scope can change it. Draws a lock and "Fixed". */
  locked?: boolean
  /** The control: a `Switch`, `Select`, `NumberField` or `TextField` without a label of its own. */
  control: JSX.Element | ((ids: SettingControlIds) => JSX.Element)
  /** Dims the text: the setting is not set at the scope shown, and cannot be. */
  muted?: boolean
  class?: string
}

/**
 * One setting as a row of a settings page: its title and description at the left, its control at the right,
 * and whether it is changed at the scope shown. A change applies at once, so the row has no save button.
 */
export function SettingRow(props: SettingRowProps): JSX.Element {
  const id = createUniqueId()
  const ids: SettingControlIds = { labelId: `${id}-label`, descriptionId: `${id}-description` }
  const rest = omit(
    props,
    "title",
    "description",
    "name",
    "category",
    "modified",
    "onReset",
    "inherited",
    "locked",
    "control",
    "muted",
    "class",
  )
  const control = (): JSX.Element => {
    const given = props.control
    return typeof given === "function" ? given(ids) : given
  }
  return (
    <div
      {...rest}
      data-part="setting-row"
      class={cx("nc-setting", props.class)}
      data-modified={props.modified ? "" : undefined}
      data-locked={props.locked ? "" : undefined}
      data-muted={props.muted ? "" : undefined}
    >
      <div class="nc-setting__text">
        <div class="nc-setting__head">
          <Show when={props.category}>
            <span class="nc-setting__category">{props.category}</span>
          </Show>
          <span id={ids.labelId} class="nc-setting__title">
            {props.title}
          </span>
          <Show when={props.modified}>
            <Show
              when={props.onReset}
              fallback={
                <span class="nc-setting__chip" data-part="setting-modified">
                  Modified
                </span>
              }
            >
              {(reset) => (
                <button
                  type="button"
                  class="nc-setting__chip nc-setting__chip--reset"
                  data-part="setting-reset"
                  aria-label={`Modified. Reset ${props.title}`}
                  title="Reset to the inherited value"
                  onClick={() => reset()()}
                >
                  <Icon name="close" size="sm" />
                  Modified
                </button>
              )}
            </Show>
          </Show>
          <Show when={!props.modified && props.inherited}>
            <span class="nc-setting__inherited">{props.inherited}</span>
          </Show>
          <Show when={props.locked}>
            <span class="nc-setting__chip" data-part="setting-locked">
              <Icon name="lock" size="sm" />
              Fixed
            </span>
          </Show>
        </div>
        <Show when={props.description}>
          <p id={ids.descriptionId} class="nc-setting__description">
            {props.description}
          </p>
        </Show>
        <Show when={props.name}>
          <span class="nc-setting__name">{props.name}</span>
        </Show>
      </div>
      <div class="nc-setting__control">{control()}</div>
    </div>
  )
}
