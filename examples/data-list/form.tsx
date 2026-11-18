import { Button, DataList, TextField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Editable lists in a form",
  note: "The compact form: each row its fields, the add row last. A click selects a row and a drag from anywhere on it moves it; a double click edits the field under the pointer. Delete in its menu, or on the selected row, removes it. Enter goes to the next row (from the last, adds one), Backspace in an empty field removes it, the arrows move between rows and Alt and an arrow moves a row. A row says under it what is wrong with it.",
}

interface Variable {
  name: string
  value: string
}

const URL_OK = /^https?:\/\/[^\s/]+/

export default function Form() {
  const [tags, setTags] = createSignal(["web", "auth"])
  const [origins, setOrigins] = createSignal([
    "https://app.example.com",
    "http://localhost:4800",
    "example.dev",
  ])
  const [env, setEnv] = createSignal<Variable[]>([
    { name: "NODE_ENV", value: "production" },
    { name: "APP_BIND", value: "0.0.0.0:8080" },
  ])
  return (
    <form class="ex-form" onSubmit={(e) => e.preventDefault()}>
      <TextField label="Name" value="Sign-in service" />
      <div class="nc-field">
        <span class="nc-field__label" id="ex-tags">
          Tags
        </span>
        <DataList label="Tags" itemName="Tag" value={tags()} onChange={setTags} placeholder="Tag" />
      </div>
      <div class="nc-field">
        <span class="nc-field__label">Allowed origins</span>
        <DataList
          label="Allowed origins"
          itemName="Origin"
          value={origins()}
          onChange={setOrigins}
          placeholder="https://"
          mono
          invalid={(v) => (v && !URL_OK.test(v) ? "Start with http:// or https://" : undefined)}
        />
      </div>
      <div class="nc-field">
        <span class="nc-field__label">Environment</span>
        <DataList
          label="Environment"
          itemName="Variable"
          itemLabel={(v, i) => v.name || `Variable ${i + 1}`}
          value={env()}
          onChange={setEnv}
          create={() => ({ name: "", value: "" })}
          fields={[
            {
              id: "name",
              label: "Name",
              placeholder: "NAME",
              mono: true,
              width: "minmax(0, 2fr)",
              value: (v) => v.name,
              set: (v, name) => ({ ...v, name: name.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }),
            },
            {
              id: "value",
              label: "Value",
              placeholder: "value",
              mono: true,
              width: "minmax(0, 3fr)",
              value: (v) => v.value,
              set: (v, value) => ({ ...v, value }),
            },
          ]}
        />
      </div>
      <div class="ex-row">
        <Button variant="primary">Save</Button>
      </div>
    </form>
  )
}
