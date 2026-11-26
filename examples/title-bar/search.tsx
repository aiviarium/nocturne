import { TitleBar } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A scope without lenses, in a browser tab",
  note: "With no lenses the box is a search field for the scope, and the line under the bar is the plain hairline. A browser tab shows no arrows and no window controls: the browser's own walk the same history.",
  surface: "none",
}

export default function TitleBarSearch() {
  return (
    <div class="ex-window">
      <TitleBar
        runsIn="browser"
        path={[
          { id: "acme", label: "Acme", onClick: () => {} },
          { id: "docs", label: "Docs", icon: "book-open" },
        ]}
        keys={false}
      />
      <div class="ex-window__body nc-meta">Docs</div>
    </div>
  )
}
