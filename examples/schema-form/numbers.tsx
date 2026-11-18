import { Card, type JsonSchema, SchemaForm } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Numbers and sliders",
  note: 'number and integer schemas are NumberFields (x-unit adds the unit); a number with both bounds and "x-control": "slider" is a Slider with a field for the exact value.',
  surface: "well",
}

const RUNNER: JsonSchema = {
  type: "object",
  required: ["replicas"],
  properties: {
    replicas: { type: "integer", minimum: 1, maximum: 64, default: 2, description: "Runners kept warm." },
    timeout: {
      type: "number",
      minimum: 0,
      "x-unit": "min",
      title: "Timeout",
      description: "Type 90 or 1.5*60.",
    },
    cpu: {
      type: "number",
      minimum: 0.5,
      maximum: 8,
      multipleOf: 0.5,
      default: 2,
      "x-control": "slider",
      "x-unit": "cores",
      title: "CPU",
    },
  },
}

export default function NumberSchema() {
  const [sent, setSent] = createSignal("")
  return (
    <div class="ex-grid ex-grid--2">
      <Card>
        <SchemaForm schema={RUNNER} submitLabel="Save runner" onSubmit={(v) => setSent(JSON.stringify(v))} />
      </Card>
      <Card title="What it sent">
        <pre class="nc-code ex-json">{sent() || "Nothing yet."}</pre>
      </Card>
    </div>
  )
}
