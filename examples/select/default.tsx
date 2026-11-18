import { Select } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Default, with a disabled option" }

export default function ScopeSelect() {
  const [scope, setScope] = createSignal("workspace")
  return (
    <div class="ex-col ex-narrow">
      <Select
        label="Scope"
        value={scope()}
        onChange={setScope}
        options={[
          { value: "user", label: "User" },
          { value: "workspace", label: "Workspace" },
          { value: "folder", label: "Folder", disabled: true },
        ]}
      />
      <span class="nc-meta">Value: {scope()}</span>
    </div>
  )
}
