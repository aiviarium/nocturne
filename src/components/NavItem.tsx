import type { JSX } from "@solidjs/web"
import { createSignal, For, omit, onCleanup, Show } from "solid-js"
import { cx } from "../lib/cx"
import { callClick, useLinkClick } from "../lib/link"
import { isMenuKey, type RowMenuEntry } from "../lib/rowmenu"
import { useShellSidebar } from "../shell/context"
import { Icon, type IconName, type LucideNode } from "./Icon"
import { IconButton } from "./IconButton"
import { RowMenu } from "./InsetList"
import { Popover } from "./Popover"
import { Tooltip } from "./Tooltip"

export interface NavItemProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /** Stable id: what `Nav`'s `collapsed` names. Default the label. */
  id?: string
  /** Row label. */
  label: string
  /** A named icon. */
  icon?: IconName
  /** Any other Lucide icon, as a node. */
  iconNode?: LucideNode
  /** Content in the icon's place, such as a letter mark for an entry that has no icon. */
  leading?: JSX.Element
  /** Right-aligned meta: a total in text-3, or a short status such as "1 needs you". */
  meta?: JSX.Element
  /** A count at the row's end (shown when it is not 0 and there is no `meta`). Folded, it is a dot on the icon. */
  count?: number
  /** A dot on the folded rail's icon without a count. */
  dot?: boolean
  /** The current page. Sets `aria-current="page"`. */
  current?: boolean
  /** Where the row goes: rendered as a link. */
  href?: string
  /** The row opens a level of the sidebar, such as a project's or a host's places: a chevron ends it. */
  drill?: boolean
  /** Child views, drawn under the row with their labels where the row's label starts. */
  items?: NavItemProps[]
  /** Part of the label to mark as a filter's match. `Nav` sets it from its `filter`. */
  match?: string
  /**
   * The row's context menu, as a list row's: a right click, the Menu key or Shift+F10. An entry runs its own
   * `onSelect`. Read when the menu opens.
   */
  menu?: () => RowMenuEntry[]
}

const OWN = [
  "id",
  "label",
  "icon",
  "iconNode",
  "leading",
  "meta",
  "count",
  "dot",
  "current",
  "class",
  "href",
  "onClick",
  "drill",
  "items",
  "match",
  "menu",
] as const

/** A label with the first match of `q` marked. */
export function MatchText(props: { text: string; q?: string }): JSX.Element {
  const q = () => props.q?.trim() ?? ""
  const at = () => (q() ? props.text.toLowerCase().indexOf(q().toLowerCase()) : -1)
  return (
    <Show when={at() >= 0} fallback={props.text}>
      {props.text.slice(0, at())}
      <mark class="nc-match" data-part="nav-match">
        {props.text.slice(at(), at() + q().length)}
      </mark>
      {props.text.slice(at() + q().length)}
    </Show>
  )
}

/** A sidebar row. Renders a link when it has an `href`, a button otherwise. */
export function NavItem(
  props: NavItemProps & { disclose?: JSX.Element; within?: boolean; child?: boolean },
): JSX.Element {
  const rest = omit(props, ...OWN, "disclose", "within", "child")
  const linkClick = useLinkClick()
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number } | null>(null)
  // The row the menu opened on: its theme for the menu, and where focus goes back after it closes.
  let menuRow: HTMLElement | undefined
  const entries = () => (menuAt() ? (props.menu?.() ?? []) : [])
  const onContextMenu = (e: MouseEvent) => {
    if (!props.menu) return
    e.preventDefault()
    menuRow = e.currentTarget as HTMLElement
    setMenuAt({ x: e.clientX, y: e.clientY })
  }
  const onMenuKey = (e: KeyboardEvent) => {
    if (!props.menu || !isMenuKey(e)) return
    e.preventDefault()
    menuRow = e.currentTarget as HTMLElement
    const r = menuRow.getBoundingClientRect()
    setMenuAt({ x: r.left + 24, y: r.bottom })
  }
  const menu = (
    <Show when={menuAt()}>
      {(at) => (
        <RowMenu
          at={at()}
          label={props.label}
          items={entries()}
          origin={menuRow}
          returnFocus={() => menuRow}
          onClose={() => setMenuAt(null)}
          onSelect={(id) => {
            const entry = entries().find((x) => "id" in x && x.id === id) as
              | { onSelect?: () => void }
              | undefined
            setMenuAt(null)
            entry?.onSelect?.()
          }}
        />
      )}
    </Show>
  )
  const body = (
    <>
      <Show
        when={props.leading}
        fallback={
          <Show when={props.icon || props.iconNode}>
            <Icon name={props.icon} node={props.iconNode} />
          </Show>
        }
      >
        {props.leading}
      </Show>
      <span class="nc-nav-item__label">
        <MatchText text={props.label} q={props.match} />
      </span>
      <Show
        when={props.meta}
        fallback={
          <Show when={props.count}>
            <span class="nc-nav-item__meta nc-nav-item__count">{props.count}</span>
          </Show>
        }
      >
        <span class="nc-nav-item__meta">{props.meta}</span>
      </Show>
      <Show when={props.drill}>
        <Icon name="chevron-right" size="sm" class="nc-nav-item__drill" />
      </Show>
      {/* A parent's fold control, at the row's end over its count, shown on hover; the icon stays. */}
      {props.disclose}
    </>
  )
  const cls = () => cx("nc-nav-item", props.child && "nc-nav-item--child", props.class)
  return (
    <Show
      when={props.href}
      fallback={
        <button
          data-part="nav-item"
          type="button"
          class={cls()}
          aria-current={props.current ? "page" : undefined}
          data-within={props.within ? "" : undefined}
          onClick={(e) => callClick(props.onClick, e)}
          onContextMenu={onContextMenu}
          onKeyDown={onMenuKey}
          {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {body}
          {menu}
        </button>
      }
    >
      <a
        data-part="nav-item"
        href={props.href}
        class={cls()}
        aria-current={props.current ? "page" : undefined}
        data-within={props.within ? "" : undefined}
        onClick={(e) => {
          callClick(props.onClick, e)
          linkClick(e, props.href)
        }}
        onContextMenu={onContextMenu}
        onKeyDown={onMenuKey}
        {...rest}
      >
        {body}
        {menu}
      </a>
    </Show>
  )
}

/** NavGroup is a run of items under an optional heading. */
export interface NavGroup {
  /** The sentence-case heading. */
  label?: string
  /** A small icon before the heading, such as the place a section of entries belongs to. Needs a `label`. */
  icon?: IconName
  /**
   * The heading folds the group with a chevron at its end, kept in `Nav`'s `collapsed` as `id`. Needs a `label` and
   * `onCollapsedChange`.
   */
  collapsible?: boolean
  /** Stable id for `collapsed`. Default the label. */
  id?: string
  /**
   * The heading is also a place: clicking it opens the place, so the place needs no row of its own above its
   * entries. Needs a `label`.
   */
  onClick?: () => void
  /** The heading's place is the current page. */
  current?: boolean
  /** A count after the heading, shown above 0. */
  count?: number
  /**
   * A row under the group's items for its own controls, such as adding an item or showing the rest. It shows when the
   * group is folded too, and not on the folded rail.
   */
  footer?: JSX.Element
  /** One small icon action at the heading's end, such as adding an item to the group. Needs a `label`. */
  action?: { label: string; icon: IconName; onClick: () => void }
  items: NavItemProps[]
}

export interface NavProps {
  /** Accessible name of the navigation landmark. */
  label: string
  /** Groups of items, each with an optional sentence-case heading and one action beside it. */
  groups?: NavGroup[]
  /**
   * Filters the tree in place: items whose label holds the text stay, with their parents, and the match is
   * marked. A parent that matches keeps all its children. Collapsed parents open while it is set.
   */
  filter?: string
  /** Ids of the parents whose children are hidden. With `onCollapsedChange`, a parent's icon toggles it. */
  collapsed?: readonly string[]
  onCollapsedChange?: (collapsed: string[]) => void
  /**
   * The icon rail: top-level items as icons with their names in tooltips, a neutral dot where an item or its
   * children have a count, groups divided by a short rule. Default: the `AppShell`'s sidebar fold.
   */
  folded?: boolean
  /** Free-form content after the groups. Not shown folded. */
  children?: JSX.Element
  class?: string
}

const keyOf = (item: NavItemProps) => item.id ?? item.label
const has = (q: string, label: string) => label.toLowerCase().includes(q.toLowerCase())

/** The item as the filter leaves it: itself when it matches, else with only its matching children, else nothing. */
function filtered(item: NavItemProps, q: string): NavItemProps | undefined {
  if (!q) return item
  if (has(q, item.label)) return item
  const kids = (item.items ?? []).map((c) => filtered(c, q)).filter((c): c is NavItemProps => !!c)
  return kids.length ? { ...item, items: kids } : undefined
}

const countIn = (item: NavItemProps): number =>
  (item.count ?? 0) + (item.items ?? []).reduce((s, c) => s + countIn(c), 0)
const dotIn = (item: NavItemProps): boolean => countIn(item) > 0 || !!item.dot || !!item.items?.some(dotIn)
const currentIn = (item: NavItemProps): boolean => !!item.items?.some((c) => c.current || currentIn(c))

/**
 * A sidebar navigation landmark that lays out NavItem groups. Groups and items are kept by position, so a router
 * that builds them afresh on every navigation (to move `current`) updates the items in place: the list isn't
 * rebuilt, and the sidebar keeps its scroll position and focus.
 */
export function Nav(props: NavProps): JSX.Element {
  const sidebar = useShellSidebar()
  const folded = () => props.folded ?? sidebar?.folded() ?? false
  const q = () => props.filter?.trim() ?? ""
  const groups = () =>
    (props.groups ?? [])
      .map((g) => ({
        ...g,
        items: g.items.map((i) => filtered(i, q())).filter((i): i is NavItemProps => !!i),
      }))
      .filter((g) => !q() || g.items.length > 0)
  const groupKey = (g: NavGroup) => g.id ?? g.label ?? ""
  // Sections whose entries the person listed flat on the folded rail.
  const [railOpen, setRailOpen] = createSignal<string[]>([])
  const foldable = (g: NavGroup) => !!g.collapsible && !!g.label && !!props.onCollapsedChange
  // A group with the open item in it stays open, as a parent does.
  const groupClosed = (g: NavGroup) =>
    foldable(g) &&
    !q() &&
    !!props.collapsed?.includes(groupKey(g)) &&
    !g.items.some((i) => i.current || currentIn(i))
  const toggleGroup = (g: NavGroup) => {
    const id = groupKey(g)
    const now = props.collapsed ?? []
    props.onCollapsedChange?.(now.includes(id) ? now.filter((x) => x !== id) : [...now, id])
  }
  const isClosed = (item: NavItemProps) =>
    !q() && !!props.collapsed?.includes(keyOf(item)) && !currentIn(item)
  const toggle = (item: NavItemProps) => {
    const id = keyOf(item)
    const now = props.collapsed ?? []
    props.onCollapsedChange?.(now.includes(id) ? now.filter((x) => x !== id) : [...now, id])
  }

  const Tree = (p: { items: NavItemProps[]; child?: boolean }): JSX.Element => (
    <For keyed={false} each={p.items}>
      {(item) => (
        <>
          <NavItem
            {...item()}
            child={p.child}
            match={q()}
            within={currentIn(item())}
            disclose={
              item().items?.length && props.onCollapsedChange && !p.child ? (
                <span
                  class="nc-nav-item__disclose"
                  role="button"
                  tabindex="-1"
                  data-part="nav-disclose"
                  aria-label={isClosed(item()) ? `Expand ${item().label}` : `Collapse ${item().label}`}
                  aria-expanded={isClosed(item()) ? "false" : "true"}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggle(item())
                  }}
                >
                  <Icon
                    name={isClosed(item()) ? "chevron-right" : "chevron-down"}
                    size="sm"
                    class="nc-nav-item__chevron"
                  />
                </span>
              ) : undefined
            }
          />
          <Show when={item().items?.length && !isClosed(item())}>
            <div class="nc-nav__children" role="group" aria-label={item().label}>
              <Tree items={item().items ?? []} child />
            </div>
          </Show>
        </>
      )}
    </For>
  )

  return (
    <nav
      data-part="nav"
      data-folded={folded() ? "" : undefined}
      aria-label={props.label}
      class={cx("nc-nav", props.class)}
    >
      <Show
        when={!folded()}
        fallback={
          <For keyed={false} each={props.groups ?? []}>
            {(group, gi) => (
              <>
                {/* A rule between groups, but not between one place's section and the next. */}
                <Show when={gi > 0 && !(group().onClick && (props.groups ?? [])[gi - 1]?.onClick)}>
                  <span class="nc-nav__rule" role="separator" aria-label={group().label} />
                </Show>
                <Show
                  when={group().onClick}
                  fallback={
                    <For keyed={false} each={group().items}>
                      {(item) => <RailItem item={item()} />}
                    </For>
                  }
                >
                  <RailGroup
                    group={group()}
                    open={railOpen().includes(groupKey(group()))}
                    onOpenChange={(v) => {
                      const id = groupKey(group())
                      setRailOpen((now) => (v ? [...now, id] : now.filter((x) => x !== id)))
                    }}
                  />
                </Show>
              </>
            )}
          </For>
        }
      >
        <For keyed={false} each={groups()}>
          {(group) => (
            <>
              <Show when={group().label}>
                <Show
                  when={group().action || group().icon || group().onClick || foldable(group())}
                  fallback={<span class="nc-nav__label">{group().label}</span>}
                >
                  <div
                    class="nc-nav__head"
                    data-empty={group().items.length === 0 ? "" : undefined}
                    data-icon={group().icon ? "" : undefined}
                    data-current={group().current ? "" : undefined}
                  >
                    <Show
                      when={group().onClick}
                      fallback={
                        <span class="nc-nav__label">
                          <Show when={group().icon}>{(icon) => <Icon name={icon()} size="sm" />}</Show>
                          {group().label}
                        </span>
                      }
                    >
                      <button
                        type="button"
                        class="nc-nav__label nc-nav__label--link"
                        data-part="nav-group-link"
                        aria-current={group().current ? "page" : undefined}
                        onClick={() => group().onClick?.()}
                      >
                        <Show when={group().icon}>{(icon) => <Icon name={icon()} size="sm" />}</Show>
                        <span class="nc-nav__label-text">{group().label}</span>
                        <Show when={group().count}>
                          <span class="nc-nav__count">{group().count}</span>
                        </Show>
                      </button>
                    </Show>
                    <Show when={group().action}>
                      {(action) => (
                        <IconButton
                          size="sm"
                          class="nc-nav__action"
                          icon={action().icon}
                          label={action().label}
                          onClick={() => action().onClick()}
                        />
                      )}
                    </Show>
                    <Show when={foldable(group())}>
                      <IconButton
                        size="sm"
                        class="nc-nav__action nc-nav__fold"
                        data-part="nav-group-fold"
                        icon={groupClosed(group()) ? "chevron-right" : "chevron-down"}
                        label={groupClosed(group()) ? `Expand ${group().label}` : `Collapse ${group().label}`}
                        aria-expanded={groupClosed(group()) ? "false" : "true"}
                        onClick={() => toggleGroup(group())}
                      />
                    </Show>
                  </div>
                </Show>
              </Show>
              <Show when={!groupClosed(group())}>
                <Tree items={group().items} />
              </Show>
              <Show when={group().footer}>
                <div class="nc-nav__foot" data-part="nav-group-foot">
                  {group().footer}
                </div>
              </Show>
            </>
          )}
        </For>
        {props.children}
      </Show>
    </nav>
  )
}

/** The "Show 3 more" row the shell ends a long section with. */
const isMoreRow = (i: NavItemProps) => /\bnc-nav-item--more\b/.test(String(i.class ?? ""))

/**
 * A section that is its place, on the folded rail: the place's icon alone, which opens it. Hovering or focusing it
 * shows its entries in a flyout to its right; the small chevron under it lists them flat on the rail.
 */
function RailGroup(props: {
  group: NavGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}): JSX.Element {
  const [shown, setShown] = createSignal(false)
  let anchor: HTMLButtonElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  // A short delay each way, so passing over the rail opens nothing and the pointer can cross the gap.
  const show = (v: boolean, delay: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => setShown(v), delay)
  }
  onCleanup(() => clearTimeout(timer))
  const label = () => props.group.label ?? ""
  const entries = () => props.group.items.filter((i) => !isMoreRow(i))
  const current = () => !!props.group.current || props.group.items.some((i) => !!i.current || currentIn(i))
  const dot = () => (props.group.count ?? 0) > 0 || props.group.items.some(dotIn)
  return (
    <div class="nc-nav-rail-group" data-part="nav-rail-group">
      <button
        ref={anchor}
        type="button"
        class="nc-nav-rail-item"
        data-part="nav-item"
        data-folded=""
        aria-label={label()}
        aria-current={props.group.current ? "page" : undefined}
        aria-expanded={shown() ? "true" : "false"}
        data-within={!props.group.current && current() ? "" : undefined}
        onClick={() => {
          setShown(false)
          props.group.onClick?.()
        }}
        onMouseEnter={() => show(true, 120)}
        onMouseLeave={() => show(false, 200)}
        onFocus={(e) => {
          if ((e.currentTarget as HTMLElement).matches(":focus-visible")) show(true, 0)
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && shown()) {
            e.preventDefault()
            setShown(false)
          }
        }}
      >
        <Icon name={props.group.icon ?? "folder"} />
        <Show when={dot()}>
          <i class="nc-nav-rail-item__dot" data-part="nav-dot" aria-hidden="true" />
        </Show>
      </button>
      <button
        type="button"
        class="nc-nav-rail-group__expand"
        data-part="nav-rail-expand"
        aria-label={props.open ? `Hide ${label()} entries` : `Show ${label()} entries`}
        aria-expanded={props.open ? "true" : "false"}
        onClick={() => props.onOpenChange(!props.open)}
      >
        <Icon name={props.open ? "chevron-up" : "chevron-down"} size="sm" />
      </button>
      <Show when={props.open}>
        <For keyed={false} each={entries()}>
          {(item) => <RailItem item={item()} />}
        </For>
      </Show>
      <Popover
        open={shown()}
        anchor={anchor}
        placement="right-start"
        offset={8}
        surface
        class="nc-nav-flyout"
        data-part="nav-flyout"
        onClose={() => setShown(false)}
        onMouseEnter={() => show(true, 0)}
        onMouseLeave={() => show(false, 200)}
      >
        <div class="nc-nav-flyout__head">
          <span class="nc-nav-flyout__title">{label()}</span>
          <Show when={props.group.count}>
            <span class="nc-nav__count">{props.group.count}</span>
          </Show>
        </div>
        <div class="nc-nav-flyout__rows" role="group" aria-label={label()}>
          <For keyed={false} each={props.group.items}>
            {(item) => (
              <NavItem
                {...item()}
                onClick={(e) => {
                  // Show N more expands here; any other row opens and closes the flyout.
                  if (!isMoreRow(item())) setShown(false)
                  callClick(item().onClick, e)
                }}
              />
            )}
          </For>
        </div>
      </Popover>
    </div>
  )
}

/** One top-level item on the folded rail: its icon, its name in a tooltip, a dot where it or its children count. */
function RailItem(props: { item: NavItemProps }): JSX.Element {
  const linkClick = useLinkClick()
  const current = () => !!props.item.current || currentIn(props.item)
  const glyph = () => (
    <Show
      when={props.item.leading}
      fallback={<Icon name={props.item.icon ?? "folder"} node={props.item.iconNode} />}
    >
      {props.item.leading}
    </Show>
  )
  return (
    <Tooltip content={props.item.label} placement="right" type="label">
      {(t) => (
        <a
          {...t}
          href={props.item.href ?? "#"}
          class="nc-nav-rail-item"
          data-part="nav-item"
          data-folded=""
          aria-label={props.item.label}
          aria-current={current() ? "page" : undefined}
          onClick={(e) => {
            callClick(props.item.onClick, e)
            if (props.item.href) linkClick(e, props.item.href)
            else e.preventDefault()
          }}
        >
          {glyph()}
          <Show when={dotIn(props.item)}>
            <i class="nc-nav-rail-item__dot" data-part="nav-dot" aria-hidden="true" />
          </Show>
        </a>
      )}
    </Tooltip>
  )
}
