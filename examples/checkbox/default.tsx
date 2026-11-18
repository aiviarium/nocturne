import { Checkbox } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Checkbox",
  note: "Part of a form, and a select-all over a group: it is mixed while some of the group are checked, a click on it checks all, a second clears all, and checking or clearing one in the group makes it mixed again.",
}

const HOSTS = ["build-01", "build-02", "staging-gateway"]

export default function Checkboxes() {
  const [picked, setPicked] = createSignal<Set<string>>(new Set(["build-01"]))
  const all = (): boolean | "mixed" =>
    picked().size === 0 ? false : picked().size === HOSTS.length ? true : "mixed"
  const toggle = (host: string, on: boolean) => {
    const next = new Set(picked())
    if (on) next.add(host)
    else next.delete(host)
    setPicked(next)
  }
  return (
    <div class="ex-col">
      <Checkbox label="Notify assignee" defaultChecked />
      <Checkbox label="Force" />
      <Checkbox label="Disabled" disabled />
      <Checkbox
        label="All hosts"
        checked={all()}
        onChange={(on) => setPicked(on === true ? new Set(HOSTS) : new Set())}
      />
      <div class="ex-col" style={{ "padding-left": "24px" }}>
        <For each={HOSTS}>
          {(host) => (
            <Checkbox
              label={host}
              checked={picked().has(host)}
              onChange={(on) => toggle(host, on === true)}
            />
          )}
        </For>
      </div>
    </div>
  )
}
