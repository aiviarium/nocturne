import { Composer, TextArea, TranscriberProvider } from "@aiviarium/nocturne"
import { demoTranscriber } from "../_kit/transcriber"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Dictation with a transcriber",
  note: "Under a TranscriberProvider the composer and TextArea dictate by themselves: click the mic, or hold Ctrl Shift Space. This one is a pretend transcriber; a real one records from the microphone.",
  surface: "none",
  frame: "The composer keeps its caret with window.getSelection(), which does not see into a shadow root.",
  height: 260,
}

export default function Dictation() {
  return (
    <TranscriberProvider transcriber={demoTranscriber()}>
      <div class="ex-stack" data-part="dictation-demo">
        <Composer placeholder="Dictate into the composer…" />
        <TextArea aria-label="Notes" label="A long text input" placeholder="Or dictate here…" />
      </div>
    </TranscriberProvider>
  )
}
