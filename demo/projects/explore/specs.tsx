// Product › Specs: a project's specs, and one open in the rich text editor. The specs are the place's records, so
// the header shows "Specs / First-run onboarding ⌄" with a switcher and the stepper. The editor's services are
// fakes here: mentions of people, issues and specs, `[[` links between specs, uploads kept as object URLs, a
// writing assistant and dictation on timers. Links inside the app go through the shell, by `LinkProvider`.
import {
  type AiRequest,
  Avatar,
  Button,
  type EditorServices,
  EditorServicesProvider,
  EmptyState,
  LinkProvider,
  ListRow,
  type MentionItem,
  parseMarkdown,
  RichTextEditor,
  type RichTextJSON,
  type RowKey,
  RowList,
  type RowMenuEntry,
  type ShellPlace,
  type ShellRegistry,
  ShellViewHeader,
  type ShellViewProps,
  toast,
  toMarkdown,
  ViewLayout,
} from "@aiviarium/nocturne"
import { createMemo, createSignal, Show } from "solid-js"
import { issueByKey, issues, ME, PEOPLE, type Project, person } from "../../data"
import { askName, copyLink, demoShell, inList, named, renameEntry, undoable } from "../../menus"
import { addSpec, moveSpec, nextSpecId, removeSpecs, renameSpec, type Spec, specById, specsOf } from "./data"

const projectOf = (s: ShellRegistry) => s.loc().frame.item as Project

/** Each spec's document once someone edits it; until then its Markdown. */
const docs = new Map<string, RichTextJSON>()
const docOf = (spec: Spec): RichTextJSON => {
  let d = docs.get(spec.id)
  if (!d) {
    d = parseMarkdown(spec.body).toJSON() as RichTextJSON
    docs.set(spec.id, d)
  }
  return d
}

async function* words(text: string, signal: AbortSignal, ms = 40) {
  for (const w of text.split(/(?<= )/)) {
    if (signal.aborted) return
    await new Promise((r) => setTimeout(r, ms))
    yield w
  }
}

const specItem = (s: Spec): MentionItem => ({
  uri: `spec://${s.id}`,
  title: s.title,
  subtitle: "Spec",
  icon: "book-open",
})

/** The services, in memory, for the specs of the project the shell is in. */
function services(shell: ShellRegistry): EditorServices {
  const project = () => projectOf(shell)
  const goSpec = (id: string) => shell.toPlace(undefined, "specs", undefined, id)
  return {
    searchMentions: async (q) => {
      const needle = q.toLowerCase()
      const people: MentionItem[] = PEOPLE.map((p) => ({
        uri: `user://${p.id}`,
        title: p.name,
        subtitle: "Person",
        icon: "user",
      }))
      const found: MentionItem[] = issues()
        .filter((i) => i.project === project().id)
        .map((i) => ({ uri: `issue://${i.key}`, title: i.title, subtitle: i.key, icon: "list-todo" }))
      return [...people, ...found, ...specsOf(project().id).map(specItem)]
        .filter((m) => m.title.toLowerCase().includes(needle) || m.subtitle?.toLowerCase().includes(needle))
        .slice(0, 8)
    },
    MentionPreview: (p) => {
      const [kind, id] = p.uri.split("://") as [string, string]
      const issue = kind === "issue" ? issueByKey(id) : undefined
      return (
        <div class="dm-col dm-explore-preview">
          <span class="label">{issue?.title ?? person(id)?.name ?? specById(id)?.title ?? p.label}</span>
          <span class="nc-meta">
            {issue ? `${issue.key} · ${issue.state}` : kind === "user" ? "Person" : "Spec"}
          </span>
        </div>
      )
    },
    openMention: (uri) => {
      const [kind, id] = uri.split("://") as [string, string]
      if (kind === "issue") {
        const i = issueByKey(id)
        if (i) shell.go(`/projects/${i.project}/explore/issues/${i.key}`)
      } else if (kind === "spec") goSpec(id)
      else if (kind === "user")
        toast({ title: person(id)?.name ?? id, description: "Profiles aren't in the demo." })
    },
    upload: async (file) => {
      await new Promise((r) => setTimeout(r, 300))
      return { src: URL.createObjectURL(file), name: file.name, size: file.size, mime: file.type }
    },
    ai: (req: AiRequest) =>
      words(
        req.selection
          ? "A new workspace starts from a template, so nobody lands on an empty board."
          : "The first project comes with three example issues, each one a step of the tour.",
        req.signal,
      ),
    dictate: ({ signal }) => words("Templates keep their own labels and states. ", signal, 260),
    links: {
      search: async (q) =>
        specsOf(project().id)
          .filter((s) => s.title.toLowerCase().includes(q.toLowerCase()))
          .map(specItem),
      create: async (title) => {
        const spec: Spec = {
          id: nextSpecId(),
          project: project().id,
          title,
          owner: ME.id,
          updated: "now",
          body: `# ${title}\n`,
        }
        addSpec(spec)
        return specItem(spec)
      },
    },
  }
}

const pathOf = (s: Spec) => `/projects/${s.project}/product/specs/${s.id}`

const remove = (list: Spec[]) => {
  const shell = demoShell()
  const ids = list.map((s) => s.id)
  if (shell.loc().place?.id === "specs" && ids.includes(shell.loc().record ?? ""))
    shell.toPlace(undefined, "specs")
  undoable(
    `Deleted ${named(
      list.map((s) => s.title),
      "specs",
    )}`,
    removeSpecs(ids),
  )
}

/** The menu of a spec, or of several: in the list of specs and on its entry in the sidebar. */
export function specMenu(list: Spec[]): RowMenuEntry[] {
  const sp = list[0]
  if (!sp) return []
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
    { id: "open", label: "Open", icon: "arrow-up-right", onSelect: () => demoShell().go(pathOf(sp)) },
    { id: "copy", label: "Copy link", icon: "link", onSelect: () => copyLink(sp.title, pathOf(sp)) },
    renameEntry(() =>
      askName({
        title: "Rename spec",
        value: sp.title,
        submit: "Rename",
        onSubmit: (title) => renameSpec(sp.id, title),
      }),
    ),
    { type: "separator" },
    { id: "delete", label: "Delete", icon: "trash", danger: true, onSelect: () => remove([sp]) },
  ]
}

function SpecList(props: { shell: ShellRegistry }) {
  const project = () => projectOf(props.shell)
  const [selected, setSelected] = createSignal<RowKey[]>([])
  return (
    <Show
      when={specsOf(project().id).length}
      fallback={
        <EmptyState icon="book-open" title="No specs yet">
          <Button variant="secondary" icon="plus" onClick={() => newSpec(props.shell)}>
            New spec
          </Button>
        </EmptyState>
      }
    >
      <RowList
        label="Specs"
        items={specsOf(project().id)}
        getKey={(s) => s.id}
        itemLabel={(s) => s.title}
        selectable
        selected={selected()}
        onSelectedChange={setSelected}
        onReorder={(from, to) => moveSpec(project().id, from, to)}
        onRemove={(keys) => removeSpecs(keys as string[])}
        rowMenu={(t) => inList(specMenu(t.items))}
      >
        {(s) => (
          <ListRow
            icon="file"
            title={s.title}
            href={pathOf(s)}
            meta={
              <>
                <Avatar name={person(s.owner)?.name ?? ""} hue={person(s.owner)?.hue} size="sm" />
                <span>{s.updated}</span>
              </>
            }
            onRename={(title) => renameSpec(s.id, title)}
          />
        )}
      </RowList>
    </Show>
  )
}

function newSpec(shell: ShellRegistry) {
  const project = projectOf(shell)
  const spec: Spec = {
    id: nextSpecId(),
    project: project.id,
    title: "Untitled spec",
    owner: ME.id,
    updated: "now",
    body: "# Untitled spec\n",
  }
  addSpec(spec)
  shell.toPlace(undefined, "specs", undefined, spec.id)
}

export function SpecsView(props: ShellViewProps) {
  const s = props.shell
  const spec = createMemo(() => specById(s.loc().record))
  const copy = async () => {
    const sp = spec()
    if (!sp) return
    try {
      await navigator.clipboard.writeText(toMarkdown(docOf(sp)))
      toast({ title: "Copied as Markdown", tone: "success" })
    } catch {
      toast({ title: "The clipboard isn't available here", tone: "warning" })
    }
  }
  return (
    <LinkProvider navigate={(href) => s.go(href)}>
      <EditorServicesProvider value={services(s)}>
        <ViewLayout
          id="demo.specs"
          reading={spec() ? 760 : undefined}
          header={
            <ShellViewHeader
              actions={
                spec()
                  ? [{ id: "copy", label: "Copy as Markdown", icon: "copy", onClick: copy }]
                  : [{ id: "new", label: "New spec", icon: "plus", onClick: () => newSpec(s) }]
              }
            />
          }
        >
          <Show when={spec()} fallback={<SpecList shell={s} />}>
            {(sp) => (
              <div class="dm-explore-doc">
                <RichTextEditor
                  value={docOf(sp())}
                  onChange={(d) => docs.set(sp().id, d)}
                  aria-label={sp().title}
                  placeholder="Write the spec"
                  onError={(m) => toast({ title: m, tone: "danger" })}
                />
              </div>
            )}
          </Show>
        </ViewLayout>
      </EditorServicesProvider>
    </LinkProvider>
  )
}

/** The place: its records are the project's specs, in the list's order. */
export const specsPlace: ShellPlace<Project> = {
  id: "specs",
  label: "Specs",
  icon: "book-open",
  view: SpecsView,
  noun: "spec",
  records: (p) => specsOf(p.id).map((sp) => ({ id: sp.id, label: sp.title, icon: "file", meta: sp.updated })),
  recordLabel: (id) => specById(id)?.title,
  entries: true,
  menu: (id) => {
    const sp = specById(id)
    return sp ? specMenu([sp]) : []
  },
}
