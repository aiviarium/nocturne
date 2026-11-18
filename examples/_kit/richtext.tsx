// Mock editor services: mentions, previews, uploads, the model call, dictation and one added block type, all
// in memory. An app's real ones talk to its backend.
import type {
  AiRequest,
  BlockViewProps,
  EditorBlockType,
  EditorServices,
  MentionItem,
  RichTextJSON,
} from "@aiviarium/nocturne"

export const PEOPLE: MentionItem[] = [
  { uri: "user://sarah", title: "Sarah Chen", subtitle: "Design", icon: "user" },
  { uri: "user://john", title: "John Carter", subtitle: "Platform", icon: "user" },
  { uri: "user://emma", title: "Emma Wilson", subtitle: "Support", icon: "user" },
  { uri: "doc://runbook", title: "Host setup runbook", subtitle: "Engineering / Runbooks", icon: "file" },
  { uri: "issue://142", title: "Flaky deploy test", subtitle: "WEB-142 · In progress", icon: "list" },
  { uri: "env://build-01", title: "build-01", subtitle: "build host · ready", icon: "server" },
]

/** A block with attributes edited in place. */
function Counter(p: BlockViewProps<{ label: string; count: number }>) {
  return (
    <div class="ex-counter" data-part="counter-block">
      <span class="label">{p.attrs.label}</span>
      <span class="ex-counter__value title">{p.attrs.count}</span>
      <button
        type="button"
        class="nc-btn nc-btn--secondary nc-btn--sm"
        disabled={p.readOnly}
        onClick={() => p.setAttrs({ count: p.attrs.count + 1 })}
      >
        Add one
      </button>
    </div>
  )
}

const BLOCKS: EditorBlockType[] = [
  {
    id: "probe.counter",
    title: "Counter",
    description: "A number you can bump",
    icon: "#",
    plugin: "probe",
    defaults: { label: "Visits", count: 0 },
    component: Counter as never,
    available: true,
  },
  { id: "racks.host", title: "Host status", plugin: "racks", available: false },
]

async function* words(text: string, signal: AbortSignal) {
  for (const w of text.split(/(?<= )/)) {
    if (signal.aborted) return
    await new Promise((r) => setTimeout(r, 45))
    yield w
  }
}

export const SERVICES: EditorServices = {
  searchMentions: async (q) => PEOPLE.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())),
  MentionPreview: (p) => {
    const item = PEOPLE.find((x) => x.uri === p.uri)
    return (
      <div class="ex-preview">
        <span class="label">{item?.title ?? p.label}</span>
        <span class="nc-meta">{item?.subtitle}</span>
        <span class="nc-id">{p.uri}</span>
      </div>
    )
  },
  upload: async (file) => {
    const data = await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.readAsDataURL(file)
    })
    await new Promise((r) => setTimeout(r, 400))
    return { src: data, name: file.name, size: file.size, mime: file.type }
  },
  ai: (req: AiRequest) =>
    words(
      req.selection
        ? "We will create a default workspace and let people rename it later, so nobody stops at a step they do not understand yet."
        : "Next, the template picker pre-fills a first project, so a new user finishes something real in one session.",
      req.signal,
    ),
  dictate: async function* ({ signal }) {
    for (const w of ["Dictated ", "text ", "lands ", "at ", "the ", "cursor. "]) {
      if (signal.aborted) return
      await new Promise((r) => setTimeout(r, 300))
      yield w
    }
  },
  blocks: () => BLOCKS,
}

const t = (text: string, marks?: string[]): RichTextJSON => ({
  type: "text",
  text,
  ...(marks
    ? {
        marks: marks.map((m) =>
          m.startsWith("link:") ? { type: "link", attrs: { href: m.slice(5) } } : { type: m },
        ),
      }
    : {}),
})
const p = (...content: RichTextJSON[]): RichTextJSON => ({ type: "paragraph", content })
const h = (level: number, text: string): RichTextJSON => ({
  type: "heading",
  attrs: { level },
  content: [t(text)],
})
const item = (type: "list_item" | "task_item", text: string, checked?: boolean): RichTextJSON => ({
  type,
  ...(type === "task_item" ? { attrs: { checked: !!checked } } : {}),
  content: [p(t(text))],
})
export const IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    // lint-tokens-ignore-next-line
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180"><rect width="640" height="180" fill="#1b1b22"/><path d="M0 140 L120 90 L240 120 L360 50 L480 80 L640 30" stroke="#8f8ffa" stroke-width="3" fill="none"/></svg>',
  )

export const SAMPLE: RichTextJSON = {
  type: "doc",
  content: [
    h(1, "Host setup runbook"),
    p(
      t("Use this before handing a machine to an agent. Owner "),
      { type: "mention", attrs: { uri: "user://sarah", label: "Sarah Chen" } },
      t(", review "),
      t("every option", ["strong"]),
      t(" in the "),
      t("filter guide", ["link:https://example.com"]),
      t(". Run "),
      t("hostctl apply", ["code"]),
      t(" first."),
    ),
    h(2, "1. Prepare"),
    {
      type: "task_list",
      content: [
        item("task_item", "Pick a deploy target", true),
        item("task_item", "Save the host profile", true),
        item("task_item", "Send secrets and registry logins"),
      ],
    },
    {
      type: "callout",
      attrs: { tone: "warning" },
      content: [
        p(t("Rebooting is refused while sessions run, unless you force it.")),
        { type: "code_block", attrs: { language: "sh" }, content: [t("hostctl reboot build-01 --force")] },
      ],
    },
    {
      type: "blockquote",
      content: [p(t("The operator account is you; the agent account is for the agent."))],
    },
    {
      type: "code_block",
      attrs: { language: "sh" },
      content: [t('# apply the profile\nhostctl apply build-01 --profile "agent"\nhostctl secrets build-01')],
    },
    h(3, "Targets"),
    {
      type: "bullet_list",
      content: [item("list_item", "USB installer"), item("list_item", "Existing server over SSH")],
    },
    {
      type: "ordered_list",
      attrs: { order: 1 },
      content: [item("list_item", "Boot"), item("list_item", "Enrol")],
    },
    {
      type: "table",
      content: [
        {
          type: "table_row",
          content: ["Host", "Target", "Status"].map((c) => ({ type: "table_header", content: [p(t(c))] })),
        },
        {
          type: "table_row",
          content: ["build-01", "SSH", "Ready"].map((c) => ({ type: "table_cell", content: [p(t(c))] })),
        },
        {
          type: "table_row",
          content: ["agent-lab", "Cloud", "Applying"].map((c) => ({
            type: "table_cell",
            content: [p(t(c))],
          })),
        },
      ],
    },
    { type: "horizontal_rule" },
    { type: "image", attrs: { src: IMAGE, alt: "Deploys per day" } },
    { type: "file", attrs: { src: "#", name: "host-profile.toml", size: 2048, mime: "text/plain" } },
    { type: "plugin_block", attrs: { type: "probe.counter", attrs: { label: "Visits", count: 3 } } },
    { type: "plugin_block", attrs: { type: "racks.host", attrs: { host: "build-01" } } },
    p(t("Select text for the format bar, type / for blocks and @ to mention.")),
  ],
}
