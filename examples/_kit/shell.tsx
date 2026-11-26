// A small workspace for the title bar's examples: a project's lenses, its path and what its palette finds.
import type { Lens, PaletteQuery, PaletteSection, ScopeSegment, SwitcherSection } from "@aiviarium/nocturne"
import { ISSUES } from "./issues"
import { PROJECTS } from "./projects"

export const LENSES: Lens[] = [
  {
    id: "explore",
    label: "Explore",
    icon: "sparkle",
    hue: "orchid",
    purpose: "The map, notes and open questions",
  },
  { id: "product", label: "Product", icon: "book-open", hue: "amber", purpose: "Roadmap, specs and designs" },
  { id: "build", label: "Build", icon: "code", hue: "mint", purpose: "Issues, cycles and agents" },
  {
    id: "operate",
    label: "Operate",
    icon: "server",
    hue: "sky",
    purpose: "Hosts, deploys and logs",
    source: "Crow",
  },
]

const HUES = ["sky", "orchid", "mint"] as const

const PLACES: Record<string, Array<{ id: string; label: string; icon: Lens["icon"] }>> = {
  explore: [
    { id: "map", label: "Map", icon: "grid" },
    { id: "notes", label: "Notes", icon: "file" },
  ],
  product: [
    { id: "roadmap", label: "Roadmap", icon: "calendar" },
    { id: "specs", label: "Specs", icon: "book-open" },
  ],
  build: [
    { id: "issues", label: "Issues", icon: "list" },
    { id: "cycles", label: "Cycles", icon: "refresh-cw" },
    { id: "prs", label: "Pull requests", icon: "git-pull-request" },
    { id: "agents", label: "Agents", icon: "agent" },
  ],
  operate: [
    { id: "hosts", label: "Hosts", icon: "server" },
    { id: "logs", label: "Logs", icon: "logs" },
  ],
}

/** The project switcher the path's last segment opens. */
export const projectSwitcher = (current: string, pick: (id: string) => void) => ({
  noun: "project",
  sections: [
    {
      title: "Projects",
      entries: PROJECTS.map((p, i) => ({
        id: p.id,
        label: p.name,
        hint: p.key,
        mark: { name: p.name, hue: HUES[i % HUES.length] },
        current: p.id === current,
      })),
    },
  ] satisfies SwitcherSection[],
  onPick: (e: { id: string }) => pick(e.id),
})

/** Acme / Projects / the project, the project switching to its siblings. */
export function projectPath(
  project: string,
  pick: (id: string) => void,
  deeper: string[] = [],
): ScopeSegment[] {
  const p = PROJECTS.find((x) => x.id === project) ?? PROJECTS[0]!
  const hue = HUES[PROJECTS.indexOf(p) % HUES.length]
  return [
    {
      id: "acme",
      label: "Acme",
      switcher: {
        noun: "workspace",
        sections: [
          {
            title: "Workspaces",
            entries: [
              { id: "acme", label: "Acme", mark: { name: "Acme" }, current: true },
              { id: "personal", label: "Personal", mark: { name: "Personal" } },
            ],
          },
        ],
        onPick: () => {},
      },
    },
    { id: "projects", label: "Projects", onClick: () => {} },
    {
      id: p.id,
      label: p.name,
      mark: { name: p.name, hue },
      onClick: deeper.length ? () => {} : undefined,
      switcher: projectSwitcher(p.id, pick),
    },
    ...deeper.map((label) => ({ id: label, label, onClick: () => {} })),
  ]
}

/** What the palette finds in a project: the lens's places, its issues while typing, the other projects. */
export function projectSearch(project: string, lens: string | undefined, go: (what: string) => void) {
  const p = PROJECTS.find((x) => x.id === project) ?? PROJECTS[0]!
  return (q: PaletteQuery): PaletteSection[] => {
    const inProject = q.chips.some((c) => c.id === p.id)
    const withLens = q.chips.some((c) => c.id.startsWith("lens:"))
    const lenses = withLens && lens ? [lens] : LENSES.map((l) => l.id)
    const places = lenses.flatMap((l) =>
      (PLACES[l] ?? []).map((pl) => ({
        id: `place:${l}:${pl.id}`,
        label: pl.label,
        icon: pl.icon,
        hint: lenses.length > 1 ? LENSES.find((x) => x.id === l)?.label : undefined,
        run: () => go(pl.label),
      })),
    )
    const issues = q.text
      ? ISSUES.map((i) => ({
          id: `issue:${i.key}`,
          label: i.key,
          hint: i.title,
          icon: "circle-dot" as const,
          keywords: [i.title],
          run: () => go(i.key),
        }))
      : []
    const others = PROJECTS.filter((x) => x.id !== p.id).map((x, i) => ({
      id: `project:${x.id}`,
      label: x.name,
      mark: { name: x.name, hue: HUES[(i + 1) % HUES.length] },
      run: () => go(x.name),
    }))
    return [
      ...(inProject
        ? [
            {
              title: withLens && lens ? `${p.name} · ${LENSES.find((l) => l.id === lens)?.label}` : p.name,
              commands: [...places, ...issues],
            },
          ]
        : []),
      { title: "Projects", commands: others },
    ]
  }
}

/** What `>` lists. */
export const projectActions = (go: (what: string) => void): PaletteSection[] => [
  {
    title: "Atlas web",
    commands: [
      { id: "new-issue", label: "New issue", icon: "plus", shortcut: "C", run: () => go("New issue") },
      { id: "copy-link", label: "Copy link to project", icon: "link", run: () => go("Copy link") },
    ],
  },
  {
    title: "Acme",
    commands: [
      { id: "settings", label: "Settings", icon: "settings", shortcut: "G S", run: () => go("Settings") },
      { id: "theme", label: "Switch theme", icon: "moon", run: () => go("Switch theme") },
    ],
  },
]
