// The issue board the Board examples share: lanes by state, cards with the key, the assignee, the title and
// the labels, a click selects, and a card dragged to another lane moves there.
import { Avatar, Badge, Board, BoardCard, BoardLane } from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { ISSUES, type Issue, STATE_NAME } from "./issues"

const LANES: Array<{ state: Issue["state"]; hue: string }> = [
  { state: "backlog", hue: "neutral" },
  { state: "todo", hue: "neutral" },
  { state: "progress", hue: "sky" },
  { state: "review", hue: "amber" },
  { state: "blocked", hue: "rose" },
  { state: "done", hue: "mint" },
]

export function IssueBoardExample() {
  const [issues, setIssues] = createSignal(ISSUES)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [dragging, setDragging] = createSignal<string | null>(null)
  const [over, setOver] = createSignal<string | null>(null)
  const move = (id: string, state: Issue["state"]) =>
    setIssues((list) => list.map((i) => (i.id === id ? { ...i, state } : i)))
  return (
    <Board label="Issues" dragging={!!dragging()}>
      <For each={LANES}>
        {(lane) => {
          const cards = () => issues().filter((i) => i.state === lane.state)
          return (
            <BoardLane
              name={STATE_NAME[lane.state]}
              hue={lane.hue}
              count={cards().length}
              onAdd={() => {}}
              addLabel={`New issue in ${STATE_NAME[lane.state]}`}
              drop={over() === lane.state}
              onDragOver={(e) => {
                if (!dragging()) return
                e.preventDefault()
                setOver(lane.state)
              }}
              onDragLeave={(e) => {
                if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setOver(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging()) move(dragging()!, lane.state)
                setDragging(null)
                setOver(null)
              }}
            >
              <For each={cards()}>
                {(i) => (
                  <BoardCard
                    draggable="true"
                    tabindex="0"
                    selected={selected() === i.id}
                    onDragStart={(e) => {
                      setDragging(i.id)
                      e.dataTransfer?.setData("text/plain", i.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelected((s) => (s === i.id ? null : i.id))}
                    top={
                      <>
                        <span class="nc-meta mono">{i.key}</span>
                        <Show when={i.assignee}>
                          <Avatar size="sm" name={i.assignee} />
                        </Show>
                      </>
                    }
                    title={i.title}
                    meta={<For each={i.labels}>{([tone, name]) => <Badge tone={tone}>{name}</Badge>}</For>}
                  />
                )}
              </For>
            </BoardLane>
          )
        }}
      </For>
    </Board>
  )
}
