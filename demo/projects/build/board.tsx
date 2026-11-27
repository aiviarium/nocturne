// Build › Board: the project's issues in lanes by state. A click selects a card for the Details panel, a double
// click opens the issue, a card dragged to another lane moves there, and a right click opens the card's menu.
import {
  Board,
  BoardCard,
  BoardCardMeta,
  BoardCardTitle,
  BoardCardTop,
  BoardDrop,
  BoardLane,
  BoardLaneHead,
  ContextMenu,
  IdBadge,
  LabelChip,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  usePhone,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { type IssueState, PEOPLE, type Project, person, STATE_LABEL } from "../../data"
import { PriorityIcon, StateIcon } from "../../glyphs"
import { allIssues, changeIssue } from "./data"
import { runIssueMenu, Who } from "./issues"
import { NewIssueDialog } from "./new-issue"

const LANES: IssueState[] = ["backlog", "todo", "progress", "review", "blocked", "done"]

const projectOf = (shell: ShellRegistry) => shell.loc().frame.item as Project

export function BoardView(props: ShellViewProps) {
  const s = props.shell
  const [dragging, setDragging] = createSignal<{ id: string; height: number }>()
  /** The lane and, grouped by assignee, the row a dragged card is over. */
  const [over, setOver] = createSignal<{ lane: IssueState; row: string; index: number }>()
  const [creating, setCreating] = createSignal(false)
  const [grouped, setByPerson] = createSignal(false)
  const phone = usePhone()
  // A phone's board is already grouped lists, one lane under the other: swimlanes have no room there.
  const byPerson = () => grouped() && !phone()
  const ALL = "*"
  const cardsIn = (lane: IssueState, row = ALL) =>
    allIssues().filter(
      (i) =>
        i.project === projectOf(s).id && i.state === lane && (row === ALL || (i.assignee ?? "none") === row),
    )
  /** The swimlanes: one row per assignee with issues in the project, then the unassigned. */
  const rows = () => {
    const ids = new Set(
      allIssues()
        .filter((i) => i.project === projectOf(s).id)
        .map((i) => i.assignee ?? "none"),
    )
    return [...PEOPLE.map((p) => p.id), "none"].filter((id) => ids.has(id))
  }

  /** Where in the lane the pointer is: the index of the card it is above. */
  const slotAt = (body: HTMLElement, y: number) => {
    const cards = [...body.querySelectorAll<HTMLElement>("[data-part=board-card]")].filter(
      (c) => c.dataset.id !== dragging()?.id,
    )
    const i = cards.findIndex((c) => {
      const r = c.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    return i < 0 ? cards.length : i
  }
  const drop = (lane: IssueState, row: string) => {
    const d = dragging()
    if (d) {
      changeIssue(
        d.id,
        row === ALL ? { state: lane } : { state: lane, assignee: row === "none" ? undefined : row },
      )
    }
    setDragging(undefined)
    setOver(undefined)
  }

  /** One lane, or with `row` one cell of a swimlane (no head of its own: the row of heads above names it). */
  const laneFor = (lane: IssueState, row: string, hideHead: boolean) => {
    const cards = () => cardsIn(lane, row).filter((i) => i.id !== dragging()?.id)
    const slot = () => (over()?.lane === lane && over()?.row === row ? over()!.index : -1)
    let body: HTMLDivElement | undefined
    return (
      <BoardLane
        name={STATE_LABEL[lane]}
        icon={<StateIcon state={lane} label={false} />}
        count={cardsIn(lane, row).length}
        onAdd={() => setCreating(true)}
        addLabel={`New issue in ${STATE_LABEL[lane]}`}
        drop={over()?.lane === lane && over()?.row === row}
        hideHead={hideHead}
        bodyRef={(el) => {
          body = el
        }}
        onDragOver={(e) => {
          if (!dragging()) return
          e.preventDefault()
          setOver({ lane, row, index: body ? slotAt(body, e.clientY) : 0 })
        }}
        onDragLeave={(e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setOver(undefined)
        }}
        onDrop={(e) => {
          e.preventDefault()
          drop(lane, row)
        }}
      >
        <For each={cards()} keyed={(i) => i.id}>
          {(i, index) => (
            <>
              <Show when={slot() === index()}>
                <BoardDrop style={{ height: `${dragging()?.height ?? 64}px` }} />
              </Show>
              <ContextMenu
                label={`Actions for ${i().key}`}
                items={() => [
                  { id: "open", label: "Open", icon: "arrow-up-right" },
                  { id: "details", label: "Show details", icon: "panel-right" },
                  { type: "separator" },
                  ...LANES.filter((l) => l !== i().state).map((l) => ({
                    id: `state:${l}`,
                    label: `Move to ${STATE_LABEL[l]}`,
                    leading: <StateIcon state={l} label={false} />,
                  })),
                  { type: "separator" },
                  { id: "delete", label: "Delete", icon: "trash", danger: true },
                ]}
                onSelect={(id) => runIssueMenu(s, id, [i().key])}
              >
                <BoardCard
                  data-id={i().id}
                  draggable="true"
                  tabindex="0"
                  aria-label={`${i().key} ${i().title}`}
                  selected={s.selection() === i().key}
                  onDragStart={(e) => {
                    e.dataTransfer?.setData("text/plain", i().key)
                    setDragging({
                      id: i().id,
                      height: (e.currentTarget as HTMLElement).offsetHeight,
                    })
                  }}
                  onDragEnd={() => {
                    setDragging(undefined)
                    setOver(undefined)
                  }}
                  onClick={() => s.select(s.selection() === i().key ? undefined : i().key)}
                  onDblClick={() => s.toPlace(undefined, "issues", undefined, i().key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") s.toPlace(undefined, "issues", undefined, i().key)
                  }}
                >
                  <BoardCardTop>
                    <IdBadge>{i().key}</IdBadge>
                    <Who id={i().assignee} />
                  </BoardCardTop>
                  <BoardCardTitle icon={<PriorityIcon priority={i().priority} />}>{i().title}</BoardCardTitle>
                  <BoardCardMeta>
                    <For each={i().labels}>{(l) => <LabelChip hue={l.hue}>{l.name}</LabelChip>}</For>
                    <Show when={i().estimate}>
                      <span class="nc-meta">{i().estimate} pt</span>
                    </Show>
                  </BoardCardMeta>
                </BoardCard>
              </ContextMenu>
            </>
          )}
        </For>
        <Show when={slot() >= cards().length}>
          <BoardDrop style={{ height: `${dragging()?.height ?? 64}px` }} />
        </Show>
      </BoardLane>
    )
  }

  return (
    <ViewLayout
      id="demo.board"
      scroll={false}
      header={
        <ShellViewHeader
          actions={[
            ...(phone()
              ? []
              : [
                  {
                    id: "group",
                    label: "Group by assignee",
                    icon: "users" as const,
                    pressed: byPerson(),
                    onClick: () => setByPerson((v) => !v),
                  },
                ]),
            { id: "new", label: "New issue", icon: "plus", onClick: () => setCreating(true) },
          ]}
        />
      }
    >
      {/* The main column of a `scroll={false}` view is no flex column, so the board's `fill` needs one. */}
      <div class="dm-fill">
        <Show
          when={byPerson()}
          fallback={
            <Board label="Issues by state" fill dragging={!!dragging()}>
              <For each={LANES}>{(lane) => laneFor(lane, ALL, false)}</For>
            </Board>
          }
        >
          <div class="dm-scroll">
            <Board
              label="Issues by assignee and state"
              custom
              dragging={!!dragging()}
              head={
                <div class="dm-build-swim-heads">
                  <For each={LANES}>
                    {(lane) => (
                      <BoardLaneHead
                        class="dm-build-swim-head"
                        name={STATE_LABEL[lane]}
                        icon={<StateIcon state={lane} label={false} />}
                        count={cardsIn(lane).length}
                        onAdd={() => setCreating(true)}
                        addLabel={`New issue in ${STATE_LABEL[lane]}`}
                      />
                    )}
                  </For>
                </div>
              }
            >
              <For each={rows()}>
                {(row) => (
                  <section class="dm-build-swim-row" aria-label={person(row)?.name ?? "No one"}>
                    <div class="dm-build-swim-label">
                      <Who id={row === "none" ? undefined : row} />
                      <span class="label">{person(row)?.name ?? "No one"}</span>
                    </div>
                    <div class="dm-build-swim-lanes">
                      <For each={LANES}>{(lane) => laneFor(lane, row, true)}</For>
                    </div>
                  </section>
                )}
              </For>
            </Board>
          </div>
        </Show>
      </div>
      <NewIssueDialog
        open={creating()}
        project={projectOf(s).id}
        onClose={() => setCreating(false)}
        onCreated={(issue) => s.select(issue.key)}
      />
    </ViewLayout>
  )
}
