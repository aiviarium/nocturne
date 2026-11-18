// What the kinds need from the app that shows them and cannot know: how an entity reference is drawn and how the
// entities a reference may point at are found. The app sets it once at start; without it a reference shows its id
// and cannot be searched.
import type { JSX } from "solid-js"

export interface RefHit {
  uri: string
  title: string
}

/** A stored file: what a `blob` field shows of it. */
export interface BlobMeta {
  id: string
  name?: string | undefined
  size?: number | undefined
  contentType?: string | undefined
  /** Where it is served. */
  url: string
}

export interface FieldRuntime {
  /** Puts a file in the blob store and returns it; the field then holds its id. */
  uploadBlob?: (file: File) => Promise<BlobMeta>
  /** What is known of a stored file (name, size), or null when the caller may not see it. */
  blobInfo?: (id: string) => Promise<BlobMeta | null>
  /** An entity as a chip (icon, title, opens on click). */
  refChip?: (props: { uri: string }) => JSX.Element
  /** The entities of `scheme` whose title matches `text`. */
  searchRefs?: (query: { text: string; scheme?: string | undefined }) => Promise<RefHit[]>
}

let runtime: FieldRuntime = {}

export function configureFields(next: FieldRuntime): void {
  runtime = next
}

export const fieldRuntime = (): FieldRuntime => runtime
