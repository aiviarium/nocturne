import { createEffect, createMemo, createSignal, For, type JSX, on, Show, untrack } from "solid-js"
import { FieldFilter, specOfQueryField } from "../fields/Field"
import { createControllable } from "../lib/controllable"
import { cx } from "../lib/cx"
import { trapTab } from "../lib/focus"
import { usePhone } from "../lib/phone"
import {
  createQueryId,
  defaultOperator,
  describeRule,
  emptyQuery,
  isComplete,
  isGroup,
  operatorInfo,
  operatorsFor,
  parseQueryText,
  printQueryText,
  type QueryField,
  type QueryFormat,
  type QueryGroup,
  type QueryNode,
  type QueryOperator,
  type QueryRule,
  type QueryValue,
  ruleText,
  valueForOperator,
} from "../lib/query"
import { Button } from "./Button"
import { Icon, type IconName } from "./Icon"
import { IconButton } from "./IconButton"
import { InsetGroup, InsetList, InsetRow } from "./InsetList"
import { DropdownMenu } from "./Menu"
import { Popover } from "./Popover"
import { customPicker, type QueryPickerContext, ValueEditor } from "./query-editors"
import { Select } from "./Select"
import { Sheet } from "./Sheet"
import { Tabs } from "./Tabs"
import { TextField } from "./TextField"

export type { QueryPickerContext } from "./query-editors"

export interface QueryBuilderProps {
  /** The fields a rule can filter on, with their types: text, number, date, enum, boolean, person, relation. */
  fields: QueryField[]
  /** The query. Controlled when set; keep the ids `onChange` gives back, they key the chips. */
  value?: QueryGroup
  /** Initial query when uncontrolled. */
  defaultValue?: QueryGroup
  /** Called with the whole query on every edit. Convert it for the store with `toWhere`. */
  onChange?: (query: QueryGroup) => void
  /** Accessible name of the chip row. Default "Filters". */
  label?: string
  /**
   * `chips` (default): one chip per rule for a FilterBar, each opening a popover, "Filter" to add one and
   * "Advanced" for the grouped builder. `builder`: the grouped builder in place, for a panel or a dialog.
   */
  variant?: "chips" | "builder"
  /** Offer AND/OR groups (one level deep) in the builder. Default on. */
  groups?: boolean
  /** Offer the text form (the Projects query bar's syntax) in the advanced view. Default on. */
  textMode?: boolean
  /** The text field that free words in the text form search. Default the first text field. */
  textField?: string
  /**
   * A picker for `person` and `relation` values (people with avatars, an entity search). Return nothing for a
   * field it does not handle, and the default list of the field's options shows.
   */
  renderPicker?: (ctx: QueryPickerContext) => JSX.Element
  /** How dates and numbers read in chips. */
  format?: QueryFormat
  class?: string
}

// ── tree edits ───────────────────────────────────────────────────────────────────────────────────────

function withIds(g: QueryGroup): QueryGroup {
  let changed = !g.id
  const rules = g.rules.map((n) => {
    const next = isGroup(n) ? withIds(n) : n.id ? n : { ...n, id: createQueryId() }
    if (next !== n) changed = true
    return next
  })
  return changed ? { ...g, id: g.id ?? createQueryId(), rules } : g
}

function mapRules(g: QueryGroup, fn: (n: QueryNode) => QueryNode | null): QueryGroup {
  return {
    ...g,
    rules: g.rules.flatMap((n) => {
      const m = fn(n)
      if (m === null) return []
      return [isGroup(m) ? mapRules(m, fn) : m]
    }),
  }
}

const updateNode = (g: QueryGroup, id: string, fn: (n: QueryNode) => QueryNode): QueryGroup =>
  g.id === id ? (fn(g) as QueryGroup) : mapRules(g, (n) => (n.id === id ? fn(n) : n))

const removeNode = (g: QueryGroup, id: string): QueryGroup => {
  const out = mapRules(g, (n) => (n.id === id ? null : n))
  // A group left empty goes with its last rule.
  return { ...out, rules: out.rules.filter((n) => !isGroup(n) || n.rules.length > 0) }
}

function findRule(g: QueryGroup, id: string | null): QueryRule | undefined {
  if (!id) return undefined
  for (const n of g.rules) {
    if (isGroup(n)) {
      const r = findRule(n, id)
      if (r) return r
    } else if (n.id === id) return n
  }
  return undefined
}

function newRule(field: QueryField): QueryRule {
  const op = defaultOperator(field)
  const value = valueForOperator(field, op, undefined)
  return value === undefined
    ? { id: createQueryId(), field: field.name, op }
    : { id: createQueryId(), field: field.name, op, value }
}

/** The rule with a new operator, its value carried over when it still fits. */
function withOperator(rule: QueryRule, field: QueryField, op: QueryOperator): QueryRule {
  const value = valueForOperator(field, op, rule.value)
  const { value: _, ...rest } = rule
  return value === undefined ? { ...rest, op } : { ...rest, op, value }
}

/** The editing state every view of one builder shares. */
function createQueryState(props: QueryBuilderProps) {
  const [raw, setRaw] = createControllable<QueryGroup>({
    value: () => props.value,
    defaultValue: props.defaultValue ?? emptyQuery(),
    onChange: (q) => props.onChange?.(q),
  })
  const query = createMemo(() => withIds(raw()))
  const fields = createMemo(() => new Map(props.fields.map((f) => [f.name, f])))
  const set = (q: QueryGroup) => setRaw(q)
  return {
    query,
    fields,
    field: (name: string) => fields().get(name),
    set,
    update: (id: string, fn: (n: QueryNode) => QueryNode) => set(updateNode(query(), id, fn)),
    remove: (id: string) => set(removeNode(query(), id)),
    add: (rule: QueryNode, groupId?: string) => {
      const q = query()
      if (!groupId || groupId === q.id) set({ ...q, rules: [...q.rules, rule] })
      else
        set(
          updateNode(q, groupId, (g) => ({
            ...(g as QueryGroup),
            rules: [...(g as QueryGroup).rules, rule],
          })),
        )
    },
    clear: () => set({ ...query(), rules: [] }),
  }
}
type QueryState = ReturnType<typeof createQueryState>

const fieldItems = (fields: QueryField[]) =>
  fields.map((f) => ({ id: f.name, label: f.label, icon: (f.icon ?? ICON_BY_TYPE[f.type]) as IconName }))

const ICON_BY_TYPE: Record<QueryField["type"], IconName> = {
  text: "file",
  number: "chart",
  date: "calendar",
  enum: "circle-dot",
  boolean: "check",
  person: "user",
  relation: "link",
}

/**
 * A query builder over a typed schema: rules of field, operator and value in AND/OR groups one level deep, for
 * filtering lists. Compact by default, as a chip per rule ("State is Open", "Estimate > 3") that opens a popover
 * to edit it, "Filter" to add one and "Advanced" for the whole grouped builder (and its text form, the Projects
 * query bar's syntax). Its value converts to the store's `where` with `toWhere` and back with `fromWhere`. On a
 * phone everything opens in one sheet of grouped rows.
 */
export function QueryBuilder(props: QueryBuilderProps): JSX.Element {
  const state = createQueryState(props)
  return (
    <Show when={props.variant === "builder"} fallback={<QueryChips state={state} props={props} />}>
      <QueryEditor state={state} props={props} />
    </Show>
  )
}

// ── the chip row ─────────────────────────────────────────────────────────────────────────────────────

function QueryChips(p: { state: QueryState; props: QueryBuilderProps }): JSX.Element {
  const { state, props } = p
  const phone = usePhone()
  const [openId, setOpenId] = createSignal<string | null>(null)
  const [advanced, setAdvanced] = createSignal(false)
  const [sheet, setSheet] = createSignal<SheetPage | null>(null)
  const anchors = new Map<string, HTMLElement>()
  const [advAnchor, setAdvAnchor] = createSignal<HTMLElement>()
  let root!: HTMLDivElement

  const chipButtons = () => Array.from(root.querySelectorAll<HTMLElement>("[data-qchip-focus]"))
  const focusNear = (index: number) =>
    queueMicrotask(() => {
      const all = chipButtons()
      all[Math.max(0, Math.min(index, all.length - 1))]?.focus()
    })
  /** Closing a chip's popover with no value yet drops the rule it was adding. */
  const closeChip = (refocus = true) => {
    const id = openId()
    setOpenId(null)
    if (!id) return
    const rule = findRule(state.query(), id)
    if (rule && !isComplete(rule, state.field(rule.field))) {
      const index = chipButtons().findIndex((el) => el.dataset.qchipFocus === id)
      state.remove(id)
      if (refocus) focusNear(index)
    } else if (refocus) queueMicrotask(() => anchors.get(id)?.focus())
  }
  const addField = (name: string) => {
    const field = state.field(name)
    if (!field) return
    const rule = newRule(field)
    state.add(rule)
    if (phone()) setSheet({ page: "rule", id: rule.id! })
    else queueMicrotask(() => setOpenId(rule.id!))
  }
  const onRowKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (!target.dataset.qchipFocus) return
    const all = chipButtons()
    const at = all.indexOf(target)
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      all[(at + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length]?.focus()
    } else if ((e.key === "Backspace" || e.key === "Delete") && "qchipRemovable" in target.dataset) {
      e.preventDefault()
      state.remove(target.dataset.qchipFocus)
      focusNear(e.key === "Backspace" ? at - 1 : at)
    }
  }
  const top = () => state.query().rules
  return (
    <div
      ref={root}
      data-part="query-builder"
      role="group"
      aria-label={props.label ?? "Filters"}
      class={cx("nc-query", props.class)}
      onKeyDown={onRowKeyDown}
    >
      <Show when={phone()}>
        {/* First on a phone, where the row scrolls sideways: the way into the sheet is always in view. */}
        <span class="nc-qchip nc-qchip--lead" data-part="query-chip">
          <button
            type="button"
            class="nc-qchip__main"
            data-qchip-focus="add"
            aria-haspopup="dialog"
            onClick={() => setSheet(top().length ? { page: "main" } : { page: "field" })}
          >
            <Icon name="filter" size="sm" class="nc-qchip__icon" />
            <span class="nc-qchip__field">Filter</span>
          </button>
        </span>
      </Show>
      {/* Filter and the advanced button lead the chips, so they never wrap onto a line of their own. */}
      <Show when={!phone()}>
        <DropdownMenu
          label="Filter by"
          items={fieldItems(props.fields)}
          onSelect={addField}
          trigger={(tp) => (
            <Button
              {...tp}
              size="md"
              variant="ghost"
              icon="plus"
              class="nc-query__add"
              data-qchip-focus="add"
            >
              Filter
            </Button>
          )}
        />
        <IconButton
          ref={setAdvAnchor}
          label="Advanced filter"
          icon="sliders-horizontal"
          class="nc-query__advanced"
          pressed={advanced()}
          // The tooltip would cover the popover it opened.
          tooltip={!advanced()}
          aria-haspopup="dialog"
          aria-expanded={advanced()}
          onClick={() => setAdvanced(!advanced())}
        />
      </Show>
      <For each={top()}>
        {(node, i) => (
          <>
            <Show when={i() > 0 && state.query().combinator === "or"}>
              <span class="nc-query__join">or</span>
            </Show>
            <Show
              when={!isGroup(node)}
              fallback={
                <GroupChip
                  group={node as QueryGroup}
                  onOpen={() => (phone() ? setSheet({ page: "main" }) : setAdvanced(true))}
                  onRemove={() => state.remove(node.id!)}
                />
              }
            >
              <RuleChip
                rule={node as QueryRule}
                field={state.field((node as QueryRule).field)}
                format={props.format}
                open={openId() === node.id}
                anchorRef={(el) => anchors.set(node.id!, el)}
                onOpen={() =>
                  phone()
                    ? setSheet({ page: "rule", id: node.id! })
                    : setOpenId(openId() === node.id ? null : node.id!)
                }
                onRemove={() => {
                  const at = chipButtons().findIndex((el) => el.dataset.qchipFocus === node.id)
                  state.remove(node.id!)
                  focusNear(at)
                }}
              />
            </Show>
          </>
        )}
      </For>
      {/* One rule's popover. */}
      <Show when={!phone() && openId()}>
        {(id) => (
          <RulePopover state={state} props={props} id={id()} anchor={anchors.get(id())} onClose={closeChip} />
        )}
      </Show>
      <Popover
        open={advanced() && !phone()}
        anchor={advAnchor()}
        placement="bottom-end"
        onClose={() => {
          setAdvanced(false)
          queueMicrotask(() => advAnchor()?.focus())
        }}
      >
        <AdvancedSurface state={state} props={props} onClose={() => setAdvanced(false)} />
      </Popover>
      <QuerySheet state={state} props={props} page={phone() ? sheet() : null} setPage={setSheet} />
    </div>
  )
}

function RuleChip(p: {
  rule: QueryRule
  field: QueryField | undefined
  format?: QueryFormat
  open: boolean
  anchorRef: (el: HTMLElement) => void
  onOpen: () => void
  onRemove: () => void
}): JSX.Element {
  const d = () => describeRule(p.rule, p.field, p.format)
  const text = () => ruleText(p.rule, p.field, p.format)
  const complete = () => isComplete(p.rule, p.field)
  return (
    <span
      class="nc-qchip"
      data-part="query-chip"
      data-open={p.open || undefined}
      data-incomplete={!complete() || undefined}
    >
      <button
        ref={p.anchorRef}
        type="button"
        class="nc-qchip__main"
        data-qchip-focus={p.rule.id}
        data-qchip-removable=""
        aria-haspopup="dialog"
        aria-expanded={p.open}
        aria-label={complete() ? text() : `${d().field} ${d().op}, no value yet`}
        aria-keyshortcuts="Delete"
        title={text()}
        onClick={() => p.onOpen()}
      >
        <span class="nc-qchip__field">{d().field}</span>
        <span class="nc-qchip__op">{d().op}</span>
        <Show when={d().value}>
          <span class="nc-qchip__value">{d().value}</span>
        </Show>
        <Show when={!complete() && operatorInfo(p.rule.op).value !== "none"}>
          <span class="nc-qchip__value nc-qchip__value--empty">…</span>
        </Show>
      </button>
      <button
        type="button"
        class="nc-qchip__remove"
        tabIndex={-1}
        aria-label={`Remove filter: ${text()}`}
        onClick={() => p.onRemove()}
      >
        <Icon name="close" size="sm" />
      </button>
    </span>
  )
}

function GroupChip(p: { group: QueryGroup; onOpen: () => void; onRemove: () => void }): JSX.Element {
  const label = () =>
    `${p.group.combinator === "or" ? "Any" : "All"} of ${p.group.rules.length} filter${p.group.rules.length === 1 ? "" : "s"}`
  return (
    <span class="nc-qchip" data-part="query-chip" data-group="">
      <button
        type="button"
        class="nc-qchip__main"
        data-qchip-focus={p.group.id}
        data-qchip-removable=""
        aria-haspopup="dialog"
        aria-label={`${label()}, open the advanced filter`}
        onClick={() => p.onOpen()}
      >
        <Icon name="layers" size="sm" class="nc-qchip__icon" />
        <span class="nc-qchip__value">{label()}</span>
      </button>
      <button
        type="button"
        class="nc-qchip__remove"
        tabIndex={-1}
        aria-label={`Remove ${label()}`}
        onClick={() => p.onRemove()}
      >
        <Icon name="close" size="sm" />
      </button>
    </span>
  )
}

/** The popover of one chip: its operator, its value, and Remove. Edits apply as they are made. */
function RulePopover(p: {
  state: QueryState
  props: QueryBuilderProps
  id: string
  anchor: HTMLElement | undefined
  onClose: (refocus?: boolean) => void
}): JSX.Element {
  const rule = () => findRule(p.state.query(), p.id)
  const field = () => (rule() ? p.state.field(rule()!.field) : undefined)
  let surface!: HTMLDivElement
  return (
    <Popover
      open={Boolean(rule() && field())}
      anchor={p.anchor}
      onClose={() => p.onClose()}
      placement="bottom-start"
    >
      <div
        ref={surface}
        class="nc-menu nc-qpop"
        role="dialog"
        aria-label={`Filter: ${field()?.label ?? ""}`}
        data-part="query-popover"
        onKeyDown={(e) => trapTab(e, surface)}
      >
        <div class="nc-qpop__head">
          <span class="nc-qpop__field">
            <Icon name={(field()!.icon ?? ICON_BY_TYPE[field()!.type]) as IconName} size="sm" />
            {field()!.label}
          </span>
          <Show when={operatorsFor(field()!).length > 1}>
            <Select
              aria-label="Operator"
              class="nc-qpop__op"
              value={rule()!.op}
              options={operatorsFor(field()!).map((o) => ({ value: o.op, label: o.label }))}
              onChange={(op) =>
                p.state.update(p.id, (n) => withOperator(n as QueryRule, field()!, op as QueryOperator))
              }
            />
          </Show>
        </div>
        <Show when={operatorInfo(rule()!.op).value !== "none"}>
          {/* Keyed by operator, so a changed operator gets its own editor. */}
          <Show when={rule()!.op} keyed>
            {(_op) => (
              <ValueEditor
                layout="stack"
                field={field()!}
                rule={rule()!}
                autoFocus
                renderPicker={p.props.renderPicker}
                onChange={(v) => p.state.update(p.id, (n) => ({ ...(n as QueryRule), value: v }))}
                onDone={() => p.onClose()}
              />
            )}
          </Show>
        </Show>
        <div class="nc-qpop__foot">
          <Button
            size="sm"
            variant="ghost"
            icon="trash"
            onClick={() => {
              p.state.remove(p.id)
              p.onClose()
            }}
          >
            Remove filter
          </Button>
        </div>
      </div>
    </Popover>
  )
}

// ── the advanced view ────────────────────────────────────────────────────────────────────────────────

function AdvancedSurface(p: {
  state: QueryState
  props: QueryBuilderProps
  onClose: () => void
}): JSX.Element {
  const [tab, setTab] = createSignal("builder")
  let surface!: HTMLDivElement
  return (
    <div
      ref={surface}
      class="nc-menu nc-qpop nc-qpop--advanced"
      role="dialog"
      aria-label="Advanced filter"
      data-part="query-advanced"
      onKeyDown={(e) => trapTab(e, surface)}
    >
      <div class="nc-qpop__bar">
        <Show
          when={p.props.textMode !== false}
          fallback={<span class="nc-qpop__title">Advanced filter</span>}
        >
          <Tabs
            label="Edit as"
            items={[
              { id: "builder", label: "Builder" },
              { id: "text", label: "Text" },
            ]}
            value={tab()}
            onChange={setTab}
          />
        </Show>
        <Show when={p.state.query().rules.length}>
          <Button size="sm" variant="ghost" onClick={() => p.state.clear()}>
            Clear all
          </Button>
        </Show>
      </div>
      <Show when={tab() === "text"} fallback={<QueryEditor state={p.state} props={p.props} />}>
        <QueryText state={p.state} props={p.props} />
      </Show>
    </div>
  )
}

/** The text form: the Projects query bar's syntax. Enter applies it. */
function QueryText(p: { state: QueryState; props: QueryBuilderProps }): JSX.Element {
  const printed = () => printQueryText(p.state.query(), p.props.fields, { textField: p.props.textField })
  const [text, setText] = createSignal(printed() ?? "")
  const [unknown, setUnknown] = createSignal<string[]>([])
  createEffect(on(printed, (t) => t !== null && setText(t), { defer: true }))
  const apply = () => {
    const r = parseQueryText(text(), p.props.fields, { textField: p.props.textField })
    setUnknown(r.unknown)
    p.state.set({ ...r.query, id: p.state.query().id })
  }
  const help = () =>
    unknown().length
      ? `Not understood: ${unknown().join(", ")}`
      : printed() === null
        ? "This filter has OR or groups, which the text form cannot write. Applying text replaces them."
        : "field:value, -field:value, field:a,b, field:>3, field:1..5, field:-7d, field:none, and words. Enter applies."
  return (
    <div class="nc-qtext">
      <TextField
        aria-label="Filter as text"
        mono
        value={text()}
        placeholder="state:open estimate:>3 login"
        help={help()}
        error={unknown().length ? help() : undefined}
        autofocus
        onInput={(e) => setText(e.currentTarget.value)}
        onBlur={() => text() !== (printed() ?? "") && apply()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            apply()
          }
        }}
      />
    </div>
  )
}

/** The grouped builder: a line per rule (field, operator, value), groups one level deep, add and remove. */
function QueryEditor(p: { state: QueryState; props: QueryBuilderProps }): JSX.Element {
  const groups = () => p.props.groups !== false
  return (
    <div class={cx("nc-qbuilder", p.props.variant === "builder" && p.props.class)} data-part="query-editor">
      <RuleLines state={p.state} props={p.props} group={p.state.query()} depth={0} />
      <div class="nc-qbuilder__add">
        <AddRule state={p.state} props={p.props} label="Add filter" />
        <Show when={groups()}>
          <Button
            size="sm"
            variant="ghost"
            icon="layers"
            onClick={() => {
              const first = p.props.fields[0]
              if (!first) return
              p.state.add({
                id: createQueryId(),
                combinator: p.state.query().combinator === "and" ? "or" : "and",
                rules: [newRule(first)],
              })
            }}
          >
            Add group
          </Button>
        </Show>
      </div>
    </div>
  )
}

function AddRule(p: {
  state: QueryState
  props: QueryBuilderProps
  label: string
  groupId?: string
}): JSX.Element {
  return (
    <DropdownMenu
      label="Filter by"
      items={fieldItems(p.props.fields)}
      onSelect={(name) => {
        const f = p.state.field(name)
        if (f) p.state.add(newRule(f), p.groupId)
      }}
      trigger={(tp) => (
        <Button {...tp} size="sm" variant="ghost" icon="plus">
          {p.label}
        </Button>
      )}
    />
  )
}

const COMBINATORS = [
  { value: "and", label: "and" },
  { value: "or", label: "or" },
]

function RuleLines(p: {
  state: QueryState
  props: QueryBuilderProps
  group: QueryGroup
  depth: number
}): JSX.Element {
  const setCombinator = (c: string) =>
    p.state.update(p.group.id!, (g) => ({ ...(g as QueryGroup), combinator: c as "and" | "or" }))
  return (
    <div class="nc-qlines" role="list" aria-label={p.depth ? "Group" : "Filters"}>
      <Show when={!p.group.rules.length && p.depth === 0}>
        <p class="nc-qlines__empty">No filters. Everything is shown.</p>
      </Show>
      <For each={p.group.rules}>
        {(node, i) => (
          <div class="nc-qline" role="listitem" data-group={isGroup(node) || undefined}>
            <span class="nc-qline__join">
              <Show when={i() === 1} fallback={i() === 0 ? "Where" : p.group.combinator}>
                <Select
                  aria-label={p.depth ? "Match in group" : "Match"}
                  class="nc-qline__combinator"
                  value={p.group.combinator}
                  options={COMBINATORS}
                  onChange={setCombinator}
                />
              </Show>
            </span>
            <Show
              when={!isGroup(node)}
              fallback={<GroupBox state={p.state} props={p.props} group={node as QueryGroup} />}
            >
              <RuleLine state={p.state} props={p.props} rule={node as QueryRule} />
            </Show>
          </div>
        )}
      </For>
    </div>
  )
}

function GroupBox(p: { state: QueryState; props: QueryBuilderProps; group: QueryGroup }): JSX.Element {
  return (
    <div class="nc-qgroup" data-part="query-group">
      <RuleLines state={p.state} props={p.props} group={p.group} depth={1} />
      <div class="nc-qgroup__foot">
        <AddRule state={p.state} props={p.props} label="Add to group" groupId={p.group.id} />
        <Button size="sm" variant="ghost" icon="trash" onClick={() => p.state.remove(p.group.id!)}>
          Remove group
        </Button>
      </div>
    </div>
  )
}

function RuleLine(p: { state: QueryState; props: QueryBuilderProps; rule: QueryRule }): JSX.Element {
  const field = () => p.state.field(p.rule.field)
  return (
    <div class="nc-qrow" data-part="query-rule">
      <Select
        aria-label="Field"
        class="nc-qrow__field"
        value={p.rule.field}
        options={p.props.fields.map((f) => ({ value: f.name, label: f.label }))}
        onChange={(name) => {
          const f = p.state.field(name)
          if (f) p.state.update(p.rule.id!, () => ({ ...newRule(f), id: p.rule.id }))
        }}
      />
      <Show when={field()}>
        <Select
          aria-label="Operator"
          class="nc-qrow__op"
          value={p.rule.op}
          options={operatorsFor(field()!).map((o) => ({ value: o.op, label: o.label }))}
          onChange={(op) =>
            p.state.update(p.rule.id!, (n) => withOperator(n as QueryRule, field()!, op as QueryOperator))
          }
        />
        <div class="nc-qrow__value">
          <Show when={`${p.rule.field}:${p.rule.op}`} keyed>
            {(_k) => (
              <ValueEditor
                layout="row"
                field={field()!}
                rule={p.rule}
                renderPicker={p.props.renderPicker}
                onChange={(v) => p.state.update(p.rule.id!, (n) => ({ ...(n as QueryRule), value: v }))}
              />
            )}
          </Show>
        </div>
      </Show>
      <IconButton size="sm" icon="close" label="Remove filter" onClick={() => p.state.remove(p.rule.id!)} />
    </div>
  )
}

// ── the phone sheet ──────────────────────────────────────────────────────────────────────────────────

type SheetPage = { page: "main" } | { page: "field"; groupId?: string } | { page: "rule"; id: string }

/** On a phone: one sheet of grouped rows. The filters, a page per rule (its condition and value), the fields to add. */
function QuerySheet(p: {
  state: QueryState
  props: QueryBuilderProps
  page: SheetPage | null
  setPage: (page: SheetPage | null) => void
}): JSX.Element {
  const rule = () => {
    const pg = p.page
    return pg?.page === "rule" ? findRule(p.state.query(), pg.id) : undefined
  }
  const field = () => (rule() ? p.state.field(rule()!.field) : undefined)
  /** Leaving a rule's page without a value drops the rule it was adding. */
  const leaveRule = () => {
    const r = rule()
    if (r && !isComplete(r, field())) p.state.remove(r.id!)
  }
  const back = () => {
    leaveRule()
    p.setPage({ page: "main" })
  }
  const close = () => {
    leaveRule()
    p.setPage(null)
  }
  const title = () =>
    p.page?.page === "rule"
      ? (field()?.label ?? "Filter")
      : p.page?.page === "field"
        ? "Add filter"
        : "Filters"
  // A page under the filters has its way back in the header, as a pushed screen's back button.
  const header = () => (
    <Show when={p.page?.page !== "main"} fallback={title()}>
      <span class="nc-qsheet__title">
        <button type="button" class="nc-qsheet__back" aria-label="Back to filters" onClick={back}>
          <Icon name="chevron-left" class="nc-navbar__chevron" />
        </button>
        {title()}
      </span>
    </Show>
  )
  return (
    <Sheet
      open={p.page !== null}
      onClose={close}
      title={header()}
      label={title()}
      action={
        <Button size="sm" variant="ghost" class="nc-qsheet__done" onClick={close}>
          Done
        </Button>
      }
      detents={["fit"]}
      flush
    >
      <div class="nc-qsheet" data-part="query-sheet">
        <Show when={p.page?.page === "main"}>
          <SheetMain state={p.state} props={p.props} setPage={p.setPage} />
        </Show>
        <Show when={p.page?.page === "field"}>
          <InsetList>
            <InsetGroup label="Fields">
              <For each={p.props.fields}>
                {(f) => (
                  <InsetRow
                    label={f.label}
                    icon={(f.icon ?? ICON_BY_TYPE[f.type]) as IconName}
                    chevron
                    onClick={() => {
                      const r = newRule(f)
                      const pg = p.page as { groupId?: string }
                      p.state.add(r, pg.groupId)
                      p.setPage({ page: "rule", id: r.id! })
                    }}
                  />
                )}
              </For>
            </InsetGroup>
          </InsetList>
        </Show>
        <Show when={rule() && field()}>
          <SheetRule
            state={p.state}
            props={p.props}
            rule={rule()!}
            field={field()!}
            onRemove={() => {
              p.state.remove(rule()!.id!)
              p.setPage({ page: "main" })
            }}
          />
        </Show>
      </div>
    </Sheet>
  )
}

function SheetMain(p: {
  state: QueryState
  props: QueryBuilderProps
  setPage: (pg: SheetPage) => void
}): JSX.Element {
  const ruleRow = (r: QueryRule) => {
    const f = p.state.field(r.field)
    const d = describeRule(r, f, p.props.format)
    return (
      <InsetRow
        label={d.field}
        value={[d.op, d.value].filter(Boolean).join(" ")}
        chevron
        onClick={() => p.setPage({ page: "rule", id: r.id! })}
        trailingActions={[
          {
            id: "remove",
            label: "Remove",
            icon: "trash",
            tone: "danger",
            onAction: () => p.state.remove(r.id!),
          },
        ]}
        menu={[{ id: "remove", label: "Remove filter", icon: "trash", danger: true }]}
        menuLabel={ruleText(r, f, p.props.format)}
        onMenuSelect={() => p.state.remove(r.id!)}
      />
    )
  }
  const matchTabs = (g: QueryGroup, label: string) => (
    <Tabs
      label={label}
      items={[
        { id: "and", label: "All" },
        { id: "or", label: "Any" },
      ]}
      value={g.combinator}
      onChange={(c) =>
        p.state.update(g.id!, (n) => ({ ...(n as QueryGroup), combinator: c as "and" | "or" }))
      }
    />
  )
  const rules = () => p.state.query().rules.filter((n): n is QueryRule => !isGroup(n))
  const groups = () => p.state.query().rules.filter(isGroup)
  return (
    <InsetList>
      <Show when={p.state.query().rules.length > 1}>
        <InsetGroup label="Match">
          <InsetRow label="Match" trailing={matchTabs(p.state.query(), "Match")} />
        </InsetGroup>
      </Show>
      <Show when={rules().length}>
        <InsetGroup label="Filters">
          <For each={rules()}>{ruleRow}</For>
        </InsetGroup>
      </Show>
      <For each={groups()}>
        {(g) => (
          <InsetGroup
            title={`${g.combinator === "or" ? "Any" : "All"} of these`}
            titleAction={matchTabs(g, "Match in group")}
          >
            <For each={g.rules.filter((n): n is QueryRule => !isGroup(n))}>{ruleRow}</For>
            <InsetRow
              label="Add to group"
              icon="plus"
              class="nc-qsheet__add"
              onClick={() => p.setPage({ page: "field", groupId: g.id })}
            />
          </InsetGroup>
        )}
      </For>
      <InsetGroup label="Add">
        <InsetRow
          label="Add filter"
          icon="plus"
          class="nc-qsheet__add"
          onClick={() => p.setPage({ page: "field" })}
        />
      </InsetGroup>
      <Show when={p.state.query().rules.length}>
        <InsetGroup label="Clear">
          <InsetRow label="Clear all filters" danger onClick={() => p.state.clear()} />
        </InsetGroup>
      </Show>
    </InsetList>
  )
}

function SheetRule(p: {
  state: QueryState
  props: QueryBuilderProps
  rule: QueryRule
  field: QueryField
  onRemove: () => void
}): JSX.Element {
  const shape = () => operatorInfo(p.rule.op).value
  const set = (v: QueryValue) => p.state.update(p.rule.id!, (n) => ({ ...(n as QueryRule), value: v }))
  const list = () =>
    Array.isArray(p.rule.value)
      ? (p.rule.value as string[])
      : typeof p.rule.value === "string" && p.rule.value
        ? [p.rule.value]
        : []
  const isList = () => p.field.type === "enum" || p.field.type === "person" || p.field.type === "relation"
  const pair = <T,>() =>
    Array.isArray(p.rule.value) ? (p.rule.value as [T, T]) : ([null, null] as [T | null, T | null])
  const filter = (value: unknown, onChange: (v: unknown) => void, label: string) => (
    <FieldFilter spec={specOfQueryField(p.field)} value={value} label={label} onChange={onChange} />
  )
  const num = (value: number | null, onChange: (n: number | null) => void, label: string) =>
    filter(value, (v) => onChange(v as number | null), label)
  return (
    <InsetList>
      <Show when={operatorsFor(p.field).length > 1}>
        <InsetGroup title="Condition">
          <For each={operatorsFor(p.field)}>
            {(o) => (
              <InsetRow
                label={o.label}
                checked={p.rule.op === o.op}
                onClick={() => p.state.update(p.rule.id!, (n) => withOperator(n as QueryRule, p.field, o.op))}
              />
            )}
          </For>
        </InsetGroup>
      </Show>
      <Show when={shape() !== "none"}>
        <InsetGroup title={shape() === "many" ? "Values" : "Value"}>
          <Show when={p.field.type === "boolean"}>
            <InsetRow label="Yes" checked={p.rule.value !== false} onClick={() => set(true)} />
            <InsetRow label="No" checked={p.rule.value === false} onClick={() => set(false)} />
          </Show>
          <Show when={isList()}>
            {untrack(
              () =>
                customPicker(p.props.renderPicker, {
                  field: p.field,
                  multiple: shape() === "many",
                  get value() {
                    return shape() === "many" ? list() : (list()[0] ?? null)
                  },
                  onChange: (v) => set(v as QueryValue),
                  close: () => {},
                }) ?? (
                  <For each={p.field.options ?? []}>
                    {(o) => (
                      <InsetRow
                        label={o.label}
                        icon={o.icon as IconName | undefined}
                        checked={list().includes(o.value)}
                        onClick={() => {
                          if (shape() !== "many") set(o.value)
                          else
                            set(
                              list().includes(o.value)
                                ? list().filter((x) => x !== o.value)
                                : [...list(), o.value],
                            )
                        }}
                      />
                    )}
                  </For>
                ),
            )}
          </Show>
          <Show when={p.field.type === "number" && shape() === "one"}>
            <InsetRow
              label="Value"
              trailing={num(typeof p.rule.value === "number" ? p.rule.value : null, set, p.field.label)}
            />
          </Show>
          <Show when={p.field.type === "number" && shape() === "pair"}>
            <InsetRow
              label="From"
              trailing={num(
                pair<number>()[0],
                (n) => set([n, pair<number>()[1]] as QueryValue),
                `${p.field.label}, from`,
              )}
            />
            <InsetRow
              label="To"
              trailing={num(
                pair<number>()[1],
                (n) => set([pair<number>()[0], n] as QueryValue),
                `${p.field.label}, to`,
              )}
            />
          </Show>
          <Show when={shape() === "days"}>
            <InsetRow
              label="Days"
              trailing={num(
                typeof p.rule.value === "number" ? p.rule.value : null,
                set,
                `${p.field.label}, days`,
              )}
            />
          </Show>
          <Show when={p.field.type === "date" && shape() === "one"}>
            <InsetRow
              label="Date"
              trailing={filter(
                typeof p.rule.value === "string" ? p.rule.value : null,
                (d) => set(d as QueryValue),
                p.field.label,
              )}
            />
          </Show>
          <Show when={p.field.type === "date" && shape() === "pair"}>
            <InsetRow
              label="From"
              trailing={filter(
                pair<string>()[0],
                (d) => set([d, pair<string>()[1]] as QueryValue),
                `${p.field.label}, from`,
              )}
            />
            <InsetRow
              label="To"
              trailing={filter(
                pair<string>()[1],
                (d) => set([pair<string>()[0], d] as QueryValue),
                `${p.field.label}, to`,
              )}
            />
          </Show>
          <Show when={p.field.type === "text"}>
            <InsetRow
              label={
                <span class="nc-qsheet__text">
                  {filter(
                    typeof p.rule.value === "string" ? p.rule.value : "",
                    (v) => set(v as QueryValue),
                    `${p.field.label} value`,
                  )}
                </span>
              }
            />
          </Show>
        </InsetGroup>
      </Show>
      <InsetGroup label="Remove">
        <InsetRow label="Remove filter" danger onClick={() => p.onRemove()} />
      </InsetGroup>
    </InsetList>
  )
}
