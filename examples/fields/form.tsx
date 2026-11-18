import { Button, Dialog, FieldEditor, type FieldSpec, FormField, refusalMessage } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A form of every kind",
  note: "The rows of a create dialog, a connection form and a params dialog: label above, control, and what was refused under the field in words that do not repeat its name.",
  surface: "card",
}

const FIELDS: FieldSpec[] = [
  { name: "title", title: "Title", kind: "text", required: true, maxLength: 20 },
  { name: "notes", title: "Notes", kind: "longtext" },
  { name: "budget", title: "Budget", kind: "currency", currency: "EUR", min: 0 },
  { name: "progress", title: "Progress", kind: "number", format: "percent", max: 100 },
  { name: "urgent", title: "Urgent", kind: "boolean", trueTitle: "Needs attention", falseTitle: "Routine" },
  { name: "closeOn", title: "Close date", kind: "date" },
  { name: "reviewAt", title: "Review at", kind: "datetime" },
  {
    name: "state",
    title: "State",
    kind: "enum",
    required: true,
    options: [
      { value: "open", title: "Open", tone: "neutral" },
      { value: "review", title: "In review", tone: "accent" },
    ],
  },
  { name: "tags", title: "Tags", kind: "tags" },
  { name: "token", title: "API token", kind: "secret", stored: true },
]

export default function Form() {
  const [values, setValues] = createSignal<Record<string, unknown>>({
    title: "A title that is much too long for the field",
    budget: -5,
    urgent: true,
    closeOn: "2026-12-01",
    state: "review",
    tags: ["q4"],
  })
  const [open, setOpen] = createSignal(false)
  const errors = (): Record<string, string> => ({
    title: refusalMessage(FIELDS[0], { constraint: "maxLength" }),
    budget: refusalMessage(FIELDS[2], { constraint: "min" }),
  })
  const form = () => (
    <div class="ex-fields__form">
      <For each={FIELDS}>
        {(f) => (
          <FormField spec={f} error={errors()[f.name]}>
            <FieldEditor
              spec={f}
              value={values()[f.name]}
              variant="boxed"
              error={errors()[f.name]}
              onCommit={(v) => setValues((all) => ({ ...all, [f.name]: v }))}
            />
          </FormField>
        )}
      </For>
    </div>
  )
  return (
    <div>
      <Button onClick={() => setOpen(true)} data-part="open-form-dialog">
        Open as a dialog
      </Button>
      <div data-part="form-inline">{form()}</div>
      <Dialog
        open={open()}
        onClose={() => setOpen(false)}
        title="New deal"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Create</Button>
          </>
        }
      >
        {form()}
      </Dialog>
    </div>
  )
}
