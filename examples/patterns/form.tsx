import { Card, type JsonSchema, SchemaForm } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Settings from a schema, with a stored secret",
  note: "An integration declares its settings as JSON Schema; SchemaForm draws them. token is writeOnly and already stored: it is not required, shows as set, and is left out of what is sent when blank.",
  surface: "well",
}

const GITHUB: JsonSchema = {
  type: "object",
  required: ["owner"],
  properties: {
    owner: { type: "string", title: "Organisation", description: "Whose repositories to list." },
    token: {
      type: "string",
      writeOnly: true,
      title: "Access token",
      description: "A fine-grained token with read access.",
    },
    sync: { enum: ["hourly", "daily", "manual"], title: "Sync", default: "hourly" },
    notes: { type: "string", title: "Notes", "x-multiline": true },
    includeArchived: { type: "boolean", title: "Include archived repositories", default: false },
  },
}

export default function PluginSettings() {
  const [sent, setSent] = createSignal("")
  return (
    <div class="ex-grid ex-grid--2">
      <Card title="GitHub">
        <SchemaForm
          schema={GITHUB}
          storedSecrets={["token"]}
          value={{ owner: "acme" }}
          submitLabel="Save settings"
          onSubmit={(v) => setSent(JSON.stringify(v, null, 2))}
        />
      </Card>
      <Card title="What it sends">
        <pre class="nc-code ex-json">{sent() || "Press Save settings."}</pre>
      </Card>
    </div>
  )
}
