import { DataList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "One field-like group",
  verdict: "do",
  note: "The list is one box like a field: each row a field and a quiet remove, the add row last.",
}

export default function DataListGroup() {
  const [tags, setTags] = createSignal(["web", "auth", "safari"])
  return (
    <div class="nc-field ex-form">
      <span class="nc-field__label">Tags</span>
      <DataList label="Tags" itemName="Tag" value={tags()} onChange={setTags} />
    </div>
  )
}
