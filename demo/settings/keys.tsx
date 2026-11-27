// Settings › API keys: none at first, then the keys by name. A new key's secret is shown once.
import {
  Button,
  DataList,
  DataListInput,
  Dialog,
  EmptyState,
  IconButton,
  RadioGroup,
  type ShellViewProps,
  TextField,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import { type ApiKey, keys, newSecret, setKeys } from "./data"
import { SettingsPage } from "./page"

export function KeysView(_: ShellViewProps) {
  const [creating, setCreating] = createSignal(false)
  const [name, setName] = createSignal("")
  const [scope, setScope] = createSignal<"read" | "write">("read")
  const [secret, setSecret] = createSignal<string | undefined>()

  const open = () => {
    setName("")
    setScope("read")
    setSecret(undefined)
    setCreating(true)
  }
  const create = () => {
    const s = newSecret()
    setKeys((all) => [
      ...all,
      {
        id: s.slice(-8),
        name: name().trim() || "Untitled key",
        prefix: `${s.slice(0, 9)}…`,
        scope: scope(),
        created: "Today",
      },
    ])
    setSecret(s)
  }
  const copy = () => {
    void navigator.clipboard?.writeText(secret() ?? "").catch(() => {})
    toast({ title: "Key copied", tone: "success", duration: 2000 })
  }

  return (
    <SettingsPage
      id="keys"
      actions={keys().length ? [{ id: "new", label: "Create key", icon: "plus", onClick: open }] : undefined}
    >
      <Show
        when={keys().length}
        fallback={
          <EmptyState icon="key-round" title="No API keys">
            <Button variant="secondary" onClick={open}>
              Create key
            </Button>
          </EmptyState>
        }
      >
        <DataList<ApiKey>
          label="API keys"
          itemName="Key"
          variant="table"
          value={keys()}
          onChange={setKeys}
          getKey={(k) => k.id}
          // Keys come from the dialog, which shows the secret once: the list has no add row.
          max={keys().length}
          reorderable={false}
          itemLabel={(k) => k.name || "Untitled key"}
          rowMenu={(t) => [
            {
              id: "delete",
              label: t.items.length > 1 ? `Revoke ${t.items.length}` : "Revoke",
              icon: "trash",
              danger: true,
            },
          ]}
        >
          {(k, set) => (
            <div class="dm-settings-key">
              <DataListInput
                label={`Name of ${k().name || "key"}`}
                value={k().name}
                onInput={(v) => set({ ...k(), name: v })}
              />
              <span class="nc-meta nc-mono">{k().prefix}</span>
              <span class="nc-meta">{k().scope === "write" ? "Read and write" : "Read only"}</span>
              <span class="nc-meta">{k().created}</span>
            </div>
          )}
        </DataList>
      </Show>
      <Dialog
        open={creating()}
        onClose={() => setCreating(false)}
        title={secret() ? "Copy your key" : "Create key"}
        description={secret() ? "It is shown once. Store it somewhere safe." : undefined}
        size="sm"
        closeOnBackdrop={false}
        footer={
          <Show
            when={secret()}
            fallback={
              <>
                <Button variant="secondary" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={create}>Create</Button>
              </>
            }
          >
            <Button onClick={() => setCreating(false)}>Done</Button>
          </Show>
        }
      >
        <Show
          when={secret()}
          fallback={
            <div class="dm-col">
              <TextField
                label="Name"
                placeholder="CI deploys"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
              />
              <RadioGroup
                label="Access"
                value={scope()}
                onChange={setScope}
                vertical
                options={[
                  { value: "read", label: "Read only" },
                  { value: "write", label: "Read and write" },
                ]}
              />
            </div>
          }
        >
          {(s) => (
            <div class="dm-row">
              <TextField aria-label="API key" class="dm-grow" mono readonly value={s()} />
              <IconButton icon="copy" label="Copy key" onClick={copy} />
            </div>
          )}
        </Show>
      </Dialog>
    </SettingsPage>
  )
}
