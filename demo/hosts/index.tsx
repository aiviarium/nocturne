// The Hosts module: the fleet, and a host's scope through the Operate lens. The Terminal panel under the view
// shows the host's open sessions; on Sessions the view is the terminal, so the panel steps aside.
import { Avatar, type ShellScope } from "@aiviarium/nocturne"
import { type Host, person } from "../data"
import { lens } from "../lenses"
import { DEPLOYS, deploysOf, hosts, newSession, SESSION_LABEL, sessionById, sessionsOf } from "./data"
import { DeploysView, deployById, deployMenu } from "./deploys"
import { FilesView } from "./files"
import { FleetView, hostMenu } from "./fleet"
import "./hosts.css"
import { LogsView } from "./logs"
import { OverviewView } from "./overview"
import { SessionsView, sessionMenu } from "./sessions"

export { terminalPanel } from "./sessions"

const host: ShellScope<Host> = {
  id: "host",
  label: (h) => h.name,
  noun: "host",
  mark: (h) => ({
    name: h.name,
    icon: "server",
    hue: h.state === "degraded" ? "amber" : h.state === "offline" ? "neutral" : "mint",
  }),
  items: () => hosts(),
  menu: (h) => hostMenu([h]),
  lenses: [
    lens<Host>("operate", [
      { id: "overview", label: "Overview", icon: "activity", view: OverviewView },
      {
        id: "sessions",
        label: "Sessions",
        icon: "terminal",
        view: SessionsView,
        noun: "session",
        count: (h) => sessionsOf(h.id).filter((s) => s.state === "running").length,
        records: (h) =>
          sessionsOf(h.id).map((s) => ({
            id: s.id,
            label: s.title,
            hint: SESSION_LABEL[s.state],
            // Who runs it: the agent or a person, not the place's terminal icon again.
            leading: () =>
              s.user === "agent" ? (
                <Avatar kind="agent" name={s.title} size="xs" />
              ) : (
                <Avatar name={person(s.user)?.name ?? s.user} hue={person(s.user)?.hue} size="xs" />
              ),
            status: s.state === "running" ? "live" : s.state === "failed" ? "error" : undefined,
            hover: () => ({
              title: s.title,
              meta: `${SESSION_LABEL[s.state]} · started ${s.started} ago`,
              rows: [
                {
                  label: "Run by",
                  value: s.user === "agent" ? "The agent" : (person(s.user)?.name ?? s.user),
                },
                ...(s.lines.length
                  ? [{ label: "Last line", value: <span class="nc-mono nc-truncate">{s.lines.at(-1)}</span> }]
                  : []),
              ],
            }),
            meta: s.started,
          })),
        recordLabel: (id) => sessionById(id)?.title,
        entries: { limit: 3, create: (h) => newSession(h.id) },
        menu: (id) => {
          const x = sessionById(id)
          return x ? sessionMenu([x]) : []
        },
        // The dock's tabs name the open sessions: no trail. The view is the terminal, so the panel steps aside.
        trail: false,
        covers: ["terminal"],
      },
      { id: "logs", label: "Logs", icon: "logs", view: LogsView },
      {
        id: "files",
        label: "Files",
        icon: "folder",
        view: FilesView,
        // The view draws its own trail of folders. A file's path is the rest of the address.
        trail: false,
        path: true,
        recordLabel: (path) => path.split("/").at(-1),
      },
      {
        id: "deploys",
        label: "Deploys",
        icon: "package",
        view: DeploysView,
        noun: "deploy",
        records: (h) =>
          deploysOf(h.id).map((d) => ({
            id: d.id,
            label: `#${d.id}`,
            hint: d.title,
            // Who shipped it, not the place's package icon again.
            leading: () => <Avatar name={person(d.by)?.name ?? d.by} hue={person(d.by)?.hue} size="xs" />,
            status: d.state === "failed" ? "error" : d.state === "rolled-back" ? "warn" : undefined,
            hover: () => ({
              title: d.title,
              meta: `#${d.id} · ${person(d.by)?.name ?? d.by} · ${d.ago} ago`,
              rows: [
                { label: "State", value: DEPLOY_STATE[d.state] },
                { label: "Commit", value: <span class="nc-mono">{d.commit.slice(0, 7)}</span> },
                { label: "Took", value: d.duration },
              ],
            }),
            meta: d.ago,
            // Commit and duration: what tells one deploy from the next.
            detail: `${d.commit.slice(0, 7)} · ${d.duration}`,
          })),
        recordLabel: (id) => (deployById(id) ? `#${id}` : undefined),
        entries: { limit: 5, label: (r) => r.hint ?? r.label },
        menu: (id) => {
          const d = deployById(id)
          return d ? deployMenu(d) : []
        },
        count: (h) => DEPLOYS.filter((d) => d.host === h.id && d.state === "failed").length,
      },
    ]),
  ],
}

const DEPLOY_STATE = {
  live: "Live",
  failed: "Failed",
  "rolled-back": "Rolled back",
  superseded: "Superseded",
}

export const hostsModule: ShellScope = {
  id: "hosts",
  label: "Hosts",
  icon: "server",
  child: host,
  view: FleetView,
  count: () => hosts().filter((h) => h.state === "degraded").length,
}
