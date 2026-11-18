import {
  Avatar,
  AvatarStack,
  Badge,
  Callout,
  Delta,
  IdBadge,
  Kbd,
  LabelChip,
  State,
} from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Chips, badges, avatars, state" }

export default function ChipsAndState() {
  return (
    <div class="ex-col">
      <div class="nc-row">
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Needs you</Badge>
        <Badge tone="danger">Blocked</Badge>
        <Badge tone="info">In review</Badge>
        <Badge tone="accent">AI</Badge>
        <Delta direction="up" value="4.2%" />
        <Delta direction="down" value="8%" />
        <IdBadge>TSK-41</IdBadge>
        <Kbd keys="Ctrl K" />
      </div>
      <div class="nc-row">
        <LabelChip hue="accent">Feature</LabelChip>
        <LabelChip hue="danger">Bug</LabelChip>
        <LabelChip hue="orchid">Design</LabelChip>
        <LabelChip hue="teal">Research</LabelChip>
      </div>
      <div class="nc-row ex-gap-lg">
        <Avatar name="Sarah Chen" />
        <AvatarStack
          people={[
            { name: "Eli Wong" },
            { name: "Jo Cruz" },
            { name: "Lena Fox" },
            { name: "Mo Ali" },
            { name: "Ana Diaz" },
          ]}
          max={3}
        />
        <Avatar kind="agent" name="Atlas" hue="amber" />
        <Avatar kind="ai" />
        <State status="live">Running</State>
        <State status="ai">Working</State>
        <State status="warn">Needs you</State>
        <State status="error">Failed</State>
        <State status="off">Offline</State>
      </div>
      <Callout tone="warning" code="409">
        3 sessions are running. Rebooting ends them.
      </Callout>
    </div>
  )
}
