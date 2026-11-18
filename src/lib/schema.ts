// The logic behind SchemaForm: reading a JSON Schema into a tree of field nodes, building the draft values a
// form edits (everything a text input holds is a string until it is submitted) and turning a draft back into
// a value, with a message for every field that does not fit.

import { characters, items, phrase } from "../fields/messages"

/** The subset of JSON Schema (draft 2020-12 and the older `definitions` form) that a form can show. */
export interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  const?: unknown
  default?: unknown
  description?: string
  title?: string
  format?: string
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  items?: JsonSchema
  minItems?: number
  maxItems?: number
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  $ref?: string
  $defs?: Record<string, JsonSchema>
  definitions?: Record<string, JsonSchema>
  [key: string]: unknown
}

/** What a schema turns into on screen. */
export type FieldNode =
  /**
   * `secret`: a password input (`format: "password"` or `writeOnly`). `stored`: a secret that already has a
   * value (`x-stored`), which a blank field keeps. `multiline`: a text area (`x-multiline`).
   */
  | { kind: "string"; schema: JsonSchema; secret: boolean; stored: boolean; multiline: boolean }
  | { kind: "number"; schema: JsonSchema; integer: boolean }
  | { kind: "boolean"; schema: JsonSchema }
  | { kind: "enum"; schema: JsonSchema; options: unknown[] }
  | { kind: "object"; schema: JsonSchema; fields: ObjectField[] }
  | { kind: "array"; schema: JsonSchema; item: FieldNode }
  /** Anything a form cannot lay out (unions, `any`): a text box that takes JSON. */
  | { kind: "json"; schema: JsonSchema }

export interface ObjectField {
  name: string
  label: string
  required: boolean
  node: FieldNode
}

/** A value being edited. Text and number inputs hold strings; a checkbox a boolean; a scalar array its rows. */
export type Draft = string | boolean | Draft[] | { [name: string]: Draft }

/** Field messages by path (`address.street`, `tags.1`). */
export type FieldErrors = Record<string, string>

/** "maxItems" becomes "Max items". */
export function sentence(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
  return words ? (words[0] as string).toUpperCase() + words.slice(1).toLowerCase() : name
}

function lookup(ref: string, root: JsonSchema): JsonSchema | undefined {
  if (!ref.startsWith("#/")) return undefined
  let at: unknown = root
  for (const part of ref.slice(2).split("/")) {
    if (typeof at !== "object" || at === null) return undefined
    at = (at as Record<string, unknown>)[part.replace(/~1/g, "/").replace(/~0/g, "~")]
  }
  return at as JsonSchema | undefined
}

const isNull = (s: JsonSchema) => s.type === "null" || (s.const === null && s.enum === undefined)

/** Follow `$ref`, merge `allOf`, and drop the `null` branch of a nullable union. */
function resolve(schema: JsonSchema, root: JsonSchema, depth = 0): JsonSchema {
  if (depth > 12) return {}
  let s = schema
  if (s.$ref) {
    const target = lookup(s.$ref, root)
    const { $ref: _ref, ...rest } = s
    s = target ? { ...resolve(target, root, depth + 1), ...rest } : rest
  }
  if (s.allOf?.length) {
    const { allOf, ...rest } = s
    const merged: JsonSchema = { ...rest }
    for (const part of allOf) {
      const p = resolve(part, root, depth + 1)
      Object.assign(merged, p, {
        properties: { ...merged.properties, ...p.properties },
        required: [...(merged.required ?? []), ...(p.required ?? [])],
      })
    }
    s = merged
  }
  const union = s.anyOf ?? s.oneOf
  if (union) {
    const { anyOf: _a, oneOf: _o, ...rest } = s
    const branches = union.map((b) => resolve(b, root, depth + 1))
    const real = branches.filter((b) => !isNull(b))
    if (real.length === 1)
      return { ...(real[0] as JsonSchema), ...rest, description: rest.description ?? real[0]?.description }
    // A union of plain choices is an enum.
    const choices = real.every((b) => b.const !== undefined || Array.isArray(b.enum))
    if (choices && real.length > 0) {
      // A choice with a `title` is shown by it and stored by its value.
      const titles: Record<string, string> = {}
      for (const b of real) if (b.title && b.const !== undefined) titles[String(b.const)] = b.title
      return {
        ...rest,
        enum: real.flatMap((b) => (b.enum ?? [b.const]) as unknown[]),
        ...(Object.keys(titles).length ? { "x-titles": titles } : {}),
      }
    }
    return { ...rest, type: undefined, "x-union": true }
  }
  return s
}

function primaryType(s: JsonSchema): string | undefined {
  const t = Array.isArray(s.type) ? s.type.find((x) => x !== "null") : s.type
  if (t) return t
  if (s.properties) return "object"
  if (s.items) return "array"
  return undefined
}

/** Turn a schema into the tree of fields a form shows. */
export function fieldNode(schema: JsonSchema, root: JsonSchema = schema, depth = 0): FieldNode {
  const s = resolve(schema, root)
  if (depth > 8) return { kind: "json", schema: s }
  if (s.const !== undefined && s.enum === undefined) return { kind: "enum", schema: s, options: [s.const] }
  if (Array.isArray(s.enum)) return { kind: "enum", schema: s, options: s.enum }
  switch (primaryType(s)) {
    case "string":
      return {
        kind: "string",
        schema: s,
        secret: s.format === "password" || s.writeOnly === true || s["x-stored"] === true,
        stored: s["x-stored"] === true,
        multiline: s["x-multiline"] === true,
      }
    case "number":
    case "integer":
      return { kind: "number", schema: s, integer: primaryType(s) === "integer" }
    case "boolean":
      return { kind: "boolean", schema: s }
    case "object": {
      if (!s.properties) return { kind: "json", schema: s }
      const required = new Set(s.required ?? [])
      const fields = Object.entries(s.properties).map(([name, child]) => {
        const resolved = resolve(child, root)
        return {
          name,
          label: resolved.title ?? child.title ?? sentence(name),
          required: required.has(name),
          node: fieldNode(child, root, depth + 1),
        }
      })
      return { kind: "object", schema: s, fields }
    }
    case "array": {
      if (!s.items) return { kind: "json", schema: s }
      const item = fieldNode(s.items, root, depth + 1)
      return item.kind === "json" ? { kind: "json", schema: s } : { kind: "array", schema: s, item }
    }
    default:
      return { kind: "json", schema: s }
  }
}

/**
 * Marks top-level properties as secret (`writeOnly`, a password input) and the secrets that already hold a
 * value (`x-stored`: no longer required, and left blank they are left out of the value, which a server reads
 * as "keep it"). For schemas that list their secret fields beside the schema, such as connection types.
 */
export function markSecrets(
  schema: JsonSchema,
  secret: readonly string[] = [],
  stored: readonly string[] = [],
): JsonSchema {
  if (!schema.properties || (secret.length === 0 && stored.length === 0)) return schema
  const properties: Record<string, JsonSchema> = {}
  for (const [name, p] of Object.entries(schema.properties)) {
    const isSecret = secret.includes(name)
    const isStored = isSecret && stored.includes(name)
    properties[name] = isSecret ? { ...p, writeOnly: true, ...(isStored ? { "x-stored": true } : {}) } : p
  }
  const required = schema.required?.filter((n) => !(secret.includes(n) && stored.includes(n)))
  return { ...schema, properties, ...(required ? { required } : {}) }
}

/** Whether a schema asks for anything: an object with at least one property. */
export function schemaHasFields(schema: JsonSchema | null | undefined): schema is JsonSchema {
  if (!schema) return false
  const node = fieldNode(schema)
  return node.kind === "object" && node.fields.length > 0
}

/** The draft for a field: the given value, else the schema's default, else empty. */
export function blankDraft(node: FieldNode, value?: unknown): Draft {
  const given = value !== undefined ? value : node.schema.default
  switch (node.kind) {
    case "boolean":
      return given === true
    case "enum":
      return given === undefined ? "" : String(given)
    case "string":
    case "number":
      return given === undefined || given === null ? "" : String(given)
    case "json":
      return given === undefined
        ? ""
        : typeof given === "string"
          ? JSON.stringify(given)
          : JSON.stringify(given, null, 2)
    case "array":
      return Array.isArray(given) ? given.map((v) => blankDraft(node.item, v)) : []
    case "object": {
      const obj = (given && typeof given === "object" ? given : {}) as Record<string, unknown>
      return Object.fromEntries(node.fields.map((f) => [f.name, blankDraft(f.node, obj[f.name])]))
    }
  }
}

function isBlank(node: FieldNode, draft: Draft | undefined): boolean {
  if (draft === undefined) return true
  switch (node.kind) {
    case "boolean":
      return draft === false
    case "array":
      return (draft as Draft[]).every((d) => isBlank(node.item, d))
    case "object":
      return node.fields.every((f) => isBlank(f.node, (draft as Record<string, Draft>)[f.name]))
    default:
      return draft === ""
  }
}

const num = (n: number) => String(n)

/** Reads a draft back into a value. Messages for fields that do not fit are added to `errors`. */
export function readDraft(
  node: FieldNode,
  draft: Draft | undefined,
  options: { required: boolean; label: string; path: string; errors: FieldErrors },
): unknown {
  const { required, label, path, errors } = options
  const fail = (message: string) => {
    errors[path] = message
    return undefined
  }
  const s = node.schema
  switch (node.kind) {
    case "boolean":
      return draft === true
    case "string": {
      const text = (draft as string | undefined) ?? ""
      if (text === "") return required ? fail(phrase.required) : undefined
      if (s.minLength !== undefined && text.length < s.minLength)
        return fail(phrase.atLeast(characters(s.minLength)))
      if (s.maxLength !== undefined && text.length > s.maxLength)
        return fail(phrase.atMost(characters(s.maxLength)))
      if (s.pattern) {
        try {
          if (!new RegExp(s.pattern, "u").test(text)) return fail(phrase.pattern)
        } catch {
          /* a pattern the browser cannot read is the server's to check */
        }
      }
      if (s.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return fail(phrase.email)
      if (s.format === "uri" || s.format === "url") {
        try {
          new URL(text)
        } catch {
          return fail(phrase.url)
        }
      }
      return text
    }
    case "number": {
      const text = ((draft as string | undefined) ?? "").trim()
      if (text === "") return required ? fail(phrase.required) : undefined
      const n = Number(text)
      if (!Number.isFinite(n)) return fail(phrase.number)
      if (node.integer && !Number.isInteger(n)) return fail(phrase.whole)
      if (s.minimum !== undefined && n < s.minimum) return fail(phrase.atLeast(num(s.minimum)))
      if (s.maximum !== undefined && n > s.maximum) return fail(phrase.atMost(num(s.maximum)))
      if (s.exclusiveMinimum !== undefined && n <= s.exclusiveMinimum)
        return fail(phrase.moreThan(num(s.exclusiveMinimum)))
      if (s.exclusiveMaximum !== undefined && n >= s.exclusiveMaximum)
        return fail(phrase.lessThan(num(s.exclusiveMaximum)))
      if (s.multipleOf && Math.abs(n / s.multipleOf - Math.round(n / s.multipleOf)) > 1e-9)
        return fail(phrase.multiple(num(s.multipleOf)))
      return n
    }
    case "enum": {
      const text = (draft as string | undefined) ?? ""
      if (text === "") return required ? fail(phrase.choose) : undefined
      const hit = node.options.find((o) => String(o) === text)
      return hit === undefined ? fail(phrase.listed) : hit
    }
    case "json": {
      const text = ((draft as string | undefined) ?? "").trim()
      if (text === "") return required ? fail(phrase.required) : undefined
      try {
        return JSON.parse(text)
      } catch {
        return fail(phrase.json)
      }
    }
    case "array": {
      const rows = ((draft as Draft[] | undefined) ?? []).filter((d) => !isBlank(node.item, d))
      const values: unknown[] = []
      rows.forEach((row, i) => {
        const v = readDraft(node.item, row, {
          required: true,
          label: `${label} ${i + 1}`,
          path: `${path}.${i}`,
          errors,
        })
        if (v !== undefined) values.push(v)
      })
      if (s.minItems !== undefined && rows.length < s.minItems) {
        return fail(phrase.atLeast(items(s.minItems)))
      }
      if (s.maxItems !== undefined && rows.length > s.maxItems) return fail(phrase.atMost(items(s.maxItems)))
      if (values.length === 0 && !required) return undefined
      return values
    }
    case "object": {
      const obj = (draft ?? {}) as Record<string, Draft>
      // An optional group nobody touched is left out, so its required fields do not block the form.
      if (!required && isBlank(node, draft)) return undefined
      const out: Record<string, unknown> = {}
      for (const f of node.fields) {
        const v = readDraft(f.node, obj[f.name], {
          required: f.required,
          label: f.label,
          path: path ? `${path}.${f.name}` : f.name,
          errors,
        })
        if (v !== undefined) out[f.name] = v
      }
      return out
    }
  }
}

/** Validates and reads a draft of a whole schema. `value` is undefined when `errors` is not empty. */
export function readForm(
  node: FieldNode,
  draft: Draft,
): { value: Record<string, unknown> | undefined; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const value = readDraft(node, draft, { required: true, label: "", path: "", errors }) as
    | Record<string, unknown>
    | undefined
  return { value: Object.keys(errors).length > 0 ? undefined : value, errors }
}
