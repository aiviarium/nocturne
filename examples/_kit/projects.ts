// Projects, saved issue views and the docs page tree, for the navigation examples.
import type { IconName } from "@aiviarium/nocturne"
import { ISSUES, type Issue } from "./issues"

export interface Project {
  id: string
  name: string
  key: string
  lead: string
  updated: string
}

export const PROJECTS: Project[] = [
  { id: "atlas", name: "Atlas web", key: "WEB", lead: "Mira Okonkwo", updated: "12m" },
  { id: "fleet", name: "Fleet agent", key: "FLT", lead: "Jonas Lindqvist", updated: "2h" },
  { id: "docs", name: "Docs site", key: "DOC", lead: "Sarah Chen", updated: "1d" },
]

/** The saved views of a project's issues: the view's own sidebar. */
export const ISSUE_VIEWS: Array<{ id: string; label: string; icon: IconName; test: (i: Issue) => boolean }> =
  [
    { id: "active", label: "Active", icon: "list", test: (i) => i.state !== "done" && i.state !== "backlog" },
    { id: "backlog", label: "Backlog", icon: "layers", test: (i) => i.state === "backlog" },
    { id: "mine", label: "Mine", icon: "user", test: (i) => i.assignee === "Mira Okonkwo" },
  ]

export const issuesIn = (view: string) => ISSUES.filter(ISSUE_VIEWS.find((v) => v.id === view)!.test)

export interface DocPage {
  id: string
  title: string
  children?: DocPage[]
}

/** The page tree of a project's docs. */
export const DOC_TREE: DocPage[] = [
  { id: "intro", title: "Introduction" },
  {
    id: "guides",
    title: "Guides",
    children: [
      { id: "setup", title: "Set up a workspace" },
      {
        id: "deploy",
        title: "Deploy",
        children: [
          { id: "runners", title: "Runners" },
          { id: "rollbacks", title: "Rollbacks" },
        ],
      },
    ],
  },
  { id: "reference", title: "Reference", children: [{ id: "cli", title: "Command line" }] },
]

/** The pages from the root of the tree down to `id`, or nothing when it is not in the tree. */
export function pathTo(id: string, pages: DocPage[] = DOC_TREE): DocPage[] {
  for (const page of pages) {
    if (page.id === id) return [page]
    const below = pathTo(id, page.children ?? [])
    if (below.length) return [page, ...below]
  }
  return []
}
