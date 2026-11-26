// The workspace's settings, and the module views that list projects and hosts.
import {
  type Appearance,
  AppearanceSettings,
  Avatar,
  ListRow,
  Mark,
  RowList,
  SettingRow,
  ShellViewHeader,
  type ShellViewProps,
  State,
  Switch,
  TextField,
  ViewLayout,
} from "@aiviarium/nocturne"
import { For, Match, Switch as Pick } from "solid-js"
import { HOSTS, issues, PEOPLE, PROJECTS } from "./data"

/** Settings: General, Members and Appearance, one place each. */
export function settingsView(appearance: Appearance) {
  return function SettingsView(props: ShellViewProps) {
    const place = () => props.shell.loc().place?.id
    return (
      <ViewLayout id="workbench.settings" reading={640} header={<ShellViewHeader noPin />}>
        <div class="ex-settings">
          <Pick>
            <Match when={place() === "appearance"}>
              <AppearanceSettings appearance={appearance} />
            </Match>
            <Match when={place() === "members"}>
              <RowList label="Members">
                <For each={PEOPLE}>
                  {(p, i) => (
                    <ListRow
                      leading={<Avatar name={p.name} hue={p.hue} size="sm" />}
                      title={p.name}
                      meta={i() === 0 ? "Owner" : "Member"}
                    />
                  )}
                </For>
              </RowList>
            </Match>
            <Match when={place() === "general"}>
              <SettingRow
                title="Workspace name"
                description="Shown in the path and the window's title."
                control={<TextField aria-label="Workspace name" value="Acme" />}
              />
              <SettingRow
                title="Weekly digest"
                description="A summary of the week's issues by email on Monday."
                control={<Switch label="Weekly digest" checked />}
              />
            </Match>
          </Pick>
        </div>
      </ViewLayout>
    )
  }
}

/** Projects: the projects, each opening its scope. */
export function ProjectsView(props: ShellViewProps) {
  return (
    <ViewLayout id="workbench.projects" header={<ShellViewHeader />}>
      <RowList label="Projects">
        <For each={PROJECTS}>
          {(p) => (
            <ListRow
              leading={<Mark name={p.name} hue={p.hue} size="sm" decorative />}
              title={p.name}
              prefix={<span>{p.key}</span>}
              meta={`${issues().filter((i) => i.project === p.id && i.state !== "done").length} open`}
              onClick={() => props.shell.go(`/projects/${p.id}`)}
            />
          )}
        </For>
      </RowList>
    </ViewLayout>
  )
}

/** Hosts: the fleet, each opening its scope. */
export function HostsView(props: ShellViewProps) {
  return (
    <ViewLayout id="workbench.hosts" header={<ShellViewHeader />}>
      <RowList label="Hosts">
        <For each={HOSTS}>
          {(h) => (
            <ListRow
              leading={
                <Mark
                  name={h.name}
                  icon="server"
                  hue={h.state === "degraded" ? "amber" : "mint"}
                  size="sm"
                  decorative
                />
              }
              title={h.name}
              secondary={h.region}
              status={
                <State status={h.state === "degraded" ? "warn" : "ok"}>
                  {h.state === "degraded" ? "Degraded" : "Online"}
                </State>
              }
              onClick={() => props.shell.go(`/hosts/${h.id}`)}
            />
          )}
        </For>
      </RowList>
    </ViewLayout>
  )
}
