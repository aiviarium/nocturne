import { Switch, TitleBar, TitleBarItem } from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A status item only while it matters",
  verdict: "do",
  note: "Nothing while connected. Drop the connection: a word appears in the title bar, and goes when it is back.",
  surface: "none",
}

export default function StatusbarQuiet() {
  const [down, setDown] = createSignal(false)
  return (
    <div class="ex-window">
      <TitleBar
        runsIn="browser"
        keys={false}
        path={[{ id: "acme", label: "Acme" }]}
        status={
          <Show when={down()}>
            <TitleBarItem icon="refresh-cw" label="Reconnecting…" tone="warning" />
          </Show>
        }
      />
      <div class="ex-window__body">
        <Switch label="Drop the connection" checked={down()} onChange={setDown} />
      </div>
    </div>
  )
}
