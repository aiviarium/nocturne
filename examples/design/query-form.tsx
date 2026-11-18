import { Select, TextField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A form of every filter",
  verdict: "dont",
  note: "A captioned field for every possible filter, most of them empty, takes rows above the list and still cannot say “or”.",
}

export default function QueryFormBad() {
  return (
    <div class="ex-grid ex-grid--2">
      <Select label="State" placeholder="Any" options={[{ value: "open", label: "Open" }]} />
      <Select label="Assignee" placeholder="Anyone" options={[{ value: "me", label: "Me" }]} />
      <TextField label="Estimate from" placeholder="Min" />
      <TextField label="Estimate to" placeholder="Max" />
      <TextField label="Due before" placeholder="Date" />
      <TextField label="Title contains" placeholder="Text" />
    </div>
  )
}
