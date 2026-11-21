import { afterEach, describe, expect, test } from "bun:test"
import { clearToasts, dismissToast, ToastRegion, toast } from "../src"
import { all, click, mount, one, tick } from "./dom"

let cleanup: (() => void)[] = []
afterEach(() => {
  clearToasts()
  for (const c of cleanup) c()
  cleanup = []
  document.body.innerHTML = ""
})

describe("Toast", () => {
  test("shows a toast with its tone, runs its action, and dismisses by id", async () => {
    const { dispose } = mount(() => <ToastRegion />)
    cleanup.push(dispose)
    const done: string[] = []
    const id = toast({
      title: "Can't reach build-01",
      description: "Last seen 4 min ago.",
      tone: "danger",
      duration: 0,
      action: { label: "Retry", onClick: () => done.push("retry") },
    })
    toast({ title: "Saved", tone: "success", duration: 0 })
    await tick(4)
    expect(one("[data-part=toast-region]").getAttribute("aria-label")).toBe("Notifications")
    const shown = () => all("[data-part=toast]").filter((t) => !t.hasAttribute("data-ending-style"))
    expect(
      shown()
        .map((t) => t.getAttribute("data-tone"))
        .sort(),
    ).toEqual(["danger", "success"])
    const danger = shown().find((t) => t.getAttribute("data-tone") === "danger") as HTMLElement
    expect(danger.textContent).toContain("Last seen 4 min ago.")
    click(Array.from(danger.querySelectorAll("button")).find((b) => b.textContent === "Retry") as HTMLElement)
    await tick(4)
    expect(done).toEqual(["retry"])
    dismissToast(id)
    clearToasts()
    await tick(4)
    expect(shown().filter((t) => t.getAttribute("data-tone") === "danger")).toHaveLength(0)
  })
})
