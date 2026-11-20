import { ListRow, RowList, ViewHeader, ViewLayout } from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { createSignal, For } from "solid-js"
import { DOC_TREE, type DocPage, pathTo } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A page tree: nested navigation in place, no drilling",
  note: "Choose a page in the tree. The tree stays as it is and only the page changes. The crumbs show where the page sits in the tree, and each crumb but the last opens that page.",
  surface: "none",
}

/** The folders open at the start: the ones above the first page shown. */
const OPEN = new Set(pathTo("runners").map((p) => p.id))

export default function PageTree() {
  const [page, setPage] = createSignal("runners")
  const path = () => pathTo(page())
  const row = (p: DocPage): JSX.Element =>
    p.children ? (
      <ListRow
        icon="folder"
        title={p.title}
        selected={page() === p.id}
        defaultExpanded={OPEN.has(p.id)}
        onClick={() => setPage(p.id)}
      >
        <For each={p.children}>{row}</For>
      </ListRow>
    ) : (
      <ListRow icon="file" title={p.title} selected={page() === p.id} onClick={() => setPage(p.id)} />
    )
  return (
    <div class="ex-view" style={{ height: "400px" }}>
      <ViewLayout
        id="nav-page-tree"
        sidebarLabel="Pages"
        sidebarWidth={220}
        minMain={320}
        reading
        sidebar={
          <RowList label="Pages" variant="inset">
            <For each={DOC_TREE}>{row}</For>
          </RowList>
        }
        header={
          <ViewHeader
            crumbs={[
              { label: "Docs", onClick: () => setPage("intro") },
              ...path().map((p) => ({ label: p.title, onClick: () => setPage(p.id) })),
            ]}
            actions={[{ id: "new", label: "New page", icon: "plus", onClick: () => {} }]}
          />
        }
      >
        <div class="ex-col ex-pad">
          <p class="nc-muted">The text of {path().at(-1)?.title}.</p>
        </div>
      </ViewLayout>
    </div>
  )
}
