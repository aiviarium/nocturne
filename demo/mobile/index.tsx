// Settings › Mobile app: Acme's companion app for phones, previewed in a phone-sized frame. PhoneOverride makes the
// parts inside behave as on a phone; the app is a tab bar over one navigation stack per tab.
import {
  ActionSheet,
  Avatar,
  BottomArea,
  IconButton,
  InsetGroup,
  InsetList,
  InsetRow,
  NavigationBar,
  NavigationScreen,
  NavigationStack,
  PhoneOverride,
  PullToRefresh,
  ScreenOptions,
  ScreenRefresh,
  ScreenSearch,
  Sheet,
  type ShellPlace,
  ShellViewHeader,
  Switch,
  TabBar,
  TextField,
  toast,
  ViewLayout,
} from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"
import { createSignal, For, Show } from "solid-js"
import {
  type Issue,
  issueById,
  issues,
  PRIORITY_LABEL,
  person,
  STATE_LABEL,
  STATE_ORDER,
  updateIssue,
} from "../data"
import { PriorityIcon, StateIcon } from "../glyphs"
import "./mobile.css"

type Tab = "inbox" | "issues" | "settings"
type Screen = { id: string; issue?: string }

const NOTES = [
  { id: "n1", issue: "142", who: "jonas", what: "mentioned you", ago: "12m" },
  { id: "n2", issue: "139", who: "sarah", what: "asked for your review", ago: "3h" },
  { id: "n3", issue: "138", who: "tomas", what: "moved it to In progress", ago: "4h" },
  { id: "n4", issue: "141", who: "jonas", what: "assigned you", ago: "1d" },
]

const SORTS = [
  { id: "state", label: "State" },
  { id: "priority", label: "Priority" },
  { id: "key", label: "Key" },
] as const
const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** An issue pushed onto a stack: its properties, its description, and a comment field above the keyboard. */
function IssueScreen(props: { issue: Issue; back: { label: string; onClick: () => void } }) {
  const [more, setMore] = createSignal(false)
  const [comment, setComment] = createSignal("")
  const send = () => {
    if (!comment().trim()) return
    setComment("")
    toast({ title: `Comment on ${props.issue.key} posted`, tone: "success", duration: 2000 })
  }
  return (
    <NavigationScreen
      title={props.issue.key}
      back={props.back}
      actions={[{ id: "more", label: "More", icon: "more", onClick: () => setMore(true) }]}
    >
      <ScreenOptions mode="fill" />
      <div class="dm-mobile-fill">
        <div class="dm-mobile-scroll">
          <InsetList>
            <InsetGroup title={props.issue.title} footer={props.issue.description || undefined}>
              <InsetRow
                label="Status"
                leading={<StateIcon state={props.issue.state} label={false} />}
                value={STATE_LABEL[props.issue.state]}
              />
              <InsetRow
                label="Priority"
                leading={<PriorityIcon priority={props.issue.priority} label={false} />}
                value={PRIORITY_LABEL[props.issue.priority]}
              />
              <InsetRow label="Assignee" icon="user" value={person(props.issue.assignee)?.name ?? "No one"} />
            </InsetGroup>
          </InsetList>
        </div>
        <BottomArea class="dm-mobile-bottom">
          <div class="dm-row">
            <TextField
              class="dm-grow"
              aria-label="Comment"
              placeholder="Comment…"
              value={comment()}
              onInput={(e) => setComment(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <IconButton icon="send" label="Send" onClick={send} disabled={!comment().trim()} />
          </div>
        </BottomArea>
      </div>
      <ActionSheet
        open={more()}
        onClose={() => setMore(false)}
        title={props.issue.key}
        actions={[
          { id: "link", label: "Copy link" },
          { id: "mute", label: "Mute notifications" },
          { id: "close", label: "Close issue", danger: true, disabled: props.issue.state === "done" },
        ]}
        onSelect={(id) => {
          setMore(false)
          if (id === "close") {
            updateIssue(props.issue.id, { state: "done" })
            toast({ title: `${props.issue.key} closed` })
          } else toast({ title: id === "link" ? "Link copied" : "Muted", duration: 2000 })
        }}
      />
    </NavigationScreen>
  )
}

/** One tab's stack: a root screen, and the issues pushed from it. */
function Stack(props: {
  label: string
  stack: Screen[]
  setStack: (s: Screen[]) => void
  root: () => JSX.Element
}) {
  const back = () => props.setStack(props.stack.slice(0, -1))
  return (
    <NavigationStack items={props.stack} getKey={(s) => s.id} onBack={back} label={props.label}>
      {(s, i) => (
        <Show when={i() > 0 && issueById(s().issue)} fallback={props.root()}>
          {(issue) => <IssueScreen issue={issue()} back={{ label: props.label, onClick: back }} />}
        </Show>
      )}
    </NavigationStack>
  )
}

function InboxRoot(props: { open: (issue: string) => void }) {
  const [read, setRead] = createSignal<string[]>([])
  const [archived, setArchived] = createSignal<string[]>([])
  const notes = () => NOTES.filter((n) => !archived().includes(n.id))
  const flip = (id: string) => setRead((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))
  return (
    <NavigationScreen
      title="Inbox"
      largeTitle
      level="index"
      actions={[
        { id: "read", label: "Mark all read", icon: "check", onClick: () => setRead(NOTES.map((n) => n.id)) },
      ]}
    >
      <ScreenRefresh onRefresh={() => wait(700)} />
      <InsetList>
        <InsetGroup label="Notifications">
          <For each={notes()}>
            {(n) => {
              const who = person(n.who)!
              const issue = () => issueById(n.issue)
              return (
                <InsetRow
                  label={`${who.name.split(" ")[0]} ${n.what}`}
                  detail={issue() ? `${issue()!.key} ${issue()!.title}` : undefined}
                  value={n.ago}
                  muted={read().includes(n.id)}
                  leading={<Avatar name={who.name} hue={who.hue} size="sm" />}
                  onClick={() => {
                    setRead((r) => [...new Set([...r, n.id])])
                    props.open(n.issue)
                  }}
                  leadingActions={[
                    {
                      id: "read",
                      label: read().includes(n.id) ? "Unread" : "Read",
                      icon: "eye",
                      onAction: () => flip(n.id),
                    },
                  ]}
                  trailingActions={[
                    {
                      id: "archive",
                      label: "Archive",
                      icon: "archive",
                      tone: "accent",
                      onAction: () => setArchived((a) => [...a, n.id]),
                    },
                  ]}
                  menu={[
                    {
                      id: "read",
                      label: read().includes(n.id) ? "Mark as unread" : "Mark as read",
                      icon: "eye",
                    },
                    { id: "archive", label: "Archive", icon: "archive" },
                  ]}
                  onMenuSelect={(id) => (id === "read" ? flip(n.id) : setArchived((a) => [...a, n.id]))}
                />
              )
            }}
          </For>
        </InsetGroup>
      </InsetList>
    </NavigationScreen>
  )
}

function IssuesRoot(props: { open: (issue: string) => void }) {
  const [query, setQuery] = createSignal("")
  const [sort, setSort] = createSignal<(typeof SORTS)[number]["id"]>("state")
  const [done, setDone] = createSignal(false)
  const [sheet, setSheet] = createSignal(false)
  const list = () => {
    const q = query().trim().toLowerCase()
    const rank = (i: Issue) =>
      sort() === "state"
        ? STATE_ORDER.indexOf(i.state)
        : sort() === "priority"
          ? PRIORITY_ORDER.indexOf(i.priority)
          : -Number(i.id)
    return issues()
      .filter((i) => i.project === "atlas" && (done() || i.state !== "done"))
      .filter((i) => !q || `${i.key} ${i.title}`.toLowerCase().includes(q))
      .sort((a, b) => rank(a) - rank(b))
  }
  return (
    <NavigationScreen
      title="Issues"
      level="index"
      actions={[
        { id: "sort", label: "Sort and filter", icon: "sliders-horizontal", onClick: () => setSheet(true) },
      ]}
    >
      <ScreenOptions largeTitle />
      <ScreenSearch value={query()} onInput={setQuery} placeholder="Search issues" label="Search issues" />
      <InsetList>
        <InsetGroup label="Atlas web">
          <For each={list()}>
            {(i) => (
              <InsetRow
                label={i.title}
                detail={`${i.key} · ${STATE_LABEL[i.state]}`}
                leading={<PriorityIcon priority={i.priority} />}
                onClick={() => props.open(i.id)}
                chevron
              />
            )}
          </For>
        </InsetGroup>
      </InsetList>
      <Sheet
        open={sheet()}
        onClose={() => setSheet(false)}
        title="Sort and filter"
        detents={["medium", "large"]}
        flush
      >
        <InsetList>
          <InsetGroup title="Sort by">
            <For each={SORTS}>
              {(s) => <InsetRow label={s.label} checked={sort() === s.id} onClick={() => setSort(s.id)} />}
            </For>
          </InsetGroup>
          <InsetGroup>
            <InsetRow
              label="Show done issues"
              trailing={<Switch aria-label="Show done issues" checked={done()} onChange={setDone} />}
            />
          </InsetGroup>
        </InsetList>
      </Sheet>
    </NavigationScreen>
  )
}

function SettingsTab() {
  const [push, setPush] = createSignal(true)
  const [digest, setDigest] = createSignal(false)
  const [signOut, setSignOut] = createSignal(false)
  return (
    <div class="dm-mobile-tab">
      <NavigationBar title="Settings" />
      <PullToRefresh onRefresh={() => wait(700)} class="dm-mobile-scroll" label="Refresh settings">
        <InsetList>
          <InsetGroup>
            <InsetRow
              label="Mira Okonkwo"
              detail="mira@acme.dev"
              leading={<Avatar name="Mira Okonkwo" hue="orchid" size="sm" />}
              chevron
            />
          </InsetGroup>
          <InsetGroup title="Notifications">
            <InsetRow
              label="Push notifications"
              trailing={<Switch aria-label="Push notifications" checked={push()} onChange={setPush} />}
            />
            <InsetRow
              label="Daily digest"
              trailing={<Switch aria-label="Daily digest" checked={digest()} onChange={setDigest} />}
            />
          </InsetGroup>
          <InsetGroup>
            <InsetRow label="Sign out" danger onClick={() => setSignOut(true)} />
          </InsetGroup>
        </InsetList>
      </PullToRefresh>
      <ActionSheet
        open={signOut()}
        onClose={() => setSignOut(false)}
        message="Sign out of Acme on this phone?"
        actions={[{ id: "out", label: "Sign out", danger: true }]}
        onSelect={() => {
          setSignOut(false)
          toast({ title: "Signed out", description: "Not really: this is the demo." })
        }}
      />
    </div>
  )
}

/** The companion app: a tab bar over a stack per tab. */
function CompanionApp() {
  const [tab, setTab] = createSignal<Tab>("inbox")
  const [inbox, setInbox] = createSignal<Screen[]>([{ id: "root" }])
  const [list, setList] = createSignal<Screen[]>([{ id: "root" }])
  const push = (set: (s: Screen[]) => void, now: Screen[]) => (issue: string) =>
    set([...now, { id: `issue:${issue}`, issue }])
  return (
    <div class="dm-mobile-app">
      {/* One stack at a time: NavigationStack's `hidden` warns in strict mode (see the demo's report). */}
      <Show when={tab() === "inbox"}>
        <Stack
          label="Inbox"
          stack={inbox()}
          setStack={setInbox}
          root={() => <InboxRoot open={(id) => push(setInbox, inbox())(id)} />}
        />
      </Show>
      <Show when={tab() === "issues"}>
        <Stack
          label="Issues"
          stack={list()}
          setStack={setList}
          root={() => <IssuesRoot open={(id) => push(setList, list())(id)} />}
        />
      </Show>
      <Show when={tab() === "settings"}>
        <SettingsTab />
      </Show>
      <TabBar
        label="Acme"
        active={tab()}
        onSelect={(id) => setTab(id as Tab)}
        onReselect={(id) => (id === "inbox" ? setInbox(inbox().slice(0, 1)) : setList(list().slice(0, 1)))}
        items={[
          { id: "inbox", label: "Inbox", icon: "inbox", badge: NOTES.length },
          { id: "issues", label: "Issues", icon: "list-todo" },
          { id: "settings", label: "Settings", icon: "settings" },
        ]}
      />
    </div>
  )
}

function MobileView() {
  return (
    <ViewLayout id="demo.mobile" header={<ShellViewHeader noPin />}>
      <div class="dm-mobile-stage">
        <PhoneOverride value={true}>
          <div class="dm-mobile-device" role="group" aria-label="Acme on a phone" data-part="demo-phone">
            <CompanionApp />
          </div>
        </PhoneOverride>
      </div>
    </ViewLayout>
  )
}

export const mobilePlace: ShellPlace = {
  id: "mobile",
  label: "Mobile app",
  icon: "smartphone",
  view: MobileView,
}
