// The agent's places, which a project's Build lens holds: the project's chats with the agent and its runs. The
// Assistant panel is the workspace's.
import { Identicon, type ShellPlace } from "@aiviarium/nocturne"
import "./agent.css"
import "./widgets.css"
import type { Project } from "../data"
import {
  CONTEXT_TOTAL,
  conversationById,
  conversationsOf,
  isStreaming,
  newConversation,
  waitsOnYou,
} from "./data"
import { ChatDetails, ChatsView, chatMenu, RunsView } from "./views"

export { assistantPanel } from "./panel"
export { startChat } from "./views"

export const agentPlaces: ShellPlace<Project>[] = [
  {
    id: "chats",
    label: "Chats",
    icon: "chat",
    view: ChatsView,
    noun: "chat",
    count: (p) => conversationsOf(p.id).filter((c) => waitsOnYou(c) || isStreaming(c)).length || undefined,
    records: (p) =>
      conversationsOf(p.id).map((c) => ({
        id: c.id,
        label: c.title,
        // Every chat its own image: the eye tells them apart where each would show the same chat icon.
        leading: () => <Identicon seed={c.id} />,
        status: isStreaming(c) ? "ai" : waitsOnYou(c) ? "warn" : undefined,
        hover: () => ({
          title: c.title,
          meta: c.updated === "now" ? "Updated just now" : `Updated ${c.updated} ago`,
          rows: [
            {
              label: "State",
              value: isStreaming(c) ? "Working" : waitsOnYou(c) ? "Needs your approval" : "Idle",
            },
            { label: "Context", value: `${Math.round((c.used / CONTEXT_TOTAL) * 100)}% used` },
            { label: "Turns", value: String(c.turns.length) },
          ],
        }),
        meta: c.updated,
      })),
    entries: { create: (p) => newConversation(p.id) },
    recordLabel: (id) => conversationById(id)?.title,
    inspect: (id) => <ChatDetails id={id} />,
    menu: (id) => {
      const c = conversationById(id)
      return c ? chatMenu([c]) : []
    },
    // A conversation's page shows its context and rate beside the transcript.
    covers: (record) => (record ? ["details"] : []),
  },
  { id: "runs", label: "Runs", icon: "activity", view: RunsView },
]
