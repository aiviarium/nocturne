// A person picker for QueryBuilder's `renderPicker` slot: people with avatars. A real one would search the
// space's members; the slot gives it the field, the value and a way to set it.
import { Avatar, Icon, type QueryPickerContext } from "@aiviarium/nocturne"
import { For, onMount, Show } from "solid-js"

export function PeoplePicker(ctx: QueryPickerContext) {
  const chosen = () => (Array.isArray(ctx.value) ? ctx.value : ctx.value ? [ctx.value] : [])
  let first: HTMLButtonElement | undefined
  onMount(() => queueMicrotask(() => first?.focus()))
  return (
    <div class="ex-picker" role="group" aria-label={ctx.field.label}>
      <For each={ctx.field.options ?? []}>
        {(person, i) => (
          <button
            ref={(el) => {
              if (i() === 0) first = el
            }}
            type="button"
            class="nc-menu__item ex-picker__item"
            aria-pressed={chosen().includes(person.value)}
            onClick={() => {
              if (!ctx.multiple) return ctx.onChange(person.value)
              const now = chosen()
              ctx.onChange(
                now.includes(person.value) ? now.filter((v) => v !== person.value) : [...now, person.value],
              )
            }}
          >
            <Avatar name={person.label} size="sm" />
            <span class="nc-menu__text">{person.label}</span>
            <Show when={chosen().includes(person.value)}>
              <Icon name="check" size="sm" class="nc-menu__check" />
            </Show>
          </button>
        )}
      </For>
    </div>
  )
}
