import { Button, SectionHeading } from "@aiviarium/nocturne"
import { Download, Upload } from "lucide"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A row of rare buttons",
  verdict: "dont",
  note: "A toolbar for things done twice a year, every time the section is shown.",
}

export default function EntryRow() {
  return (
    <div class="ex-col">
      <SectionHeading title="Members" count={12} />
      <div class="nc-row">
        <Button size="sm" iconNode={Download}>
          Export as CSV
        </Button>
        <Button size="sm" iconNode={Upload}>
          Import…
        </Button>
        <Button size="sm" icon="settings">
          Member settings
        </Button>
      </div>
      <span class="nc-muted">Mira Okonkwo, Jonas Lindqvist and 10 others.</span>
    </div>
  )
}
