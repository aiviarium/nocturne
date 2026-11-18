import {
  Avatar,
  Button,
  FilterBar,
  InlineField,
  LabelChip,
  ListRow,
  MetaLine,
  Nav,
  PropertyList,
  RowList,
  SectionHeading,
  Select,
  State,
  Tabs,
  TextField,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import { ISSUE_STATE, ISSUES, STATE_NAME } from "../_kit/issues"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Issues of a project, with the selected one in the panel",
  note: "The app sidebar is left out: this is one view on its own.",
  surface: "none",
  frame: "A whole screen, at a desktop window's proportions.",
  height: 640,
}

export default function IssueTracker() {
  const [selected, setSelected] = createSignal("3")
  const [scope, setScope] = createSignal("open")
  const [query, setQuery] = createSignal("")
  const issue = () => ISSUES.find((i) => i.id === selected())
  const rows = createMemo(() =>
    ISSUES.filter((i) => (scope() === "open" ? i.state !== "done" : true)).filter((i) =>
      i.title.toLowerCase().includes(query().toLowerCase()),
    ),
  )
  return (
    <div class="ex-screen">
      <ViewLayout
        id="block-issues"
        sidebarLabel="Atlas web"
        sidebarWidth={220}
        sidebar={
          <Nav
            label="Atlas web"
            groups={[
              {
                label: "Atlas web",
                items: [
                  { label: "Overview", icon: "home", href: "#b" },
                  { label: "Issues", icon: "list", href: "#b", current: true },
                  { label: "Docs", icon: "file", href: "#b" },
                  { label: "Agent sessions", icon: "agent", href: "#b" },
                  { label: "Environments", icon: "server", href: "#b" },
                ],
              },
              {
                label: "Views",
                items: [
                  { label: "Mine", icon: "user", href: "#b" },
                  { label: "Blocked", icon: "lock", href: "#b", meta: "1" },
                ],
              },
            ]}
          />
        }
        header={
          <ViewHeader
            crumbs={[{ label: "Atlas web", href: "#b" }, { label: "Issues" }]}
            actions={[
              { id: "export", label: "Export as CSV", overflow: true, onClick: () => {} },
              { id: "new", label: "New issue", icon: "plus", onClick: () => {} },
            ]}
          />
        }
        asideLabel="Issue"
        asideWidth={340}
        minMain={480}
        aside={
          <Show when={issue()}>
            {(i) => (
              <div class="ex-col ex-pad">
                <MetaLine items={[{ label: i().key, mono: true }, `updated ${i().updated} ago`]} />
                <InlineField variant="title" label="Title" value={i().title} onCommit={() => {}} multiline />
                <PropertyList
                  items={[
                    { label: "State", value: STATE_NAME[i().state] },
                    {
                      label: "Assignee",
                      value: i().assignee ? (
                        <span class="nc-person">
                          <Avatar name={i().assignee!} size="sm" />
                          <span>{i().assignee}</span>
                        </span>
                      ) : (
                        ""
                      ),
                    },
                    {
                      label: "Labels",
                      value: (
                        <span class="nc-row nc-row--tight">
                          <For each={i().labels}>
                            {([hue, name]) => <LabelChip hue={hue}>{name}</LabelChip>}
                          </For>
                        </span>
                      ),
                    },
                    { label: "Cycle", value: "" },
                  ]}
                />
                <SectionHeading title="Activity" />
                <RowList label="Activity">
                  <ListRow
                    leading={<Avatar name="Mira Okonkwo" size="sm" />}
                    title="Mira moved it to In review"
                    meta="3h"
                  />
                  <ListRow icon="branch" title="acme/web#212 linked" meta="5h" />
                </RowList>
                <Button size="sm" variant="accent" icon="sparkle">
                  Ask an agent to fix it
                </Button>
              </div>
            )}
          </Show>
        }
      >
        <div class="ex-col ex-pad">
          <FilterBar
            search={
              <TextField
                variant="search"
                label="Search issues"
                placeholder="Search issues"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
            }
            end={<span>{rows().length} issues</span>}
          >
            <Tabs
              label="Scope"
              value={scope()}
              onChange={setScope}
              items={[
                { id: "open", label: "Open" },
                { id: "all", label: "All" },
              ]}
            />
            <Select
              aria-label="Label"
              placeholder="Label"
              options={[
                { value: "bug", label: "Bug" },
                { value: "feature", label: "Feature" },
              ]}
            />
          </FilterBar>
          <RowList label="Issues">
            <For each={rows()}>
              {(i) => {
                const st = ISSUE_STATE[i.state]
                return (
                  <ListRow
                    leading={i.assignee ? <Avatar name={i.assignee} size="sm" /> : undefined}
                    icon={i.assignee ? undefined : "list"}
                    title={i.title}
                    secondary={i.key}
                    status={st ? <State status={st[0]}>{st[1]}</State> : undefined}
                    meta={i.updated}
                    unread={Boolean(i.unread)}
                    selected={selected() === i.id}
                    onClick={() => setSelected(i.id)}
                  />
                )
              }}
            </For>
          </RowList>
        </div>
      </ViewLayout>
    </div>
  )
}
