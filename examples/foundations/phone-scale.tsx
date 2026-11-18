import { PHONE_BOUNDS, PHONE_SCALE } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The phone scale",
  note: "PHONE_SCALE and PHONE_BOUNDS in lib/phone.ts; the same numbers are the --phone-* variables. Type is drawn at its size.",
}

const SIZES: Array<[string, number, string]> = [
  ["bar", PHONE_SCALE.bar, "Navigation bar (iOS 44)"],
  ["barCompact", PHONE_SCALE.barCompact, "Bar in landscape"],
  ["tabBar", PHONE_SCALE.tabBar, "Tab bar, without the home indicator (iOS 49)"],
  ["hit", PHONE_SCALE.hit, "Smallest hit area of anything tapped"],
  ["control", PHONE_SCALE.control, "Visible size of a bar button or compact control"],
  ["row", PHONE_SCALE.row, "One-line list row"],
  ["rowTwoLine", PHONE_SCALE.rowTwoLine, "Two-line list row"],
  ["gutter", PHONE_SCALE.gutter, "Side gutter of screens and inset lists"],
  ["groupGap", PHONE_SCALE.groupGap, "Gap between groups"],
]

export default function PhoneScale() {
  return (
    <div class="ex-grid ex-grid--2">
      <div class="ex-col">
        <span class="label">Sizes (px)</span>
        <For each={SIZES}>
          {([name, px, what]) => (
            <div class="ex-scale-row">
              <span class="nc-mono">{name}</span>
              <span class="ex-scale-bar" style={{ width: `${px * 2}px` }} />
              <span class="nc-num">{px}</span>
              <span class="nc-meta">{what}</span>
            </div>
          )}
        </For>
      </div>
      <div class="ex-col">
        <span class="label">Type (size / line height / weight)</span>
        <For each={Object.entries(PHONE_SCALE.type)}>
          {([name, [size, line, weight]]) => (
            <div class="ex-type-row">
              <span style={{ "font-size": `${size}px`, "line-height": `${line}px`, "font-weight": weight }}>
                {name === "largeTitle" ? "Inbox" : name === "barTitle" ? "Launch plan" : "Bo mentioned you"}
              </span>
              <span class="nc-mono nc-meta">
                {name} {size}/{line}/{weight}
              </span>
            </div>
          )}
        </For>
        <span class="label">Bounds</span>
        <pre class="nc-code ex-json">{JSON.stringify(PHONE_BOUNDS, null, 2)}</pre>
      </div>
    </div>
  )
}
