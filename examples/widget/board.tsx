import {
  createWidgetBoard,
  Icon,
  ShellViewHeader,
  ViewLayout,
  Widget,
  WidgetBoard,
  WidgetRing,
  type WidgetType,
  WidgetZone,
} from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Widget board",
  note: "Edit widgets, then drag a widget between the column and the bar, or click it for its place, size and settings. The bar draws it as a chip that opens its card.",
}

const TYPES: Record<string, WidgetType<number>> = {
  context: {
    id: "context",
    label: "Context",
    icon: "gauge",
    render: (used, form) =>
      form === "chip" ? (
        <span class="nc-row" style={{ gap: "6px" }}>
          <WidgetRing value={used} label="Context" size="sm" />
          {used}%
        </span>
      ) : (
        <Widget title="Context" value={`${used}%`} size={form === "line" ? "row" : "md"}>
          <WidgetRing value={used} label="Context" size="sm" />
        </Widget>
      ),
  },
  build: {
    id: "build",
    label: "Build",
    icon: "clock",
    render: (_, form) =>
      form === "chip" ? (
        <span class="nc-row" style={{ gap: "6px" }}>
          <Icon name="clock" size="sm" />
          14s
        </span>
      ) : (
        <Widget title="Build" value="14s" size={form === "line" ? "row" : "md"} />
      ),
  },
}

export default function Board() {
  const board = createWidgetBoard<number>({
    types: TYPES,
    zones: [
      { id: "side", label: "Column", forms: ["card", "line"], layout: "column" },
      { id: "bar", label: "Bar", forms: ["chip", "line"], layout: "row" },
    ],
    initial: [
      { id: "context", zone: "side" },
      { id: "build", zone: "bar" },
    ],
    context: () => 42,
  })
  return (
    <div style={{ height: "320px" }}>
      <ViewLayout
        id="example.widget-board"
        header={<ShellViewHeader title="Chat" actions={board.actions()} />}
      >
        <WidgetBoard board={board}>
          <div
            style={{ display: "grid", "grid-template-columns": "240px 1fr", gap: "16px", padding: "16px" }}
          >
            <WidgetZone board={board} zone="side" />
            <WidgetZone board={board} zone="bar" />
          </div>
        </WidgetBoard>
      </ViewLayout>
    </div>
  )
}
