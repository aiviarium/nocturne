import { TextField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Search and mono" }

export default function SearchFields() {
  return (
    <div class="ex-col">
      <TextField label="Search" variant="search" placeholder="Search or jump to…" kbd="Ctrl K" />
      <TextField label="Filter sessions" variant="search" placeholder="Filter…" />
      <TextField
        label="Session id"
        mono
        defaultValue="s_7f2a"
        help="Mono for paths, IDs, tokens and durations."
      />
    </div>
  )
}
