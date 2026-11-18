import { ChatMedia, ChatMessage } from "@aiviarium/nocturne"
import { onCleanup } from "solid-js"
import { picture, screenshot, tone } from "../_kit/media"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Media in a reply",
  note: "A screenshot, a grid of images with +N, a voice note, a file card, and an image that is still arriving. A click on an image opens the viewer.",
}

const CSV = "step,visitors,left\nlanding,1200,0\nplan,980,220\ndetails,610,370\ndone,402,208\n"
const csvUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV)}`

export default function ChatMessageMedia() {
  const voice = tone(4)
  onCleanup(() => URL.revokeObjectURL(voice))
  return (
    <div class="nc-stack ex-chat">
      <ChatMessage role="user">Check the sign-up page in the browser and send me what you see.</ChatMessage>
      <ChatMessage role="assistant">
        <span>The page loads, but the plan picker sits under the fold on a laptop screen.</span>
        <ChatMedia
          items={[
            {
              kind: "image",
              src: screenshot(),
              alt: "The sign-up page, with the plan picker below the fold",
              width: 1280,
              height: 800,
            },
          ]}
        />
        <span>Here are the six layouts I tried, and a voice note from the review.</span>
        <ChatMedia
          items={[
            { kind: "image", src: picture(800, 600, 20), alt: "Layout 1", width: 800, height: 600 },
            { kind: "image", src: picture(800, 600, 200), alt: "Layout 2", width: 800, height: 600 },
            { kind: "image", src: picture(800, 600, 280), alt: "Layout 3", width: 800, height: 600 },
            { kind: "image", src: picture(800, 600, 140), alt: "Layout 4", width: 800, height: 600 },
            { kind: "image", src: picture(800, 600, 40), alt: "Layout 5", width: 800, height: 600 },
            { kind: "image", src: picture(800, 600, 320), alt: "Layout 6", width: 800, height: 600 },
            { kind: "audio", src: voice, name: "Review notes", duration: 4 },
            { kind: "file", name: "signup-steps.csv", type: "text/csv", size: CSV.length, src: csvUrl },
            { kind: "file", name: "review-notes.pdf", type: "application/pdf", size: 184_320, src: csvUrl },
          ]}
        />
        <span>Rendering the chart of drop-off by step.</span>
        <ChatMedia
          items={[{ kind: "image", pending: true, alt: "Drop-off by step", width: 1200, height: 500 }]}
        />
      </ChatMessage>
    </div>
  )
}
