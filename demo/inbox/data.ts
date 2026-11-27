// The inbox: what needs Mira, each about an issue of the shared scenario. Read state is a signal so the sidebar's
// count and the rows follow it.
import { createSignal } from "solid-js"

export interface Notice {
  id: string
  issue: string
  who: string
  what: string
  ago: string
  /** Events folded into the row, such as several comments in a thread. */
  events: number
}

export const NOTICES: Notice[] = [
  { id: "n1", issue: "142", who: "jonas", what: "mentioned you", ago: "12m", events: 3 },
  { id: "n2", issue: "139", who: "sarah", what: "asked for your review", ago: "3h", events: 1 },
  { id: "n3", issue: "138", who: "tomas", what: "moved it to In progress", ago: "4h", events: 1 },
  { id: "n4", issue: "141", who: "jonas", what: "replied to your comment", ago: "6h", events: 2 },
  { id: "n5", issue: "128", who: "sarah", what: "closed the issue", ago: "4d", events: 1 },
]

const [unread, setUnread] = createSignal<string[]>(["n1", "n2", "n3", "n4"], { ownedWrite: true })

export { unread }
export const isUnread = (id: string) => unread().includes(id)
export const markRead = (ids: string[]) => setUnread((u) => u.filter((x) => !ids.includes(x)))
export const markUnread = (id: string) => setUnread((u) => (u.includes(id) ? u : [...u, id]))
