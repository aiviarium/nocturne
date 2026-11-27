// A project's work places: issues (in Explore, for triage), the board and cycles (in Product) and pull requests (in
// Build, beside the agent), and the Projects module's view.
import { Avatar, Icon, type ShellPlace } from "@aiviarium/nocturne"
import "./build.css"
import { ISSUE_VIEWS, type Project, person } from "../../data"
import { BoardView } from "./board"
import { CyclesView } from "./cycles"
import { issueByKey, issuesIn, type Pull, pullById, pullsOf } from "./data"
import { IssueDetails, IssuesView } from "./issues"
import { PullDetails, PullsView, pullMenu } from "./pulls"

export { ProjectsView, projectInspect, projectMenu } from "./projects"

export const issuesPlace: ShellPlace<Project> = {
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
}
export const boardPlace: ShellPlace<Project> = {
  id: "board",
  label: "Board",
  icon: "board",
  view: BoardView,
  inspect: (key) => <IssueDetails id={key} />,
}
export const cyclesPlace: ShellPlace<Project> = {
  id: "cycles",
  label: "Cycles",
  icon: "refresh-cw",
  view: CyclesView,
}
/** A pull request's state, as its entry's badge: merged, checks failing, changes asked for, approved, or open. */
const PULL_STATE = (x: Pull) =>
  x.review === "merged"
    ? { icon: "git-merge" as const, hue: "var(--label-orchid)", label: "Merged" }
    : x.checks.some((c) => c.state === "error")
      ? { icon: "git-pull-request" as const, hue: "var(--danger)", label: "Checks failing" }
      : x.review === "changes"
        ? { icon: "git-pull-request" as const, hue: "var(--warning)", label: "Changes requested" }
        : x.review === "approved"
          ? { icon: "git-pull-request" as const, hue: "var(--success)", label: "Approved" }
          : { icon: "git-pull-request" as const, hue: "var(--text-3)", label: "Waiting for review" }
const checksOf = (x: Pull) => {
  const failed = x.checks.filter((c) => c.state === "error")
  const live = x.checks.filter((c) => c.state === "live")
  if (failed.length) return `${failed.map((c) => c.name).join(", ")} failing`
  if (live.length) return `${live.length} running`
  return `${x.checks.length} passed`
}

export const pullsPlace: ShellPlace<Project> = {
  id: "pulls",
  label: "Pull requests",
  icon: "git-pull-request",
  view: PullsView,
  noun: "pull request",
  count: (p) => pullsOf(p.id).filter((x) => x.review !== "merged").length,
  records: (p) =>
    pullsOf(p.id).map((x) => {
      const author = person(x.author)
      const state = PULL_STATE(x)
      return {
        id: x.id,
        label: `#${x.id}`,
        hint: x.title,
        // The author is the icon and the state its badge: the place's own icon would say nothing.
        leading: () => <Avatar name={author?.name ?? x.author} hue={author?.hue} size="xs" />,
        badge: () => (
          <span style={{ color: state.hue, display: "inline-flex" }}>
            <Icon name={state.icon} label={state.label} />
          </span>
        ),
        hover: () => ({
          title: x.title,
          meta: `#${x.id} · ${author?.name ?? x.author} · ${x.updated}`,
          rows: [
            { label: "State", value: <span style={{ color: state.hue }}>{state.label}</span> },
            { label: "Checks", value: checksOf(x) },
            { label: "Branch", value: <span class="nc-mono">{x.branch}</span> },
            ...(x.issue ? [{ label: "Issue", value: x.issue }] : []),
          ],
        }),
        meta: x.updated,
        detail: `#${x.id} · ${author?.name.split(" ")[0] ?? x.author}`,
      }
    }),
  // The open ones are few: the sidebar lists them by title.
  entries: { label: (r) => r.hint ?? r.label },
  recordLabel: (id) => (pullById(id) ? `#${id}` : undefined),
  inspect: (id) => <PullDetails id={id} />,
  menu: (id) => pullMenu(pullById(id) ? [pullById(id)!] : []),
}
