import type { JSX } from "@solidjs/web"
import { createSignal, For, omit, onCleanup, children as resolveChildren, Show } from "solid-js"
import { createTallBox } from "../lib/box"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { Icon, type IconName } from "./Icon"
import { titleOf } from "./Truncate"

// ── Section heading ──────────────────────────────────────────────────────────────────────────────────────

export interface SectionHeadingProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The section's name, in sentence case. */
  title: JSX.Element
  /** A total after the title, in text-3 ("Pull requests 12"). An attention count is a `Count` in `aside`. */
  count?: number | string
  /** At the right: one small action (a ghost `Button size="sm"`, an `IconButton size="sm"`, a link), or a status. */
  action?: JSX.Element
  /** Heading level for the document outline. Default 2. The look does not change with it. */
  level?: 2 | 3 | 4
}

/**
 * The heading of a section inside a view or a card: 13px semibold text-1, an optional total and one action at
 * the right, in a 24px row so the action lines up with it. There is one treatment, whatever the level; a view's
 * own name is in its tab and bar, never repeated as a heading.
 */
export function SectionHeading(props: SectionHeadingProps): JSX.Element {
  const rest = omit(props, "title", "count", "action", "level", "class")
  const Tag = () => {
    const level = props.level ?? 2
    const content = (
      <>
        {props.title}
        <Show when={props.count !== undefined && props.count !== ""}>
          <span class="nc-section-heading__count">{props.count}</span>
        </Show>
      </>
    )
    if (level === 3) return <h3 class="nc-section-heading__title">{content}</h3>
    if (level === 4) return <h4 class="nc-section-heading__title">{content}</h4>
    return <h2 class="nc-section-heading__title">{content}</h2>
  }
  return (
    <div data-part="section-heading" class={cx("nc-section-heading", props.class)} {...rest}>
      <Tag />
      <Show when={props.action}>
        <span class="nc-section-heading__action">{props.action}</span>
      </Show>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface CardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "onClick"> {
  /** A heading inside the card, at its top: the `SectionHeading` treatment. */
  title?: JSX.Element
  /** A total after the title. */
  count?: number | string
  /** One small action at the right of the title. */
  action?: JSX.Element
  /** A row at the bottom, for totals or "Show all". */
  footer?: JSX.Element
  /** `default` pads by the one card padding (12px); `none` lets a list, table or media run to the edge. */
  padding?: "default" | "none"
  /**
   * The card fills a box its parent gives it (a grid cell, a column of fixed height): the body takes the rest
   * of the height, a list grows and scrolls inside, an empty state centres, and a lone `Stat` keeps its label
   * and figure at the top, the figure larger in a tall box, with its chart taking the rest. Without it the card
   * is as tall as its content.
   */
  fill?: boolean
  /** On a card or panel: bg-2 instead of bg-1. */
  nested?: boolean
  /** The whole card is a link. Its content must hold no other control. */
  href?: string
  /** The whole card is a button. Its content must hold no other control. */
  onClick?: (e: MouseEvent) => void
  /** Accessible name of a card that is a link or button, when its title is not plain text. */
  label?: string
}

/**
 * A bg-1 surface with a hairline edge and radius 8, padded by one rule (12px), sized to its content unless
 * `fill`. Nested padded containers collapse to one padding: a `Card`, `Panel`, `Stat` or `Widget` that is a
 * card's only child loses its own edge and padding, and a `RowList`, `DataTable` or `EmptyState` alone in it
 * meets the card's inset. Use `Panel` instead for a tool region with a 44px header and actions.
 */
export function Card(props: CardProps): JSX.Element {
  const rest = omit(
    props,
    "title",
    "count",
    "action",
    "footer",
    "padding",
    "fill",
    "nested",
    "href",
    "onClick",
    "label",
    "class",
    "children",
  )
  const linkClick = useLinkClick()
  const body = resolveChildren(() => props.children)
  const content = () => (
    <>
      <Show when={props.title || props.action}>
        <SectionHeading
          class="nc-card__head"
          title={props.title}
          count={props.count}
          action={props.action}
          level={3}
        />
      </Show>
      <div data-part="card-body" class="nc-card__body">
        {body()}
      </div>
      <Show when={props.footer}>
        <footer data-part="card-footer" class="nc-card__footer">
          {props.footer}
        </footer>
      </Show>
    </>
  )
  const className = () =>
    cx(
      "nc-card nc-ccard",
      props.nested && "nc-card--nested",
      (props.href || props.onClick) && "nc-ccard--action",
      props.class,
    )
  const data = () => ({
    "data-part": "card",
    "data-padding": props.padding ?? "default",
    "data-fill": props.fill ? "" : undefined,
  })
  if (props.href)
    return (
      <a
        {...data()}
        class={className()}
        href={props.href}
        aria-label={props.label}
        title={titleOf(props.title)}
        onClick={(e) => {
          callClick(props.onClick, e)
          linkClick(e, props.href)
        }}
        {...(rest as JSX.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content()}
      </a>
    )
  if (props.onClick)
    return (
      <button
        type="button"
        {...data()}
        class={className()}
        aria-label={props.label}
        onClick={(e) => callClick(props.onClick, e)}
        {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content()}
      </button>
    )
  return (
    <section {...data()} class={className()} {...rest}>
      {content()}
    </section>
  )
}

// ── Stat ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface StatProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** What is measured: "Open issues". */
  label: string
  /** The figure, tabular. */
  value: string | number
  /** The unit, at label size in text-3: "GB", "ms". */
  unit?: string
  /** At the right of the label: a `Delta`, a limit ("of 16 GB") or a `State`. */
  signal?: JSX.Element
  /** One line under the figure, in text-3: the period, the comparison. */
  caption?: JSX.Element
  /**
   * A meter, sparkline (`WidgetSparkline`, in the accent) or other small chart under the caption. In a card that
   * fills a box it takes the height the figure leaves: a sparkline grows, a meter sits at the bottom.
   */
  children?: JSX.Element
}

/**
 * One figure with its label: the content of a `Card` or a `StatCard`. In a card that fills a box (`fill`) the
 * label and its signal stay at the top, the figure right under them at the large figure size once the box is
 * tall enough, then the caption; a chart takes the rest of the height, and without one the box keeps its
 * padding below the group, never a gap above it.
 */
export function Stat(props: StatProps): JSX.Element {
  const rest = omit(props, "label", "value", "unit", "signal", "caption", "children", "class")
  let el: HTMLDivElement | undefined
  const tall = createTallBox(() => el)
  return (
    <div
      ref={el}
      data-part="stat"
      data-tall={tall() ? "" : undefined}
      class={cx("nc-statv", props.class)}
      {...rest}
    >
      <div class="nc-statv__label">
        <span>{props.label}</span>
        <Show when={props.signal}>{props.signal}</Show>
      </div>
      <div class="nc-statv__figure">
        <span class="nc-statv__value">{props.value}</span>
        <Show when={props.unit}>
          <span class="nc-statv__unit">{props.unit}</span>
        </Show>
      </div>
      <Show when={props.caption}>
        <span class="nc-statv__caption">{props.caption}</span>
      </Show>
      <Show when={props.children}>
        <div class="nc-statv__chart">{props.children}</div>
      </Show>
    </div>
  )
}

// ── Property list ────────────────────────────────────────────────────────────────────────────────────────

export interface PropertyItem {
  /** Stable id. */
  id?: string
  /** The property's name, in text-3. */
  label: string
  /** A named icon before the label. */
  icon?: IconName
  /** The value: text, a `State`, an `Avatar` with a name, chips, or an `InlineField`/`Select` to edit it in place. */
  value: JSX.Element
  /** Shown in text-4 where the value is empty. Default an em dash. */
  empty?: string
}

export interface PropertyListProps extends Omit<JSX.HTMLAttributes<HTMLDListElement>, "children"> {
  items: PropertyItem[]
  /** Width of the label column. Default 120px; `auto` sizes it to the longest label. */
  labelWidth?: number | "auto"
}

/**
 * Label and value rows, as on an issue or a page: a label column in text-3 and the values in text-1, each row
 * 28px high so a value edited in place (an `InlineField`, a `Select` with `variant="inline"`) keeps the row.
 * An empty value shows an em dash, never "None".
 */
export function PropertyList(props: PropertyListProps): JSX.Element {
  const rest = omit(props, "items", "labelWidth", "class", "style")
  return (
    <dl
      data-part="property-list"
      class={cx("nc-props", props.class)}
      style={{
        "--nc-props-label": props.labelWidth === "auto" ? "max-content" : `${props.labelWidth ?? 120}px`,
        ...(typeof props.style === "object" ? props.style : {}),
      }}
      {...rest}
    >
      <For each={props.items}>
        {(item) => (
          <div class="nc-props__row" data-property={item.id ?? item.label}>
            <dt class="nc-props__label" title={item.label}>
              <Show when={item.icon}>
                <Icon name={item.icon} size="sm" />
              </Show>
              <span class="nc-props__label-text">{item.label}</span>
            </dt>
            <dd class="nc-props__value">
              <Show
                when={item.value !== undefined && item.value !== null && item.value !== ""}
                fallback={<span class="nc-null">{item.empty ?? "—"}</span>}
              >
                {item.value}
              </Show>
            </dd>
          </div>
        )}
      </For>
    </dl>
  )
}

// ── Metadata line ────────────────────────────────────────────────────────────────────────────────────────

export interface MetaItem {
  /** Text, or a node (a `State`, an `Avatar` with a name). */
  label: JSX.Element
  /** A named icon before it. */
  icon?: IconName
  /** Mono, for IDs, branches and hashes. */
  mono?: boolean
  /** The full text, when `label` is a node. */
  title?: string
}

export interface MetaLineProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The parts, joined by a middle dot. Empty parts are left out, so no dangling separators. */
  items: Array<MetaItem | string | false | null | undefined>
}

/**
 * Facts about an item on one line in text-3, joined by " · ": who, where, when, how many. It never wraps; it is
 * cut at the end with the full line as its title. State does not go here (use `State`), and neither does
 * anything that is always true ("Created today", "Live").
 */
export function MetaLine(props: MetaLineProps): JSX.Element {
  const rest = omit(props, "items", "class")
  const parts = () =>
    props.items
      .filter((i): i is MetaItem | string => Boolean(i))
      .map((i) => (typeof i === "string" ? { label: i } : i))
  const full = () =>
    parts()
      .map((p) => p.title ?? titleOf(p.label) ?? "")
      .filter(Boolean)
      .join(" · ")
  return (
    <span data-part="meta-line" class={cx("nc-metaline", props.class)} title={full()} {...rest}>
      {/* By position: the parts are made afresh on each change, and a part's place is its identity. */}
      <For each={parts()} keyed={false}>
        {(p, i) => (
          <>
            <Show when={i > 0}>
              <span class="nc-metaline__sep" aria-hidden="true">
                ·
              </span>
            </Show>
            <span class={cx("nc-metaline__item", p().mono && "nc-mono")}>
              <Show when={p().icon}>
                <Icon name={p().icon} size="sm" />
              </Show>
              <span class="nc-metaline__text">{p().label}</span>
            </span>
          </>
        )}
      </For>
    </span>
  )
}

// ── Filter bar ───────────────────────────────────────────────────────────────────────────────────────────

export interface FilterCountProps {
  /** The number of results. */
  value: number
  /** An icon for what is counted, when the list doesn't make it plain: `list` for issues, `server` for hosts. */
  icon?: IconName
  /** What is counted, for screen readers: "Issues", read as "Issues: 3". */
  unit: string
  class?: string
}

/**
 * The number of results in a `FilterBar`'s `end`: the bare number in tabular digits, after an optional icon for
 * its unit. Screen readers hear the number and the unit; on screen there is no sentence to pluralise.
 */
export function FilterCount(props: FilterCountProps): JSX.Element {
  return (
    <span
      data-part="filter-count"
      class={cx("nc-filtercount", props.class)}
      role="status"
      aria-label={`${props.unit}: ${props.value}`}
    >
      <Show when={props.icon}>{(name) => <Icon name={name()} size="sm" />}</Show>
      <span class="nc-num">{props.value}</span>
    </span>
  )
}

export interface FilterBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the group. Default "Filters". */
  label?: string
  /** The search field, first and the one that grows: a `TextField variant="search"`. */
  search?: JSX.Element
  /** The filters: `Tabs` (segmented), `Select`s with `aria-label`, `Switch`es with a short label. */
  children?: JSX.Element
  /**
   * At the right of the first line, however the filters wrap: the number of results as a `FilterCount` (the bare
   * number, with an icon for its unit if it needs one), or a view switch. Never a sentence such as "3 issues".
   */
  end?: JSX.Element
}

/**
 * Search and filters in one row that wraps predictably: the search field first (it grows, and takes a row of
 * its own when narrow), then the filters at their natural width, then `end` at the right. Labels are handled
 * one way: a filter carries its name inside the control (the select's current value, or an `aria-label`),
 * never as a caption above it. On a phone the bar scrolls sideways under the search field, and its edge fades
 * where more filters are hidden.
 */
export function FilterBar(props: FilterBarProps): JSX.Element {
  const rest = omit(props, "label", "search", "children", "end", "class")
  // Which ends of the filters have more hidden past them, when they scroll sideways.
  const [more, setMore] = createSignal({ start: false, end: false })
  // A ref callback is unowned in Solid 2, so the listening is set up by a factory in the body.
  const watchScroll = () => {
    let stop: (() => void) | undefined
    onCleanup(() => stop?.())
    return (el: HTMLDivElement) => {
      stop?.()
      const update = () => {
        const max = el.scrollWidth - el.clientWidth
        const start = max > 1 && el.scrollLeft > 1
        const end = max > 1 && el.scrollLeft < max - 1
        if (start !== more().start || end !== more().end) setMore({ start, end })
      }
      el.addEventListener("scroll", update, { passive: true })
      const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : undefined
      ro?.observe(el)
      queueMicrotask(update)
      stop = () => {
        el.removeEventListener("scroll", update)
        ro?.disconnect()
      }
    }
  }
  // `end` is pinned to the first line's right; the row keeps its width free on every line so nothing runs under it.
  const [endWidth, setEndWidth] = createSignal(0)
  const watchEnd = () => {
    let stop: (() => void) | undefined
    onCleanup(() => stop?.())
    return (el: HTMLDivElement) => {
      stop?.()
      const update = () => setEndWidth(Math.ceil(el.getBoundingClientRect().width))
      const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : undefined
      ro?.observe(el)
      queueMicrotask(update)
      stop = () => ro?.disconnect()
    }
  }
  return (
    <div
      data-part="filter-bar"
      role="group"
      aria-label={props.label ?? "Filters"}
      class={cx("nc-filterbar", props.class)}
      {...rest}
    >
      <div
        class="nc-filterbar__row"
        data-end={props.end ? "" : undefined}
        style={props.end ? { "--nc-filterbar-end": `${endWidth()}px` } : undefined}
      >
        <Show when={props.search}>
          <div class="nc-filterbar__search">{props.search}</div>
        </Show>
        <Show when={props.children}>
          <div
            ref={watchScroll()}
            class="nc-filterbar__filters"
            data-more-start={more().start ? "" : undefined}
            data-more-end={more().end ? "" : undefined}
          >
            {props.children}
          </div>
        </Show>
        <Show when={props.end}>
          <div ref={watchEnd()} class="nc-filterbar__end">
            {props.end}
          </div>
        </Show>
      </div>
    </div>
  )
}
