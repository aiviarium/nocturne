// The Dashboard module: one page of the workspace's figures and live widgets.
import type { ShellScope } from "@aiviarium/nocturne"
import "./dashboard.css"
import { OverviewView } from "./overview"

export const dashboardModule: ShellScope = {
  id: "dashboard",
  label: "Dashboard",
  icon: "layout-dashboard",
  view: OverviewView,
}
