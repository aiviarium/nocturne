// A JSON Schema property as a field: the adapter that lets settings pages, connection forms and params dialogs use
// the same controls as a declared collection's fields. The two type systems stay apart; only the kind they land on is
// shared.
import type { FieldNode } from "../lib/schema"
import type { FieldSpec } from "./spec"

/** The field a node of a read schema is, under `name`. */
export function fieldOfNode(node: FieldNode, name: string, title: string, required: boolean): FieldSpec {
  const s = node.schema
  const base = {
    name,
    title,
    required,
    ...(typeof s.description === "string" ? { help: s.description } : {}),
  }
  switch (node.kind) {
    case "string": {
      if (node.secret) return { ...base, kind: "secret", stored: node.stored }
      return {
        ...base,
        kind: node.multiline ? "longtext" : "text",
        ...(s.format === "uri" || s.format === "uuid" ? { mono: true } : {}),
      }
    }
    case "number": {
      const slider =
        s["x-control"] === "slider" &&
        typeof s.minimum === "number" &&
        typeof s.maximum === "number" &&
        s.maximum > s.minimum
      return {
        ...base,
        kind: "number",
        integer: node.integer,
        ...(typeof s.minimum === "number" ? { min: s.minimum } : {}),
        ...(typeof s.maximum === "number" ? { max: s.maximum } : {}),
        ...(typeof s.multipleOf === "number" ? { step: s.multipleOf } : {}),
        ...(typeof s["x-unit"] === "string" ? { unit: s["x-unit"] } : {}),
        ...(slider ? { slider: true } : {}),
      }
    }
    case "boolean":
      return { ...base, kind: "boolean" }
    case "enum": {
      const titles = (s["x-titles"] ?? {}) as Record<string, string>
      return {
        ...base,
        kind: "enum",
        options: node.options.map((o) => ({ value: String(o), title: titles[String(o)] ?? String(o) })),
      }
    }
    case "array":
      return { ...base, kind: "tags", multiple: true }
    default:
      return { ...base, kind: "json", mono: true }
  }
}
