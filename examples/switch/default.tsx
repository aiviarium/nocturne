import { Switch } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Switch", note: "A switch applies at once." }

export default function Switches() {
  return (
    <div class="ex-col">
      <Switch label="Unread only" defaultChecked />
      <Switch label="Reboot after apply" />
      <Switch label="Force, end sessions" danger defaultChecked />
      <Switch label="Disabled" disabled />
    </div>
  )
}
