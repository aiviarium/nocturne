import { InsetGroup, InsetList, InsetRow, NavigationScreen, Switch } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Inset list",
  note: "Grouped inset lists hold settings and pickers.",
  phone: true,
  screen: true,
  height: 520,
}

export default function PhoneSettings() {
  return (
    <NavigationScreen title="Settings" largeTitle>
      <InsetList>
        <InsetGroup title="Notifications" footer="Pushed to this device while the app is closed.">
          <InsetRow label="Approvals" trailing={<Switch aria-label="Approvals" checked />} />
          <InsetRow label="Mentions" trailing={<Switch aria-label="Mentions" />} />
          <InsetRow label="Sound" value="Chime" href="#inset-list" />
        </InsetGroup>
        <InsetGroup>
          <InsetRow label="Sign out" danger onClick={() => {}} />
        </InsetGroup>
      </InsetList>
    </NavigationScreen>
  )
}
