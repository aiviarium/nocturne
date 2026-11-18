import { Select } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "With icons and descriptions" }

export default function HostSelect() {
  return (
    <div class="ex-narrow">
      <Select
        label="Environment"
        placeholder="Choose a host"
        options={[
          { value: "prod", label: "Production · eu-west", description: "3 sessions running", icon: "server" },
          { value: "stage", label: "Staging", description: "Idle", icon: "server" },
        ]}
      />
    </div>
  )
}
