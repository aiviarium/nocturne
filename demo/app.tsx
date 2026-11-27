// The demo: Acme's workspace drawn by Nocturne's shell. Every area registers its scopes, lenses, places and panels,
// and the shell derives the window from them. Everything is in memory; the router and the store come in from
// main.tsx (the address bar and localStorage) or from a test (memory).
import {
  type Appearance,
  createAppearance,
  createShell,
  EmptyState,
  type HistoryRouter,
  Shell,
  type ShellOptions,
  type ShellRegistry,
  type ShellStorage,
  TitleBarItem,
  ToastRegion,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, onCleanup, untrack } from "solid-js"
import { agentModule, assistantPanel } from "./agent"
import { type Demo, DemoContext, type RunsIn } from "./context"
import { dashboardModule } from "./dashboard"
import { ME } from "./data"
import { hostsModule, terminalPanel } from "./hosts"
import { inboxModule } from "./inbox"
import { mobilePlace } from "./mobile"
import { projectsModule } from "./projects"
import { settingsModule } from "./settings"

/** The shell's id: the demo's keys in the store and the router's state. */
export const DEMO_ID = "demo"

/** Everything the shell is made from, so a test can build the registry without drawing it. */
export function demoOptions(router: HistoryRouter, storage: ShellStorage, demo: Demo): ShellOptions {
  return {
    router,
    storage,
    id: DEMO_ID,
    workspace: { id: "acme", name: "Acme" },
    workspaces: [
      { id: "acme", name: "Acme" },
      { id: "personal", name: "Personal", hue: "rose" },
    ],
    onWorkspaceChange: (id) =>
      toast({ title: id === "acme" ? "Already in Acme" : "The demo has one workspace", tone: "info" }),
    scopes: [
      inboxModule,
      dashboardModule,
      projectsModule,
      hostsModule,
      agentModule,
      { ...settingsModule, places: [...(settingsModule.places ?? []), mobilePlace] },
    ],
    panels: [
      {
        id: "details",
        label: "Details",
        icon: "panel-right",
        at: "right",
        key: "d",
        render: (p) => p.shell.inspect() ?? <EmptyState size="sm" title="Nothing selected" />,
      },
      assistantPanel,
      terminalPanel,
    ],
    commands: [
      { id: "theme", label: "Switch theme", icon: "moon", run: () => demo.appearance.toggleTheme() },
      {
        id: "desktop",
        label: "Switch between a browser tab and a desktop window",
        icon: "monitor",
        keywords: ["desktop", "browser", "window"],
        run: () => demo.setRunsIn(demo.runsIn() === "desktop" ? "browser" : "desktop"),
      },
    ],
  }
}

export interface DemoAppProps {
  router: HistoryRouter
  storage: ShellStorage
  /** Hands the registry out, for a test. */
  onShell?: (shell: ShellRegistry) => void
  /** Called once with the appearance, such as to follow the docs site's theme. Returns its cleanup. */
  onReady?: (appearance: Appearance) => (() => void) | undefined
}

/** Where the demo plays: a browser tab (the default) or a desktop window, kept in the store. */
const RUNS_IN = `${DEMO_ID}/runsIn`

export function DemoApp(props: DemoAppProps) {
  const storage = untrack(() => props.storage)
  const appearance = createAppearance({ storage, defaultTheme: "dark" })
  const [runsIn, setRunsInRaw] = createSignal<RunsIn>(
    storage.get(RUNS_IN) === "desktop" ? "desktop" : "browser",
    { ownedWrite: true },
  )
  const setRunsIn = (v: RunsIn) => {
    storage.set(RUNS_IN, v)
    setRunsInRaw(v)
  }
  const demo: Demo = { appearance, storage, runsIn, setRunsIn }
  const shell = createShell(
    demoOptions(
      untrack(() => props.router),
      storage,
      demo,
    ),
  )
  untrack(() => props.onShell?.(shell))
  const stop = untrack(() => props.onReady?.(appearance))
  if (stop) onCleanup(stop)
  const noWindow = (what: string) => toast({ title: `The demo has no window to ${what}`, tone: "info" })

  return (
    <DemoContext value={demo}>
      <Shell
        shell={shell}
        main
        runsIn={runsIn()}
        icon="sparkle"
        appearance={appearance}
        appMenu={{
          label: "Acme",
          items: [
            { id: "about", label: "About the demo", icon: "info" },
            { type: "separator" },
            {
              id: "desktop",
              label: "Desktop window",
              icon: "monitor",
              checked: runsIn() === "desktop",
            },
            { id: "theme", label: "Switch theme", icon: "moon" },
            { type: "separator" },
            { id: "reset", label: "Reset the demo", icon: "rotate-ccw" },
          ],
          onSelect: (id) => {
            if (id === "desktop") setRunsIn(runsIn() === "desktop" ? "browser" : "desktop")
            else if (id === "theme") appearance.toggleTheme()
            else if (id === "about")
              toast({
                title: "Nocturne demo",
                description: "Acme's workspace, in memory. Nothing leaves the page.",
              })
            else if (id === "reset")
              toast({
                title: "Reset the demo?",
                description: "Lens order, widths and history go back to the start.",
                tone: "warning",
                action: { label: "Reset", onClick: () => resetDemo(storage) },
              })
          },
        }}
        window={{
          style: "mac",
          onMinimise: () => noWindow("minimise"),
          onMaximise: () => noWindow("maximise"),
          onClose: () => noWindow("close"),
        }}
        status={
          <TitleBarItem
            icon="webhook"
            label="1 failing"
            tone="warning"
            tooltip="Webhooks: 1 failing"
            onClick={() => shell.go("/settings/webhooks")}
            current={shell.loc().place?.id === "webhooks"}
          />
        }
        account={{
          name: ME.name,
          detail: "mira@acme.dev",
          badge: "Admin",
          items: [
            { id: "profile", label: "Profile", icon: "user" },
            { id: "shortcuts", label: "Keyboard shortcuts", icon: "keyboard" },
          ],
          onSelect: (id) => shell.go(id === "profile" ? "/settings/profile" : "/settings/shortcuts"),
          theme: { value: appearance.theme(), onChange: (v) => appearance.setTheme(v) },
          onAppearance: () => shell.go("/settings/appearance"),
          onSignOut: () => toast({ title: "Signed out", description: "Not really: this is the demo." }),
        }}
      />
      <ToastRegion />
    </DemoContext>
  )
}

/** Forgets what the demo remembered in the store and starts again. */
function resetDemo(storage: ShellStorage) {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(STORE_PREFIX)) keys.push(k)
  }
  for (const k of keys) localStorage.removeItem(k)
  storage.set(RUNS_IN, undefined)
  location.hash = ""
  location.reload()
}

/** The demo's keys in localStorage. */
export const STORE_PREFIX = "nocturne-demo:"
