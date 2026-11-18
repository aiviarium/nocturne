import { ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The row's background says the state",
  note: "Status tints behind whole rows with an edge bar: the list turns into a colour chart, and the state has no word.",
}

export default function TintedRows() {
  return (
    <RowList label="Pull requests">
      <div class="ex-tinted-row" style={{ "--hue": "var(--danger)", "--hue-tint": "var(--danger-tint)" }}>
        <ListRow icon="branch" title="Move the read replicas" meta="36m" />
      </div>
      <div class="ex-tinted-row" style={{ "--hue": "var(--warning)", "--hue-tint": "var(--warning-tint)" }}>
        <ListRow icon="branch" title="Raise the connection cap" meta="40m" />
      </div>
      <ListRow icon="branch" title="Contrast of muted labels" meta="2h" />
    </RowList>
  )
}
