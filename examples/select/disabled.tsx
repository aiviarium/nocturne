import { Select } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Disabled" }

export default function LockedSelect() {
  return (
    <div class="ex-narrow">
      <Select label="Locked" defaultValue="a" disabled options={[{ value: "a", label: "Fixed on server" }]} />
    </div>
  )
}
