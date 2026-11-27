// Settings › General: the workspace's name and defaults, and the person's notifications. A change applies at once.
import {
  Card,
  Checkbox,
  InfoTip,
  NumberField,
  RadioGroup,
  RangeSlider,
  Select,
  SettingRow,
  type ShellViewProps,
  Slider,
  Switch,
  TextField,
} from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { SettingsPage } from "./page"

const hour = (h: number) => `${String(h).padStart(2, "0")}:00`

export function GeneralView(_: ShellViewProps) {
  const [name, setName] = createSignal("Acme")
  const [lens, setLens] = createSignal("build")
  const [week, setWeek] = createSignal<"monday" | "sunday">("monday")
  const [keep, setKeep] = createSignal<number | null>(90)
  const [digest, setDigest] = createSignal(true)
  const [hours, setHours] = createSignal<[number, number]>([8, 20])
  const [volume, setVolume] = createSignal(60)
  const [about, setAbout] = createSignal({ mentions: true, reviews: true, deploys: false })
  const toggle = (k: keyof ReturnType<typeof about>) => (on: boolean) => setAbout((a) => ({ ...a, [k]: on }))
  return (
    <SettingsPage id="general">
      <Card title="Workspace" padding="none">
        <SettingRow
          title="Name"
          description="Shown in the path and the window's title."
          control={(ids) => (
            <TextField
              aria-labelledby={ids.labelId}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
            />
          )}
        />
        <SettingRow
          title="Lens for new projects"
          description="The lens a project opens with until someone picks another."
          modified={lens() !== "explore"}
          onReset={() => setLens("explore")}
          control={(ids) => (
            <Select
              aria-labelledby={ids.labelId}
              value={lens()}
              onChange={setLens}
              options={[
                { value: "explore", label: "Explore", icon: "sparkle" },
                { value: "product", label: "Product", icon: "book-open" },
                { value: "build", label: "Build", icon: "code" },
              ]}
            />
          )}
        />
        <SettingRow
          title="Week starts on"
          control={
            <RadioGroup
              label="Week starts on"
              value={week()}
              onChange={setWeek}
              options={[
                { value: "monday", label: "Monday" },
                { value: "sunday", label: "Sunday" },
              ]}
            />
          }
        />
        <SettingRow
          title="Keep closed issues"
          description="After this, closed issues move to the archive."
          control={(ids) => (
            <NumberField
              aria-labelledby={ids.labelId}
              integer
              min={7}
              max={365}
              unit="days"
              value={keep()}
              onCommit={setKeep}
            />
          )}
        />
      </Card>
      <Card title="Notifications" padding="none">
        <SettingRow
          title="Daily digest"
          description="One email at 08:00 with what changed in your projects."
          control={(ids) => <Switch aria-labelledby={ids.labelId} checked={digest()} onChange={setDigest} />}
        />
        <div class="dm-settings-block">
          <RangeSlider
            label="Push notifications between"
            min={0}
            max={24}
            step={1}
            minDistance={1}
            value={hours()}
            onChange={setHours}
            format={hour}
            thumbLabels={["From", "Until"]}
          />
          <Slider
            label="Sound volume"
            min={0}
            max={100}
            step={5}
            value={volume()}
            onChange={setVolume}
            unit="%"
          />
        </div>
        <div class="dm-settings-checks" role="group" aria-labelledby="dm-notify-about">
          <span id="dm-notify-about" class="dm-row">
            Notify me about
            <InfoTip label="Notify me about">
              Each kind arrives in the inbox, and by push between the hours above.
            </InfoTip>
          </span>
          <Checkbox label="Mentions" checked={about().mentions} onChange={toggle("mentions")} />
          <Checkbox label="Review requests" checked={about().reviews} onChange={toggle("reviews")} />
          <Checkbox label="Failed deploys" checked={about().deploys} onChange={toggle("deploys")} />
        </div>
      </Card>
    </SettingsPage>
  )
}
