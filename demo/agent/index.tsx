// The Agent module: the workspace's conversations with the agent and its runs, and the Assistant panel.
import type { ShellScope } from "@aiviarium/nocturne"
import "./agent.css"
import { conversationById, conversations, isStreaming, waitsOnYou } from "./data"
import { ChatDetails, ChatsView, RunsView, startChat } from "./views"

export { assistantPanel } from "./panel"

export const agentModule: ShellScope = {
  id: "agent",
  label: "Agent",
  icon: "agent",
  count: () => conversations().filter(waitsOnYou).length || undefined,
  commands: [{ id: "new-chat", label: "New chat", icon: "plus", run: (shell) => startChat(shell) }],
  places: [
    {
      id: "chats",
      label: "Chats",
      icon: "chat",
      view: ChatsView,
      noun: "chat",
      count: () => conversations().filter((c) => waitsOnYou(c) || isStreaming(c)).length || undefined,
      records: () => conversations().map((c) => ({ id: c.id, label: c.title })),
      recordLabel: (id) => conversationById(id)?.title,
      inspect: (id) => <ChatDetails id={id} />,
    },
    { id: "runs", label: "Runs", icon: "activity", view: RunsView },
  ],
}
