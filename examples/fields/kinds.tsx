import {
  Badge,
  configureFields,
  FIELD_KINDS,
  FieldEditor,
  FieldFilter,
  type FieldKindId,
  type FieldSpec,
  FieldValue,
  fieldText,
  isEmpty,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

const NAMES: Record<string, string> = {
  "customer://acme": "Acme Corp",
  "customer://globex": "Globex",
  "customer://initech": "Initech",
}

const files = new Map<string, { id: string; name: string; size: number; url: string }>()

// What the shell sets for the reference and file kinds: how an entity is drawn and how entities are found.
configureFields({
  refChip: (p) => (
    <Badge square icon="user">
      {NAMES[p.uri] ?? p.uri}
    </Badge>
  ),
  // A file is "stored" by keeping its name and size: the gallery has no blob store.
  uploadBlob: async (file) => {
    const id = `blob_${file.name}`
    files.set(id, { id, name: file.name, size: file.size, url: "#" })
    return files.get(id)!
  },
  blobInfo: async (id) => files.get(id) ?? { id, name: "datasheet.pdf", size: 183_000, url: "#" },
  searchRefs: async (q) =>
    Object.entries(NAMES)
      .filter(([, title]) => title.toLowerCase().includes(q.text.toLowerCase()))
      .map(([uri, title]) => ({ uri, title })),
})

export const meta: ExampleMeta = {
  title: "Every kind, every mode",
  note: "One row per kind, one column per mode: the cell of a table, the value, the editor that edits in place, the control of a form, the filter. Each is the kind's own implementation; edit one and the others follow.",
  surface: "card",
}

interface Sample {
  spec: FieldSpec
  value: unknown
}

const ENUM = [
  { value: "open", title: "Open", tone: "neutral" as const },
  { value: "review", title: "In review", tone: "accent" as const },
  { value: "won", title: "Won", tone: "positive" as const },
  { value: "lost", title: "Lost", tone: "negative" as const },
]

const SAMPLES: Sample[] = [
  { spec: { name: "text", title: "Text", kind: "text", maxLength: 80 }, value: "Warehouse refit" },
  {
    spec: { name: "longtext", title: "Long text", kind: "longtext" },
    value:
      "First line of a note.\nSecond line that wraps over the width of the column when it is long enough.",
  },
  { spec: { name: "number", title: "Number", kind: "number", min: 0, max: 100 }, value: 1234.5 },
  { spec: { name: "percent", title: "Percent", kind: "number", format: "percent" }, value: 45 },
  { spec: { name: "currency", title: "Currency", kind: "currency", currency: "EUR", min: 0 }, value: 90000 },
  {
    spec: { name: "boolean", title: "Boolean", kind: "boolean" },
    value: true,
  },
  {
    spec: {
      name: "titled",
      title: "Boolean, with words",
      kind: "boolean",
      trueTitle: "Needs attention",
      falseTitle: "Routine",
    },
    value: true,
  },
  { spec: { name: "date", title: "Date", kind: "date" }, value: "2026-12-01" },
  { spec: { name: "datetime", title: "Date and time", kind: "datetime" }, value: "2026-03-04T10:30:00.000Z" },
  { spec: { name: "enum", title: "Enum", kind: "enum", options: ENUM }, value: "review" },
  { spec: { name: "ref", title: "Reference", kind: "ref", scheme: "customer" }, value: "customer://acme" },
  {
    spec: { name: "refs", title: "References", kind: "ref", multiple: true, scheme: "customer" },
    value: ["customer://acme", "customer://globex", "customer://initech"],
  },
  { spec: { name: "tags", title: "Tags", kind: "tags" }, value: ["urgent", "q4"] },
  { spec: { name: "secret", title: "Secret", kind: "secret", stored: true }, value: undefined },
  { spec: { name: "json", title: "JSON", kind: "json", mono: true }, value: { retries: 3 } },
  {
    spec: { name: "richtext", title: "Rich text", kind: "richtext" },
    value: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "A formatted note" }] }],
    },
  },
  { spec: { name: "blob", title: "File", kind: "blob" }, value: "blob_01h" },
  { spec: { name: "bytes", title: "Bytes", kind: "bytes", maxBytes: 4096 }, value: new Uint8Array(2048) },
  {
    spec: { name: "vector", title: "Vector", kind: "vector", dimensions: 4 },
    value: new Float32Array([0.1, 0.2, 0.3, 0.4]),
  },
]

const KINDS = Object.keys(FIELD_KINDS) as FieldKindId[]

export default function Kinds() {
  const [values, setValues] = createSignal(SAMPLES.map((s) => s.value))
  const set = (i: number, v: unknown) => setValues((all) => all.map((x, at) => (at === i ? v : x)))
  const filterable = (s: FieldSpec) => !!FIELD_KINDS[s.kind].Filter
  return (
    <div class="ex-fields" data-part="field-kinds">
      <p class="nc-meta">{KINDS.length} kinds</p>
      <table class="ex-fields__table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Cell</th>
            <th>Value</th>
            <th>In place</th>
            <th>Form</th>
            <th>Filter</th>
            <th>Text</th>
          </tr>
        </thead>
        <tbody>
          <For each={SAMPLES}>
            {(s, i) => (
              <tr data-kind={s.spec.kind} data-sample={s.spec.name}>
                <th scope="row">{s.spec.title}</th>
                <td>
                  <FieldValue spec={s.spec} value={values()[i()]} compact />
                </td>
                <td>
                  <FieldValue spec={s.spec} value={values()[i()]} />
                </td>
                <td>
                  <FieldEditor
                    spec={s.spec}
                    value={values()[i()]}
                    variant="inline"
                    disabled={s.spec.kind === "vector"}
                    onCommit={(v) => set(i(), v)}
                  />
                </td>
                <td>
                  <FieldEditor
                    spec={s.spec}
                    value={values()[i()]}
                    variant="boxed"
                    disabled={s.spec.kind === "vector"}
                    onCommit={(v) => set(i(), v)}
                  />
                </td>
                <td>
                  {filterable(s.spec) ? (
                    <FieldFilter
                      spec={s.spec}
                      value={values()[i()]}
                      label={s.spec.title}
                      layout="row"
                      onChange={(v) => set(i(), v)}
                    />
                  ) : (
                    <span class="nc-meta">—</span>
                  )}
                </td>
                <td>
                  <code class="nc-mono">
                    {isEmpty(values()[i()]) ? "" : fieldText(s.spec, values()[i()])}
                  </code>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}
