// Settings › Webhooks: the workspace's webhooks, one failing; a webhook's deliveries, settings and headers.
import {
  Button,
  Callout,
  CodeBadge,
  type DataColumn,
  DataList,
  DataListInput,
  DataTable,
  EmptyState,
  type JsonSchema,
  ListRow,
  type RowKey,
  RowList,
  type RowMenuEntry,
  reorderItems,
  SchemaForm,
  type ShellViewProps,
  State,
  TabPanel,
  Tabs,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import { askName, copyLink, demoShell, inList, named, renameEntry, undoable } from "../menus"
import {
  addWebhook,
  type Delivery,
  failing,
  type Header,
  providerOf,
  removeWebhooks,
  renameWebhook,
  setFailing,
  setWebhooks,
  type Webhook,
  webhookById,
  webhooks,
} from "./data"
import { SettingsPage } from "./page"

const EVENTS = ["deploy.finished", "deploy.failed", "issue.created", "issue.closed", "review.requested"]

const SCHEMA: JsonSchema = {
  type: "object",
  required: ["url", "events"],
  properties: {
    url: { type: "string", format: "uri", title: "Payload URL" },
    events: { type: "array", title: "Events", items: { enum: EVENTS }, uniqueItems: true },
    secret: { type: "string", title: "Signing secret", description: "Signs each payload with HMAC SHA-256." },
    retries: { type: "integer", title: "Retries", minimum: 0, maximum: 10, default: 3 },
    active: { type: "boolean", title: "Active", default: true },
  },
}

const DELIVERIES: DataColumn<Delivery>[] = [
  {
    id: "status",
    header: "Status",
    width: "88px",
    accessor: (d) => d.status,
    cell: (d) =>
      d.status >= 400 ? <CodeBadge>{d.status}</CodeBadge> : <span class="nc-meta">{d.status}</span>,
  },
  { id: "event", header: "Event", accessor: (d) => d.event, type: "mono" },
  { id: "id", header: "Delivery", accessor: (d) => d.id, type: "mono", width: "96px" },
  {
    id: "ms",
    header: "Duration",
    accessor: (d) => d.ms,
    type: "num",
    width: "96px",
    cell: (d) => `${d.ms} ms`,
  },
  { id: "at", header: "Sent", accessor: (d) => d.at, type: "time", width: "80px" },
]

const pathOf = (w: Webhook) => `/settings/webhooks/${w.id}`

const remove = (list: Webhook[]) => {
  const shell = demoShell()
  const ids = list.map((w) => w.id)
  if (shell.loc().place?.id === "webhooks" && ids.includes(shell.loc().record ?? ""))
    shell.toPlace(undefined, "webhooks")
  undoable(
    `Deleted ${named(
      list.map((w) => w.name),
      "webhooks",
    )}`,
    removeWebhooks(ids),
  )
}
const retry = (w: Webhook) => {
  setFailing((f) => f.filter((id) => id !== w.id))
  toast({ title: "Delivered d-981", description: "hooks.slack.com answered 200.", tone: "success" })
}

/** The menu of a webhook, or of several: in the list of webhooks and on its entry in the sidebar. */
export function webhookMenu(list: Webhook[]): RowMenuEntry[] {
  const w = list[0]
  if (!w) return []
  if (list.length > 1)
    return [
      { type: "label", label: `${list.length} selected` },
      {
        id: "delete",
        label: `Delete ${list.length}`,
        icon: "trash",
        danger: true,
        onSelect: () => remove(list),
      },
    ]
  return [
    { id: "open", label: "Open", icon: "arrow-up-right", onSelect: () => demoShell().go(pathOf(w)) },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(w.name, pathOf(w)) },
    renameEntry(() =>
      askName({
        title: "Rename webhook",
        value: w.name,
        submit: "Rename",
        onSubmit: (name) => renameWebhook(w.id, name),
      }),
    ),
    ...(failing().includes(w.id)
      ? [{ id: "retry", label: "Retry delivery", icon: "rotate-ccw", onSelect: () => retry(w) } as const]
      : []),
    { type: "separator" },
    { id: "delete", label: "Delete", icon: "trash", danger: true, onSelect: () => remove([w]) },
  ]
}

const newWebhook = () =>
  askName({
    title: "Add webhook",
    value: "",
    submit: "Add webhook",
    onSubmit: (name) => demoShell().toPlace(undefined, "webhooks", undefined, addWebhook(name)),
  })

function WebhookList(props: { shell: ShellViewProps["shell"] }) {
  const [selected, setSelected] = createSignal<RowKey[]>([])
  return (
    <SettingsPage
      id="webhooks"
      actions={[{ id: "new", label: "Add webhook", icon: "plus", onClick: newWebhook }]}
    >
      <Show
        when={webhooks().length}
        fallback={
          <EmptyState title="No webhooks">
            <Button variant="secondary" icon="plus" onClick={newWebhook}>
              Add webhook
            </Button>
          </EmptyState>
        }
      >
        <RowList
          label="Webhooks"
          items={webhooks()}
          getKey={(w) => w.id}
          itemLabel={(w) => w.name}
          selectable
          selected={selected()}
          onSelectedChange={setSelected}
          onReorder={(from, to) => setWebhooks(reorderItems(webhooks(), from, to))}
          onRemove={(keys) => removeWebhooks(keys as string[])}
          rowMenu={(t) => inList(webhookMenu(t.items))}
        >
          {(w) => (
            <ListRow
              // Where it delivers, not the page's webhook icon on every row.
              icon={providerOf(w.url).icon}
              title={w.name}
              secondary={w.url}
              status={failing().includes(w.id) ? <State status="error">Failing</State> : undefined}
              onClick={() => props.shell.toPlace(undefined, "webhooks", undefined, w.id)}
              onRename={(name) => renameWebhook(w.id, name)}
            />
          )}
        </RowList>
      </Show>
    </SettingsPage>
  )
}

function WebhookPage(props: { hook: Webhook }) {
  const [tab, setTab] = createSignal("deliveries")
  const [headers, setHeaders] = createSignal<Header[]>(props.hook.headers)
  return (
    <SettingsPage id="webhook">
      <Show when={failing().includes(props.hook.id)}>
        <Callout
          tone="danger"
          code="502"
          action={
            <Button size="sm" variant="secondary" onClick={() => retry(props.hook)}>
              Retry
            </Button>
          }
        >
          The last 3 deliveries failed: hooks.slack.com answered Bad gateway.
        </Callout>
      </Show>
      <Tabs
        variant="underline"
        label="Webhook"
        value={tab()}
        onChange={setTab}
        items={[
          { id: "deliveries", label: "Deliveries", count: props.hook.deliveries.length },
          { id: "settings", label: "Settings" },
          { id: "headers", label: "Headers", count: headers().length || undefined },
        ]}
      >
        <TabPanel id="deliveries">
          <DataTable
            label="Deliveries"
            rows={props.hook.deliveries}
            columns={DELIVERIES}
            getRowId={(d) => d.id}
          />
        </TabPanel>
        <TabPanel id="settings">
          <div class="dm-settings-form">
            <SchemaForm
              schema={SCHEMA}
              value={{ url: props.hook.url, events: props.hook.events, retries: 3, active: true }}
              secretFields={["secret"]}
              storedSecrets={["secret"]}
              submitLabel="Save webhook"
              onSubmit={() => toast({ title: "Webhook saved", tone: "success" })}
            />
          </div>
        </TabPanel>
        <TabPanel id="headers">
          <DataList<Header>
            label="Headers"
            itemName="Header"
            variant="table"
            value={headers()}
            onChange={setHeaders}
            create={() => ({ name: "", value: "" })}
            itemLabel={(h, i) => h.name || `Header ${i + 1}`}
            invalid={(h) =>
              h.name && !/^[A-Za-z0-9-]+$/.test(h.name) ? "Letters, digits and dashes only" : undefined
            }
          >
            {(h, set) => (
              <div class="dm-settings-header">
                <DataListInput
                  mono
                  label="Name"
                  placeholder="X-Header"
                  value={h().name}
                  onInput={(v) => set({ ...h(), name: v })}
                />
                <DataListInput
                  mono
                  label="Value"
                  placeholder="value"
                  value={h().value}
                  onInput={(v) => set({ ...h(), value: v })}
                />
              </div>
            )}
          </DataList>
        </TabPanel>
      </Tabs>
    </SettingsPage>
  )
}

/** Settings › Webhooks: the list, or the webhook the address names. */
export function WebhooksView(props: ShellViewProps) {
  const hook = () => webhookById(props.shell.loc().record)
  return (
    <Show when={hook()} keyed fallback={<WebhookList shell={props.shell} />}>
      {(h) => <WebhookPage hook={h} />}
    </Show>
  )
}
