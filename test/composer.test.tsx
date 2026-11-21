import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import { Composer, type ComposerSubmit, type ComposerValue } from "../src"
import { flatText, selectFlat, selectionFlat } from "../src/lib/editor"
import { all, click, editorOf, mount, one, placeCaret, press, tick, typeText } from "./dom"

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

const commands = [
  { id: "review", label: "review", description: "Review the current changes", group: "Workspace" },
  { id: "refactor", label: "refactor", description: "Restructure the selected code", group: "Workspace" },
  { id: "reset", label: "reset", description: "Clear the conversation", group: "Built-in" },
]
const mentions = [
  { id: "f1", label: "useTasks.ts", description: "app/src/hooks", kind: "file" as const, group: "Files" },
  { id: "p1", label: "Sarah Chen", description: "sarah · Design", kind: "person" as const, group: "People" },
]
const skills = [{ id: "rn", label: "release-notes", description: "Turn merged changes into notes" }]

const options = () => all("[role=option]")
const chips = () => all("[data-chip]")
const text = (value: string): ComposerValue[number] => ({ type: "text", text: value })
const chip = (
  trigger: "/" | "@" | "$",
  id: string,
  label: string,
  extra: object = {},
): ComposerValue[number] => ({
  type: "chip",
  trigger,
  id,
  label,
  ...extra,
})

/** A composer that records every reported value. */
function setup(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const values: ComposerValue[] = []
  const sent: ComposerSubmit[] = []
  const picks: string[] = []
  const m = track(
    mount(() => (
      <Composer
        commands={commands}
        mentions={mentions}
        skills={skills}
        onValueChange={(v) => values.push(v)}
        onSubmit={(s) => sent.push(s)}
        onPick={(p) => picks.push(`${p.trigger}${p.item.id}`)}
        {...props}
      />
    )),
  )
  return { ...m, values, sent, picks, editor: () => editorOf(), last: () => values[values.length - 1] }
}

describe("Composer menus", () => {
  test("/ at the start of a line opens the command menu, filters as you type and Enter inserts a chip", async () => {
    const { editor, picks, last } = setup()
    typeText(editor(), "/re")
    await tick()
    expect(options().map((o) => o.querySelector(".nc-menu__name")?.textContent)).toEqual([
      "/review",
      "/refactor",
      "/reset",
    ])
    typeText(editor(), "f")
    await tick()
    expect(options()).toHaveLength(1)
    expect(one(".nc-match").textContent).toBe("ref")
    press(editor(), "Enter")
    await tick()
    expect(last()).toEqual([chip("/", "refactor", "refactor"), text(" ")])
    expect(picks).toEqual(["/refactor"])
    expect(document.querySelector("[role=listbox]")).toBeNull()
    expect(chips()).toHaveLength(1)
    expect(chips()[0]?.textContent).toBe("/refactor")
  })

  test("arrow keys move the highlighted option and aria-activedescendant follows", async () => {
    const { editor } = setup()
    typeText(editor(), "/")
    await tick()
    expect(options()[0]?.getAttribute("aria-selected")).toBe("true")
    press(editor(), "ArrowDown")
    await tick()
    expect(options()[1]?.getAttribute("aria-selected")).toBe("true")
    expect(editor().getAttribute("aria-activedescendant")).toBe(options()[1]?.id)
    press(editor(), "ArrowUp")
    press(editor(), "ArrowUp")
    await tick()
    expect(options()[2]?.getAttribute("aria-selected")).toBe("true")
  })

  test("@ opens mentions after a space, with tabs by group; picking replaces only the word", async () => {
    const { editor, last } = setup()
    typeText(editor(), "look at @use")
    await tick()
    expect(all(".nc-menu__tab").map((t) => t.textContent)).toEqual(["All", "Files", "People"])
    expect(options()).toHaveLength(1)
    click(options()[0] as HTMLElement)
    await tick()
    expect(last()).toEqual([text("look at "), chip("@", "f1", "useTasks.ts", { kind: "file" }), text(" ")])
    expect(editor().textContent).toBe("look at useTasks.ts ")
    // The caret is after the space that follows the chip, so typing goes on from there.
    expect(selectionFlat(editor())).toEqual({ start: 10, end: 10 })
  })

  test("a person chip shows initials and a file chip an icon", async () => {
    const { editor } = setup({
      defaultValue: [
        chip("@", "p1", "Sarah Chen", { kind: "person" }),
        chip("@", "f1", "a.ts", { kind: "file" }),
      ],
    })
    await tick()
    expect(chips()[0]?.querySelector(".nc-avatar")?.textContent).toBe("SC")
    expect(chips()[1]?.querySelector("svg")).not.toBeNull()
    expect(editor().querySelectorAll("[data-chip]")).toHaveLength(2)
  })

  test("$ opens skills; Escape dismisses the menu without clearing the text", async () => {
    const { editor, last } = setup()
    typeText(editor(), "then $re")
    await tick()
    expect(options()).toHaveLength(1)
    press(editor(), "Escape")
    await tick()
    expect(document.querySelector("[role=listbox]")).toBeNull()
    expect(last()).toEqual([text("then $re")])
  })

  test("no menu for a / in the middle of a line, or for a trigger with no items", async () => {
    const { editor } = setup({ mentions: [] })
    typeText(editor(), "and/or")
    await tick()
    expect(document.querySelector("[role=listbox]")).toBeNull()
    typeText(editor(), " see @x")
    await tick()
    expect(document.querySelector("[role=listbox]")).toBeNull()
  })

  test("a / after a chip on the same line is not a command", async () => {
    const { editor } = setup({ defaultValue: [chip("@", "f1", "a.ts", { kind: "file" }), text(" ")] })
    await tick()
    placeCaret(editor())
    typeText(editor(), "/re")
    await tick()
    expect(document.querySelector("[role=listbox]")).toBeNull()
  })
})

describe("Composer chips", () => {
  const withChip = (extra: Partial<Parameters<typeof Composer>[0]> = {}) =>
    setup({
      defaultValue: [text("see "), chip("@", "f1", "useTasks.ts", { kind: "file" }), text(" now")],
      ...extra,
    })

  test("a chip is atomic and reads back as one segment between text segments", async () => {
    const { editor, values } = withChip()
    await tick()
    expect(chips()).toHaveLength(1)
    expect(chips()[0]?.getAttribute("contenteditable")).toBe("false")
    expect(editor().textContent).toBe("see useTasks.ts now")
    typeText(editor(), "!")
    await tick()
    expect(values.at(-1)).toEqual([
      text("see "),
      chip("@", "f1", "useTasks.ts", { kind: "file" }),
      text(" now!"),
    ])
  })

  test("the caret cannot enter a chip: a selection inside one moves to its edge", async () => {
    const { editor } = withChip()
    await tick()
    editor().focus()
    const inner = (chips()[0] as HTMLElement).lastChild as Text
    const range = document.createRange()
    range.setStart(inner, 3)
    range.collapse(true)
    const sel = window.getSelection() as Selection
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event("selectionchange"))
    flush()
    expect(selectionFlat(editor())).toEqual({ start: 5, end: 5 })
    expect((window.getSelection() as Selection).getRangeAt(0).startContainer).not.toBe(inner)
  })

  test("one backspace right after a chip removes the whole chip, and the caret stays where it was", async () => {
    const { editor, values } = withChip({
      defaultValue: [text("see "), chip("@", "f1", "useTasks.ts", { kind: "file" })],
    })
    await tick()
    placeCaret(editor())
    expect(selectionFlat(editor())).toEqual({ start: 5, end: 5 })
    const event = press(editor(), "Backspace")
    await tick()
    expect(event.defaultPrevented).toBe(true)
    expect(chips()).toHaveLength(0)
    expect(values.at(-1)).toEqual([text("see ")])
    expect(selectionFlat(editor())).toEqual({ start: 4, end: 4 })
  })

  test("Delete right before a chip removes it; Backspace with text before the caret does not touch the chip", async () => {
    const { editor, values } = withChip()
    await tick()
    placeCaret(editor(), 4)
    press(editor(), "Delete")
    await tick()
    expect(chips()).toHaveLength(0)
    expect(values.at(-1)).toEqual([text("see  now")])
  })

  test("Backspace after the space that follows a chip leaves the chip for the next key", async () => {
    const { editor } = withChip()
    await tick()
    placeCaret(editor(), 6)
    const event = press(editor(), "Backspace")
    expect(event.defaultPrevented).toBe(false)
    expect(chips()).toHaveLength(1)
  })

  test("a chip with no neighbours can still be removed and typed around", async () => {
    const { editor, values } = setup({ defaultValue: [chip("/", "review", "review")] })
    await tick()
    placeCaret(editor())
    typeText(editor(), "x")
    await tick()
    expect(values.at(-1)).toEqual([chip("/", "review", "review"), text("x")])
    placeCaret(editor(), 1)
    press(editor(), "Backspace")
    await tick()
    expect(values.at(-1)).toEqual([text("x")])
  })

  test("undo and redo step over chip picks and typing", async () => {
    const { editor, values } = setup()
    typeText(editor(), "/rev")
    await tick()
    press(editor(), "Enter")
    await tick()
    expect(chips()).toHaveLength(1)
    const undo = new InputEvent("beforeinput", { inputType: "historyUndo", cancelable: true, bubbles: true })
    editor().dispatchEvent(undo)
    flush()
    await tick()
    expect(undo.defaultPrevented).toBe(true)
    expect(chips()).toHaveLength(0)
    expect(values.at(-1)).toEqual([text("/rev")])
    editor().dispatchEvent(
      new InputEvent("beforeinput", { inputType: "historyRedo", cancelable: true, bubbles: true }),
    )
    await tick()
    expect(chips()).toHaveLength(1)
  })
})

describe("Composer value", () => {
  test("is controlled when set: an outside change re-renders the field and keeps the caret", async () => {
    const [value, setValue] = createSignal<ComposerValue>([text("one two")])
    const { editor } = setup({ value: value(), onValueChange: undefined } as never)
    for (const c of cleanup) c()
    cleanup = []
    document.body.innerHTML = ""
    const m = track(mount(() => <Composer value={value()} onValueChange={setValue} />))
    expect(m).toBeDefined()
    await tick()
    placeCaret(editorOf(), 3)
    setValue([text("one two"), chip("$", "rn", "release-notes")])
    flush()
    await tick()
    expect(chips()).toHaveLength(1)
    expect(selectionFlat(editorOf())).toEqual({ start: 3, end: 3 })
    expect(editor).toBeDefined()
  })

  test("typing in a controlled composer reports the new value and does not rebuild the DOM", async () => {
    const [value, setValue] = createSignal<ComposerValue>([text("hi")])
    track(mount(() => <Composer value={value()} onValueChange={setValue} />))
    await tick()
    const node = editorOf().firstChild
    typeText(editorOf(), " there")
    await tick()
    expect(value()).toEqual([text("hi there")])
    expect(editorOf().firstChild).toBe(node)
  })

  test("Enter sends the value and the text; a chip alone is not blank; an uncontrolled composer clears", async () => {
    const { editor, sent } = setup()
    const send = one<HTMLButtonElement>("button[aria-label=Send]")
    expect(send.disabled).toBe(true)
    typeText(editor(), "/re")
    await tick()
    press(editor(), "Enter")
    await tick()
    expect(send.disabled).toBe(false)
    typeText(editor(), "the changes")
    await tick()
    press(editor(), "Enter")
    expect(sent).toHaveLength(1)
    expect(sent[0]?.text).toBe("/review the changes")
    expect(sent[0]?.value).toEqual([chip("/", "review", "review"), text(" the changes")])
    await tick()
    expect(editor().textContent).toBe("")
    expect(send.disabled).toBe(true)
  })

  test("Shift+Enter adds a line and does not send", async () => {
    const { editor, sent, last } = setup()
    typeText(editor(), "one")
    const event = press(editor(), "Enter", { shiftKey: true })
    await tick()
    expect(event.defaultPrevented).toBe(true)
    expect(sent).toEqual([])
    typeText(editor(), "two")
    await tick()
    expect(last()).toEqual([text("one\ntwo")])
    expect(flatText(editor())).toBe("one\ntwo")
  })

  test("a blank composer shows the placeholder, and typing hides it", async () => {
    const { editor } = setup({ placeholder: "Ask the team…" })
    expect(one(".nc-composer__placeholder").textContent).toBe("Ask the team…")
    typeText(editor(), "x")
    await tick()
    expect(document.querySelector(".nc-composer__placeholder")).toBeNull()
  })

  test("a disabled composer is not editable and sends nothing", async () => {
    const { editor, sent } = setup({ disabled: true, defaultValue: [text("hi")] })
    await tick()
    expect(editor().getAttribute("contenteditable")).toBe("false")
    expect(one<HTMLButtonElement>("button[aria-label=Send]").disabled).toBe(true)
    press(editor(), "Enter")
    expect(sent).toEqual([])
  })
})

describe("Composer paste and drop", () => {
  const paste = (el: HTMLElement, data: Record<string, string>) => {
    const dt = new DataTransfer()
    for (const [type, value] of Object.entries(data)) dt.setData(type, value)
    const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    flush()
    return event
  }

  test("pastes plain text only, with line breaks normalised, at the caret", async () => {
    const { editor, values } = setup({ defaultValue: [text("ab")] })
    await tick()
    placeCaret(editor(), 1)
    const event = paste(editor(), { "text/plain": "X\r\nY", "text/html": "<b>X</b><div>Y</div>" })
    await tick()
    expect(event.defaultPrevented).toBe(true)
    expect(values.at(-1)).toEqual([text("aX\nYb")])
    expect(editor().querySelector("b, div")).toBeNull()
    expect(selectionFlat(editor())).toEqual({ start: 4, end: 4 })
  })

  test("replaces the selection, including chips inside it", async () => {
    const { editor, values } = setup({
      defaultValue: [text("a "), chip("@", "f1", "x.ts", { kind: "file" }), text(" b")],
    })
    await tick()
    placeCaret(editor(), 1, 4)
    paste(editor(), { "text/plain": "-" })
    await tick()
    expect(values.at(-1)).toEqual([text("a-b")])
  })

  test("pasting markup as text does not create elements, and a paste with no text does nothing", async () => {
    const { editor, values } = setup()
    paste(editor(), { "text/plain": "<script>alert(1)</script>" })
    await tick()
    expect(editor().querySelector("script")).toBeNull()
    expect(values.at(-1)).toEqual([text("<script>alert(1)</script>")])
    const before = values.length
    paste(editor(), { "text/html": "<b>only html</b>" })
    await tick()
    expect(values.length).toBe(before)
  })

  test("a pasted slash does not become a chip, but the menu opens as for typing", async () => {
    const { editor, last } = setup()
    paste(editor(), { "text/plain": "/re" })
    await tick()
    expect(last()).toEqual([text("/re")])
    expect(chips()).toHaveLength(0)
  })

  test("formatting keys and rich drops are refused", async () => {
    const { editor, last } = setup({ defaultValue: [text("hi")] })
    await tick()
    const bold = new InputEvent("beforeinput", { inputType: "formatBold", cancelable: true, bubbles: true })
    editor().dispatchEvent(bold)
    flush()
    expect(bold.defaultPrevented).toBe(true)
    const dt = new DataTransfer()
    dt.setData("text/plain", "dropped")
    placeCaret(editor())
    const drop = new InputEvent("beforeinput", {
      inputType: "insertFromDrop",
      dataTransfer: dt,
      cancelable: true,
      bubbles: true,
    })
    editor().dispatchEvent(drop)
    flush()
    await tick()
    expect(drop.defaultPrevented).toBe(true)
    expect(last()).toEqual([text("hidropped")])
  })
})

describe("Composer IME composition", () => {
  const compose = (el: HTMLElement, data: string) => {
    const node = el.firstChild as Text
    node.nodeValue = data
    selectFlat(el, data.length)
    el.dispatchEvent(
      new InputEvent("input", { inputType: "insertCompositionText", data, isComposing: true, bubbles: true }),
    )
  }

  test("Enter that confirms a candidate neither sends nor picks, and the value follows when composition ends", async () => {
    const { editor, sent, values } = setup()
    typeText(editor(), "/")
    await tick()
    expect(options().length).toBeGreaterThan(0)
    editor().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
    flush()
    compose(editor(), "/にほ")
    const enter = press(editor(), "Enter", { isComposing: true })
    expect(enter.defaultPrevented).toBe(false)
    const key229 = press(editor(), "Process", { keyCode: 229 })
    expect(key229.defaultPrevented).toBe(false)
    expect(sent).toEqual([])
    expect(chips()).toHaveLength(0)
    const reported = values.length
    compose(editor(), "/日本")
    editor().dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "/日本" }))
    flush()
    await tick()
    expect(values.at(-1)).toEqual([text("/日本")])
    expect(values.length).toBeGreaterThanOrEqual(reported)
    expect(sent).toEqual([])
  })

  test("a value that arrives from outside during composition does not rebuild the field", async () => {
    const [value, setValue] = createSignal<ComposerValue>([text("a")])
    track(mount(() => <Composer value={value()} onValueChange={() => {}} />))
    await tick()
    const node = editorOf().firstChild as Text
    editorOf().dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
    flush()
    node.nodeValue = "あ"
    setValue([text("elsewhere")])
    flush()
    await tick()
    expect(editorOf().firstChild).toBe(node)
    expect(node.nodeValue).toBe("あ")
  })

  test("a virtual keyboard's Enter (insertParagraph) sends unless a menu is open or composing", async () => {
    const { editor, sent } = setup({ defaultValue: [text("hello")] })
    await tick()
    const event = new InputEvent("beforeinput", {
      inputType: "insertParagraph",
      cancelable: true,
      bubbles: true,
    })
    editor().dispatchEvent(event)
    flush()
    expect(event.defaultPrevented).toBe(true)
    expect(sent).toHaveLength(1)
  })
})

describe("Composer states", () => {
  test("running shows the stop bar; Stop and Escape both call onStop", async () => {
    let stops = 0
    track(mount(() => <Composer running runningLabel="Running tests…" onStop={() => stops++} />))
    expect(document.querySelector("[data-part=composer-input]")).toBeNull()
    expect(document.body.textContent).toContain("Running tests…")
    click(one("button[aria-label=Stop]"))
    press(one("[data-part=composer]"), "Escape")
    expect(stops).toBe(2)
  })

  test("working keeps the field: the round button stops while empty and sends once something is typed", async () => {
    let stops = 0
    const sent: unknown[] = []
    track(mount(() => <Composer working onStop={() => stops++} onSubmit={(v) => sent.push(v)} />))
    expect(document.querySelector("[data-part=composer-input]")).not.toBeNull()
    expect(document.querySelector("button[aria-label=Send]")).toBeNull()
    click(one("[data-part=composer-stop]"))
    expect(stops).toBe(1)
    typeText(editorOf(), "also run the tests")
    await tick()
    expect(document.querySelector("[data-part=composer-stop]")).toBeNull()
    click(one("button[aria-label=Send]"))
    expect(sent.length).toBe(1)
    expect(stops).toBe(1)
  })

  test("the typed text survives a run: the field comes back with the value", async () => {
    const [running, setRunning] = createSignal(false)
    const [value, setValue] = createSignal<ComposerValue>([text("draft "), chip("$", "rn", "release-notes")])
    track(mount(() => <Composer running={running()} value={value()} onValueChange={setValue} />))
    await tick()
    setRunning(true)
    flush()
    await tick()
    setRunning(false)
    flush()
    await tick()
    expect(editorOf().textContent).toBe("draft $release-notes")
    expect(chips()).toHaveLength(1)
  })

  test("dictation states: idle mic, recording with timer and finish, transcribing, blocked", async () => {
    const calls: string[] = []
    const [state, setState] = createSignal<"idle" | "recording" | "transcribing" | "blocked">("idle")
    track(
      mount(() => (
        <Composer
          dictation={{
            state: state(),
            elapsed: 7,
            level: 0.5,
            onStart: () => calls.push("start"),
            onFinish: () => calls.push("finish"),
            onCancel: () => calls.push("cancel"),
            onOpenSettings: () => calls.push("settings"),
          }}
        />
      )),
    )
    click(one("button[aria-label='Start dictation']"))
    setState("recording")
    flush()
    await tick()
    expect(one("[data-part=dictation]").textContent).toContain("0:07")
    expect(document.querySelector("button[aria-label=Send]")).toBeNull()
    click(one("button[aria-label='Finish dictation']"))
    click(one("button[aria-label='Cancel dictation']"))
    setState("transcribing")
    flush()
    await tick()
    expect(one("[data-part=dictation]").textContent).toContain("Transcribing")
    // A disabled icon button keeps its tooltip, so it is aria-disabled and stays focusable.
    expect(one<HTMLButtonElement>("button[aria-label=Transcribing]").getAttribute("aria-disabled")).toBe(
      "true",
    )
    setState("blocked")
    flush()
    await tick()
    click(all("button").find((b) => b.textContent === "Open settings") as HTMLElement)
    expect(calls).toEqual(["start", "finish", "cancel", "settings"])
  })
})
