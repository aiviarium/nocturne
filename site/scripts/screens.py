"""Screenshots of the built site, for review.

Serves out/ on a local port and saves the landing page, the colour tokens and
a part page with live examples in dark and light, at desktop and phone width,
to screens/, which git ignores. SCREENS names another folder.

    bun run build
    python3 scripts/screens.py

Set BASE_PATH to the DOCS_BASE_PATH the site was built with, such as /nocturne.
Needs Python Playwright. CHROME points to a browser binary; the default is
/usr/bin/google-chrome.
"""

import functools
import http.server
import os
import socketserver
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
SCREENS = Path(os.environ.get("SCREENS", ROOT / "screens"))
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
BASE_PATH = os.environ.get("BASE_PATH", "").rstrip("/")

PAGES = {
    "landing": "/",
    "tokens": "/docs/tokens/colour/",
    "component": "/docs/parts/actions/",
}
SIZES = {"desktop": (1440, 900), "phone": (390, 844)}
THEMES = ("dark", "light")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def wait_for_frames(page):
    """Wait until the examples in view have rendered inside their frames."""
    page.wait_for_timeout(500)
    for frame in page.frames[1:]:
        try:
            frame.wait_for_selector(".ex-root", timeout=10000)
        except Exception:
            pass
    page.wait_for_timeout(800)


def main():
    SCREENS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as root:
        # Serve out/ under the base path, as the host does.
        if BASE_PATH:
            served = Path(root) / BASE_PATH.lstrip("/")
            served.parent.mkdir(parents=True, exist_ok=True)
            served.symlink_to(OUT)
            directory = root
        else:
            directory = str(OUT)
        handler = functools.partial(Quiet, directory=directory)
        with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
            port = server.server_address[1]
            threading.Thread(target=server.serve_forever, daemon=True).start()
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=CHROME)
                for theme in THEMES:
                    for size, (width, height) in SIZES.items():
                        context = browser.new_context(
                            viewport={"width": width, "height": height},
                            color_scheme=theme,
                            device_scale_factor=2 if size == "phone" else 1,
                        )
                        page = context.new_page()
                        for name, path in PAGES.items():
                            page.goto(f"http://127.0.0.1:{port}{BASE_PATH}{path}", wait_until="networkidle")
                            page.evaluate("document.fonts.ready")
                            if name == "component":
                                page.locator(".ex").nth(1).scroll_into_view_if_needed()
                            wait_for_frames(page)
                            file = SCREENS / f"{name}-{theme}-{size}.png"
                            page.screenshot(path=str(file), full_page=(name == "landing"))
                            print(file)
                        context.close()
                browser.close()
            server.shutdown()


if __name__ == "__main__":
    main()
