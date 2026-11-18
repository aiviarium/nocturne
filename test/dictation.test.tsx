import { afterEach, describe, expect, test } from "bun:test"
import { createSignal } from "solid-js"
import {
  Composer,
  type ComposerValue,
  DictationBlockedError,
  joinDictated,
  TextArea,
  type Transcriber,
  TranscriberProvider,
  type TranscriberStartOptions,
} from "../src"
import { selectFlat } from "../src/lib/editor"
import { click, editorOf, mount, one, tick } from "./dom"

let cleanup: Array<() => void> = []
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

/** A transcriber that records nothing and answers with `text`, under the test's control. */
function fake(text = "hello world") {
  const [available, setAvailable] = createSignal(true)
  const calls: string[] = []
  let opts: TranscriberStartOptions | undefined
  let finish: ((t: string) => void) | undefined
  let blocked = false
  const t: Transcriber = {
    available,
    async start(o) {
      calls.push("start")
      if (blocked) throw new DictationBlockedError()
      opts = o
      return {
        finish: () => {
          calls.push("finish")
          return new Promise<string>((r) => {
            finish = r
          })
        },
        cancel: () => calls.push("cancel"),
      }
    },
    openSettings: () => calls.push("settings"),
  }
  return {
    t,
    calls,
    setAvailable,
    level: (l: number) => opts?.onLevel?.(l),
    partial: (p: string) => opts?.onPartial?.(p),
    answer: (over?: string) => finish?.(over ?? text),
    block: () => {
      blocked = true
    },
  }
}

const press = (el: Element, type: "keydown" | "keyup") =>
  el.dispatchEvent(
    new KeyboardEvent(type, {
      code: "Space",
      key: " ",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  )

describe("dictation", () => {
  test("spaces join dictated text to its neighbours", () => {
    expect(joinDictated("Hello", "world", "")).toBe(" world")
    expect(joinDictated("Hello ", "world", "again")).toBe("world ")
    expect(joinDictated("", "Hi", ".")).toBe("Hi")
  })

  test("the composer dictates by itself under a TranscriberProvider and puts the text at the caret", async () => {
    const f = fake("brave new")
    const [value, setValue] = createSignal<ComposerValue>([{ type: "text", text: "Hello world" }])
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <Composer value={value()} onValueChange={setValue} />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    const editor = editorOf(m.root)
    editor.focus()
    selectFlat(editor, 6)
    editor.dispatchEvent(new Event("keyup", { bubbles: true }))
    click(one("button[aria-label='Start dictation']"))
    await tick()
    expect(one("[data-part=dictation]").getAttribute("aria-label")).toBe("Recording")
    f.level(0.9)
    f.partial("brave n")
    await tick()
    expect(one("[data-part=dictation-live]").textContent).toBe("brave n")
    click(one("button[aria-label='Finish dictation']"))
    await tick()
    expect(one("[data-part=dictation]").textContent).toContain("Transcribing")
    f.answer()
    await tick(4)
    expect(value()).toEqual([{ type: "text", text: "Hello brave new world" }])
    expect(f.calls).toEqual(["start", "finish"])
  })

  // A demo once showed a dictated sentence twice in a note (notes-dictation-real-done.png). It was the
  // audio: Chromium's fake microphone loops its WAV, which was 5.2 s for a 7 s recording, so the sentence
  // was spoken one and a third times. What the live text showed is never inserted: only the final text, once.
  test("live text is shown, never inserted; the final text goes in once", async () => {
    const said = "Please summarize the open bugs and group them by area."
    for (const where of ["composer", "text area"] as const) {
      const f = fake(said)
      const [value, setValue] = createSignal<ComposerValue>([])
      const [text, setText] = createSignal("")
      const m = mount(() => (
        <TranscriberProvider transcriber={f.t}>
          {where === "composer" ? (
            <Composer value={value()} onValueChange={setValue} />
          ) : (
            <TextArea aria-label="Body" value={text()} onInput={(e) => setText(e.currentTarget.value)} />
          )}
        </TranscriberProvider>
      ))
      await tick()
      click(one("button[aria-label='Start dictation']"))
      await tick()
      for (const p of ["Please", "Please summarize the open", said]) {
        f.partial(p)
        await tick()
      }
      expect(where === "composer" ? value() : text()).toEqual(where === "composer" ? [] : "")
      click(one("button[aria-label='Finish dictation']"))
      await tick()
      f.answer()
      await tick(4)
      const got = where === "composer" ? (value()[0] as { text: string } | undefined)?.text : text()
      expect(got).toBe(said)
      expect(f.calls).toEqual(["start", "finish"])
      m.dispose()
      document.body.innerHTML = ""
    }
  })

  test("the mic hides when the transcriber is unavailable or the caller turns it off", async () => {
    const f = fake()
    f.setAvailable(false)
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <Composer />
        <TextArea aria-label="Notes" />
        <TextArea aria-label="Off" dictation={false} />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    expect(document.querySelectorAll("button[aria-label='Start dictation']").length).toBe(0)
    f.setAvailable(true)
    await tick()
    expect(document.querySelectorAll("button[aria-label='Start dictation']").length).toBe(2)
  })

  test("a text area inserts at the caret, fires input, and push-to-talk records while held", async () => {
    const f = fake("dictated")
    const [text, setText] = createSignal("Start end")
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <TextArea aria-label="Body" value={text()} onInput={(e) => setText(e.currentTarget.value)} />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    const area = one<HTMLTextAreaElement>("textarea")
    area.focus()
    area.setSelectionRange(5, 5)
    press(area, "keydown")
    await tick()
    expect(one("[data-part=text-area]").dataset.dictation).toBe("recording")
    await new Promise((r) => setTimeout(r, 450))
    press(area, "keyup")
    await tick()
    expect(f.calls).toEqual(["start", "finish"])
    f.answer()
    await tick(4)
    expect(text()).toBe("Start dictated end")
    expect(area.selectionStart).toBe("Start dictated".length)
  })

  test("a tap of the key starts, a second tap finishes; cancel drops it", async () => {
    const f = fake()
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <TextArea aria-label="Body" />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    const area = one("textarea")
    press(area, "keydown")
    press(area, "keyup")
    await tick()
    expect(one("[data-part=text-area]").dataset.dictation).toBe("recording")
    click(one("button[aria-label='Cancel dictation']"))
    await tick()
    expect(one("[data-part=text-area]").dataset.dictation).toBe("idle")
    press(area, "keydown")
    press(area, "keyup")
    await tick()
    press(area, "keydown")
    await tick()
    expect(f.calls).toEqual(["start", "cancel", "start", "finish"])
  })

  test("a blocked microphone says so and offers the way to fix it", async () => {
    const f = fake()
    f.block()
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <TextArea aria-label="Body" />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    click(one("button[aria-label='Start dictation']"))
    await tick(3)
    expect(one("[data-part=dictation]").textContent).toContain("Microphone access is blocked.")
    click(one("[data-part=dictation] button"))
    await tick()
    expect(f.calls).toEqual(["start", "settings"])
    expect(one("[data-part=text-area]").dataset.dictation).toBe("idle")
  })

  test("a failed transcription shows why", async () => {
    const f = fake()
    f.t.start = async () => ({
      finish: async () => {
        throw new Error("no model is set up")
      },
      cancel: () => {},
    })
    const m = mount(() => (
      <TranscriberProvider transcriber={f.t}>
        <TextArea aria-label="Body" />
      </TranscriberProvider>
    ))
    cleanup.push(m.dispose)
    await tick()
    click(one("button[aria-label='Start dictation']"))
    await tick()
    click(one("button[aria-label='Finish dictation']"))
    await tick(3)
    expect(one("[data-part=dictation]").textContent).toContain("no model is set up")
  })
})
