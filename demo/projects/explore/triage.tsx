// Explore › Triage: reports waiting for a decision. Accept makes an issue, Merge folds a likely duplicate into the
// issue it repeats, Decline asks first. Each decision can be undone from its toast.
import {
  ActionSheet,
  Badge,
  Button,
  Callout,
  EmptyState,
  type IconName,
  ListRow,
  MetaLine,
  RowList,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  Split,
  toast,
  usePhone,
  ViewHeader,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { type Project, REPORTS, type Report } from "../../data"

const SOURCE: Record<Report["source"], { icon: IconName; label: string }> = {
  github: { icon: "github", label: "GitHub" },
  slack: { icon: "chat", label: "Slack" },
  email: { icon: "at-sign", label: "Email" },
  agent: { icon: "bot", label: "Agent" },
}

/** Reports are Atlas web's; the other projects' triage is clear. */
const [decided, setDecided] = createSignal<string[]>([], { ownedWrite: true })
export const openReports = (project: string) =>
  project === "atlas" ? REPORTS.filter((r) => !decided().includes(r.id)) : []
const decide = (id: string) => setDecided((d) => [...d, id])
const undo = (id: string) => setDecided((d) => d.filter((x) => x !== id))

let made = 142

function ReportBody(props: { report: Report; onDecide: (verb: "accept" | "merge" | "decline") => void }) {
  const r = () => props.report
  return (
    <article class="dm-page dm-explore-report">
      <div class="dm-row">
        <Button variant="primary" size="sm" icon="check" onClick={() => props.onDecide("accept")}>
          Accept
        </Button>
        <Show when={r().dupe}>
          <Button size="sm" icon="branch" onClick={() => props.onDecide("merge")}>
            Merge into {r().dupe}
          </Button>
        </Show>
        <Button size="sm" variant="ghost" icon="close" onClick={() => props.onDecide("decline")}>
          Decline
        </Button>
      </div>
      <div class="dm-row">
        <Badge icon={SOURCE[r().source].icon}>{SOURCE[r().source].label}</Badge>
        <MetaLine items={[r().from, r().ago]} />
      </div>
      <h1 class="heading dm-explore-flush">{r().title}</h1>
      <p class="dm-explore-flush">{r().body}</p>
      <Show when={r().dupe}>
        <Callout tone="info">Likely a duplicate of {r().dupe}.</Callout>
      </Show>
    </article>
  )
}

export function TriageView(props: ShellViewProps) {
  const s: ShellRegistry = props.shell
  const phone = usePhone()
  const project = () => s.loc().frame.item as Project
  const open = () => openReports(project().id)
  const [picked, setPicked] = createSignal<string>()
  const [pushed, setPushed] = createSignal(false)
  const report = () => open().find((r) => r.id === picked()) ?? (phone() ? undefined : open()[0])
  const [declining, setDeclining] = createSignal<Report>()
  // The report being declined, kept past the sheet's close (it closes before it reports the choice).
  let asked: Report | undefined

  const next = (r: Report) => {
    const list = open()
    const at = list.indexOf(r)
    return list[at + 1] ?? list[at - 1]
  }
  const settle = (r: Report, title: string, action?: { label: string; onClick: () => void }) => {
    const after = next(r)
    decide(r.id)
    setPicked(after?.id)
    if (!after) setPushed(false)
    toast({
      title,
      action: action ?? {
        label: "Undo",
        onClick: () => {
          undo(r.id)
          setPicked(r.id)
        },
      },
    })
  }
  const onDecide = (r: Report, verb: "accept" | "merge" | "decline") => {
    if (verb === "decline") {
      asked = r
      return setDeclining(r)
    }
    if (verb === "merge") return settle(r, `Merged into ${r.dupe}`)
    made += 1
    const key = `WEB-${made}`
    settle(r, `${key} created`, { label: "Undo", onClick: () => undo(r.id) })
  }

  const list = () => (
    <RowList label="Reports">
      <For each={open()} keyed={(r) => r.id}>
        {(r) => (
          <ListRow
            lines={2}
            icon={SOURCE[r().source].icon}
            title={r().title}
            secondary={r().from}
            meta={r().ago}
            selected={!phone() && report()?.id === r().id}
            onClick={() => {
              setPicked(r().id)
              setPushed(true)
            }}
            menuLabel={`Actions for ${r().title}`}
            menu={[
              { id: "accept", label: "Accept", icon: "check" },
              ...(r().dupe
                ? [{ id: "merge", label: `Merge into ${r().dupe}`, icon: "branch" as const }]
                : []),
              { type: "separator" as const },
              { id: "decline", label: "Decline…", icon: "close", danger: true },
            ]}
            onMenuSelect={(id) => onDecide(r(), id as "accept" | "merge" | "decline")}
          />
        )}
      </For>
    </RowList>
  )

  const empty = <EmptyState icon="inbox" title="Triage is clear" />

  return (
    <>
      <Show
        when={phone() && pushed() && report()}
        fallback={
          <ViewLayout id="demo.triage" scroll={phone()} header={<ShellViewHeader />}>
            <Show when={open().length} fallback={empty}>
              <Show when={!phone()} fallback={list()}>
                <Split
                  defaultSize={340}
                  min={260}
                  max={480}
                  label="Resize the list"
                  first={<div class="dm-scroll dm-fill">{list()}</div>}
                  second={
                    <div class="dm-scroll dm-fill">
                      <Show when={report()} keyed>
                        {(r) => <ReportBody report={r} onDecide={(v) => onDecide(r, v)} />}
                      </Show>
                    </div>
                  }
                />
              </Show>
            </Show>
          </ViewLayout>
        }
      >
        {(r) => (
          <ViewLayout
            id="demo.triage"
            header={
              <ViewHeader
                trail={[
                  { id: "triage", label: "Triage", onClick: () => setPushed(false) },
                  { id: "report", label: r().id.toUpperCase() },
                ]}
              />
            }
          >
            <ReportBody report={r()} onDecide={(v) => onDecide(r(), v)} />
          </ViewLayout>
        )}
      </Show>
      <ActionSheet
        open={!!declining()}
        onClose={() => setDeclining(undefined)}
        title="Decline this report?"
        message={declining()?.title}
        actions={[
          { id: "reply", label: "Decline and reply" },
          { id: "decline", label: "Decline", danger: true },
        ]}
        onSelect={(id) => {
          const r = asked
          asked = undefined
          if (r) settle(r, id === "reply" ? "Declined, reply sent" : "Declined")
        }}
      />
    </>
  )
}
