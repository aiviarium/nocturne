import { InsetGroup, InsetList, InsetRow, NavigationScreen, Slider, Switch } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "On a phone",
  note: "A 44px hit area around a compact 4px track and a 22px thumb, in grouped rows as in iOS Settings.",
  phone: true,
  screen: true,
  height: 520,
}

export default function PhoneSliders() {
  const [volume, setVolume] = createSignal(60)
  const [size, setSize] = createSignal(2)
  return (
    <NavigationScreen title="Settings">
      <InsetList>
        <InsetGroup title="Sound">
          <InsetRow label={<Slider aria-label="Volume" value={volume()} onChange={setVolume} />} />
          <InsetRow label="Play on approval" trailing={<Switch aria-label="Play on approval" checked />} />
        </InsetGroup>
        <InsetGroup title="Text size" footer="Applies to chats and documents.">
          <InsetRow
            label={
              <Slider
                aria-label="Text size"
                value={size()}
                onChange={setSize}
                min={0}
                max={4}
                ticks
                format={(v) => ["Smallest", "Small", "Default", "Large", "Largest"][v] ?? String(v)}
              />
            }
          />
        </InsetGroup>
      </InsetList>
    </NavigationScreen>
  )
}
