import { type Accessor, createSignal, onSettled } from "solid-js"

/**
 * The theme of the nearest `[data-theme]` around `el()`, kept in step. For examples that scope an accent: an
 * accent is set on an element that also carries `data-theme`, so it needs the theme's name.
 */
export function useNearestTheme(el: Accessor<HTMLElement | undefined>): Accessor<"dark" | "light"> {
  const [theme, setTheme] = createSignal<"dark" | "light">("dark")
  onSettled(() => {
    const themed = el()?.parentElement?.closest("[data-theme]")
    if (!themed) return
    const read = () => setTheme(themed.getAttribute("data-theme") === "light" ? "light" : "dark")
    read()
    const observer = new MutationObserver(read)
    observer.observe(themed, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  })
  return theme
}
