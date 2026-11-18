import { afterEach, describe, expect, test } from "bun:test"
import { createSignal } from "solid-js"
import {
  ActionSheet,
  ApprovalCard,
  Avatar,
  AvatarStack,
  Badge,
  Board,
  BoardCard,
  BoardCardMeta,
  BoardCardTitle,
  BoardCardTop,
  BoardDrop,
  BoardLane,
  BoardLaneHead,
  BottomArea,
  Callout,
  ChatMessage,
  CodeBadge,
  CodeBlock,
  ContextMenu,
  Count,
  Delta,
  DictationBar,
  DiffView,
  PhoneOverride,
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

describe("ActionSheet", () => {
  const actions = [
    { id: "archive", label: "Archive" },
    { id: "delete", label: "Delete", danger: true },
    { id: "move", label: "Move", disabled: true },
  ]

  test("on a phone, choosing an action closes the sheet and reports the action", async () => {
    const [open, setOpen] = createSignal(true)
    const chosen: string[] = []
    track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <ActionSheet
            open={open()}
            onClose={() => setOpen(false)}
            title="Delete this thread?"
            message="It cannot be undone."
            actions={actions}
            onSelect={(id) => chosen.push(id)}
          />
        </PhoneOverride.Provider>
      )),
    )
    await tick()
    const group = one("[data-part=action-sheet]")
    expect(group.textContent).toContain("Delete this thread?")
    expect(group.textContent).toContain("It cannot be undone.")
    expect(one("[data-action=delete]", group).hasAttribute("data-danger")).toBe(true)
    expect(one<HTMLButtonElement>("[data-action=move]", group).disabled).toBe(true)
    click(one("[data-action=delete]", group))
    expect(chosen).toEqual(["delete"])
    expect(open()).toBe(false)
  })

  test("on a phone, Cancel closes without choosing", async () => {
    let closed = 0
    const chosen: string[] = []
    track(
      mount(() => (
        <PhoneOverride.Provider value={true}>
          <ActionSheet
            open
            onClose={() => closed++}
            actions={actions}
            onSelect={(id) => chosen.push(id)}
            cancelLabel="Never mind"
          />
        </PhoneOverride.Provider>
      )),
    )
    await tick()
    const cancel = one("[data-action=cancel]")
    expect(cancel.textContent).toBe("Never mind")
    click(cancel)
    expect(closed).toBe(1)
    expect(chosen).toEqual([])
  })

  test("on a desktop it is a small dialog with the actions in its footer", async () => {
    const chosen: string[] = []
    track(
      mount(() => (
        <PhoneOverride.Provider value={false}>
          <ActionSheet
            open
            onClose={() => {}}
            title="Archive?"
            actions={actions}
            onSelect={(id) => chosen.push(id)}
          />
        </PhoneOverride.Provider>
      )),
    )
    await tick()
    expect(document.querySelector("[data-part=action-sheet]")).toBeNull()
    const dialog = one("[data-part=dialog]")
    expect(dialog.getAttribute("role")).toBe("dialog")
    click(one("[data-action=archive]", dialog))
    expect(chosen).toEqual(["archive"])
  })

  test("renders nothing while closed", async () => {
    track(
      mount(() => (
        <PhoneOverride.Provider value={false}>
          <ActionSheet open={false} onClose={() => {}} actions={actions} onSelect={() => {}} />
        </PhoneOverride.Provider>
      )),
    )
    await tick()
    expect(document.querySelector("[data-part=dialog]")).toBeNull()
  })
})

describe("ApprovalCard", () => {
  test("a pending card shows the items and calls back on Allow, Deny and the extra choice", () => {
    const calls: string[] = []
    const { root } = track(
      mount(() => (
        <ApprovalCard
          summary="Edit 2 files and delete 1"
          items={["src/a.ts", "src/b.ts"]}
          onAllow={() => calls.push("allow")}
          onDeny={() => calls.push("deny")}
          extra={{ label: "Allow for this session", onClick: () => calls.push("session") }}
        />
      )),
    )
    const card = one("[data-part=approval-card]", root)
    expect(card.getAttribute("data-decision")).toBe("pending")
    expect(card.textContent).toContain("Edit 2 files and delete 1")
    expect(Array.from(card.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "src/a.ts",
      "src/b.ts",
    ])
    const button = (text: string) =>
      Array.from(card.querySelectorAll("button")).find((b) => b.textContent === text) as HTMLElement
    click(button("Allow"))
    click(button("Deny"))
    click(button("Allow for this session"))
    expect(calls).toEqual(["allow", "deny", "session"])
  })

  test("a decided card shows the outcome and no buttons", () => {
    const [decision, setDecision] = createSignal<"allowed" | "denied">("allowed")
    const { root } = track(mount(() => <ApprovalCard summary="Run tests" decision={decision()} />))
    const card = one("[data-part=approval-card]", root)
    expect(card.getAttribute("data-decision")).toBe("allowed")
    expect(card.textContent).toContain("Allowed")
    expect(card.querySelector("button")).toBeNull()
    setDecision("denied")
    expect(card.getAttribute("data-decision")).toBe("denied")
    expect(card.textContent).toContain("Denied")
  })
})

describe("Avatar", () => {
  test("shows initials for a person and one letter for an agent", () => {
    const { root } = track(
      mount(() => (
        <>
          <Avatar name="Ada Lovelace" />
          <Avatar kind="agent" name="Builder Bot" size="lg" />
        </>
      )),
    )
    const [person, agent] = Array.from(root.querySelectorAll("[data-part=avatar]")) as HTMLElement[]
    expect(person?.getAttribute("data-kind")).toBe("person")
    expect(person?.textContent).toBe("AL")
    expect(person?.getAttribute("aria-label")).toBe("Ada Lovelace")
    expect(person?.getAttribute("data-hue")).toBeTruthy()
    expect(agent?.getAttribute("data-kind")).toBe("agent")
    expect(agent?.textContent).toBe("B")
    expect(agent?.classList.contains("nc-avatar--lg")).toBe(true)
  })

  test("the assistant gets the sparkle mark and a default name", () => {
    const { root } = track(mount(() => <Avatar kind="ai" />))
    const avatar = one("[data-part=avatar]", root)
    expect(avatar.getAttribute("data-kind")).toBe("ai")
    expect(avatar.getAttribute("aria-label")).toBe("Assistant")
    expect(avatar.hasAttribute("data-hue")).toBe(false)
    expect(avatar.querySelector("svg")).not.toBeNull()
  })

  test("an explicit hue wins over the one from the name", () => {
    const { root } = track(mount(() => <Avatar name="Ada" hue="rose" />))
    expect(one("[data-part=avatar]", root).getAttribute("data-hue")).toBe("rose")
  })
})

describe("AvatarStack", () => {
  test("shows up to max avatars and a chip with the rest", () => {
    const [people, setPeople] = createSignal([{ name: "Ada" }, { name: "Grace" }, { name: "Linus" }])
    const { root } = track(mount(() => <AvatarStack people={people()} max={2} />))
    const stack = one("[data-part=avatar-stack]", root)
    expect(stack.getAttribute("aria-label")).toBe("3 people")
    expect(stack.querySelectorAll("[data-part=avatar]").length).toBe(2)
    expect(one(".nc-avatar--more", stack).textContent).toBe("+1")
    setPeople([{ name: "Ada" }])
    expect(stack.querySelectorAll("[data-part=avatar]").length).toBe(1)
    expect(stack.querySelector(".nc-avatar--more")).toBeNull()
  })
})

describe("Badge", () => {
  test("carries its tone, neutral by default", () => {
    const [tone, setTone] = createSignal<"success" | "danger" | undefined>(undefined)
    const { root } = track(mount(() => <Badge tone={tone()}>Live</Badge>))
    const badge = one("[data-part=badge]", root)
    expect(badge.getAttribute("data-tone")).toBe("neutral")
    expect(badge.textContent).toBe("Live")
    setTone("success")
    expect(badge.getAttribute("data-tone")).toBe("success")
    expect(badge.classList.contains("nc-badge--success")).toBe(true)
  })

  test("an icon goes before the word", () => {
    const { root } = track(
      mount(() => (
        <Badge icon="check" square>
          Done
        </Badge>
      )),
    )
    const badge = one("[data-part=badge]", root)
    expect(badge.firstElementChild?.tagName.toLowerCase()).toBe("svg")
    expect(badge.classList.contains("nc-badge--square")).toBe(true)
  })
})

describe("Board", () => {
  test("is a named group of lanes with its state flags", () => {
    const { root } = track(
      mount(() => (
        <Board label="Projects" fill dragging fixed>
          <BoardLane name="Todo" />
          <BoardLane name="Done" />
        </Board>
      )),
    )
    const board = one("[data-part=board]", root)
    expect(board.getAttribute("role")).toBe("group")
    expect(board.getAttribute("aria-label")).toBe("Projects")
    expect(board.hasAttribute("data-fill")).toBe(true)
    expect(board.hasAttribute("data-dragging")).toBe(true)
    expect(board.hasAttribute("data-fixed")).toBe(true)
    // With no width to measure it does not stack.
    expect(board.hasAttribute("data-stacked")).toBe(false)
    expect(board.querySelectorAll(".nc-board__lanes > [data-part=board-lane]").length).toBe(2)
  })

  test("a custom board leaves the layout of its children to the caller", () => {
    const { root } = track(
      mount(() => (
        <Board custom head={<div class="heads">Heads</div>}>
          <div class="swimlane">Row</div>
        </Board>
      )),
    )
    const board = one("[data-part=board]", root)
    expect(board.querySelector(".nc-board__lanes")).toBeNull()
    expect(one(".heads", board).nextElementSibling?.classList.contains("swimlane")).toBe(true)
  })
})

describe("BoardLane", () => {
  test("is a section named by its lane, with the head, cards, footer and drop highlight", () => {
    let body: HTMLDivElement | undefined
    const [drop, setDrop] = createSignal(false)
    const { root } = track(
      mount(() => (
        <BoardLane
          name="In progress"
          count={3}
          hue="amber"
          drop={drop()}
          footer={<button type="button">Show 12 more</button>}
          bodyRef={(el) => {
            body = el
          }}
          bodyProps={{ "data-lane": "doing" }}
        >
          <BoardCard title="One" />
        </BoardLane>
      )),
    )
    const lane = one("[data-part=board-lane]", root)
    expect(lane.tagName.toLowerCase()).toBe("section")
    expect(lane.getAttribute("aria-label")).toBe("In progress")
    expect(one("[data-part=board-lane-count]", lane).textContent).toBe("3")
    expect(body?.getAttribute("data-lane")).toBe("doing")
    expect(body?.querySelector("[data-part=board-card]")).not.toBeNull()
    expect(one(".nc-board-lane__foot", lane).textContent).toBe("Show 12 more")
    expect(lane.hasAttribute("data-drop")).toBe(false)
    setDrop(true)
    expect(lane.hasAttribute("data-drop")).toBe(true)
  })

  test("hides its head when asked", () => {
    const { root } = track(mount(() => <BoardLane name="Cell" hideHead />))
    expect(root.querySelector("[data-part=board-lane-head]")).toBeNull()
  })
})

describe("BoardLaneHead", () => {
  test("shows the name, the count and an add button that calls back", () => {
    let added = 0
    const { root } = track(
      mount(() => <BoardLaneHead name="Backlog" count={5} hue="sky" onAdd={() => added++} />),
    )
    const head = one("[data-part=board-lane-head]", root)
    expect(one(".nc-board-lane__name", head).textContent).toBe("Backlog")
    expect(one("[data-part=board-lane-count]", head).textContent).toBe("5")
    expect(one(".nc-board-lane__dot", head).getAttribute("data-hue")).toBe("sky")
    const add = one("button", head)
    expect(add.getAttribute("aria-label")).toBe("New in Backlog")
    click(add)
    expect(added).toBe(1)
  })

  test("no count when empty, no add without a handler, and a grey dot for neutral", () => {
    const { root } = track(mount(() => <BoardLaneHead name="Empty" count={0} hue="neutral" />))
    const head = one("[data-part=board-lane-head]", root)
    expect(head.querySelector("[data-part=board-lane-count]")).toBeNull()
    expect(head.querySelector("button")).toBeNull()
    expect(one(".nc-board-lane__dot", head).hasAttribute("data-hue")).toBe(false)
  })

  test("an icon takes the place of the dot", () => {
    const { root } = track(mount(() => <BoardLaneHead name="Done" hue="mint" icon={<i class="glyph" />} />))
    const head = one("[data-part=board-lane-head]", root)
    expect(head.querySelector(".nc-board-lane__dot")).toBeNull()
    expect(one(".nc-board-lane__icon .glyph", head)).toBeTruthy()
  })
})

describe("BoardCard", () => {
  test("lays out the top, title and meta props, and reflects selection", () => {
    const [selected, setSelected] = createSignal(false)
    let clicks = 0
    const { root } = track(
      mount(() => (
        <BoardCard
          top={<span>TSK-41</span>}
          title="Fix the login loop"
          icon={<i class="state" />}
          meta={<span>High</span>}
          selected={selected()}
          active
          onClick={() => clicks++}
        />
      )),
    )
    const card = one("[data-part=board-card]", root)
    expect(card.tagName.toLowerCase()).toBe("article")
    expect(one(".nc-board-card__top", card).textContent).toBe("TSK-41")
    expect(one(".nc-board-card__text", card).textContent).toBe("Fix the login loop")
    expect(one(".nc-board-card__icon .state", card)).toBeTruthy()
    expect(one(".nc-board-card__meta", card).textContent).toBe("High")
    expect(card.hasAttribute("data-active")).toBe(true)
    expect(card.hasAttribute("data-selected")).toBe(false)
    setSelected(true)
    expect(card.hasAttribute("data-selected")).toBe(true)
    click(card)
    expect(clicks).toBe(1)
  })

  test("placed and ghost cards get their modifiers", () => {
    const { root } = track(mount(() => <BoardCard title="Dragged" placed ghost />))
    const card = one("[data-part=board-card]", root)
    expect(card.classList.contains("nc-board-card--placed")).toBe(true)
    expect(card.classList.contains("nc-board-card--ghost")).toBe(true)
  })
})

describe("BoardCardTop, BoardCardTitle and BoardCardMeta", () => {
  test("children laid out with the parts replace the props", () => {
    const { root } = track(
      mount(() => (
        <BoardCard title="Ignored">
          <BoardCardTop>
            <span>KEY-1</span>
          </BoardCardTop>
          <BoardCardTitle icon={<i class="glyph" />}>Custom title</BoardCardTitle>
          <BoardCardMeta>
            <span>2d</span>
          </BoardCardMeta>
        </BoardCard>
      )),
    )
    const card = one("[data-part=board-card]", root)
    expect(card.textContent).not.toContain("Ignored")
    const parts = Array.from(card.children).map((c) => c.className)
    expect(parts).toEqual(["nc-board-card__top", "nc-board-card__title", "nc-board-card__meta"])
    expect(one(".nc-board-card__top", card).textContent).toBe("KEY-1")
    expect(one(".nc-board-card__text", card).textContent).toBe("Custom title")
    expect(one(".nc-board-card__icon .glyph", card)).toBeTruthy()
    expect(one(".nc-board-card__meta", card).textContent).toBe("2d")
  })

  test("a title without an icon has no icon slot", () => {
    const { root } = track(mount(() => <BoardCardTitle>Plain</BoardCardTitle>))
    expect(root.querySelector(".nc-board-card__icon")).toBeNull()
    expect(one(".nc-board-card__text", root).textContent).toBe("Plain")
  })
})

describe("BoardDrop", () => {
  test("is a hidden placeholder that takes the dragged card's height", () => {
    const { root } = track(mount(() => <BoardDrop placed style={{ height: "80px" }} />))
    const drop = one("[data-part=board-drop]", root)
    expect(drop.getAttribute("aria-hidden")).toBe("true")
    expect(drop.classList.contains("nc-board-drop--placed")).toBe(true)
    expect(drop.style.height).toBe("80px")
  })
})

describe("BottomArea", () => {
  test("wraps its content and marks when it sits above a tab bar", () => {
    const [above, setAbove] = createSignal(false)
    const { root } = track(
      mount(() => (
        <BottomArea aboveTabBar={above()}>
          <button type="button">Send</button>
        </BottomArea>
      )),
    )
    const area = one("[data-part=bottom-area]", root)
    expect(area.textContent).toBe("Send")
    expect(area.hasAttribute("data-keyboard")).toBe(false)
    expect(area.hasAttribute("data-above-tabs")).toBe(false)
    setAbove(true)
    expect(area.hasAttribute("data-above-tabs")).toBe(true)
  })
})

describe("Callout", () => {
  test("info is a status, the others are alerts", () => {
    const [tone, setTone] = createSignal<"info" | "warning" | "danger" | undefined>(undefined)
    const { root } = track(mount(() => <Callout tone={tone()}>Saved a draft.</Callout>))
    const callout = one("[data-part=callout]", root)
    expect(callout.getAttribute("data-tone")).toBe("info")
    expect(callout.getAttribute("role")).toBe("status")
    setTone("danger")
    expect(callout.getAttribute("data-tone")).toBe("danger")
    expect(callout.getAttribute("role")).toBe("alert")
    expect(callout.classList.contains("nc-callout--danger")).toBe(true)
  })

  test("leads with the code in the callout's tone and ends with the action", () => {
    let retried = 0
    const { root } = track(
      mount(() => (
        <Callout
          tone="warning"
          code="409"
          action={
            <button type="button" onClick={() => retried++}>
              Retry
            </button>
          }
        >
          Someone else changed it.
        </Callout>
      )),
    )
    const callout = one("[data-part=callout]", root)
    const code = one("[data-part=code-badge]", callout)
    expect(code.textContent).toBe("409")
    expect(code.getAttribute("data-tone")).toBe("warning")
    click(one(".nc-callout__action button", callout))
    expect(retried).toBe(1)
  })
})

describe("ChatMessage", () => {
  test("a user message is a bubble with no avatar", () => {
    const { root } = track(mount(() => <ChatMessage role="user">Hello</ChatMessage>))
    const msg = one("[data-part=chat-message]", root)
    expect(msg.getAttribute("data-role")).toBe("user")
    expect(msg.classList.contains("nc-msg-user")).toBe(true)
    expect(msg.textContent).toBe("Hello")
    expect(msg.querySelector("[data-part=avatar]")).toBeNull()
  })

  test("an assistant reply has the assistant mark and the thought line", () => {
    const { root } = track(
      mount(() => (
        <ChatMessage role="assistant" thought="Thought for 9s">
          Here it is.
        </ChatMessage>
      )),
    )
    const msg = one("[data-part=chat-message]", root)
    expect(msg.getAttribute("data-role")).toBe("assistant")
    expect(one("[data-part=avatar]", msg).getAttribute("data-kind")).toBe("ai")
    // The avatar and the thought head the reply; the body under them isn't indented beside the avatar.
    expect(one(".nc-msg-ai__head", msg).textContent).toBe("Thought for 9s")
    expect(one(".nc-msg-ai__head [data-part=avatar]", msg)).toBeTruthy()
    expect(one(".nc-msg-ai__body", msg).textContent).toBe("Here it is.")
  })

  test("a custom avatar replaces the assistant mark", () => {
    const { root } = track(
      mount(() => (
        <ChatMessage role="assistant" avatar={<Avatar kind="agent" name="Reviewer" />}>
          Done.
        </ChatMessage>
      )),
    )
    const avatar = one("[data-part=chat-message] [data-part=avatar]", root)
    expect(avatar.getAttribute("data-kind")).toBe("agent")
  })
})

describe("CodeBadge", () => {
  test("is danger by default and takes another tone", () => {
    const { root } = track(
      mount(() => (
        <>
          <CodeBadge>502</CodeBadge>
          <CodeBadge tone="info">304</CodeBadge>
        </>
      )),
    )
    const [first, second] = Array.from(root.querySelectorAll("[data-part=code-badge]")) as HTMLElement[]
    expect(first?.getAttribute("data-tone")).toBe("danger")
    expect(first?.textContent).toBe("502")
    expect(second?.getAttribute("data-tone")).toBe("info")
    expect(second?.classList.contains("nc-code-badge--info")).toBe(true)
  })
})

describe("CodeBlock", () => {
  test("numbers lines from startLine and marks the current one", () => {
    const { root } = track(
      mount(() => (
        <CodeBlock code={"const a = 1\nconst b = 2\n"} language="ts" startLine={10} currentLine={11} />
      )),
    )
    const block = one("[data-part=code-block]", root)
    expect(block.getAttribute("data-language")).toBe("ts")
    const lines = Array.from(block.querySelectorAll(".nc-code__line"))
    expect(lines.length).toBe(2)
    expect(lines.map((l) => l.querySelector(".nc-code__num")?.textContent)).toEqual(["10", "11"])
    expect(lines[1]?.classList.contains("nc-code__line--current")).toBe(true)
    expect(one(".nc-codeblock__bar", block).textContent).toContain("ts")
    expect(block.querySelector(".syn-keyword, [class^=syn-]")).not.toBeNull()
  })

  test("Copy calls back with the code and says Copied; Apply calls back too", async () => {
    const copied: string[] = []
    const applied: string[] = []
    const { root } = track(
      mount(() => (
        <CodeBlock
          code="echo hi"
          language="sh"
          title="run.sh"
          onCopy={(c) => copied.push(c)}
          onApply={(c) => applied.push(c)}
        />
      )),
    )
    const block = one("[data-part=code-block]", root)
    const button = (text: string) =>
      Array.from(block.querySelectorAll("button")).find((b) => b.textContent === text) as HTMLElement
    click(button("Copy"))
    await tick()
    expect(copied).toEqual(["echo hi"])
    expect(button("Copied")).toBeTruthy()
    click(button("Apply"))
    expect(applied).toEqual(["echo hi"])
    expect(one("pre", block).getAttribute("aria-label")).toBe("run.sh")
  })

  test("bare hides the bar, and lines can go without numbers", () => {
    const { root } = track(mount(() => <CodeBlock code="x" bare lineNumbers={false} />))
    const block = one("[data-part=code-block]", root)
    expect(block.querySelector(".nc-codeblock__bar")).toBeNull()
    expect(block.querySelector(".nc-code__num")).toBeNull()
    expect(one("pre", block).classList.contains("nc-code--plain")).toBe(true)
  })

  test("errors underline their columns", () => {
    const { root } = track(
      mount(() => <CodeBlock code="let value = oops" errors={[{ line: 1, from: 12, to: 16 }]} />),
    )
    const err = Array.from(root.querySelectorAll(".syn-err"))
      .map((e) => e.textContent)
      .join("")
    expect(err).toBe("oops")
  })
})

describe("ContextMenu", () => {
  const items = () => [
    { id: "rename", label: "Rename" },
    { id: "delete", label: "Delete" },
  ]

  test("a right click opens the menu and choosing an item closes it", async () => {
    const chosen: string[] = []
    const { root } = track(
      mount(() => (
        <ContextMenu items={items} onSelect={(id) => chosen.push(id)} label="Row" class="row-area">
          <div class="target">Row one</div>
        </ContextMenu>
      )),
    )
    const area = one(".nc-context-area", root)
    expect(area.classList.contains("row-area")).toBe(true)
    expect(document.querySelector("[data-part=menu]")).toBeNull()
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
    one(".target", area).dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await tick()
    const menu = one("[data-part=menu]")
    expect(menu.getAttribute("aria-label")).toBe("Row")
    expect(all("[role=menuitem]").map((m) => m.textContent)).toEqual(["Rename", "Delete"])
    click(all("[role=menuitem]")[1] as HTMLElement)
    await tick()
    expect(chosen).toEqual(["delete"])
    expect(document.querySelector("[data-part=menu]")).toBeNull()
  })

  test("the menu key and Shift+F10 open it from the keyboard", async () => {
    const { root } = track(
      mount(() => (
        <ContextMenu items={items} onSelect={() => {}}>
          <button type="button">Row</button>
        </ContextMenu>
      )),
    )
    const target = one("button", root)
    press(target, "ContextMenu")
    await tick()
    expect(one("[data-part=menu]").getAttribute("aria-label")).toBe("Actions")
    press(one("[data-part=menu]"), "Escape")
    await tick()
    expect(document.querySelector("[data-part=menu]")).toBeNull()
    press(target, "F10", { shiftKey: true })
    await tick()
    expect(document.querySelector("[data-part=menu]")).not.toBeNull()
  })
})

describe("Count", () => {
  test("shows the value, capped at max", () => {
    const [value, setValue] = createSignal(7)
    const { root } = track(mount(() => <Count value={value()} max={9} />))
    const count = one("[data-part=count]", root)
    expect(count.textContent).toBe("7")
    expect(count.getAttribute("aria-label")).toBe("7")
    setValue(12)
    expect(count.textContent).toBe("9+")
    expect(count.getAttribute("aria-label")).toBe("12")
  })
})

describe("Delta", () => {
  test("up is good and down is bad unless the sentiment says otherwise", () => {
    const { root } = track(
      mount(() => (
        <>
          <Delta direction="up" value="4.2%" />
          <Delta direction="down" value="3%" />
          <Delta direction="down" value="120ms" sentiment="good" />
        </>
      )),
    )
    const [up, down, faster] = Array.from(root.querySelectorAll("[data-part=delta]")) as HTMLElement[]
    expect(up?.getAttribute("data-direction")).toBe("up")
    expect(up?.classList.contains("nc-delta--up")).toBe(true)
    expect(up?.textContent).toBe("▲Up4.2%")
    expect(down?.getAttribute("data-direction")).toBe("down")
    expect(down?.classList.contains("nc-delta--down")).toBe(true)
    expect(faster?.getAttribute("data-direction")).toBe("down")
    expect(faster?.classList.contains("nc-delta--up")).toBe(true)
  })
})

describe("DictationBar", () => {
  test("shows the timer and live text while recording, then the working line", () => {
    const [state, setState] = createSignal<"idle" | "recording" | "transcribing">("recording")
    const { root } = track(
      mount(() => (
        <DictationBar dictation={{ state: state(), elapsed: 75, level: 0.5, partial: "hello there" }} />
      )),
    )
    const bar = one("[data-part=dictation]", root)
    expect(bar.getAttribute("aria-label")).toBe("Recording")
    expect(one(".nc-dictation__time", bar).textContent).toBe("1:15")
    expect(bar.querySelectorAll(".nc-wave__bar").length).toBe(120)
    expect(one("[data-part=dictation-live]", root).textContent).toBe("hello there")
    setState("transcribing")
    expect(one("[data-part=dictation]", root).textContent).toContain("Transcribing")
    expect(root.querySelector("[data-part=dictation-live]")).toBeNull()
    setState("idle")
    expect(root.querySelector("[data-part=dictation]")).toBeNull()
  })

  test("compact keeps fewer waveform samples", () => {
    const { root } = track(mount(() => <DictationBar compact dictation={{ state: "recording" }} />))
    expect(root.querySelectorAll(".nc-wave__bar").length).toBe(24)
  })

  test("a blocked microphone offers to open settings", () => {
    let opened = 0
    const { root } = track(
      mount(() => <DictationBar dictation={{ state: "blocked", onOpenSettings: () => opened++ }} />),
    )
    const bar = one("[data-part=dictation]", root)
    expect(bar.getAttribute("role")).toBe("alert")
    expect(bar.textContent).toContain("Microphone access is blocked.")
    click(one("button", bar))
    expect(opened).toBe(1)
  })

  test("an idle bar shows the last error", () => {
    const { root } = track(
      mount(() => <DictationBar dictation={{ state: "idle", error: "no microphone" }} />),
    )
    expect(one("[data-part=dictation]", root).textContent).toBe("Dictation failed: no microphone")
  })
})

describe("DiffView", () => {
  test("diffs two strings with counts and marked lines", () => {
    const { root } = track(
      mount(() => <DiffView before={"a\nb\nc\n"} after={"a\nB\nc\n"} path="notes.txt" />),
    )
    const view = one("[data-part=diff-view]", root)
    expect(view.getAttribute("data-mode")).toBe("unified")
    expect(one(".nc-diffview__path", view).textContent).toBe("notes.txt")
    expect(one(".nc-diffview__count--add", view).textContent).toBe("+1")
    expect(one(".nc-diffview__count--del", view).textContent).toBe("−1")
    expect(view.querySelectorAll("[data-kind=add]").length).toBe(1)
    expect(view.querySelectorAll("[data-kind=del]").length).toBe(1)
    expect(one("[role=table]", view).getAttribute("aria-label")).toBe("Diff of notes.txt")
  })

  test("split mode puts old and new side by side", () => {
    const [mode, setMode] = createSignal<"unified" | "split">("unified")
    const { root } = track(mount(() => <DiffView before={"x\n"} after={"y\n"} mode={mode()} />))
    const view = one("[data-part=diff-view]", root)
    expect(one(".nc-diff", view).classList.contains("nc-diff--unified")).toBe(true)
    setMode("split")
    expect(view.getAttribute("data-mode")).toBe("split")
    expect(one(".nc-diff", view).classList.contains("nc-diff--unified")).toBe(false)
  })

  test("reads the path from a patch, and Accept and Reject call back", () => {
    const calls: string[] = []
    const patch = [
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -1,2 +1,2 @@",
      " keep",
      "-old",
      "+new",
      "",
    ].join("\n")
    const { root } = track(
      mount(() => (
        <DiffView patch={patch} onAccept={() => calls.push("accept")} onReject={() => calls.push("reject")} />
      )),
    )
    const view = one("[data-part=diff-view]", root)
    expect(one(".nc-diffview__path", view).textContent).toBe("src/app.ts")
    const button = (text: string) =>
      Array.from(view.querySelectorAll("button")).find((b) => b.textContent === text) as HTMLElement
    click(button("Reject"))
    click(button("Accept"))
    expect(calls).toEqual(["reject", "accept"])
  })

  test("says when there are no changes, and bare hides the header", () => {
    const { root } = track(mount(() => <DiffView before="same" after="same" bare />))
    const view = one("[data-part=diff-view]", root)
    expect(view.querySelector(".nc-panel-header")).toBeNull()
    expect(one(".nc-diff__hunk--none", view).textContent).toBe("No changes")
  })
})
