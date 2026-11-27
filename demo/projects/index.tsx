// The Projects module: every project, and a project's scope through its three lenses.
import type { ShellScope } from "@aiviarium/nocturne"
import { agentPlaces } from "../agent"
import { type Project, projects } from "../data"
import { lens } from "../lenses"
import {
  boardPlace,
  cyclesPlace,
  issuesPlace,
  ProjectsView,
  projectInspect,
  projectMenu,
  pullsPlace,
} from "./build"
import { ideasPlace, roadmapPlace, specsPlace, triagePlace } from "./explore"

const project: ShellScope<Project> = {
  id: "project",
  label: (p) => p.name,
  noun: "project",
  mark: (p) => ({ name: p.name, hue: p.hue }),
  items: () => projects(),
  inspect: projectInspect,
  menu: (p) => projectMenu([p]),
  lenses: [
    // Explore takes in: reports to triage, the issues they become, and ideas.
    lens<Project>("explore", [triagePlace, issuesPlace, ideasPlace], { open: { right: "details" } }),
    // Product plans: specs, the roadmap, and the board and cycles the work moves through.
    lens<Project>("product", [specsPlace, roadmapPlace, boardPlace, cyclesPlace]),
    // Build does: the agent's chats and runs, and the pull requests they lead to.
    lens<Project>("build", [...agentPlaces, pullsPlace]),
  ],
}

export const projectsModule: ShellScope = {
  id: "projects",
  label: "Projects",
  icon: "board",
  child: project,
  view: ProjectsView,
}
