// The workspace's settings: one place per page. Webhooks has records, so a webhook gets a trail and a stepper.
import type { ShellScope } from "@aiviarium/nocturne"
import { AppearanceView } from "./appearance"
import { failingHooks, webhookById, webhooks } from "./data"
import { FieldsView } from "./fields"
import { GeneralView } from "./general"
import { KeysView } from "./keys"
import { MembersView } from "./members"
import { ProfileView } from "./profile"
import "./settings.css"
import { ShortcutsView } from "./shortcuts"
import { WebhooksView, webhookMenu } from "./webhooks"

export const settingsModule: ShellScope = {
  id: "settings",
  label: "Settings",
  icon: "settings",
  places: [
    { id: "general", label: "General", icon: "settings", view: GeneralView },
    { id: "profile", label: "Profile", icon: "user", view: ProfileView },
    { id: "appearance", label: "Appearance", icon: "monitor", view: AppearanceView },
    { id: "members", label: "Members", icon: "users", view: MembersView },
    { id: "fields", label: "Issue fields", icon: "list-checks", view: FieldsView },
    { id: "keys", label: "API keys", icon: "key-round", view: KeysView },
    {
      id: "webhooks",
      label: "Webhooks",
      icon: "webhook",
      view: WebhooksView,
      noun: "webhook",
      count: () => failingHooks().length,
      records: () => webhooks().map((w) => ({ id: w.id, label: w.name, icon: "webhook" })),
      recordLabel: (id) => webhookById(id)?.name,
      entries: true,
      menu: (id) => {
        const w = webhookById(id)
        return w ? webhookMenu([w]) : []
      },
    },
    { id: "shortcuts", label: "Keyboard shortcuts", icon: "keyboard", view: ShortcutsView },
  ],
}
