import { InlineField, PropertyList } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Title, text, mono and in a property list" }

export default function InlineFields() {
  const [title, setTitle] = createSignal("Move the ingest gateway to the new platform")
  const [estimate, setEstimate] = createSignal("3")
  return (
    <div class="nc-stack" style={{ gap: "12px", "max-width": "560px" }}>
      <InlineField variant="title" label="Title" value={title()} onCommit={setTitle} multiline />
      <InlineField label="Summary" placeholder="Add a summary" value="" onCommit={() => {}} />
      <InlineField variant="mono" label="Branch" value="feat/replicas" onCommit={() => {}} />
      <PropertyList
        items={[
          {
            label: "Estimate",
            value: <InlineField label="Estimate" value={estimate()} onCommit={setEstimate} />,
          },
          {
            label: "Read only",
            value: <InlineField label="Read only" value="Fixed on server" readOnly onCommit={() => {}} />,
          },
        ]}
      />
    </div>
  )
}
