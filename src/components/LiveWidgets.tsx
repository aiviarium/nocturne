import { type JSX, Match, Switch } from "solid-js"
import {
  Widget,
  type WidgetHue,
  WidgetProgress,
  WidgetRing,
  type WidgetSegment,
  WidgetSegments,
  type WidgetSize,
  WidgetSparkline,
  type WidgetStat,
  WidgetStats,
} from "./Widget"

/** `1234` as "1.2k", `124000` as "124k", `1500000` as "1.5M": a count of tokens at a glance. */
export function compactCount(n: number): string {
  const abs = Math.abs(n)
  const round = (v: number) => (v < 10 ? Math.round(v * 10) / 10 : Math.round(v))
  if (abs >= 1_000_000) return `${round(n / 1_000_000)}M`
  if (abs >= 1000) return `${round(n / 1000)}k`
  return String(Math.round(n))
}

export interface ContextWidgetProps {
  /** Tokens in the context window now. */
  used: number
  /** The window's size in tokens. */
  total: number
  /** What fills it, each in its own colour: system prompt, tools, files, the conversation. */
  parts?: WidgetSegment[]
  /**
   * `row`: a ring and the share. `sm` (default): the share over one bar. `lg`: the share large, used of total,
   * the bar, and a row per part with its size and share.
   */
  size?: Extract<WidgetSize, "row" | "sm" | "lg">
  /** Default "Context". */
  title?: string
  /** How a number of tokens is shown. Default `compactCount`. */
  format?: (n: number) => string
  /** Default `accent`; `warning` or `danger` as the window fills. */
  hue?: WidgetHue
  /** Fill the box the parent gives it, as for `Widget`. */
  fill?: boolean
  class?: string
}

/** An agent's context window at three sizes, from a ring in a status column to the full account of what fills it. */
export function ContextWidget(props: ContextWidgetProps): JSX.Element {
  const title = () => props.title ?? "Context"
  const fmt = (n: number) => (props.format ?? compactCount)(n)
  const share = () => Math.max(0, Math.min(100, Math.round((props.used / Math.max(1, props.total)) * 100)))
  const bar = (labels: "none" | "list") =>
    props.parts?.length ? (
      <WidgetSegments
        segments={props.parts}
        total={props.total}
        labels={labels}
        free={labels === "list" ? "Free" : undefined}
        freeDisplay={fmt(Math.max(0, props.total - props.used))}
        label={title()}
      />
    ) : (
      <WidgetProgress value={share()} label={title()} />
    )
  const common = () => ({ hue: props.hue, fill: props.fill, class: props.class })
  return (
    <Switch>
      <Match when={props.size === "row"}>
        <Widget {...common()} size="row" title={title()} value={`${share()}%`}>
          <WidgetRing value={share()} label={`${title()} used`} />
        </Widget>
      </Match>
      <Match when={props.size === "lg"}>
        <Widget
          {...common()}
          size="lg"
          title={title()}
          figure={share()}
          unit="%"
          value={`${fmt(props.used)} / ${fmt(props.total)}`}
        >
          {bar("list")}
        </Widget>
      </Match>
      <Match when={true}>
        <Widget {...common()} size="sm" title={title()} value={`${share()}%`}>
          {bar("none")}
        </Widget>
      </Match>
    </Switch>
  )
}

export interface RateWidgetProps {
  /** The current rate: `48`. */
  value: JSX.Element
  /** Its unit: "tok/s", "req/min". */
  unit: string
  /** Recent rates, oldest first, for the chart. */
  values: number[]
  /** What it measures: "Output". Shown at `row` and above the figure at `lg`. */
  title: string
  /** Readings for the right of the head (the first) and the foot at `lg` (all): p50, peak. */
  stats?: WidgetStat[]
  /** Labels under the chart at `md` and `lg`: `["-5m", "Now"]`. */
  axis?: string[]
  /**
   * `row`: a small wave, the title and the rate. `md` (default): the rate and one reading over the wave. `lg`:
   * the title, the rate, a tall wave with its axis, and the readings.
   */
  size?: Extract<WidgetSize, "row" | "md" | "lg">
  hue?: WidgetHue
  /** Fill the box the parent gives it, as for `Widget`. */
  fill?: boolean
  class?: string
}

/** A rate at three sizes, such as an agent's output in tokens per second. */
export function RateWidget(props: RateWidgetProps): JSX.Element {
  const chart = (values: number[]) => (
    <WidgetSparkline variant="wave" values={values} label={`${props.title}, recent ${props.unit}`} />
  )
  const first = () => props.stats?.[0]
  const common = () => ({ hue: props.hue, fill: props.fill, class: props.class, label: props.title })
  return (
    <Switch>
      <Match when={props.size === "row"}>
        <Widget {...common()} size="row" title={props.title} value={props.value} unit={props.unit}>
          {chart(props.values.slice(-12))}
        </Widget>
      </Match>
      <Match when={props.size === "lg"}>
        <Widget
          {...common()}
          size="lg"
          title={props.title}
          figure={props.value}
          unit={props.unit}
          axis={props.axis}
          foot={props.stats?.length ? <WidgetStats items={props.stats} /> : undefined}
        >
          {chart(props.values)}
        </Widget>
      </Match>
      <Match when={true}>
        <Widget
          {...common()}
          figure={props.value}
          unit={props.unit}
          value={first() ? `${first()?.label} ${first()?.value}` : undefined}
          axis={props.axis}
        >
          {chart(props.values)}
        </Widget>
      </Match>
    </Switch>
  )
}
