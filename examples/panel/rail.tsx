import {
  AppShell,
  EmptyState,
  Nav,
  PanelRail,
  PropertyList,
  ShellPanel,
  SidebarHeader,
  ViewHeader,
} from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The rail and its docked panels",
  note: "The rail at the window's right edge opens one panel at the right and one under the view. A panel's header is 44px, like the view's. Drag a panel's border to resize it. Close it with its button or the rail.",
  surface: "none",
}

export default function PanelRailExample() {
  const [right, setRight] = createSignal<string | undefined>("details")
  const [bottom, setBottom] = createSignal<string | undefined>()
  const toggle = (id: string) => {
    if (id === "details") setRight((r) => (r ? undefined : id))
    else setBottom((b) => (b ? undefined : id))
  }
  return (
    <div class="ex-shell-demo" style={{ height: "380px" }}>
      <AppShell
        foldBelow={0}
        sidebarHeader={<SidebarHeader />}
        sidebar={
          <Nav
            label="Atlas web"
            groups={[{ items: [{ label: "Issues", icon: "list-todo", current: true }] }]}
          />
        }
        rail={
          <PanelRail
            panels={[
              { id: "details", label: "Details", icon: "panel-right", at: "right", shortcut: "⌥ D" },
              { id: "terminal", label: "Terminal", icon: "terminal", at: "bottom", shortcut: "⌥ T" },
            ]}
            open={{ right: right(), bottom: bottom() }}
            onToggle={toggle}
          />
        }
        right={
          <Show when={right()}>
            <ShellPanel id="details" at="right" title="Details" onClose={() => setRight(undefined)}>
              <div class="ex-pad">
                <PropertyList
                  items={[
                    { label: "Status", value: "In review" },
                    { label: "Assignee", value: "Sarah Chen" },
                    { label: "Cycle", value: "Cycle 24" },
                  ]}
                />
              </div>
            </ShellPanel>
          </Show>
        }
        bottom={
          <Show when={bottom()}>
            <ShellPanel id="terminal" at="bottom" title="Terminal" onClose={() => setBottom(undefined)}>
              <pre class="ex-term">mira@build-01:~$ npm test</pre>
            </ShellPanel>
          </Show>
        }
      >
        <ViewHeader title="Issues" />
        <EmptyState title="Open a panel from the rail" />
      </AppShell>
    </div>
  )
}
