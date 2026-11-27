// A conversation drawn from its turns, and the composer under it. Both the Agent place and the Assistant panel use
// them: the person's turns in bubbles, the agent's on the page with its steps, media and approvals.
import {
  ApprovalCard,
  ChatMedia,
  ChatMessage,
  Composer,
  type ComposerItem,
  type ComposerValue,
  type EffortLevel,
  StreamState,
  Token,
  ToolStep,
  ToolSteps,
} from "@aiviarium/nocturne"
import { createEffect, createSignal, For, Match, onSettled, Show, Switch } from "solid-js"
import { PEOPLE, projects } from "../data"
import {
  type Block,
  conversationById,
  decide,
  isStreaming,
  type Segment,
  send,
  stop,
  type Turn,
} from "./data"

function Text(props: { text: Segment[] }) {
  return (
    <span>
      <For each={props.text}>
        {(s) =>
          typeof s === "string" ? (
            s
          ) : (
            <Token kind={s.kind} icon={s.icon} name={s.name}>
              {s.label}
            </Token>
          )
        }
      </For>
    </span>
  )
}

function BlockView(props: { block: Block; cid: string; tid: string }) {
  return (
    <Switch>
      <Match when={props.block.t === "text" && props.block}>{(b) => <Text text={b().text} />}</Match>
      <Match when={props.block.t === "steps" && props.block}>
        {(b) => (
          <ToolSteps>
            <For each={b().steps} keyed={false}>
              {(step) => (
                <ToolStep
                  icon={step().icon}
                  verb={step().verb}
                  arg={step().arg}
                  meta={step().meta}
                  status={step().status}
                  output={step().output}
                  defaultOpen={step().status === "error"}
                />
              )}
            </For>
          </ToolSteps>
        )}
      </Match>
      <Match when={props.block.t === "media" && props.block}>{(b) => <ChatMedia items={b().items} />}</Match>
      <Match when={props.block.t === "approval" && props.block}>
        {(b) => (
          <ApprovalCard
            summary={b().summary}
            items={b().items}
            decision={b().decision}
            allowLabel="Run it"
            onAllow={() => decide(props.cid, props.tid, true)}
            onDeny={() => decide(props.cid, props.tid, false)}
          />
        )}
      </Match>
    </Switch>
  )
}

function TurnView(props: { turn: Turn; cid: string }) {
  return (
    <ChatMessage role={props.turn.role} thought={props.turn.thought}>
      <For each={props.turn.blocks} keyed={false}>
        {(b) => <BlockView block={b()} cid={props.cid} tid={props.turn.id} />}
      </For>
      <Show when={props.turn.stream === "live" && !props.turn.blocks.length}>
        <div class="dm-row">
          <StreamState state="connecting" />
        </div>
      </Show>
      <Show when={props.turn.stream === "stopped"}>
        <div class="dm-row">
          <StreamState state="ended" meta="Stopped" />
        </div>
      </Show>
    </ChatMessage>
  )
}

/** The turns of a conversation in a scrolling column that follows new output while it is at the bottom. */
export function Transcript(props: { cid: string; class?: string }) {
  let el: HTMLDivElement | undefined
  let column: HTMLDivElement | undefined
  let pinned = true
  const follow = () => {
    if (el && pinned) el.scrollTop = el.scrollHeight
  }
  const turns = () => conversationById(props.cid)?.turns ?? []
  createEffect(() => JSON.stringify(turns()).length, follow)
  createEffect(
    () => props.cid,
    () => {
      pinned = true
      follow()
    },
  )
  // A reflow (a panel opening beside it, an image arriving) keeps the end in view while it was there.
  onSettled(() => {
    if (!el || !column || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(follow)
    observer.observe(el)
    observer.observe(column)
    return () => observer.disconnect()
  })
  return (
    <div
      ref={el}
      class={props.class ?? "dm-agent-log"}
      onScroll={() => {
        if (el) pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 40
      }}
    >
      <div ref={column} class="dm-agent-column">
        <For each={turns()} keyed={(t) => t.id}>
          {(t) => <TurnView turn={t()} cid={props.cid} />}
        </For>
      </div>
    </div>
  )
}

const COMMANDS: ComposerItem[] = [
  { id: "draft", label: "draft", description: "Draft text for an issue or a spec", icon: "edit" },
  { id: "review", label: "review", description: "Review a pull request", icon: "git-pull-request" },
  { id: "summarise", label: "summarise", description: "Summarise a list or a thread", icon: "list" },
]
const mentions = (): ComposerItem[] => [
  ...PEOPLE.map((p) => ({ id: p.id, label: p.name, kind: "person" as const, group: "People" })),
  ...projects().map((p) => ({
    id: p.id,
    label: p.name,
    icon: "board" as const,
    kind: "doc" as const,
    group: "Projects",
  })),
  {
    id: "WEB-142",
    label: "WEB-142",
    description: "Flaky deploy test",
    icon: "list-todo",
    kind: "doc",
    group: "Issues",
  },
  { id: "deploy", label: "ci/deploy.yml", icon: "file", kind: "file", group: "Files" },
]
const SKILLS: ComposerItem[] = [
  { id: "spec", label: "spec", description: "Write a spec from a request", icon: "book-open" },
  { id: "triage", label: "triage", description: "Sort reports into issues", icon: "inbox" },
]
const MODELS = [
  { id: "deep", label: "Deep", description: "Most capable, slower" },
  { id: "fast", label: "Fast", description: "Quick and balanced" },
]

/** The composer's value as the transcript's segments: chips become tokens. */
const toSegments = (v: ComposerValue): Segment[] =>
  v.map((s) =>
    s.type === "text"
      ? s.text
      : {
          kind:
            s.trigger === "/" ? "cmd" : s.trigger === "$" ? "skill" : s.kind === "person" ? "person" : "ref",
          label: s.label,
          name: s.kind === "person" ? s.label : undefined,
          icon: s.trigger === "@" && s.kind !== "person" ? "file" : undefined,
        },
  )

/** The composer at a conversation's foot. Sending streams a reply; Stop (or Esc) stops it. */
export function ChatComposer(props: {
  /** The conversation it writes to; left out, `onSend` makes one. */
  cid?: string
  /** Sends in place of writing to `cid`. */
  onSend?: (text: Segment[]) => void
  compact?: boolean
  placeholder?: string
}) {
  const [value, setValue] = createSignal<ComposerValue>([])
  const [model, setModel] = createSignal("deep")
  const [effort, setEffort] = createSignal<EffortLevel>("medium")
  const running = () => {
    const c = conversationById(props.cid)
    return !!c && isStreaming(c)
  }
  return (
    <Composer
      value={value()}
      onValueChange={setValue}
      placeholder={props.placeholder ?? "Ask the agent…"}
      commands={COMMANDS}
      mentions={mentions()}
      skills={SKILLS}
      models={props.compact ? undefined : MODELS}
      model={model()}
      onModelChange={setModel}
      effort={props.compact ? undefined : effort()}
      onEffortChange={props.compact ? undefined : setEffort}
      running={running()}
      runningLabel="Working…"
      onStop={() => props.cid && stop(props.cid)}
      onSubmit={(s) => {
        if (!s.text.trim()) return
        if (props.onSend) props.onSend(toSegments(s.value))
        else if (props.cid) send(props.cid, toSegments(s.value))
        setValue([])
      }}
    />
  )
}
