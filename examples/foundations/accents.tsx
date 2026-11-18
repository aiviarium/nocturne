import { ACCENTS, Badge, Button, Count, LabelChip, State, Switch, Tabs } from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { useNearestTheme } from "../_kit/theme"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The six presets",
  note: "Each card sets --accent on an element that also carries data-theme; bundle.css derives the rest. The primary button stays neutral in every accent.",
  surface: "well",
}

export default function Accents() {
  const [el, setEl] = createSignal<HTMLElement>()
  const theme = useNearestTheme(el)
  return (
    <div ref={setEl} class="ex-grid ex-grid--3">
      <For each={ACCENTS}>
        {(a) => (
          <div class="nc ex-view" data-theme={theme()} style={{ "--accent": a[theme()] }}>
            <div class="ex-view__body">
              <div class="nc-row">
                <span class="label">{a.name}</span>
                <span class="ex-spacer" />
                <span class="nc-mono nc-meta">{a[theme()]}</span>
              </div>
              <div class="nc-row">
                <Button size="sm" variant="primary">
                  Create
                </Button>
                <Button size="sm" variant="accent" icon="sparkle">
                  Generate
                </Button>
                <Count value={3} />
              </div>
              <Tabs
                variant="underline"
                label={`${a.name} tabs`}
                items={[
                  { id: "a", label: "Activity" },
                  { id: "b", label: "Files" },
                ]}
              />
              <div class="nc-row">
                <Switch label="On" defaultChecked />
                <LabelChip hue="accent">Feature</LabelChip>
                <Badge tone="accent">AI</Badge>
                <State status="ai">Working</State>
              </div>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}
