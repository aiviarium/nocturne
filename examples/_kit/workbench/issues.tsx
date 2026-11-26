// A project's issues: the list grouped by state, an issue with its properties column, and what the Details panel
// shows for one. The rows, groups, properties and menus are library parts; the record is a Split.
import {
  Avatar,
  Button,
  Card,
  DropdownMenu,
  EmptyState,
  Icon,
  IconButton,
  InlineField,
  LabelChip,
  ListRow,
  type MenuEntry,
  type PropertyItem,
  PropertyList,
  RowList,
  RowSection,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  Split,
  Tabs,
  TextArea,
  useShell,
  ViewLayout,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import {
  ACTIVITY,
  COMMENTS,
  ISSUE_VIEWS,
  type Issue,
  issueById,
  issueByKey,
  issuesIn,
  PEOPLE,
  PRIORITY_LABEL,
  type Priority,
  type Project,
  person,
  RELATED,
  STATE_LABEL,
  STATE_ORDER,
  updateIssue,
} from "./data"
import { PriorityIcon, StateIcon } from "./glyphs"

const projectOf = (shell: ShellRegistry) => shell.loc().frame.item as Project

/** Who did something: a person's avatar, or the agent's square. */
export function Who(props: { id?: string }) {
  return (
    <Show when={props.id !== "agent"} fallback={<Avatar kind="agent" name="Coding agent" size="sm" />}>
      <Show when={person(props.id)} fallback={<Icon name="user-round" size="sm" tone="quiet" />}>
        {(p) => <Avatar name={p().name} hue={p().hue} size="sm" />}
      </Show>
    </Show>
  )
}
const nameOf = (id: string) => (id === "agent" ? "Coding agent" : (person(id)?.name ?? id))

// ── The list ────────────────────────────────────────────────────────────────────────────────────────

/** One issue at 30px: priority, key and state, the title, then labels, the assignee and the age. */
function IssueRow(props: { issue: Issue; shell: ShellRegistry; view?: string }) {
  const s = props.shell
  return (
    <ListRow
      leading={<PriorityIcon priority={props.issue.priority} />}
      prefix={
        <>
          <span>{props.issue.key}</span>
          <StateIcon state={props.issue.state} />
        </>
      }
      title={props.issue.title}
      meta={
        <>
          <For each={props.issue.labels}>{(l) => <LabelChip hue={l.hue}>{l.name}</LabelChip>}</For>
          <Who id={props.issue.assignee} />
          <span>{props.issue.updated}</span>
        </>
      }
      selected={s.selection() === props.issue.key}
      onClick={() => s.toPlace(undefined, "issues", props.view, props.issue.key)}
      actions={
        <IconButton
          icon="panel-right"
          label="Show details"
          size="sm"
          onClick={() => {
            s.select(props.issue.key)
            s.showPanel("details")
          }}
        />
      }
    />
  )
}

function IssueList(props: { shell: ShellRegistry }) {
  const s = props.shell
  const view = () => s.loc().view?.id
  /** The saved view in the address: the place's own (the first) takes no segment. */
  const viewSeg = () => (view() === ISSUE_VIEWS[0]!.id ? undefined : view())
  const groups = () => {
    const list = issuesIn(projectOf(s).id, view())
    return STATE_ORDER.map((st) => ({ state: st, issues: list.filter((i) => i.state === st) })).filter(
      (g) => g.issues.length,
    )
  }
  return (
    <ViewLayout
      id="workbench.issues"
      header={
        <ShellViewHeader
          title="Issues"
          actions={[
            { id: "filter", label: "Filter", icon: "filter", onClick: () => {} },
            { id: "new", label: "New issue", icon: "plus", shortcut: "C", onClick: () => {} },
          ]}
        >
          <Tabs
            label="Saved views"
            items={ISSUE_VIEWS.map((v) => ({ id: v.id, label: v.label }))}
            value={view() ?? ISSUE_VIEWS[0]!.id}
            onChange={(id) => s.toPlace(undefined, "issues", id === ISSUE_VIEWS[0]!.id ? undefined : id)}
          />
        </ShellViewHeader>
      }
    >
      <Show when={groups().length} fallback={<EmptyState title="No issues match this view" />}>
        <RowList label="Issues">
          <For each={groups()} keyed={(g) => g.state}>
            {(g) => (
              <RowSection
                label={STATE_LABEL[g().state]}
                leading={<StateIcon state={g().state} label={false} />}
                count={g().issues.length}
                actions={
                  <IconButton icon="plus" size="sm" label={`New issue in ${STATE_LABEL[g().state]}`} />
                }
              >
                <For each={g().issues} keyed={(i) => i.id}>
                  {(i) => <IssueRow issue={i()} shell={s} view={viewSeg()} />}
                </For>
              </RowSection>
            )}
          </For>
        </RowList>
      </Show>
    </ViewLayout>
  )
}

// ── The record ──────────────────────────────────────────────────────────────────────────────────────

/** A property's value that opens a menu to change it. */
function Choice(props: {
  label: string
  items: MenuEntry[]
  onSelect: (id: string) => void
  children: JSX.Element
}) {
  return (
    <DropdownMenu
      label={props.label}
      radio
      matchWidth={false}
      minWidth="200px"
      items={props.items}
      onSelect={props.onSelect}
      trigger={(t) => (
        <Button {...t} variant="ghost" size="sm">
          {props.children}
        </Button>
      )}
    />
  )
}

/** The issue's properties, each value a menu or a link. */
export function IssueProperties(props: { issue: Issue; onRelated?: (key: string) => void }) {
  const shell = useShell()
  const i = () => props.issue
  const items = (): PropertyItem[] => [
    {
      label: "Status",
      value: (
        <Choice
          label="Status"
          items={STATE_ORDER.map((st) => ({
            id: st,
            label: STATE_LABEL[st],
            leading: <StateIcon state={st} label={false} />,
            checked: st === i().state,
          }))}
          onSelect={(id) => updateIssue(i().id, { state: id as Issue["state"] })}
        >
          <StateIcon state={i().state} label={false} />
          {STATE_LABEL[i().state]}
        </Choice>
      ),
    },
    {
      label: "Priority",
      value: (
        <Choice
          label="Priority"
          items={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
            id: p,
            label: PRIORITY_LABEL[p],
            leading: <PriorityIcon priority={p} label={false} />,
            checked: p === i().priority,
          }))}
          onSelect={(id) => updateIssue(i().id, { priority: id as Priority })}
        >
          <PriorityIcon priority={i().priority} label={false} />
          {PRIORITY_LABEL[i().priority]}
        </Choice>
      ),
    },
    {
      label: "Assignee",
      value: (
        <Choice
          label="Assignee"
          items={[
            { id: "none", label: "No one", icon: "user-round", checked: !i().assignee },
            ...PEOPLE.map((p) => ({
              id: p.id,
              label: p.name,
              leading: <Avatar name={p.name} hue={p.hue} size="sm" />,
              checked: p.id === i().assignee,
            })),
          ]}
          onSelect={(id) => updateIssue(i().id, { assignee: id === "none" ? undefined : id })}
        >
          <Who id={i().assignee} />
          {person(i().assignee)?.name ?? "No one"}
        </Choice>
      ),
    },
    {
      label: "Labels",
      value: i().labels.length ? (
        <span class="ex-row">
          <For each={i().labels}>{(l) => <LabelChip hue={l.hue}>{l.name}</LabelChip>}</For>
        </span>
      ) : undefined,
    },
    { label: "Cycle", value: i().cycle },
    { label: "Estimate", value: i().estimate ? `${i().estimate} points` : undefined },
    {
      label: "Related",
      value: (RELATED[i().id] ?? []).length ? (
        <RowList label="Related issues" variant="inline">
          <For each={RELATED[i().id] ?? []}>
            {(id) => (
              <Show when={issueById(id)}>
                {(o) => (
                  <ListRow
                    leading={<StateIcon state={o().state} />}
                    prefix={<span>{o().key}</span>}
                    title={o().title}
                    onClick={() =>
                      props.onRelated
                        ? props.onRelated(o().key)
                        : shell?.toPlace(undefined, "issues", undefined, o().key)
                    }
                  />
                )}
              </Show>
            )}
          </For>
        </RowList>
      ) : undefined,
    },
  ]
  return <PropertyList items={items()} labelWidth={88} />
}

function Activity(props: { issue: Issue }) {
  const items = () =>
    ACTIVITY[props.issue.id] ?? [
      { who: props.issue.assignee ?? "jonas", what: "created the issue", ago: props.issue.updated },
    ]
  return (
    <section class="ex-col">
      <h2 class="label">Activity</h2>
      <RowList label="Activity" variant="inline">
        <For each={items()}>
          {(a) => (
            <ListRow leading={<Who id={a.who} />} title={nameOf(a.who)} secondary={a.what} meta={a.ago} />
          )}
        </For>
      </RowList>
      <For each={COMMENTS[props.issue.id] ?? []}>
        {(c) => (
          <Card>
            <div class="ex-row">
              <Who id={c.who} />
              <span class="label">{nameOf(c.who)}</span>
              <span class="nc-meta">{c.ago}</span>
            </div>
            <div>{c.text}</div>
          </Card>
        )}
      </For>
      <TextArea aria-label="Comment" placeholder="Leave a comment…" rows={2} />
    </section>
  )
}

/** An issue's body: its title edited in place, the description, the activity. */
export function IssueBody(props: { issue: Issue }) {
  return (
    <article class="ex-record">
      <InlineField
        variant="title"
        label="Title"
        value={props.issue.title}
        onCommit={(v) => updateIssue(props.issue.id, { title: v })}
      />
      <p class="nc-muted">{props.issue.description || "No description."}</p>
      <Activity issue={props.issue} />
    </article>
  )
}

function IssuePage(props: { issue: Issue }) {
  return (
    <ViewLayout
      id="workbench.issue"
      scroll={false}
      header={
        <ShellViewHeader
          actions={[
            { id: "star", label: "Favourite", icon: "star", onClick: () => {} },
            { id: "link", label: "Copy link", icon: "link", onClick: () => {} },
          ]}
        />
      }
    >
      <Split
        fixed="second"
        defaultSize={280}
        min={220}
        max={440}
        label="Resize properties"
        first={<IssueBody issue={props.issue} />}
        second={
          <aside class="ex-pad" aria-label="Properties">
            <IssueProperties issue={props.issue} />
          </aside>
        }
      />
    </ViewLayout>
  )
}

/** Build › Issues: the list, or the issue the address names. */
export function IssuesView(props: ShellViewProps) {
  const record = () => {
    const key = props.shell.loc().record
    return key ? issueByKey(key) : undefined
  }
  return (
    <Show when={record()} fallback={<IssueList shell={props.shell} />}>
      {(i) => <IssuePage issue={i()} />}
    </Show>
  )
}

/** What the Details panel shows for an issue: its key, title and properties; related issues drill the panel. */
export function IssueDetails(props: { id: string }) {
  const shell = useShell()
  return (
    <Show when={issueByKey(props.id)}>
      {(i) => (
        <div class="ex-col ex-pad">
          <div class="ex-row">
            <span class="nc-meta">{i().key}</span>
            <span class="ex-grow" />
            <Button
              variant="ghost"
              size="sm"
              iconEnd="arrow-up-right"
              onClick={() => shell?.toPlace(undefined, "issues", undefined, i().key)}
            >
              Open
            </Button>
          </div>
          <span class="label">{i().title}</span>
          <IssueProperties issue={i()} onRelated={(key) => shell?.drill("details", key)} />
        </div>
      )}
    </Show>
  )
}
