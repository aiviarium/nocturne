// The examples as one ES module for pages that are not Solid (the docs site): `mount` renders one example into
// an element, with Nocturne's theme and accent on its root, and returns a function that removes it again.
import "@aiviarium/nocturne/styles/index.css"
import "./examples.css"
import { accentValue, PhoneOverride, type RowDensity, ToastRegion } from "@aiviarium/nocturne"
import { createSignal, onMount, Show } from "solid-js"
import { render } from "solid-js/web"
import { ExampleScreen, needsScreen } from "./_kit/screen"
import { ExampleSettingsContext } from "./_kit/settings"
import { EXAMPLES } from "./registry"

export { ACCENTS } from "@aiviarium/nocturne"
export { EXAMPLES } from "./registry"

export interface MountOptions {
  theme?: "dark" | "light"
  /** An accent preset id (`ACCENTS`), or any colour. */
  accent?: string
  /** The row density of lists and tables that follow the page's setting. */
  density?: RowDensity
  /**
   * Shown on a phone (the site's device frames): the root is a phone screen, and an example that does not draw a
   * whole screen of its own (`meta.screen`) is shown as the content of one, under a navigation bar titled with the
   * part's name, as the shell shows a view.
   */
  phone?: boolean
}

/** Removes the example. `update` changes its theme, accent or density in place, keeping its state. */
export interface Dispose {
  (): void
  update: (options: MountOptions) => void
}

/** The ids of every example. */
export const exampleIds = (): string[] => Object.keys(EXAMPLES)

/** The `--accent` value for a preset id or a colour, in a theme. */
function accentFor(accent: string | undefined, theme: "dark" | "light"): string {
  if (accent?.startsWith("#") || accent?.startsWith("rgb") || accent?.startsWith("oklch")) return accent
  return accentValue(accent ?? "iris", theme)
}

/**
 * Render the example `id` into `element` (a shadow root works: overlays mount inside the example's own
 * `[data-theme]` root). The root is `div.nc.ex-root`, with `data-surface` from the example's meta so the
 * page can draw the surface around it.
 */
export function mount(id: string, element: Element | ShadowRoot, options: MountOptions = {}): Dispose {
  const example = EXAMPLES[id]
  const [theme, setTheme] = createSignal(options.theme ?? "dark")
  const [accent, setAccent] = createSignal(options.accent)
  const [density, setDensity] = createSignal(options.density)
  const remove = render(() => {
    if (!example) return <p class="nc-meta">No example {id}.</p>
    const Example = example.default
    const phone = Boolean(example.meta.phone || options.phone)
    // A part that does not draw a screen itself is shown as a screen's content, as the shell shows a view.
    const body = () =>
      needsScreen(example.meta, Boolean(options.phone)) ? (
        <ExampleScreen id={id}>
          <Example />
        </ExampleScreen>
      ) : (
        <Example />
      )
    // The toast region looks for the root's data-theme, which is set once the root has rendered.
    let element!: HTMLDivElement
    const [root, setRoot] = createSignal<HTMLDivElement>()
    onMount(() => setRoot(element))
    return (
      <div
        ref={element}
        class="nc ex-root ex-host"
        data-theme={theme()}
        data-example={id}
        data-surface={example.meta.surface ?? "card"}
        data-phone={phone ? "" : undefined}
        style={{ "--accent": accentFor(accent(), theme()) }}
      >
        <PhoneOverride.Provider value={phone ? true : undefined}>
          <ExampleSettingsContext.Provider value={{ density }}>{body()}</ExampleSettingsContext.Provider>
        </PhoneOverride.Provider>
        <Show when={example.meta.toasts && root()}>{(anchor) => <ToastRegion anchor={anchor()} />}</Show>
      </div>
    )
  }, element as HTMLElement)
  const dispose = (() => remove()) as Dispose
  dispose.update = (next) => {
    if (next.theme) setTheme(next.theme)
    if ("accent" in next) setAccent(next.accent)
    if ("density" in next) setDensity(next.density)
  }
  return dispose
}
