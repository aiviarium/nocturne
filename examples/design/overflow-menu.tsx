import { DropdownMenu, IconButton, SectionHeading } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Rare actions behind the overflow",
  note: "Export, import and settings are used a few times a year: one icon button in the row that is already there.",
}

export default function OverflowMenu() {
  return (
    <div class="ex-col">
      <SectionHeading
        title="Members"
        count={12}
        action={
          <DropdownMenu
            label="Members"
            placement="bottom-end"
            items={[
              { id: "export", label: "Export as CSV" },
              { id: "import", label: "Import…" },
              { type: "separator" },
              { id: "settings", label: "Member settings", icon: "settings" },
            ]}
            trigger={(tp) => <IconButton size="sm" label="More" icon="more" tooltip={false} {...tp} />}
          />
        }
      />
      <span class="nc-muted">Mira Okonkwo, Jonas Lindqvist and 10 others.</span>
    </div>
  )
}
