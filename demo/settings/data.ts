// The workspace's settings in memory: members, API keys, webhooks with their deliveries, and the issue fields.
import type { FieldSpec, LabelHue } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { removeFrom } from "../lists"

export type Role = "owner" | "admin" | "member" | "guest"
export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
}

export interface Member {
  id: string
  name: string
  email: string
  hue: LabelHue
  role: Role
  joined: string
  invited?: boolean
}

const [members, setMembers] = createSignal<Member[]>(
  [
    {
      id: "mira",
      name: "Mira Okonkwo",
      email: "mira@acme.dev",
      hue: "orchid",
      role: "owner",
      joined: "2024-03-02",
    },
    {
      id: "jonas",
      name: "Jonas Lindqvist",
      email: "jonas@acme.dev",
      hue: "sky",
      role: "admin",
      joined: "2024-03-09",
    },
    {
      id: "sarah",
      name: "Sarah Chen",
      email: "sarah@acme.dev",
      hue: "amber",
      role: "member",
      joined: "2024-06-21",
    },
    {
      id: "tomas",
      name: "Tomás Ruiz",
      email: "tomas@acme.dev",
      hue: "mint",
      role: "member",
      joined: "2025-01-14",
    },
    {
      id: "kai",
      name: "Kai Nakamura",
      email: "kai@northwind.io",
      hue: "rose",
      role: "guest",
      joined: "2026-10-30",
    },
  ],
  { ownedWrite: true },
)

export { members, setMembers }

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scope: "read" | "write"
  created: string
}
const [keys, setKeys] = createSignal<ApiKey[]>([], { ownedWrite: true })

export { keys, setKeys }

/** A new secret, shown once. Not random enough for anything real: this is the demo. */
export function newSecret(): string {
  const chars = "abcdefghijkmnopqrstuvwxyz23456789"
  let s = ""
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `acme_${s}`
}

export interface Delivery {
  id: string
  event: string
  status: number
  at: string
  ms: number
}

export interface Header {
  name: string
  value: string
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  deliveries: Delivery[]
  headers: Header[]
}

const WEBHOOK_SEED: Webhook[] = [
  {
    id: "deploys-slack",
    name: "Deploys to Slack",
    url: "https://hooks.slack.com/services/T024/B07/acme-deploys",
    events: ["deploy.finished", "deploy.failed"],
    deliveries: [
      { id: "d-981", event: "deploy.failed", status: 502, at: "17:42", ms: 3012 },
      { id: "d-980", event: "deploy.finished", status: 502, at: "17:31", ms: 3004 },
      { id: "d-979", event: "deploy.finished", status: 502, at: "16:58", ms: 3009 },
      { id: "d-978", event: "deploy.finished", status: 200, at: "15:12", ms: 182 },
      { id: "d-977", event: "deploy.failed", status: 200, at: "11:40", ms: 201 },
    ],
    headers: [{ name: "X-Acme-Team", value: "platform" }],
  },
  {
    id: "issues-zapier",
    name: "Issues to Zapier",
    url: "https://hooks.zapier.com/hooks/catch/1182/acme",
    events: ["issue.created", "issue.closed"],
    deliveries: [
      { id: "d-412", event: "issue.created", status: 200, at: "17:20", ms: 240 },
      { id: "d-411", event: "issue.closed", status: 200, at: "14:02", ms: 233 },
    ],
    headers: [],
  },
]
/** The webhooks whose last deliveries failed, until a retry goes through. */
const [failing, setFailing] = createSignal<string[]>(["deploys-slack"], { ownedWrite: true })

export { failing, setFailing }

const [webhooks, setWebhooks] = createSignal<Webhook[]>(WEBHOOK_SEED, { ownedWrite: true })

/** The workspace's webhooks, in the order the person keeps them. */
export { setWebhooks, webhooks }
export const webhookById = (id?: string) => webhooks().find((w) => w.id === id)
/** The failing webhooks that are still there. */
export const failingHooks = () => webhooks().filter((w) => failing().includes(w.id))

let made = 0
/** Adds a webhook with no events yet; returns its id. */
export function addWebhook(name: string): string {
  let id: string
  do id = `hook-${++made}`
  while (webhookById(id))
  setWebhooks((l) => [
    ...l,
    { id, name, url: "https://example.com/hooks/acme", events: [], deliveries: [], headers: [] },
  ])
  return id
}
export const renameWebhook = (id: string, name: string) =>
  setWebhooks((l) => l.map((w) => (w.id === id ? { ...w, name } : w)))
/** Deletes webhooks; returns the undo, which puts them back where they were. */
export const removeWebhooks = (ids: string[]) => removeFrom(webhooks, setWebhooks, (w) => ids.includes(w.id))

/** The custom fields every issue in the workspace has, with a value from WEB-142 to show how each reads. */
export const ISSUE_FIELDS: Array<{ spec: FieldSpec; sample: unknown }> = [
  {
    spec: {
      name: "severity",
      title: "Severity",
      kind: "enum",
      required: true,
      options: [
        { value: "s1", title: "S1", tone: "negative" },
        { value: "s2", title: "S2", tone: "accent" },
        { value: "s3", title: "S3", tone: "neutral" },
      ],
    },
    sample: "s1",
  },
  { spec: { name: "customer", title: "Customer", kind: "text" }, sample: "Northwind" },
  { spec: { name: "arr", title: "ARR at risk", kind: "currency", currency: "EUR" }, sample: 48000 },
  { spec: { name: "due", title: "Due", kind: "date" }, sample: "2026-12-04" },
  { spec: { name: "regression", title: "Regression", kind: "boolean" }, sample: true },
  { spec: { name: "areas", title: "Areas", kind: "tags" }, sample: ["deploy", "arm64"] },
  {
    spec: { name: "confidence", title: "Fix confidence", kind: "number", format: "percent" },
    sample: undefined,
  },
]
