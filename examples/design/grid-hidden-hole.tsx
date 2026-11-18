import { type GridItem, ListRow, RowList, Widget, WidgetGrid } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Holes, restated normal states and short content in tall cells",
  note: "Every cell keeps its stored size: the empty inbox leaves a hole, a widget says nothing is failing, and two rows sit at the top of a cell sized for six.",
  surface: "well",
}

const LAYOUT: GridItem[] = [
  { id: "inbox", x: 0, y: 0, w: 4, h: 3 },
  { id: "checks", x: 4, y: 0, w: 4, h: 3 },
  { id: "clock", x: 8, y: 0, w: 4, h: 2 },
  { id: "pulls", x: 0, y: 3, w: 8, h: 4 },
  { id: "text", x: 8, y: 3, w: 4, h: 2 },
]

export default function GridHole() {
  return (
    <WidgetGrid label="Dashboard" items={LAYOUT} fit={false}>
      {(item) =>
        ({
          // The inbox has nothing unread and renders nothing, but its cell stays.
          inbox: null,
          checks: (
            <Widget fill title="Checks failing" value="0">
              <span class="nc-meta">None of your pull requests has failing checks.</span>
            </Widget>
          ),
          clock: (
            <Widget fill title="Berlin" caption="Monday, November 16">
              <span class="figure-xl nc-num">08:02</span>
            </Widget>
          ),
          pulls: (
            <Widget fill title="My pull requests" value="2">
              <RowList label="Pull requests">
                <ListRow title="Contrast of the muted labels" meta="2m" />
                <ListRow title="Raise the connection cap" meta="3m" />
              </RowList>
            </Widget>
          ),
          text: (
            <Widget fill title="Freeze">
              <span class="body">Code freeze starts Friday at noon.</span>
            </Widget>
          ),
        })[item().id]
      }
    </WidgetGrid>
  )
}
