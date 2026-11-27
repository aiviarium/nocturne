// The Assistant panel (⌥A): a short chat with the agent about what the view shows. Its question carries the
// subject (the open record, the selection or the place) as a chip. The mic in its header asks by voice: the
// recording shows in a dictation strip and its transcript is sent as it is.
import {
  Button,
  DictationBar,
  EmptyState,
  IconButton,
  type ShellPanelSpec,
  type ShellRegistry,
  Token,
  TranscriberProvider,
  useDictation,
  useShell,
} from "@aiviarium/nocturne"
import { createEffect, createSignal, Show } from "solid-js"
import { demoShell } from "../menus"
import { ChatComposer, Transcript } from "./chat"
import { conversationById, newConversation, type Segment, send } from "./data"
import { transcriber } from "./transcriber"
import { projectHere } from "./views"

/** The panel's conversation, made on first use in the project in view; it also shows in that project's Build › Chats. */
const [panelChat, setPanelChat] = createSignal<string | undefined>(undefined, { ownedWrite: true })
const chatId = () => {
  const id = panelChat()
  if (id && conversationById(id)) return id
  const made = newConversation(projectHere(demoShell()))
  setPanelChat(made)
  return made
}

/** A press of the header's mic, for the body to pick up. */
const [voiceAsks, setVoiceAsks] = createSignal(0, { ownedWrite: true })

/** A chip holds a short name: a long title ends in an ellipsis. */
const short = (s: string) => (s.length > 28 ? `${s.slice(0, 27).trimEnd()}…` : s)

/** What the view shows: the record, else the selection, else the place. */
function subject(shell: ShellRegistry): string {
  const l = shell.loc()
  const id = l.record ?? shell.selection()
  if (id) return short(l.place?.recordLabel?.(id) ?? id)
  return l.place?.label ?? shell.labelOf(l.frame)
}

function PanelBody() {
  const shell = useShell()!
  const about = () => subject(shell)
  const ask = (text: Segment[]) =>
    send(chatId(), [{ kind: "ref", label: about(), icon: "list-todo" }, " ", ...text])
  const voice = useDictation({ insert: (text) => ask([text]) })
  let dropEsc: (() => void) | undefined
  createEffect(voiceAsks, (n) => {
    if (!n) return
    void voice.start()
    dropEsc?.()
    dropEsc = shell.pushEsc(() => voice.cancel())
  })
  const phase = () => voice.state().state
  createEffect(phase, (p) => {
    if (p === "idle") {
      dropEsc?.()
      dropEsc = undefined
    }
  })
  const started = () => {
    const id = panelChat()
    return !!id && (conversationById(id)?.turns.length ?? 0) > 0
  }
  return (
    <div class="dm-agent-panel">
      <Show
        when={started()}
        fallback={
          <div class="dm-agent-panel-empty">
            <EmptyState size="sm" icon="agent" title="Ask about what you see" />
          </div>
        }
      >
        <Transcript cid={panelChat()!} class="dm-agent-panel-log" />
      </Show>
      <div class="dm-agent-panel-foot">
        <div class="dm-row nc-meta">
          About
          <Token kind="ref" icon="list-todo">
            {about()}
          </Token>
        </div>
        <Show
          when={phase() !== "idle"}
          fallback={<ChatComposer cid={panelChat()} onSend={ask} compact placeholder="Ask the agent…" />}
        >
          <div class="dm-agent-voice" data-part="assistant-voice">
            <DictationBar dictation={voice.state()} />
            <Show when={phase() !== "transcribing"}>
              <div class="dm-row">
                <span class="dm-grow" />
                <Button variant="ghost" size="sm" onClick={() => voice.cancel()}>
                  Cancel
                </Button>
                <Show when={phase() === "recording"}>
                  <Button variant="primary" size="sm" onClick={() => void voice.finish()}>
                    Send
                  </Button>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

export const assistantPanel: ShellPanelSpec = {
  id: "assistant",
  label: "Assistant",
  icon: "agent",
  at: "right",
  key: "a",
  actions: () => (
    <IconButton icon="mic" label="Ask by voice" size="sm" onClick={() => setVoiceAsks((n) => n + 1)} />
  ),
  render: () => (
    <TranscriberProvider transcriber={transcriber}>
      <PanelBody />
    </TranscriberProvider>
  ),
}
