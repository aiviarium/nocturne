import { Card, IconButton, ListRow, PropertyList, RowList, SectionHeading, State } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Lists in an inspector",
  note: "variant=\"inset\" fits a list into the card's padding wherever it sits in it: titles on the card's text edge, the selection fill 6px from its edge. variant=\"inline\" puts a short list in a property's value, 28px rows on the value's edge.",
  surface: "well",
}

export default function Inspector() {
  const [open, setOpen] = createSignal("WEB-212")
  return (
    <div class="ex-inspector">
      <Card title="WEB-208 Sign-in loops on Safari">
        <PropertyList
          items={[
            { label: "State", value: <State status="warn">Blocked</State> },
            { label: "Cycle", value: "Cycle 14" },
            {
              label: "Links",
              value: (
                <RowList label="Links" variant="inline">
                  <ListRow icon="link" title="Safari ITP notes" meta="docs" href="#links" />
                  <ListRow icon="branch" title="fix/safari-cookie" meta="PR 418" href="#links" />
                </RowList>
              ),
            },
          ]}
        />
        <section class="ex-col" style={{ gap: "var(--space-1)" }}>
          <SectionHeading
            title="Sub-issues"
            count={3}
            action={<IconButton size="sm" icon="plus" label="Add sub-issue" />}
          />
          <RowList label="Sub-issues" variant="inset">
            {["WEB-212", "WEB-213", "WEB-215"].map((id, i) => (
              <ListRow
                icon="list"
                title={["Repro on iOS 18", "Store the session cookie as SameSite=None", "Regression test"][i]}
                secondary={id}
                status={i === 0 ? <State status="ai">In progress</State> : undefined}
                selected={open() === id}
                onClick={() => setOpen(id)}
              />
            ))}
          </RowList>
        </section>
      </Card>
    </div>
  )
}
