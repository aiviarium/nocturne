// The agent's places, which a project's Build lens holds: the project's chats with the agent and its runs. The
// Assistant panel is the workspace's.
import type { ShellPlace } from "@aiviarium/nocturne"
import "./agent.css"
import "./widgets.css"
import type { Project } from "../data"
import { conversationById, conversationsOf, isStreaming, newConversation, waitsOnYou } from "./data"
import { ChatDetails, ChatsView, chatMenu, chatRecord, RunsView } from "./views"

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
    records: (p) => conversationsOf(p.id).map(chatRecord),
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
