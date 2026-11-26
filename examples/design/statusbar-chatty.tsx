import { TitleBar, TitleBarItem } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A status bar of things that are fine",
  verdict: "dont",
  note: "Connected, synced, a version and a count, all the time: when something does go wrong it is one more item in the row.",
  surface: "none",
}

export default function StatusbarChatty() {
  return (
    <div class="ex-window">
      <TitleBar
        runsIn="browser"
        keys={false}
        path={[{ id: "acme", label: "Acme" }]}
        status={
          <>
            <TitleBarItem icon="activity" label="Connected" />
            <TitleBarItem icon="check" label="Synced" />
            <TitleBarItem label="12 modules" />
            <TitleBarItem label="v0.6.0" />
          </>
        }
      />
      <div class="ex-window__body nc-muted">The view.</div>
    </div>
  )
}
