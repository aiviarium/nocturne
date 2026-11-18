import { For, type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"

export type WidgetHue = "accent" | "success" | "warning" | "danger" | "info"

export interface WidgetProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** One hue per widget: the accent or a status colour. Only the moving part gets it. Default `accent`. */
  hue?: WidgetHue
  /** Leading label, 13px/500. */
  title?: JSX.Element
  /** Right of the title: the value, ETA or state, in tabular figures. Small text-3 by default. */
  value?: JSX.Element
  /** Lead with the value instead: large, in the widget's hue (timers, countdowns). */
  largeValue?: boolean
  /** The context line in text-3 below the live part. */
  caption?: JSX.Element
  /**
   * Fill the box the parent gives it (a `WidgetGrid` cell): the title stays at the top, a sparkline or list
   * grows into the height, and a live part that cannot grow sits with the caption at the bottom. Without it
   * the widget is as tall as its content.
   */
  fill?: boolean
}

/** A card (20px radius) with one live value: a progress bar, timer, gauge, sparkline or uptime strip. */
export function Widget(props: WidgetProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "hue",
    "title",
    "value",
    "largeValue",
    "caption",
    "fill",
    "class",
    "children",
  ])
  return (
    <div
      data-part="widget"
      data-hue={local.hue ?? "accent"}
      data-fill={local.fill ? "" : undefined}
      class={cx("nc-widget", local.class)}
      {...rest}
    >
      <Show when={local.title || local.value}>
        <div class="nc-widget__head">
          <span class="nc-widget__title">{local.title}</span>
          <span
            class={cx(
              "nc-widget__value nc-num",
              local.largeValue ? "nc-widget__value--large title" : "nc-meta",
            )}
          >
            {local.value}
          </span>
        </div>
      </Show>
      {local.children}
      <Show when={local.caption}>
        <span class="nc-widget__caption nc-meta nc-num">{local.caption}</span>
      </Show>
    </div>
  )
}

const pct = (n: number) => Math.max(0, Math.min(100, n))

/** A glowing progress bar inside a `Widget`. `value` is 0 to 100. */
export function WidgetProgress(props: { value: number; label: string }): JSX.Element {
  return (
    <div
      data-part="widget-progress"
      class="nc-wprogress"
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct(props.value))}
    >
      <span class="nc-wprogress__bar" style={{ width: `${pct(props.value)}%` }} />
    </div>
  )
}

/** Bars of recent values inside a `Widget`; the newest bars glow. `values` are scaled to the largest. */
export function WidgetSparkline(props: { values: number[]; label: string; live?: number }): JSX.Element {
  const max = () => Math.max(1, ...props.values)
  return (
    <div data-part="widget-sparkline" class="nc-wspark" role="img" aria-label={props.label}>
      <For each={props.values}>
        {(v, i) => (
          <span
            class={cx(
              "nc-wspark__bar",
              i() >= props.values.length - (props.live ?? 3) && "nc-wspark__bar--live",
            )}
            style={{ height: `${Math.max(6, (v / max()) * 100)}%` }}
          />
        )}
      </For>
    </div>
  )
}

/** A half-circle gauge inside a `Widget`. `value` is 0 to 100. */
export function WidgetGauge(props: { value: number; label: string; display?: string }): JSX.Element {
  const length = Math.PI * 90
  return (
    <div
      data-part="widget-gauge"
      class="nc-wgauge"
      role="img"
      aria-label={`${props.label} ${Math.round(pct(props.value))}%`}
    >
      <svg viewBox="0 -16 220 112" class="nc-wgauge__svg" aria-hidden="true">
        <path class="nc-wgauge__track" d="M20 90 A90 90 0 0 1 200 90" />
        <path
          class="nc-wgauge__fill"
          d="M20 90 A90 90 0 0 1 200 90"
          stroke-dasharray={`${(pct(props.value) / 100) * length} ${length * 2}`}
        />
      </svg>
      <span class="nc-wgauge__value nc-num title">{props.display ?? `${Math.round(pct(props.value))}%`}</span>
    </div>
  )
}

/** A strip of day cells inside a `Widget`: `up` cells take the hue, `down` cells danger, `none` stay neutral. */
export function WidgetUptime(props: { days: Array<"up" | "down" | "none">; label: string }): JSX.Element {
  return (
    <div data-part="widget-uptime" class="nc-wuptime" role="img" aria-label={props.label}>
      <For each={props.days}>{(d) => <span class={cx("nc-wuptime__cell", `nc-wuptime__cell--${d}`)} />}</For>
    </div>
  )
}

export interface WidgetTimerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** One hue per widget, as for `Widget`. Timers are usually `warning`. Default `accent`. */
  hue?: WidgetHue
  /** What is being timed, left of the ticks: "Focus". */
  title: JSX.Element
  /** The time left or elapsed, large and glowing: `18:24`. */
  value: JSX.Element
  /** How far along it is, from 0 to 1. The ticks up to it take the hue; the rest stay a tint. */
  progress: number
  /** Number of ticks. Default 26. */
  ticks?: number
  /** Labels along the top, spread evenly: `["0", "10", "20", "30 min"]`. */
  scale?: string[]
  /** Accessible name of the progress bar. Default "Timer progress". */
  label?: string
  /** The context line below, in text-3. */
  caption?: JSX.Element
  /** Usually `WidgetControls`. */
  children?: JSX.Element
  /** Fill the box the parent gives it, as for `Widget`. */
  fill?: boolean
}

/** The height of tick `i` in px: a wave while elapsed, flat while remaining. */
export function tickHeight(i: number, elapsed: boolean): number {
  return elapsed ? 12 + Math.round(16 * Math.abs(Math.sin(i * 0.9))) : 10
}

/**
 * The timer widget: the title, a ticked bar and the large time in one row, an optional scale above and
 * controls below. Elapsed ticks take the widget's hue and the newest one glows; the rest stay a tint.
 */
export function WidgetTimer(props: WidgetTimerProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "hue",
    "title",
    "value",
    "progress",
    "ticks",
    "scale",
    "label",
    "caption",
    "children",
    "class",
  ])
  const count = () => Math.max(1, Math.round(local.ticks ?? 26))
  const done = () => Math.round((pct(local.progress * 100) / 100) * count())
  return (
    <Widget hue={local.hue} class={cx("nc-widget--timer", local.class)} caption={local.caption} {...rest}>
      <Show when={local.scale?.length}>
        <div class="nc-wtimer__scale kbd" aria-hidden="true">
          <For each={local.scale}>{(mark) => <span>{mark}</span>}</For>
        </div>
      </Show>
      <div class="nc-wtimer__row">
        <span class="nc-wtimer__title heading">{local.title}</span>
        <div
          data-part="widget-timer-ticks"
          class="nc-wtimer__ticks"
          role="progressbar"
          aria-label={local.label ?? "Timer progress"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct(local.progress * 100))}
        >
          <For each={Array.from({ length: count() }, (_, i) => i)}>
            {(i) => (
              <span
                class={cx(
                  "nc-wtimer__tick",
                  i < done() && "nc-wtimer__tick--on",
                  i === done() - 1 && "nc-wtimer__tick--live",
                )}
                style={{ height: `${tickHeight(i, i < done())}px` }}
              />
            )}
          </For>
        </div>
        <span class="nc-wtimer__value nc-num title">{local.value}</span>
      </div>
      {local.children}
    </Widget>
  )
}

/** Pill-shaped control buttons on the hue's tint, for the bottom of a `Widget`. */
export function WidgetControls(props: { children: JSX.Element }): JSX.Element {
  return (
    <div data-part="widget-controls" class="nc-wcontrols">
      {props.children}
    </div>
  )
}
