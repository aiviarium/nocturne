// Operate › Deploys: what was shipped to the host, newest first, and one deploy with the config it changed and
// its output. The record's trail and stepper come from the place's records.
import {
  DiffView,
  EmptyState,
  ListRow,
  LogViewer,
  PropertyList,
  RowList,
  type RowMenuEntry,
  SectionHeading,
  ShellViewHeader,
  type ShellViewProps,
  State,
  toast,
  ViewLayout,
} from "@aiviarium/nocturne"
import { Show } from "solid-js"
import type { Host } from "../data"
import { copyLink, demoShell } from "../menus"
import { DEPLOY_STATE, DEPLOYS, type Deploy, deploysOf } from "./data"

/** Only what is unusual shows a state: the deploy that is live, and the ones that failed. */
const stateOf = (d: Deploy) =>
  d.state === "superseded" ? undefined : (
    <State status={DEPLOY_STATE[d.state].dot}>{DEPLOY_STATE[d.state].label}</State>
  )

export const deployById = (id: string) => DEPLOYS.find((d) => d.id === id)

const pathOf = (d: Deploy) => `/hosts/${d.host}/operate/deploys/${d.id}`
const rollBack = (d: Deploy) =>
  toast({
    title: `Rolled back to #${d.id}`,
    tone: "success",
    action: { label: "Undo", onClick: () => {} },
  })

/** The menu of a deploy: in the list and on its entry in the sidebar. Deploys are history: none is removed. */
export function deployMenu(d: Deploy): RowMenuEntry[] {
  return [
    { id: "open", label: "Open", icon: "arrow-up-right", onSelect: () => demoShell().go(pathOf(d)) },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(`Deploy #${d.id}`, pathOf(d)) },
    ...(d.state === "live"
      ? []
      : ([
          { type: "separator" },
          {
            id: "rollback",
            label: "Roll back to this deploy",
            icon: "rotate-ccw",
            onSelect: () => rollBack(d),
          },
        ] as const)),
  ]
}

function DeployPage(props: { deploy: Deploy }) {
  const d = () => props.deploy
  return (
    <div class="dm-page">
      <PropertyList
        labelWidth={88}
        items={[
          { label: "Commit", value: <span class="mono">{d().commit}</span> },
          { label: "By", value: d().by },
          { label: "Deployed", value: <span class="nc-num">{d().ago}</span> },
          { label: "Took", value: <span class="nc-num">{d().duration}</span> },
          { label: "State", value: stateOf(d()) ?? DEPLOY_STATE[d().state].label },
        ]}
      />
      <SectionHeading title="Change" />
      <DiffView before={d().before} after={d().after} path={d().path} />
      <SectionHeading title="Output" />
      <LogViewer
        title={`Deploy #${d().id}`}
        entries={d().output.map((text, i) => ({ id: i, text, level: text.includes("✗") ? "error" : "info" }))}
        streamState={d().exit ? "error" : "ended"}
        streamCode={d().exit ? `exit ${d().exit}` : undefined}
        follow={false}
      />
    </div>
  )
}

export function DeploysView(props: ShellViewProps) {
  const s = props.shell
  const host = () => s.loc().frame.item as Host
  const record = () => {
    const id = s.loc().record
    return id ? deployById(id) : undefined
  }
  return (
    <ViewLayout
      id="demo.hosts.deploys"
      header={
        <ShellViewHeader
          title="Deploys"
          actions={
            record()
              ? [
                  {
                    id: "rollback",
                    label: "Roll back to this deploy",
                    icon: "rotate-ccw",
                    onClick: () => rollBack(record()!),
                  },
                ]
              : [
                  {
                    id: "deploy",
                    label: "New deploy",
                    icon: "plus",
                    onClick: () => toast({ title: "Deploys start from a commit in Build" }),
                  },
                ]
          }
        />
      }
    >
      <Show
        when={record()}
        fallback={
          <Show
            when={deploysOf(host().id).length}
            fallback={<EmptyState title="Nothing deployed here yet" />}
          >
            <RowList
              label="Deploys"
              items={deploysOf(host().id)}
              getKey={(d) => d.id}
              itemLabel={(d) => `#${d.id}`}
              rowMenu={(t) => (t.items[0] ? deployMenu(t.items[0]) : [])}
            >
              {(d) => (
                <ListRow
                  icon="package"
                  prefix={<span>#{d.id}</span>}
                  title={d.title}
                  status={stateOf(d)}
                  meta={
                    <>
                      <span class="nc-mono">{d.commit}</span>
                      <span>{d.ago}</span>
                    </>
                  }
                  selected={s.selection() === d.id}
                  onClick={() => s.toPlace(undefined, "deploys", undefined, d.id)}
                />
              )}
            </RowList>
          </Show>
        }
      >
        {(d) => <DeployPage deploy={d()} />}
      </Show>
    </ViewLayout>
  )
}
