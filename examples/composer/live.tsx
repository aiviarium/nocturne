import {
  Composer,
  type ComposerAttachment,
  type ComposerValue,
  type DictationState,
  type EffortLevel,
} from "@aiviarium/nocturne"
import { createSignal, onCleanup } from "solid-js"
import { COMMANDS, MENTIONS, MODELS, MODES, SKILLS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Live",
  note: "Try “/re”, “look at @use”, “then $re”. Enter sends; Shift+Enter adds a line. The mic cycles through the dictation states.",
  frame:
    "The composer keeps its caret with window.getSelection() and document.activeElement, which do not see into a shadow root.",
  height: 300,
}

export default function LiveComposer() {
  const [text, setText] = createSignal<ComposerValue>([])
  const [model, setModel] = createSignal("sonnet")
  const [mode, setMode] = createSignal("ask")
  const [effort, setEffort] = createSignal<EffortLevel>("high")
  const [running, setRunning] = createSignal(false)
  const [attachments, setAttachments] = createSignal<ComposerAttachment[]>([
    { id: "a1", name: "release-plan.md", icon: "file" },
  ])
  const [log, setLog] = createSignal("")
  const [dictState, setDictState] = createSignal<DictationState["state"]>("idle")
  const [elapsed, setElapsed] = createSignal(0)
  const [level, setLevel] = createSignal(0.2)
  let timer: ReturnType<typeof setInterval> | undefined
  const stopTimer = () => clearInterval(timer)
  onCleanup(stopTimer)
  const dictation: () => DictationState = () => ({
    state: dictState(),
    elapsed: elapsed(),
    level: level(),
    onStart: () => {
      setElapsed(0)
      setDictState("recording")
      stopTimer()
      timer = setInterval(() => {
        setElapsed((e) => e + 0.12)
        setLevel(0.2 + 0.8 * Math.abs(Math.sin(Date.now() / 140) * Math.cos(Date.now() / 370)))
      }, 120)
    },
    onFinish: () => {
      stopTimer()
      setDictState("transcribing")
      setTimeout(() => {
        setText([{ type: "text", text: "Summarise the open bugs and group them by area." }])
        setDictState("idle")
      }, 1200)
    },
    onCancel: () => {
      stopTimer()
      setDictState("idle")
    },
    onOpenSettings: () => setLog("Open settings requested"),
  })
  return (
    <div class="ex-col">
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
        effort={effort()}
        onEffortChange={setEffort}
        attachments={attachments()}
        onAttach={() =>
          setAttachments((a) => [...a, { id: `a${a.length + 1}`, name: `notes-${a.length + 1}.md` }])
        }
        onRemoveAttachment={(id) => setAttachments((a) => a.filter((x) => x.id !== id))}
        dictation={dictation()}
        running={running()}
        runningLabel="Running tests…"
        onStop={() => setRunning(false)}
        onSubmit={(s) => {
          setLog(`Sent: ${s.text}`)
          setText([])
          setRunning(true)
          setTimeout(() => setRunning(false), 4000)
        }}
      />
      <span class="nc-meta">{log() || "Nothing sent yet."}</span>
      {/* The value the composer reports, once there is one (an empty value printed "[]" under the field). */}
      <pre
        class="nc-code ex-json"
        data-part="composer-value"
        aria-label="The value the composer reports"
        hidden={JSON.stringify(text()) === "[]"}
      >
        {JSON.stringify(text())}
      </pre>
    </div>
  )
}
