// Product › Cycles: the current cycle's progress and its issues, then every cycle in a table.
import {
  type DataColumn,
  DataTable,
  Delta,
  ListRow,
  RowList,
  SectionHeading,
  ShellViewHeader,
  type ShellViewProps,
  Stat,
  State,
  ViewLayout,
} from "@aiviarium/nocturne"
import { For, Show } from "solid-js"
import type { Project } from "../../data"
import { PriorityIcon, StateIcon } from "../../glyphs"
import { allIssues, CYCLES, type Cycle } from "./data"
import { Who } from "./issues"

const rate = (c: Cycle) => (c.scope ? Math.round((c.done / c.scope) * 100) : 0)
const previous = (c: Cycle) => CYCLES[CYCLES.indexOf(c) + 1]

/** The change in completion against the cycle before; nothing for a cycle with no work done yet. */
function Change(props: { cycle: Cycle }) {
  const before = () => previous(props.cycle)
  return (
    <Show when={before() && props.cycle.state !== "next" ? rate(props.cycle) - rate(before()!) : undefined}>
      {(d) => <Delta direction={d() >= 0 ? "up" : "down"} value={`${Math.abs(d())} pts`} />}
    </Show>
  )
}

const COLUMNS: DataColumn<Cycle>[] = [
  { id: "name", header: "Cycle", accessor: (c) => c.name, sortable: true, sortValue: (c) => Number(c.id) },
  { id: "dates", header: "Dates", accessor: (c) => `${c.starts} – ${c.ends}`, width: "150px" },
  {
    id: "state",
    header: "State",
    width: "120px",
    cell: (c) =>
      c.state === "current" ? (
        <State status="live">Running</State>
      ) : c.state === "next" ? (
        <State status="idle">Planned</State>
      ) : c.carried ? (
        <State status="warn">{`${c.carried} carried`}</State>
      ) : (
        <State status="ok">Closed</State>
      ),
  },
  { id: "scope", header: "Scope", accessor: (c) => c.scope, type: "num", width: "80px", sortable: true },
  { id: "done", header: "Done", accessor: (c) => `${rate(c)}%`, type: "num", width: "80px", sortValue: rate },
  { id: "change", header: "Change", width: "96px", cell: (c) => <Change cycle={c} /> },
]

export function CyclesView(props: ShellViewProps) {
  const project = () => props.shell.loc().frame.item as Project
  const current = CYCLES.find((c) => c.state === "current")!
  const inCycle = () => allIssues().filter((i) => i.project === project().id && i.cycle === current.name)
  const atRisk = () => inCycle().some((i) => i.state === "blocked")
  return (
    <ViewLayout id="demo.cycles" header={<ShellViewHeader />}>
      <div class="dm-page">
        <section class="dm-col">
          <SectionHeading
            title={current.name}
            action={atRisk() ? <State status="warn">At risk</State> : <State status="live">Running</State>}
          />
          <div class="dm-build-stats">
            <Stat label="Completed" value={`${rate(current)}`} unit="%" signal={<Change cycle={current} />} />
            <Stat label="Scope" value={current.scope} unit="pts" />
            <Stat label="Done" value={current.done} unit="pts" />
            <Stat label="Left" value={4} unit="days" caption={`${current.starts} – ${current.ends}`} />
          </div>
        </section>
        <section class="dm-col">
          <SectionHeading title="Issues in the cycle" count={inCycle().length} level={3} />
          <RowList label="Issues in the cycle">
            <For each={inCycle()}>
              {(i) => (
                <ListRow
                  leading={<PriorityIcon priority={i.priority} />}
                  prefix={
                    <>
                      <span>{i.key}</span>
                      <StateIcon state={i.state} />
                    </>
                  }
                  title={i.title}
                  meta={
                    <>
                      <Who id={i.assignee} />
                      <span>{i.estimate ? `${i.estimate} pt` : ""}</span>
                    </>
                  }
                  onClick={() => props.shell.toPlace(undefined, "issues", undefined, i.key)}
                />
              )}
            </For>
          </RowList>
        </section>
        <section class="dm-col">
          <SectionHeading title="All cycles" count={CYCLES.length} level={3} />
          <DataTable label="Cycles" rows={CYCLES} columns={COLUMNS} getRowId={(c) => c.id} />
        </section>
      </div>
    </ViewLayout>
  )
}
