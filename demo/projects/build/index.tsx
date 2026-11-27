// Projects through the Build lens: issues, the board, cycles and pull requests, and the Projects module's view.
import type { ShellPlace } from "@aiviarium/nocturne"
import "./build.css"
import { ISSUE_VIEWS, type Project } from "../../data"
import { BoardView } from "./board"
import { CyclesView } from "./cycles"
import { issueByKey, issuesIn, pullById, pullsOf } from "./data"
import { IssueDetails, IssuesView } from "./issues"
import { PullDetails, PullsView, pullMenu } from "./pulls"

export { ProjectsView, projectInspect, projectMenu } from "./projects"

export const buildPlaces: ShellPlace<Project>[] = [
  {
    id: "issues",
    label: "Issues",
    icon: "list-todo",
    view: IssuesView,
    noun: "issue",
    views: ISSUE_VIEWS.map((v) => ({ id: v.id, label: v.label })),
    count: (p) => issuesIn(p.id, "active").length,
    records: (p, view) => issuesIn(p.id, view).map((i) => ({ id: i.key, label: i.key, hint: i.title })),
    recordLabel: (key) => issueByKey(key)?.key,
    inspect: (key) => <IssueDetails id={key} />,
  },
  {
    id: "board",
    label: "Board",
    icon: "board",
    view: BoardView,
    inspect: (key) => <IssueDetails id={key} />,
  },
  { id: "cycles", label: "Cycles", icon: "refresh-cw", view: CyclesView },
  {
    id: "pulls",
    label: "Pull requests",
    icon: "git-pull-request",
    view: PullsView,
    noun: "pull request",
    count: (p) => pullsOf(p.id).filter((x) => x.review !== "merged").length,
    records: (p) => pullsOf(p.id).map((x) => ({ id: x.id, label: `#${x.id}`, hint: x.title })),
    // The open ones are few: the sidebar lists them by title.
    entries: { label: (r) => r.hint ?? r.label },
    recordLabel: (id) => (pullById(id) ? `#${id}` : undefined),
    inspect: (id) => <PullDetails id={id} />,
    menu: (id) => pullMenu(pullById(id) ? [pullById(id)!] : []),
  },
]
