import type { JSX } from "@solidjs/web"
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onSettled,
  Show,
  untrack,
  useContext,
} from "solid-js"
import { aria } from "../lib/aria"
import { cx } from "../lib/cx"
import { pullRefreshes, rubberBand } from "../lib/gestures"
import { Icon, type IconName } from "./Icon"
import { DropdownMenu, type MenuEntry } from "./Menu"

// A screen of a phone's navigation stack (iOS's navigation controller): one navigation bar at the top with the
// back control at the left (labelled with the previous screen's title), the title in the middle and at most two
// actions at the right with the rest in a menu; under it the screen's content. A list or root screen has a large
// title that collapses into the bar as the content scrolls, and a search field under it that hides as the
// content scrolls down and comes back as it scrolls up.
//
// What is inside the screen tells it what to show through `ScreenContext`: the standard `ViewHeader` gives it
// the title, the actions and the overflow menu, `ViewLayout` whether it shows the view's sidebar or its content
// and a button for its right-hand panel, `ScreenSearch` the search field, `ScreenRefresh` pull to refresh. So a
// view built from the standard pieces gets a phone screen without code of its own.

/** An action of the navigation bar. */
export interface BarAction {
  id: string
  label: string
  icon?: IconName
  onClick: () => void
  /** The screen's main action: shown first, in the accent. */
  primary?: boolean
  pressed?: boolean
  disabled?: boolean
  danger?: boolean
  /** Only in the menu. */
  overflow?: boolean
  /** A choice in the menu: shows a check mark when true (a menu action with no `checked` has none). */
  checked?: boolean
  /** A menu action's heading: the first of a run of actions with the same one is preceded by it, and a rule. */
  section?: string
  /** Lower comes first when the bar picks which two it shows. Default: primary 0, others 2. */
  rank?: number
  /** A count shown on the icon (comments). */
  count?: number
}

export interface ScreenSearchValue {
  value: string
  onInput: (value: string) => void
  placeholder?: string
  label?: string
}

/** What a part of the screen's content contributes to the screen. */
export interface ScreenPart {
  title?: string
  /** A title to use when neither the screen nor another part has one (a view header's last crumb). */
  fallbackTitle?: string
  /** A short line under the title: a state that is out of the ordinary. */
  subtitle?: JSX.Element
  actions?: BarAction[]
  largeTitle?: boolean
  /**
   * The element of the content that shows the screen's title in large type (a record page's heading): the bar's
   * title stays empty while it is in view and appears once it has scrolled away, as with a large title.
   */
  titleAnchor?: HTMLElement | undefined
  search?: ScreenSearchValue
  /** `fill`: the content takes the height between the bars and scrolls itself (a conversation, an editor).
   * `full`: the same, and the tab bar hides (a terminal). */
  mode?: "scroll" | "fill" | "full"
  onRefresh?: () => Promise<unknown> | unknown
}

export interface ScreenContextValue {
  /** `index`: the screen opened at a view's start (a view with a sidebar shows the sidebar as the screen);
   * `main`: anything pushed after it. */
  level: () => "index" | "main"
  /** Adds a part; the returned function removes it. Later parts win for single values, actions add up. */
  provide: (part: () => ScreenPart) => () => void
}

// `null` is "not in a screen": in Solid 2 a default-less context throws instead of reading as undefined.
export const ScreenContext = createContext<ScreenContextValue | null>(null)

/** The screen the component is in, on a phone; undefined elsewhere. */
export function useScreen(): ScreenContextValue | undefined {
  return useContext(ScreenContext) ?? undefined
}

/** Gives the enclosing screen a part for as long as the caller lives. */
export function provideScreen(part: () => ScreenPart): boolean {
  const screen = useScreen()
  if (!screen) return false
  const off = screen.provide(part)
  onCleanup(off)
  return true
}

const merge = (parts: Array<() => ScreenPart>): ScreenPart => {
  const out: ScreenPart = { actions: [] }
  for (const p of parts) {
    const v = p()
    if (v.title !== undefined) out.title = v.title
    if (v.fallbackTitle !== undefined) out.fallbackTitle = v.fallbackTitle
    if (v.subtitle !== undefined) out.subtitle = v.subtitle
    if (v.largeTitle !== undefined) out.largeTitle = v.largeTitle
    if (v.titleAnchor !== undefined) out.titleAnchor = v.titleAnchor
    if (v.search) out.search = v.search
    if (v.onRefresh) out.onRefresh = v.onRefresh
    if (v.mode && (v.mode === "full" || (v.mode === "fill" && out.mode !== "full") || !out.mode))
      out.mode = v.mode
    if (v.actions) out.actions!.push(...v.actions)
  }
  return out
}

/** Which actions the bar shows (at most two) and which go into its menu. */
export function splitBarActions(actions: readonly BarAction[], room = 2) {
  const rank = (a: BarAction) => a.rank ?? (a.primary ? 0 : 2)
  const candidates = actions
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.overflow)
    .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i)
  // The menu button takes a slot of its own when anything overflows.
  const overflowing = actions.some((a) => a.overflow) || candidates.length > room
  const shown = candidates.slice(0, overflowing ? room - 1 : room).map((c) => c.a)
  const menu = actions.filter((a) => !shown.includes(a))
  // Keep the shown ones in the order they were given, primary last (at the far right, under the thumb).
  shown.sort((x, y) => Number(Boolean(x.primary)) - Number(Boolean(y.primary)))
  return { shown, menu }
}

export interface NavigationBarProps {
  title?: JSX.Element
  /** A short second line under the title (a state that is out of the ordinary). */
  subtitle?: JSX.Element
  /** The back control: the previous screen's title. */
  back?: { label: string; onClick: () => void }
  actions?: BarAction[]
  /** The title shows only once the large title has scrolled away. */
  titleHidden?: boolean
  /** Content is scrolled under the bar: a hairline under it. */
  scrolled?: boolean
  class?: string
}

/** The bar at the top of a phone screen. */
export function NavigationBar(props: NavigationBarProps): JSX.Element {
  const split = createMemo(() => splitBarActions(props.actions ?? []))
  let subtitleEl: HTMLElement | undefined
  createEffect(
    () => props.subtitle,
    () =>
      queueMicrotask(() =>
        subtitleEl?.setAttribute("title", subtitleEl.textContent?.replace(/\s+/g, " ").trim() ?? ""),
      ),
  )
  const menu = (): MenuEntry[] => {
    const out: MenuEntry[] = []
    let section: string | undefined
    for (const a of split().menu) {
      if (a.section !== section) {
        if (out.length) out.push({ type: "separator" })
        if (a.section) out.push({ type: "label", label: a.section })
        section = a.section
      }
      out.push({
        id: a.id,
        label: a.label,
        icon: a.icon,
        danger: a.danger,
        disabled: a.disabled,
        ...(a.checked === undefined ? {} : { checked: a.checked }),
      })
    }
    return out
  }
  return (
    <header
      class={cx("nc-navbar", props.class)}
      data-part="nav-bar"
      data-scrolled={props.scrolled ? "" : undefined}
    >
      <div class="nc-navbar__leading">
        <Show when={props.back}>
          {(b) => (
            <button
              type="button"
              class="nc-navbar__back nc-hit"
              data-part="nav-back"
              aria-label={`Back to ${b().label}`}
              onClick={() => b().onClick()}
            >
              <Icon name="chevron-left" class="nc-navbar__chevron" />
              <span class="nc-navbar__back-label">{b().label}</span>
            </button>
          )}
        </Show>
      </div>
      <div class="nc-navbar__title" data-part="nav-title" data-hidden={props.titleHidden ? "" : undefined}>
        {/* Both lines give way with an ellipsis on a narrow bar; their whole text is their title. */}
        <span class="nc-navbar__title-text" title={typeof props.title === "string" ? props.title : undefined}>
          {props.title}
        </span>
        <Show when={props.subtitle}>
          <span class="nc-navbar__subtitle" data-part="nav-subtitle" ref={subtitleEl}>
            {props.subtitle}
          </span>
        </Show>
      </div>
      <div class="nc-navbar__trailing" data-part="nav-actions">
        <For each={split().shown}>{(a) => <BarButton action={a} />}</For>
        <Show when={split().menu.length}>
          <DropdownMenu
            label="More actions"
            items={menu()}
            placement="bottom-end"
            onSelect={(id) =>
              split()
                .menu.find((a) => a.id === id)
                ?.onClick()
            }
            trigger={(t) => (
              <button
                {...t}
                type="button"
                class="nc-navbar__button nc-hit"
                aria-label="More actions"
                data-part="nav-overflow"
              >
                <Icon name="more" class="nc-navbar__glyph" />
              </button>
            )}
          />
        </Show>
      </div>
    </header>
  )
}

function BarButton(props: { action: BarAction }): JSX.Element {
  const a = () => props.action
  return (
    <button
      type="button"
      class={cx(
        "nc-navbar__button nc-hit",
        !a().icon && "nc-navbar__button--text",
        a().primary && "nc-navbar__button--primary",
      )}
      aria-label={a().icon ? a().label : undefined}
      aria-pressed={a().pressed === undefined ? undefined : aria(a().pressed)}
      disabled={a().disabled}
      data-action={a().id}
      onClick={() => a().onClick()}
    >
      <Show when={a().icon} fallback={a().label}>
        <Icon name={a().icon} class="nc-navbar__glyph" />
        <Show when={a().count}>
          <span class="nc-navbar__count">{a().count}</span>
        </Show>
      </Show>
    </button>
  )
}

export interface NavigationScreenProps {
  /** The screen's title: in the bar, and as the large title. Parts inside may replace it. */
  title?: string
  back?: { label: string; onClick: () => void }
  /** A large title above the content that collapses into the bar on scroll (list and root screens). */
  largeTitle?: boolean
  /** Actions of the screen itself, beside those its content gives. */
  actions?: BarAction[]
  /** Called when the bar's title changes (a part set it), for the next screen's back label. */
  onTitle?: (title: string) => void
  /** Told when the content asks for the full height (the tab bar hides). */
  onMode?: (mode: "scroll" | "fill" | "full") => void
  /**
   * A state of the whole app that is out of the ordinary (offline, reconnecting), shown on the bar's subtitle
   * line in place of the screen's own while it renders something. A phone has no status strip: this is where
   * such a state goes.
   */
  status?: JSX.Element
  level?: "index" | "main"
  /** Hidden behind the screen on top of it: its bar's title stays put for the swipe back. */
  class?: string
  /** Called with the element that scrolls, so the stack can scroll it to the top. */
  scrollRef?: (el: HTMLElement) => void
  children?: JSX.Element
}

/** A phone screen: the navigation bar, a large title and search where there are, then the content. */
export function NavigationScreen(props: NavigationScreenProps): JSX.Element {
  const [parts, setParts] = createSignal<Array<() => ScreenPart>>([])
  const value: ScreenContextValue = {
    level: () => props.level ?? "main",
    provide: (part) => {
      setParts((p) => [...p, part])
      return () => setParts((p) => p.filter((x) => x !== part))
    },
  }
  const merged = createMemo(() => merge(parts()))
  const title = () => merged().title || props.title || merged().fallbackTitle || ""
  const large = () => merged().largeTitle ?? props.largeTitle ?? false
  const mode = () => merged().mode ?? "scroll"
  createEffect(title, (t) => {
    props.onTitle?.(t)
  })
  createEffect(mode, (m) => {
    props.onMode?.(m)
  })

  let scroller!: HTMLDivElement
  let largeEl: HTMLElement | undefined
  const [collapsed, setCollapsed] = createSignal(false)
  // The title of a page that draws its own large one: shown in the bar once that has scrolled away.
  const [anchorGone, setAnchorGone] = createSignal(false)
  const [scrolled, setScrolled] = createSignal(false)
  const [searchHidden, setSearchHidden] = createSignal(false)
  let lastTop = 0
  const onScroll = () => {
    const top = scroller.scrollTop
    setScrolled(top > 0)
    setCollapsed(!large() || !largeEl || top >= largeEl.offsetHeight - 6)
    const anchor = merged().titleAnchor
    setAnchorGone(
      !!anchor && anchor.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().top + 6,
    )
    // The search field hides while the content moves down and comes back when it moves up.
    const delta = top - lastTop
    if (top <= (largeEl?.offsetHeight ?? 0)) setSearchHidden(false)
    else if (delta > 4) setSearchHidden(true)
    else if (delta < -4) setSearchHidden(false)
    lastTop = top
  }
  createEffect(
    () => [large(), merged().titleAnchor],
    () => queueMicrotask(onScroll),
  )

  // Pull to refresh, on the screen's own scroller.
  const [pull, setPull] = createSignal(0)
  const [refreshing, setRefreshing] = createSignal(false)
  onSettled(() => {
    props.scrollRef?.(scroller)
    let startY: number | null = null
    let distance = 0
    const start = (e: TouchEvent) => {
      if (!merged().onRefresh || scroller.scrollTop > 0 || refreshing()) return
      startY = e.touches[0]!.clientY
      distance = 0
    }
    const moveTouch = (e: TouchEvent) => {
      if (startY === null) return
      distance = e.touches[0]!.clientY - startY
      if (distance <= 0 || scroller.scrollTop > 0) {
        setPull(0)
        return
      }
      if (e.cancelable) e.preventDefault()
      setPull(rubberBand(distance))
    }
    const end = async () => {
      if (startY === null) return
      startY = null
      const go = pullRefreshes(distance)
      setPull(0)
      if (!go) return
      setRefreshing(true)
      try {
        await merged().onRefresh?.()
      } finally {
        setRefreshing(false)
      }
    }
    scroller.addEventListener("touchstart", start, { passive: true })
    scroller.addEventListener("touchmove", moveTouch, { passive: false })
    scroller.addEventListener("touchend", end)
    scroller.addEventListener("touchcancel", end)
  })

  const search = () => merged().search
  return (
    <ScreenContext value={value}>
      <section
        class={cx("nc-screen", props.class)}
        data-part="screen"
        data-mode={mode()}
        data-level={props.level ?? "main"}
        data-large={large() ? "" : undefined}
      >
        <NavigationBar
          title={title()}
          subtitle={props.status ?? merged().subtitle}
          back={props.back}
          actions={[...(props.actions ?? []), ...(merged().actions ?? [])]}
          titleHidden={(large() && !collapsed()) || (!!merged().titleAnchor && !anchorGone())}
          scrolled={scrolled() && (!large() || collapsed())}
        />
        <div
          ref={scroller}
          class="nc-screen__scroll"
          data-part="screen-scroll"
          onScroll={onScroll}
          style={pull() ? { "--nc-pull": `${pull()}px` } : undefined}
        >
          <Show when={merged().onRefresh && (pull() > 0 || refreshing())}>
            <div class="nc-screen__refresh" data-part="refresh" aria-live="polite">
              <span
                class="nc-spinner"
                role="status"
                aria-label={refreshing() ? "Refreshing" : "Pull to refresh"}
              />
            </div>
          </Show>
          <Show when={large()}>
            <h1 class="nc-screen__large" data-part="large-title" ref={(el) => (largeEl = el)}>
              {title()}
            </h1>
          </Show>
          <Show when={search()}>
            {(s) => (
              <div
                class="nc-screen__search"
                data-part="screen-search"
                data-hidden={searchHidden() ? "" : undefined}
              >
                <label class="nc-search nc-screen__search-field">
                  <Icon name="search" size="sm" />
                  <input
                    type="search"
                    enterkeyhint="search"
                    aria-label={s().label ?? s().placeholder ?? "Search"}
                    placeholder={s().placeholder ?? "Search"}
                    value={s().value}
                    onInput={(e) => s().onInput(e.currentTarget.value)}
                  />
                </label>
              </div>
            )}
          </Show>
          <div class="nc-screen__content" data-part="screen-content">
            {untrack(() => props.children)}
          </div>
        </div>
      </section>
    </ScreenContext>
  )
}

/** A search field under the screen's large title on a phone; inline elsewhere. */
export function ScreenSearch(props: ScreenSearchValue & { class?: string }): JSX.Element {
  const onPhone = provideScreen(() => ({
    search: {
      value: props.value,
      onInput: props.onInput,
      placeholder: props.placeholder,
      label: props.label,
    },
  }))
  return (
    <Show when={!onPhone}>
      <label class={cx("nc-search", props.class)}>
        <Icon name="search" size="sm" />
        <input
          type="search"
          aria-label={props.label ?? props.placeholder ?? "Search"}
          placeholder={props.placeholder ?? "Search"}
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
        />
      </label>
    </Show>
  )
}

/** Pull to refresh for the screen this is in (a phone only). Renders nothing. */
export function ScreenRefresh(props: { onRefresh: () => Promise<unknown> | unknown }): JSX.Element {
  provideScreen(() => ({ onRefresh: props.onRefresh }))
  return null
}

/** Options for the screen this is in: its mode (a terminal asks for `full`), a large title. Renders nothing. */
export function ScreenOptions(props: { mode?: ScreenPart["mode"]; largeTitle?: boolean; title?: string }) {
  provideScreen(() => ({ mode: props.mode, largeTitle: props.largeTitle, title: props.title }))
  return null
}
