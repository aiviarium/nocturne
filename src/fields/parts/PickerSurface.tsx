// What a picker (a calendar, a search of entities, a list of options) opens in: a popover hung from its trigger on a
// desktop, a bottom sheet on a phone, as every other picker and dialog of the product does there. The sheet has the
// close control and closes on its backdrop and on Escape.

import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Popover } from "../../components/Popover"
import { Sheet } from "../../components/Sheet"
import { usePhone } from "../../lib/phone"

export interface PickerSurfaceProps {
  open: boolean
  anchor: HTMLElement | undefined
  onClose: () => void
  /** Names the picker: the sheet's title and the dialog's accessible name. */
  label: string
  /** The popover's class (its own surface); the sheet draws its own. */
  class?: string | undefined
  matchWidth?: boolean | undefined
  children: JSX.Element
}

export function PickerSurface(props: PickerSurfaceProps): JSX.Element {
  const phone = usePhone()
  return (
    <Show
      when={phone()}
      fallback={
        <Popover
          open={props.open}
          anchor={props.anchor}
          matchWidth={props.matchWidth}
          onClose={props.onClose}
          class={props.class}
        >
          {props.children}
        </Popover>
      }
    >
      <Sheet open={props.open} title={props.label} detents={["fit"]} onClose={props.onClose}>
        <div class="nc-field-sheet" data-part="picker-sheet">
          {props.children}
        </div>
      </Sheet>
    </Show>
  )
}
