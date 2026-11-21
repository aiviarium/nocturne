// Test preload: a DOM (happy-dom), then the Solid JSX transform for .tsx and the browser build of solid-js.

import { GlobalRegistrator } from "@happy-dom/global-registrator"
import "./transform"

GlobalRegistrator.register({ url: "http://localhost:4800/", width: 1280, height: 800 })

// happy-dom has no popover API, so ui-sdk would mount popups in `body`. Browsers render them in place in the top
// layer; this stands in for it, so a test sees the popup where a browser puts it.
const proto = HTMLElement.prototype as HTMLElement & { _open?: boolean }
if (typeof proto.showPopover !== "function") {
  Object.assign(proto, {
    showPopover(this: HTMLElement & { _open?: boolean }) {
      this._open = true
      this.dispatchEvent(new Event("toggle"))
    },
    hidePopover(this: HTMLElement & { _open?: boolean }) {
      this._open = false
      this.dispatchEvent(new Event("toggle"))
    },
    togglePopover(
      this: HTMLElement & { _open?: boolean; showPopover(): void; hidePopover(): void },
      force?: boolean,
    ) {
      const next = force ?? !this._open
      if (next) this.showPopover()
      else this.hidePopover()
      return next
    },
  })
}

// The rest of what ui-sdk's testing guide says a DOM without layout needs, and its strict mode, so its development
// warnings fail a test.
declare global {
  var __UI_SDK_STRICT__: boolean | undefined
}
globalThis.__UI_SDK_STRICT__ = true
Element.prototype.getAnimations = () => []
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.checkVisibility = () => true
document.elementFromPoint = () => null
document.elementsFromPoint = () => []
// happy-dom's Animation rejects `finished` when cancelled, which a sheet's swipe does as it closes; nothing in a
// DOM without layout plays, so an animation here is one that is already done.
Element.prototype.animate = () => {
  const done = Promise.resolve()
  return {
    finished: done,
    ready: done,
    cancel() {},
    finish() {},
    play() {},
    pause() {},
    reverse() {},
    commitStyles() {},
    persist() {},
    addEventListener() {},
    removeEventListener() {},
    playState: "finished",
    currentTime: null,
    effect: null,
    onfinish: null,
    oncancel: null,
  } as unknown as Animation
}
