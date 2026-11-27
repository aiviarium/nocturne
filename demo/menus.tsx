// What the record menus share: the shell they navigate with, the dialog that names a thing, the link to copy and
// the toast with Undo. A record has one menu, built once per kind, which its list and its sidebar entry both open.
import { Button, Dialog, type RowMenuEntry, type ShellRegistry, TextField, toast } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"

let current: ShellRegistry | undefined
/** The demo's shell, set by `DemoApp`: a place's `menu` is given no shell of its own. */
export const setDemoShell = (shell: ShellRegistry) => {
  current = shell
}
export const demoShell = (): ShellRegistry => {
  if (!current) throw new Error("demoShell before DemoApp")
  return current
}

/** Copies the demo's address `path` (the current one by default) and says so. */
export function copyLink(what: string, path = demoShell().address()) {
  void navigator.clipboard?.writeText(`${location.origin}${location.pathname}#${path}`).catch(() => {})
  toast({ title: "Link copied", description: what })
}

/** Says something was removed, with Undo. */
export function undoable(title: string, undo: () => void) {
  toast({ title, action: { label: "Undo", onClick: undo } })
}

/** “Atlas web”, or “3 projects”. */
export const named = (names: string[], noun: string) =>
  names.length === 1 ? `“${names[0]}”` : `${names.length} ${noun}`

/**
 * A record's menu as its list shows it: Rename is the row's own, edited in place, so its `onSelect` (the dialog
 * the sidebar opens) goes and the list renames the row.
 */
export const inList = (entries: RowMenuEntry[]): RowMenuEntry[] =>
  entries.map((e) => {
    if ((e.type ?? "item") !== "item" || (e as { id: string }).id !== "rename") return e
    const { onSelect: _, ...rest } = e as RowMenuEntry & { onSelect?: () => void }
    return rest as RowMenuEntry
  })

/** The Rename entry: F2 in a list. */
export const renameEntry = (onSelect: () => void): RowMenuEntry => ({
  id: "rename",
  label: "Rename",
  icon: "edit",
  shortcut: "F2",
  onSelect,
})

// ── Naming ──────────────────────────────────────────────────────────────────────────────────────────

interface Ask {
  title: string
  value: string
  submit: string
  onSubmit: (name: string) => void
}

const [asking, setAsking] = createSignal<Ask | undefined>(undefined, { ownedWrite: true })
const [name, setName] = createSignal("", { ownedWrite: true })

/** Asks for a name in a dialog: to rename a thing from the sidebar, or to name a new one. */
export const askName = (ask: Ask) => {
  setName(ask.value)
  setAsking(ask)
}

/** The dialog `askName` opens. `DemoApp` draws it once. */
export function NameDialog() {
  const close = () => setAsking(undefined)
  const submit = () => {
    const a = asking()
    const v = name().trim()
    if (!a || !v) return
    close()
    a.onSubmit(v)
  }
  return (
    <Dialog
      open={!!asking()}
      onClose={close}
      title={asking()?.title ?? ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!name().trim()} onClick={submit}>
            {asking()?.submit ?? "Save"}
          </Button>
        </>
      }
    >
      <form
        class="dm-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <TextField label="Name" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
      </form>
    </Dialog>
  )
}
