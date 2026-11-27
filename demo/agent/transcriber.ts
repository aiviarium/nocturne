// A pretend transcriber: no microphone and no network. It "hears" a fixed sentence word by word and moves the
// level. `setMicBlocked` plays a browser that refuses the microphone, so the blocked notice can be tried.
import { DictationBlockedError, type Transcriber, toast } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"

const [micBlocked, setMicBlocked] = createSignal(false, { ownedWrite: true })

export { micBlocked, setMicBlocked }

const SENTENCES = [
  "Run the deploy test on build-01 and tell me if it passes.",
  "Summarise what changed in Atlas web since Monday.",
]

export function fakeTranscriber(): Transcriber {
  let n = 0
  return {
    available: () => true,
    async start(o) {
      if (micBlocked()) throw new DictationBlockedError()
      const words = SENTENCES[n++ % SENTENCES.length]!.split(" ")
      let i = 0
      const timer = setInterval(() => {
        i++
        o.onLevel?.(0.2 + 0.8 * Math.abs(Math.sin(Date.now() / 140) * Math.cos(Date.now() / 370)))
        if (i % 4 === 0) o.onPartial?.(words.slice(0, Math.min(words.length, i / 4)).join(" "))
      }, 120)
      return {
        finish: () => {
          clearInterval(timer)
          return new Promise((r) =>
            setTimeout(() => r(words.slice(0, Math.max(3, Math.floor(i / 4))).join(" ")), 700),
          )
        },
        cancel: () => clearInterval(timer),
      }
    },
    openSettings: () => {
      setMicBlocked(false)
      toast({
        title: "Microphone allowed",
        description: "In a browser this is the site's settings.",
        tone: "success",
      })
    },
  }
}

/** One transcriber for the agent's views and its panel. */
export const transcriber = fakeTranscriber()
