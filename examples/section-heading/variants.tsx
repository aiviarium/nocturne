import { Button, SectionHeading, State } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Count, link, button and state" }

export default function SectionHeadings() {
  return (
    <div class="nc-stack" style={{ gap: "16px" }}>
      <SectionHeading title="Pull requests" count={12} />
      <SectionHeading title="Activity" action={<a href="#section-heading">Inbox</a>} />
      <SectionHeading
        title="Widgets"
        action={
          <Button size="sm" variant="ghost" icon="edit">
            Customise
          </Button>
        }
      />
      <SectionHeading title="Agents" action={<State status="warn">2 need you</State>} />
    </div>
  )
}
