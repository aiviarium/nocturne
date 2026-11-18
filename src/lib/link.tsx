import { createContext, type JSX, useContext } from "solid-js"

type Navigate = (href: string) => void

const LinkContext = createContext<Navigate>()

/** The provider's navigate function, for a link chosen from a menu rather than clicked. */
export function useNavigate(): Navigate | undefined {
  return useContext(LinkContext)
}

/**
 * Tells every `NavItem` and `Button` with an `href` below it how to move around without a page load. An app
 * with a router passes its navigate function; without one, links are plain links.
 */
export function LinkProvider(props: { navigate: Navigate; children: JSX.Element }): JSX.Element {
  return <LinkContext.Provider value={props.navigate}>{props.children}</LinkContext.Provider>
}

/**
 * A click handler for an anchor: a plain left click on a link inside the app goes through the provider's
 * navigate; anything else (a modified click, another tab, an outside address) is left to the browser.
 */
export function useLinkClick(): (
  event: MouseEvent & { currentTarget: HTMLAnchorElement },
  href: string | undefined,
) => void {
  const navigate = useContext(LinkContext)
  return (event, href) => {
    if (!navigate || !href || event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.currentTarget.getAttribute("target")
    if (target && target !== "_self") return
    if (!href.startsWith("/") || href.startsWith("//")) return
    event.preventDefault()
    navigate(href)
  }
}

/** Runs the handler a caller passed as `onClick` (a function, or Solid's `[handler, data]` pair). */
export function callClick<E extends Event>(handler: unknown, event: E): void {
  if (typeof handler === "function") handler(event)
  else if (Array.isArray(handler) && typeof handler[0] === "function") handler[0](handler[1], event)
}
