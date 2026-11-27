import type { JSX } from "@solidjs/web"
import { For } from "solid-js"
import { cx } from "../lib/cx"
import type { LabelHue } from "./Badge"

const HUES: LabelHue[] = ["sky", "teal", "mint", "amber", "ember", "rose", "orchid"]

/** A 32-bit FNV-1a hash of the seed: the same seed always draws the same image. */
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** The filled cells of a 5×5 grid, mirrored left to right, and the hue, from a seed. */
export function identiconCells(seed: string): { cells: [number, number][]; hue: LabelHue } {
  const h = hash(seed)
  const cells: [number, number][] = []
  // Fifteen bits fill the left three columns; the right two mirror the first two.
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if ((h >>> (y * 3 + x)) & 1) {
        cells.push([x, y])
        if (x < 2) cells.push([4 - x, y])
      }
  // A grid with nothing in it says nothing: fill the middle.
  if (!cells.length) cells.push([2, 2])
  return { cells, hue: HUES[(h >>> 15) % HUES.length]! }
}

export interface IdenticonProps {
  /** What the image is drawn from, such as a chat's id. */
  seed: string
  /** `sm` is 16px, for a sidebar entry or a list row; `md` is 24px. Default `sm`. */
  size?: "sm" | "md"
  /** Names the image. Without it the image is decorative, as beside a label that names the item. */
  label?: string
  class?: string
}

/**
 * A small image unique to an id, for items with no picture or type of their own, such as chats: the eye tells them
 * apart where every row would otherwise show the same icon.
 */
export function Identicon(props: IdenticonProps): JSX.Element {
  const drawn = () => identiconCells(props.seed)
  return (
    <svg
      data-part="identicon"
      class={cx("nc-identicon", props.size === "md" && "nc-identicon--md", props.class)}
      viewBox="-1 -1 7 7"
      role={props.label ? "img" : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : "true"}
      style={{ "--nc-identicon-hue": `var(--label-${drawn().hue})` }}
    >
      <For each={drawn().cells}>{(c) => <rect x={c[0]} y={c[1]} width="1" height="1" />}</For>
    </svg>
  )
}
