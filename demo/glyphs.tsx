// An issue's state and priority as icons: Lucide icons, coloured where the state needs it.

import type { LucideNode } from "@aiviarium/nocturne"
import { Icon, type IconTone } from "@aiviarium/nocturne"
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleSlash,
  Ellipsis,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SquareExclamationPoint,
} from "lucide"
import { type IssueState, PRIORITY_LABEL, type Priority, STATE_LABEL } from "./data"

const STATE: Record<IssueState, [LucideNode, IconTone | undefined]> = {
  backlog: [CircleDashed, "quiet"],
  todo: [Circle, undefined],
  progress: [CircleDotDashed, "warning"],
  review: [CircleDot, "success"],
  blocked: [CircleSlash, "danger"],
  done: [CircleCheck, "quiet"],
}

const PRIORITY: Record<Priority, [LucideNode, IconTone | undefined]> = {
  urgent: [SquareExclamationPoint, "warning"],
  high: [SignalHigh, undefined],
  medium: [SignalMedium, undefined],
  low: [SignalLow, undefined],
  none: [Ellipsis, "quiet"],
}

export function StateIcon(props: { state: IssueState; label?: boolean }) {
  return (
    <Icon
      node={STATE[props.state][0]}
      tone={STATE[props.state][1]}
      size="sm"
      label={props.label === false ? undefined : STATE_LABEL[props.state]}
    />
  )
}

/**
 * At the full icon size, and the signal bars cropped to the corner of Lucide's grid they sit in: drawn on the whole
 * grid they come out a third smaller than the other icons in a row, and too thin to tell apart.
 */
export function PriorityIcon(props: { priority: Priority; label?: boolean }) {
  const bars = () => props.priority === "high" || props.priority === "medium" || props.priority === "low"
  return (
    <Icon
      node={PRIORITY[props.priority][0]}
      tone={PRIORITY[props.priority][1]}
      viewBox={bars() ? "1 4.5 17 17" : "0 0 24 24"}
      label={props.label === false ? undefined : PRIORITY_LABEL[props.priority]}
    />
  )
}
