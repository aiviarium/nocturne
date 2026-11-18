import { Card, type JsonSchema, SchemaForm } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Connect a host",
  note: "Required fields, an enum, a number with limits, a nested group, a list and a switch. Blank optional fields are left out of what it sends, numbers are numbers, and the untouched optional group is missing.",
  surface: "well",
}

const CONNECT: JsonSchema = {
  type: "object",
  required: ["name", "address"],
  properties: {
    name: { type: "string", description: "What people call this host.", minLength: 2, maxLength: 24 },
    address: { type: "string", format: "uri", description: "Where the host is reached." },
    region: { enum: ["eu-west", "us-east", "ap-south"], description: "Where it runs." },
    maxSessions: { type: "integer", minimum: 1, maximum: 64, default: 8, title: "Max sessions" },
    tags: { type: "array", items: { type: "string" }, description: "Shown beside the host in lists." },
    auth: {
      type: "object",
      title: "Authentication",
      required: ["user"],
      properties: {
        user: { type: "string" },
        keyPath: { type: "string", title: "Key path", description: "A private key on the server.s disk." },
      },
    },
    verify: { type: "boolean", title: "Check the host key", default: true },
  },
}

export default function ConnectHost() {
  const [sent, setSent] = createSignal("")
  return (
    <div class="ex-grid ex-grid--2">
      <Card>
        <SchemaForm
          schema={CONNECT}
          submitLabel="Connect host"
          onCancel={() => setSent("")}
          onSubmit={(v) => setSent(JSON.stringify(v))}
        />
      </Card>
      <Card title="What it sent">
        <pre class="nc-code ex-json" data-part="schema-form-value">
          {sent() || "Nothing yet. Press Connect host with the fields blank to see the messages."}
        </pre>
      </Card>
    </div>
  )
}
