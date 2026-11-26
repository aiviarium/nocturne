import { AccountMenu, AppShell, EmptyState, Nav, SidebarHeader, ViewHeader } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The sidebar folds to an icon rail",
  note: "Press the minimise button, or drag the sidebar's edge below 140px. The places stay as icons with tooltips, a child's count becomes a dot and the account becomes its avatar. The unfold button brings back the last width.",
  surface: "none",
}

export default function FoldRail() {
  const [folded, setFolded] = createSignal(false)
  const [current, setCurrent] = createSignal("issues")
  const item = (
    id: string,
    label: string,
    icon: "inbox" | "list-todo" | "refresh-cw" | "agent",
    count?: number,
  ) => ({
    id,
    label,
    icon,
    count,
    current: current() === id,
    onClick: () => setCurrent(id),
  })
  return (
    <div class="ex-shell-demo" style={{ height: "360px" }}>
      <AppShell
        foldBelow={0}
        sidebarFolded={folded()}
        onSidebarFoldedChange={setFolded}
        sidebarHeader={<SidebarHeader />}
        sidebar={
          <Nav
            label="Atlas web"
            groups={[
              {
                items: [
                  item("triage", "Triage", "inbox", 4),
                  {
                    ...item("issues", "Issues", "list-todo"),
                    items: [
                      { id: "active", label: "Active", count: 6, onClick: () => setCurrent("issues") },
                      { id: "backlog", label: "Backlog", onClick: () => setCurrent("issues") },
                    ],
                  },
                  item("cycles", "Cycles", "refresh-cw"),
                  item("agents", "Agents", "agent", 2),
                ],
              },
            ]}
          />
        }
        sidebarFoot={<AccountMenu name="Mira Okonkwo" detail="mira@acme.dev" onSignOut={() => {}} />}
      >
        <ViewHeader title={current()[0]!.toUpperCase() + current().slice(1)} />
        <EmptyState title="Nothing here yet" description="Fold the sidebar and the view takes the room." />
      </AppShell>
    </div>
  )
}
