// The Projects module's view: every project, each entering its scope, and what Details shows for a project.
import {
  AvatarStack,
  Button,
  EmptyState,
  ListRow,
  Mark,
  PropertyList,
  type RowKey,
  RowList,
  type RowMenuEntry,
  reorderItems,
  ShellViewHeader,
  type ShellViewProps,
  ViewLayout,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { createSignal, Show } from "solid-js"
import {
  addProject,
  type PEOPLE,
  type Project,
  person,
  projects,
  removeProjects,
  renameProject,
  setProjects,
} from "../../data"
import { askName, copyLink, demoShell, inList, named, renameEntry, undoable } from "../../menus"
import { allIssues } from "./data"

const open = (p: Project) => allIssues().filter((i) => i.project === p.id && i.state !== "done")
const people = (p: Project) =>
  [...new Set(open(p).map((i) => i.assignee))]
    .map((id) => person(id))
    .filter((x): x is (typeof PEOPLE)[number] => !!x)

const remove = (list: Project[]) =>
  undoable(
    `Deleted ${named(
      list.map((p) => p.name),
      "projects",
    )}`,
    removeProjects(list.map((p) => p.id)),
  )

/** The menu of a project, or of several: in the Projects list and on its entry in the sidebar. */
export function projectMenu(list: Project[]): RowMenuEntry[] {
  const p = list[0]
  if (!p) return []
  if (list.length > 1)
    return [
      { type: "label", label: `${list.length} selected` },
      {
        id: "delete",
        label: `Delete ${list.length}`,
        icon: "trash",
        danger: true,
        onSelect: () => remove(list),
      },
    ]
  return [
    {
      id: "open",
      label: "Open",
      icon: "arrow-up-right",
      onSelect: () => demoShell().go(`/projects/${p.id}`),
    },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(p.name, `/projects/${p.id}`) },
    renameEntry(() =>
      askName({
        title: "Rename project",
        value: p.name,
        submit: "Rename",
        onSubmit: (name) => renameProject(p.id, name),
      }),
    ),
    { type: "separator" },
    { id: "delete", label: "Delete", icon: "trash", danger: true, onSelect: () => remove([p]) },
  ]
}

/** Asks for a new project's name and adds it. */
const newProject = () =>
  askName({ title: "New project", value: "", submit: "Create project", onSubmit: (name) => addProject(name) })

/** The address names a project that is gone: the shell falls back to the module's view with it left over. */
const gone = (props: ShellViewProps) => {
  const id = props.shell.options.router.path().split(/[/?#]/).filter(Boolean)[1]
  return !!id && !id.startsWith("@") && !projects().some((p) => p.id === id)
}

export function ProjectsView(props: ShellViewProps) {
  const [selected, setSelected] = createSignal<RowKey[]>([])
  return (
    <ViewLayout
      id="demo.projects"
      header={
        <ShellViewHeader actions={[{ id: "new", label: "New project", icon: "plus", onClick: newProject }]} />
      }
    >
      <Show when={!gone(props)} fallback={<EmptyState title="This project was deleted" />}>
        <Show
          when={projects().length}
          fallback={
            <EmptyState title="No projects">
              <Button variant="secondary" icon="plus" onClick={newProject}>
                New project
              </Button>
            </EmptyState>
          }
        >
          <RowList
            label="Projects"
            items={projects()}
            getKey={(p) => p.id}
            itemLabel={(p) => p.name}
            selectable
            selected={selected()}
            onSelectedChange={setSelected}
            onReorder={(from, to) => setProjects(reorderItems(projects(), from, to))}
            onRemove={(keys) => removeProjects(keys as string[])}
            rowMenu={(t) => inList(projectMenu(t.items))}
          >
            {(p) => (
              <ListRow
                leading={<Mark name={p.name} hue={p.hue} size="sm" decorative />}
                title={p.name}
                prefix={<span>{p.key}</span>}
                meta={
                  <>
                    <AvatarStack
                      people={people(p).map((x) => ({ name: x.name, hue: x.hue }))}
                      max={3}
                      size="sm"
                    />
                    <span>{open(p).length ? `${open(p).length} open` : ""}</span>
                  </>
                }
                onClick={() => props.shell.go(`/projects/${p.id}`)}
                onRename={(name) => renameProject(p.id, name)}
              />
            )}
          </RowList>
        </Show>
      </Show>
    </ViewLayout>
  )
}

/** What the Details panel shows in a project when nothing in it is selected. */
export function projectInspect(p: Project): JSX.Element {
  return (
    <div class="dm-col dm-pad">
      <div class="dm-row">
        <Mark name={p.name} hue={p.hue} size="sm" decorative />
        <span class="label">{p.name}</span>
      </div>
      <PropertyList
        labelWidth={88}
        items={[
          { label: "Key", value: <span class="mono">{p.key}</span> },
          { label: "Open issues", value: open(p).length || undefined },
          {
            label: "People",
            value: people(p).length ? (
              <AvatarStack people={people(p).map((x) => ({ name: x.name, hue: x.hue }))} size="sm" />
            ) : undefined,
          },
        ]}
      />
      <EmptyState size="sm" title="Select an issue to see its details" />
    </div>
  )
}
