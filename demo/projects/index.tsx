// The Projects module: every project, and a project's scope through its three lenses.
import type { ShellScope } from "@aiviarium/nocturne"
import { PROJECTS, type Project } from "../data"
import { lens } from "../lenses"
import { buildPlaces, ProjectsView, projectInspect } from "./build"
import { explorePlaces, productPlaces } from "./explore"

const project: ShellScope<Project> = {
  id: "project",
  label: (p) => p.name,
  noun: "project",
  mark: (p) => ({ name: p.name, hue: p.hue }),
  items: () => PROJECTS,
  inspect: projectInspect,
  lenses: [
    lens<Project>("explore", explorePlaces),
    lens<Project>("product", productPlaces),
    lens<Project>("build", buildPlaces, { open: { right: "details" } }),
  ],
}

export const projectsModule: ShellScope = {
  id: "projects",
  label: "Projects",
  icon: "board",
  child: project,
  view: ProjectsView,
}
