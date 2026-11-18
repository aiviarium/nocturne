import { AppShell, Frame, Nav, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sidebar and two frames",
  note: "The status bar holds only what is out of the ordinary: here, a dropped connection.",
  surface: "none",
}

export default function Shell() {
  return (
    <div class="ex-shell-demo">
      <AppShell
        sidebarWidth={200}
        statusbar={<State status="warn">Reconnecting…</State>}
        sidebar={
          <Nav
            label="Workspace"
            groups={[
              {
                label: "Workspace",
                items: [
                  { label: "Home", icon: "home", href: "#app-shell" },
                  { label: "Inbox", icon: "inbox", href: "#app-shell", current: true },
                  { label: "Agents", icon: "agent", href: "#app-shell" },
                ],
              },
            ]}
          />
        }
      >
        <Frame>
          <h3 class="heading ex-h">Inbox</h3>
          <span class="nc-muted">Primary frame.</span>
        </Frame>
        <Frame>
          <h3 class="heading ex-h">Details</h3>
          <span class="nc-muted">Second frame; it wraps under the first when narrow.</span>
        </Frame>
      </AppShell>
    </div>
  )
}
