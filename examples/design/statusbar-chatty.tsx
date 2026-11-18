import { AppShell, Frame, Nav, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A status bar of things that are fine",
  note: "Connected, synced, a version and a count, all the time: when something does go wrong it is one more item in the strip.",
  surface: "none",
}

export default function StatusbarChatty() {
  return (
    <div class="ex-shell-demo">
      <AppShell
        sidebarWidth={160}
        statusbar={
          <div class="nc-row">
            <State status="live">Connected</State>
            <State status="ok">Synced</State>
            <span class="nc-meta">12 modules</span>
            <span class="nc-meta">v0.6.0</span>
          </div>
        }
        sidebar={
          <Nav
            label="Workspace"
            groups={[{ items: [{ label: "Home", icon: "home", href: "#s", current: true }] }]}
          />
        }
      >
        <Frame>
          <span class="nc-muted">The view.</span>
        </Frame>
      </AppShell>
    </div>
  )
}
