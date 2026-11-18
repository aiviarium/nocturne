import { createSignal, type JSX, Show } from "solid-js"
import { cx } from "../lib/cx"
import { createId } from "../lib/id"
import { usePhone } from "../lib/phone"
import { IconButton } from "./IconButton"
import { Popover } from "./Popover"
import { Sheet } from "./Sheet"

export interface InfoTipProps {
  /** What it explains: the field or setting's name. It titles the sheet. The button itself is "Explanation", so it never reads as the field. */
  label: string
  /** The explanation. Shown only when asked for. */
  children: JSX.Element
  class?: string
}

/**
 * An explanation on demand, in place of text that is always there: a small info button beside a label that opens the
 * words in a popover (a sheet on a phone) and closes on Escape, a press outside or its close control. Tapping works
 * where hovering does not.
 */
export function InfoTip(props: InfoTipProps): JSX.Element {
  const id = createId("info")
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<HTMLElement>()
  const phone = usePhone()
  const close = () => {
    setOpen(false)
    queueMicrotask(() => anchor()?.focus())
  }
  return (
    <span class={cx("nc-infotip", props.class)} data-part="info-tip">
      <IconButton
        ref={setAnchor}
        icon="info"
        label="Explanation"
        size="sm"
        tooltip={false}
        aria-haspopup="dialog"
        aria-expanded={open()}
        aria-controls={open() ? id : undefined}
        class="nc-infotip__button"
        onClick={() => setOpen(!open())}
      />
      <Show
        when={phone()}
        fallback={
          <Popover
            open={open()}
            anchor={anchor()}
            onClose={close}
            placement="bottom-start"
            class="nc-infotip__pop"
          >
            <div id={id} role="dialog" aria-label={props.label} class="nc-infotip__text">
              {props.children}
            </div>
          </Popover>
        }
      >
        <Sheet open={open()} title={props.label} detents={["fit"]} onClose={close}>
          <div id={id} class="nc-infotip__text nc-infotip__text--sheet">
            {props.children}
          </div>
        </Sheet>
      </Show>
    </span>
  )
}
