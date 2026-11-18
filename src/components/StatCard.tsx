import { type JSX, Show, splitProps } from "solid-js"
import { createTallBox } from "../lib/box"
import { cx } from "../lib/cx"

export interface StatCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** What is measured: "Active users". */
  label: string
  /** The signal on the right: a `Delta`, a limit such as "16 GB", or a `State`. */
  signal?: JSX.Element
  /** The figure. Tabular, 24px. */
  value: string | number
  /** The unit, at 12px text-3: "GB", "s". */
  unit?: string
  /** A meter under the value. `value` is 0 to 100. */
  meter?: { value: number; tone?: "accent" | "info" | "success" | "warning" | "danger"; label?: string }
  /** A sparkline (`WidgetSparkline`) or other content under the value, instead of a meter. */
  footer?: JSX.Element
  /**
   * Fill the box the parent gives it (a `WidgetGrid` cell): the label and value stay at the top, the value at
   * the large figure size once the box is tall enough, and the meter or footer takes the rest of the height (a
   * sparkline grows, a meter sits at the bottom). Without it the card is as tall as its content.
   */
  fill?: boolean
}

/** A single metric: label and signal, the value with its unit, then a meter or sparkline. */
export function StatCard(props: StatCardProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "label",
    "signal",
    "value",
    "unit",
    "meter",
    "footer",
    "fill",
    "class",
  ])
  let el: HTMLDivElement | undefined
  const tall = createTallBox(() => el)
  return (
    <div
      ref={el}
      data-part="stat-card"
      data-fill={local.fill ? "" : undefined}
      data-tall={tall() ? "" : undefined}
      class={cx("nc-stat", local.class)}
      {...rest}
    >
      <div class="nc-stat__label">
        <span>{local.label}</span>
        <Show when={local.signal}>{local.signal}</Show>
      </div>
      <div class="nc-stat__value">
        {local.value}
        <Show when={local.unit}>
          <span class="nc-stat__unit">{local.unit}</span>
        </Show>
      </div>
      <Show when={local.meter}>
        {(meter) => (
          <div
            class="nc-meter"
            data-tone={meter().tone}
            role="progressbar"
            aria-label={meter().label ?? local.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(meter().value)}
          >
            <span style={{ width: `${Math.max(0, Math.min(100, meter().value))}%` }} />
          </div>
        )}
      </Show>
      <Show when={local.footer}>
        <div class="nc-stat__footer">{local.footer}</div>
      </Show>
    </div>
  )
}
