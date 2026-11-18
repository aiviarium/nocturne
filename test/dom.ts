import type { JSX } from "solid-js"
import { render } from "solid-js/web"
import { flatOffset, selectFlat } from "../src/lib/editor"

/** Render a component into a fresh container inside a themed root. Returns the container and a cleanup. */
export function mount(view: () => JSX.Element): { root: HTMLElement; dispose: () => void } {
  const root = document.createElement("div")
  root.className = "nc"
  root.setAttribute("data-theme", "dark")
  document.body.appendChild(root)
  const dispose = render(view, root)
  return {
    root,
    dispose: () => {
      dispose()
      root.remove()
    },
  }
}

/** Let effects, microtasks and zero-delay timers run. */
export async function tick(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Dispatch a key press on `el`. */
export function press(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(event)
  return event
}

export function click(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
}

/** Everything under `document` that matches, including portals. */
export function all<T extends Element = HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector))
}

export function one<T extends Element = HTMLElement>(selector: string, within: ParentNode = document): T {
  const el = within.querySelector<T>(selector)
  if (!el) throw new Error(`no element for ${selector}`)
  return el
}

/** The composer's editable field. */
export const editorOf = (within: ParentNode = document) =>
  one<HTMLDivElement>("[data-part=composer-input]", within)

/** Put the caret at a flat position of the composer's field (chips count 1) and focus it. */
export function placeCaret(el: HTMLElement, flat = Number.POSITIVE_INFINITY, end = flat): void {
  el.focus()
  selectFlat(el, flat, end)
  document.dispatchEvent(new Event("selectionchange"))
}

/** What typing does to the DOM: insert text at the caret (replacing a selection), then fire `input`. */
export function typeText(el: HTMLElement, text: string): void {
  el.focus()
  const sel = window.getSelection() as Selection
  if (sel.rangeCount === 0 || !el.contains(sel.getRangeAt(0).startContainer)) placeCaret(el)
  const range = sel.getRangeAt(0)
  const start = flatOffset(el, range.startContainer, range.startOffset)
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
  el.normalize()
  selectFlat(el, start + text.length)
  el.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }))
  document.dispatchEvent(new Event("selectionchange"))
}
