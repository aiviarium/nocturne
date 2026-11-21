import type { JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, onCleanup, onSettled, Show, untrack } from "solid-js"
import { aria } from "../lib/aria"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import {
  type ComposerChip,
  type ComposerValue,
  caretFlat,
  chipToDelete,
  cleanPlainText,
  createHistory,
  flatOfSegments,
  insertTextAtSelection,
  isBlank,
  isCanonical,
  keepOutOfChips,
  normalizeSegments,
  readSegments,
  renderChip,
  renderSegments,
  replaceFlat,
  sameSegments,
  segmentsToText,
  selectFlat,
  selectionFlat,
} from "../lib/editor"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { type ActiveTrigger, filterItems, findTrigger, type TriggerChar } from "../lib/triggers"
import { Button } from "./Button"
import { DICTATION_KEY, DictationBar, type DictationState, joinDictated, useDictation } from "./Dictation"
import { Icon, type IconName, StopGlyph } from "./Icon"
import { IconButton } from "./IconButton"
import { InsetGroup, InsetList, InsetRow } from "./InsetList"
import { Kbd } from "./Kbd"
import { DropdownMenu } from "./Menu"
import { Popover } from "./Popover"
import { Sheet } from "./Sheet"
import { StatusDot } from "./StatusDot"

export type { ComposerChip, ComposerSegment, ComposerValue } from "../lib/editor"
export { isBlank as isComposerBlank, segmentsToText as composerText } from "../lib/editor"

export interface ComposerItem {
  /** Stable id. */
  id: string
  /** The name that is matched and inserted, without the trigger character: `review`, `useTasks.ts`. */
  label: string
  /** One line of detail shown under the label. */
  description?: string
  /** A named icon: the mark in the menu row, and the type icon on a picked reference. */
  icon?: IconName
  /** Right-aligned meta in the row: `Ctrl R`, `File`, `Team`. */
  meta?: string
  /** Tab the item belongs to in the menu: `Workspace`, `Files`, `People`. Items without one appear only under All. */
  group?: string
  /** For `@` items: `person` shows initials and the person style; `doc` uses the doc hue. Everything else is a reference. */
  kind?: "person" | "doc" | "file" | "folder"
  /** Extra words that match the query. */
  keywords?: string
}

export interface ComposerAttachment {
  id: string
  /** File name shown on the chip. */
  name: string
  /** A named icon for the type. Default `file`. */
  icon?: IconName
  /** `image` with a `preview` draws a thumbnail in place of the chip. Default `file`. */
  kind?: "image" | "file"
  /** Image only: the URL or object URL of the thumbnail. */
  preview?: string
}

export interface ComposerOption {
  /** Stable id passed to the change callback. */
  id: string
  /** Shown in the menu and on the button. */
  label: string
  /** One line of trade-off under the label. */
  description?: string
}

export type EffortLevel = "low" | "medium" | "high" | "max"

export interface ComposerSubmit {
  /** What was written: text and picked chips, in order. */
  value: ComposerValue
  /** The same as plain text, with each chip as its trigger and name (`/review`). */
  text: string
  attachments: ComposerAttachment[]
}

export interface ComposerProps {
  /** What is written, as text and chips in order. Controlled when set. */
  value?: ComposerValue
  /** The starting value when uncontrolled. */
  defaultValue?: ComposerValue
  /** Called on every change, including picks and removed chips, with the whole value. */
  onValueChange?: (value: ComposerValue) => void
  /** Called when the person sends (Enter without Shift, or the send button). An uncontrolled composer clears itself. */
  onSubmit?: (submit: ComposerSubmit) => void
  /** Placeholder text. Default "Ask anything…". */
  placeholder?: string
  /**
   * A notice about the input, in a strip on the composer's top edge, outside its box: a rate limit, a lost
   * connection. A blocked microphone or a failed dictation shows there too.
   */
  notice?: JSX.Element
  /** `/` commands, run now. They start a line. */
  commands?: ComposerItem[]
  /** `@` context: files, docs and people. */
  mentions?: ComposerItem[]
  /** `$` skills: saved procedures. */
  skills?: ComposerItem[]
  /** Called when an item is picked from a trigger menu. */
  onPick?: (pick: { trigger: TriggerChar; item: ComposerItem }) => void
  /** Called as the text after a trigger changes, so items can be looked up (`@` search); `null` when no trigger is open. */
  onQuery?: (q: { trigger: TriggerChar; query: string } | null) => void
  /** Attachments above the text: chips, and thumbnails for images with a `preview`. */
  attachments?: ComposerAttachment[]
  /** The plus button. Hidden when not set. */
  onAttach?: () => void
  /** The close button on a chip. */
  onRemoveAttachment?: (id: string) => void
  /**
   * Files pasted or dropped into the composer, such as a screenshot. Add them to `attachments` (an image with a
   * `preview` object URL shows as a thumbnail). Without it, pasting keeps only the text and drops are ignored.
   */
  onAttachFiles?: (files: File[]) => void
  /** Model choices. Hidden when not set. */
  models?: ComposerOption[]
  model?: string
  onModelChange?: (id: string) => void
  /** Mode choices (such as Ask, Plan, Edit). Hidden when not set. */
  modes?: ComposerOption[]
  mode?: string
  onModeChange?: (id: string) => void
  /** Effort, a four-step meter. Hidden when `onEffortChange` is not set. */
  effort?: EffortLevel
  onEffortChange?: (effort: EffortLevel) => void
  /** The assistant is working: shows the running bar with a Stop button. */
  running?: boolean
  /** Text of the running bar: "Running tests…". */
  runningLabel?: string
  /**
   * The assistant is working and still takes messages: the composer stays, and its round button stops the run
   * while nothing is typed and sends (steers) once something is.
   */
  working?: boolean
  /** Stop (button or Esc while running or working). */
  onStop?: () => void
  /**
   * Dictation. Without it, the composer dictates by itself when a `TranscriberProvider` is above it (the
   * transcript lands at the caret); `false` turns that off. With a state, it only shows the state and calls
   * back.
   */
  dictation?: DictationState | false
  disabled?: boolean
  class?: string
}

const EFFORTS: Array<{ id: EffortLevel; label: string; description: string }> = [
  { id: "low", label: "Low", description: "Quick answers, least thinking" },
  { id: "medium", label: "Medium", description: "Balanced for everyday work" },
  { id: "high", label: "High", description: "Thinks longer on hard problems" },
  { id: "max", label: "Max", description: "Most thorough, slowest and costliest" },
]

function Bars(props: { level: number }): JSX.Element {
  return (
    <span class="nc-effort__bars" aria-hidden="true">
      <For each={[0, 1, 2, 3]}>{(i) => <i class={{ on: i <= props.level }} />}</For>
    </span>
  )
}

/**
 * The AI input: an editable field with `/`, `@` and `$` trigger menus, attachment chips, model, mode and
 * effort selectors, dictation and send or stop. It does no network or microphone work.
 *
 * Picked commands, mentions and skills are chips inside the text: atomic (one backspace removes one, the
 * caret never enters it) and reported in `value` as chip segments between text segments.
 */
export function Composer(props: ComposerProps): JSX.Element {
  const uid = createId("composer")
  const [value, setValue] = createControllable<ComposerValue>({
    value: () => props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (v) => props.onValueChange?.(v),
  })
  const [caret, setCaret] = createSignal(0)
  const [dismissed, setDismissed] = createSignal<number | null>(null)
  const [tab, setTab] = createSignal("All")
  const [active, setActive] = createSignal(0)
  const [root, setRoot] = createSignal<HTMLDivElement>()
  const [focused, setFocused] = createSignal(false)
  let editor: HTMLDivElement | undefined
  let composing = false

  // Dictation of its own, from the transcriber in context, unless the caller drives it.
  const auto = useDictation({
    enabled: () => props.dictation === undefined && !props.disabled,
    insert: (text) => {
      if (!editor) return
      editor.focus()
      const at = Math.min(caret(), flatOfSegments(value()).length)
      selectFlat(editor, at)
      const flatNow = flatOfSegments(value())
      insertText(joinDictated(flatNow.slice(0, at), text, flatNow.slice(at)))
    },
  })
  const dictation = (): DictationState | undefined =>
    props.dictation === false
      ? undefined
      : (props.dictation ?? (auto.available() || auto.state().state !== "idle" ? auto.state() : undefined))

  const flat = createMemo(() => flatOfSegments(value()))
  const itemsFor = (char: TriggerChar): ComposerItem[] =>
    (char === "/" ? props.commands : char === "$" ? props.skills : props.mentions) ?? []
  const trigger = createMemo<ActiveTrigger | null>(() => {
    if (
      props.running ||
      props.disabled ||
      dictation()?.state === "recording" ||
      dictation()?.state === "transcribing" ||
      !focused()
    )
      return null
    const t = findTrigger(flat(), caret())
    if (!t || dismissed() === t.start || itemsFor(t.char).length === 0) return null
    return t
  })
  const tabs = createMemo(() => {
    const t = trigger()
    if (!t) return []
    const groups = [
      ...new Set(
        itemsFor(t.char)
          .map((i) => i.group)
          .filter((g): g is string => Boolean(g)),
      ),
    ]
    return groups.length > 0 ? ["All", ...groups] : []
  })
  const results = createMemo(() => {
    const t = trigger()
    if (!t) return []
    const inTab = itemsFor(t.char).filter((i) => tab() === "All" || i.group === tab())
    return filterItems(inTab, t.query)
  })
  createEffect(
    () => trigger()?.char,
    () => {
      setTab("All")
    },
  )
  createEffect(
    () => [trigger()?.query, tab()],
    () => {
      setActive(0)
    },
  )
  const typed = createMemo(() => {
    if (!props.onQuery || props.running || props.disabled || !focused()) return null
    const t = findTrigger(flat(), caret())
    return t && dismissed() !== t.start ? `${t.char}${t.query}` : null
  })
  createEffect(
    typed,
    (t) => {
      props.onQuery?.(t ? { trigger: t[0] as TriggerChar, query: t.slice(1) } : null)
    },
    { defer: true },
  )

  const history = createHistory({ value: untrack(() => value()), caret: 0 })

  // The DOM is the source while someone edits and the value is the source when it changes from outside:
  // render only when the two disagree, and keep the caret where it was.
  createEffect(
    () => ({
      next: value(),
      blocked: composing || props.running || dictation()?.state === "recording",
    }),
    ({ next, blocked }) => {
      if (!editor || blocked) return
      if (sameSegments(readSegments(editor), next)) return
      const at = caretFlat(editor)
      renderSegments(editor, next)
      if (at !== null && document.activeElement === editor)
        selectFlat(editor, Math.min(at, flatOfSegments(next).length))
    },
  )

  /** Read the editor into the value, and the caret into the trigger state. */
  const sync = (options: { typing?: boolean } = {}) => {
    if (!editor) return
    let next = readSegments(editor)
    // Anything but text and chips (a wrapper the browser added) is turned back into plain nodes. Not while
    // composing: replacing nodes would end the composition.
    if (!composing && !isCanonical(editor)) {
      const at = caretFlat(editor)
      renderSegments(editor, next)
      if (at !== null) selectFlat(editor, Math.min(at, flatOfSegments(next).length))
    }
    next = normalizeSegments(next)
    const at = caretFlat(editor) ?? caret()
    if (!sameSegments(next, value())) setValue(next)
    setCaret(at)
    if (!composing) history.record({ value: next, caret: at }, options.typing ?? false)
  }
  const syncCaret = () => {
    if (!editor) return
    if (keepOutOfChips(editor)) setDismissed(null)
    const at = caretFlat(editor)
    if (at !== null) setCaret(at)
  }
  const onSelectionChange = () => {
    if (editor && document.activeElement === editor && !composing) syncCaret()
  }
  onSettled(() => {
    document.addEventListener("selectionchange", onSelectionChange)
    if (editor) {
      renderSegments(editor, value())
      history.reset({ value: value(), caret: flatOfSegments(value()).length })
    }
  })
  onCleanup(() => document.removeEventListener("selectionchange", onSelectionChange))

  const restore = (entry: { value: ComposerValue; caret: number }) => {
    if (!editor) return
    renderSegments(editor, entry.value)
    setValue(entry.value)
    selectFlat(editor, Math.min(entry.caret, flatOfSegments(entry.value).length))
    syncCaret()
  }

  const pick = (item: ComposerItem) => {
    const t = trigger()
    if (!t || !editor) return
    const chip: ComposerChip = {
      type: "chip",
      trigger: t.char,
      id: item.id,
      label: item.label,
      ...(item.kind ? { kind: item.kind } : {}),
      ...(item.icon ? { icon: item.icon } : {}),
    }
    const end = selectionFlat(editor)?.end ?? caret()
    const after = flat().slice(end)
    const nodes: Node[] = [renderChip(chip)]
    if (!after.startsWith(" ")) nodes.push(document.createTextNode(" "))
    const at = replaceFlat(editor, t.start, end, nodes)
    // Past the space that follows the chip, so typing goes on after it.
    if (after.startsWith(" ")) selectFlat(editor, at + 1)
    sync()
    props.onPick?.({ trigger: t.char, item })
    // Focusing a field that already has focus moves the caret in some browsers, so only when it is elsewhere.
    if (document.activeElement !== editor) editor.focus()
  }
  const canSend = () => !isBlank(value()) && !props.disabled
  const submit = () => {
    if (!canSend()) return
    const sent = value()
    props.onSubmit?.({ value: sent, text: segmentsToText(sent), attachments: props.attachments ?? [] })
    if (props.value === undefined) {
      if (editor) renderSegments(editor, [])
      setValue([])
      setCaret(0)
      history.reset({ value: [], caret: 0 })
    }
  }
  const insertText = (text: string) => {
    if (!editor || text === "") return
    insertTextAtSelection(editor, text)
    setDismissed(null)
    sync()
  }
  const removeChip = (range: { start: number; end: number }) => {
    if (!editor) return
    replaceFlat(editor, range.start, range.end, [])
    setDismissed(null)
    sync()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (composing || event.isComposing || event.keyCode === 229) return
    if (props.dictation === undefined && auto.onKeyDown(event)) return
    const list = results()
    if (trigger()) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        if (list.length)
          setActive((a) => (a + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length)
        return
      }
      if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey && list.length) {
        event.preventDefault()
        pick((list[active()] ?? (list[0] as { item: ComposerItem })).item)
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        setDismissed(trigger()?.start ?? null)
        return
      }
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      // Our own undo, since the browser's does not survive the edits made here (and sends no redo).
      const key = event.key.toLowerCase()
      const redo = (key === "z" && event.shiftKey) || (key === "y" && !event.metaKey)
      if (key === "z" || redo) {
        event.preventDefault()
        const entry = redo ? history.redo() : history.undo()
        if (entry) restore(entry)
        return
      }
    }
    if (event.key === "Enter") {
      event.preventDefault()
      if (event.shiftKey) insertText("\n")
      else submit()
      return
    }
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      editor &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const range = chipToDelete(editor, event.key === "Backspace" ? "backward" : "forward")
      if (range) {
        event.preventDefault()
        removeChip(range)
      }
    }
  }
  const onBeforeInput = (event: InputEvent) => {
    const type = event.inputType
    if (type === "historyUndo" || type === "historyRedo") {
      event.preventDefault()
      const entry = type === "historyUndo" ? history.undo() : history.redo()
      if (entry) restore(entry)
    } else if (type.startsWith("format")) {
      // No bold or italics: the value is text and chips.
      event.preventDefault()
    } else if (type === "insertParagraph") {
      // A virtual keyboard's Enter, which sends no key event we can tell from typing.
      event.preventDefault()
      if (!composing && !trigger()) submit()
    } else if (type === "insertLineBreak") {
      event.preventDefault()
      insertText("\n")
    } else if (type === "insertFromDrop" || type === "insertFromYank") {
      event.preventDefault()
      insertText(cleanPlainText(event.dataTransfer?.getData("text/plain") ?? ""))
    }
  }
  const onPaste = (event: ClipboardEvent) => {
    // Plain text only: no markup, no styles from wherever it was copied. Files (a pasted screenshot) go to
    // onAttachFiles.
    event.preventDefault()
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.length && props.onAttachFiles) props.onAttachFiles(files)
    const text = event.clipboardData?.getData("text/plain") ?? ""
    if (text) insertText(cleanPlainText(text))
  }
  const [dropping, setDropping] = createSignal(false)
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
  const onDragOver = (e: DragEvent) => {
    if (!props.onAttachFiles || !hasFiles(e)) return
    e.preventDefault()
    setDropping(true)
  }
  const onDrop = (e: DragEvent) => {
    setDropping(false)
    if (!props.onAttachFiles || !hasFiles(e)) return
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length) props.onAttachFiles(files)
  }
  const onInput = () => {
    setDismissed(null)
    sync({ typing: true })
  }

  const effortIndex = () =>
    Math.max(
      0,
      EFFORTS.findIndex((e) => e.id === (props.effort ?? "medium")),
    )
  const optionLabel = (list: ComposerOption[] | undefined, id: string | undefined) =>
    list?.find((o) => o.id === id)?.label ?? list?.[0]?.label ?? ""
  // On a phone the model, mode and effort are one compact control that opens a sheet, not a row of selectors
  // larger than the text being typed.
  const phone = usePhone()
  const [options, setOptions] = createSignal(false)
  const hasOptions = () => Boolean(props.models?.length || props.modes?.length || props.onEffortChange)
  // The option shown as chosen: the one with the id, else the first (as the label falls back to it).
  const chosen = (list: ComposerOption[] | undefined, id: string | undefined) =>
    list?.find((o) => o.id === id)?.id ?? list?.[0]?.id
  const optionsSummary = () =>
    [
      props.models?.length ? optionLabel(props.models, props.model) : "",
      props.modes?.length ? optionLabel(props.modes, props.mode) : "",
      props.onEffortChange ? EFFORTS[effortIndex()]?.label : "",
    ]
      .filter(Boolean)
      .join(", ")
  const dictState = () => dictation()?.state ?? "idle"
  const hasText = () => dictState() === "idle" || dictState() === "blocked"
  /** A blocked microphone or a failed dictation, shown above the composer. */
  const dictNotice = () =>
    dictState() === "blocked" || (dictState() === "idle" && Boolean(dictation()?.error))
  /** Recording or transcribing: the bottom row shows the dictation's status in place of the options. */
  const dictBusy = () => dictState() === "recording" || dictState() === "transcribing"

  return (
    <div
      data-part="composer"
      data-running={props.running ? "" : undefined}
      class={cx("nc-composer-wrap", props.class)}
      ref={setRoot}
      onKeyDown={(e) => e.key === "Escape" && (props.running || props.working) && props.onStop?.()}
    >
      <Show
        when={!props.running}
        fallback={
          <div class="nc-composer nc-composer--running nc-composer--bar" role="status">
            <StatusDot status="ai" />
            <span class="nc-muted nc-composer__status">{props.runningLabel ?? "Working…"}</span>
            <Kbd keys="Esc" />
            <button
              type="button"
              class="nc-send nc-send--stop"
              aria-label="Stop"
              onClick={() => props.onStop?.()}
            >
              <StopGlyph />
            </button>
          </div>
        }
      >
        <Show when={props.notice || dictNotice()}>
          <div class="nc-composer__notice" data-part="composer-notice">
            {props.notice}
            <Show when={dictation()}>{(d) => <DictationBar dictation={d()} part="notice" />}</Show>
          </div>
        </Show>
        <div
          class="nc-composer"
          data-dictation={dictState()}
          data-dropping={dropping() ? "" : undefined}
          onDragOver={onDragOver}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
        >
          <Show when={(props.attachments?.length ?? 0) > 0}>
            <div class="nc-composer__attachments" role="list" aria-label="Attachments">
              <For each={props.attachments}>
                {(a) => (
                  <Show
                    when={a.kind === "image" && a.preview}
                    fallback={
                      <span class="nc-token nc-token--ref" role="listitem">
                        <Icon name={a.icon ?? "file"} size="sm" />
                        {a.name}
                        <button
                          type="button"
                          class="nc-token__remove"
                          aria-label={`Remove ${a.name}`}
                          onClick={() => props.onRemoveAttachment?.(a.id)}
                        >
                          <Icon name="close" size="sm" />
                        </button>
                      </span>
                    }
                  >
                    {(preview) => (
                      <span class="nc-composer__thumb" role="listitem" data-kind="image" title={a.name}>
                        <img class="nc-composer__thumb-img" src={preview()} alt={a.name} draggable="false" />
                        <button
                          type="button"
                          class="nc-composer__thumb-remove"
                          aria-label={`Remove ${a.name}`}
                          onClick={() => props.onRemoveAttachment?.(a.id)}
                        >
                          <Icon name="close" size="sm" />
                        </button>
                      </span>
                    )}
                  </Show>
                )}
              </For>
            </div>
          </Show>

          <Show when={dictation()}>
            {(d) => (
              <>
                {/* The text heard so far takes the field's place, where the typed text will go. */}
                <DictationBar dictation={d()} part="live" class="nc-composer__live body-lg" />
              </>
            )}
          </Show>

          <div class="nc-composer__field" hidden={!hasText()}>
            <Show when={isBlank(value()) && !composing}>
              <span class="nc-composer__placeholder body-lg" aria-hidden="true">
                {props.placeholder ?? "Ask anything…"}
              </span>
            </Show>
            <div
              ref={editor}
              class="nc-composer__editor body-lg"
              data-part="composer-input"
              contenteditable={props.disabled ? "false" : "true"}
              role="textbox"
              aria-multiline="true"
              aria-label="Message"
              aria-autocomplete="list"
              aria-disabled={props.disabled ? "true" : undefined}
              aria-expanded={aria(Boolean(trigger()))}
              aria-controls={trigger() ? `${uid}-menu` : undefined}
              aria-activedescendant={trigger() && results().length ? `${uid}-opt-${active()}` : undefined}
              spellcheck="true"
              onInput={onInput}
              onBeforeInput={onBeforeInput}
              onKeyDown={onKeyDown}
              onKeyUp={(e) => !["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(e.key) && syncCaret()}
              onMouseUp={syncCaret}
              onPaste={onPaste}
              onFocus={() => {
                setFocused(true)
                syncCaret()
              }}
              onBlur={() => setFocused(false)}
              onCompositionStart={() => {
                composing = true
              }}
              onCompositionEnd={() => {
                composing = false
                sync({ typing: true })
              }}
            />
          </div>

          <div class="nc-composer__bar">
            <Show
              when={!dictBusy()}
              fallback={
                <DictationBar dictation={dictation()!} part="status" class="nc-composer__dictation" />
              }
            >
              <Show when={props.onAttach}>
                <IconButton label="Attach" icon="plus" onClick={() => props.onAttach?.()} />
              </Show>
              <Show when={phone() && hasOptions()}>
                <button
                  type="button"
                  class="nc-composer__options"
                  data-part="composer-options"
                  aria-label={`Options: ${optionsSummary()}`}
                  aria-haspopup="dialog"
                  aria-expanded={aria(options())}
                  onClick={() => setOptions(true)}
                >
                  <Icon name="sliders-horizontal" size="sm" />
                  <span class="nc-composer__options-text">
                    {props.models?.length ? optionLabel(props.models, props.model) : optionsSummary()}
                  </span>
                  <Show when={props.onEffortChange}>
                    <Bars level={effortIndex()} />
                  </Show>
                </button>
                <Sheet open={options()} title="Options" flush onClose={() => setOptions(false)}>
                  <InsetList class="nc-composer__sheet">
                    <Show when={props.models?.length}>
                      <InsetGroup title="Model">
                        <For each={props.models}>
                          {(m) => (
                            <InsetRow
                              label={m.label}
                              detail={m.description}
                              checked={m.id === chosen(props.models, props.model)}
                              onClick={() => props.onModelChange?.(m.id)}
                            />
                          )}
                        </For>
                      </InsetGroup>
                    </Show>
                    <Show when={props.modes?.length}>
                      <InsetGroup title="Mode">
                        <For each={props.modes}>
                          {(m) => (
                            <InsetRow
                              label={m.label}
                              detail={m.description}
                              checked={m.id === chosen(props.modes, props.mode)}
                              onClick={() => props.onModeChange?.(m.id)}
                            />
                          )}
                        </For>
                      </InsetGroup>
                    </Show>
                    <Show when={props.onEffortChange}>
                      <InsetGroup title="Effort">
                        <For each={EFFORTS}>
                          {(e, i) => (
                            <InsetRow
                              label={e.label}
                              detail={e.description}
                              leading={<Bars level={i()} />}
                              checked={i() === effortIndex()}
                              onClick={() => props.onEffortChange?.(e.id)}
                            />
                          )}
                        </For>
                      </InsetGroup>
                    </Show>
                  </InsetList>
                </Sheet>
              </Show>
              <Show when={!phone() && props.models?.length}>
                <DropdownMenu
                  label="Model"
                  radio
                  placement="top-start"
                  items={(props.models ?? []).map((m) => ({
                    id: m.id,
                    label: m.label,
                    description: m.description,
                    checked: m.id === (props.model ?? props.models?.[0]?.id),
                  }))}
                  onSelect={(id) => props.onModelChange?.(id)}
                  trigger={(tp) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconEnd="chevron-down"
                      aria-label={`Model: ${optionLabel(props.models, props.model)}`}
                      {...tp}
                    >
                      {optionLabel(props.models, props.model)}
                    </Button>
                  )}
                />
              </Show>
              <Show when={!phone() && props.modes?.length}>
                <DropdownMenu
                  label="Mode"
                  radio
                  placement="top-start"
                  items={(props.modes ?? []).map((m) => ({
                    id: m.id,
                    label: m.label,
                    description: m.description,
                    checked: m.id === (props.mode ?? props.modes?.[0]?.id),
                  }))}
                  onSelect={(id) => props.onModeChange?.(id)}
                  trigger={(tp) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconEnd="chevron-down"
                      aria-label={`Mode: ${optionLabel(props.modes, props.mode)}`}
                      {...tp}
                    >
                      {optionLabel(props.modes, props.mode)}
                    </Button>
                  )}
                />
              </Show>
              <Show when={!phone() && props.onEffortChange}>
                <DropdownMenu
                  label="Effort"
                  radio
                  placement="top-start"
                  items={EFFORTS.map((e, i) => ({
                    id: e.id,
                    label: e.label,
                    description: e.description,
                    checked: i === effortIndex(),
                    leading: <Bars level={i} />,
                  }))}
                  onSelect={(id) => props.onEffortChange?.(id as EffortLevel)}
                  trigger={(tp) => (
                    <button
                      type="button"
                      class="nc-effort"
                      aria-label={`Effort: ${EFFORTS[effortIndex()]?.label}`}
                      {...tp}
                    >
                      <Bars level={effortIndex()} />
                      {EFFORTS[effortIndex()]?.label}
                    </button>
                  )}
                />
              </Show>
              <span class="nc-composer__spacer" />
            </Show>
            <Show when={dictation()}>
              <Show
                when={dictState() === "recording"}
                fallback={
                  <IconButton
                    round
                    label={dictState() === "transcribing" ? "Transcribing" : "Start dictation"}
                    shortcut={props.dictation === undefined ? DICTATION_KEY.label : undefined}
                    icon="mic"
                    disabled={dictState() === "transcribing" || dictState() === "blocked"}
                    onClick={() => dictation()?.onStart?.()}
                  />
                }
              >
                <IconButton
                  round
                  label="Cancel dictation"
                  icon="close"
                  onClick={() => dictation()?.onCancel?.()}
                />
                <button
                  type="button"
                  class="nc-send nc-send--accent"
                  aria-label="Finish dictation"
                  onClick={() => dictation()?.onFinish?.()}
                >
                  <Icon name="check" />
                </button>
              </Show>
            </Show>
            <Show when={dictState() !== "recording"}>
              {/* While the assistant works and nothing is typed, the one round button stops it; with text it sends. */}
              <Show
                when={props.working && !canSend()}
                fallback={
                  <button
                    type="button"
                    class="nc-send"
                    aria-label="Send"
                    disabled={!canSend()}
                    onClick={submit}
                  >
                    <Icon name="send" />
                  </button>
                }
              >
                <button
                  type="button"
                  class="nc-send nc-send--stop"
                  aria-label="Stop"
                  title="Stop (Esc)"
                  data-part="composer-stop"
                  onClick={() => props.onStop?.()}
                >
                  <StopGlyph />
                </button>
              </Show>
            </Show>
          </div>
        </div>
      </Show>

      <Popover
        open={Boolean(trigger())}
        anchor={root()}
        placement="top-start"
        matchWidth
        class="nc-composer-popover"
        onClose={() => setDismissed(trigger()?.start ?? null)}
      >
        <div
          id={`${uid}-menu`}
          role="listbox"
          aria-label={trigger()?.char === "/" ? "Commands" : trigger()?.char === "$" ? "Skills" : "Mentions"}
          class="nc-menu nc-composer-menu"
          data-trigger={trigger()?.char}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Show when={tabs().length > 0}>
            <div class="nc-menu__tabs" role="presentation">
              <For each={tabs()}>
                {(t) => (
                  <button
                    type="button"
                    tabindex="-1"
                    class="nc-menu__tab section"
                    aria-pressed={aria(tab() === t)}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                )}
              </For>
            </div>
          </Show>
          <Show
            when={results().length > 0}
            fallback={<div class="nc-menu__empty nc-meta">No matches for “{trigger()?.query}”</div>}
          >
            <For each={results()}>
              {(r, i) => (
                <div
                  id={`${uid}-opt-${i()}`}
                  role="option"
                  aria-selected={aria(active() === i())}
                  data-active={active() === i() ? "" : undefined}
                  class="nc-menu__item nc-menu__item--rich"
                  onPointerMove={() => setActive(i())}
                  onClick={() => pick(r.item)}
                >
                  <span
                    class="nc-trigger-mark section"
                    data-trigger={trigger()?.char}
                    data-kind={r.item.kind}
                  >
                    <Show
                      when={r.item.kind === "person"}
                      fallback={r.item.icon ? <Icon name={r.item.icon} size="sm" /> : null}
                    >
                      {r.item.label
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Show>
                  </span>
                  <span class="nc-menu__text nc-menu__text--stack">
                    <span class={cx("nc-menu__name", trigger()?.char !== "@" && "nc-mono")}>
                      {trigger()?.char !== "@" ? trigger()?.char : ""}
                      <Show when={r.range} fallback={r.item.label}>
                        {(range) => (
                          <>
                            {r.item.label.slice(0, range()[0])}
                            <mark class="nc-match">{r.item.label.slice(range()[0], range()[1])}</mark>
                            {r.item.label.slice(range()[1])}
                          </>
                        )}
                      </Show>
                    </span>
                    <Show when={r.item.description}>
                      <span class="nc-menu__desc nc-meta">{r.item.description}</span>
                    </Show>
                  </span>
                  <Show when={r.item.meta}>
                    <span class="nc-menu__key">{r.item.meta}</span>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Popover>
    </div>
  )
}
