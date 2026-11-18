// The parts a kind has. A kind implements each mode it needs and every surface draws values through them.
import type { Component } from "solid-js"
import type { FieldSpec } from "./spec"

export interface ValueProps {
  spec: FieldSpec
  value: unknown
  /** A cell of a table, a row of a list or a chip line: one line, no more than a few chips. */
  compact?: boolean | undefined
  /** An enum as a dot and its word (the status of a list's row) instead of a chip. */
  dot?: boolean | undefined
}

export interface EditorProps {
  spec: FieldSpec
  value: unknown
  /** Hands over a new value; `null` clears it. */
  onCommit(value: unknown): void
  /** The person is typing: what was refused last no longer applies. */
  onTouch?(): void
  disabled?: boolean | undefined
  /** What the store refused the last value with, shown by the field's row; the control only shows the state. */
  error?: string | undefined
  /**
   * `inline`: text that edits where it is shown (a record page). `boxed`: a bordered control (a dialog, a form),
   * which hands over every change as it is made.
   */
  variant?: "inline" | "boxed" | undefined
  /**
   * When a typed value is handed over: `change` with every edit, `leave` when the control is left or Enter is pressed.
   * Inline controls leave, boxed ones change, unless asked (a setting that saves at once asks to leave).
   */
  commit?: "change" | "leave" | undefined
  /** The field names the row: drawn at the title size. */
  title?: boolean | undefined
  autofocus?: boolean | undefined
  /** An enum's values that may be chosen from the current one (`transitions`); the others are greyed out. */
  allowed?: ((value: string) => boolean) | undefined
}

export interface FilterProps {
  spec: FieldSpec
  value: unknown
  onChange(value: unknown): void
  /** The accessible name. */
  label: string
  autofocus?: boolean | undefined
  /** `stack`: lists in place, for a chip's popover; `row`: behind a trigger, one line of the advanced builder. */
  layout?: "stack" | "row" | undefined
  /** Called after a single choice, so a popover can close. */
  onDone?(): void
  /** Several values at once (`any of`). */
  multiple?: boolean | undefined
}

export interface FieldKind {
  /** The value as plain text: a menu, a label, a screen reader, a spreadsheet. Empty for no value. */
  text(spec: FieldSpec, value: unknown): string
  Value: Component<ValueProps>
  Editor: Component<EditorProps>
  /** The control of a filter rule's value; none for a kind that cannot be filtered. */
  Filter?: Component<FilterProps>
}
