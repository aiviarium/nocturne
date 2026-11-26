"""Screenshot every gallery page with the machine's Playwright Chromium.

    python3 scripts/screenshots.py OUT_DIR [--theme dark] [--pages id,id] [--accent iris]

Start the gallery first (`bun run gallery`, port 4800). Console errors are printed per page.
"""
import argparse
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PAGES = (
    "overview shell title-bar sidebar view-header panels appearance button icon-button dropdown text-field select "
    "selection tabs menu badge state avatar callout icon skeleton toast schema-form data-table stat-card list "
    "code-block diff-view chat-message composer widget stream-state split dialog popover"
).split()

parser = argparse.ArgumentParser()
parser.add_argument("out")
parser.add_argument("--theme", default="dark")
parser.add_argument("--accent", default="iris")
parser.add_argument("--pages", default="")
parser.add_argument("--base", default="http://127.0.0.1:4800/")
parser.add_argument("--chrome", default=os.environ.get("CHROME_PATH"), help="a Chrome or Chromium binary; default Playwright's own")
parser.add_argument("--width", type=int, default=1440)
parser.add_argument("--height", type=int, default=900)
args = parser.parse_args()

out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
pages = [p for p in args.pages.split(",") if p] or PAGES
problems = 0
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chrome) if args.chrome else p.chromium.launch()
    context = browser.new_context(viewport={"width": args.width, "height": args.height}, device_scale_factor=1)
    page = context.new_page()
    messages: list[str] = []
    page.on("console", lambda m: messages.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: messages.append(f"pageerror: {e}"))
    for name in pages:
        messages.clear()
        page.goto(f"{args.base}?theme={args.theme}&accent={args.accent}#/{name}")
        page.reload()
        page.wait_for_selector(f"[data-page='{name}']")
        try:
            page.wait_for_load_state("networkidle", timeout=4000)
        except Exception:
            pass
        page.wait_for_timeout(250)
        target = out / f"{args.theme}-{name}.png"
        page.screenshot(path=str(target), full_page=True)
        errors = [m for m in messages if not re.search(r"fonts\.g(static|oogleapis)|ERR_(NAME|INTERNET|CONNECTION)|Failed to load resource", m)]
        print(f"{name:14} -> {target.name}" + (f"   !! {errors}" if errors else ""))
        problems += bool(errors)
    browser.close()
sys.exit(1 if problems else 0)
