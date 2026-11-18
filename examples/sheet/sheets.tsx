import {
  ActionSheet,
  InsetGroup,
  InsetList,
  InsetRow,
  NavigationScreen,
  PhoneOverride,
  Sheet,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sheets",
  note: "A sheet opens at its content's height when that fits; only taller content rests at medium and large. Drag between them or down to dismiss. Destructive confirmations and short choices are action sheets.",
  phone: true,
  screen: true,
  height: 760,
}

function Sheets() {
  const [sheet, setSheet] = createSignal<"short" | "tall" | null>(null)
  const [confirm, setConfirm] = createSignal(false)
  const [done, setDone] = createSignal("")
  return (
    <NavigationScreen title="Sheets" largeTitle>
      <InsetList>
        <InsetGroup title="Open a sheet" footer={done() || undefined}>
          <InsetRow
            label="Short sheet"
            detail="Rests at its content's height"
            onClick={() => setSheet("short")}
          />
          <InsetRow
            data-testid="open-tall-sheet"
            label="Tall sheet"
            detail="Taller than the screen: medium and large"
            onClick={() => setSheet("tall")}
          />
        </InsetGroup>
        <InsetGroup>
          <InsetRow label="Delete page…" danger onClick={() => setConfirm(true)} />
        </InsetGroup>
      </InsetList>
      <Sheet open={sheet() === "short"} title="Appearance" onClose={() => setSheet(null)} flush>
        <InsetList>
          <InsetGroup title="Theme">
            <InsetRow label="Dark" checked onClick={() => {}} />
            <InsetRow label="Light" checked={false} onClick={() => {}} />
          </InsetGroup>
        </InsetList>
      </Sheet>
      <Sheet open={sheet() === "tall"} title="Context" onClose={() => setSheet(null)} flush>
        <InsetList>
          <For each={["Session", "Sources", "Changes", "Pull requests"]}>
            {(g) => (
              <InsetGroup title={g}>
                <For each={[1, 2, 3, 4, 5]}>
                  {(n) => <InsetRow label={`${g} item ${n}`} detail="A second line" icon="file" />}
                </For>
              </InsetGroup>
            )}
          </For>
        </InsetList>
      </Sheet>
      <ActionSheet
        open={confirm()}
        onClose={() => setConfirm(false)}
        title="Delete this page?"
        message="Its subpages are deleted too."
        actions={[{ id: "delete", label: "Delete page", danger: true }]}
        onSelect={(id) => setDone(`Chose ${id}.`)}
      />
    </NavigationScreen>
  )
}

/** On a phone the sheets are what Dialog, Select and menus become; PhoneOverride shows them on any screen. */
export default function PhoneSheets() {
  return (
    <PhoneOverride.Provider value={true}>
      <Sheets />
    </PhoneOverride.Provider>
  )
}
