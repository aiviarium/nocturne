// Explore › Ideas: what people asked for, as cards. Search and filters above them, the number of matches at the
// right; each card's votes open a popover to see who voted and to add or take back a vote.
import {
  Avatar,
  AvatarStack,
  Badge,
  type BadgeTone,
  Button,
  Card,
  EmptyState,
  FilterBar,
  FilterCount,
  Icon,
  LabelChip,
  MetaLine,
  PopoverButton,
  Select,
  ShellViewHeader,
  type ShellViewProps,
  Tabs,
  TextField,
  Truncate,
  toast,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ME, PEOPLE, type Project, person } from "../../data"
import { addIdea, type Idea, type IdeaStatus, ideasOf, removeIdea, toggleVote } from "./data"

const STATUS: Record<IdeaStatus, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "neutral" },
  planned: { label: "Planned", tone: "info" },
  shipped: { label: "Shipped", tone: "success" },
}

const voterOf = (id: string) => {
  const p = person(id)
  return { name: p?.name ?? id, hue: p?.hue }
}

function Votes(props: { idea: Idea }) {
  const mine = () => props.idea.voters.includes(ME.id)
  return (
    <PopoverButton
      triggerClass="nc-btn nc-btn--ghost nc-btn--sm"
      aria-label={`${props.idea.voters.length} votes`}
      label={
        <>
          <Icon name="arrow-up" size="sm" />
          <span class="nc-num">{props.idea.voters.length}</span>
        </>
      }
      placement="top-end"
      title="Votes"
    >
      <For each={props.idea.voters}>
        {(id) => (
          <div class="dm-row">
            <Avatar name={voterOf(id).name} hue={voterOf(id).hue} size="sm" />
            <span>{voterOf(id).name}</span>
          </div>
        )}
      </For>
      <Button
        size="sm"
        variant={mine() ? "secondary" : "primary"}
        icon={mine() ? "minus" : "arrow-up"}
        onClick={() => toggleVote(props.idea.id, ME.id)}
      >
        {mine() ? "Take back my vote" : "Vote"}
      </Button>
    </PopoverButton>
  )
}

let made = 0

export function IdeasView(props: ShellViewProps) {
  const project = () => props.shell.loc().frame.item as Project
  const [q, setQ] = createSignal("")
  const [status, setStatus] = createSignal<"all" | IdeaStatus>("all")
  const [area, setArea] = createSignal("all")
  const all = () => ideasOf(project().id)
  const areas = () => [...new Set(all().map((i) => i.area.name))]
  const shown = () =>
    all()
      .filter((i) => status() === "all" || i.status === status())
      .filter((i) => area() === "all" || i.area.name === area())
      .filter((i) => !q() || i.title.toLowerCase().includes(q().toLowerCase()))
      .sort((a, b) => b.voters.length - a.voters.length)
  const add = () => {
    made += 1
    const idea: Idea = {
      id: `new-${made}`,
      project: project().id,
      title: "Untitled idea",
      area: all()[0]?.area ?? { name: "General", hue: "sky" },
      status: "open",
      author: ME.id,
      voters: [ME.id],
      ago: "now",
    }
    addIdea(idea)
    toast({ title: "Idea added", action: { label: "Undo", onClick: () => removeIdea(idea.id) } })
  }
  return (
    <ViewLayout
      id="demo.ideas"
      header={<ShellViewHeader actions={[{ id: "new", label: "New idea", icon: "plus", onClick: add }]} />}
    >
      <div class="dm-page">
        <FilterBar
          search={
            <TextField
              variant="search"
              label="Search ideas"
              placeholder="Search ideas…"
              value={q()}
              onInput={(e) => setQ(e.currentTarget.value)}
            />
          }
          end={<FilterCount value={shown().length} icon="lightbulb" unit="Ideas" />}
        >
          <Tabs
            label="Status"
            items={[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "planned", label: "Planned" },
              { id: "shipped", label: "Shipped" },
            ]}
            value={status()}
            onChange={(v) => setStatus(v as "all" | IdeaStatus)}
          />
          <Select
            aria-label="Area"
            options={[{ value: "all", label: "Every area" }, ...areas().map((a) => ({ value: a, label: a }))]}
            value={area()}
            onChange={setArea}
          />
        </FilterBar>
        <Show when={shown().length} fallback={<EmptyState icon="lightbulb" title="No ideas match" />}>
          <div class="dm-explore-ideas">
            <For each={shown()} keyed={(i) => i.id}>
              {(i) => (
                <Card
                  fill
                  title={<Truncate text={i().title} lines={2} />}
                  footer={
                    <div class="dm-row dm-explore-card-foot">
                      <AvatarStack people={i().voters.map(voterOf)} max={3} size="sm" />
                      <span class="dm-grow" />
                      <Votes idea={i()} />
                    </div>
                  }
                >
                  <div class="dm-row">
                    <LabelChip hue={i().area.hue}>{i().area.name}</LabelChip>
                    <Show when={i().status !== "open"}>
                      <Badge tone={STATUS[i().status].tone}>{STATUS[i().status].label}</Badge>
                    </Show>
                  </div>
                  <MetaLine items={[person(i().author)?.name ?? PEOPLE[0]!.name, `${i().ago} ago`]} />
                </Card>
              )}
            </For>
          </div>
        </Show>
      </div>
    </ViewLayout>
  )
}
