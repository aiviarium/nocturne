// How wide a block of a document is: `reading` (the text column), `wide` (the editor's full width less its
// margins, the text column staying centred) or `full` (edge to edge). A block type declares its policy: the
// default, the widths a person may choose from, or a width it forces. Block types the app adds declare theirs
// in `EditorBlockType.width`; core nodes declare theirs here. The chosen
// width is the node's `blockWidth` attribute, so it syncs like any edit. Only top-level blocks of a `page`
// editor break out of the text column; everywhere else every block fits its container.
import type { Node as PMNode } from "prosemirror-model"
import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"

export type BlockWidth = "reading" | "wide" | "full"

export const BLOCK_WIDTHS: readonly BlockWidth[] = ["reading", "wide", "full"]

/** The block menu's name for each width. */
export const BLOCK_WIDTH_LABEL: Record<BlockWidth, string> = {
  reading: "Reading width",
  wide: "Wide",
  full: "Full width",
}

/**
 * A block type's width policy. `force` fixes the width (the person gets no choice) and excludes the other two.
 * Otherwise `allowed` lists the widths the block menu offers and `default` is a new block's width (the first
 * allowed one when absent). With neither, a block is `reading` only; with only `default`, it is that width only.
 */
export interface BlockWidthPolicy {
  default?: BlockWidth
  allowed?: BlockWidth[]
  force?: BlockWidth
}

/** Core nodes' policies. Other nodes are `reading` only. */
export const CORE_BLOCK_WIDTHS: Record<string, BlockWidthPolicy> = {
  image: { default: "reading", allowed: ["reading", "wide", "full"] },
  table: { default: "reading", allowed: ["reading", "wide", "full"] },
  code_block: { default: "reading", allowed: ["reading", "wide"] },
}

export const isBlockWidth = (v: unknown): v is BlockWidth =>
  typeof v === "string" && (BLOCK_WIDTHS as readonly string[]).includes(v)

/** The widths a block of this policy can have. */
export function allowedWidths(policy: BlockWidthPolicy | undefined): BlockWidth[] {
  if (!policy) return ["reading"]
  if (policy.force) return [policy.force]
  const allowed = (policy.allowed ?? []).filter(isBlockWidth)
  if (allowed.length) return BLOCK_WIDTHS.filter((w) => allowed.includes(w))
  return [policy.default ?? "reading"]
}

/** A new block's width. */
export function defaultWidth(policy: BlockWidthPolicy | undefined): BlockWidth {
  if (policy?.force) return policy.force
  const allowed = allowedWidths(policy)
  return policy?.default && allowed.includes(policy.default) ? policy.default : allowed[0]!
}

/**
 * The width a block shows at: a width forced at run time (from its attributes, as an app's block type can), else
 * the policy's forced width, else the stored one when the policy allows it, else the default.
 */
export function resolveWidth(
  policy: BlockWidthPolicy | undefined,
  stored: unknown,
  forced?: BlockWidth | null,
): BlockWidth {
  if (forced && isBlockWidth(forced)) return forced
  if (policy?.force) return policy.force
  return isBlockWidth(stored) && allowedWidths(policy).includes(stored) ? stored : defaultWidth(policy)
}

/** The widths the block menu offers: none when the width is forced or there is only one. */
export function widthChoices(policy: BlockWidthPolicy | undefined, forced?: BlockWidth | null): BlockWidth[] {
  if (forced || policy?.force) return []
  const allowed = allowedWidths(policy)
  return allowed.length > 1 ? allowed : []
}

/** Problems with a policy as a block type declares it, for an app that validates the ones it is given. */
export function checkWidthPolicy(policy: BlockWidthPolicy): string[] {
  const p: string[] = []
  if (policy.force && (policy.default || policy.allowed))
    p.push("force fixes the width; it cannot be given with default or allowed")
  if (policy.allowed && !policy.allowed.length) p.push("allowed lists no width")
  if (policy.allowed && new Set(policy.allowed).size !== policy.allowed.length)
    p.push("allowed lists a width twice")
  if (policy.default && policy.allowed && !policy.allowed.includes(policy.default))
    p.push(`the default ${policy.default} is not one of the allowed widths`)
  return p
}

export const blockWidthKey = new PluginKey("nc-editor-block-width")

/**
 * Puts `data-block-width` on the top-level blocks wider than the text column. `widthOf` resolves a node's width
 * (from its type's policy and its attributes); dispatch a transaction with `blockWidthKey` meta to recompute
 * when the policies change (a block type registered late).
 */
export function blockWidths(widthOf: (node: PMNode) => BlockWidth): Plugin {
  const build = (doc: PMNode) => {
    const out: Decoration[] = []
    doc.forEach((node, pos) => {
      const w = widthOf(node)
      if (w !== "reading") out.push(Decoration.node(pos, pos + node.nodeSize, { "data-block-width": w }))
    })
    return DecorationSet.create(doc, out)
  }
  return new Plugin({
    key: blockWidthKey,
    state: {
      init: (_, state) => build(state.doc),
      apply: (tr, set, _old, state) => (tr.docChanged || tr.getMeta(blockWidthKey) ? build(state.doc) : set),
    },
    props: { decorations: (state) => blockWidthKey.getState(state) },
  })
}
