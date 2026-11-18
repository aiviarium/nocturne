import { Select } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Help and error",
  note: "An error says how to fix it. Its danger edge stays on hover, and focus draws the ring in danger, so the error stays visible while it is fixed.",
}

export default function HostSelect() {
  const [host, setHost] = createSignal<string>()
  return (
    <div class="ex-narrow">
      <Select
        label="Host"
        placeholder="Choose a host"
        value={host()}
        onChange={setHost}
        help="Where the session runs."
        error={host() ? undefined : "Choose a host to start the session on."}
        options={[
          { value: "build-01", label: "build-01" },
          { value: "build-02", label: "build-02" },
        ]}
      />
    </div>
  )
}
