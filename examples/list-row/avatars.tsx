import { Avatar, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Comfortable, with avatars" }

export default function AvatarRows() {
  return (
    <RowList label="People">
      <ListRow
        density="comfortable"
        leading={<Avatar name="Mira Okonkwo" size="sm" />}
        title="Mira Okonkwo"
        secondary="mira@dev.local"
        meta="Admin"
        onClick={() => {}}
      />
      <ListRow
        density="comfortable"
        leading={<Avatar name="Jonas Lindqvist" size="sm" />}
        title="Jonas Lindqvist"
        secondary="jonas@dev.local"
        meta="Member"
        onClick={() => {}}
      />
    </RowList>
  )
}
