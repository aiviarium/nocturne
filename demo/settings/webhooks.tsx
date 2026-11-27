// Settings › Webhooks: the workspace's webhooks, one failing; a webhook's deliveries, settings and headers.
import {
  Button,
  Callout,
  CodeBadge,
  type DataColumn,
  DataList,
  DataListInput,
  DataTable,
  type JsonSchema,
  ListRow,
  RowList,
  SchemaForm,
  type ShellViewProps,
  State,
  TabPanel,
  Tabs,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import { type Delivery, failing, type Header, setFailing, WEBHOOKS, type Webhook, webhookById } from "./data"
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

function WebhookList(props: { shell: ShellViewProps["shell"] }) {
  return (
    <SettingsPage
      id="webhooks"
      actions={[
        {
          id: "new",
          label: "Add webhook",
          icon: "plus",
          onClick: () => toast({ title: "The demo keeps two webhooks" }),
        },
      ]}
    >
      <RowList label="Webhooks">
        <For each={WEBHOOKS}>
          {(w) => (
            <ListRow
              icon="webhook"
              title={w.name}
              secondary={w.url}
              status={failing().includes(w.id) ? <State status="error">Failing</State> : undefined}
              onClick={() => props.shell.toPlace(undefined, "webhooks", undefined, w.id)}
            />
          )}
        </For>
      </RowList>
    </SettingsPage>
  )
}

function WebhookPage(props: { hook: Webhook }) {
  const [tab, setTab] = createSignal("deliveries")
  const [headers, setHeaders] = createSignal<Header[]>(props.hook.headers)
  const retry = () => {
    setFailing((f) => f.filter((id) => id !== props.hook.id))
    toast({ title: "Delivered d-981", description: "hooks.slack.com answered 200.", tone: "success" })
  }
  return (
    <SettingsPage id="webhook">
      <Show when={failing().includes(props.hook.id)}>
        <Callout
          tone="danger"
          code="502"
          action={
            <Button size="sm" variant="secondary" onClick={retry}>
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
