import type { JSX } from "solid-js"

// An iPhone's hardware, drawn over a phone preview so it shows what a real device shows: the status bar with the
// Dynamic Island at the top and the home indicator at the bottom. The safe-area insets that go with them are the
// `--nc-safe-*` variables of @aiviarium/nocturne's phone.css, set to the same device's values by `[data-device="iphone"]`
// and `.g-phone` in gallery.css (an iPhone 15 or 16: 393 × 852 points, 59 at the top, 34 at the bottom), so
// the phone pieces pad for them exactly as they do on the device. Nothing here takes a pointer.

/** The status bar and the home indicator, positioned over the box they are in (or the window, `fixed`). */
export function DeviceChrome(props: { fixed?: boolean }): JSX.Element {
  return (
    <div class="g-device" classList={{ "g-device--fixed": props.fixed }} aria-hidden="true">
      <div class="g-device__status">
        <span class="g-device__time">9:41</span>
        <span class="g-device__island" />
        <span class="g-device__icons">
          <svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg viewBox="0 0 16 12" width="16" height="12" fill="currentColor">
            <path d="M8 2.6c2.2 0 4.2.8 5.7 2.2l1.2-1.3A10 10 0 0 0 8 .8 10 10 0 0 0 1.1 3.5l1.2 1.3A8.2 8.2 0 0 1 8 2.6Zm0 3.6c1.2 0 2.4.5 3.2 1.2l1.3-1.3A6.4 6.4 0 0 0 8 4.4c-1.7 0-3.3.6-4.5 1.7l1.3 1.3c.8-.7 2-1.2 3.2-1.2Zm0 3.6c.5 0 1 .2 1.3.5L8 11.6 6.7 10.3c.3-.3.8-.5 1.3-.5Z" />
          </svg>
          <svg viewBox="0 0 27 13" width="27" height="13" fill="none">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
            <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
            <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity="0.4" />
          </svg>
        </span>
      </div>
      <span class="g-device__home" />
    </div>
  )
}
