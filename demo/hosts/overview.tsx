// Operate › Overview: what the host is and how it is doing: its facts, its services and the latest events, in
// frames side by side that the person can resize.
import {
  Badge,
  Button,
  Frame,
  ListRow,
  LogViewer,
  type MetaItem,
  MetaLine,
  RowList,
  SectionHeading,
  ShellViewHeader,
  type ShellViewProps,
  SplitGroup,
  State,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, For, Show } from "solid-js"
import type { Host } from "../data"
import { factsOf, logs, SERVICES, sessionsOf, toEntry } from "./data"

const SERVICE_LABEL = { ok: "Running", warn: "Degraded", error: "Failed", off: "Stopped" } as const

export function OverviewView(props: ShellViewProps) {
  const host = () => props.shell.loc().frame.item as Host
  const facts = () => factsOf(host().id)
  const [weights, setWeights] = createSignal([3, 2])
  const running = () => sessionsOf(host().id).filter((s) => s.state === "running").length
  // MetaLine keeps its parts by object: the figures that did not change keep theirs when the sessions do.
  const figures = createMemo((): MetaItem[] => [
    { label: `CPU ${facts().cpu}%`, icon: "cpu" },
    { label: `Memory ${facts().memory}`, icon: "hard-drive" },
  ])
  const sessionsItem = createMemo((): MetaItem | null =>
    running() ? { label: `${running()} sessions`, icon: "terminal" } : null,
  )
  const usage = () => [...figures(), sessionsItem()]
  return (
    <ViewLayout
      id="demo.hosts.overview"
      scroll={false}
      header={
        <ShellViewHeader
          actions={[
            {
              id: "terminal",
              label: "Open a terminal",
              icon: "terminal",
              onClick: () => props.shell.toPlace(undefined, "sessions"),
            },
          ]}
        />
      }
    >
      <div class="dm-hosts-overview">
        <div class="dm-row">
          <Badge tone="outline">{facts().arch}</Badge>
          <Show when={host().state !== "online"}>
            <Badge tone={host().state === "degraded" ? "warning" : "neutral"}>
              {host().state === "degraded" ? "Degraded" : "Offline"}
            </Badge>
          </Show>
          <MetaLine
            items={[
              { label: facts().ip, mono: true, icon: "link" },
              host().region,
              facts().os,
              `kernel ${facts().kernel}`,
              `up ${facts().uptime}`,
              facts().agent,
            ]}
          />
        </div>
        <SplitGroup
          class="dm-hosts-panes"
          items={["services", "events"]}
          weights={weights()}
          onResize={setWeights}
          min={240}
          label={() => "Resize services and events"}
        >
          {(pane) =>
            pane === "services" ? (
              <Frame class="dm-hosts-frame">
                <SectionHeading title="Services" count={SERVICES[host().id]?.length} />
                <RowList label="Services" variant="inline">
                  <For each={SERVICES[host().id] ?? []}>
                    {(s) => (
                      <ListRow
                        icon="package"
                        title={s.name}
                        meta={s.detail}
                        status={
                          s.state === "ok" ? undefined : (
                            <State status={s.state}>{SERVICE_LABEL[s.state]}</State>
                          )
                        }
                      />
                    )}
                  </For>
                </RowList>
                <SectionHeading title="Usage" />
                <MetaLine items={usage()} />
              </Frame>
            ) : (
              <Frame flush class="dm-hosts-frame">
                <LogViewer
                  title="Latest events"
                  entries={logs().slice(-8).map(toEntry)}
                  showTimestamps
                  fill
                  copyable={false}
                  label={`Latest events on ${host().name}`}
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      iconEnd="arrow-right"
                      onClick={() => props.shell.toPlace(undefined, "logs")}
                    >
                      All logs
                    </Button>
                  }
                />
              </Frame>
            )
          }
        </SplitGroup>
      </div>
    </ViewLayout>
  )
}
