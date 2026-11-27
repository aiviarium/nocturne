// A project's planning places: triage and ideas (in Explore), specs and the roadmap (in Product).
import type { ShellPlace } from "@aiviarium/nocturne"
import type { Project } from "../../data"
import { IdeasView } from "./ideas"
import { RoadmapView } from "./roadmap"
import { specsPlace } from "./specs"

export { specsPlace }

import { openReports, TriageView } from "./triage"
import "./explore.css"

export const triagePlace: ShellPlace<Project> = {
  id: "triage",
  label: "Triage",
  icon: "inbox",
  view: TriageView,
  count: (p) => openReports(p.id).length || undefined,
}
export const ideasPlace: ShellPlace<Project> = {
  id: "ideas",
  label: "Ideas",
  icon: "lightbulb",
  view: IdeasView,
}
export const roadmapPlace: ShellPlace<Project> = {
  id: "roadmap",
  label: "Roadmap",
  icon: "calendar",
  view: RoadmapView,
}
