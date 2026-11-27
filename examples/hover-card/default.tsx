import { Avatar, HoverCard, Icon } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Hover card",
  note: "Rest the pointer on the avatar. The card shows what the row has no room for: the title in full, the state, the checks.",
}

export default function HoverCards() {
  return (
    <div class="nc-row">
      <HoverCard
        placement="bottom-start"
        title="Give the arm64 deploy step room to pass its healthcheck"
        meta="Pull request 418 · Mira Okonkwo · 12m"
        rows={[
          { label: "State", value: <span style={{ color: "var(--danger)" }}>Checks failing</span> },
          { label: "Checks", value: "deploy-arm64 failing" },
          { label: "Branch", value: <span class="nc-mono">mira/arm64-healthcheck</span> },
        ]}
      >
        <span class="nc-row" style={{ gap: "6px" }}>
          <Avatar name="Mira Okonkwo" hue="orchid" size="sm" />
          <Icon name="git-pull-request" size="sm" tone="danger" />
        </span>
      </HoverCard>
    </div>
  )
}
