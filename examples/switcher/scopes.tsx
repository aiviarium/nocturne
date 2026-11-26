import { Switcher, type SwitcherSection } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { ISSUES } from "../_kit/issues"
import { PROJECTS } from "../_kit/projects"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Switch a scope or a record",
  note: "Every path segment and record crumb opens the same switcher: the field is focused, typing narrows the list, ↑/↓ and Enter pick, Esc clears the field and then closes. The current entry is checked.",
}

const HUES = ["sky", "orchid", "mint"] as const

export default function SwitcherScopes() {
  const [project, setProject] = createSignal("atlas")
  const [issue, setIssue] = createSignal("WEB-142")
  const projects = (): SwitcherSection[] => [
    {
      title: "Projects",
      entries: PROJECTS.map((p, i) => ({
        id: p.id,
        label: p.name,
        hint: p.key,
        mark: { name: p.name, hue: HUES[i % HUES.length] },
        current: p.id === project(),
      })),
    },
  ]
  const issues = (): SwitcherSection[] => [
    {
      title: "Active issues",
      entries: ISSUES.map((i) => ({
        id: i.key,
        label: i.key,
        hint: i.title,
        icon: "circle-dot",
        current: i.key === issue(),
      })),
    },
  ]
  return (
    <div class="ex-row ex-gap-lg">
      <Switcher
        label={PROJECTS.find((p) => p.id === project())?.name}
        noun="project"
        sections={projects()}
        onPick={(e) => setProject(e.id)}
      />
      <Switcher label={issue()} noun="issue" wide sections={issues()} onPick={(e) => setIssue(e.id)} />
    </div>
  )
}
