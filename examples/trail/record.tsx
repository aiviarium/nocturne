import { Trail } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUES } from "../_kit/issues"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "A record's trail",
  note: "Crumbs at the drill size. The ones that go up are quiet and clickable; the current one is brighter, by colour only. The record crumb is a switcher over the list it came from. Narrow the frame and the leading crumbs fold into one menu.",
  surface: "none",
}

export default function TrailRecord() {
  const [issue, setIssue] = createSignal<string | undefined>("WEB-142")
  const [width, setWidth] = createSignal(100)
  const crumbs = () => [
    {
      label: "Atlas web",
      mark: { name: "Atlas web", hue: "sky" as const },
      onClick: () => setIssue(undefined),
    },
    { label: "Build", onClick: () => setIssue(undefined) },
    { label: "Issues", onClick: () => setIssue(undefined) },
    ...(issue()
      ? [
          {
            label: issue()!,
            switcher: {
              noun: "issue",
              wide: true,
              sections: [
                {
                  title: "Active issues",
                  entries: ISSUES.map((i) => ({
                    id: i.key,
                    label: i.key,
                    hint: i.title,
                    icon: "circle-dot" as const,
                    current: i.key === issue(),
                  })),
                },
              ],
              onPick: (e: { id: string }) => setIssue(e.id),
            },
          },
        ]
      : []),
  ]
  return (
    <div class="ex-col">
      <div class="ex-view" style={{ width: `${width()}%` }}>
        <div class="ex-trail-head">
          <Trail label="View" crumbs={crumbs()} upShortcut="Esc" />
        </div>
        <div class="ex-view__body nc-muted">{issue() ? `The record ${issue()}` : "The Issues list"}</div>
      </div>
      <label class="ex-row nc-meta">
        Frame width
        <input
          type="range"
          min="30"
          max="100"
          value={width()}
          onInput={(e) => setWidth(Number(e.currentTarget.value))}
        />
      </label>
    </div>
  )
}
