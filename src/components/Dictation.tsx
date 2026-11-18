import {
  createContext,
  createEffect,
  createSignal,
  For,
  type JSX,
  on,
  onCleanup,
  type ParentProps,
  Show,
  useContext,
} from "solid-js"
import { cx } from "../lib/cx"
import { Button } from "./Button"
import { StatusDot } from "./StatusDot"

/**
 * Speech to text, supplied by the app through `TranscriberProvider`. `@aiviarium/nocturne` does no network or
 * microphone work itself: the app's transcriber records from the microphone and sends the audio to a
 * speech service; a test or the gallery can supply a fake one.
 */
export interface Transcriber {
  /** Whether dictation is offered now (the transcription task is set up). A Solid accessor. */
  available(): boolean
  /** Starts recording. Rejects with a `DictationBlockedError` when the microphone is not allowed. */
  start(options: TranscriberStartOptions): Promise<TranscriberSession>
  /** Tells the person how to allow the microphone again (browsers cannot open their own settings). */
  openSettings?(): void
}

export interface TranscriberStartOptions {
  /** The input level from 0 to 1, as often as the transcriber likes. */
  onLevel?: (level: number) => void
  /** The transcript so far, where the provider has live text. Each call replaces the last. */
  onPartial?: (text: string) => void
}

export interface TranscriberSession {
  /** Stops recording and resolves with the text. */
  finish(): Promise<string>
  /** Stops recording and drops the audio. */
  cancel(): void
}

/** What a transcriber throws when the microphone is blocked. */
export class DictationBlockedError extends Error {
  readonly blocked = true
  constructor(message = "Microphone access is blocked.") {
    super(message)
    this.name = "DictationBlockedError"
  }
}

const TranscriberContext = createContext<Transcriber | undefined>()

/** Makes dictation available to every text input below it. */
export function TranscriberProvider(
  props: ParentProps<{ transcriber: Transcriber | undefined }>,
): JSX.Element {
  return <TranscriberContext.Provider value={props.transcriber}>{props.children}</TranscriberContext.Provider>
}

export function useTranscriber(): Transcriber | undefined {
  return useContext(TranscriberContext)
}

export type DictationPhase = "idle" | "recording" | "transcribing" | "blocked"

export interface DictationState {
  /** `idle` shows the mic, `recording` the waveform and timer, `transcribing` a working line, `blocked` an error. */
  state: DictationPhase
  /** Seconds recorded so far. The component only displays it. */
  elapsed?: number
  /** The current input level from 0 to 1. Feed it as often as you like; the waveform keeps the last 120 samples. */
  level?: number
  /** The live transcript while recording, where the provider has one. */
  partial?: string
  /** Why the last dictation failed, shown until the next one starts. */
  error?: string
  /** Start recording (mic pressed). */
  onStart?: () => void
  /** Finish and transcribe (the accent check). The text should come back through `value`, never be sent automatically. */
  onFinish?: () => void
  /** Cancel and discard. */
  onCancel?: () => void
  /** Open the system setting when the microphone is blocked. */
  onOpenSettings?: () => void
}

/** The push-to-talk key: hold it to record, let go to transcribe; a short press starts and a second one finishes. */
export const DICTATION_KEY = { label: "Ctrl Shift Space", ctrl: true, shift: true, code: "Space" } as const

export function isDictationKey(e: KeyboardEvent): boolean {
  return (
    e.code === DICTATION_KEY.code &&
    e.ctrlKey === DICTATION_KEY.ctrl &&
    e.shiftKey === DICTATION_KEY.shift &&
    !e.altKey
  )
}

/** How long a press must be held to count as push-to-talk rather than a tap. */
const HOLD_MS = 400

export interface DictationOptions {
  /** Puts the transcript where the caret is. */
  insert: (text: string) => void
  /** Turns dictation off for this input. */
  enabled?: () => boolean
}

export interface Dictation {
  /** Whether to show the mic at all. */
  available(): boolean
  /** The state for `Composer`'s `dictation` prop and `DictationBar`. */
  state(): DictationState
  start(): Promise<void>
  finish(): Promise<void>
  cancel(): void
  /** Push-to-talk: call it from the input's keydown. Returns whether it handled the event. */
  onKeyDown(e: KeyboardEvent): boolean
}

/**
 * Dictation for one text input, with the transcriber from `TranscriberProvider`: the states, the timer and
 * level, live text, push-to-talk, and the transcript put at the caret when recording stops.
 */
export function useDictation(options: DictationOptions): Dictation {
  const transcriber = useTranscriber()
  const [phase, setPhase] = createSignal<DictationPhase>("idle")
  const [elapsed, setElapsed] = createSignal(0)
  const [level, setLevel] = createSignal(0)
  const [partial, setPartial] = createSignal("")
  const [error, setError] = createSignal<string>()
  let session: TranscriberSession | undefined
  let startedAt = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let keyDownAt = 0
  let keyStarted = false
  let starting: Promise<void> | undefined
  const stopTimer = () => {
    if (timer) clearInterval(timer)
    timer = undefined
  }

  const available = () => Boolean(transcriber?.available()) && (options.enabled?.() ?? true)

  const start = async () => {
    if (!transcriber || phase() === "recording" || phase() === "transcribing" || starting) return
    setError(undefined)
    setPartial("")
    setLevel(0)
    setElapsed(0)
    starting = (async () => {
      try {
        session = await transcriber.start({
          onLevel: (l) => setLevel(l),
          onPartial: (t) => setPartial(t),
        })
        startedAt = Date.now()
        setPhase("recording")
        stopTimer()
        timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250)
      } catch (e: any) {
        session = undefined
        if (e?.blocked || e?.name === "NotAllowedError" || e?.name === "SecurityError") setPhase("blocked")
        else {
          setPhase("idle")
          setError(String(e?.message ?? e))
        }
      } finally {
        starting = undefined
      }
    })()
    return starting
  }

  const finish = async () => {
    if (starting) await starting
    const s = session
    if (!s || phase() !== "recording") return
    session = undefined
    stopTimer()
    setPhase("transcribing")
    try {
      const text = (await s.finish()).trim()
      if (text) options.insert(text)
      setPhase("idle")
    } catch (e: any) {
      setPhase("idle")
      setError(String(e?.message ?? e))
    } finally {
      setPartial("")
    }
  }

  const cancel = () => {
    session?.cancel()
    session = undefined
    stopTimer()
    setPartial("")
    setPhase("idle")
  }

  onCleanup(() => {
    session?.cancel()
    stopTimer()
  })

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isDictationKey(e) || !available()) return false
    e.preventDefault()
    if (e.repeat) return true
    if (phase() === "recording") {
      void finish()
      return true
    }
    keyDownAt = Date.now()
    keyStarted = true
    // The input may lose focus while recording (the composer hides its text), so listen on the window.
    window.addEventListener("keyup", onKeyUp, true)
    void start()
    return true
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== DICTATION_KEY.code || !keyStarted) return
    keyStarted = false
    window.removeEventListener("keyup", onKeyUp, true)
    // Held: push-to-talk, letting go transcribes. A tap leaves it recording until the next press.
    if (Date.now() - keyDownAt >= HOLD_MS) void finish()
  }
  onCleanup(() => window.removeEventListener("keyup", onKeyUp, true))

  return {
    available,
    state: () => ({
      state: phase(),
      elapsed: elapsed(),
      level: level(),
      partial: partial(),
      error: error(),
      onStart: () => void start(),
      onFinish: () => void finish(),
      onCancel: cancel,
      onOpenSettings: () => {
        transcriber?.openSettings?.()
        setPhase("idle")
      },
    }),
    start,
    finish,
    cancel,
    onKeyDown,
  }
}

/** Joins dictated text to what is around the caret with single spaces. */
export function joinDictated(before: string, text: string, after: string): string {
  const lead = before && !/\s$/.test(before) ? " " : ""
  const trail = after && !/^[\s.,;:!?)]/.test(after) ? " " : ""
  return `${lead}${text}${trail}`
}

const WAVE_SAMPLES = 240

export const formatElapsed = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/**
 * The dictation strip as Nocturne draws it: recording (rose dot, timer, waveform, live text), transcribing,
 * microphone blocked with a way to fix it, and the last error.
 *
 * `part` draws one piece, for an input that places them apart: `status` (the dot, time and wave, or
 * "Transcribing"), `live` (the text heard so far, or "Listening…" before there is any) and `notice` (blocked or
 * the last error). Without it, all three in a column.
 */
export function DictationBar(props: {
  dictation: DictationState
  compact?: boolean
  part?: "status" | "live" | "notice"
  class?: string
}): JSX.Element {
  const shows = (part: "status" | "live" | "notice") => !props.part || props.part === part
  const levels = createSignal<number[]>(Array.from({ length: WAVE_SAMPLES }, () => 0.1))
  createEffect(
    on(
      () => props.dictation.level,
      (level) => {
        if (level === undefined) return
        levels[1]((list) => [...list.slice(1), Math.max(0.08, Math.min(1, level))])
      },
    ),
  )
  const samples = () => (props.compact ? levels[0]().slice(-24) : levels[0]())
  return (
    <>
      <Show when={props.dictation.state === "recording" && shows("status")}>
        <div
          class={cx("nc-dictation", props.class)}
          data-part="dictation"
          role="status"
          aria-label="Recording"
        >
          <span class="nc-dot nc-dot--rec" />
          <span class="nc-mono nc-num nc-dictation__time">{formatElapsed(props.dictation.elapsed ?? 0)}</span>
          <div class="nc-wave" aria-hidden="true">
            <For each={samples()}>
              {(v) => <span class="nc-wave__bar" style={{ height: `${Math.round(v * 100)}%` }} />}
            </For>
          </div>
        </div>
      </Show>
      <Show when={props.dictation.state === "recording" && shows("live")}>
        <Show
          when={props.dictation.partial}
          fallback={
            <Show when={props.part === "live"}>
              <p
                class={cx("nc-dictation__live nc-dictation__live--empty", props.class)}
                data-part="dictation-live"
              >
                Listening…
              </p>
            </Show>
          }
        >
          <p
            class={cx("nc-dictation__live", props.part ? props.class : "body")}
            data-part="dictation-live"
            aria-live="polite"
          >
            {props.dictation.partial}
          </p>
        </Show>
      </Show>
      <Show when={props.dictation.state === "transcribing" && shows("status")}>
        <div class={cx("nc-dictation", props.class)} data-part="dictation" role="status">
          <StatusDot status="ai" />
          <span class="nc-muted">Transcribing…</span>
        </div>
      </Show>
      <Show when={props.dictation.state === "blocked" && shows("notice")}>
        <div class={cx("nc-dictation nc-dictation--blocked", props.class)} data-part="dictation" role="alert">
          <span>Microphone access is blocked.</span>
          <Button variant="ghost" size="sm" onClick={() => props.dictation.onOpenSettings?.()}>
            Open settings
          </Button>
        </div>
      </Show>
      <Show when={props.dictation.state === "idle" && props.dictation.error && shows("notice")}>
        <div class={cx("nc-dictation nc-dictation--blocked", props.class)} data-part="dictation" role="alert">
          <span>Dictation failed: {props.dictation.error}</span>
        </div>
      </Show>
    </>
  )
}
