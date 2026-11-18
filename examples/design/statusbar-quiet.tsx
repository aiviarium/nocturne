import { AppShell, Frame, Nav, State, Switch } from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A status item only while it matters",
  verdict: "do",
  note: "Nothing while connected. Drop the connection: a word appears, and goes when it is back.",
  surface: "none",
}

export default function StatusbarQuiet() {
  const [down, setDown] = createSignal(false)
  return (
    <div class="ex-shell-demo">
      <AppShell
        sidebarWidth={160}
        statusbar={
          <Show when={down()}>
            <State status="warn">Reconnecting…</State>
          </Show>
        }
        sidebar={
          <Nav
            label="Workspace"
            groups={[{ items: [{ label: "Home", icon: "home", href: "#s", current: true }] }]}
          />
        }
      >
        <Frame>
          <Switch label="Drop the connection" checked={down()} onChange={setDown} />
        </Frame>
      </AppShell>
    </div>
  )
}
