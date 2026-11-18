import { List, State } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "20,000 events",
  note: "Only the visible window is in the DOM. Arrow keys, Home, End and Page Up/Down move; Enter selects.",
  surface: "well",
}

const ITEMS = Array.from({ length: 20000 }, (_, i) => ({
  id: `evt_${String(i).padStart(5, "0")}`,
  level: i % 17 === 0 ? "warn" : "ok",
}))

export default function VirtualList() {
  const [picked, setPicked] = createSignal("nothing")
  return (
    <div class="ex-col">
      <List items={ITEMS} label="Events" height={240} onSelect={(item) => setPicked(item.id)}>
        {(item, index) => (
          <>
            <State status={item.level === "warn" ? "warn" : "ok"}>
              {item.level === "warn" ? "warn" : "ok"}
            </State>
            <span class="nc-mono ex-grow">{item.id}</span>
            <span class="nc-meta nc-num">#{index + 1}</span>
          </>
        )}
      </List>
      <span class="nc-meta">Selected: {picked()}</span>
    </div>
  )
}
