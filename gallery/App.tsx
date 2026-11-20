import { ACCENTS, isPhone, Nav, Tabs, ToastRegion } from "@aiviarium/nocturne"
import { render } from "@solidjs/web"
import { createMemo, createSignal, For, Show } from "solid-js"
import { mount } from "../examples/mount"
import { aria } from "../src/lib/aria"
import { DeviceChrome } from "./device"
import { Sections } from "./kit"
import { PAGE_GROUPS, PAGES } from "./pages"

/**
 * The example a frame shows: `/frame/button/variants` (the dev server) or `#/frame/button/variants` (a static
 * copy, such as the docs site's). Null on the gallery's own pages.
 */
export function frameId(): string | null {
  const path = location.pathname.match(/\/frame\/(.+?)\/?$/)?.[1]
  const hash = location.hash.match(/^#\/?frame\/([^?]+)/)?.[1]
  return path ?? hash ?? null
}

/**
 * Show one example alone, filling the window, for iframes: `?theme=dark|light&accent=<preset>`, in the query
 * or after the hash. A change of the hash (the site switching its theme) restyles it without a reload.
 * `&device=iphone` emulates an iPhone (the site's device frames): its safe-area insets, its status bar and home
 * indicator, and the example as a phone screen.
 */
export function mountFrame(id: string, element: HTMLElement): void {
  const options = () => ({
    theme: readParam("theme") === "light" ? ("light" as const) : ("dark" as const),
    accent: readParam("accent") ?? "iris",
  })
  const root = document.documentElement
  const device = readParam("device") === "iphone"
  root.classList.add("g-frame")
  root.dataset.theme = options().theme
  // The frame is the whole window, as an app's is: at a phone's size the document is a phone (`data-phone`), as
  // an app's is, whether or not something in the example asked.
  isPhone()
  if (device) {
    root.dataset.device = "iphone"
    const chrome = document.createElement("div")
    document.body.append(chrome)
    render(() => <DeviceChrome fixed />, chrome)
  }
  const view = mount(id, element, { ...options(), phone: device })
  window.addEventListener("hashchange", () => {
    root.dataset.theme = options().theme
    view.update(options())
  })
}

function readHash(): string {
  return location.hash.replace(/^#\/?/, "").split("?")[0] || "overview"
}

function readParam(name: string): string | null {
  return (
    new URLSearchParams(location.search).get(name) ??
    new URLSearchParams(location.hash.split("?")[1] ?? "").get(name)
  )
}

function load(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage can be blocked; the choice just does not persist */
  }
}

export function App() {
  const [route, setRoute] = createSignal(readHash())
  const [theme, setTheme] = createSignal<"dark" | "light">(
    (readParam("theme") ?? load("g-theme", "dark")) === "light" ? "light" : "dark",
  )
  const [root, setRoot] = createSignal<HTMLElement>()
  const [accentId, setAccentId] = createSignal(readParam("accent") ?? load("g-accent", "iris"))
  window.addEventListener("hashchange", () => setRoute(readHash()))

  const page = createMemo(() => PAGES.find((p) => p.id === route()) ?? PAGES[0])
  const accent = createMemo(() => ACCENTS.find((a) => a.id === accentId()) ?? ACCENTS[0])
  const accentValue = () => (theme() === "dark" ? accent()?.dark : accent()?.light)

  return (
    <div class="nc g-app" data-theme={theme()} style={{ "--accent": accentValue() }} ref={setRoot}>
      <aside class="g-side" data-part="gallery-nav">
        <div class="g-brand">
          <span class="nc-avatar nc-avatar--ai" aria-hidden="true" />
          Nocturne
        </div>
        <Nav
          label="Components"
          groups={PAGE_GROUPS.map((group) => ({
            label: group,
            items: PAGES.filter((p) => p.group === group).map((p) => ({
              label: p.title,
              href: `#/${p.id}`,
              current: p.id === page()?.id,
            })),
          }))}
        />
      </aside>
      <main class="g-main" data-page={page()?.id}>
        <div class="g-bar">
          <h1 class="g-bar__title heading">{page()?.title}</h1>
          <span class="g-bar__spacer" />
          <div class="g-swatches" role="group" aria-label="Accent">
            <For each={ACCENTS}>
              {(a) => (
                <button
                  type="button"
                  class="g-swatch"
                  title={a.name}
                  aria-label={`Accent ${a.name}`}
                  aria-pressed={aria(accentId() === a.id)}
                  style={{ "--swatch": theme() === "dark" ? a.dark : a.light }}
                  onClick={() => {
                    setAccentId(a.id)
                    save("g-accent", a.id)
                  }}
                />
              )}
            </For>
          </div>
          <Tabs
            label="Theme"
            items={[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ]}
            value={theme()}
            onChange={(id) => {
              setTheme(id as "dark" | "light")
              save("g-theme", id)
            }}
          />
        </div>
        <div class="g-body">
          <Show when={page()} keyed>
            {(p) => (
              <>
                <p class="g-lead">{p.lead}</p>
                <Sections sections={p.sections} />
              </>
            )}
          </Show>
        </div>
      </main>
      <Show when={root()}>
        <ToastRegion anchor={root()} />
      </Show>
    </div>
  )
}
