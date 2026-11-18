import { Button, IconButton, Select, TextField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Buttons and inputs" }

export default function ButtonsAndInputs() {
  return (
    <div class="ex-col">
      <div class="nc-row">
        <Button variant="primary">Create</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="accent" icon="sparkle">
          Generate
        </Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Disabled</Button>
        <IconButton label="Filter" icon="filter" />
        <IconButton label="More" icon="more" />
      </div>
      <div class="ex-grid ex-grid--2">
        <TextField variant="search" label="Search" placeholder="Search or jump to…" kbd="Ctrl K" />
        <Select
          label="Environment"
          aria-label="Environment"
          defaultValue="prod"
          options={[
            { value: "prod", label: "Production · eu-west" },
            { value: "stage", label: "Staging" },
          ]}
        />
      </div>
      <TextField
        label="Issue title"
        defaultValue="Add an empty state to the activity feed"
        help="Help text sits below in text-3."
      />
    </div>
  )
}
