// Product › Roadmap: the project's milestones by quarter. A milestone peeks in a popover beside its row, with
// links to its spec and its issues.
import {
  Avatar,
  Button,
  type DotStatus,
  EmptyState,
  LabelChip,
  LinkProvider,
  ListRow,
  Mark,
  MetaLine,
  Popover,
  RowList,
  RowSection,
  ShellViewHeader,
  type ShellViewProps,
  State,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { type Project, person } from "../../data"
import { MILESTONES, type Milestone, specById, type Track } from "./data"

const TRACK: Record<Track, { label: string; status: DotStatus }> = {
  shipped: { label: "Shipped", status: "ok" },
  "on-track": { label: "On track", status: "live" },
  "at-risk": { label: "At risk", status: "warn" },
  "not-started": { label: "Not started", status: "idle" },
}

export function RoadmapView(props: ShellViewProps) {
  const s = props.shell
  const project = () => s.loc().frame.item as Project
  const quarters = createMemo(() => {
    const list = MILESTONES.filter((m) => m.project === project().id)
    return [...new Set(list.map((m) => m.quarter))].map((q) => ({
      quarter: q,
      items: list.filter((m) => m.quarter === q),
    }))
  })
  const [peek, setPeek] = createSignal<{ m: Milestone; anchor: HTMLElement }>()
  return (
    <LinkProvider navigate={(href) => s.go(href)}>
      <ViewLayout id="demo.roadmap" header={<ShellViewHeader />}>
        <Show
          when={quarters().length}
          fallback={<EmptyState icon="calendar" title="Nothing on the roadmap" />}
        >
          <RowList label="Milestones">
            <For each={quarters()} keyed={(q) => q.quarter}>
              {(q) => (
                <RowSection label={q().quarter} count={q().items.length}>
                  <For each={q().items} keyed={(m) => m.id}>
                    {(m) => (
                      <ListRow
                        title={m().title}
                        prefix={<span class="nc-num">{m().target}</span>}
                        meta={
                          <>
                            <LabelChip hue={m().area.hue}>{m().area.name}</LabelChip>
                            <Avatar
                              name={person(m().owner)?.name ?? ""}
                              hue={person(m().owner)?.hue}
                              size="sm"
                            />
                          </>
                        }
                        status={
                          m().track === "at-risk" ? (
                            <State status={TRACK[m().track].status}>{TRACK[m().track].label}</State>
                          ) : undefined
                        }
                        selected={peek()?.m.id === m().id}
                        onClick={(e) => {
                          const anchor = e.currentTarget as HTMLElement
                          setPeek(peek()?.m.id === m().id ? undefined : { m: m(), anchor })
                        }}
                      />
                    )}
                  </For>
                </RowSection>
              )}
            </For>
          </RowList>
        </Show>
        <Popover
          open={!!peek()}
          anchor={peek()?.anchor}
          onClose={() => setPeek(undefined)}
          placement="bottom-end"
          aria-label="Milestone"
        >
          <Show when={peek()} keyed>
            {(p) => (
              <div class="dm-col dm-explore-peek">
                <div class="dm-row">
                  <Mark name={project().name} hue={project().hue} size="sm" decorative />
                  <span class="label">{p.m.title}</span>
                </div>
                <State status={TRACK[p.m.track].status}>{TRACK[p.m.track].label}</State>
                <MetaLine
                  items={[
                    p.m.quarter,
                    { label: p.m.target, title: `Due ${p.m.target}` },
                    person(p.m.owner)?.name,
                    p.m.issues ? `${p.m.issues} issues` : undefined,
                  ]}
                />
                <div class="dm-row">
                  <Show when={p.m.spec && specById(p.m.spec)}>
                    <Button
                      size="sm"
                      icon="book-open"
                      href={`/projects/${project().id}/product/specs/${p.m.spec}`}
                    >
                      Open spec
                    </Button>
                  </Show>
                  <Show when={p.m.issues}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="list-todo"
                      href={`/projects/${project().id}/build/issues`}
                    >
                      Issues
                    </Button>
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </Popover>
      </ViewLayout>
    </LinkProvider>
  )
}
