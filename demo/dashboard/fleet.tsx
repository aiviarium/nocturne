// Dashboard › Fleet: one panel per host with its live meters and its month of uptime. A host that is degraded says
// so with a warning glyph whose tooltip names the trouble; healthy hosts show no state.
import {
  Icon,
  IconButton,
  Panel,
  SectionHeading,
  ShellViewHeader,
  type ShellViewProps,
  Tooltip,
  ViewLayout,
  Widget,
  WidgetMeters,
  WidgetUptime,
} from "@aiviarium/nocturne"
import { createSignal, For, onSettled, Show } from "solid-js"
import { drift, FLEET, type FleetHost } from "./data"
import { liveMeter } from "./overview"

function HostPanel(props: { host: FleetHost; onOpen: () => void }) {
  const [cpu, setCpu] = createSignal(props.host.cpu)
  const [memory, setMemory] = createSignal(props.host.memory)
  onSettled(() => {
    const timer = setInterval(() => {
      setCpu((v) => drift(v, 5, 5, 98))
      setMemory((v) => drift(v, 1.5, 20, 95))
    }, 2500)
    return () => clearInterval(timer)
  })
  const up = () => props.host.days.filter((d) => d === "up").length
  return (
    <Panel
      fill
      title={
        <span class="dm-dash-label">
          {props.host.name}
          <Show when={props.host.degraded}>
            {(why) => (
              <Tooltip content={why()}>
                {(t) => (
                  <span {...t} tabindex={0} class="dm-dash-glyph">
                    <Icon name="triangle-alert" size="sm" tone="warning" label="Degraded" />
                  </span>
                )}
              </Tooltip>
            )}
          </Show>
        </span>
      }
      actions={
        <IconButton
          icon="arrow-up-right"
          size="sm"
          label={`Open ${props.host.name}`}
          onClick={props.onOpen}
        />
      }
    >
      <div class="dm-col">
        <WidgetMeters
          label={props.host.name}
          items={[
            liveMeter("CPU", cpu),
            liveMeter("Memory", memory),
            { label: "Disk", value: props.host.disk, display: `${props.host.disk}%` },
          ]}
        />
        <Widget hue="success" title="Uptime" value={`${up()} / 30 days`} axis={["30d", "Today"]}>
          <WidgetUptime days={props.host.days} label={`${props.host.name} uptime, last 30 days`} />
        </Widget>
      </div>
    </Panel>
  )
}

export function FleetView(props: ShellViewProps) {
  return (
    <ViewLayout id="demo.dashboard.fleet" header={<ShellViewHeader />}>
      <div class="dm-dash-page">
        <SectionHeading title="Hosts" count={FLEET.length} />
        <div class="dm-dash-fleet">
          <For each={FLEET}>
            {(h) => <HostPanel host={h} onOpen={() => props.shell.go(`/hosts/${h.id}`)} />}
          </For>
        </div>
      </div>
    </ViewLayout>
  )
}
