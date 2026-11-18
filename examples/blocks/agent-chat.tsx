import {
  ApprovalCard,
  ChatMessage,
  CodeBlock,
  Composer,
  type ComposerValue,
  ListRow,
  RowList,
  SectionHeading,
  State,
  Token,
  ToolSteps,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { COMMANDS, MENTIONS, MODELS, MODES, SKILLS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "An agent session waiting for approval",
  note: "Sessions in the view's sidebar, the conversation in the main column, the composer at its foot. Only the session that needs the person says so.",
  surface: "none",
  frame: "A whole screen, and the composer needs the real document's selection.",
  height: 680,
}

const SESSIONS = [
  {
    id: "a",
    title: "Fix the sign-in redirect loop",
    where: "local",
    get state() {
      return <State status="warn">Needs you</State>
    },
  },
  {
    id: "b",
    title: "Add a test for the task list",
    where: "build-01",
    get state() {
      return <State status="ai">Working</State>
    },
  },
  { id: "c", title: "Profile the activity page", where: "local" },
  { id: "d", title: "Upgrade Vite in the web app", where: "build-01" },
]

export default function AgentChat() {
  const [decision, setDecision] = createSignal<"pending" | "allowed" | "denied">("pending")
  const [text, setText] = createSignal<ComposerValue>([])
  const [model, setModel] = createSignal("sonnet")
  const [mode, setMode] = createSignal("edit")
  return (
    <div class="ex-screen">
      <ViewLayout
        id="block-agent"
        scroll={false}
        sidebarLabel="Sessions"
        sidebarWidth={260}
        sidebar={
          <div class="ex-col ex-pad">
            <SectionHeading title="Sessions" count={4} />
            <RowList label="Sessions">
              <For each={SESSIONS}>
                {(s) => (
                  <ListRow
                    lines={2}
                    icon="sparkle"
                    title={s.title}
                    secondary={s.where}
                    status={s.state}
                    selected={s.id === "a"}
                    onClick={() => {}}
                  />
                )}
              </For>
            </RowList>
          </div>
        }
        header={
          <ViewHeader
            crumbs={[{ label: "Atlas web", href: "#b" }, { label: "Fix the sign-in redirect loop" }]}
            context={<span class="nc-meta">Coding agent · local</span>}
            actions={[
              { id: "files", label: "Changed files", icon: "file", onClick: () => {} },
              { id: "stop", label: "Stop session", overflow: true, danger: true, onClick: () => {} },
            ]}
          />
        }
      >
        <div class="ex-chat-screen">
          <div class="ex-chat-scroll">
            <div class="nc-stack ex-chat ex-chat-column">
              <ChatMessage role="user">
                Sign-in loops forever behind our proxy at{" "}
                <Token kind="ref" icon="link">
                  /sso
                </Token>
                . Find out why and fix it.
              </ChatMessage>
              <ChatMessage role="assistant" thought="Thought for 14s">
                <ToolSteps
                  steps={[
                    { icon: "search", verb: "Searched", arg: "redirect_uri" },
                    { icon: "file", verb: "Read", arg: "src/auth/callback.ts" },
                    { icon: "terminal", verb: "Ran", arg: "npm test -- auth", meta: "1 failed" },
                  ]}
                />
                <span>
                  The callback URL is built from the request's host and path, so behind a path-prefixed proxy
                  the prefix is lost and the provider sends the person back to the wrong place. I'll read the
                  public URL from the config instead.
                </span>
                <CodeBlock
                  language="ts"
                  title="src/auth/callback.ts"
                  code={`const base = config.publicUrl ?? \`\${req.protocol}://\${req.host}\`\nconst redirectUri = new URL("/auth/callback", base)`}
                />
                <ApprovalCard
                  summary="Edit 2 files"
                  items={["src/auth/callback.ts", "src/auth/callback.test.ts"]}
                  decision={decision()}
                  onAllow={() => setDecision("allowed")}
                  onDeny={() => setDecision("denied")}
                />
              </ChatMessage>
            </div>
          </div>
          <div class="ex-chat-column ex-chat-foot">
            <Composer
              value={text()}
              onValueChange={setText}
              commands={COMMANDS}
              mentions={MENTIONS}
              skills={SKILLS}
              models={MODELS}
              model={model()}
              onModelChange={setModel}
              modes={MODES}
              mode={mode()}
              onModeChange={setMode}
              placeholder="Reply, or / for commands"
              onSubmit={() => setText([])}
            />
          </div>
        </div>
      </ViewLayout>
    </div>
  )
}
