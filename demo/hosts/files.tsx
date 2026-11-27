// Operate › Files: a folder's entries under a trail of the folders above it, and a file's content. The view draws
// its own trail (the place sets `trail: false`); the last crumb switches between the entries beside it.
import {
  CodeBlock,
  EmptyState,
  ListRow,
  MetaLine,
  RowList,
  type ShellViewProps,
  type TrailCrumb,
  toast,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { For, Show } from "solid-js"
import { FILES } from "../data"
import { CONTENT } from "./data"

const parentOf = (path: string) => path.split("/").slice(0, -1).join("/")
const nameOf = (path: string) => path.split("/").at(-1) ?? path
const isFolder = (path: string) => path === "" || FILES[path] !== undefined

export function FilesView(props: ShellViewProps) {
  const s = props.shell
  const path = () => s.loc().record ?? ""
  const parts = () => (path() ? path().split("/") : [])
  const goTo = (p: string) => s.toPlace(undefined, "files", undefined, p || undefined)
  const entry = () => (FILES[parentOf(path())] ?? []).find((e) => e.name === nameOf(path()))

  const trail = (): TrailCrumb[] => {
    const p = parts()
    const parent = p.slice(0, -1).join("/")
    return [
      { id: "files", label: "Files", onClick: () => goTo("") },
      ...p.map((name, i) => {
        const at = p.slice(0, i + 1).join("/")
        const last = i === p.length - 1
        return {
          id: at,
          label: name,
          icon: isFolder(at) ? ("folder" as const) : ("file" as const),
          onClick: last ? undefined : () => goTo(at),
          switcher: last
            ? {
                noun: isFolder(at) ? "folder" : "file",
                sections: [
                  {
                    title: parent || "Files",
                    entries: (FILES[parent] ?? []).map((e) => ({
                      id: parent ? `${parent}/${e.name}` : e.name,
                      label: e.name,
                      icon: e.kind === "folder" ? ("folder" as const) : ("file" as const),
                      hint: e.size,
                      current: e.name === name,
                    })),
                  },
                ],
                onPick: (e: { id: string }) => goTo(e.id),
              }
            : undefined,
        }
      }),
    ]
  }

  const folderActions = [
    {
      id: "upload",
      label: "Upload",
      icon: "upload" as const,
      onClick: () => toast({ title: "Uploads are off in the demo" }),
    },
    {
      id: "folder",
      label: "New folder",
      icon: "plus" as const,
      onClick: () => toast({ title: "Folders are read-only in the demo" }),
    },
  ]
  const fileActions = [
    {
      id: "download",
      label: "Download",
      icon: "download" as const,
      onClick: () =>
        toast({
          title: `${nameOf(path())} stays on the host`,
          description: "The demo has nothing to download.",
        }),
    },
  ]

  return (
    <ViewLayout
      id="demo.hosts.files"
      header={
        <ViewHeader
          title={parts().length ? undefined : "Files"}
          trail={parts().length ? trail() : undefined}
          actions={isFolder(path()) ? folderActions : fileActions}
        />
      }
    >
      <Show
        when={isFolder(path())}
        fallback={
          <div class="dm-page">
            <MetaLine items={[entry()?.size, entry() && `changed ${entry()!.changed} ago`]} />
            <Show
              when={CONTENT[path()]}
              fallback={
                <EmptyState title="No preview" description="Binary or large files open on the host." />
              }
            >
              {(c) => (
                <CodeBlock code={c().code} language={c().language} title={nameOf(path())} lineNumbers />
              )}
            </Show>
          </div>
        }
      >
        <Show when={FILES[path()]?.length} fallback={<EmptyState title="This folder is empty" />}>
          <RowList label={path() || "Files"}>
            <For each={FILES[path()]}>
              {(e) => {
                const at = () => (path() ? `${path()}/${e.name}` : e.name)
                return (
                  <ListRow
                    icon={e.kind === "folder" ? "folder" : "file"}
                    title={e.name}
                    meta={
                      <>
                        <Show when={e.size}>
                          <span>{e.size}</span>
                        </Show>
                        <span>{e.changed}</span>
                      </>
                    }
                    onClick={() => goTo(at())}
                  />
                )
              }}
            </For>
          </RowList>
        </Show>
      </Show>
    </ViewLayout>
  )
}
