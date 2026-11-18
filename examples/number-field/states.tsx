import { NumberField } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Error, disabled, read-only" }

export default function NumberStates() {
  return (
    <div class="ex-grid ex-grid--3">
      <NumberField label="Port" defaultValue={70000} error="Use a port from 1 to 65535." />
      <NumberField label="Replicas" defaultValue={3} disabled />
      <NumberField label="Region quota" defaultValue={12} readOnly unit="vCPU" />
    </div>
  )
}
