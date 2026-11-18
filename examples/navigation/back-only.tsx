import { ChatMessage, ListRow, RowList, State, ToolSteps, ViewHeader, ViewLayout } from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { SESSIONS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A chat opened from the session list: a back control, no crumbs",
  note: "Open a session. The chat is reached from one list, and a path to it would only repeat that list, so the header shows a back control named after it.",
  surface: "none",
}

export default function BackOnly() {
  const [open, setOpen] = createSignal<string | null>(null)
  const session = () => SESSIONS.find((s) => s.id === open())
  return (
    <div class="ex-view" style={{ height: "440px" }}>
      <Show
        when={session()}
        fallback={
          <ViewLayout
            id="nav-back-sessions"
            header={
              <ViewHeader
                crumbs={[{ label: "Atlas web", onClick: () => {} }, { label: "Agent sessions" }]}
                actions={[{ id: "new", label: "New session", icon: "plus", onClick: () => {} }]}
              />
            }
          >
            <RowList label="Agent sessions">
              <For each={SESSIONS}>
                {(s) => (
                  <ListRow
                    icon="agent"
                    title={s.title}
                    secondary={s.where}
                    status={<State status={s.state}>{s.word}</State>}
                    meta={s.when}
                    onClick={() => setOpen(s.id)}
                  />
                )}
              </For>
            </RowList>
          </ViewLayout>
        }
      >
        {(s) => (
          <ViewLayout
            id="nav-back-chat"
            reading
            header={
              <ViewHeader
                back={{ label: "Agent sessions", onClick: () => setOpen(null) }}
                context={<State status={s().state}>{s().word}</State>}
                actions={[{ id: "stop", label: "Stop the session", overflow: true, onClick: () => {} }]}
              />
            }
          >
            <div class="nc-stack ex-chat ex-pad">
              <ChatMessage role="user">{s().title}</ChatMessage>
              <ChatMessage role="assistant">
                <ToolSteps
                  steps={[
                    { icon: "file", verb: "Read", arg: "src/auth/callback.js" },
                    { icon: "terminal", verb: "Ran", arg: "npm test -- auth" },
                  ]}
                />
                <span>I found where the redirect loops. The fix needs an edit to two files.</span>
              </ChatMessage>
            </div>
          </ViewLayout>
        )}
      </Show>
    </div>
  )
}
