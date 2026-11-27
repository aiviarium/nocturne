// The Projects module's view: every project, each entering its scope, and what Details shows for a project.
import {
  AvatarStack,
  EmptyState,
  ListRow,
  Mark,
  PropertyList,
  RowList,
  ShellViewHeader,
  type ShellViewProps,
  ViewLayout,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { For } from "solid-js"
import { type PEOPLE, PROJECTS, type Project, person } from "../../data"
import { allIssues } from "./data"

const open = (p: Project) => allIssues().filter((i) => i.project === p.id && i.state !== "done")
const people = (p: Project) =>
  [...new Set(open(p).map((i) => i.assignee))]
    .map((id) => person(id))
    .filter((x): x is (typeof PEOPLE)[number] => !!x)

export function ProjectsView(props: ShellViewProps) {
  return (
    <ViewLayout id="demo.projects" header={<ShellViewHeader />}>
      <RowList label="Projects">
        <For each={PROJECTS}>
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
            />
          )}
        </For>
      </RowList>
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
