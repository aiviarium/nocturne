// The agent's places in a project's Build lens: Chats (the project's conversations, each a record with its trail and
// stepper) and Runs (every run of the project's agents, hundreds of rows in a list that renders only what is in view).
import {
  Avatar,
  Button,
  type ChatMediaItem,
  ContextWidget,
  compactCount,
  createWidgetBoard,
  EmptyState,
  Icon,
  keyboardMenuPoint,
  List,
  ListRow,
  MediaViewer,
  type MenuEntry,
  RateWidget,
  type RowKey,
  RowList,
  RowMenu,
  type RowMenuEntry,
  SectionHeading,
  ShellViewHeader,
  type ShellViewProps,
  State,
  StatusDot,
  StopGlyph,
  TranscriberProvider,
  toast,
  useShell,
  ViewLayout,
  WidgetBoard,
  WidgetRows,
  type WidgetSegment,
  WidgetZone,
} from "@aiviarium/nocturne"
import { createEffect, createSignal, For, Show, untrack } from "solid-js"
import { useDemo } from "../context"
import type { Project } from "../data"
import { askName, copyLink, demoShell, inList, named, renameEntry, undoable } from "../menus"
import { ChatComposer, Transcript } from "./chat"
import {
  CONTEXT_TOTAL,
  type Conversation,
  conversationById,
  conversationsOf,
  isStreaming,
  newConversation,
  type Run,
  removeConversations,
  renameConversation,
  runsOf,
  stop,
  waitsOnYou,
} from "./data"
import { micBlocked, setMicBlocked, transcriber } from "./transcriber"
import { CHAT_LAYOUT, CHAT_ZONES, chatFit } from "./widget-zones"
import { CHAT_WIDGETS } from "./widgets"

/** The project the view is in; the panel's chat falls back to Atlas web outside a project. */
export const projectHere = (shell: { loc: () => { frame?: { item?: unknown } } }) => {
  const item = shell.loc().frame?.item as Partial<Project> | undefined
  return item?.key && item.id ? item.id : "atlas"
}
/** A chat's address. */
export const chatPath = (c: Conversation) => `/projects/${c.project}/build/chats/${c.id}`

/** Opens a new conversation in the project the view is in. */
export const startChat = (shell: {
  loc: () => { frame?: { item?: unknown } }
  toPlace: (f: undefined, place: string, view?: string, record?: string) => void
}) => shell.toPlace(undefined, "chats", undefined, newConversation(projectHere(shell)))

function MicAction() {
  return {
    id: "mic",
    label: micBlocked() ? "Allow the microphone" : "Block the microphone (try the notice)",
    icon: "mic" as const,
    overflow: true,
    checked: micBlocked(),
    onClick: () => setMicBlocked(!micBlocked()),
  }
}

const remove = (list: Conversation[]) => {
  const shell = demoShell()
  const ids = list.map((c) => c.id)
  // The chat open in the view goes back to the list.
  if (shell.loc().place?.id === "chats" && ids.includes(shell.loc().record ?? ""))
    shell.toPlace(undefined, "chats")
  undoable(
    `Deleted ${named(
      list.map((c) => c.title),
      "chats",
    )}`,
    removeConversations(ids),
  )
}

/** The menu of a chat, or of several: in the list of chats and on its entry in the sidebar. */
export function chatMenu(list: Conversation[]): RowMenuEntry[] {
  const c = list[0]
  if (!c) return []
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
  const shell = demoShell()
  return [
    {
      id: "open",
      label: "Open",
      icon: "arrow-up-right",
      onSelect: () => shell.go(chatPath(c)),
    },
    {
      id: "details",
      label: "Show details",
      icon: "panel-right",
      onSelect: () => {
        shell.select(c.id)
        shell.showPanel("details")
      },
    },
    {
      id: "copy",
      label: "Copy link",
      icon: "link",
      onSelect: () => copyLink(c.title, chatPath(c)),
    },
    renameEntry(() =>
      askName({
        title: "Rename chat",
        value: c.title,
        submit: "Rename",
        onSubmit: (title) => renameConversation(c.id, title),
      }),
    ),
    ...(isStreaming(c)
      ? [{ id: "stop", label: "Stop", icon: "square", onSelect: () => stop(c.id) } as const]
      : []),
    { type: "separator" },
    { id: "delete", label: "Delete", icon: "trash", danger: true, onSelect: () => remove([c]) },
  ]
}

function ConversationList(props: ShellViewProps) {
  const [selected, setSelected] = createSignal<RowKey[]>([])
  const conversations = () => conversationsOf(projectHere(props.shell))
  return (
    <ViewLayout
      id="demo.agent.chats"
      header={
        <ShellViewHeader
          actions={[
            {
              id: "new",
              label: "New chat",
              icon: "plus",
              shortcut: "N",
              onClick: () => startChat(props.shell),
            },
          ]}
        />
      }
    >
      <Show
        when={conversations().length}
        fallback={
          <EmptyState title="No chats">
            <Button variant="secondary" icon="plus" onClick={() => startChat(props.shell)}>
              New chat
            </Button>
          </EmptyState>
        }
      >
        {/* The items are the ids, so a row stays while its chat streams (a new object each word). */}
        <RowList
          label="Chats"
          items={conversations().map((c) => c.id)}
          getKey={(id) => id}
          itemLabel={(id) => conversationById(id)?.title ?? id}
          selectable
          selected={selected()}
          onSelectedChange={(keys) => {
            setSelected(keys)
            props.shell.select(keys.length === 1 ? String(keys[0]) : undefined)
          }}
          onRemove={(keys) => removeConversations(keys as string[])}
          rowMenu={(t) => inList(chatMenu(t.items.flatMap((id) => conversationById(id) ?? [])))}
        >
          {(id) => (
            <Show when={conversationById(id)}>
              {(c) => (
                <ListRow
                  leading={<Avatar kind="agent" name="Agent" size="sm" />}
                  title={c().title}
                  status={
                    isStreaming(c()) ? (
                      <State status="ai">Working</State>
                    ) : waitsOnYou(c()) ? (
                      <State status="warn">Needs you</State>
                    ) : undefined
                  }
                  meta={c().updated}
                  onClick={() => props.shell.toPlace(undefined, "chats", undefined, id)}
                  onRename={(title) => renameConversation(id, title)}
                />
              )}
            </Show>
          )}
        </RowList>
      </Show>
    </ViewLayout>
  )
}

function ConversationPage(props: ShellViewProps & { id: string }) {
  // While a reply streams, Esc stops it before it goes up to the list.
  const running = () => {
    const c = conversationById(props.id)
    return !!c && isStreaming(c)
  }
  createEffect(running, (on) => {
    if (!on) return
    const id = untrack(() => props.id)
    return props.shell.pushEsc(() => stop(id))
  })
  const demo = useDemo()
  // The conversation's widgets: the same board as the dashboard's, with the zones around the transcript.
  const board = createWidgetBoard<string>({
    types: CHAT_WIDGETS,
    zones: CHAT_ZONES,
    initial: CHAT_LAYOUT,
    storage: demo.storage,
    key: "demo/agent/widgets",
    context: () => props.id,
    fit: chatFit,
    hideEmpty: true,
  })
  /** An approval widget showing that keeps the decision out of the transcript. */
  const approvalInline = () =>
    board.layout().some((p) => {
      const z = board.zone(chatFit(p.zone, board.width()))
      return (
        (p.type ?? p.id) === "approval" && board.configOf(p).transcript === false && !!z && board.visible(z)
      )
    })
  /** A bar of three zones, its start, centre and end. */
  const Bar = (b: { place: "top" | "above" | "below" }) => (
    <div class={`dm-agent-bar dm-agent-bar--${b.place}`}>
      {/* A widget grown to a row (an approval) draws over the three zones, which keep their places. */}
      <WidgetRows
        board={board}
        zones={[`${b.place}-start`, `${b.place}-center`, `${b.place}-end`]}
        placement={b.place === "top" ? "bottom-start" : "top-start"}
        class="dm-agent-bar__rows"
      />
      <For each={["start", "center", "end"]}>
        {(at) => (
          <WidgetZone
            board={board}
            zone={`${b.place}-${at}`}
            placement={b.place === "top" ? "bottom-start" : "top-start"}
            class={`dm-agent-bar__${at}`}
          />
        )}
      </For>
    </div>
  )
  return (
    <ViewLayout
      id="demo.agent.chat"
      scroll={false}
      header={
        <ShellViewHeader
          // While arranging widgets the header holds only the board's actions.
          actions={[
            ...(board.editing()
              ? []
              : [
                  {
                    id: "new",
                    label: "New chat",
                    icon: "plus" as const,
                    onClick: () => startChat(props.shell),
                  },
                  MicAction(),
                ]),
            ...board.actions(),
          ]}
        />
      }
    >
      {/* The column is centred. Around it the widget board's zones: a bar over the transcript, a column either side
          where there is room, and a bar over and under the composer. */}
      <WidgetBoard board={board}>
        <div
          class="dm-agent-chat"
          ref={board.measure}
          data-approval-inline={approvalInline() ? "" : undefined}
        >
          <Transcript cid={props.id} />
          <Bar place="top" />
          <aside class="dm-agent-side dm-agent-side--start" aria-label="Left widgets">
            <WidgetZone board={board} zone="left-top" />
            <WidgetZone board={board} zone="left-bottom" class="dm-agent-side__foot" />
          </aside>
          <aside class="dm-agent-side dm-agent-side--end" aria-label="Right widgets">
            <WidgetZone board={board} zone="right-top" placement="left-start" />
            <WidgetZone
              board={board}
              zone="right-bottom"
              placement="left-start"
              class="dm-agent-side__foot"
            />
          </aside>
          <div class="dm-agent-foot">
            <div class="dm-agent-column">
              <Bar place="above" />
              <ChatComposer cid={props.id} />
              <Bar place="below" />
            </div>
          </div>
        </div>
      </WidgetBoard>
    </ViewLayout>
  )
}

/** Build › Chats: the conversations, or the one the address names. */
export function ChatsView(props: ShellViewProps) {
  const id = () => {
    const r = props.shell.loc().record
    return r && conversationById(r) ? r : undefined
  }
  return (
    <TranscriberProvider transcriber={transcriber}>
      <Show when={id()} fallback={<ConversationList shell={props.shell} />}>
        {(cid) => <ConversationPage shell={props.shell} id={cid()} />}
      </Show>
    </TranscriberProvider>
  )
}

/** What fills a context window of `used` tokens: the fixed system prompt and tools, then files and the chat. */
const parts = (used: number): WidgetSegment[] => {
  const rest = Math.max(0, used - 18_000)
  const files = Math.round(rest * 0.4)
  return [
    { label: "System", value: 6_200 },
    { label: "Tools", value: 11_800 },
    { label: "Files", value: files },
    { label: "Chat", value: rest - files },
  ].map((p) => ({ ...p, display: compactCount(p.value) }))
}

/** The middle of the readings while it was writing. */
const median = (rates: number[]) => {
  const on = rates.filter((r) => r > 0).sort((a, b) => a - b)
  return on.length ? on[Math.floor(on.length / 2)]! : 0
}

/** The images shared in a conversation, in a list; one opens in the viewer, which steps through them all. */
function Images(props: { id: string }) {
  const [viewing, setViewing] = createSignal<number | null>(null)
  const images = (): ChatMediaItem[] =>
    (conversationById(props.id)?.turns ?? []).flatMap((t) =>
      t.blocks.flatMap((b) => (b.t === "media" ? b.items.filter((i) => i.kind === "image" && i.src) : [])),
    )
  return (
    <Show when={images().length}>
      <section class="dm-col" aria-label="Images">
        <SectionHeading title="Images" />
        <List
          label="Images"
          items={images()}
          height={images().length * 30}
          onSelect={(_, i) => setViewing(i)}
        >
          {(img) => (
            <>
              <Icon name="image" size="sm" tone="quiet" />
              <span class="dm-grow nc-truncate">{img.alt}</span>
            </>
          )}
        </List>
        <MediaViewer
          open={viewing() !== null}
          onClose={() => setViewing(null)}
          items={images()}
          index={viewing() ?? 0}
          onIndexChange={setViewing}
        />
      </section>
    </Show>
  )
}

/** A conversation's context window. */
function ChatContext(props: { id: string; size?: "row" | "md" | "lg" }) {
  const c = () => conversationById(props.id)
  const share = () => (c()?.used ?? 0) / CONTEXT_TOTAL
  return (
    <Show when={c()}>
      {(conv) => (
        <ContextWidget
          size={props.size ?? "md"}
          used={conv().used}
          total={CONTEXT_TOTAL}
          hue={share() > 0.8 ? "danger" : share() > 0.6 ? "warning" : undefined}
          parts={parts(conv().used)}
        />
      )}
    </Show>
  )
}

/** How fast the agent wrote, over the last minute. */
function ChatRate(props: { id: string; size?: "row" | "md" | "lg" }) {
  const c = () => conversationById(props.id)
  return (
    <Show when={c()}>
      {(conv) => (
        <RateWidget
          size={props.size ?? "md"}
          title="Output"
          unit="tok/s"
          value={conv().rates.at(-1) ?? 0}
          values={conv().rates}
          axis={props.size === "row" ? undefined : ["-1m", "Now"]}
          stats={[
            { label: "Peak", value: `${Math.max(...conv().rates)}` },
            { label: "Median", value: `${median(conv().rates)}` },
          ]}
        />
      )}
    </Show>
  )
}

/**
 * What the Details panel shows for a conversation picked in the list: its context window and output rate. The
 * conversation's own page shows them beside the transcript, so the panel steps aside there (`covers`).
 */
export function ChatDetails(props: { id: string }) {
  const shell = useShell()
  return (
    <div class="dm-col dm-pad">
      <ChatContext id={props.id} size="lg" />
      <ChatRate id={props.id} size="lg" />
      <Images id={props.id} />
      <Show when={shell?.loc().record !== props.id}>
        <Button
          variant="ghost"
          size="sm"
          iconEnd="arrow-up-right"
          onClick={() => shell?.toPlace(undefined, "chats", undefined, props.id)}
        >
          Open
        </Button>
      </Show>
    </div>
  )
}

const DOT = { running: "ai", ok: "ok", failed: "error" } as const

/**
 * Build › Runs: every run of the project's agents, newest first. A running one can be stopped from its row. A right
 * click, the context menu key or Shift F10 opens a run's menu.
 */
export function RunsView(props: ShellViewProps) {
  const [stopped, setStopped] = createSignal<string[]>([])
  const [active, setActive] = createSignal(0)
  const runs = () => runsOf(projectHere(props.shell))
  const stateOf = (r: Run) => (r.state === "running" && stopped().includes(r.id) ? "failed" : r.state)
  const open = (r: Run) => {
    if (r.conversation) props.shell.toPlace(undefined, "chats", undefined, r.conversation)
    else toast({ title: `${r.id}: ${r.task}`, description: `${r.agent}, ${r.took || "running"}` })
  }
  const stopRun = (r: Run) => {
    setStopped((s) => [...s, r.id])
    toast({
      title: `Stopped ${r.id}`,
      action: { label: "Undo", onClick: () => setStopped((s) => s.filter((x) => x !== r.id)) },
    })
  }
  const [menu, setMenu] = createSignal<{ at: { x: number; y: number }; run: Run; el: HTMLElement }>()
  const runMenu = (r: Run): MenuEntry[] => [
    { id: "open", label: r.conversation ? "Open the chat" : "Show the run", icon: "arrow-up-right" },
    ...(stateOf(r) === "running" ? [{ id: "stop", label: "Stop", icon: "square" } as const] : []),
    { id: "copy", label: "Copy the run's ID", icon: "copy" },
  ]
  const runMenuSelect = (id: string, r: Run) => {
    if (id === "open") open(r)
    else if (id === "stop") stopRun(r)
    else if (id === "copy") {
      void navigator.clipboard?.writeText(r.id).catch(() => undefined)
      toast({ title: `Copied ${r.id}` })
    }
  }
  // The context menu key or Shift F10 opens the active run's menu at its row.
  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return
    const r = runs()[active()]
    const el = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[role=option][data-active]")
    if (!r || !el) return
    e.preventDefault()
    setMenu({ at: keyboardMenuPoint(el), run: r, el })
  }
  return (
    <ViewLayout id="demo.agent.runs" scroll={false} header={<ShellViewHeader />}>
      <Show when={runs().length} fallback={<EmptyState title="No runs yet" />}>
        <div class="dm-agent-runs-host" onKeyDown={onMenuKey}>
          <List
            label="Runs"
            class="dm-agent-runs"
            items={runs()}
            getKey={(r) => r.id}
            activeIndex={active()}
            onActiveChange={setActive}
            onSelect={open}
          >
            {(r) => (
              <div
                class="dm-agent-run"
                onContextMenu={(e: MouseEvent) => {
                  e.preventDefault()
                  setMenu({ at: { x: e.clientX, y: e.clientY }, run: r, el: e.currentTarget as HTMLElement })
                }}
              >
                <StatusDot status={DOT[stateOf(r)]} />
                <span class="dm-agent-run-id nc-mono nc-num">{r.id}</span>
                <span class="dm-grow nc-truncate">{r.task}</span>
                <span class="nc-meta dm-agent-run-agent">{r.agent}</span>
                <Show
                  when={stateOf(r) === "running"}
                  fallback={<span class="nc-meta nc-num dm-agent-run-took">{r.took || "stopped"}</span>}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Stop ${r.id}`}
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      stopRun(r)
                    }}
                  >
                    <StopGlyph />
                    Stop
                  </Button>
                </Show>
              </div>
            )}
          </List>
        </div>
      </Show>
      <Show when={menu()} keyed>
        {(m) => (
          <RowMenu
            at={m.at}
            label={`Actions for ${m.run.id}`}
            items={runMenu(m.run)}
            origin={m.el}
            returnFocus={() => m.el.closest<HTMLElement>("[role=listbox]") ?? m.el}
            onClose={() => setMenu(undefined)}
            onSelect={(id) => {
              setMenu(undefined)
              runMenuSelect(id, m.run)
            }}
          />
        )}
      </Show>
    </ViewLayout>
  )
}
