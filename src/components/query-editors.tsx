// The value editors of QueryBuilder: the editor for a rule's value by field type and operator, in two forms: `stack`
// for a chip's popover and the phone sheet (lists shown in place), `row` for a line of the advanced builder
// (pickers behind a trigger). The controls themselves are the field kinds' filters (`fields/`); what is here is the
// choice of one by operator and the pickers of people and relations, which have no kind of their own.
import { type JSX, Match, onMount, Switch, untrack } from "solid-js"
import { FieldFilter, specOfQueryField } from "../fields/Field"
import { OptionList, OptionPicker } from "../fields/parts/OptionList"
import { cx } from "../lib/cx"
import { operatorInfo, type QueryField, type QueryRule, type QueryValue } from "../lib/query"

/** What a custom picker (people, entities) gets: the field, the value and a way to set it. */
export interface QueryPickerContext {
  field: QueryField
  /** One value (`is`, `is not`) or several (`any of`, `none of`). */
  multiple: boolean
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  /** Close the popover: after a single choice. */
  close: () => void
}

/**
 * A custom picker's content for a `person` or `relation` field, rendered once (its context reads live), or null
 * when there is no picker or it returns nothing, so the default list shows.
 */
export function customPicker(
  render: ((ctx: QueryPickerContext) => JSX.Element) | undefined,
  ctx: QueryPickerContext,
): JSX.Element | null {
  if (!render || (ctx.field.type !== "person" && ctx.field.type !== "relation")) return null
  const el = untrack(() => render(ctx))
  return el === undefined || el === null || el === false ? null : el
}

// ── the value of a rule ──────────────────────────────────────────────────────────────────────────────

export interface ValueEditorProps {
  field: QueryField
  rule: QueryRule
  onChange: (value: QueryValue) => void
  /** `stack`: lists in place, for a chip's popover; `row`: one line of the advanced builder. */
  layout: "stack" | "row"
  /** Called after a single choice in a list, so the chip's popover can close. */
  onDone?: () => void
  /** Focus the editor when it mounts. */
  autoFocus?: boolean
  renderPicker?: (ctx: QueryPickerContext) => JSX.Element
}

/** The editor a rule's operator needs, by field type. */
export function ValueEditor(props: ValueEditorProps): JSX.Element {
  const shape = () => operatorInfo(props.rule.op).value
  const v = () => props.rule.value
  const label = () => `${props.field.label} value`
  const spec = () => specOfQueryField(props.field)
  let host: HTMLDivElement | undefined
  onMount(() => {
    if (props.autoFocus)
      queueMicrotask(() =>
        host?.querySelector<HTMLElement>("input, button, [tabindex]")?.focus({ preventScroll: true }),
      )
  })
  const listField = () =>
    props.field.type === "enum" || props.field.type === "person" || props.field.type === "relation"
  const listValue = () =>
    Array.isArray(v()) ? (v() as string[]) : typeof v() === "string" && v() ? [v() as string] : []
  const pairOf = <T,>() => (Array.isArray(v()) ? (v() as [T, T]) : ([null, null] as [T | null, T | null]))
  const one = (value: unknown, onChange: (v: unknown) => void, name: string) => (
    <FieldFilter spec={spec()} value={value} label={name} onChange={onChange} layout={props.layout} />
  )
  return (
    <div ref={host} class={cx("nc-qvalue", `nc-qvalue--${props.layout}`)} data-shape={shape()}>
      <Switch>
        <Match when={shape() === "none"}>{null}</Match>
        <Match when={props.field.type === "boolean"}>
          {one(v(), (x) => props.onChange(x as QueryValue), label())}
        </Match>
        <Match
          when={
            (props.field.type === "person" || props.field.type === "relation") && props.layout === "stack"
          }
        >
          {untrack(
            () =>
              customPicker(props.renderPicker, {
                field: props.field,
                multiple: shape() === "many",
                get value() {
                  return shape() === "many" ? listValue() : (listValue()[0] ?? null)
                },
                onChange: (x) => {
                  props.onChange(x as QueryValue)
                  if (shape() !== "many") props.onDone?.()
                },
                close: () => props.onDone?.(),
              }) ?? (
                <OptionList
                  options={props.field.options ?? []}
                  value={listValue()}
                  multiple={shape() === "many"}
                  label={props.field.label}
                  autoFocus={props.autoFocus}
                  onToggle={(x) => {
                    if (shape() !== "many") {
                      props.onChange(x)
                      props.onDone?.()
                    } else {
                      const cur = listValue()
                      props.onChange(cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x])
                    }
                  }}
                />
              ),
          )}
        </Match>
        <Match when={props.field.type === "person" || props.field.type === "relation"}>
          <OptionPicker
            options={props.field.options ?? []}
            value={listValue()}
            multiple={shape() === "many"}
            label={label()}
            custom={(close) =>
              customPicker(props.renderPicker, {
                field: props.field,
                multiple: shape() === "many",
                get value() {
                  return shape() === "many" ? listValue() : (listValue()[0] ?? null)
                },
                onChange: (x) => props.onChange((Array.isArray(x) ? x : [x]) as QueryValue),
                close,
              })
            }
            onChange={(x) => props.onChange(shape() === "many" ? x : (x[0] ?? null))}
          />
        </Match>
        <Match when={listField()}>
          <FieldFilter
            spec={spec()}
            value={shape() === "many" ? listValue() : (listValue()[0] ?? null)}
            multiple={shape() === "many"}
            label={label()}
            layout={props.layout}
            autofocus={props.autoFocus}
            onDone={props.onDone}
            onChange={(x) => props.onChange(x as QueryValue)}
          />
        </Match>
        <Match when={shape() === "days"}>
          <span class="nc-qvalue__pair">
            <FieldFilter
              spec={{
                name: props.field.name,
                title: props.field.label,
                kind: "number",
                integer: true,
                min: 0,
              }}
              value={typeof v() === "number" ? v() : null}
              label={`${props.field.label}, days`}
              onChange={(n) => props.onChange(n as QueryValue)}
            />
            <span class="nc-qvalue__word">days</span>
          </span>
        </Match>
        <Match when={shape() === "pair"}>
          <span class="nc-qvalue__pair">
            {one(
              pairOf<unknown>()[0],
              (x) => props.onChange([x, pairOf<unknown>()[1]] as QueryValue),
              `${props.field.label}, from`,
            )}
            <span class="nc-qvalue__word">and</span>
            {one(
              pairOf<unknown>()[1],
              (x) => props.onChange([pairOf<unknown>()[0], x] as QueryValue),
              `${props.field.label}, to`,
            )}
          </span>
        </Match>
        <Match when={true}>
          <FieldFilter
            spec={spec()}
            value={v()}
            label={label()}
            layout={props.layout}
            autofocus={props.autoFocus}
            onDone={props.onDone}
            onChange={(x) => props.onChange(x as QueryValue)}
          />
        </Match>
      </Switch>
    </div>
  )
}
