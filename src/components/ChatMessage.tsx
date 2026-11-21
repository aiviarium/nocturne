import type { JSX } from "@solidjs/web"
import { createSignal, For, omit, Show } from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { Avatar } from "./Avatar"
import { Button } from "./Button"
import { Icon, type IconName } from "./Icon"
import { State, StatusDot } from "./StatusDot"

export interface ChatMessageProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "role"> {
  /**
   * `user` is a right-aligned bubble; `assistant` writes on the page at the column's full width, under a line with
   * the AI avatar (and the thought). Neither is indented.
   */
  role: "user" | "assistant"
  /** Assistant only: a collapsed "Thought for 9s" line above the reply. */
  thought?: string
  /** Assistant only: the avatar. Defaults to the assistant mark; pass an agent for named agents. */
  avatar?: JSX.Element
}

/** One message of an AI conversation. For an assistant reply, put `ToolSteps`, text and an `ApprovalCard` in the children. */
export function ChatMessage(props: ChatMessageProps): JSX.Element {
  const rest = omit(props, "role", "thought", "avatar", "class", "children")
  return (
    <Show
      when={props.role === "assistant"}
      fallback={
        <div data-part="chat-message" data-role="user" class={cx("nc-msg-user", props.class)} {...rest}>
          {props.children}
        </div>
      }
    >
      <div data-part="chat-message" data-role="assistant" class={cx("nc-msg-ai", props.class)} {...rest}>
        {/* The avatar heads the reply instead of taking a column of its own: the body starts at the left edge. */}
        <div class="nc-msg-ai__head">
          {props.avatar ?? <Avatar kind="ai" />}
          <Show when={props.thought}>
            <span class="nc-meta">{props.thought}</span>
          </Show>
        </div>
        <div class="nc-msg-ai__body">{props.children}</div>
      </div>
    </Show>
  )
}

export type StepStatus = "ok" | "running" | "error" | "pending"

export interface ToolStepProps {
  /** A named icon for the kind of step: file, edit, terminal. */
  icon?: IconName
  /** What the step does, as a verb: "Read", "Edited", "Running". */
  verb: string
  /** The argument, in mono: a path, a command. Truncates to one line. */
  arg?: string
  /** Right-aligned meta in mono, such as `+22 −44`. */
  meta?: string
  /** Only `running` glows and takes the accent tint. Default `ok`. */
  status?: StepStatus
  /** Terminal output. When set, the row expands to show it. */
  output?: string
  /** Start expanded. */
  defaultOpen?: boolean
}

/** A one-line tool step. With `output` it expands into terminal output. */
export function ToolStep(props: ToolStepProps): JSX.Element {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false)
  const outputId = createId("step-output")
  const status = () => props.status ?? "ok"
  const dot = () =>
    status() === "running" ? "ai" : status() === "error" ? "error" : status() === "pending" ? "idle" : "ok"
  const row = (
    <>
      <Icon name={props.icon ?? "terminal"} size="sm" />
      <span class="nc-step__verb">{props.verb}</span>
      <span class="nc-step__arg" title={typeof props.arg === "string" ? props.arg : undefined}>
        {props.arg}
      </span>
      <Show when={props.meta}>
        <span class="nc-mono nc-step__meta">{props.meta}</span>
      </Show>
      {/* Done is the normal state: only a running, failed or waiting step shows a dot. */}
      <Show when={status() !== "ok"}>
        <StatusDot status={dot()} />
      </Show>
      <span class="nc-visually-hidden">{status() === "ok" ? "done" : status()}</span>
      <Show when={props.output}>
        <Icon
          name="chevron-right"
          size="sm"
          class={cx("nc-step__chevron", open() && "nc-step__chevron--open")}
        />
      </Show>
    </>
  )
  return (
    <div data-part="tool-step" data-status={status()} class="nc-step-wrap">
      <Show
        when={props.output}
        fallback={<div class={cx("nc-step", status() === "running" && "nc-step--running")}>{row}</div>}
      >
        <button
          type="button"
          class={cx("nc-step", "nc-step--button", status() === "running" && "nc-step--running")}
          aria-expanded={aria(open())}
          aria-controls={outputId}
          onClick={() => setOpen(!open())}
        >
          {row}
        </button>
        <pre id={outputId} class="nc-terminal nc-step__output" hidden={!open()}>
          {props.output}
        </pre>
      </Show>
    </div>
  )
}

/** The container of a message's tool steps: a quiet list of one-line rows, each output in a block under its row. */
export function ToolSteps(props: {
  steps?: ToolStepProps[]
  children?: JSX.Element
  label?: string
}): JSX.Element {
  return (
    <div data-part="tool-steps" role="group" aria-label={props.label ?? "Steps"} class="nc-steps">
      <For each={props.steps ?? []}>{(step) => <ToolStep {...step} />}</For>
      {props.children}
    </div>
  )
}

export interface ApprovalCardProps {
  /** One-line summary of the decision: "Edit 2 files and delete 1". */
  summary: string
  /** The affected items, in mono. */
  items?: string[]
  /** Decision so far. `pending` shows the buttons. */
  decision?: "pending" | "allowed" | "denied"
  /** The primary button, which gives approval. Default "Allow". */
  allowLabel?: string
  /** Default "Deny". */
  denyLabel?: string
  onAllow?: () => void
  onDeny?: () => void
  /** A third, quieter choice at the start of the row, such as "Allow for this session". */
  extra?: { label: string; onClick: () => void }
}

/** An approval card: a warning dot, a one-line summary, the affected items and the choices at the bottom right. */
export function ApprovalCard(props: ApprovalCardProps): JSX.Element {
  const decision = () => props.decision ?? "pending"
  return (
    <div
      data-part="approval-card"
      data-decision={decision()}
      role="group"
      aria-label="Approval needed"
      class="nc-approval"
    >
      <Show
        when={decision() === "pending"}
        fallback={
          <State status={decision() === "allowed" ? "ok" : "off"}>
            {decision() === "allowed" ? "Allowed" : "Denied"}
          </State>
        }
      >
        <State status="warn">Needs your approval</State>
      </Show>
      <span class="nc-approval__summary">{props.summary}</span>
      <Show when={props.items?.length}>
        <ul class="nc-approval__items">
          <For each={props.items}>{(item) => <li class="nc-mono">{item}</li>}</For>
        </ul>
      </Show>
      <Show when={decision() === "pending"}>
        <span class="nc-row nc-row--end">
          <Show when={props.extra}>
            {(x) => (
              <Button size="sm" variant="ghost" class="nc-approval__extra" onClick={() => x().onClick()}>
                {x().label}
              </Button>
            )}
          </Show>
          <Button size="sm" onClick={() => props.onDeny?.()}>
            {props.denyLabel ?? "Deny"}
          </Button>
          <Button size="sm" variant="primary" onClick={() => props.onAllow?.()}>
            {props.allowLabel ?? "Allow"}
          </Button>
        </span>
      </Show>
    </div>
  )
}

export type TokenKind = "cmd" | "ref" | "skill" | "person"

export interface TokenProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** `cmd` for `/commands`, `ref` for `@` files and docs, `skill` for `$skills`, `person` for `@` people. */
  kind: TokenKind
  /** A named icon for `ref` tokens. */
  icon?: IconName
  /** A person's name, for the avatar of a `person` token. */
  name?: string
}

/** An inline chip for a picked command, reference, skill or person, in chat messages and the composer. */
export function Token(props: TokenProps): JSX.Element {
  const rest = omit(props, "kind", "icon", "name", "class", "children")
  return (
    <span
      data-part="token"
      data-kind={props.kind}
      class={cx("nc-token", `nc-token--${props.kind}`, props.class)}
      {...rest}
    >
      <Show when={props.kind === "ref" && props.icon}>
        <Icon name={props.icon} size="sm" />
      </Show>
      <Show when={props.kind === "person" && props.name}>
        <Avatar name={props.name} size="sm" class="nc-avatar--inline" />
      </Show>
      {props.children}
    </span>
  )
}
