import { type GridItem, ListRow, RowList, Widget, WidgetGrid } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Only what has something to say, as tall as it needs",
  note: "The same layout: the empty inbox and the all-clear checks render nothing and take no space, the list's cell shrinks to its two rows, and everything moves up. The stored layout is unchanged; editing shows it.",
  surface: "well",
}

const LAYOUT: GridItem[] = [
  { id: "inbox", x: 0, y: 0, w: 4, h: 3 },
  { id: "checks", x: 4, y: 0, w: 4, h: 3 },
  { id: "clock", x: 8, y: 0, w: 4, h: 2 },
  { id: "pulls", x: 0, y: 3, w: 8, h: 4 },
  { id: "text", x: 8, y: 3, w: 4, h: 2 },
]

export default function GridCompacted() {
  return (
    <WidgetGrid label="Dashboard" items={LAYOUT} empty={["inbox", "checks"]}>
      {(item) =>
        ({
          inbox: null,
          checks: null,
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
