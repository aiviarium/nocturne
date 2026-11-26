// The window's back and forward: two quiet chevrons after the app icon, in a desktop window only (in a browser tab
// the browser's own arrows walk the same stops). Each names where it goes in its tooltip; a long press or a right
// click lists the last ten stops on that side. With no step, an arrow dims.
import type { JSX } from "@solidjs/web"
import { bindHold } from "@ui-sdk/core"
import { createSignal, onSettled } from "solid-js"
import { Icon } from "../components/Icon"
import { Menu } from "../components/Menu"
import { Tooltip } from "../components/Tooltip"
import { cx } from "../lib/cx"
import type { HistoryStop, ShellHistory } from "./history"
import { EntryLead } from "./Switcher"

/** How long a press holds before the list opens instead of a step. */
const HOLD_MS = 450

export interface HistoryArrowsProps {
  history: ShellHistory
  class?: string
}

/** Back and forward over a `createHistory`, with the lists of where each goes. */
export function HistoryArrows(props: HistoryArrowsProps): JSX.Element {
  return (
    <div data-part="history-arrows" role="group" aria-label="History" class={cx("nc-history", props.class)}>
      <Arrow dir="back" history={props.history} />
      <Arrow dir="forward" history={props.history} />
    </div>
  )
}

function Arrow(props: { dir: "back" | "forward"; history: ShellHistory }): JSX.Element {
  const back = () => props.dir === "back"
  const list = () => (back() ? props.history.behind() : props.history.ahead())
  const next = () => list()[0]
  const [open, setOpen] = createSignal(false)
  const [button, setButton] = createSignal<HTMLButtonElement>()
  const tip = () => {
    const n = next()
    if (n) return `${back() ? "Back to" : "Forward to"} ${props.history.nameOf(n)}`
    return back() ? "Nothing to go back to" : "Nothing ahead"
  }
  onSettled(() => {
    const el = button()
    if (!el) return
    const unbind = bindHold(el, {
      delay: HOLD_MS,
      disabled: () => !next(),
      onHold: () => {
        setOpen(true)
        return false
      },
    })
    return unbind
  })
  const pick = (id: string) => {
    const stop: HistoryStop | undefined = list()[Number(id)]
    setOpen(false)
    if (stop) props.history.jump(stop)
  }
  return (
    <>
      <Tooltip content={tip()} shortcut={back() ? "⌘ [" : "⌘ ]"} placement="bottom-start">
        {(t) => (
          <button
            {...t}
            ref={(el: HTMLButtonElement) => {
              ;(t.ref as ((el: HTMLElement) => void) | undefined)?.(el)
              setButton(el)
            }}
            type="button"
            class="nc-history__btn"
            data-dir={props.dir}
            aria-label={tip()}
            aria-disabled={next() ? undefined : "true"}
            aria-haspopup="menu"
            aria-expanded={open() ? "true" : "false"}
            onClick={() => (back() ? props.history.back() : props.history.forward())}
            onContextMenu={(e: MouseEvent) => {
              e.preventDefault()
              if (next()) setOpen(true)
            }}
          >
            <Icon name={back() ? "chevron-left" : "chevron-right"} size="sm" />
          </button>
        )}
      </Tooltip>
      <Menu
        open={open()}
        anchor={button()}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        offset={8}
        label={back() ? "Back" : "Forward"}
        class="nc-history-list"
        minWidth="280px"
        items={[
          { type: "label", label: back() ? "Back" : "Forward" },
          ...list().map((s, i) => ({
            id: String(i),
            label: props.history.nameOf(s),
            leading: <EntryLead mark={s.mark} icon={s.icon ?? "file"} />,
            shortcut: s.scope,
          })),
        ]}
        onSelect={pick}
      />
    </>
  )
}
