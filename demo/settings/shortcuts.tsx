// Settings › Keyboard shortcuts: the keys the shell binds, in the groups a person looks for them by.
import { Card, Kbd, KbdGroup, ListRow, RowList, type ShellViewProps } from "@aiviarium/nocturne"
import { For } from "solid-js"
import { SettingsPage } from "./page"

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = mac ? "⌘" : "Ctrl"

/** A shortcut: a run of keys pressed together, or with `or` another run that does the same. */
type Keys = string[] | { or: string[][] }

const GROUPS: Array<{ title: string; items: Array<{ label: string; keys: Keys }> }> = [
  {
    title: "Window",
    items: [
      { label: "Command palette", keys: [MOD, "K"] },
      {
        label: "Back",
        keys: {
          or: [
            [MOD, "["],
            ["Alt", "←"],
          ],
        },
      },
      {
        label: "Forward",
        keys: {
          or: [
            [MOD, "]"],
            ["Alt", "→"],
          ],
        },
      },
      {
        label: "Fold the sidebar",
        keys: {
          or: [
            [MOD, "B"],
            [MOD, "\\"],
          ],
        },
      },
      { label: "Filter the sidebar", keys: { or: [[MOD, "F"], ["/"]] } },
      { label: "Bottom panel", keys: [MOD, "J"] },
    ],
  },
  {
    title: "Lenses and panels",
    items: [
      { label: "Put on lens 1 to 9", keys: [MOD, "1–9"] },
      { label: "Details", keys: ["Alt", "D"] },
      { label: "Assistant", keys: ["Alt", "A"] },
      { label: "Terminal", keys: ["Alt", "T"] },
    ],
  },
  {
    title: "Lists and records",
    items: [
      { label: "Next record", keys: ["J"] },
      { label: "Previous record", keys: ["K"] },
      { label: "Up, or close what is on top", keys: ["Esc"] },
    ],
  },
]

function Shortcut(props: { keys: Keys }) {
  const k = props.keys
  if (Array.isArray(k)) return k.length === 1 ? <Kbd keys={k[0]} /> : <KbdGroup keys={k} />
  return (
    <span class="dm-row">
      <For each={k.or}>
        {(run, i) => (
          <>
            {i() > 0 ? <span class="nc-meta">or</span> : null}
            <KbdGroup keys={run} />
          </>
        )}
      </For>
    </span>
  )
}

export function ShortcutsView(_: ShellViewProps) {
  return (
    <SettingsPage id="shortcuts">
      <For each={GROUPS}>
        {(g) => (
          <Card title={g.title} padding="none">
            <RowList label={g.title}>
              <For each={g.items}>{(s) => <ListRow title={s.label} meta={<Shortcut keys={s.keys} />} />}</For>
            </RowList>
          </Card>
        )}
      </For>
    </SettingsPage>
  )
}
