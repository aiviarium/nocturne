import { afterEach, describe, expect, test } from "bun:test"
import { createSignal, flush } from "solid-js"
import {
  Card,
  EmptyState,
  IconButton,
  InlineField,
  ListRow,
  MetaLine,
  measureRowColumns,
  PhoneOverride,
  PropertyList,
  RowList,
  SectionHeading,
  Stat,
  StatCard,
  Truncate,
  Widget,
} from "../src"
import { all, click, mount, one, press, tick } from "./dom"

let cleanup: Array<() => void> = []
const track = <T extends { dispose: () => void }>(m: T): T => {
  cleanup.push(m.dispose)
  return m
}
afterEach(() => {
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

describe("ListRow", () => {
  test("is one link whose tooltip is the full title and secondary text, with actions outside it", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Sessions">
          <ListRow
            href="/agents/s1"
            title="Fix the sign-in redirect loop"
            secondary="coder"
            meta="4m"
            actions={<IconButton size="sm" label="Archive" icon="archive" />}
            selected
          />
        </RowList>
      )),
    )
    const list = one("[role=list]", root)
    expect(list.getAttribute("aria-label")).toBe("Sessions")
    const row = one("[data-part=list-row]", root)
    expect(row.getAttribute("role")).toBe("listitem")
    expect(row.hasAttribute("data-selected")).toBe(true)
    const link = one<HTMLAnchorElement>("a.nc-lrow__main", row)
    expect(link.getAttribute("href")).toBe("/agents/s1")
    expect(link.getAttribute("title")).toBe("Fix the sign-in redirect loop · coder")
    expect(link.getAttribute("aria-current")).toBe("page")
    // The action is not inside the link.
    expect(link.querySelector("button")).toBeNull()
    expect(one("[aria-label=Archive]", row).closest(".nc-lrow__actions")).not.toBeNull()
  })

  test("a row with onClick is a button; without either it is plain", () => {
    let clicked = 0
    const { root } = track(
      mount(() => (
        <RowList label="Rows">
          <ListRow title="Click me" onClick={() => clicked++} />
          <ListRow title="Plain" />
        </RowList>
      )),
    )
    click(one("button.nc-lrow__main", root))
    expect(clicked).toBe(1)
    const rows = all("[data-part=list-row]")
    expect(rows[0]?.hasAttribute("data-interactive")).toBe(true)
    expect(rows[1]?.hasAttribute("data-interactive")).toBe(false)
  })

  test("density, lines, unread and muted are data attributes the styles read", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Rows">
          <ListRow title="A" lines={3} detail={<MetaLine items={["x"]} />} unread muted />
        </RowList>
      )),
    )
    const row = one("[data-part=list-row]", root)
    expect(row.getAttribute("data-lines")).toBe("3")
    expect(row.hasAttribute("data-unread")).toBe(true)
    expect(row.hasAttribute("data-muted")).toBe(true)
    expect(one("[aria-label=Unread]", row)).toBeTruthy()
    expect(one(".nc-lrow__detail", row).textContent).toBe("x")
  })

  test("a long list is virtualised: only the rows in view are in the DOM, and they are not list items", async () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ id: i, title: `Row ${i}` }))
    const { root } = track(
      mount(() => (
        <div style={{ height: "300px" }}>
          <RowList label="Many" items={items} getKey={(i) => i.id}>
            {(i) => <ListRow title={i.title} />}
          </RowList>
        </div>
      )),
    )
    await tick()
    const rows = all("[data-part=list-row]")
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(100)
    expect(rows[0]?.getAttribute("role")).toBeNull()
    expect(one("[role=listbox]", root).getAttribute("aria-label")).toBe("Many")
  })
})

describe("ListRow columns, lines and touch", () => {
  const pointer = (el: Element, type: string, x: number, init: Partial<PointerEventInit> = {}) => {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        clientX: x,
        clientY: 10,
        ...init,
      }),
    )
    flush()
  }

  test("each trailing cell is a direct child of the row, so a RowList's rows share its columns", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Issues">
          <ListRow icon="list" title="A" status={<span>Blocked</span>} meta="12m" />
        </RowList>
      )),
    )
    const row = one("[data-part=list-row]", root)
    const cells = Array.from(row.children).map((c) => c.className)
    expect(cells).toEqual(["nc-lrow__lead", "nc-lrow__main", "nc-lrow__status", "nc-lrow__meta"])
  })

  test("a row of two lines ends its first line with the time and its second with the state", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Pull requests">
          <ListRow
            lines={2}
            title="Raise the cap"
            secondary="acme/gateway#2"
            status={<b>Failing</b>}
            meta="40m"
          />
        </RowList>
      )),
    )
    const row = one("[data-part=list-row]", root)
    const [first, second] = Array.from(row.querySelectorAll(".nc-lrow__line"))
    expect(first?.textContent).toBe("Raise the cap40m")
    expect(second?.textContent).toBe("acme/gateway#2Failing")
    // Neither is a cell of its own beside the text.
    expect(row.querySelector(":scope > .nc-lrow__status, :scope > .nc-lrow__meta")).toBeNull()
  })

  test("unread={false} keeps the dot's place without a dot, so marking a row read moves nothing", () => {
    const { root } = track(
      mount(() => (
        <RowList label="Inbox">
          <ListRow title="Read" unread={false} />
          <ListRow title="New" unread />
          <ListRow title="Untracked" />
        </RowList>
      )),
    )
    const [read, unread, untracked] = Array.from(root.querySelectorAll("[data-part=list-row]"))
    expect(one(".nc-lrow__unread", read).hasAttribute("data-on")).toBe(false)
    expect(one(".nc-lrow__unread", read).getAttribute("aria-hidden")).toBe("true")
    expect(one(".nc-lrow__unread", unread).getAttribute("aria-label")).toBe("Unread")
    expect(untracked?.querySelector(".nc-lrow__unread")).toBeNull()
  })

  test("on a phone, contextual actions take no width: a swipe reveals them and a long press lists them", async () => {
    let archived = 0
    const { root } = track(
      mount(() => (
        <PhoneOverride value={true}>
          <RowList label="Sessions">
            <ListRow
              title="Fix the redirect"
              meta="4m"
              onClick={() => {}}
              actions={<IconButton size="sm" label="Archive" icon="archive" onClick={() => archived++} />}
              persistentActions={<button type="button">Allow</button>}
            />
          </RowList>
        </PhoneOverride>
      )),
    )
    const row = one("[data-part=list-row]", root)
    expect(row.querySelector(":scope > .nc-lrow__actions:not(.nc-lrow__actions--persistent)")).toBeNull()
    expect(one(".nc-lrow__actions--persistent", row).textContent).toBe("Allow")
    expect(one(".nc-lrow__tray--actions [aria-label=Archive]", row)).toBeTruthy()
    expect(row.hasAttribute("data-swipeable")).toBe(true)

    // A long press opens a menu of the same actions; choosing one runs it.
    pointer(row, "pointerdown", 40)
    await new Promise((r) => setTimeout(r, 560))
    pointer(row, "pointerup", 40)
    await tick()
    const item = all("[role=menuitem]").find((m) => m.textContent?.includes("Archive"))
    expect(item).toBeTruthy()
    click(item as HTMLElement)
    await tick()
    expect(archived).toBe(1)
  })

  test("swipe actions: dragging a row to the left past its actions and letting go runs the first", async () => {
    let flagged = 0
    const { root } = track(
      mount(() => (
        <PhoneOverride value={true}>
          <RowList label="Sessions">
            <ListRow
              title="Fix the redirect"
              trailingActions={[{ id: "flag", label: "Flag", onAction: () => flagged++ }]}
            />
          </RowList>
        </PhoneOverride>
      )),
    )
    const row = one("[data-part=list-row]", root)
    row.getBoundingClientRect = () => ({ width: 300 }) as DOMRect
    pointer(row, "pointerdown", 290)
    for (let x = 280; x >= 20; x -= 20) pointer(row, "pointermove", x)
    expect(row.hasAttribute("data-swipe")).toBe(true)
    expect(one(".nc-lrow__tray--trailing", row).style.width).not.toBe("0px")
    pointer(row, "pointerup", 20)
    expect(flagged).toBe(1)
  })

  test("a list measures its widest title and the widest trailing cell of each column, margins included", () => {
    const host = document.createElement("div")
    host.innerHTML = `<div class="nc-lrow"><span class="nc-lrow__main"><span class="nc-lrow__title">build-01</span></span><span class="nc-lrow__status" style="margin-left: 8px"></span><span class="nc-lrow__meta" style="margin-left: 8px"></span></div><div class="nc-lrow"><span class="nc-lrow__main"><span class="nc-lrow__title">build-02</span></span><span class="nc-lrow__status" style="margin-left: 8px"></span></div>`
    const widths = [62, 20, 80]
    host.querySelectorAll<HTMLElement>(".nc-lrow > :not(.nc-lrow__main)").forEach((el, i) => {
      el.getBoundingClientRect = () => ({ width: widths[i] }) as DOMRect
    })
    const titles = [56, 61]
    host.querySelectorAll<HTMLElement>(".nc-lrow__title").forEach((el, i) => {
      Object.defineProperty(el, "scrollWidth", { value: titles[i] })
    })
    document.body.appendChild(host)
    expect(measureRowColumns(host)).toEqual({ title: 61, status: 88, meta: 28, actions: 0 })
  })
})

describe("Card", () => {
  test("pads by one rule, carries a section heading, and fills when asked", () => {
    const { root } = track(
      mount(() => (
        <Card title="Jobs" count={3} action={<a href="/jobs">All</a>} fill>
          <span>body</span>
        </Card>
      )),
    )
    const card = one("[data-part=card]", root)
    expect(card.getAttribute("data-padding")).toBe("default")
    expect(card.hasAttribute("data-fill")).toBe(true)
    const heading = one("[data-part=section-heading]", card)
    expect(heading.textContent).toBe("Jobs3All")
    expect(one("h3", heading)).toBeTruthy()
    expect(one("[data-part=card-body]", card).textContent).toBe("body")
  })

  test("a card with href is one link", () => {
    const { root } = track(mount(() => <Card href="/docs/a" title="Runbook" />))
    const card = one<HTMLAnchorElement>("a[data-part=card]", root)
    expect(card.getAttribute("href")).toBe("/docs/a")
    expect(card.getAttribute("title")).toBe("Runbook")
  })
})

describe("SectionHeading, Stat, PropertyList, MetaLine, Truncate, EmptyState", () => {
  test("section heading: one treatment at any level, with a count and an action", () => {
    const { root } = track(mount(() => <SectionHeading title="Pull requests" count={12} level={4} />))
    const h = one("h4.nc-section-heading__title", root)
    expect(h.textContent).toBe("Pull requests12")
  })

  test("stat shows the value, unit and caption", () => {
    const { root } = track(mount(() => <Stat label="Memory" value="11.2" unit="GB" caption="of 16 GB" />))
    expect(one(".nc-statv__value", root).textContent).toBe("11.2")
    expect(one(".nc-statv__unit", root).textContent).toBe("GB")
    expect(one(".nc-statv__caption", root).textContent).toBe("of 16 GB")
  })

  test("a stat's chart sits in its own slot, which takes the height a filled box leaves", () => {
    const { root } = track(
      mount(() => (
        <Card fill>
          <Stat label="Open issues" value={42} caption="Against last week">
            <span class="chart">bars</span>
          </Stat>
        </Card>
      )),
    )
    const stat = one("[data-part=stat]", root)
    expect(Array.from(stat.children).map((c) => c.className)).toEqual([
      "nc-statv__label",
      "nc-statv__figure",
      "nc-statv__caption",
      "nc-statv__chart",
    ])
    expect(one(".nc-statv__chart", stat).textContent).toBe("bars")
  })

  test("stat card and widget fill their box when asked", () => {
    const { root } = track(
      mount(() => (
        <>
          <StatCard fill label="Memory" value="11.2" footer={<span>spark</span>} />
          <Widget fill title="Upload" caption="16 of 24" />
          <StatCard label="Plain" value="1" />
        </>
      )),
    )
    const [filled, plain] = Array.from(root.querySelectorAll("[data-part=stat-card]"))
    expect(filled?.hasAttribute("data-fill")).toBe(true)
    expect(plain?.hasAttribute("data-fill")).toBe(false)
    expect(one(".nc-stat__footer", root).textContent).toBe("spark")
    expect(one("[data-part=widget]", root).hasAttribute("data-fill")).toBe(true)
    expect(one(".nc-widget__caption", root).textContent).toBe("16 of 24")
  })

  test("property list shows an em dash for an empty value, never None", () => {
    const { root } = track(
      mount(() => (
        <PropertyList
          items={[
            { label: "Cycle", value: "" },
            { label: "State", value: "Open" },
          ]}
        />
      )),
    )
    const values = Array.from(root.querySelectorAll(".nc-props__value")).map((v) => v.textContent)
    expect(values).toEqual(["—", "Open"])
  })

  test("meta line drops empty parts, so separators never dangle, and titles itself with the full line", () => {
    const { root } = track(mount(() => <MetaLine items={["Docs", false, null, "", "4m ago"]} />))
    const line = one("[data-part=meta-line]", root)
    expect(line.textContent).toBe("Docs·4m ago")
    expect(line.getAttribute("title")).toBe("Docs · 4m ago")
  })

  test("truncate always carries its full text as its title", () => {
    const { root } = track(mount(() => <Truncate text="/a/very/long/path" mono lines={2} />))
    const t = one("[data-part=truncate]", root)
    expect(t.getAttribute("title")).toBe("/a/very/long/path")
    expect(t.classList.contains("nc-truncate--clamp")).toBe(true)
  })

  test("the small empty state has no large icon", () => {
    const { root } = track(mount(() => <EmptyState size="sm" icon="inbox" title="Nothing unread" />))
    const e = one("[data-part=empty-state]", root)
    expect(e.classList.contains("nc-empty--sm")).toBe(true)
    expect(e.querySelector(".nc-icon--lg")).toBeNull()
  })
})

describe("IconButton", () => {
  test("is labelled and tooltipped by construction, at either size", () => {
    const { root } = track(mount(() => <IconButton size="sm" label="Archive" icon="archive" />))
    const b = one("button", root)
    expect(b.getAttribute("aria-label")).toBe("Archive")
    expect(b.classList.contains("nc-icon-btn--sm")).toBe(true)
    // The button is the tooltip's trigger: the tooltip names it.
    expect(b.getAttribute("data-slot")).toBe("tooltip-trigger")
  })

  test("with an href it is a labelled link that runs its click handler", () => {
    let clicked = 0
    const { root } = track(
      mount(() => (
        <IconButton
          label="New connection"
          icon="plus"
          href="/settings/connections"
          onClick={() => clicked++}
        />
      )),
    )
    const a = one<HTMLAnchorElement>("a[data-part=icon-button]", root)
    expect(a.getAttribute("aria-label")).toBe("New connection")
    expect(a.getAttribute("href")).toBe("/settings/connections")
    expect(a.classList.contains("nc-icon-btn")).toBe(true)
    a.addEventListener("click", (e) => e.preventDefault())
    click(a)
    expect(clicked).toBe(1)
  })
})

describe("InlineField", () => {
  test("Enter commits a changed value, Escape puts the saved one back", async () => {
    const commits: string[] = []
    const [value, setValue] = createSignal("Old title")
    const { root } = track(
      mount(() => (
        <InlineField
          label="Title"
          value={value()}
          onCommit={(v) => {
            commits.push(v)
            setValue(v)
            flush()
          }}
        />
      )),
    )
    const input = one<HTMLInputElement>("input[data-part=inline-field]", root)
    expect(input.getAttribute("aria-label")).toBe("Title")
    input.focus()
    input.value = "New title"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    press(input, "Enter")
    input.dispatchEvent(new FocusEvent("blur"))
    flush()
    await tick()
    expect(commits).toEqual(["New title"])

    input.focus()
    input.dispatchEvent(new FocusEvent("focus"))
    flush()
    input.value = "Draft"
    input.dispatchEvent(new InputEvent("input", { bubbles: true }))
    flush()
    press(input, "Escape")
    await tick()
    expect(input.value).toBe("New title")
    expect(commits).toEqual(["New title"])
  })
})
