// Build › Issues: the list grouped by state with saved views and a multiple selection, an issue with its
// properties column, the Details panel's account of one, and the dialog that makes a new one.
import {
  Avatar,
  Button,
  Card,
  createSelection,
  DropdownMenu,
  EmptyState,
  Icon,
  IconButton,
  IdBadge,
  InlineField,
  keyboardMenuPoint,
  LabelChip,
  ListRow,
  Menu,
  type MenuEntry,
  type PropertyItem,
  PropertyList,
  RowList,
  RowMenu,
  RowSection,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  Split,
  Tabs,
  TextArea,
  toast,
  usePhone,
  useShell,
  ViewLayout,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { createSignal, For, Show } from "solid-js"
import {
  ACTIVITY,
  COMMENTS,
  ISSUE_VIEWS,
  type Issue,
  type IssueState,
  PEOPLE,
  PRIORITY_LABEL,
  type Priority,
  type Project,
  person,
  RELATED,
  STATE_LABEL,
  STATE_ORDER,
} from "../../data"
import { PriorityIcon, StateIcon } from "../../glyphs"
import { changeIssue, issueById, issueByKey, issuesIn, removeIssues } from "./data"
import { NewIssueDialog } from "./new-issue"

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

/** The menu of one issue, or of the selection: the same entries on a right click and behind "…". */
function issueMenu(count: number): MenuEntry[] {
  const one = count === 1
  return [
    ...(one
      ? ([
          { id: "open", label: "Open", icon: "arrow-up-right" },
          { id: "details", label: "Show details", icon: "panel-right", shortcut: "⌥ D" },
          { id: "copy", label: "Copy link", icon: "link" },
          { type: "separator" },
        ] satisfies MenuEntry[])
      : []),
    { type: "label", label: one ? "Move to" : `Move ${count} to` },
    ...STATE_ORDER.map((st) => ({
      id: `state:${st}`,
      label: STATE_LABEL[st],
      leading: <StateIcon state={st} label={false} />,
    })),
    { type: "separator" },
    { id: "delete", label: one ? "Delete" : `Delete ${count}`, icon: "trash", danger: true },
  ]
}

/** Runs an entry of the issue menu on the issues it was opened for. */
export function runIssueMenu(shell: ShellRegistry, id: string, keys: string[], onDone?: () => void) {
  const list = keys.map((k) => issueByKey(k)).filter((i): i is Issue => !!i)
  if (!list.length) return
  if (id === "open") shell.toPlace(undefined, "issues", undefined, list[0]!.key)
  else if (id === "details") {
    shell.select(list[0]!.key)
    shell.showPanel("details")
  } else if (id === "copy") {
    void navigator.clipboard
      ?.writeText(`${location.origin}${location.pathname}#${shell.address()}`)
      .catch(() => {})
    toast({ title: "Link copied", description: list[0]!.key })
  } else if (id.startsWith("state:")) {
    const state = id.slice(6) as IssueState
    for (const i of list) changeIssue(i.id, { state })
    toast({
      title: `${list.length === 1 ? list[0]!.key : `${list.length} issues`} moved to ${STATE_LABEL[state]}`,
    })
  } else if (id === "delete") {
    const undo = removeIssues(list.map((i) => i.id))
    toast({
      title: list.length === 1 ? `Deleted ${list[0]!.key}` : `Deleted ${list.length} issues`,
      action: { label: "Undo", onClick: undo },
    })
  }
  onDone?.()
}

// ── The list ────────────────────────────────────────────────────────────────────────────────────────

function IssueList(props: { shell: ShellRegistry; onNew: () => void }) {
  const phone = usePhone()
  const s = props.shell
  const view = () => s.loc().view?.id ?? ISSUE_VIEWS[0]!.id
  /** The saved view in the address: the place's own (the first) takes no segment. */
  const viewSeg = () => (view() === ISSUE_VIEWS[0]!.id ? undefined : view())
  const list = () => issuesIn(projectOf(s).id, view())
  const groups = () =>
    STATE_ORDER.map((st) => ({ state: st, issues: list().filter((i) => i.state === st) })).filter(
      (g) => g.issues.length,
    )
  // Cmd or Ctrl and a click toggles an issue, Shift and a click selects a range; a plain click opens it.
  const selection = createSelection<string>({ keys: () => list().map((i) => i.key) })
  const [rowMenu, setRowMenu] = createSignal<{
    at: { x: number; y: number }
    keys: string[]
    el: HTMLElement
  }>()
  const [bulk, setBulk] = createSignal<HTMLElement>()

  const keysFor = (key: string) =>
    selection.isSelected(key) && selection.count() > 1 ? [...selection.selected()] : [key]

  return (
    <ViewLayout
      id="demo.issues"
      header={
        <ShellViewHeader
          title="Issues"
          actions={[
            ...(selection.count() > 1
              ? [
                  {
                    id: "bulk",
                    label: `Change ${selection.count()} issues`,
                    icon: "list-checks" as const,
                    count: selection.count(),
                    onClick: () => setBulk(document.activeElement as HTMLElement),
                  },
                ]
              : []),
            { id: "new", label: "New issue", icon: "plus", shortcut: "C", onClick: props.onNew },
          ]}
        >
          {/* A phone's header has no room for a view switch beside the trail; the sidebar lists the views. */}
          <Show when={!phone()}>
            <Tabs
              label="Saved views"
              items={ISSUE_VIEWS.map((v) => ({ id: v.id, label: v.label }))}
              value={view()}
              onChange={(id) => s.toPlace(undefined, "issues", id === ISSUE_VIEWS[0]!.id ? undefined : id)}
            />
          </Show>
        </ShellViewHeader>
      }
    >
      <Show
        when={groups().length}
        fallback={
          <EmptyState title="No issues in this view">
            <Button variant="secondary" icon="plus" onClick={props.onNew}>
              New issue
            </Button>
          </EmptyState>
        }
      >
        <RowList label="Issues">
          <For each={groups()} keyed={(g) => g.state}>
            {(g) => (
              <RowSection
                label={STATE_LABEL[g().state]}
                leading={<StateIcon state={g().state} label={false} />}
                count={g().issues.length}
                actions={
                  <IconButton
                    icon="plus"
                    size="sm"
                    label={`New issue in ${STATE_LABEL[g().state]}`}
                    onClick={props.onNew}
                  />
                }
              >
                <For each={g().issues} keyed={(i) => i.id}>
                  {(i) => (
                    <ListRow
                      leading={<PriorityIcon priority={i().priority} />}
                      prefix={
                        <>
                          <span>{i().key}</span>
                          <StateIcon state={i().state} />
                        </>
                      }
                      title={i().title}
                      meta={
                        <>
                          <For each={i().labels}>{(l) => <LabelChip hue={l.hue}>{l.name}</LabelChip>}</For>
                          <Who id={i().assignee} />
                          <span>{i().updated}</span>
                        </>
                      }
                      selected={selection.isSelected(i().key) || s.selection() === i().key}
                      onClick={(e) => {
                        if (selection.click(i().key, e, true)) return
                        selection.set([])
                        s.toPlace(undefined, "issues", viewSeg(), i().key)
                      }}
                      menu={issueMenu(keysFor(i().key).length)}
                      menuLabel={`Actions for ${i().key}`}
                      onMenuSelect={(id) => runIssueMenu(s, id, keysFor(i().key), () => selection.set([]))}
                      actions={
                        <>
                          <IconButton
                            icon="panel-right"
                            label="Show details"
                            size="sm"
                            onClick={() => {
                              s.select(i().key)
                              s.showPanel("details")
                            }}
                          />
                          <IconButton
                            icon="more"
                            label={`More for ${i().key}`}
                            size="sm"
                            onClick={(e) => {
                              const el = e.currentTarget as HTMLElement
                              setRowMenu({ at: keyboardMenuPoint(el), keys: keysFor(i().key), el })
                            }}
                          />
                        </>
                      }
                    />
                  )}
                </For>
              </RowSection>
            )}
          </For>
        </RowList>
      </Show>
      <Show when={rowMenu()} keyed>
        {(m) => (
          <RowMenu
            at={m.at}
            label={`Actions for ${m.keys.length === 1 ? m.keys[0] : `${m.keys.length} issues`}`}
            items={issueMenu(m.keys.length)}
            origin={m.el}
            returnFocus={() => m.el}
            onClose={() => setRowMenu(undefined)}
            onSelect={(id) => {
              setRowMenu(undefined)
              runIssueMenu(s, id, m.keys, () => selection.set([]))
            }}
          />
        )}
      </Show>
      <Menu
        open={!!bulk()}
        anchor={bulk()}
        placement="bottom-end"
        label={`Change ${selection.count()} issues`}
        items={issueMenu(selection.count())}
        onClose={() => setBulk(undefined)}
        onSelect={(id) => {
          setBulk(undefined)
          runIssueMenu(s, id, [...selection.selected()], () => selection.set([]))
        }}
      />
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
          onSelect={(id) => changeIssue(i().id, { state: id as IssueState })}
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
          onSelect={(id) => changeIssue(i().id, { priority: id as Priority })}
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
          onSelect={(id) => changeIssue(i().id, { assignee: id === "none" ? undefined : id })}
        >
          <Who id={i().assignee} />
          {person(i().assignee)?.name ?? "No one"}
        </Choice>
      ),
    },
    {
      label: "Labels",
      value: i().labels.length ? (
        <span class="dm-row">
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
  const [comment, setComment] = createSignal("")
  const items = () =>
    ACTIVITY[props.issue.id] ?? [
      { who: props.issue.assignee ?? "jonas", what: "created the issue", ago: props.issue.updated },
    ]
  return (
    <section class="dm-col">
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
            <div class="dm-row">
              <Who id={c.who} />
              <span class="label">{nameOf(c.who)}</span>
              <span class="nc-meta">{c.ago}</span>
            </div>
            <div>{c.text}</div>
          </Card>
        )}
      </For>
      <TextArea
        aria-label="Comment"
        placeholder="Leave a comment…"
        rows={2}
        value={comment()}
        onInput={(e) => setComment(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && comment().trim()) {
            toast({ title: "Comment posted", description: props.issue.key })
            setComment("")
          }
        }}
      />
    </section>
  )
}

/** An issue's body: its key, the title edited in place, the description, the activity. */
function IssueBody(props: { issue: Issue }) {
  return (
    <article class="dm-build-record">
      <IdBadge>{props.issue.key}</IdBadge>
      <InlineField
        variant="title"
        label="Title"
        value={props.issue.title}
        onCommit={(v) => changeIssue(props.issue.id, { title: v })}
      />
      <InlineField
        multiline
        label="Description"
        placeholder="Add a description…"
        value={props.issue.description}
        onCommit={(v) => changeIssue(props.issue.id, { description: v })}
      />
      <Activity issue={props.issue} />
    </article>
  )
}

function IssuePage(props: { issue: Issue; shell: ShellRegistry }) {
  const phone = usePhone()
  return (
    <ViewLayout
      id="demo.issue"
      scroll={false}
      header={
        <ShellViewHeader
          actions={[
            {
              id: "link",
              label: "Copy link",
              icon: "link",
              onClick: () => runIssueMenu(props.shell, "copy", [props.issue.key]),
            },
            {
              id: "delete",
              label: "Delete issue",
              icon: "trash",
              overflow: true,
              danger: true,
              onClick: () => {
                const key = props.issue.key
                props.shell.toPlace(undefined, "issues")
                runIssueMenu(props.shell, "delete", [key])
              },
            },
          ]}
        />
      }
    >
      {/* A Split keeps its columns side by side on a phone, so there the properties go under the body. */}
      <Show
        when={!phone()}
        fallback={
          <div class="dm-scroll">
            <IssueBody issue={props.issue} />
            <aside class="dm-build-props" aria-label="Properties">
              <IssueProperties issue={props.issue} />
            </aside>
          </div>
        }
      >
        <Split
          fixed="second"
          defaultSize={280}
          min={220}
          max={440}
          label="Resize properties"
          // With Details open on this issue, the panel is its properties: the column steps aside, so a fact shows once.
          collapsed={
            props.shell.panels().right?.id === "details" && props.shell.subject("details") === props.issue.key
          }
          first={
            <div class="dm-scroll">
              <IssueBody issue={props.issue} />
            </div>
          }
          second={
            <aside class="dm-pad dm-scroll" aria-label="Properties">
              <IssueProperties issue={props.issue} />
            </aside>
          }
        />
      </Show>
    </ViewLayout>
  )
}

/** Build › Issues: the list, or the issue the address names. */
export function IssuesView(props: ShellViewProps) {
  const [creating, setCreating] = createSignal(false)
  const record = () => {
    const key = props.shell.loc().record
    return key ? issueByKey(key) : undefined
  }
  return (
    <>
      <Show
        when={record()}
        fallback={
          <Show
            when={!props.shell.loc().record}
            fallback={
              <ViewLayout id="demo.issue" header={<ShellViewHeader />}>
                <EmptyState title="This issue was deleted" />
              </ViewLayout>
            }
          >
            <IssueList shell={props.shell} onNew={() => setCreating(true)} />
          </Show>
        }
      >
        {(i) => <IssuePage issue={i()} shell={props.shell} />}
      </Show>
      <NewIssueDialog
        open={creating()}
        project={projectOf(props.shell).id}
        onClose={() => setCreating(false)}
        onCreated={(issue) => props.shell.toPlace(undefined, "issues", undefined, issue.key)}
      />
    </>
  )
}

/** What the Details panel shows for an issue: its key, title and properties; related issues drill the panel. */
export function IssueDetails(props: { id: string }) {
  const shell = useShell()
  return (
    <Show when={issueByKey(props.id)} fallback={<EmptyState size="sm" title="No such issue" />}>
      {(i) => (
        <div class="dm-col dm-pad">
          {/* On the issue's own page the view names it; elsewhere the panel says which issue it is. */}
          <Show when={!(shell?.loc().place?.id === "issues" && shell.loc().record === i().key)}>
            <div class="dm-row">
              <IdBadge>{i().key}</IdBadge>
              <span class="dm-grow" />
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
          </Show>
          <IssueProperties issue={i()} onRelated={(key) => shell?.drill("details", key)} />
        </div>
      )}
    </Show>
  )
}
