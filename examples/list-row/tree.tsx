import { IconButton, ListRow, Panel, RowList, State } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Nested rows",
  note: "Rows given children are a tree: each level is indented, the disclosure (or Right and Left) shows and hides the rows under it, and the trailing columns stay the list's, so the values of every level line up.",
  surface: "well",
}

export default function Tree() {
  const [open, setOpen] = createSignal("button")
  const leaf = (id: string, title: string, meta?: string) => (
    <ListRow icon="file" title={title} meta={meta} selected={open() === id} onClick={() => setOpen(id)} />
  )
  return (
    <div class="ex-inspector">
      <Panel title="Outline" actions={<IconButton size="sm" icon="more" label="More" />}>
        <RowList label="Outline" variant="inset">
          <ListRow
            icon="folder"
            title="Header"
            meta="3"
            defaultExpanded
            onClick={() => setOpen("header")}
            selected={open() === "header"}
          >
            {leaf("logo", "Logo", "svg")}
            <ListRow
              icon="folder"
              title="Navigation"
              meta="2"
              defaultExpanded
              onClick={() => setOpen("nav")}
              selected={open() === "nav"}
            >
              {leaf("link", "Link", "a")}
              {leaf("button", "Sign in button", "button")}
            </ListRow>
          </ListRow>
          <ListRow
            icon="folder"
            title="Main"
            meta="12"
            onClick={() => setOpen("main")}
            selected={open() === "main"}
          >
            {leaf("hero", "Hero")}
            {leaf("grid", "Feature grid")}
          </ListRow>
          <ListRow
            icon="file"
            title="Footer"
            status={<State status="warn">Missing alt text</State>}
            selected={open() === "footer"}
            onClick={() => setOpen("footer")}
          />
        </RowList>
      </Panel>
    </div>
  )
}
