import type { JSX } from "@solidjs/web"
import { For, omit, Show } from "solid-js"
import { cx } from "../lib/cx"
import type { LabelHue } from "./Badge"

export type WidgetHue = "accent" | "success" | "warning" | "danger" | "info"

/**
 * How much of the same thing a widget shows, as on a home screen. `row`: one line. `sm`: the head and a slim
 * live part. `md` (default): the head and the live part. `lg`: a larger figure, a taller chart and the detail.
 */
export type WidgetSize = "row" | "sm" | "md" | "lg"

export interface WidgetProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** One hue per widget: the accent or a status colour. Only the moving part gets it. Default `accent`. */
  hue?: WidgetHue
  /** What it shows, at the left of the head: "Context", "Deploy". A word or two, 12px/500. */
  title?: JSX.Element
  /**
   * A large figure in the widget's hue, for a reading whose unit names it: `82` with `unit="mmHg"`, `48` with
   * `unit="tok/s"`. It takes the title's place; with both, the title sits above it (at `lg`). Without a title,
   * give the widget a `label`, so it still has a name.
   */
  figure?: JSX.Element
  /** At the right of the head: the value, ETA or state, in tabular figures. */
  value?: JSX.Element
  /** Show `value` large and in the widget's hue (timers, countdowns). */
  largeValue?: boolean
  /** The unit after the large number (the `figure`, or a `largeValue`), or after `value`: smaller, text-3. */
  unit?: JSX.Element
  /** Labels spread evenly under the live part, like an axis: `["-60m", "-30m", "Now"]`. */
  axis?: JSX.Element[]
  /** One line of context in text-3 under the live part. It never wraps. Leave it out when the head says enough. */
  caption?: JSX.Element
  /** Detail under the axis, at `lg`: `WidgetStats`. */
  foot?: JSX.Element
  /**
   * How much it shows (`WidgetSize`). Default `md`. At `row` it is one line: the live part first (a
   * `WidgetRing`, an icon, a small sparkline), then the title or figure, then the value at the right.
   */
  size?: WidgetSize
  /** Accessible name of the widget, when the title is not text or there is none. */
  label?: string
  /**
   * Fill the box the parent gives it (a `WidgetGrid` cell): the head stays at the top, a sparkline or list
   * grows into the height, and a live part that cannot grow sits at the bottom with its axis. Without it the
   * widget is as tall as its content.
   */
  fill?: boolean
}

/**
 * A compact card (20px radius) with one live value: progress, a timer, a sparkline, a gauge, segments or a ring.
 * The head is one row, the live part takes the rest, and words stay to a label, a value and a unit.
 */
export function Widget(props: WidgetProps): JSX.Element {
  const rest = omit(
    props,
    "hue",
    "title",
    "figure",
    "value",
    "largeValue",
    "unit",
    "axis",
    "caption",
    "foot",
    "size",
    "label",
    "fill",
    "class",
    "children",
  )
  const size = () => props.size ?? "md"
  const row = () => size() === "row"
  // The unit goes with the large number: the figure, else a large value, else the value.
  const unitOnFigure = () => props.figure !== undefined
  const unit = () => (
    <Show when={props.unit}>
      <span class="nc-widget__unit">{props.unit}</span>
    </Show>
  )
  const lead = () => (
    <Show
      when={props.figure !== undefined}
      fallback={
        <Show when={props.title}>
          <span class="nc-widget__title">{props.title}</span>
        </Show>
      }
    >
      <span class="nc-widget__figure nc-num">
        {props.figure}
        {unit()}
      </span>
    </Show>
  )
  const value = () => (
    <Show when={props.value !== undefined}>
      <span class={cx("nc-widget__value nc-num", props.largeValue && "nc-widget__value--large")}>
        {props.value}
        <Show when={!unitOnFigure()}>{unit()}</Show>
      </span>
    </Show>
  )
  return (
    <div
      data-part="widget"
      data-hue={props.hue ?? "accent"}
      data-fill={props.fill ? "" : undefined}
      data-size={size()}
      role={props.label ? "group" : undefined}
      aria-label={props.label}
      class={cx("nc-widget", props.class)}
      {...rest}
    >
      <Show
        when={!row()}
        fallback={
          <>
            {props.children}
            {lead()}
            {value()}
          </>
        }
      >
        <Show when={props.title && props.figure !== undefined}>
          <span class="nc-widget__eyebrow">{props.title}</span>
        </Show>
        <Show when={props.title || props.figure !== undefined || props.value !== undefined}>
          <div class="nc-widget__head">
            {lead()}
            {value()}
          </div>
        </Show>
        {props.children}
        <Show when={props.axis?.length}>
          <div class="nc-widget__axis nc-num" aria-hidden="true">
            <For each={props.axis}>{(mark) => <span>{mark}</span>}</For>
          </div>
        </Show>
        <Show when={props.caption}>
          <span class="nc-widget__caption nc-num">{props.caption}</span>
        </Show>
        {props.foot}
      </Show>
    </div>
  )
}

const pct = (n: number) => Math.max(0, Math.min(100, n))

export interface WidgetProgressProps {
  /** 0 to 100. */
  value: number
  /** Accessible name of the bar. */
  label: string
  /** Before the bar, on its line: where it starts ("SFO", "local"). */
  start?: JSX.Element
  /** After the bar, on its line: where it ends ("YEG", "atlas-02"). */
  end?: JSX.Element
}

/** A glowing progress bar inside a `Widget`, with a knob at its head; `start` and `end` set its ends. */
export function WidgetProgress(props: WidgetProgressProps): JSX.Element {
  const bar = () => (
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
  return (
    <Show when={props.start || props.end} fallback={bar()}>
      <div class="nc-wprogress-route">
        <Show when={props.start}>
          <span class="nc-wprogress-route__end">{props.start}</span>
        </Show>
        {bar()}
        <Show when={props.end}>
          <span class="nc-wprogress-route__end">{props.end}</span>
        </Show>
      </div>
    </Show>
  )
}

export interface WidgetSparklineProps {
  /** Recent values, oldest first. They are scaled to the largest. */
  values: number[]
  /** Accessible name. */
  label: string
  /** `bars` (default) rise from the bottom; `wave` is centred, for a rate or a level (tokens/s, audio). */
  variant?: "bars" | "wave"
}

/** Thin bars of recent values inside a `Widget`, all in the widget's hue. */
export function WidgetSparkline(props: WidgetSparklineProps): JSX.Element {
  const max = () => Math.max(1, ...props.values)
  return (
    <div
      data-part="widget-sparkline"
      data-variant={props.variant === "wave" ? "wave" : undefined}
      class="nc-wspark"
      role="img"
      aria-label={props.label}
    >
      <For each={props.values}>
        {(v) => <span class="nc-wspark__bar" style={{ height: `${Math.max(8, (v / max()) * 100)}%` }} />}
      </For>
    </div>
  )
}

/** A shallow arc inside a `Widget`, with the value under its middle. `value` is 0 to 100. */
export function WidgetGauge(props: { value: number; label: string; display?: string }): JSX.Element {
  return (
    <div
      data-part="widget-gauge"
      class="nc-wgauge"
      role="img"
      aria-label={`${props.label} ${Math.round(pct(props.value))}%`}
    >
      <svg viewBox="0 0 220 64" preserveAspectRatio="none" class="nc-wgauge__svg" aria-hidden="true">
        <path class="nc-wgauge__track" pathLength="100" d="M10 58 Q110 -18 210 58" />
        <path
          class="nc-wgauge__fill"
          pathLength="100"
          d="M10 58 Q110 -18 210 58"
          stroke-dasharray={`${pct(props.value)} 200`}
        />
      </svg>
      <span class="nc-wgauge__value nc-num">{props.display ?? `${Math.round(pct(props.value))}%`}</span>
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

export interface WidgetRingProps {
  /** 0 to 100. */
  value: number
  /** Accessible name of the ring. */
  label: string
  /** `sm` 20px, for a `row` widget (default); `md` 36px, with the value inside. */
  size?: "sm" | "md"
}

/** A small ring of progress, for the start of a `row` widget: context used, time left, a quota. */
export function WidgetRing(props: WidgetRingProps): JSX.Element {
  const r = 15.5
  const length = 2 * Math.PI * r
  return (
    <div
      data-part="widget-ring"
      data-size={props.size ?? "sm"}
      class="nc-wring"
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct(props.value))}
    >
      <svg viewBox="0 0 36 36" class="nc-wring__svg" aria-hidden="true">
        <circle class="nc-wring__track" cx="18" cy="18" r={r} />
        <circle
          class="nc-wring__fill"
          cx="18"
          cy="18"
          r={r}
          stroke-dasharray={`${(pct(props.value) / 100) * length} ${length}`}
        />
      </svg>
      <Show when={props.size === "md"}>
        <span class="nc-wring__value nc-num">{Math.round(pct(props.value))}</span>
      </Show>
    </div>
  )
}

/** The colours parts take in order when they name none: categorical, so neighbours always differ. */
export const WIDGET_PART_HUES: LabelHue[] = [
  "accent",
  "sky",
  "orchid",
  "amber",
  "teal",
  "ember",
  "rose",
  "mint",
]

const STATUS_VAR: Partial<Record<LabelHue, string>> = {
  accent: "var(--accent-strong)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
}

/** The CSS colour of a part: its own hue, or the next one of `WIDGET_PART_HUES`. */
function partColour(hue: LabelHue | undefined, i: number): string {
  const h = hue ?? WIDGET_PART_HUES[i % WIDGET_PART_HUES.length] ?? "accent"
  return STATUS_VAR[h] ?? `var(--label-${h})`
}

export interface WidgetSegment {
  /** Short name under the segment: "System", "Tools". */
  label: string
  /** Its share, in the same unit as `total`. */
  value: number
  /** The value as shown next to the name: "12k". Default: the number. */
  display?: string
  /** Its colour. Default: the next of `WIDGET_PART_HUES`, so each part differs. */
  hue?: LabelHue
}

export interface WidgetSegmentsProps {
  /** The used parts, in order, each in its own colour. */
  segments: WidgetSegment[]
  /** The whole. What the segments leave is the free part, drawn as the track. */
  total: number
  /** Accessible name. */
  label: string
  /** Name of the free part, shown under it when it is set: "Free". */
  free?: string
  /** How the free part's value is shown: "76k". Default: the number. */
  freeDisplay?: string
  /**
   * Where the names go. `parts` (default): under each part. `legend`: in a line under the bar, for parts too
   * narrow for their names. `list`: a row per part with its value and share, the full account. `none`: the bar
   * alone, for a small widget; the names stay in the accessible name.
   */
  labels?: "parts" | "legend" | "list" | "none"
}

/**
 * A bar split into labelled parts of one whole, inside a `Widget`: what fills a context window, a disk, a
 * budget. Each part has its own colour, the rest is the track, and the names sit under their parts or in a legend.
 */
export function WidgetSegments(props: WidgetSegmentsProps): JSX.Element {
  const total = () =>
    Math.max(
      1,
      props.total,
      props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0),
    )
  const free = () => Math.max(0, total() - props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0))
  const parts = () => [
    ...props.segments.map((s, i) => ({
      label: s.label,
      value: Math.max(0, s.value),
      display: s.display ?? String(s.value),
      colour: partColour(s.hue, i),
      free: false,
    })),
    ...(free() > 0
      ? [
          {
            label: props.free ?? "",
            value: free(),
            display: props.freeDisplay ?? String(free()),
            colour: "",
            free: true,
          },
        ]
      : []),
  ]
  const name = () =>
    `${props.label}: ${parts()
      .filter((p) => p.label)
      .map((p) => `${p.label} ${p.display}`)
      .join(", ")}`
  const colour = (p: { free: boolean; colour: string }) => (p.free ? undefined : { "--nc-part": p.colour })
  const labels = () => props.labels ?? "parts"
  const share = (v: number) => {
    const n = (v / total()) * 100
    return `${n > 0 && n < 1 ? "<1" : Math.round(n)}%`
  }
  return (
    <div
      data-part="widget-segments"
      data-labels={labels()}
      class="nc-wsegments"
      role="img"
      aria-label={name()}
    >
      <div class="nc-wsegments__parts">
        <For each={parts()}>
          {(p) => (
            <div
              class="nc-wsegments__part"
              data-free={p.free ? "" : undefined}
              style={{ "flex-grow": p.value, ...colour(p) }}
            >
              <span class="nc-wsegments__bar" />
              <Show when={labels() === "parts" && p.label}>
                <span class="nc-wsegments__label" aria-hidden="true">
                  {p.label} <span class="nc-wsegments__value nc-num">{p.display}</span>
                </span>
              </Show>
            </div>
          )}
        </For>
      </div>
      <Show when={labels() === "legend"}>
        <div class="nc-wsegments__legend" aria-hidden="true">
          <For each={parts().filter((p) => p.label)}>
            {(p) => (
              <span class="nc-wsegments__key" data-free={p.free ? "" : undefined} style={colour(p)}>
                <span class="nc-wsegments__swatch" />
                {p.label} <span class="nc-wsegments__value nc-num">{p.display}</span>
              </span>
            )}
          </For>
        </div>
      </Show>
      <Show when={labels() === "list"}>
        <div class="nc-wsegments__list" aria-hidden="true">
          <For each={parts().filter((p) => p.label)}>
            {(p) => (
              <div class="nc-wsegments__item" data-free={p.free ? "" : undefined} style={colour(p)}>
                <span class="nc-wsegments__swatch" />
                <span class="nc-wsegments__name">{p.label}</span>
                <span class="nc-wsegments__value nc-num">{p.display}</span>
                <span class="nc-wsegments__share nc-num">{share(p.value)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export interface WidgetStepsProps {
  /** The stops, in order: "Plan", "Edit", "Test", "Commit". One short word each. */
  steps: string[]
  /** Index of the current stop. Earlier ones are done; a number past the end marks all done. */
  current: number
  /** Accessible name of the list. */
  label: string
}

/** Stops on a track inside a `Widget`, the current one glowing: a plan, a pipeline, a route. */
export function WidgetSteps(props: WidgetStepsProps): JSX.Element {
  const at = () => Math.max(0, Math.min(props.steps.length, Math.round(props.current)))
  const fill = () =>
    props.steps.length < 2 ? 0 : Math.min(at(), props.steps.length - 1) / (props.steps.length - 1)
  return (
    <div data-part="widget-steps" class="nc-wsteps" style={{ "--nc-steps-fill": String(fill()) }}>
      <ol class="nc-wsteps__list" aria-label={props.label}>
        <For each={props.steps}>
          {(step, i) => (
            <li
              class="nc-wsteps__step"
              data-state={i() < at() ? "done" : i() === at() ? "current" : undefined}
              aria-current={i() === at() ? "step" : undefined}
            >
              <span class="nc-wsteps__dot" />
              <span class="nc-wsteps__label">{step}</span>
            </li>
          )}
        </For>
      </ol>
    </div>
  )
}

export interface WidgetMeter {
  /** A word: "CPU", "Memory". */
  label: string
  /** 0 to 100. */
  value: number
  /** The reading at the right: "64%", "11.2 GB". Default: the percentage. */
  display?: string
  /** The bar's colour. Default: the next of `WIDGET_PART_HUES`, so each row differs. */
  hue?: LabelHue
}

/** Rows of a label, a thin bar in its own colour and a reading inside a `Widget`: CPU, memory and disk. */
export function WidgetMeters(props: { items: WidgetMeter[]; label: string }): JSX.Element {
  return (
    <div data-part="widget-meters" class="nc-wmeters" role="group" aria-label={props.label}>
      <For each={props.items}>
        {(m, i) => (
          <div class="nc-wmeters__row" style={{ "--nc-part": partColour(m.hue, i()) }}>
            <span class="nc-wmeters__label">{m.label}</span>
            <span
              class="nc-wmeters__track"
              role="progressbar"
              aria-label={m.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct(m.value))}
            >
              <span class="nc-wmeters__bar" style={{ width: `${pct(m.value)}%` }} />
            </span>
            <span class="nc-wmeters__value nc-num">{m.display ?? `${Math.round(pct(m.value))}%`}</span>
          </div>
        )}
      </For>
    </div>
  )
}

export interface WidgetStat {
  /** A short name: "p50", "Peak". */
  label: string
  /** The reading: "41", "96 tok/s". */
  value: JSX.Element
}

/** A line of a few readings, each a name over its value, for the foot of a large widget: p50, peak, total. */
export function WidgetStats(props: { items: WidgetStat[] }): JSX.Element {
  return (
    <dl data-part="widget-stats" class="nc-wstats">
      <For each={props.items}>
        {(item) => (
          <div class="nc-wstats__item">
            <dt class="nc-wstats__label">{item.label}</dt>
            <dd class="nc-wstats__value nc-num">{item.value}</dd>
          </div>
        )}
      </For>
    </dl>
  )
}

export interface WidgetTimerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** One hue per widget, as for `Widget`. Timers are usually `warning`. Default `accent`. */
  hue?: WidgetHue
  /** What is being timed, under the ticks at the left: "Focus". */
  title: JSX.Element
  /** The time left or elapsed, large and glowing, under the ticks at the right: `18:24`. */
  value: JSX.Element
  /** How far along it is, from 0 to 1. The ticks up to it take the hue; the rest stay a tint. */
  progress: number
  /** Number of ticks. Default 28. */
  ticks?: number
  /** Labels along the top, spread evenly: `["0", "10", "20", "30"]`. */
  scale?: string[]
  /** Accessible name of the progress bar. Default "Timer progress". */
  label?: string
  /** One control between the title and the time (a stop button), or `WidgetControls` for a row below. */
  children?: JSX.Element
  /** Fill the box the parent gives it, as for `Widget`. */
  fill?: boolean
}

/** The height of tick `i` in px: a wave while elapsed, flat while remaining. */
export function tickHeight(i: number, elapsed: boolean): number {
  return elapsed ? 14 + Math.round(10 * Math.abs(Math.sin(i * 0.9))) : 14
}

/**
 * The timer widget: an optional scale, a ticked bar across the width, then the title and the large time on
 * one row. Elapsed ticks take the widget's hue and the newest one glows; the rest stay a tint.
 */
export function WidgetTimer(props: WidgetTimerProps): JSX.Element {
  const rest = omit(
    props,
    "hue",
    "title",
    "value",
    "progress",
    "ticks",
    "scale",
    "label",
    "children",
    "class",
  )
  const count = () => Math.max(1, Math.round(props.ticks ?? 28))
  const done = () => Math.round((pct(props.progress * 100) / 100) * count())
  return (
    <Widget hue={props.hue} class={cx("nc-widget--timer", props.class)} {...rest}>
      <Show when={props.scale?.length}>
        <div class="nc-wtimer__scale nc-num" aria-hidden="true">
          <For each={props.scale}>{(mark) => <span>{mark}</span>}</For>
        </div>
      </Show>
      <div
        data-part="widget-timer-ticks"
        class="nc-wtimer__ticks"
        role="progressbar"
        aria-label={props.label ?? "Timer progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct(props.progress * 100))}
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
      <div class="nc-wtimer__row">
        <span class="nc-wtimer__title">{props.title}</span>
        {props.children}
        <span class="nc-wtimer__value nc-num">{props.value}</span>
      </div>
    </Widget>
  )
}

/** Pill-shaped control buttons on the hue's tint, for the bottom of a `Widget` or inside a timer's row. */
export function WidgetControls(props: { children: JSX.Element }): JSX.Element {
  return (
    <div data-part="widget-controls" class="nc-wcontrols">
      {props.children}
    </div>
  )
}
