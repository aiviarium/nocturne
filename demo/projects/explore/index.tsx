// Projects through the Explore and Product lenses: triage, ideas, specs and the roadmap.
import type { ShellPlace } from "@aiviarium/nocturne"
import type { Project } from "../../data"
import { IdeasView } from "./ideas"
import { RoadmapView } from "./roadmap"
import { specsPlace } from "./specs"
import { openReports, TriageView } from "./triage"
import "./explore.css"

export const explorePlaces: ShellPlace<Project>[] = [
  {
    id: "triage",
    label: "Triage",
    icon: "inbox",
    view: TriageView,
    count: (p) => openReports(p.id).length || undefined,
  },
  { id: "ideas", label: "Ideas", icon: "lightbulb", view: IdeasView },
]

export const productPlaces: ShellPlace<Project>[] = [
  specsPlace,
  { id: "roadmap", label: "Roadmap", icon: "calendar", view: RoadmapView },
]
