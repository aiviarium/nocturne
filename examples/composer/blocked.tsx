import { Composer } from "@aiviarium/nocturne"
import { MODELS } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Blocked microphone",
  surface: "none",
  frame: "The composer keeps its caret with window.getSelection(), which does not see into a shadow root.",
  height: 140,
}

export default function BlockedMicrophone() {
  return (
    <Composer
      dictation={{ state: "blocked", onOpenSettings: () => {} }}
      models={MODELS}
      onEffortChange={() => {}}
      effort="medium"
    />
  )
}
