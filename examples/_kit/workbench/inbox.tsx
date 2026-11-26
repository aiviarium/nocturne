// The inbox (a list and a reader) and a project's triage (reports to accept, merge or decline).
import {
  Avatar,
  Button,
  Callout,
  EmptyState,
  type IconName,
  ListRow,
  MetaLine,
  RowList,
  ShellViewHeader,
  type ShellViewProps,
  Split,
  Tabs,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { INBOX, issueById, PROJECTS, person, REPORTS, type Report } from "./data"
import { StateIcon } from "./glyphs"
import { IssueBody, IssueProperties } from "./issues"

/** The workspace's inbox: what needs the person, and the issue it is about beside it. */
export function InboxView(props: ShellViewProps) {
  const [filter, setFilter] = createSignal("all")
  const [read, setRead] = createSignal<string[]>([])
  const items = () => INBOX.filter((n) => filter() === "all" || (n.unread && !read().includes(n.id)))
  const [picked, setPicked] = createSignal(INBOX[0]!.id)
  const note = createMemo(() => INBOX.find((n) => n.id === picked()))
  const issue = () => issueById(note()?.issue)
  const project = () => PROJECTS.find((p) => p.id === issue()?.project)
  return (
    <ViewLayout
      id="workbench.inbox"
      scroll={false}
      header={
        <ShellViewHeader
          title="Inbox"
          actions={[
            {
              id: "read",
              label: "Mark all read",
              icon: "check",
              onClick: () => setRead(INBOX.map((n) => n.id)),
            },
          ]}
        >
          <Tabs
            label="Show"
            items={[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
            ]}
            value={filter()}
            onChange={setFilter}
          />
        </ShellViewHeader>
      }
    >
      <Split
        defaultSize={340}
        min={260}
        max={480}
        label="Resize the list"
        first={
          <RowList label="Notifications">
            <For each={items()}>
              {(n) => {
                const i = () => issueById(n.issue)!
                const who = person(n.who)!
                return (
                  <ListRow
                    lines={2}
                    leading={<Avatar name={who.name} hue={who.hue} size="sm" />}
                    title={i().title}
                    secondary={`${i().key}  ${who.name.split(" ")[0]} ${n.what}`}
                    meta={n.ago}
                    status={<StateIcon state={i().state} />}
                    unread={n.unread && !read().includes(n.id)}
                    selected={picked() === n.id}
                    onClick={() => {
                      setPicked(n.id)
                      setRead((r) => [...r, n.id])
                    }}
                  />
                )
              }}
            </For>
          </RowList>
        }
        second={
          <Show when={issue()} fallback={<EmptyState title="Nothing selected" />}>
            {(i) => (
              <div class="ex-reader">
                <ViewHeader
                  trail={[
                    {
                      id: "project",
                      label: project()!.name,
                      mark: { name: project()!.name, hue: project()!.hue },
                      onClick: () => props.shell.go(`/projects/${i().project}/build/issues`),
                    },
                    { id: "issue", label: i().key },
                  ]}
                  noPin
                  actions={[
                    {
                      id: "open",
                      label: "Open",
                      icon: "arrow-up-right",
                      onClick: () => props.shell.go(`/projects/${i().project}/build/issues/${i().key}`),
                    },
                  ]}
                />
                <Split
                  fixed="second"
                  defaultSize={248}
                  min={200}
                  max={400}
                  label="Resize properties"
                  first={<IssueBody issue={i()} />}
                  second={
                    <aside class="ex-pad" aria-label="Properties">
                      <IssueProperties issue={i()} />
                    </aside>
                  }
                />
              </div>
            )}
          </Show>
        }
      />
    </ViewLayout>
  )
}

const SOURCE: Record<Report["source"], IconName> = {
  github: "github",
  slack: "chat",
  email: "at-sign",
  agent: "bot",
}

/** Explore › Triage: reports waiting for a decision, one at a time. */
export function TriageView(_: ShellViewProps) {
  const [done, setDone] = createSignal<string[]>([])
  const open = () => REPORTS.filter((r) => !done().includes(r.id))
  const [picked, setPicked] = createSignal(REPORTS[0]!.id)
  const report = () => open().find((r) => r.id === picked()) ?? open()[0]
  const decide = (r: Report) => {
    const at = open().indexOf(r)
    setDone((d) => [...d, r.id])
    const next = open()[Math.min(at, open().length - 1)]
    if (next) setPicked(next.id)
  }
  return (
    <ViewLayout
      id="workbench.triage"
      scroll={false}
      header={
        <ShellViewHeader actions={[{ id: "filter", label: "Filter", icon: "filter", onClick: () => {} }]} />
      }
    >
      <Split
        defaultSize={320}
        min={240}
        max={460}
        label="Resize the list"
        first={
          <RowList label="Reports">
            <For each={open()}>
              {(r) => (
                <ListRow
                  lines={2}
                  icon={SOURCE[r.source]}
                  title={r.title}
                  secondary={r.from}
                  meta={r.ago}
                  selected={report()?.id === r.id}
                  onClick={() => setPicked(r.id)}
                />
              )}
            </For>
          </RowList>
        }
        second={
          <Show
            when={report()}
            fallback={<EmptyState title="Triage is clear" description="New reports land here." />}
          >
            {(r) => (
              <div class="ex-reader">
                <div class="ex-toolbar">
                  <Button variant="primary" size="sm" icon="check" kbd="A" onClick={() => decide(r())}>
                    Accept
                  </Button>
                  <Show when={r().dupe}>
                    <Button size="sm" icon="branch" kbd="M" onClick={() => decide(r())}>
                      Merge into {r().dupe}
                    </Button>
                  </Show>
                  <Button size="sm" icon="close" kbd="D" onClick={() => decide(r())}>
                    Decline
                  </Button>
                  <span class="ex-grow" />
                  <span class="nc-meta">
                    {open().indexOf(r()) + 1} of {open().length}
                  </span>
                </div>
                <article class="ex-record">
                  <MetaLine items={[{ label: r().from, icon: SOURCE[r().source] }, `${r().ago} ago`]} />
                  <h1 class="heading">{r().title}</h1>
                  <p>{r().body}</p>
                  <Show when={r().dupe}>
                    <Callout>Looks like {r().dupe}, already in Build.</Callout>
                  </Show>
                </article>
              </div>
            )}
          </Show>
        }
      />
    </ViewLayout>
  )
}
