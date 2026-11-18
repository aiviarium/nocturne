import { afterEach, describe, expect, test } from "bun:test"
import { createSignal } from "solid-js"
import {
  ChatMedia,
  type ChatMediaItem,
  Composer,
  type ComposerAttachment,
  fileTypeLabel,
  formatClock,
  MediaViewer,
} from "../src"
import { PhoneOverride } from "../src/lib/phone"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

const image = (n: number, extra: Partial<ChatMediaItem> = {}): ChatMediaItem => ({
  kind: "image",
  src: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" data-n="${n}"/>`,
  alt: `Image ${n}`,
  width: 800,
  height: 600,
  ...extra,
})
const images = (count: number) => Array.from({ length: count }, (_, i) => image(i + 1))
const tiles = () => all("[data-part=chat-media] .nc-media__tile")

describe("ChatMedia images", () => {
  test("one image is a single tile at its aspect ratio", () => {
    track(mount(() => <ChatMedia items={[image(1, { width: 1280, height: 800 })]} />))
    const root = one("[data-part=chat-media]")
    const grid = one(".nc-media__images", root)
    expect(grid.dataset.layout).toBe("single")
    expect(tiles()).toHaveLength(1)
    expect(tiles()[0]?.style.aspectRatio).toBe("1280 / 800")
    // 480px wide at most, and 360px high at most: 1280×800 fits 480 wide.
    expect(grid.getAttribute("style")).toContain("480px")
    expect(one<HTMLImageElement>("img", root).alt).toBe("Image 1")
  })

  test("a tall image is held to the height limit", () => {
    track(mount(() => <ChatMedia items={[image(1, { width: 600, height: 1200 })]} />))
    expect(one(".nc-media__images").getAttribute("style")).toContain("180px")
  })

  test("two images sit side by side, three in a row", () => {
    track(mount(() => <ChatMedia items={images(2)} />))
    expect(one(".nc-media__images").dataset.layout).toBe("pair")
    expect(tiles()).toHaveLength(2)
    for (const c of cleanup) c()
    cleanup = []
    track(mount(() => <ChatMedia items={images(3)} />))
    expect(one(".nc-media__images").dataset.layout).toBe("three")
    expect(tiles()).toHaveLength(3)
    expect(all(".nc-media__more")).toHaveLength(0)
  })

  test("more than four show four, the last with +N", () => {
    track(mount(() => <ChatMedia items={images(7)} />))
    expect(one(".nc-media__images").dataset.layout).toBe("grid")
    expect(tiles()).toHaveLength(4)
    expect(one(".nc-media__more").textContent).toBe("+3")
    expect(tiles()[3]?.getAttribute("aria-label")).toBe("Image 4, and 3 more")
  })

  test("exactly four show no +N", () => {
    track(mount(() => <ChatMedia items={images(4)} />))
    expect(tiles()).toHaveLength(4)
    expect(all(".nc-media__more")).toHaveLength(0)
  })

  test("loading, loaded and failed states", async () => {
    track(mount(() => <ChatMedia items={images(2)} />))
    const [a, b] = tiles()
    expect(["loading", "loaded"]).toContain(a?.dataset.state as string)
    a?.querySelector("img")?.dispatchEvent(new Event("load"))
    b?.querySelector("img")?.dispatchEvent(new Event("error"))
    await tick()
    expect(a?.dataset.state).toBe("loaded")
    expect(b?.dataset.state).toBe("failed")
    expect(b?.querySelector("img")).toBeNull()
    expect(b?.textContent).toContain("Image 2 could not be loaded")
  })

  test("a pending image is a placeholder at its final aspect ratio", () => {
    track(
      mount(() => (
        <ChatMedia items={[{ kind: "image", pending: true, alt: "Chart", width: 1200, height: 500 }]} />
      )),
    )
    const tile = one(".nc-media__tile--pending")
    expect(tile.dataset.state).toBe("pending")
    expect(tile.getAttribute("aria-busy")).toBe("true")
    expect(tile.style.aspectRatio).toBe("1200 / 500")
    expect(tile.tagName).toBe("DIV")
    expect(all("[data-part=chat-media] img")).toHaveLength(0)
  })
})

describe("MediaViewer", () => {
  test("a click on an image opens it, the arrows step and Escape closes and returns focus", async () => {
    track(mount(() => <ChatMedia items={images(3)} />))
    expect(all("[data-part=media-viewer]")).toHaveLength(0)
    const second = tiles()[1] as HTMLElement
    second.focus()
    click(second)
    await tick()
    const viewer = one("[data-part=media-viewer]")
    expect(viewer.closest("[role=dialog]")).not.toBeNull()
    expect(viewer.textContent).toContain("2 of 3")
    expect(one<HTMLImageElement>(".nc-media-viewer__img").alt).toBe("Image 2")

    press(document.activeElement ?? viewer, "ArrowRight")
    await tick()
    expect(viewer.textContent).toContain("3 of 3")
    press(document.activeElement ?? viewer, "ArrowRight")
    await tick()
    expect(viewer.textContent).toContain("3 of 3")
    press(document.activeElement ?? viewer, "ArrowLeft")
    press(document.activeElement ?? viewer, "ArrowLeft")
    await tick()
    expect(viewer.textContent).toContain("1 of 3")
    expect(one<HTMLImageElement>(".nc-media-viewer__img").alt).toBe("Image 1")

    click(one("[aria-label='Next image']"))
    await tick()
    expect(viewer.textContent).toContain("2 of 3")

    press(document.activeElement ?? viewer, "Escape")
    await tick()
    expect(all("[data-part=media-viewer]")).toHaveLength(0)
    expect(document.activeElement).toBe(second)
  })

  test("the +N tile opens the viewer on that image, with every image in it", async () => {
    track(mount(() => <ChatMedia items={images(6)} />))
    click(tiles()[3] as HTMLElement)
    await tick()
    expect(one("[data-part=media-viewer]").textContent).toContain("4 of 6")
  })

  test("a sideways swipe steps between images on a phone", async () => {
    const [index, setIndex] = createSignal(0)
    track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <MediaViewer open items={images(3)} index={index()} onIndexChange={setIndex} onClose={() => {}} />
        </PhoneOverride.Provider>
      )),
    )
    await tick()
    const stage = one(".nc-media-viewer__stage")
    const fire = (type: string, x: number, y = 100) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      const list = [{ clientX: x, clientY: y }]
      Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : list })
      Object.defineProperty(event, "changedTouches", { value: list })
      stage.dispatchEvent(event)
    }
    fire("touchstart", 300)
    fire("touchend", 180)
    expect(index()).toBe(1)
    fire("touchstart", 100)
    fire("touchend", 260)
    expect(index()).toBe(0)
    // A short or mostly vertical move is not a swipe.
    fire("touchstart", 300, 100)
    fire("touchend", 280, 300)
    expect(index()).toBe(0)
    expect(one<HTMLImageElement>(".nc-media-viewer__img").className).toContain("nc-media-viewer__img")
  })
})

describe("ChatMedia audio, video and files", () => {
  test("audio has a play button, the time and a uniform wave", async () => {
    let played = 0
    let paused = 0
    const play = HTMLMediaElement.prototype.play
    const pause = HTMLMediaElement.prototype.pause
    HTMLMediaElement.prototype.play = () => {
      played++
      return Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = () => {
      paused++
    }
    try {
      track(
        mount(() => (
          <ChatMedia items={[{ kind: "audio", src: "blob:voice", name: "Voice note", duration: 65 }]} />
        )),
      )
      const row = one("[data-kind=audio]")
      expect(one(".nc-media__time", row).textContent).toBe("0:00 / 1:05")
      expect(row.querySelectorAll(".nc-wave__bar").length).toBeGreaterThan(10)
      const button = one("button", row)
      expect(button.getAttribute("aria-label")).toBe("Play Voice note")
      click(button)
      await tick()
      expect(played).toBe(1)
      expect(button.getAttribute("aria-label")).toBe("Pause Voice note")
      click(button)
      await tick()
      expect(paused).toBeGreaterThanOrEqual(1)
      expect(button.getAttribute("aria-label")).toBe("Play Voice note")
    } finally {
      HTMLMediaElement.prototype.play = play
      HTMLMediaElement.prototype.pause = pause
    }
  })

  test("a given waveform sets the bars", () => {
    track(mount(() => <ChatMedia items={[{ kind: "audio", src: "blob:a", waveform: [0.5, 1, 0.25] }]} />))
    expect(all(".nc-wave__bar").map((b) => b.style.height)).toEqual(["50%", "100%", "25%"])
  })

  test("video has controls and a poster, sized like an image", () => {
    track(
      mount(() => (
        <ChatMedia
          items={[{ kind: "video", src: "blob:clip", poster: "blob:poster", width: 1920, height: 1080 }]}
        />
      )),
    )
    const video = one<HTMLVideoElement>("video[data-kind=video]")
    expect(video.hasAttribute("controls")).toBe(true)
    expect(video.getAttribute("poster")).toBe("blob:poster")
    expect(video.style.aspectRatio).toBe("1920 / 1080")
    expect(video.getAttribute("style")).toContain("480px")
  })

  test("a file is a card with name, type and size, and its action", () => {
    const opened: string[] = []
    track(
      mount(() => (
        <ChatMedia
          items={[{ kind: "file", name: "report.pdf", type: "application/pdf", size: 2_621_440 }]}
          onOpen={(item, index) => opened.push(`${item.name}@${index}`)}
        />
      )),
    )
    const card = one("[data-kind=file]")
    expect(card.textContent).toContain("report.pdf")
    expect(card.textContent).toContain("PDF · 2.5 MB")
    click(one("[aria-label='Open report.pdf']", card))
    expect(opened).toEqual(["report.pdf@0"])
  })

  test("without onOpen a file with a src gets a download link", () => {
    track(mount(() => <ChatMedia items={[{ kind: "file", name: "data.csv", src: "blob:csv", size: 900 }]} />))
    const link = one<HTMLAnchorElement>("[aria-label='Download data.csv']")
    expect(link.getAttribute("href")).toBe("blob:csv")
    expect(link.getAttribute("download")).toBe("data.csv")
    expect(one("[data-kind=file]").textContent).toContain("CSV · 900 B")
  })

  test("mixed items keep their order", () => {
    track(
      mount(() => (
        <ChatMedia
          items={[
            image(1),
            image(2),
            { kind: "audio", src: "blob:a" },
            { kind: "file", name: "a.zip" },
            image(3),
          ]}
        />
      )),
    )
    const kids = Array.from(one("[data-part=chat-media]").children).map(
      (el) => (el as HTMLElement).dataset.layout ?? (el as HTMLElement).dataset.kind,
    )
    expect(kids).toEqual(["pair", "audio", "file", "single"])
  })

  test("formatters", () => {
    expect(formatClock(7)).toBe("0:07")
    expect(formatClock(205)).toBe("3:25")
    expect(formatClock(3729)).toBe("1:02:09")
    expect(fileTypeLabel({ type: "application/pdf" })).toBe("PDF")
    expect(fileTypeLabel({ name: "archive.tar.gz" })).toBe("GZ")
  })
})

describe("Composer image attachments", () => {
  test("an image with a preview is a thumbnail with a remove button; others stay chips", async () => {
    const [list, setList] = createSignal<ComposerAttachment[]>([
      { id: "shot", name: "shot.png", kind: "image", preview: "blob:shot" },
      { id: "doc", name: "notes.md" },
      { id: "nopreview", name: "raw.png", kind: "image" },
    ])
    track(
      mount(() => (
        <Composer
          attachments={list()}
          onRemoveAttachment={(id) => setList((l) => l.filter((a) => a.id !== id))}
        />
      )),
    )
    const thumbs = all(".nc-composer__thumb")
    expect(thumbs).toHaveLength(1)
    expect(one<HTMLImageElement>("img", thumbs[0]).getAttribute("src")).toBe("blob:shot")
    expect(one<HTMLImageElement>("img", thumbs[0]).alt).toBe("shot.png")
    expect(all(".nc-composer__attachments .nc-token")).toHaveLength(2)
    click(one("[aria-label='Remove shot.png']"))
    await tick()
    expect(all(".nc-composer__thumb")).toHaveLength(0)
    expect(list().map((a) => a.id)).toEqual(["doc", "nopreview"])
  })
})
