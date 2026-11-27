// Build › Pull requests: the project's pull requests, and one with its checks, a reviewer's suggestion and its
// files as diffs.
import {
  Avatar,
  Badge,
  type BadgeTone,
  Button,
  DiffView,
  EmptyState,
  IdBadge,
  ListRow,
  MetaLine,
  type PropertyItem,
  PropertyList,
  parsePatch,
  type RowKey,
  RowList,
  type RowMenuEntry,
  SectionHeading,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  State,
  Tabs,
  toast,
  usePhone,
  useShell,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { type Project, person } from "../../data"
import { askName, copyLink, demoShell, inList, renameEntry, undoable } from "../../menus"
import { changePull, closePulls, type Pull, pullById, pullsOf } from "./data"

const REVIEW: Record<Pull["review"], [string, BadgeTone]> = {
  approved: ["Approved", "success"],
  changes: ["Changes asked", "warning"],
  pending: ["Review pending", "neutral"],
  merged: ["Merged", "outline"],
}

const projectOf = (shell: ShellRegistry) => shell.loc().frame.item as Project

/** Lines added and removed across a pull request's files. */
const changes = (p: Pull) => {
  let added = 0
  let removed = 0
  for (const f of p.files)
    for (const file of parsePatch(f.patch))
      for (const h of file.hunks)
        for (const l of h.lines) {
          if (l.kind === "add") added++
          if (l.kind === "del") removed++
        }
  return { added, removed }
}

/** The worst of a pull request's checks, as a state. */
function Checks(props: { pull: Pull }) {
  const failed = () => props.pull.checks.filter((c) => c.state === "error").length
  const running = () => props.pull.checks.some((c) => c.state === "live")
  return (
    <Show when={failed() || running()}>
      <Show when={failed()} fallback={<State status="live">Checks running</State>}>
        <State status="error">{`${failed()} failing`}</State>
      </Show>
    </Show>
  )
}

const pathOf = (p: Pull) => `/projects/${p.project}/build/pulls/${p.id}`
const nums = (list: Pull[]) => (list.length === 1 ? `#${list[0]!.id}` : `${list.length} pull requests`)

/** Closes the open ones of `list`, with Undo. */
const close = (list: Pull[]) => {
  const open = list.filter((p) => p.review !== "merged")
  if (open.length) undoable(`Closed ${nums(open)}`, closePulls(open.map((p) => p.id)))
}
const approve = (list: Pull[]) => {
  const open = list.filter((p) => p.review !== "merged" && p.review !== "approved")
  for (const p of open) changePull(p.id, { review: "approved" })
  if (open.length) toast({ title: `Approved ${nums(open)}`, tone: "success" })
}

/** The menu of a pull request, or of several: in the list and on its entry in the sidebar. */
export function pullMenu(list: Pull[]): RowMenuEntry[] {
  const p = list[0]
  if (!p) return []
  const open = list.filter((x) => x.review !== "merged")
  const approvable = open.filter((x) => x.review !== "approved")
  if (list.length > 1)
    return [
      { type: "label", label: `${list.length} selected` },
      ...(approvable.length
        ? [
            {
              id: "approve",
              label: `Approve ${approvable.length}`,
              icon: "check",
              onSelect: () => approve(list),
            } as const,
          ]
        : []),
      ...(open.length
        ? ([
            { type: "separator" },
            {
              id: "close",
              label: `Close ${open.length}`,
              icon: "close",
              danger: true,
              onSelect: () => close(list),
            },
          ] as const)
        : []),
    ]
  const shell = demoShell()
  return [
    { id: "open", label: "Open", icon: "arrow-up-right", onSelect: () => shell.go(pathOf(p)) },
    {
      id: "details",
      label: "Show details",
      icon: "panel-right",
      onSelect: () => {
        shell.select(p.id)
        shell.showPanel("details")
      },
    },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(`#${p.id}`, pathOf(p)) },
    renameEntry(() =>
      askName({
        title: "Rename pull request",
        value: p.title,
        submit: "Rename",
        onSubmit: (title) => changePull(p.id, { title }),
      }),
    ),
    ...(approvable.length
      ? [{ id: "approve", label: "Approve", icon: "check", onSelect: () => approve([p]) } as const]
      : []),
    ...(open.length
      ? ([
          { type: "separator" },
          {
            id: "close",
            label: "Close pull request",
            icon: "close",
            danger: true,
            onSelect: () => close([p]),
          },
        ] as const)
      : []),
  ]
}

function PullList(props: { shell: ShellRegistry }) {
  const s = props.shell
  const list = () => pullsOf(projectOf(s).id)
  const [selected, setSelected] = createSignal<RowKey[]>([])
  return (
    <ViewLayout id="demo.pulls" header={<ShellViewHeader />}>
      <Show when={list().length} fallback={<EmptyState title="No pull requests" />}>
        <RowList
          label="Pull requests"
          divided
          items={list()}
          getKey={(p) => p.id}
          itemLabel={(p) => `#${p.id}`}
          selectable
          selected={selected()}
          onSelectedChange={(keys) => {
            setSelected(keys)
            s.select(keys.length === 1 ? String(keys[0]) : undefined)
          }}
          onRemove={(keys) => {
            const open = list().filter((p) => keys.includes(p.id) && p.review !== "merged")
            return open.length ? closePulls(open.map((p) => p.id)) : undefined
          }}
          rowMenu={(t) => inList(pullMenu(t.items))}
          bulkActions={(items) => (
            <Show when={items.some((p) => p.review !== "merged" && p.review !== "approved")}>
              <Button size="sm" variant="ghost" icon="check" onClick={() => approve(items)}>
                Approve
              </Button>
            </Show>
          )}
        >
          {(p) => (
            <ListRow
              lines={3}
              icon={p.review === "merged" ? "commit" : "git-pull-request"}
              prefix={<span>#{p.id}</span>}
              title={p.title}
              muted={p.review === "merged"}
              detail={
                <MetaLine
                  items={[
                    { label: p.branch, mono: true },
                    person(p.author)?.name,
                    `+${changes(p).added} −${changes(p).removed}`,
                  ]}
                />
              }
              status={<Checks pull={p} />}
              meta={
                <>
                  <Badge tone={REVIEW[p.review][1]}>{REVIEW[p.review][0]}</Badge>
                  <span>{p.updated}</span>
                </>
              }
              onClick={() => s.toPlace(undefined, "pulls", undefined, p.id)}
              onRename={(title) => changePull(p.id, { title })}
            />
          )}
        </RowList>
      </Show>
    </ViewLayout>
  )
}

function PullPage(props: { pull: Pull; shell: ShellRegistry }) {
  const phone = usePhone()
  const p = () => props.pull
  const [mode, setMode] = createSignal<"unified" | "split">("unified")
  const [suggestion, setSuggestion] = createSignal<"open" | "accepted" | "rejected">("open")
  // With Details open on this pull request, the panel holds its facts, so they show once.
  const inDetails = () =>
    props.shell.panels().right?.id === "details" && props.shell.subject("details") === p().id
  return (
    <ViewLayout
      id="demo.pull"
      header={
        <ShellViewHeader
          actions={[
            {
              id: "merge",
              label: "Merge",
              icon: "commit",
              disabled: p().review !== "approved",
              onClick: () => toast({ title: `Merged #${p().id}`, tone: "success" }),
            },
          ]}
        >
          {/* A phone's header has no room for it beside the trail, and a split diff none at 390px. */}
          <Show when={!phone()}>
            <Tabs
              label="Diff layout"
              items={[
                { id: "unified", label: "Unified" },
                { id: "split", label: "Split" },
              ]}
              value={mode()}
              onChange={(id) => setMode(id as "unified" | "split")}
            />
          </Show>
        </ShellViewHeader>
      }
    >
      <div class="dm-page nc-reading">
        <section class="dm-col">
          <h1 class="heading dm-build-title">{p().title}</h1>
          <Show when={!inDetails()}>
            <div class="dm-row">
              <Badge tone={REVIEW[p().review][1]}>{REVIEW[p().review][0]}</Badge>
              <MetaLine
                items={[
                  { label: p().branch, mono: true },
                  person(p().author)?.name,
                  `+${changes(p()).added} −${changes(p()).removed}`,
                  p().updated,
                ]}
              />
            </div>
            <div class="dm-row">
              <For each={p().checks}>
                {(c) => (
                  <State status={c.state}>
                    {c.name}
                    {c.state === "error" ? " failed" : c.state === "live" ? " running" : ""}
                  </State>
                )}
              </For>
            </div>
          </Show>
        </section>
        <Show when={p().suggestion}>
          {(sg) => (
            <section class="dm-col">
              <SectionHeading
                title="Suggested description"
                level={3}
                action={
                  <Show when={suggestion() !== "open"}>
                    <State status={suggestion() === "accepted" ? "ok" : "idle"}>
                      {suggestion() === "accepted" ? "Accepted" : "Rejected"}
                    </State>
                  </Show>
                }
              />
              <MetaLine items={["Sarah Chen", "2h"]} />
              <DiffView
                path="Description"
                before={sg().before}
                after={sg().after}
                mode={phone() ? "unified" : mode()}
                onAccept={suggestion() === "open" ? () => setSuggestion("accepted") : undefined}
                onReject={suggestion() === "open" ? () => setSuggestion("rejected") : undefined}
              />
            </section>
          )}
        </Show>
        <section class="dm-col">
          <SectionHeading title="Files" count={p().files.length} level={3} />
          <For each={p().files}>
            {(f) => <DiffView patch={f.patch} mode={phone() ? "unified" : mode()} />}
          </For>
        </section>
      </div>
    </ViewLayout>
  )
}

/** Build › Pull requests: the list, or the pull request the address names. */
export function PullsView(props: ShellViewProps) {
  const pull = () => pullById(props.shell.loc().record)
  return (
    <Show
      when={pull()}
      fallback={
        <Show
          when={!props.shell.loc().record}
          fallback={
            <ViewLayout id="demo.pull" header={<ShellViewHeader />}>
              <EmptyState title="This pull request was closed" />
            </ViewLayout>
          }
        >
          <PullList shell={props.shell} />
        </Show>
      }
    >
      {(p) => <PullPage pull={p()} shell={props.shell} />}
    </Show>
  )
}

/** What the Details panel shows for a pull request. */
export function PullDetails(props: { id: string }) {
  const shell = useShell()
  const items = (p: Pull): PropertyItem[] => [
    {
      label: "Checks",
      value: (
        <span class="dm-col">
          <For each={p.checks}>{(c) => <State status={c.state}>{c.name}</State>}</For>
        </span>
      ),
    },
    { label: "Review", value: <Badge tone={REVIEW[p.review][1]}>{REVIEW[p.review][0]}</Badge> },
    {
      label: "Author",
      value: (
        <span class="dm-row">
          <Avatar name={person(p.author)?.name ?? p.author} hue={person(p.author)?.hue} size="sm" />
          {person(p.author)?.name}
        </span>
      ),
    },
    { label: "Branch", value: <span class="mono">{p.branch}</span> },
    {
      label: "Issue",
      value: p.issue ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => shell?.toPlace(undefined, "issues", undefined, p.issue)}
        >
          <IdBadge>{p.issue}</IdBadge>
        </Button>
      ) : undefined,
    },
  ]
  return (
    <Show when={pullById(props.id)}>
      {(p) => (
        <div class="dm-col dm-pad">
          <Show when={!(shell?.loc().place?.id === "pulls" && shell.loc().record === p().id)}>
            <span class="label">
              #{p().id} {p().title}
            </span>
          </Show>
          <PropertyList items={items(p())} labelWidth={72} />
        </div>
      )}
    </Show>
  )
}
