// Settings › Appearance: the theme and the lens's accent, and whether the demo plays a desktop window.
import { AppearanceSettings, Card, SettingRow, type ShellViewProps, Switch } from "@aiviarium/nocturne"
import { useDemo } from "../context"
import { SettingsPage } from "./page"

export function AppearanceView(_: ShellViewProps) {
  const demo = useDemo()
  return (
    <SettingsPage id="appearance">
      <Card title="Appearance" padding="none">
        <AppearanceSettings appearance={demo.appearance} />
      </Card>
      <Card title="Window" padding="none">
        <SettingRow
          title="Desktop window"
          description="Plays the app as a desktop window: history arrows and window controls in the title bar."
          control={(ids) => (
            <Switch
              aria-labelledby={ids.labelId}
              checked={demo.runsIn() === "desktop"}
              onChange={(on) => demo.setRunsIn(on ? "desktop" : "browser")}
            />
          )}
        />
      </Card>
    </SettingsPage>
  )
}
