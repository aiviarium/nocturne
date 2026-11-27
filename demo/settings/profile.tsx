// Settings › Profile: the person's own fields, each a field kind of the library, saved as it is left.
import {
  Card,
  FieldEditor,
  type FieldSpec,
  FormField,
  refusalMessage,
  type ShellViewProps,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { SettingsPage } from "./page"

const FIELDS: FieldSpec[] = [
  { name: "name", title: "Name", kind: "text", required: true, maxLength: 40 },
  { name: "email", title: "Email", kind: "text", format: "email", required: true },
  { name: "pronouns", title: "Pronouns", kind: "text", maxLength: 20 },
  {
    name: "timezone",
    title: "Time zone",
    kind: "enum",
    required: true,
    options: [
      { value: "Europe/Berlin", title: "Europe/Berlin" },
      { value: "Europe/Lisbon", title: "Europe/Lisbon" },
      { value: "America/New_York", title: "America/New_York" },
      { value: "Asia/Tokyo", title: "Asia/Tokyo" },
    ],
  },
  { name: "available", title: "Available for reviews", kind: "boolean" },
  { name: "away", title: "Away until", kind: "date" },
  { name: "skills", title: "Skills", kind: "tags" },
  { name: "bio", title: "About", kind: "longtext", maxLength: 280 },
  {
    name: "token",
    title: "GitHub token",
    kind: "secret",
    stored: true,
    help: "Used to link pull requests to issues.",
  },
]

export function ProfileView(_: ShellViewProps) {
  const [values, setValues] = createSignal<Record<string, unknown>>({
    name: "Mira Okonkwo",
    email: "mira@acme.dev",
    timezone: "Europe/Berlin",
    available: true,
    skills: ["deploys", "auth"],
  })
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const commit = (f: FieldSpec, v: unknown) => {
    const text = typeof v === "string" ? v : ""
    const refused =
      f.required && (v === null || v === "")
        ? refusalMessage(f, { constraint: "required" })
        : f.format === "email" && text && !/^[^@\s]+@[^@\s]+$/.test(text)
          ? refusalMessage(f, { constraint: "pattern" })
          : undefined
    setErrors((e) => ({ ...e, [f.name]: refused ?? "" }))
    if (refused) return
    setValues((all) => ({ ...all, [f.name]: v }))
    toast({ title: `${f.title} saved`, tone: "success", duration: 2000 })
  }
  return (
    <SettingsPage id="profile">
      <Card title="Profile">
        <div class="dm-settings-form">
          <For each={FIELDS}>
            {(f) => (
              <FormField spec={f} error={errors()[f.name] || undefined}>
                <FieldEditor
                  spec={f}
                  value={values()[f.name]}
                  variant="boxed"
                  commit="leave"
                  error={errors()[f.name] || undefined}
                  onTouch={() => setErrors((e) => ({ ...e, [f.name]: "" }))}
                  onCommit={(v) => commit(f, v)}
                />
              </FormField>
            )}
          </For>
        </div>
      </Card>
    </SettingsPage>
  )
}
