// Settings › Members: who is in the workspace, their roles, invitations and removal.
import {
  Avatar,
  Badge,
  Button,
  type DataColumn,
  DataTable,
  Dialog,
  DropdownMenu,
  FieldFilter,
  type FieldSpec,
  Icon,
  PopoverButton,
  Select,
  type ShellViewProps,
  TextField,
  toast,
} from "@aiviarium/nocturne"
import { createSignal, Show } from "solid-js"
import { type Member, members, ROLE_LABEL, type Role, setMembers } from "./data"
import { SettingsPage } from "./page"

const ROLE_FIELD: FieldSpec = {
  name: "role",
  title: "Role",
  kind: "enum",
  options: (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, title: ROLE_LABEL[r] })),
}
const ROLES = (["admin", "member", "guest"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))

export function MembersView(_: ShellViewProps) {
  const [roles, setRoles] = createSignal<string[]>([])
  const [inviting, setInviting] = createSignal(false)
  const [removing, setRemoving] = createSignal<Member | undefined>()
  const [email, setEmail] = createSignal("")
  const [role, setRole] = createSignal<Role>("member")
  const rows = () => members().filter((m) => !roles().length || roles().includes(m.role))
  const setRoleOf = (id: string, r: Role) =>
    setMembers((all) => all.map((m) => (m.id === id ? { ...m, role: r } : m)))

  const columns: DataColumn<Member>[] = [
    {
      id: "name",
      header: "Member",
      accessor: (m) => m.name,
      sortable: true,
      cell: (m) => (
        <span class="dm-settings-who">
          <Avatar name={m.name} hue={m.hue} size="sm" />
          {m.name}
          <Show when={m.invited}>
            <Badge>Invited</Badge>
          </Show>
        </span>
      ),
    },
    { id: "email", header: "Email", accessor: (m) => m.email, type: "mono" },
    {
      id: "role",
      header: "Role",
      width: "140px",
      accessor: (m) => ROLE_LABEL[m.role],
      cell: (m) =>
        m.role === "owner" ? (
          <span>{ROLE_LABEL.owner}</span>
        ) : (
          <DropdownMenu
            label={`Role of ${m.name}`}
            radio
            matchWidth={false}
            items={ROLES.map((r) => ({ id: r.value, label: r.label, checked: r.value === m.role }))}
            onSelect={(id) => setRoleOf(m.id, id as Role)}
            trigger={(t) => (
              <Button {...t} variant="ghost" size="sm" iconEnd="chevron-down">
                {ROLE_LABEL[m.role]}
              </Button>
            )}
          />
        ),
    },
    {
      id: "joined",
      header: "Joined",
      accessor: (m) => m.joined,
      type: "time",
      width: "112px",
      sortable: true,
    },
  ]

  const invite = () => {
    const address = email().trim()
    if (!address) return
    const name = address.split("@")[0]!
    setMembers((all) => [
      ...all,
      { id: address, name, email: address, hue: "teal", role: role(), joined: "2026-11-27", invited: true },
    ])
    setInviting(false)
    setEmail("")
    toast({ title: `Invited ${address}`, tone: "success" })
  }
  const remove = (m: Member) => {
    const before = members()
    setMembers((all) => all.filter((x) => x.id !== m.id))
    setRemoving(undefined)
    toast({ title: `Removed ${m.name}`, action: { label: "Undo", onClick: () => setMembers(before) } })
  }

  return (
    <SettingsPage
      id="members"
      actions={[{ id: "invite", label: "Invite member", icon: "plus", onClick: () => setInviting(true) }]}
    >
      <DataTable
        label="Members"
        rows={rows()}
        columns={columns}
        getRowId={(m) => m.id}
        toolbar={
          <div class="dm-row">
            <PopoverButton
              label={
                <>
                  <Icon name="filter" size="sm" />
                  {roles().length
                    ? `Role: ${roles()
                        .map((r) => ROLE_LABEL[r as Role])
                        .join(", ")}`
                    : "Role"}
                </>
              }
              placement="bottom-start"
              // PopoverButton's own panel classes have no styles yet: the menu surface stands in (see the report).
              class="nc-menu dm-settings-pop"
            >
              <FieldFilter
                spec={ROLE_FIELD}
                label="Role"
                multiple
                value={roles()}
                onChange={(v) => setRoles((v as string[] | null) ?? [])}
              />
            </PopoverButton>
          </div>
        }
        rowLabel={(m) => m.name}
        rowMenu={(t) => {
          const m = t.rows[0]
          if (!m || t.rows.length > 1 || m.role === "owner") return []
          return [
            {
              id: "email",
              label: "Copy email",
              icon: "copy",
              onSelect: () => toast({ title: "Email copied" }),
            },
            { type: "separator" },
            {
              id: "remove",
              label: "Remove from workspace",
              icon: "trash",
              danger: true,
              onSelect: () => setRemoving(m),
            },
          ]
        }}
        empty={{ title: "No members with these roles", onClearFilters: () => setRoles([]) }}
      />
      <Dialog
        open={inviting()}
        onClose={() => setInviting(false)}
        title="Invite member"
        size="sm"
        closeOnBackdrop={!email()}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <Button onClick={invite} disabled={!email().trim()}>
              Send invite
            </Button>
          </>
        }
      >
        <div class="dm-col">
          <TextField
            label="Email"
            type="email"
            placeholder="name@company.com"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
          <Select label="Role" value={role()} options={ROLES} onChange={setRole} />
        </div>
      </Dialog>
      <Dialog
        open={!!removing()}
        onClose={() => setRemoving(undefined)}
        title={`Remove ${removing()?.name ?? ""}?`}
        description="They lose access to every project in Acme."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(undefined)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => removing() && remove(removing()!)}>
              Remove
            </Button>
          </>
        }
      />
    </SettingsPage>
  )
}
