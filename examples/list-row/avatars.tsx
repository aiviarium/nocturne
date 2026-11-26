import { Avatar, ListRow, RowList } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "With avatars" }

export default function AvatarRows() {
  return (
    <RowList label="People">
      <ListRow
        leading={<Avatar name="Mira Okonkwo" size="sm" />}
        title="Mira Okonkwo"
        secondary="mira@dev.local"
        meta="Admin"
        onClick={() => {}}
      />
      <ListRow
        leading={<Avatar name="Jonas Lindqvist" size="sm" />}
        title="Jonas Lindqvist"
        secondary="jonas@dev.local"
        meta="Member"
        onClick={() => {}}
      />
    </RowList>
  )
}
