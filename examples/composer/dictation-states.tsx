import { Composer, type DictationState } from "@aiviarium/nocturne"
import { createSignal, For, onCleanup } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Dictation states",
  note: "As in Nocturne's composer board: idle, recording with timer, level and live text, transcribing, and blocked.",
  surface: "none",
  frame: "The composer keeps its caret with window.getSelection(), which does not see into a shadow root.",
  height: 560,
}

const STATES: Array<{ label: string; dictation: DictationState }> = [
  { label: "Idle", dictation: { state: "idle" } },
  {
    label: "Recording, with live text",
    dictation: {
      state: "recording",
      elapsed: 4,
      level: 0.7,
      partial: "Summarise the open bugs and group them by",
    },
  },
  { label: "Transcribing", dictation: { state: "transcribing" } },
  { label: "Microphone blocked", dictation: { state: "blocked", onOpenSettings: () => {} } },
]

export default function DictationStates() {
  // The waveform of the recording state moves like speech.
  const [wave, setWave] = createSignal(0.3)
  const timer = setInterval(
    () => setWave(0.15 + 0.85 * Math.abs(Math.sin(Date.now() / 140) * Math.cos(Date.now() / 370))),
    80,
  )
  onCleanup(() => clearInterval(timer))
  return (
    <div class="ex-stack" data-part="dictation-states">
      <For each={STATES}>
        {(st) => (
          <div data-state={st.dictation.state}>
            <span class="nc-meta">{st.label}</span>
            <Composer
              dictation={
                st.dictation.state === "recording" ? { ...st.dictation, level: wave() } : st.dictation
              }
              defaultValue={[]}
              placeholder="Ask anything…"
            />
          </div>
        )}
      </For>
    </div>
  )
}
