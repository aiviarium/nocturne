// Every exported part renders with its stable `data-part` and does its main thing: the parts whose other tests
// render them without checking the part, or check the part without exercising them.
import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  Avatar,
  AvatarStack,
  Badge,
  BoardCard,
  BoardCardMeta,
  BoardCardTitle,
  BoardCardTop,
  CodeBadge,
  Count,
  DataListInput,
  Delta,
  EmptyState,
  Icon,
  IdBadge,
  LabelChip,
  Mark,
  MatchText,
  NavigationScreen,
  NumberField,
  PropertyList,
  RadioGroup,
  ScreenSearch,
  Skeleton,
  StatCard,
  State,
  StatusDot,
  StopGlyph,
  SwipeButton,
  TabBar,
  Truncate,
  WidgetTimer,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const show = (view: Parameters<typeof mount>[0]) => {
  const m = mount(view)
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

describe("display parts follow their props", () => {
  test("Avatar: initials of the name, one letter for an agent, the sparkle for the assistant", () => {
    const [kind, setKind] = createSignal<"person" | "agent" | "ai">("person")
    const { root } = show(() => <Avatar name="Mira Okafor" kind={kind()} />)
    const avatar = one("[data-part=avatar]", root)
    expect(avatar.getAttribute("aria-label")).toBe("Mira Okafor")
    expect(avatar.textContent).toBe("MO")
    setKind("agent")
    flush()
    expect(avatar.textContent).toBe("M")
    expect(avatar.classList.contains("nc-avatar--agent")).toBe(true)
    setKind("ai")
    flush()
    expect(avatar.querySelector("[data-part=icon]")).toBeTruthy()
  })

  test("AvatarStack: shows up to max and counts the rest", () => {
    const [max, setMax] = createSignal(2)
    const people = [{ name: "Ada Byron" }, { name: "Bo Chen" }, { name: "Cy Dee" }, { name: "Di Eve" }]
    const { root } = show(() => <AvatarStack people={people} max={max()} />)
    const stack = one("[data-part=avatar-stack]", root)
    expect(stack.getAttribute("aria-label")).toBe("4 people")
    expect(all("[data-part=avatar]").length).toBe(2)
    expect(one(".nc-avatar--more", stack).textContent).toBe("+2")
    setMax(4)
    flush()
    expect(stack.querySelectorAll("[data-part=avatar]")).toHaveLength(4)
    expect(stack.querySelector(".nc-avatar--more")).toBeNull()
  })

  test("Badge, Count, Delta, IdBadge, CodeBadge and LabelChip carry their tone and value", () => {
    const [n, setN] = createSignal(5)
    const [dir, setDir] = createSignal<"up" | "down">("up")
    const { root } = show(() => (
      <div>
        <Badge tone="danger" icon="bell">
          Failed
        </Badge>
        <Count value={n()} max={9} />
        <Delta direction={dir()} value="4%" />
        <IdBadge>WEB-1</IdBadge>
        <CodeBadge tone="warning">409</CodeBadge>
        <LabelChip hue="rose">Design</LabelChip>
      </div>
    ))
    expect(one("[data-part=badge]", root).getAttribute("data-tone")).toBe("danger")
    expect(one("[data-part=badge] [data-part=icon]", root).getAttribute("data-icon")).toBe("bell")
    const count = one("[data-part=count]", root)
    expect(count.textContent).toBe("5")
    setN(12)
    flush()
    expect(count.textContent).toBe("9+")
    const delta = one("[data-part=delta]", root)
    expect(delta.classList.contains("nc-delta--up")).toBe(true)
    setDir("down")
    flush()
    expect(delta.getAttribute("data-direction")).toBe("down")
    expect(delta.classList.contains("nc-delta--down")).toBe(true)
    expect(one("[data-part=id-badge]", root).textContent).toBe("WEB-1")
    expect(one("[data-part=code-badge]", root).getAttribute("data-tone")).toBe("warning")
    expect(one("[data-part=label-chip] .nc-chip__dot", root).getAttribute("data-hue")).toBe("rose")
  })

  test("EmptyState: title, one line and its action, which works", () => {
    let cleared = 0
    const { root } = show(() => (
      <EmptyState icon="search" title="No sessions match" description="Status: live">
        <button type="button" onClick={() => cleared++}>
          Clear filters
        </button>
      </EmptyState>
    ))
    const empty = one("[data-part=empty-state]", root)
    expect(one(".nc-empty__title", empty).textContent).toBe("No sessions match")
    expect(one(".nc-empty__desc", empty).textContent).toBe("Status: live")
    click(one("button", empty))
    expect(cleared).toBe(1)
  })

  test("Mark: the first letter, an icon in its place, decorative when told", () => {
    const [icon, setIcon] = createSignal<"server" | undefined>(undefined)
    const { root } = show(() => <Mark name="acme" icon={icon()} hue="sky" />)
    const mark = one("[data-part=mark]", root)
    expect(mark.textContent).toBe("A")
    expect(mark.getAttribute("aria-label")).toBe("acme")
    setIcon("server")
    flush()
    expect(mark.querySelector("[data-part=icon]")).toBeTruthy()
    const quiet = show(() => <Mark name="acme" decorative />)
    expect(one("[data-part=mark]", quiet.root).getAttribute("aria-hidden")).toBe("true")
  })

  test("Skeleton: hidden from assistive technology, sized, immediate on request", () => {
    const { root } = show(() => <Skeleton width="60%" height="12px" circle immediate />)
    const s = one("[data-part=skeleton]", root)
    expect(s.getAttribute("aria-hidden")).toBe("true")
    expect(s.style.width).toBe("60%")
    expect(s.hasAttribute("data-immediate")).toBe(true)
    expect(s.classList.contains("nc-skeleton--circle")).toBe(true)
  })

  test("StatCard: label, value and unit, and a meter that follows its value", () => {
    const [v, setV] = createSignal(40)
    const { root } = show(() => <StatCard label="Memory" value={12} unit="GB" meter={{ value: v() }} />)
    const card = one("[data-part=stat-card]", root)
    expect(one(".nc-stat__value", card).textContent).toBe("12GB")
    const meter = one("[role=progressbar]", card)
    expect(meter.getAttribute("aria-label")).toBe("Memory")
    setV(140)
    flush()
    expect(meter.getAttribute("aria-valuenow")).toBe("140")
    expect(one<HTMLElement>("[role=progressbar] span", card).style.width).toBe("100%")
  })

  test("StatusDot and State: the dot's status, and the word coloured only when something is wrong", () => {
    const [status, setStatus] = createSignal<"live" | "error">("live")
    const { root } = show(() => <State status={status()}>Running</State>)
    const state = one("[data-part=state]", root)
    expect(one("[data-part=status-dot]", state).getAttribute("data-status")).toBe("live")
    expect(state.classList.contains("nc-state--error")).toBe(false)
    setStatus("error")
    flush()
    expect(state.classList.contains("nc-state--error")).toBe(true)
    const dot = show(() => <StatusDot status="warn" />)
    expect(one("[data-part=status-dot]", dot.root).classList.contains("nc-dot--warn")).toBe(true)
  })

  test("Truncate: the whole text is its title, and lines clamp", () => {
    const [text, setText] = createSignal("a/long/path")
    const { root } = show(() => <Truncate text={text()} lines={2} mono />)
    const t = one("[data-part=truncate]", root)
    expect(t.getAttribute("title")).toBe("a/long/path")
    expect(t.classList.contains("nc-truncate--clamp")).toBe(true)
    setText("other")
    flush()
    expect(t.getAttribute("title")).toBe("other")
    expect(t.textContent).toBe("other")
  })

  test("Icon and StopGlyph: decorative unless labelled", () => {
    const [label, setLabel] = createSignal<string | undefined>(undefined)
    const { root } = show(() => (
      <div>
        <Icon name="search" label={label()} />
        <StopGlyph />
      </div>
    ))
    const [icon, stop] = all<SVGElement>("[data-part=icon]")
    expect(icon!.getAttribute("data-icon")).toBe("search")
    expect(icon!.getAttribute("aria-hidden")).toBe("true")
    setLabel("Search")
    flush()
    expect(one("[data-part=icon][data-icon=search]", root).getAttribute("aria-label")).toBe("Search")
    expect(stop!.getAttribute("aria-hidden")).toBe("true")
  })
})

describe("PropertyList", () => {
  test("a labelled value per row, a dash for an empty one, updated in place", () => {
    const [owner, setOwner] = createSignal<string | undefined>(undefined)
    const { root } = show(() => (
      <PropertyList
        items={[
          { label: "Region", value: "eu-west" },
          { label: "Owner", value: owner() },
        ]}
      />
    ))
    const list = one("[data-part=property-list]", root)
    expect(list.tagName).toBe("DL")
    expect(one("[data-property=Owner] dd", list).textContent).toBe("—")
    setOwner("Mira")
    flush()
    expect(one("[data-property=Owner] dd", list).textContent).toBe("Mira")
    expect(one("[data-property=Region] dt", list).getAttribute("title")).toBe("Region")
  })
})

describe("BoardCardTop, BoardCardTitle and BoardCardMeta", () => {
  test("lay out a card's own body in place of its props", () => {
    let clicks = 0
    const { root } = show(() => (
      <BoardCard onClick={() => clicks++}>
        <BoardCardTop>
          <span class="key">WEB-1</span>
        </BoardCardTop>
        <BoardCardTitle icon={<i class="glyph" />}>Fix the login</BoardCardTitle>
        <BoardCardMeta>
          <span class="est">3</span>
        </BoardCardMeta>
      </BoardCard>
    ))
    const card = one("[data-part=board-card]", root)
    expect(one("[data-part=board-card-top] .key", card).textContent).toBe("WEB-1")
    const title = one("[data-part=board-card-title]", card)
    expect(one(".nc-board-card__text", title).textContent).toBe("Fix the login")
    expect(one(".nc-board-card__icon .glyph", title)).toBeTruthy()
    expect(one("[data-part=board-card-meta] .est", card).textContent).toBe("3")
    click(card)
    expect(clicks).toBe(1)
  })
})

describe("TabBar", () => {
  test("is a named navigation landmark that hides on request and follows the active tab", () => {
    const [active, setActive] = createSignal("home")
    const [hidden, setHidden] = createSignal(false)
    const { root } = show(() => (
      <TabBar
        label="Sections"
        active={active()}
        hidden={hidden()}
        items={[
          { id: "home", label: "Home", icon: "home" },
          { id: "inbox", label: "Inbox", icon: "inbox", badge: 120 },
        ]}
        onSelect={setActive}
      />
    ))
    const bar = one("[data-part=tab-bar]", root)
    expect(bar.tagName).toBe("NAV")
    expect(bar.getAttribute("aria-label")).toBe("Sections")
    expect(one("[data-part=tab-badge]", bar).textContent).toBe("99+")
    click(one("[data-tab=inbox]", bar))
    expect(one("[data-tab=inbox]", bar).getAttribute("aria-current")).toBe("page")
    expect(one("[data-tab=home]", bar).getAttribute("aria-current")).toBeNull()
    setHidden(true)
    flush()
    expect(bar.hidden).toBe(true)
  })
})

describe("RadioGroup", () => {
  test("is a named group whose choice is reported", () => {
    const chosen: string[] = []
    const { root } = show(() => (
      <RadioGroup
        label="View"
        options={[
          { value: "board", label: "Board" },
          { value: "list", label: "List" },
        ]}
        value="board"
        onChange={(v) => chosen.push(v)}
      />
    ))
    const group = one("[data-part=radio-group]", root)
    expect(group.getAttribute("aria-label")).toBe("View")
    const radios = all("[role=radio]")
    click(radios[1]!)
    expect(chosen).toEqual(["list"])
  })
})

describe("NumberField", () => {
  test("has its part on the root and steps with the arrow keys", async () => {
    const [v, setV] = createSignal(4)
    const { root } = show(() => (
      <NumberField label="Replicas" value={v()} onChange={(n) => setV(n ?? 0)} step={1} />
    ))
    const field = one("[data-part=number-field]", root)
    const input = one<HTMLInputElement>("input[role=spinbutton]", field)
    press(input, "ArrowUp")
    await tick()
    expect(v()).toBe(5)
  })
})

describe("WidgetTimer", () => {
  test("is a widget whose ticks follow the progress", () => {
    const [p, setP] = createSignal(0.25)
    const { root } = show(() => <WidgetTimer title="Focus" value="18:24" progress={p()} ticks={8} />)
    const widget = one("[data-part=widget]", root)
    expect(widget.classList.contains("nc-widget--timer")).toBe(true)
    const ticks = one("[data-part=widget-timer-ticks]", widget)
    expect(ticks.querySelectorAll(".nc-wtimer__tick--on")).toHaveLength(2)
    setP(0.75)
    flush()
    expect(ticks.getAttribute("aria-valuenow")).toBe("75")
    expect(ticks.querySelectorAll(".nc-wtimer__tick--on")).toHaveLength(6)
  })
})

describe("DataListInput", () => {
  test("is a named inline field that reports each keystroke", () => {
    const typed: string[] = []
    const { root } = show(() => (
      <DataListInput label="Name of NODE_ENV" value="" mono invalid onInput={(v) => typed.push(v)} />
    ))
    const input = one<HTMLInputElement>("[data-part=data-list-input]", root)
    expect(input.getAttribute("aria-label")).toBe("Name of NODE_ENV")
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.classList.contains("nc-inline-field--mono")).toBe(true)
    input.value = "prod"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    expect(typed).toEqual(["prod"])
  })
})

describe("SwipeButton", () => {
  test("has its part and runs its action after closing the row", () => {
    const calls: string[] = []
    const { root } = show(() => (
      <SwipeButton
        action={{ id: "archive", label: "Archive", onAction: () => calls.push("run") }}
        close={() => calls.push("close")}
      />
    ))
    click(one("[data-part=swipe-button][data-swipe-action=archive]", root))
    expect(calls).toEqual(["close", "run"])
  })
})

describe("MatchText", () => {
  test("marks the first match of the query, case-insensitively, and nothing without one", () => {
    const [q, setQ] = createSignal<string | undefined>("ISS")
    const { root } = show(() => (
      <span class="host">
        <MatchText text="Open issues" q={q()} />
      </span>
    ))
    const host = one(".host", root)
    expect(one("[data-part=nav-match]", host).textContent).toBe("iss")
    expect(host.textContent).toBe("Open issues")
    setQ("zzz")
    flush()
    expect(host.querySelector("[data-part=nav-match]")).toBeNull()
    expect(host.textContent).toBe("Open issues")
  })
})

describe("ScreenSearch", () => {
  test("outside a phone screen its inline field has the part; inside one the screen draws it", () => {
    const { root } = show(() => <ScreenSearch value="" label="Find" onInput={() => {}} />)
    expect(one("[data-part=screen-search]", root).tagName).toBe("LABEL")
    const phone = show(() => (
      <NavigationScreen title="Inbox">
        <ScreenSearch value="" label="Find" onInput={() => {}} />
      </NavigationScreen>
    ))
    expect(phone.root.querySelectorAll("[data-part=screen-search]")).toHaveLength(1)
    expect(one("[data-part=screen-content]", phone.root).querySelector("label.nc-search")).toBeNull()
  })
})
