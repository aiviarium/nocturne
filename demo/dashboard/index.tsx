// The Dashboard module: the workspace's figures and live widgets, and the fleet at a glance.
import type { ShellScope } from "@aiviarium/nocturne"
import "./dashboard.css"
import { FleetView } from "./fleet"
import { OverviewView } from "./overview"

export const dashboardModule: ShellScope = {
  id: "dashboard",
  label: "Dashboard",
  icon: "layout-dashboard",
  places: [
    { id: "overview", label: "Overview", icon: "gauge", view: OverviewView },
    { id: "fleet", label: "Fleet", icon: "server", view: FleetView },
  ],
}
