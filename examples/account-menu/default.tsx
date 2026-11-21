import { AccountMenu, type ThemePreference } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The account at the foot of the sidebar",
  note: 'Open it: who is signed in, the app\'s items, the theme as one row of three icons and sign out last. In a top bar, `trigger="avatar"` shows the avatar alone.',
  height: 340,
}

export default function AccountMenuDefault() {
  const [theme, setTheme] = createSignal<ThemePreference>("system")
  return (
    <div class="ex-col" style={{ width: "232px" }}>
      <AccountMenu
        name="Sarah Chen"
        detail="sarah@example.test"
        badge="Admin"
        items={[
          { id: "settings", label: "Settings", icon: "settings" },
          { id: "keys", label: "Keyboard shortcuts", icon: "keyboard" },
        ]}
        theme={{ value: theme(), onChange: setTheme }}
        onSignOut={() => {}}
      />
    </div>
  )
}
