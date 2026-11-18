// Option lists: a listbox of options (one or many, with a search field when long) and the same behind one trigger.
// Used by the enum kind's filter and by the pickers of people and relations in the query builder.
import { createMemo, createSignal, For, type JSX, onMount, Show, untrack } from "solid-js"
import { Icon, type IconName } from "../../components/Icon"
import { TextField } from "../../components/TextField"
import { cx } from "../../lib/cx"
import { createId } from "../../lib/id"
import type { QueryOption } from "../../lib/query"
import { PickerSurface } from "./PickerSurface"

export interface OptionListProps {
  options: QueryOption[]
  value: string[]
  multiple: boolean
  onToggle: (value: string) => void
  label: string
  autoFocus?: boolean
}

const SEARCH_FROM = 8

/** A listbox of options: arrow keys move, Enter or Space chooses; a search field filters a long list. */
export function OptionList(props: OptionListProps): JSX.Element {
  const id = createId("qopts")
  const [query, setQuery] = createSignal("")
  const [active, setActive] = createSignal(0)
  let list!: HTMLDivElement
  let search: HTMLInputElement | undefined
  const shown = createMemo(() => {
    const q = query().trim().toLowerCase()
    return q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options
  })
  const choose = (o: QueryOption | undefined) => o && props.onToggle(o.value)
  const onKeyDown = (e: KeyboardEvent) => {
    const n = shown().length
    if (!n) return
    if (e.key === "ArrowDown") setActive((active() + 1) % n)
    else if (e.key === "ArrowUp") setActive((active() - 1 + n) % n)
    else if (e.key === "Home" && e.currentTarget === list) setActive(0)
    else if (e.key === "End" && e.currentTarget === list) setActive(n - 1)
    else if (e.key === "Enter" || (e.key === " " && e.currentTarget === list)) choose(shown()[active()])
    else return
    e.preventDefault()
    list.querySelector(`#${id}-${active()}`)?.scrollIntoView({ block: "nearest" })
  }
  onMount(() => {
    if (!props.autoFocus) return
    // The first chosen option is where the keys start.
    const at = props.options.findIndex((o) => props.value.includes(o.value))
    if (at > 0) setActive(at)
    queueMicrotask(() => (search ?? list).focus({ preventScroll: true }))
  })
  return (
    <div class="nc-qopts" data-part="query-options">
      <Show when={props.options.length >= SEARCH_FROM}>
        <div class="nc-qopts__search">
          <TextField
            variant="search"
            label={`Search ${props.label.toLowerCase()}`}
            placeholder="Search…"
            inputRef={(el) => (search = el)}
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            aria-controls={id}
            aria-activedescendant={shown().length ? `${id}-${active()}` : undefined}
          />
        </div>
      </Show>
      <div
        ref={list}
        id={id}
        class="nc-qopts__list"
        role="listbox"
        aria-label={props.label}
        aria-multiselectable={props.multiple || undefined}
        aria-activedescendant={shown().length ? `${id}-${active()}` : undefined}
        tabIndex={props.options.length >= SEARCH_FROM ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <For each={shown()} fallback={<div class="nc-qopts__empty">No matches</div>}>
          {(o, i) => {
            const on = () => props.value.includes(o.value)
            return (
              <div
                id={`${id}-${i()}`}
                role="option"
                aria-selected={on()}
                class={cx("nc-menu__item nc-qopts__option", o.description && "nc-menu__item--rich")}
                data-active={active() === i() || undefined}
                onPointerMove={() => setActive(i())}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                <Show when={props.multiple}>
                  <span class="nc-qopts__box" data-on={on() || undefined} aria-hidden="true">
                    <Show when={on()}>
                      <Icon name="check" size="sm" />
                    </Show>
                  </span>
                </Show>
                <Show when={o.icon}>
                  <Icon name={o.icon as IconName} size="sm" class="nc-qopts__icon" />
                </Show>
                <Show when={o.description} fallback={<span class="nc-menu__text">{o.label}</span>}>
                  <span class="nc-menu__text nc-menu__text--stack">
                    <span>{o.label}</span>
                    <span class="nc-menu__desc nc-meta">{o.description}</span>
                  </span>
                </Show>
                <Show when={!props.multiple && on()}>
                  <Icon name="check" size="sm" class="nc-menu__check" />
                </Show>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}

export interface OptionPickerProps {
  options: QueryOption[]
  value: string[]
  multiple: boolean
  onChange: (v: string[]) => void
  label: string
  /** The list's own content (a picker of people or entities) in place of the plain options. */
  custom?: (close: () => void) => JSX.Element | null
}

/** Several options behind one trigger: the value as text, a popover with the list. */
export function OptionPicker(props: OptionPickerProps): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const close = () => {
    setOpen(false)
    queueMicrotask(() => trigger()?.focus())
  }
  const text = () => props.value.map((v) => props.options.find((o) => o.value === v)?.label ?? v).join(", ")
  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        class="nc-input nc-select nc-qrow__picker"
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={`${props.label}: ${text() || "none chosen"}`}
        onClick={() => setOpen(!open())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open()) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span class="nc-select__value" classList={{ "nc-select__value--placeholder": !text() }}>
          {text() || "Choose…"}
        </span>
        <Icon name="chevron-down" size="sm" class="nc-select__chevron" />
      </button>
      <PickerSurface open={open()} anchor={trigger()} matchWidth onClose={close} label={props.label}>
        <div class="nc-menu nc-qpop nc-qpop--list">
          {untrack(
            () =>
              props.custom?.(close) ?? (
                <OptionList
                  options={props.options}
                  value={props.value}
                  multiple={props.multiple}
                  label={props.label}
                  autoFocus
                  onToggle={(v) => {
                    if (!props.multiple) {
                      props.onChange([v])
                      close()
                    } else
                      props.onChange(
                        props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v],
                      )
                  }}
                />
              ),
          )}
        </div>
      </PickerSurface>
    </>
  )
}
