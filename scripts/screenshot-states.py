"""Screenshot the interactive states the static page shots do not show (menus, tooltips, dialogs, toasts, composer).

    python3 scripts/screenshot-states.py OUT_DIR [--theme dark]
"""
import argparse
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("out")
parser.add_argument("--theme", default="dark")
parser.add_argument("--base", default="http://127.0.0.1:4800/")
parser.add_argument("--chrome", default=os.environ.get("CHROME_PATH"), help="a Chrome or Chromium binary; default Playwright's own")
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chrome) if args.chrome else p.chromium.launch()
    page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    def open_page(name: str) -> None:
        page.goto(f"{args.base}?theme={args.theme}#/{name}")
        page.reload()
        page.wait_for_selector(f"[data-page='{name}']")
        page.wait_for_timeout(200)

    def shot(name: str, clip=None) -> None:
        page.wait_for_timeout(250)
        page.screenshot(path=str(out / f"{args.theme}-state-{name}.png"), clip=clip)
        print("shot", name)

    open_page("icon-button")
    page.get_by_role("button", name="Hover me").hover()
    page.wait_for_timeout(700)
    shot("tooltip", {"x": 232, "y": 280, "width": 640, "height": 200})

    open_page("dropdown")
    page.get_by_role("button", name="Actions", exact=True).focus()
    page.keyboard.press("ArrowDown")
    page.keyboard.press("ArrowDown")
    shot("dropdown-keyboard", {"x": 232, "y": 100, "width": 700, "height": 420})

    open_page("select")
    page.get_by_role("button", name="Production · eu-west").or_(page.get_by_text("Choose a host")).first.click()
    shot("select-open", {"x": 232, "y": 100, "width": 1000, "height": 420})

    open_page("composer")
    ta = page.get_by_role("textbox", name="Message").first
    ta.click()
    page.keyboard.type("/re")
    shot("composer-commands", {"x": 232, "y": 60, "width": 1208, "height": 600})
    page.keyboard.press("ArrowDown")
    page.keyboard.press("Enter")
    page.keyboard.type("the changes in @use")
    shot("composer-mentions", {"x": 232, "y": 60, "width": 1208, "height": 600})
    page.keyboard.press("Enter")
    page.keyboard.type(" then $re")
    shot("composer-skills", {"x": 232, "y": 60, "width": 1208, "height": 600})
    page.keyboard.press("Enter")
    page.keyboard.type(" and a long tail of text that should wrap onto a second line inside the text area without drifting from the highlight")
    shot("composer-tokens-wrapped", {"x": 232, "y": 60, "width": 1208, "height": 600})
    page.get_by_role("button", name="Start dictation").first.click()
    page.wait_for_timeout(900)
    shot("composer-recording", {"x": 232, "y": 60, "width": 1208, "height": 400})

    open_page("dialog")
    page.get_by_role("button", name="Delete host…").click()
    shot("dialog", None)

    open_page("popover")
    page.get_by_role("button", name="Notifications").click()
    shot("popover", {"x": 232, "y": 60, "width": 800, "height": 420})

    open_page("toast")
    for label in ("Success", "Warning", "Danger"):
        page.get_by_role("button", name=label, exact=True).click()
    shot("toast", None)

    open_page("data-table")
    page.get_by_role("checkbox", name="Select s_7e91").click()
    page.get_by_role("checkbox", name="Select s_7c44").click()
    page.get_by_role("button", name="Output", exact=False).first.click()
    shot("data-table-selected", {"x": 232, "y": 100, "width": 1208, "height": 460})

    open_page("chat-message")
    page.get_by_role("button", name="Failed npm test").click()
    shot("chat-step-expanded", {"x": 232, "y": 600, "width": 1208, "height": 300})

    browser.close()
    if errors:
        print("page errors:", errors)
