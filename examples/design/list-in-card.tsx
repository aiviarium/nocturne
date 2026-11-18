import { Card, ListRow, PropertyList, RowList, SectionHeading } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A list set into its card",
  note: "variant=\"inset\": the titles start on the card's text edge, under the property labels, and the selection fill is 6px from the card's edge.",
  surface: "well",
}

export default function ListInCard() {
  return (
    <Card title="Environment">
      <PropertyList items={[{ label: "Host", value: "host-01" }]} />
      <div>
        <SectionHeading title="Checkouts" count={2} />
        <RowList label="Checkouts" variant="inset">
          <ListRow icon="branch" title="main" meta="4m" selected onClick={() => {}} />
          <ListRow icon="branch" title="fix/safari-cookie" meta="1h" onClick={() => {}} />
        </RowList>
      </div>
    </Card>
  )
}
