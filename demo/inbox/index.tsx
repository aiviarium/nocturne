// The workspace's inbox, its home: what needs the person, and the issue each notice is about beside it. On a
// phone the list is the screen, and a notice pushes its issue with the inbox as the way back.
import {
  Avatar,
  Button,
  Count,
  EmptyState,
  IdBadge,
  LabelChip,
  ListRow,
  PropertyList,
  RowList,
  type ShellRegistry,
  type ShellScope,
  ShellViewHeader,
  type ShellViewProps,
  Split,
  Tabs,
  toast,
  usePhone,
  type ViewAction,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { ACTIVITY, COMMENTS, type Issue, issueById, person, projectById, STATE_LABEL } from "../data"
import { StateIcon } from "../glyphs"
import { isUnread, markRead, markUnread, NOTICES, type Notice, unread } from "./data"
import "./inbox.css"

const nameOf = (id: string) => (id === "agent" ? "Coding agent" : (person(id)?.name ?? id))
const first = (id: string) => nameOf(id).split(" ")[0]

function NoticeRow(props: { notice: Notice; selected: boolean; onPick: () => void }) {
  const n = () => props.notice
  const i = () => issueById(n().issue)!
  const who = () => person(n().who)!
  return (
    <ListRow
      lines={2}
      leading={<Avatar name={who().name} hue={who().hue} size="sm" />}
      title={i().title}
      secondary={`${i().key} · ${first(n().who)} ${n().what}`}
      meta={
        <>
          <Show when={isUnread(n().id) && n().events > 1}>
            <Count value={n().events} aria-label={`${n().events} new`} />
          </Show>
          <span>{n().ago}</span>
        </>
      }
      status={<StateIcon state={i().state} />}
      unread={isUnread(n().id)}
      selected={props.selected}
      onClick={props.onPick}
      menuLabel={`Actions for ${i().key}`}
      menu={[
        isUnread(n().id)
          ? { id: "read", label: "Mark as read", icon: "check" }
          : { id: "unread", label: "Mark as unread", icon: "circle-dot" },
        { id: "open", label: "Open issue", icon: "arrow-up-right" },
      ]}
      onMenuSelect={(id) => {
        if (id === "read") markRead([n().id])
        else if (id === "unread") markUnread(n().id)
      }}
    />
  )
}

/** The issue a notice is about: its title, facts, description and what happened. */
function Reader(props: { issue: Issue }) {
  const i = () => props.issue
  const project = () => projectById(i().project)
  const activity = () => ACTIVITY[i().id] ?? []
  return (
    <article class="dm-page nc-reading">
      <div class="dm-row">
        <IdBadge>{i().key}</IdBadge>
        <For each={i().labels}>{(l) => <LabelChip hue={l.hue}>{l.name}</LabelChip>}</For>
      </div>
      <h1 class="heading dm-inbox-title">{i().title}</h1>
      <PropertyList
        labelWidth={88}
        items={[
          { label: "Project", value: project()?.name },
          {
            label: "Status",
            value: (
              <span class="dm-row">
                <StateIcon state={i().state} />
                {STATE_LABEL[i().state]}
              </span>
            ),
          },
          { label: "Assignee", value: i().assignee ? nameOf(i().assignee!) : undefined },
          { label: "Updated", value: <span class="nc-num">{i().updated}</span> },
        ]}
      />
      <p class="dm-inbox-body">{i().description}</p>
      <Show when={activity().length || COMMENTS[i().id]?.length}>
        <RowList label="Activity" variant="inline">
          <For each={activity()}>
            {(a) => (
              <ListRow
                leading={
                  a.who === "agent" ? (
                    <Avatar kind="agent" name="Coding agent" size="sm" />
                  ) : (
                    <Avatar name={nameOf(a.who)} hue={person(a.who)?.hue} size="sm" />
                  )
                }
                title={nameOf(a.who)}
                secondary={a.what}
                meta={a.ago}
              />
            )}
          </For>
          <For each={COMMENTS[i().id] ?? []}>
            {(c) => (
              <ListRow
                lines={3}
                leading={<Avatar name={nameOf(c.who)} hue={person(c.who)?.hue} size="sm" />}
                title={nameOf(c.who)}
                secondary={c.text}
                meta={c.ago}
              />
            )}
          </For>
        </RowList>
      </Show>
    </article>
  )
}

function InboxView(props: ShellViewProps) {
  const s: ShellRegistry = props.shell
  const phone = usePhone()
  const [filter, setFilter] = createSignal("all")
  const items = () => NOTICES.filter((n) => filter() === "all" || isUnread(n.id))
  // On a desktop the first notice is open from the start; on a phone the list is the screen until one is picked.
  const [picked, setPicked] = createSignal<string | undefined>(NOTICES[0]!.id)
  const [pushed, setPushed] = createSignal(false)
  const notice = createMemo(() => NOTICES.find((n) => n.id === picked()))
  const issue = () => issueById(notice()?.issue)
  const openIssue = (i: Issue) => s.go(`/projects/${i.project}/build/issues/${i.key}`)
  const pick = (n: Notice) => {
    setPicked(n.id)
    markRead([n.id])
    setPushed(true)
  }
  const actions = (): ViewAction[] => [
    ...(issue() && !phone()
      ? [
          {
            id: "open",
            label: "Open issue",
            icon: "arrow-up-right" as const,
            onClick: () => openIssue(issue()!),
          },
        ]
      : []),
    {
      id: "read",
      label: "Mark all as read",
      icon: "check",
      disabled: unread().length === 0,
      onClick: () => {
        const was = unread()
        markRead(was)
        toast({
          title: `${was.length} marked as read`,
          action: { label: "Undo", onClick: () => was.forEach(markUnread) },
        })
      },
    },
  ]
  const tabs = () => (
    <Tabs
      label="Show"
      items={[
        { id: "all", label: "All" },
        { id: "unread", label: "Unread" },
      ]}
      value={filter()}
      onChange={setFilter}
    />
  )
  const list = () => (
    <Show
      when={items().length}
      fallback={
        <EmptyState title="All caught up">
          <Button variant="secondary" onClick={() => setFilter("all")}>
            Show all
          </Button>
        </EmptyState>
      }
    >
      <RowList label="Notifications">
        <For each={items()} keyed={(n) => n.id}>
          {(n) => (
            <NoticeRow notice={n()} selected={!phone() && picked() === n().id} onPick={() => pick(n())} />
          )}
        </For>
      </RowList>
    </Show>
  )
  const reader = () => (
    <Show when={issue()} fallback={<EmptyState title="Nothing selected" />}>
      {(i) => <Reader issue={i()} />}
    </Show>
  )
  return (
    <Show
      when={phone() && pushed() && issue()}
      fallback={
        <ViewLayout
          id="demo.inbox"
          scroll={phone()}
          header={<ShellViewHeader actions={actions()}>{tabs()}</ShellViewHeader>}
        >
          <Show when={!phone()} fallback={list()}>
            <Split
              defaultSize={360}
              min={260}
              max={520}
              label="Resize the list"
              first={<div class="dm-scroll dm-fill">{list()}</div>}
              second={<div class="dm-scroll dm-fill">{reader()}</div>}
            />
          </Show>
        </ViewLayout>
      }
    >
      {(i) => (
        <ViewLayout
          id="demo.inbox"
          header={
            <ViewHeader
              trail={[
                { id: "inbox", label: "Inbox", onClick: () => setPushed(false) },
                { id: "issue", label: i().key },
              ]}
              actions={[
                { id: "open", label: "Open issue", icon: "arrow-up-right", onClick: () => openIssue(i()) },
              ]}
            />
          }
        >
          <Reader issue={i()} />
        </ViewLayout>
      )}
    </Show>
  )
}

export const inboxModule: ShellScope = {
  id: "inbox",
  label: "Inbox",
  icon: "inbox",
  view: InboxView,
  count: () => unread().length || undefined,
}
