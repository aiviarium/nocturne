// A dock's layout as data: frames in columns, each frame with its tabs. Every change is a pure function from one
// layout to the next, so the app keeps the layout, saves it if it likes, and passes it back to `Dock`.

/** One frame of a dock: its tabs in order and the one it shows. */
export interface DockFrame {
  id: string
  /** Its share of the column's height, against the other frames of the column. */
  weight: number
  tabs: string[]
  /** The tab the frame shows, or "" when it has none. */
  active: string
}

/** A column of frames, stacked. */
export interface DockColumn {
  id: string
  /** Its share of the dock's width, against the other columns. */
  weight: number
  frames: DockFrame[]
}

/** A dock: columns side by side, and the frame that has the person's attention. */
export interface DockLayout {
  columns: DockColumn[]
  /** The id of the focused frame: new tabs open there. */
  focused: string
}

/** Where a tab dropped on a frame goes: beside it, above or below it, or into it. */
export type DockEdge = "left" | "right" | "top" | "bottom" | "center"

let next = 0
const newId = (prefix: string) =>
  `${prefix}-${(next++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const frameOf = (tabs: string[]): DockFrame => ({
  id: newId("frame"),
  weight: 1,
  tabs,
  active: tabs[0] ?? "",
})

/** A dock with one frame holding these tabs. */
export function dockLayout(tabs: readonly string[] = []): DockLayout {
  const frame = frameOf([...tabs])
  return { columns: [{ id: newId("column"), weight: 1, frames: [frame] }], focused: frame.id }
}

/** Every frame, column by column, top to bottom. */
export function dockFrames(layout: DockLayout): DockFrame[] {
  return layout.columns.flatMap((column) => column.frames)
}

/** Every tab in the dock. */
export function dockTabs(layout: DockLayout): string[] {
  return dockFrames(layout).flatMap((frame) => frame.tabs)
}

/** The frame holding a tab. */
export function dockFrameOf(layout: DockLayout, tab: string): DockFrame | undefined {
  return dockFrames(layout).find((frame) => frame.tabs.includes(tab))
}

/**
 * Drops empty frames and columns (keeping one empty frame when nothing is left), keeps each frame's active tab one
 * of its own, and the focus on a frame that is there.
 */
function tidy(layout: DockLayout): DockLayout {
  let columns = layout.columns
    .map((column) => ({
      ...column,
      frames: column.frames
        .filter((frame) => frame.tabs.length > 0)
        .map((frame) =>
          frame.tabs.includes(frame.active) ? frame : { ...frame, active: frame.tabs[0] ?? "" },
        ),
    }))
    .filter((column) => column.frames.length > 0)
  if (columns.length === 0) {
    const kept = layout.columns.find((column) => column.frames.some((frame) => frame.id === layout.focused))
    const frame = { ...frameOf([]), id: layout.focused || newId("frame") }
    columns = [{ id: kept?.id ?? newId("column"), weight: 1, frames: [frame] }]
  }
  const frames = columns.flatMap((column) => column.frames)
  const focused = frames.some((frame) => frame.id === layout.focused) ? layout.focused : frames[0]!.id
  return { columns, focused }
}

/** Changes one frame. */
function mapFrame(layout: DockLayout, id: string, change: (frame: DockFrame) => DockFrame): DockLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      frames: column.frames.map((frame) => (frame.id === id ? change(frame) : frame)),
    })),
  }
}

/** Takes a tab out of whichever frame holds it, and keeps that frame's active tab next to where it was. */
function take(layout: DockLayout, tab: string): DockLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      frames: column.frames.map((frame) => {
        const at = frame.tabs.indexOf(tab)
        if (at < 0) return frame
        const tabs = frame.tabs.filter((one) => one !== tab)
        const active = frame.active === tab ? (tabs[Math.min(at, tabs.length - 1)] ?? "") : frame.active
        return { ...frame, tabs, active }
      }),
    })),
  }
}

/** Opens a tab in a frame (the focused one by default), shows it and focuses the frame. */
export function dockAdd(layout: DockLayout, tab: string, frameId = layout.focused): DockLayout {
  const target = dockFrames(layout).some((frame) => frame.id === frameId) ? frameId : layout.focused
  const placed = mapFrame(take(layout, tab), target, (frame) => ({
    ...frame,
    tabs: [...frame.tabs, tab],
    active: tab,
  }))
  return tidy({ ...placed, focused: target })
}

/** Closes a tab. A frame left without tabs goes. */
export function dockRemove(layout: DockLayout, tab: string): DockLayout {
  return tidy(take(layout, tab))
}

/** Shows a tab in its frame and focuses the frame. */
export function dockShow(layout: DockLayout, tab: string): DockLayout {
  const frame = dockFrameOf(layout, tab)
  if (!frame || (frame.active === tab && layout.focused === frame.id)) return layout
  return { ...mapFrame(layout, frame.id, (one) => ({ ...one, active: tab })), focused: frame.id }
}

/** Focuses a frame. */
export function dockFocus(layout: DockLayout, frameId: string): DockLayout {
  return layout.focused === frameId || !dockFrames(layout).some((frame) => frame.id === frameId)
    ? layout
    : { ...layout, focused: frameId }
}

/** Moves a tab into a frame at an index among the tabs it has without it. */
export function dockMove(layout: DockLayout, tab: string, frameId: string, index: number): DockLayout {
  if (!dockFrames(layout).some((frame) => frame.id === frameId)) return layout
  const placed = mapFrame(take(layout, tab), frameId, (frame) => {
    const tabs = [...frame.tabs]
    tabs.splice(Math.max(0, Math.min(index, tabs.length)), 0, tab)
    return { ...frame, tabs, active: tab }
  })
  return tidy({ ...placed, focused: frameId })
}

/**
 * Moves a tab to an edge of a frame: left or right makes a column beside the frame's column, top or bottom a frame
 * above or below it in its column, and the middle moves the tab into the frame. The new place takes half of the
 * one it splits.
 */
export function dockSplit(layout: DockLayout, tab: string, frameId: string, edge: DockEdge): DockLayout {
  if (edge === "center") return dockMove(layout, tab, frameId, Number.POSITIVE_INFINITY)
  const columnAt = layout.columns.findIndex((column) => column.frames.some((frame) => frame.id === frameId))
  if (columnAt < 0) return layout
  // Splitting a frame by its only tab would leave it empty: there is nothing to split.
  const source = dockFrameOf(layout, tab)
  if (source?.id === frameId && source.tabs.length === 1) return layout
  const fresh = frameOf([tab])
  const without = take(layout, tab)
  const columns = without.columns.map((column) => ({ ...column, frames: [...column.frames] }))
  const column = columns[columnAt]!
  if (edge === "left" || edge === "right") {
    const half = column.weight / 2
    column.weight = half
    columns.splice(edge === "left" ? columnAt : columnAt + 1, 0, {
      id: newId("column"),
      weight: half,
      frames: [fresh],
    })
  } else {
    const at = column.frames.findIndex((frame) => frame.id === frameId)
    const target = column.frames[at]!
    const half = target.weight / 2
    column.frames[at] = { ...target, weight: half }
    column.frames.splice(edge === "top" ? at : at + 1, 0, { ...fresh, weight: half })
  }
  return tidy({ columns, focused: fresh.id })
}

/**
 * Makes the dock hold exactly these tabs: tabs no longer there close, and new ones open in the focused frame in the
 * order given. For an app whose tabs come from elsewhere, such as the terminals running on a host.
 */
export function dockSync(layout: DockLayout, tabs: readonly string[]): DockLayout {
  const wanted = new Set(tabs)
  let out = layout
  for (const tab of dockTabs(layout)) if (!wanted.has(tab)) out = take(out, tab)
  const have = new Set(dockTabs(out))
  const focused = out.focused
  for (const tab of tabs) {
    if (have.has(tab)) continue
    out = mapFrame(out, focused, (frame) => ({
      ...frame,
      tabs: [...frame.tabs, tab],
      active: frame.active || tab,
    }))
  }
  return tidy(out)
}

/** Sets the columns' weights, in order. */
export function dockResizeColumns(layout: DockLayout, weights: readonly number[]): DockLayout {
  return {
    ...layout,
    columns: layout.columns.map((column, i) => ({ ...column, weight: weights[i] ?? column.weight })),
  }
}

/** Sets the weights of a column's frames, top to bottom. */
export function dockResizeFrames(
  layout: DockLayout,
  columnId: string,
  weights: readonly number[],
): DockLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) =>
      column.id !== columnId
        ? column
        : {
            ...column,
            frames: column.frames.map((frame, i) => ({ ...frame, weight: weights[i] ?? frame.weight })),
          },
    ),
  }
}
