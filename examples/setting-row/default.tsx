import { Card, NumberField, Select, SettingRow, Switch, TextField } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Setting rows",
  note: "A change applies at once. A modified row has an accent edge, and its chip resets it.",
}

export default function SettingRows() {
  const [notify, setNotify] = createSignal(false)
  const [batch, setBatch] = createSignal<number | null>(4)
  return (
    <Card title="General" padding="none">
      <SettingRow
        title="Name"
        description="The name the sidebar and the browser tab show."
        name="rookery/instance_name"
        inherited="Default"
        control={(ids) => <TextField aria-labelledby={ids.labelId} defaultValue="Rookery" />}
      />
      <SettingRow
        category="Jobs"
        title="Batch size"
        description="How many hosts a roll-out works at once."
        name="rookery/batch"
        modified={batch() !== 4}
        onReset={() => setBatch(4)}
        control={(ids) => (
          <NumberField
            aria-labelledby={ids.labelId}
            integer
            min={1}
            max={50}
            unit="hosts"
            value={batch()}
            onCommit={setBatch}
          />
        )}
      />
      <SettingRow
        title="Time zone"
        description="Times and schedules show in it."
        name="rookery/timezone"
        inherited="From Server"
        control={(ids) => (
          <Select
            aria-labelledby={ids.labelId}
            defaultValue="UTC"
            options={[
              { value: "UTC", label: "UTC" },
              { value: "Europe/Berlin", label: "Europe/Berlin" },
            ]}
          />
        )}
      />
      <SettingRow
        title="Notifications"
        description="Tell me when a job I started ends."
        name="rookery/notifications"
        modified={notify()}
        onReset={() => setNotify(false)}
        control={(ids) => <Switch aria-labelledby={ids.labelId} checked={notify()} onChange={setNotify} />}
      />
      <SettingRow
        title="Data region"
        name="rookery/region"
        locked
        control={<TextField aria-label="Data region" defaultValue="eu-1" disabled />}
      />
    </Card>
  )
}
