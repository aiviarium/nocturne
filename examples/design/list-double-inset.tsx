import { Card, ListRow, PropertyList, RowList, SectionHeading } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A list padded twice",
  note: "The same list without its variant: the card's padding and the list's own inset add up, so the titles sit 12px in from everything else and the fill floats inside the content.",
  surface: "well",
}

/** The plain variant inside a card's section, on purpose. */
export default function ListDoubleInset() {
  return (
    <Card title="Environment">
      <PropertyList items={[{ label: "Host", value: "host-01" }]} />
      <div>
        <SectionHeading title="Checkouts" count={2} />
        <RowList label="Checkouts">
          <ListRow icon="branch" title="main" meta="4m" selected onClick={() => {}} />
          <ListRow icon="branch" title="fix/safari-cookie" meta="1h" onClick={() => {}} />
        </RowList>
      </div>
    </Card>
  )
}
