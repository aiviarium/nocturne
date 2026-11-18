import { ICON_PATHS, Icon, type IconName, TextField, toast } from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Every named icon",
  note: "The 48 core icons, then the Lucide icons @aiviarium/nocturne carries by name. Search, and click one to copy its JSX.",
  toasts: true,
}

const NAMES = Object.keys(ICON_PATHS) as IconName[]
const isCore = (name: IconName) => typeof ICON_PATHS[name] === "string"

export default function IconBrowser() {
  const [query, setQuery] = createSignal("")
  const shown = createMemo(() => NAMES.filter((n) => n.includes(query().trim().toLowerCase())))
  const copy = async (name: IconName) => {
    const jsx = `<Icon name="${name}" />`
    try {
      await navigator.clipboard.writeText(jsx)
      toast({ title: `Copied ${jsx}` })
    } catch {
      toast({ tone: "warning", title: "The clipboard is blocked here", description: jsx })
    }
  }
  return (
    <div class="ex-col">
      <div class="nc-row">
        <div class="ex-grow" style={{ "max-width": "320px" }}>
          <TextField
            variant="search"
            label="Search icons"
            placeholder="Search icons"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
        </div>
        <span class="nc-meta">
          {shown().length} of {NAMES.length}
        </span>
      </div>
      <Show when={shown().length > 0} fallback={<span class="nc-muted">No core icon is called that.</span>}>
        <For each={[true, false]}>
          {(core) => (
            <Show when={shown().some((n) => isCore(n) === core)}>
              <span class="label">{core ? "Core" : "Lucide, by name"}</span>
              <div class="ex-icons">
                <For each={shown().filter((n) => isCore(n) === core)}>
                  {(name) => (
                    <button
                      type="button"
                      class="ex-tile ex-tile--button"
                      title={`Copy <Icon name="${name}" />`}
                      onClick={() => copy(name)}
                    >
                      <Icon name={name} />
                      <span class="nc-mono">{name}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          )}
        </For>
      </Show>
    </div>
  )
}
