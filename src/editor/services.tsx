// What the editor needs from outside and does not do itself, because @aiviarium/nocturne has no network code: finding
// entities for `@` mentions and drawing their chips and previews, uploading files, the model call behind "Ask
// AI", dictation, and the block types plugins contribute. The shell supplies them with <EditorServicesProvider>
// (or a component passes `services`); every one is optional and the editor hides what is missing.

import type { JSX } from "@solidjs/web"
import { type Component, createContext, useContext } from "solid-js"
import type * as Y from "yjs"
import type { BlockWidth, BlockWidthPolicy } from "./width"

/** An entity offered by the `@` picker. */
export interface MentionItem {
  uri: string
  title: string
  subtitle?: string
  /** A core icon name. */
  icon?: string
}

/** A file stored by `upload`. */
export interface UploadedFile {
  /** Where it is served, such as `/blobs/<id>`. */
  src: string
  name: string
  size?: number
  mime?: string
  /** The entity URI that keeps it (`blob://<id>`); the document references it. */
  blob?: string
}

/** One request to the writing assistant (`EditorServices.ai`). Nothing in the document changes until the user accepts the answer. */
export interface AiRequest {
  /** A quick action, or `custom` for the instruction the user typed. */
  action: "improve" | "shorten" | "longer" | "continue" | "fix" | "summarize" | "translate" | "custom"
  /** What to do, in words (for quick actions, the editor's own wording). */
  instruction: string
  /** The selected text; empty when asking at the cursor. */
  selection: string
  /** The document's text before the selection or cursor (at most a few thousand characters), as context. */
  before: string
  /** The document's text after it. */
  after: string
  /** Aborted when the user discards or closes the suggestion. */
  signal: AbortSignal
}

/** Answers a writing assistant request with text deltas. */
export type AiHandler = (req: AiRequest) => AsyncIterable<string>

/** Dictation: yields text as it is recognised, until the signal aborts (the user stops) or it ends. */
export type DictationHandler = (opts: { signal: AbortSignal }) => AsyncIterable<string>

/** A heading of the document a block sits in (`BlockViewProps.outline`). */
export interface OutlineHeading {
  level: number
  text: string
  /** Its position in the document, for `scrollTo`. */
  pos: number
}

/** What a block type's component gets. */
export interface BlockViewProps<A extends Record<string, unknown> = Record<string, unknown>> {
  readonly attrs: A
  setAttrs(patch: Partial<A>): void
  readonly readOnly: boolean
  readonly selected: boolean
  /** The headings of the document the block is in (reactive: follows every change). */
  outline(): OutlineHeading[]
  /** Scrolls the editor to a position of the document and puts the cursor there. */
  scrollTo(pos: number): void
}

/** Page links for `[[`: find a page by title, or make one. */
export interface LinkService {
  /** Pages (or any entities) whose title matches; shown under `[[`. */
  search: (query: string) => Promise<MentionItem[]>
  /** Makes a page with this title; offered when nothing matches exactly. */
  create?: (title: string) => Promise<MentionItem>
}

/**
 * A block type the app adds to the editor (stored as a `plugin_block` node with this `id` as its `type`), such as
 * an embedded board or a chart. The app's extension system, if it has one, decides where they come from.
 */
export interface EditorBlockType {
  /** A unique id, such as `<source>.<name>`. */
  id: string
  title: string
  description?: string
  /** A core icon name, or a short glyph shown in the `/` menu. */
  icon?: string
  keywords?: string[]
  /** The attributes of a new block. */
  defaults?: Record<string, unknown>
  /** What provides it (an extension's name), for the app's own use. */
  plugin?: string
  /** Renders the block. Absent while what provides it has not registered it yet. */
  component?: (props: BlockViewProps<any>) => JSX.Element
  /** False when what provides it is turned off: documents show a placeholder and keep the data. */
  available: boolean
  /** How wide the block may be. Without it, the text column's width only. */
  width?: BlockWidthPolicy
  /** A width the block forces from its attributes (a board view is always `wide`), overriding the policy. */
  forceWidth?: (attrs: Record<string, unknown>) => BlockWidth | null | undefined
}

/** The writing assistant's wording, for apps that name it their own way. Every field is optional. */
export interface AiCopy {
  /** Its name: the format bar's button, the `/` menu item and the prompt's label. Default "Assist". */
  label?: string
  /** The `/` menu item's description. Default "Write or edit the text". */
  description?: string
  /** The `/` menu group of the assistant and dictation. Default "Assist". */
  group?: string
  /** The prompt's placeholder when text is selected. Default "Say how to change the selection…". */
  editPlaceholder?: string
  /** The prompt's placeholder at the cursor. Default "Say what to write…". */
  writePlaceholder?: string
}

/** The wording the editor uses when `EditorServices.aiCopy` leaves a field out. */
export const AI_COPY_DEFAULTS: Required<AiCopy> = {
  label: "Assist",
  description: "Write or edit the text",
  group: "Assist",
  editPlaceholder: "Say how to change the selection…",
  writePlaceholder: "Say what to write…",
}

export interface EditorServices {
  /** Entities for the `@` picker. */
  searchMentions?: (query: string) => Promise<MentionItem[]>
  /** Draws a mention (the app's entity chip). Default: the label in a chip. */
  MentionChip?: Component<{ uri: string; label: string }>
  /** The card shown when hovering a mention. */
  MentionPreview?: Component<{ uri: string; label: string }>
  /** Opens a mention's entity (on click, or Enter on a selected mention). */
  openMention?: (uri: string) => void
  /** Stores a pasted, dropped or picked file. Without it images and files cannot be added. */
  upload?: (file: File) => Promise<UploadedFile>
  /** The model call behind the writing assistant. Without it the entry is hidden. */
  ai?: AiHandler
  /** The writing assistant's wording (`AI_COPY_DEFAULTS` for what is left out). */
  aiCopy?: AiCopy
  /** Text from the microphone at the cursor. Without it the entry is hidden. */
  dictate?: DictationHandler
  /** Block types the app adds (a function, so the list can change while the editor is open). */
  blocks?: () => EditorBlockType[]
  /** `[[` links to pages, with "create" for a title nothing matches. Without it `[[` is plain text. */
  links?: LinkService
}

const Ctx = createContext<EditorServices>({})

/** Supplies editor services to every RichTextEditor below it. */
export function EditorServicesProvider(props: { value: EditorServices; children: JSX.Element }): JSX.Element {
  return <Ctx value={props.value}>{props.children}</Ctx>
}

export function useEditorServices(): EditorServices {
  return useContext(Ctx)
}

/** A presence in a collaborative document, as other people's cursors show it. */
export interface CollabUser {
  name: string
  /** A CSS colour (a token reference such as `var(--label-sky)` works). */
  color: string
}

/**
 * What binds the editor to a collaborative document: a Yjs document whose XML fragment `prosemirror` holds the
 * content, and the y-protocols awareness that carries cursors and names. A sync backend (a y-websocket provider,
 * for example) gives you both.
 */
export interface CollabProvider {
  readonly doc: Y.Doc
  readonly awareness: import("y-protocols/awareness").Awareness
  /** The fragment's name; `prosemirror` by default. */
  readonly fragment?: string
  /** The caller may only view (the editor turns read-only). */
  readOnly?(): boolean
}
