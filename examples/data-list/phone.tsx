import { DataList, NavigationScreen } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "On a phone",
  note: "An iOS form group: swipe a row to the left to delete it, press and hold its edge for its menu and move the finger to drag it; the add row is in the accent.",
  phone: true,
  height: 460,
}

export default function PhoneEditor() {
  const [origins, setOrigins] = createSignal(["https://app.example.com", "http://localhost:4800"])
  return (
    <NavigationScreen title="Allowed origins" back={{ label: "Settings", onClick: () => {} }}>
      <div class="ex-phone-form">
        <DataList
          label="Allowed origins"
          itemName="Origin"
          value={origins()}
          onChange={setOrigins}
          placeholder="https://"
          mono
        />
        <p class="ex-phone-form__footer">Pages from these origins may embed the app.</p>
      </div>
    </NavigationScreen>
  )
}
