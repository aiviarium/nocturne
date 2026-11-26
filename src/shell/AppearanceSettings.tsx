// Settings › Appearance, also what the account menu's "Appearance…" opens: three rows that apply at once.
import type { JSX } from "@solidjs/web"
import { SettingRow } from "../components/SettingRow"
import { Switch } from "../components/Switch"
import { Tabs } from "../components/Tabs"
import { cx } from "../lib/cx"
import type { Appearance, ThemeChoice } from "./appearance"

export interface AppearanceSettingsProps {
  appearance: Appearance
  class?: string
}

/** The theme (System, Light, Dark), "Accent follows lens" and "Lens tint line", as setting rows. */
export function AppearanceSettings(props: AppearanceSettingsProps): JSX.Element {
  const a = () => props.appearance
  return (
    <div data-part="appearance-settings" class={cx("nc-appearance", props.class)}>
      <SettingRow
        title="Theme"
        description="System follows the computer's light or dark setting."
        control={
          <Tabs
            label="Theme"
            value={a().theme()}
            onChange={(id) => a().setTheme(id as ThemeChoice)}
            items={[
              { id: "system", label: "System" },
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
            ]}
          />
        }
      />
      <SettingRow
        title="Accent follows lens"
        description="Focus rings, the primary action and checked controls take the hue of the lens that is on. Off, the base accent stays everywhere."
        control={(ids) => (
          <Switch
            aria-labelledby={ids.labelId}
            checked={a().followLens()}
            onChange={(on) => a().setFollowLens(on)}
          />
        )}
      />
      <SettingRow
        title="Lens tint line"
        description="The line under the title bar takes the lens's hue. Off, it is the plain hairline."
        control={(ids) => (
          <Switch
            aria-labelledby={ids.labelId}
            checked={a().tintLine()}
            onChange={(on) => a().setTintLine(on)}
          />
        )}
      />
    </div>
  )
}
