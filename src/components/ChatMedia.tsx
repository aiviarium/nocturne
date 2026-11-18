import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  type JSX,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
  splitProps,
} from "solid-js"
import { formatBytes } from "../fields/format"
import { cx } from "../lib/cx"
import { usePhone } from "../lib/phone"
import { Dialog } from "./Dialog"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"

/** One piece of media in a message: an image, audio, a video or a file. Sources are URLs or object URLs. */
export interface ChatMediaItem {
  kind: "image" | "audio" | "video" | "file"
  /** The URL or object URL. Not needed while `pending`. */
  src?: string
  /** Alt text of an image or video; also the caption in the viewer. */
  alt?: string
  /** File name, shown on a file card and in the viewer. */
  name?: string
  /** Size in bytes, shown on a file card. */
  size?: number
  /** MIME type, such as `application/pdf`. A file card shows it as a short label. */
  type?: string
  /** Natural width of an image or video, in px. With `height` it sets the aspect ratio before the media loads. */
  width?: number
  /** Natural height, in px. */
  height?: number
  /** Length of audio or video, in seconds, shown before the metadata loads. */
  duration?: number
  /** Video only: the frame shown before it plays. */
  poster?: string
  /** Still arriving: a placeholder at the final aspect ratio, so the message doesn't jump when it lands. */
  pending?: boolean
  /** Audio only: bar heights from 0 to 1 for the waveform. Default bars made from the source. */
  waveform?: number[]
}

export interface ChatMediaProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  items: ChatMediaItem[]
  /**
   * The action of a file card. Without it a file with a `src` gets a download link, and one without a `src` has
   * no action.
   */
  onOpen?: (item: ChatMediaItem, index: number) => void
}

/** How many images a grid shows; the last one shown carries "+N" for the rest. */
const GRID_MAX = 4

/** `0:07`, `3:25`, `1:02:09`. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

/** A short label for a MIME type or a file name: `PDF`, `CSV`, `ZIP`. */
export function fileTypeLabel(item: Pick<ChatMediaItem, "type" | "name">): string | undefined {
  const ext = item.name?.includes(".") ? item.name.split(".").pop() : undefined
  if (ext) return ext.toUpperCase()
  if (!item.type) return undefined
  const sub = item.type.split("/").pop() ?? item.type
  return sub
    .replace(/^(x-|vnd\.)/, "")
    .split(/[.+]/)[0]
    ?.toUpperCase()
}

const ARCHIVES = /zip|tar|gzip|rar|7z|compressed/
function fileIcon(item: ChatMediaItem): IconName {
  const t = `${item.type ?? ""} ${item.name ?? ""}`.toLowerCase()
  if (ARCHIVES.test(t)) return "archive"
  if (/csv|sheet|excel/.test(t)) return "chart"
  return "file"
}

const ratioOf = (item: ChatMediaItem) =>
  item.width && item.height ? `${item.width} / ${item.height}` : undefined

/** A run of images next to each other, or one other item. `view` is an image's place in the viewer. */
type Shown = { item: ChatMediaItem; index: number; view: number }
type Run = { kind: "images"; items: Shown[] } | { kind: "one"; item: ChatMediaItem; index: number }

/**
 * Media in a chat message: images laid out by count (one large, two side by side, three or more as a grid of at
 * most four with "+N"), audio with a play button and a waveform, video with its controls, and files as cards.
 * Put it in a `ChatMessage`'s children. A click on an image opens `MediaViewer`. The part does no fetching.
 */
export function ChatMedia(props: ChatMediaProps): JSX.Element {
  const [local, rest] = splitProps(props, ["items", "onOpen", "class"])
  // One read of `items` makes both the runs and the viewer's list, so they agree even when the prop is a new array
  // on every read.
  const model = createMemo(() => {
    const runs: Run[] = []
    const viewable: ChatMediaItem[] = []
    local.items.forEach((item, index) => {
      const last = runs[runs.length - 1]
      if (item.kind !== "image") {
        runs.push({ kind: "one", item, index })
        return
      }
      const view = !item.pending && item.src ? viewable.push(item) - 1 : -1
      if (last?.kind === "images") last.items.push({ item, index, view })
      else runs.push({ kind: "images", items: [{ item, index, view }] })
    })
    return { runs, viewable }
  })
  const [viewing, setViewing] = createSignal<number | null>(null)
  return (
    <div data-part="chat-media" class={cx("nc-media", local.class)} {...rest}>
      <Index each={model().runs}>
        {(run) => (
          <Switch>
            <Match when={run().kind === "images"}>
              <ImageGrid
                items={(run() as Extract<Run, { kind: "images" }>).items}
                onOpen={(view) => view >= 0 && setViewing(view)}
              />
            </Match>
            <Match when={run().kind === "one" && (run() as Extract<Run, { kind: "one" }>)}>
              {(one) => (
                <Switch>
                  <Match when={one().item.kind === "audio"}>
                    <MediaAudio item={one().item} />
                  </Match>
                  <Match when={one().item.kind === "video"}>
                    <MediaVideo item={one().item} />
                  </Match>
                  <Match when={one().item.kind === "file"}>
                    <MediaFile
                      item={one().item}
                      onOpen={local.onOpen ? () => local.onOpen?.(one().item, one().index) : undefined}
                    />
                  </Match>
                </Switch>
              )}
            </Match>
          </Switch>
        )}
      </Index>
      <MediaViewer
        open={viewing() !== null}
        items={model().viewable}
        index={viewing() ?? 0}
        onIndexChange={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}

function ImageGrid(props: { items: Shown[]; onOpen: (view: number) => void }): JSX.Element {
  const count = () => props.items.length
  const shown = () => props.items.slice(0, GRID_MAX)
  const more = () => count() - GRID_MAX
  const layout = () => (count() === 1 ? "single" : count() === 2 ? "pair" : count() === 3 ? "three" : "grid")
  return (
    <div
      class="nc-media__images"
      data-layout={layout()}
      data-count={count()}
      role="group"
      aria-label={count() === 1 ? "Image" : `${count()} images`}
    >
      <Index each={shown()}>
        {(entry, i) => (
          <MediaImage
            item={entry().item}
            single={count() === 1}
            more={i === GRID_MAX - 1 && more() > 0 ? more() : 0}
            onOpen={() => props.onOpen(entry().view)}
          />
        )}
      </Index>
    </div>
  )
}

function MediaImage(props: {
  item: ChatMediaItem
  single: boolean
  more: number
  onOpen: () => void
}): JSX.Element {
  const [state, setState] = createSignal<"loading" | "loaded" | "failed">("loading")
  // A new source (a pending image that lands, a streamed update) loads afresh.
  createEffect(
    on(
      () => props.item.src,
      () => setState("loading"),
      { defer: true },
    ),
  )
  const style = () => (props.single ? { "aspect-ratio": ratioOf(props.item) } : undefined)
  const label = () => props.item.alt || props.item.name || "Image"
  return (
    <Show
      when={!props.item.pending && props.item.src}
      fallback={
        <div
          class="nc-media__tile nc-media__tile--pending"
          data-state="pending"
          role="img"
          aria-label={`${label()}, still arriving`}
          aria-busy="true"
          style={style()}
        />
      }
    >
      <button
        type="button"
        class="nc-media__tile"
        data-state={state()}
        aria-label={props.more > 0 ? `${label()}, and ${props.more} more` : `Open ${label()}`}
        style={style()}
        onClick={() => props.onOpen()}
      >
        <Show
          when={state() !== "failed"}
          fallback={
            <span class="nc-media__failed">
              <Icon name="eye-off" size="sm" />
              <span>
                {props.item.alt ? `${props.item.alt} could not be loaded` : "The image could not be loaded"}
              </span>
            </span>
          }
        >
          <img
            ref={(img) =>
              queueMicrotask(() => {
                if (img.complete && img.naturalWidth > 0) setState("loaded")
              })
            }
            class="nc-media__img"
            src={props.item.src}
            alt={props.item.alt ?? ""}
            width={props.item.width}
            height={props.item.height}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setState("loaded")}
            onError={() => setState("failed")}
          />
        </Show>
        <Show when={props.more > 0}>
          <span class="nc-media__more heading" aria-hidden="true">
            +{props.more}
          </span>
        </Show>
      </button>
    </Show>
  )
}

/** Bars for a waveform from a string, so the same clip always draws the same shape. */
function barsFrom(seed: string, count = 40): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ i
    const r = ((h >>> 0) % 1000) / 1000
    const envelope = Math.sin((Math.PI * (i + 0.5)) / count)
    out.push(0.2 + 0.8 * r * (0.4 + 0.6 * envelope))
  }
  return out
}

function MediaAudio(props: { item: ChatMediaItem }): JSX.Element {
  let audio!: HTMLAudioElement
  const [playing, setPlaying] = createSignal(false)
  const [time, setTime] = createSignal(0)
  const [length, setLength] = createSignal<number | undefined>(undefined)
  const total = () => length() ?? props.item.duration ?? 0
  const bars = () => props.item.waveform ?? barsFrom(props.item.src ?? props.item.name ?? "audio")
  const name = () => props.item.name || props.item.alt || "Audio"
  const toggle = () => {
    if (playing()) {
      audio.pause()
      setPlaying(false)
      return
    }
    setPlaying(true)
    try {
      Promise.resolve(audio.play()).catch(() => setPlaying(false))
    } catch {
      setPlaying(false)
    }
  }
  onCleanup(() => audio?.pause?.())
  return (
    <div class="nc-media__audio" data-kind="audio" data-playing={playing() ? "" : undefined}>
      <button
        type="button"
        class="nc-media__play"
        aria-label={playing() ? `Pause ${name()}` : `Play ${name()}`}
        aria-pressed={playing()}
        disabled={props.item.pending || !props.item.src}
        onClick={toggle}
      >
        <Icon name={playing() ? "pause" : "play"} size="sm" />
      </button>
      <div class="nc-wave nc-media__wave" aria-hidden="true">
        <For each={bars()}>
          {(v) => (
            <span
              class="nc-wave__bar"
              style={{ height: `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%` }}
            />
          )}
        </For>
      </div>
      <span class="nc-media__time mono">
        {formatClock(time())} / {formatClock(total())}
      </span>
      {/* biome-ignore lint/a11y/useMediaCaption: the element is hidden and driven by the button; a transcript is the app's */}
      <audio
        ref={audio}
        src={props.item.src}
        preload="metadata"
        onLoadedMetadata={() => {
          if (Number.isFinite(audio.duration)) setLength(audio.duration)
        }}
        onTimeUpdate={() => setTime(audio.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setTime(0)
        }}
      />
    </div>
  )
}

function MediaVideo(props: { item: ChatMediaItem }): JSX.Element {
  return (
    <Show
      when={!props.item.pending && props.item.src}
      fallback={
        <div
          class="nc-media__video nc-media__tile--pending"
          data-kind="video"
          data-state="pending"
          role="img"
          aria-label={`${props.item.alt || props.item.name || "Video"}, still arriving`}
          aria-busy="true"
          style={{ "aspect-ratio": ratioOf(props.item) ?? "16 / 9" }}
        />
      }
    >
      {/* biome-ignore lint/a11y/useMediaCaption: captions come with the source, which the app provides */}
      <video
        class="nc-media__video"
        data-kind="video"
        src={props.item.src}
        poster={props.item.poster}
        controls
        preload="metadata"
        aria-label={props.item.alt || props.item.name}
        style={{ "aspect-ratio": ratioOf(props.item) ?? "16 / 9" }}
      />
    </Show>
  )
}

function MediaFile(props: { item: ChatMediaItem; onOpen?: () => void }): JSX.Element {
  const name = () => props.item.name || "File"
  const meta = () =>
    [fileTypeLabel(props.item), props.item.size !== undefined ? formatBytes(props.item.size) : undefined]
      .filter(Boolean)
      .join(" · ")
  return (
    <div class="nc-media__file" data-kind="file" data-state={props.item.pending ? "pending" : undefined}>
      <span class="nc-media__file-icon" aria-hidden="true">
        <Icon name={fileIcon(props.item)} />
      </span>
      <span class="nc-media__file-text">
        <span class="nc-media__file-name label">{name()}</span>
        <Show when={meta()}>
          <span class="nc-meta">{meta()}</span>
        </Show>
      </span>
      <Show when={!props.item.pending}>
        <Show
          when={props.onOpen}
          fallback={
            <Show when={props.item.src}>
              <a
                class="nc-icon-btn"
                href={props.item.src}
                download={props.item.name ?? ""}
                aria-label={`Download ${name()}`}
              >
                <Icon name="download" />
              </a>
            </Show>
          }
        >
          <IconButton label={`Open ${name()}`} icon="arrow-up-right" onClick={() => props.onOpen?.()} />
        </Show>
      </Show>
    </div>
  )
}

export interface MediaViewerProps {
  /** Whether the viewer is shown. */
  open: boolean
  /** Called on Escape, the close button or a click outside the image. */
  onClose: () => void
  /** The images, in order. Items without a `src` are skipped by the arrows. */
  items: ChatMediaItem[]
  /** The image shown. */
  index: number
  /** Called with the next index when the arrows, the buttons or a swipe move to another image. */
  onIndexChange?: (index: number) => void
  /** Where to mount; defaults to `document.body`. */
  anchor?: HTMLElement
}

/** How far a finger has to travel sideways for a swipe to change the image, in px. */
const SWIPE_DISTANCE = 48

/**
 * The large view of images, in a dialog: a counter, the image with its alt text under it, and buttons and the
 * arrow keys to step between images. Escape closes it and focus goes back to what opened it. On a phone a
 * sideways swipe steps between images, and pinch zoom is the browser's own.
 */
export function MediaViewer(props: MediaViewerProps): JSX.Element {
  const phone = usePhone()
  const count = () => props.items.length
  const at = () => Math.min(Math.max(0, props.index), Math.max(0, count() - 1))
  const current = () => props.items[at()]
  const go = (delta: number) => {
    if (count() < 2) return
    const next = at() + delta
    if (next < 0 || next >= count()) return
    props.onIndexChange?.(next)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(-1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      go(1)
    }
  }
  let inner: HTMLDivElement | undefined
  let start: { x: number; y: number } | null = null
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    start = phone() && e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) start = null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    if (!start || !t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    start = null
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      bare
      label={current()?.alt || current()?.name || "Image"}
      size="lg"
      class="nc-media-viewer"
      anchor={props.anchor}
      initialFocus={() => inner}
    >
      <div
        ref={inner}
        data-part="media-viewer"
        class="nc-media-viewer__inner"
        tabindex="-1"
        onKeyDown={onKeyDown}
      >
        <header class="nc-media-viewer__bar">
          <span class="nc-meta" aria-live="polite">
            <Show when={count() > 1} fallback={current()?.name}>
              {at() + 1} of {count()}
            </Show>
          </span>
          <IconButton label="Close" icon="close" tooltip={false} onClick={() => props.onClose()} />
        </header>
        <div
          class="nc-media-viewer__stage"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Show when={count() > 1}>
            <IconButton
              class="nc-media-viewer__nav nc-media-viewer__nav--prev"
              label="Previous image"
              icon="chevron-left"
              round
              tooltip={false}
              aria-disabled={at() === 0}
              onClick={() => go(-1)}
            />
          </Show>
          <Show when={current()?.src} keyed>
            {(src) => (
              <img
                class="nc-media-viewer__img"
                src={src}
                alt={current()?.alt ?? ""}
                width={current()?.width}
                height={current()?.height}
                draggable={false}
              />
            )}
          </Show>
          <Show when={count() > 1}>
            <IconButton
              class="nc-media-viewer__nav nc-media-viewer__nav--next"
              label="Next image"
              icon="chevron-right"
              round
              tooltip={false}
              aria-disabled={at() === count() - 1}
              onClick={() => go(1)}
            />
          </Show>
        </div>
        <Show when={current()?.alt}>
          <p class="nc-media-viewer__caption">{current()?.alt}</p>
        </Show>
      </div>
    </Dialog>
  )
}
