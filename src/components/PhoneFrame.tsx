import type { JSX } from "@solidjs/web"
import { createContext, createSignal, useContext } from "solid-js"
import { cx } from "../lib/cx"
import { PhoneOverride } from "../lib/phone"

// The element a phone preview draws in, for the sheets inside it: they open over the frame, not the window.
const PhoneFrameCtx = createContext<(() => HTMLElement | undefined) | null>(null)

/** The `PhoneFrame` around a part, if any. */
export const usePhoneFrame = (): (() => HTMLElement | undefined) | undefined =>
  useContext(PhoneFrameCtx) ?? undefined

export interface PhoneFrameProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element
}

/**
 * A phone-sized preview on a desktop page: the parts inside lay out as on a phone (`PhoneOverride`), and a `Sheet`
 * or `ActionSheet` opened inside covers the frame instead of the window. The frame's size and look are the app's.
 */
export function PhoneFrame(props: PhoneFrameProps): JSX.Element {
  const [el, setEl] = createSignal<HTMLElement>()
  return (
    <PhoneOverride value={true}>
      <PhoneFrameCtx value={el}>
        <div {...props} ref={setEl} data-part="phone-frame" class={cx("nc-phone-frame", props.class)}>
          {props.children}
        </div>
      </PhoneFrameCtx>
    </PhoneOverride>
  )
}
