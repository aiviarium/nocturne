import { Card, EditorServicesProvider, RichTextEditor } from "@aiviarium/nocturne"
import { For, onCleanup } from "solid-js"
import * as awarenessProtocol from "y-protocols/awareness"
import * as Y from "yjs"
import { SERVICES } from "../_kit/richtext"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Two people in one document",
  note: "Each editor has its own Yjs document; updates and awareness pass between them, as through a sync server.",
  surface: "well",
  frame: "The editor reads window.getSelection(), which does not see into a shadow root.",
  height: 300,
}

/** Two editors on two Yjs documents kept in sync in memory, as two people in one document. */
export default function CollabPair() {
  const docs = [new Y.Doc(), new Y.Doc()]
  const aw = docs.map((d) => new awarenessProtocol.Awareness(d))
  docs.forEach((d, i) => {
    d.on("update", (u: Uint8Array, origin: unknown) => {
      if (origin !== "peer") Y.applyUpdate(docs[1 - i]!, u, "peer")
    })
    aw[i]!.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin === "peer") return
        const u = awarenessProtocol.encodeAwarenessUpdate(aw[i]!, [...added, ...updated, ...removed])
        awarenessProtocol.applyAwarenessUpdate(aw[1 - i]!, u, "peer")
      },
    )
  })
  onCleanup(() => {
    for (const a of aw) a.destroy()
    for (const d of docs) d.destroy()
  })
  const people = [
    { name: "Sarah Chen", color: "var(--label-sky)" },
    { name: "John Carter", color: "var(--label-amber)" },
  ]
  return (
    <EditorServicesProvider value={SERVICES}>
      <div class="ex-grid ex-grid--2">
        <For each={[0, 1]}>
          {(i) => (
            <Card>
              <span class="nc-meta">{people[i]!.name}</span>
              <RichTextEditor
                provider={{ doc: docs[i]!, awareness: aw[i]! }}
                user={people[i]}
                placeholder="Start writing together…"
                aria-label={`Editor of ${people[i]!.name}`}
              />
            </Card>
          )}
        </For>
      </div>
    </EditorServicesProvider>
  )
}
