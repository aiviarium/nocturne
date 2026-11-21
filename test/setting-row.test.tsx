import { describe, expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { SettingRow, Switch } from "../src"
import { click, mount } from "./dom"

describe("SettingRow", () => {
  test("names its control and resets a modified value", () => {
    const [on, setOn] = createSignal(true)
    const { root, dispose } = mount(() => (
      <SettingRow
        title="Notifications"
        description="Tell me when a job ends."
        name="rookery/notifications"
        data-key="rookery/notifications"
        modified={on()}
        onReset={() => setOn(false)}
        control={(ids) => <Switch aria-labelledby={ids.labelId} checked={on()} onChange={setOn} />}
      />
    ))
    const row = root.querySelector('[data-part="setting-row"]')!
    expect(row).not.toBeNull()
    expect(row.hasAttribute("data-modified")).toBe(true)
    expect(row.getAttribute("data-key")).toBe("rookery/notifications")
    const label = row.querySelector(".nc-setting__title")!
    const control = row.querySelector('[role="switch"]')!
    expect(control.getAttribute("aria-labelledby")).toBe(label.id)
    expect(row.textContent).toContain("rookery/notifications")

    const reset = row.querySelector<HTMLButtonElement>('[data-part="setting-reset"]')!
    click(reset)
    expect(on()).toBe(false)
    expect(row.hasAttribute("data-modified")).toBe(false)
    expect(row.querySelector('[data-part="setting-reset"]')).toBeNull()
    dispose()
  })

  test("says where an unset value comes from, and marks a fixed one", () => {
    const { root, dispose } = mount(() => (
      <>
        <SettingRow title="Time zone" inherited="From Server" control={<span />} />
        <SettingRow title="Region" locked control={<span />} />
      </>
    ))
    const rows = root.querySelectorAll('[data-part="setting-row"]')
    expect(rows[0]!.textContent).toContain("From Server")
    expect(rows[1]!.querySelector('[data-part="setting-locked"]')).not.toBeNull()
    dispose()
  })
})
