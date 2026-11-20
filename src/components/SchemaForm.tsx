import type { JSX } from "@solidjs/web"
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  For,
  Match,
  omit,
  onSettled,
  reconcile,
  Show,
  Switch,
} from "solid-js"
import { FieldEditor, FormField } from "../fields/Field"
import { fieldOfNode } from "../fields/schema"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import {
  blankDraft,
  type Draft,
  type FieldErrors,
  type FieldNode,
  fieldNode,
  type JsonSchema,
  markSecrets,
  readForm,
  sentence,
} from "../lib/schema"
import { Button } from "./Button"
import { Callout } from "./Callout"
import { DataList, type DataListField } from "./DataList"
import { IconButton } from "./IconButton"
import { InfoTip } from "./InfoTip"

export type { JsonSchema } from "../lib/schema"
export { markSecrets, schemaHasFields } from "../lib/schema"

export interface SchemaFormProps
  extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onChange" | "children"> {
  /** The JSON Schema of an object: its properties become the fields. */
  schema: JsonSchema
  /** Starting values. Missing fields start from the schema's `default`. */
  value?: Record<string, unknown>
  /** Called with the typed value when every field is valid. Blank optional fields are left out. */
  onSubmit: (value: Record<string, unknown>) => void
  /** Called on every edit with the value so far, or `undefined` while a field does not fit. */
  onValueChange?: (value: Record<string, unknown> | undefined) => void
  /** The primary button. Say what happens: "Greet someone", not "Submit". Default "Save". */
  submitLabel?: string
  /** Shows a Cancel button (or "Back" and so on, see `cancelLabel`) when set. */
  onCancel?: () => void
  /** Default "Cancel". */
  cancelLabel?: string
  /** Messages from the server for the form as a whole, shown above the buttons. */
  problems?: string[]
  /** Disables the buttons and shows the submit button busy. */
  busy?: boolean
  /** Move focus to the first field on mount. Default true. */
  autofocus?: boolean
  /** Leave the buttons out, for a form whose `id` is the `form` of buttons in a dialog footer. */
  hideActions?: boolean
  /** Top-level fields whose values are secret, for schemas that list them beside the schema: password inputs. */
  secretFields?: readonly string[]
  /**
   * Secret fields that already hold a value. They show as set, are not required, and left blank they are left
   * out of the value (a server reads that as "keep it").
   */
  storedSecrets?: readonly string[]
}

/**
 * A form generated from a JSON Schema: strings, numbers, booleans, enums, nested objects and arrays of
 * scalars, with optional fields, defaults and a message under every field that does not fit. Secret strings
 * (`writeOnly`, `format: "password"`, or `secretFields`) are password inputs; `x-multiline` strings are text
 * areas. Anything it cannot lay out (unions, `any`) becomes a JSON text box. Used by the command palette,
 * settings and dialogs such as the one that creates a connection.
 */
export function SchemaForm(props: SchemaFormProps): JSX.Element {
  const rest = omit(
    props,
    "schema",
    "value",
    "onSubmit",
    "onValueChange",
    "submitLabel",
    "onCancel",
    "cancelLabel",
    "problems",
    "busy",
    "autofocus",
    "hideActions",
    "secretFields",
    "storedSecrets",
    "class",
  )
  const root = createMemo(() =>
    fieldNode(markSecrets(props.schema, props.secretFields ?? [], props.storedSecrets ?? [])),
  )
  const rootNode = () => root() as Extract<FieldNode, { kind: "object" }>
  const [draft, setDraft] = createStore<{ value: Draft }>({ value: blankDraft(root(), props.value) })
  // A new schema starts a new form.
  createEffect(
    () => props.schema,
    () =>
      setDraft((state) => {
        reconcile(blankDraft(root(), props.value))(state.value)
      }),
    { defer: true },
  )
  const [attempted, setAttempted] = createSignal(false)
  const result = createMemo(() => readForm(root(), draft.value))
  const errors = (): FieldErrors => (attempted() ? result().errors : {})
  createEffect(
    () => result().value,
    (value) => {
      props.onValueChange?.(value)
    },
  )
  let form!: HTMLFormElement

  onSettled(() => {
    if (props.autofocus !== false) queueMicrotask(() => focusFirst(form))
  })

  const submit = (event: Event) => {
    event.preventDefault()
    setAttempted(true)
    const { value, errors: found } = result()
    if (value === undefined || Object.keys(found).length > 0) {
      queueMicrotask(() => (form.querySelector<HTMLElement>("[aria-invalid=true]") ?? form).focus())
      return
    }
    props.onSubmit(value)
  }

  const set = (path: Array<string | number>, next: Draft) =>
    setDraft((state) => {
      if (path.length === 0) {
        state.value = next
        return
      }
      let at = state.value as unknown as Record<string | number, unknown>
      for (const key of path.slice(0, -1)) at = at[key] as Record<string | number, unknown>
      at[path[path.length - 1] as string] = next
    })
  const read = (path: Array<string | number>): Draft => {
    let at: unknown = draft.value
    for (const key of path) at = (at as Record<string | number, unknown>)?.[key]
    return at as Draft
  }

  return (
    <form
      data-part="schema-form"
      ref={form}
      novalidate
      class={cx("nc-schema-form", props.class)}
      onSubmit={submit}
      {...rest}
    >
      <Show
        when={rootNode().kind === "object"}
        fallback={
          <FieldView
            node={root()}
            label={sentence("value")}
            required
            path={[]}
            errorKey=""
            errors={errors()}
            read={read}
            set={set}
          />
        }
      >
        <FieldGroup node={rootNode()} path={[]} errors={errors()} read={read} set={set} />
      </Show>
      <Show when={props.problems?.length}>
        <Callout tone="danger" data-part="schema-form-problems">
          {props.problems?.join(" · ")}
        </Callout>
      </Show>
      <Show when={!props.hideActions}>
        <div class="nc-schema-form__actions">
          <Show when={props.onCancel}>
            <Button variant="ghost" onClick={() => props.onCancel?.()}>
              {props.cancelLabel ?? "Cancel"}
            </Button>
          </Show>
          <Button type="submit" variant="primary" loading={props.busy}>
            {props.submitLabel ?? "Save"}
          </Button>
        </div>
      </Show>
    </form>
  )
}

function focusFirst(form: HTMLElement) {
  form
    .querySelector<HTMLElement>(
      "input:not([type=hidden]), textarea, button[role=switch], button[role=checkbox], button.nc-select, button.nc-field-chip",
    )
    ?.focus()
}

interface Wiring {
  errors: FieldErrors
  read: (path: Array<string | number>) => Draft
  set: (path: Array<string | number>, next: Draft) => void
}

const pathKey = (path: Array<string | number>) => path.join(".")

function FieldGroup(
  props: { node: Extract<FieldNode, { kind: "object" }>; path: Array<string | number> } & Wiring,
): JSX.Element {
  return (
    <For each={props.node.fields}>
      {(f) => (
        <FieldView
          node={f.node}
          label={f.label}
          required={f.required}
          path={[...props.path, f.name]}
          errorKey={pathKey([...props.path, f.name])}
          errors={props.errors}
          read={props.read}
          set={props.set}
        />
      )}
    </For>
  )
}

function FieldView(
  props: {
    node: FieldNode
    label: string
    required: boolean
    path: Array<string | number>
    errorKey: string
  } & Wiring,
): JSX.Element {
  const error = () => props.errors[props.errorKey]
  const spec = createMemo(() => fieldOfNode(props.node, props.path.join("."), props.label, props.required))
  const stored = () =>
    props.node.kind === "string" && props.node.stored ? "Set. Leave it empty to keep it." : undefined
  const raw = () => props.read(props.path)
  const text = () => (typeof raw() === "string" ? (raw() as string) : "")
  // A form's drafts are strings until it is submitted: what a control holds is turned into one and back.
  const value = (): unknown => {
    switch (spec().kind) {
      case "number": {
        const n = Number(text())
        return text().trim() === "" || !Number.isFinite(n) ? null : n
      }
      case "boolean":
        return raw() === true
      case "enum":
        // A listed empty value ("Default") is a choice of its own.
        return text() === "" && !spec().options?.some((o) => o.value === "") ? null : text()
      case "text":
      case "longtext":
      case "secret":
      case "json":
        return text() === "" ? null : text()
      default:
        return raw()
    }
  }
  const commit = (v: unknown) => {
    switch (spec().kind) {
      case "number":
        return props.set(props.path, v === null ? "" : String(v))
      case "boolean":
        return props.set(props.path, v === true)
      case "tags":
        return props.set(props.path, (v as string[] | null) ?? [])
      default:
        return props.set(props.path, v == null ? "" : String(v))
    }
  }
  return (
    <Switch>
      <Match when={props.node.kind === "object"}>
        <fieldset class="nc-schema-form__group" data-part="schema-group" data-kind="object">
          <legend class="nc-field__label">
            {props.required ? props.label : `${props.label} (optional)`}
            <Show when={props.node.schema.description}>
              {(d) => <InfoTip label={props.label}>{d()}</InfoTip>}
            </Show>
          </legend>
          <FieldGroup
            node={props.node as Extract<FieldNode, { kind: "object" }>}
            path={props.path}
            errors={props.errors}
            read={props.read}
            set={props.set}
          />
        </fieldset>
      </Match>
      <Match when={props.node.kind === "array"}>
        <ArrayField
          node={props.node as Extract<FieldNode, { kind: "array" }>}
          label={props.label}
          title={props.required ? props.label : `${props.label} (optional)`}
          path={props.path}
          errorKey={props.errorKey}
          errors={props.errors}
          read={props.read}
          set={props.set}
        />
      </Match>
      <Match when={true}>
        <div data-part="schema-field" data-kind={spec().kind}>
          <FormField spec={{ ...spec(), help: stored() ?? spec().help }} error={error()}>
            <FieldEditor spec={spec()} value={value()} variant="boxed" error={error()} onCommit={commit} />
          </FormField>
        </div>
      </Match>
    </Switch>
  )
}

function ArrayField(
  props: {
    node: Extract<FieldNode, { kind: "array" }>
    label: string
    title: string
    path: Array<string | number>
    errorKey: string
  } & Wiring,
): JSX.Element {
  const id = createId("array")
  const rows = () => (props.read(props.path) as Draft[] | undefined) ?? []
  const itemLabel = (i: number) => `${props.label} ${i + 1}`
  const error = () => props.errors[props.errorKey]
  const plainStrings = () => {
    const item = props.node.item
    return item.kind === "string" && !item.secret && !item.multiline
  }
  // A list of small records of short text and numbers (a name and a value) is a DataList with a field each.
  const recordFields = (): DataListField<Record<string, Draft>>[] | undefined => {
    const item = props.node.item
    if (item.kind !== "object" || item.fields.length === 0 || item.fields.length > 4) return undefined
    const short = item.fields.every(
      (f) => (f.node.kind === "string" && !f.node.secret && !f.node.multiline) || f.node.kind === "number",
    )
    if (!short) return undefined
    return item.fields.map((f) => ({
      id: f.name,
      label: f.label,
      value: (row) => String(row[f.name] ?? ""),
      set: (row, v) => ({ ...row, [f.name]: v }),
      mono: f.node.schema.format === "uri" || f.node.schema.format === "url" || undefined,
    }))
  }
  const listed = () => plainStrings() || Boolean(recordFields())
  const rowError = (i: number) => {
    const own = props.errors[`${props.errorKey}.${i}`]
    if (own) return own
    const prefix = `${props.errorKey}.${i}.`
    const hit = Object.entries(props.errors).find(([k]) => k.startsWith(prefix))
    return hit?.[1]
  }
  return (
    <div
      class="nc-field nc-schema-form__array"
      data-part="schema-field"
      data-kind="array"
      role="group"
      aria-labelledby={`${id}-label`}
    >
      <span id={`${id}-label`} class="nc-field__label">
        {props.title}
        <Show when={props.node.schema.description}>
          {(d) => <InfoTip label={props.label}>{d()}</InfoTip>}
        </Show>
      </span>
      <Show when={plainStrings()}>
        {/* A list of plain strings (tags, origins) is the tags kind: a field per row, reorderable. */}
        <FieldEditor
          spec={{ name: props.errorKey, title: props.label, kind: "tags", multiple: true }}
          value={rows()}
          variant="boxed"
          error={undefined}
          onCommit={(next) => props.set(props.path, (next as string[] | null) ?? [])}
        />
      </Show>
      <Show when={recordFields()}>
        {(fields) => (
          <DataList
            variant="table"
            label={props.title}
            fields={fields()}
            value={rows() as Record<string, Draft>[]}
            onChange={(next) => props.set(props.path, next)}
            create={() => blankDraft(props.node.item) as Record<string, Draft>}
            itemLabel={(_, i) => itemLabel(i)}
            addLabel={`Add ${props.label.toLowerCase()}`}
            max={props.node.schema.maxItems}
            invalid={(_, i) => rowError(i)}
          />
        )}
      </Show>
      <For keyed={false} each={listed() ? [] : rows()}>
        {(_row, i) => (
          <div class="nc-schema-form__row">
            <div class="nc-schema-form__row-field">
              <FieldView
                node={props.node.item}
                label={itemLabel(i)}
                required
                path={[...props.path, i]}
                errorKey={`${props.errorKey}.${i}`}
                errors={props.errors}
                read={props.read}
                set={props.set}
              />
            </div>
            <IconButton
              label={`Remove ${itemLabel(i).toLowerCase()}`}
              icon="close"
              onClick={() =>
                props.set(
                  props.path,
                  rows().filter((_, at) => at !== i),
                )
              }
            />
          </div>
        )}
      </For>
      <Show when={error()}>
        <span class="nc-field__help nc-field__help--error" role="alert">
          {error()}
        </span>
      </Show>
      <Show when={!listed()}>
        <Button
          size="sm"
          icon="plus"
          disabled={props.node.schema.maxItems !== undefined && rows().length >= props.node.schema.maxItems}
          onClick={() => props.set(props.path, [...rows(), blankDraft(props.node.item)])}
        >
          Add {props.label.toLowerCase()}
        </Button>
      </Show>
    </div>
  )
}
