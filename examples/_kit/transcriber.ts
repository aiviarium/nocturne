import type { Transcriber } from "@aiviarium/nocturne"

/**
 * A pretend transcriber for the gallery: no microphone, no network. It "hears" a fixed sentence word by
 * word (live text) and moves the level, so the states can be tried here.
 */
export function demoTranscriber(): Transcriber {
  const words = "Summarise the open bugs and group them by area.".split(" ")
  return {
    available: () => true,
    async start(o) {
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
            setTimeout(() => r(words.slice(0, Math.max(1, Math.floor(i / 4))).join(" ")), 900),
          )
        },
        cancel: () => clearInterval(timer),
      }
    },
    openSettings: () => {},
  }
}
