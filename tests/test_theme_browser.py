"""Browser integration checks. Run: python -m unittest discover -s tests -v

Requires tests/requirements.txt and Chromium (CHROMIUM_EXECUTABLE can select it).
The server and browser are local; no application build or backend is needed.
"""
import asyncio
import functools
import os
from pathlib import Path
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
import unittest

from playwright.async_api import async_playwright

WEB = Path(__file__).resolve().parents[1] / "web"
THEMES = [
    ("starlight", "Starlight", "#07111f", "starlight/6.mp4", 0.1),
    ("quiet", "Quiet", "#0b1712", "quiet/1.mp4", 0.5),
    ("magic-forest", "Magic Forest", "#0b2e1a", "magic-forest/1.mp4", 0.1),
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Expected when a video source is changed or a context closes.


class ThemeBrowserTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(WEB)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/main_menu.html"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    async def asyncSetUp(self):
        self.playwright = await async_playwright().start()
        executable = os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium")
        self.browser = await self.playwright.chromium.launch(executable_path=executable, args=["--no-sandbox"])
        self.page_errors = []

    async def asyncTearDown(self):
        await self.browser.close()
        await self.playwright.stop()
        self.assertEqual(self.page_errors, [], "Unexpected JavaScript exception")

    async def page(self, saved=None, script=None, **options):
        context = await self.browser.new_context(**options)
        # Functional tests run offline with the existing system-font fallback.
        await context.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(content_type="text/css", body=""))
        if saved:
            # Seed once: a reload must read the app's newly persisted preference.
            await context.add_init_script(f"if (!localStorage.getItem('lowave-theme')) localStorage.setItem('lowave-theme', '{saved}')")
        if script:
            await context.add_init_script(script)
        page = await context.new_page()
        page.on("pageerror", lambda error: self.page_errors.append(str(error)))
        return page

    async def ready(self, page, theme):
        await page.wait_for_function("""id => document.documentElement.dataset.theme === id &&
            !document.documentElement.hasAttribute('data-theme-loading') &&
            document.querySelector('#theme-toggle')?.getAttribute('aria-busy') === 'false'""", arg=theme)

    async def test_cycle_persistence_wallpaper_and_existing_interactions(self):
        page = await self.page()
        console_errors = []
        bad_resources = []
        page.on("console", lambda msg: console_errors.append((msg.text, msg.location)) if msg.type == "error" else None)
        page.on("response", lambda response: bad_resources.append(response.url) if response.status >= 400 else None)
        await page.goto(self.url)
        await self.ready(page, "starlight")
        await page.evaluate("window.testVideo = document.querySelector('video')")
        for index, (id_, label, color, source, rate) in enumerate(THEMES):
            if index:
                await page.locator("#theme-toggle").click()
            await self.ready(page, id_)
            self.assertEqual(await page.locator("[data-theme-label]").inner_text(), label)
            next_label = THEMES[(index + 1) % len(THEMES)][1]
            self.assertEqual(await page.locator("#theme-toggle").get_attribute("aria-label"), f"Switch to {next_label} theme")
            self.assertEqual(await page.locator('meta[name="theme-color"]').get_attribute("content"), color)
            self.assertEqual(await page.evaluate("localStorage.getItem('lowave-theme')"), id_)
            self.assertEqual(await page.locator("#theme-stylesheet").count(), 1)
            self.assertEqual(await page.evaluate("document.querySelector('video') === window.testVideo"), True)
            self.assertEqual(await page.locator("video").count(), 1)
            self.assertTrue((await page.locator("video").get_attribute("src")).endswith(source))
            self.assertEqual(await page.locator("video").evaluate("v => v.playbackRate"), rate)
            await page.wait_for_function("document.querySelector('video').readyState >= 2")
            await page.wait_for_function("!document.querySelector('video').paused")

        await page.reload()
        await self.ready(page, "magic-forest")
        self.assertEqual(await page.locator("[data-theme-label]").inner_text(), "Magic Forest")
        await page.locator("#theme-toggle").click()
        await self.ready(page, "starlight")
        await page.locator('[data-track-id="track_002"] button').click()
        self.assertEqual(await page.locator("#currentTrackMetadata strong").inner_text(), "Another Song")
        self.assertEqual(await page.locator(".is-current").get_attribute("data-track-id"), "track_002")
        for selector, value in [(".timeline input", "35"), (".volume-slider input", "80")]:
            await page.locator(selector).fill(value)
            self.assertEqual(await page.locator(selector).evaluate("i => i.style.getPropertyValue('--range-progress')"), f"{value}%")
        await page.locator("label:has(#mode-lyrics)").click()
        self.assertTrue(await page.locator(".lyrics-panel").is_visible())
        self.assertFalse(await page.locator(".video-panel").is_visible())
        await page.locator("label:has(#mode-video)").click()
        self.assertTrue(await page.locator(".video-panel").is_visible())

        # Visibility handling resumes the same video without changing source/rate.
        await page.evaluate("Object.defineProperty(document, 'hidden', { configurable:true, value:true }); document.dispatchEvent(new Event('visibilitychange'))")
        self.assertTrue(await page.locator("video").evaluate("v => v.paused"))
        await page.evaluate("Object.defineProperty(document, 'hidden', { configurable:true, value:false }); document.dispatchEvent(new Event('visibilitychange'))")
        await page.wait_for_function("!document.querySelector('video').paused")
        allowed = ("assets/artwork/example.jpg", "assets/artwork/another.jpg", "favicon.ico")
        self.assertEqual([url for url in bad_resources if not url.endswith(allowed)], [])
        self.assertEqual([entry for entry in console_errors if not entry[1].get("url", "").endswith(allowed)], [])

    async def test_delayed_switch_is_atomic_and_failure_keeps_active_theme(self):
        page = await self.page()
        await page.goto(self.url)
        await self.ready(page, "starlight")
        requested, release = asyncio.Event(), asyncio.Event()

        async def delay(route):
            requested.set()
            await release.wait()
            await route.continue_()

        await page.route("**/themes/quiet/ui.css", delay)
        await page.locator("#theme-toggle").click()
        await requested.wait()
        # While loading, every externally visible projection still describes Starlight.
        self.assertEqual(await page.evaluate("document.documentElement.dataset.theme"), "starlight")
        self.assertEqual(await page.locator("[data-theme-label]").inner_text(), "Starlight")
        self.assertEqual(await page.evaluate("localStorage.getItem('lowave-theme')"), "starlight")
        self.assertEqual(await page.locator("body").evaluate("e => getComputedStyle(e).backgroundColor"), "rgb(7, 17, 31)")
        self.assertTrue((await page.locator("video").get_attribute("src")).endswith("starlight/6.mp4"))
        release.set()
        await self.ready(page, "quiet")
        await page.route("**/themes/magic-forest/ui.css", lambda route: route.abort())
        await page.locator("#theme-toggle").click()
        await self.ready(page, "quiet")
        self.assertEqual(await page.locator("[data-theme-label]").inner_text(), "Quiet")
        self.assertEqual(await page.evaluate("localStorage.getItem('lowave-theme')"), "quiet")
        self.assertEqual(await page.locator('link[href*="/themes/"]').count(), 1)

    async def test_rapid_cycle_cancels_stale_loads_without_reloading_active_css(self):
        page = await self.page()
        await page.goto(self.url)
        await self.ready(page, "starlight")
        requests = []
        page.on("request", lambda request: requests.append(request.url) if "/themes/" in request.url else None)
        release = asyncio.Event()
        quiet_requested, forest_requested = asyncio.Event(), asyncio.Event()

        async def delay(route):
            (quiet_requested if "/quiet/" in route.request.url else forest_requested).set()
            await release.wait()
            await route.continue_()

        await page.route("**/themes/*/ui.css", delay)
        await page.locator("#theme-toggle").click()
        await quiet_requested.wait()
        await page.locator("#theme-toggle").click()
        await forest_requested.wait()
        await page.locator("#theme-toggle").click()
        await self.ready(page, "starlight")
        release.set()
        await page.wait_for_load_state("networkidle")
        self.assertEqual(await page.evaluate("document.documentElement.dataset.theme"), "starlight")
        self.assertFalse(any("/starlight/" in url for url in requests))
        self.assertEqual(await page.locator('link[href*="/themes/"]').count(), 1)

    async def test_initial_failures_fall_back_and_never_leave_body_hidden(self):
        for fail_all in [False, True]:
            with self.subTest(fail_all=fail_all):
                page = await self.page(saved="magic-forest")
                pattern = "**/themes/*/ui.css" if fail_all else "**/themes/magic-forest/ui.css"
                await page.route(pattern, (lambda route: route.abort()) if fail_all else
                                 (lambda route: route.fulfill(status=404, content_type="text/css", body="")))
                await page.goto(self.url)
                await self.ready(page, "starlight")
                self.assertEqual(await page.locator("body").evaluate("e => getComputedStyle(e).visibility"), "visible")
                self.assertEqual(await page.locator("body").evaluate("e => getComputedStyle(e).backgroundColor"), "rgb(18, 18, 18)" if fail_all else "rgb(7, 17, 31)")
                self.assertEqual(await page.locator('link[href*="/themes/"]').count(), 0 if fail_all else 1)
                await page.unroute(pattern)
                await page.locator("#theme-toggle").click()
                await self.ready(page, "quiet")  # Resources can recover on a later selection.
                await page.context.close()

    async def test_saved_theme_is_loaded_before_first_visible_frame(self):
        page = await self.page(saved="quiet", script="""
            window.visibleThemes = [];
            const sample = () => {
              if (document.body && getComputedStyle(document.body).visibility === 'visible')
                window.visibleThemes.push([document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor, document.querySelector("[data-theme-label]")?.textContent]);
              requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
        """)
        requested, release = asyncio.Event(), asyncio.Event()

        async def delay(route):
            requested.set()
            await release.wait()
            await route.continue_()

        await page.route("**/themes/quiet/ui.css", delay)
        await page.goto(self.url, wait_until="domcontentloaded")
        await requested.wait()
        self.assertEqual(await page.locator("body").evaluate("e => getComputedStyle(e).visibility"), "hidden")
        self.assertEqual(await page.evaluate("window.visibleThemes"), [])
        release.set()
        await self.ready(page, "quiet")
        await page.wait_for_function("window.visibleThemes.length > 0")
        self.assertTrue(all(theme == ["quiet", "rgb(11, 23, 18)", "Quiet"] for theme in await page.evaluate("window.visibleThemes")))

        await page.context.close()

        # A cached/fast palette can finish before DOMContentLoaded. Hold the app
        # module so the label still has its markup default until controls bind.
        page = await self.page(saved="quiet")
        module_requested, release_module = asyncio.Event(), asyncio.Event()

        async def hold_module(route):
            module_requested.set()
            await release_module.wait()
            await route.continue_()

        await page.route("**/components/app.js", hold_module)
        await page.goto(self.url, wait_until="commit")
        await module_requested.wait()
        await page.wait_for_selector("#theme-stylesheet", state="attached")
        await page.wait_for_selector("#theme-toggle", state="attached")
        self.assertEqual(await page.locator("body").evaluate("e => getComputedStyle(e).visibility"), "hidden")
        release_module.set()
        await self.ready(page, "quiet")
        self.assertEqual(await page.locator("[data-theme-label]").inner_text(), "Quiet")

    async def test_timeout_and_storage_denial_leave_a_usable_app(self):
        page = await self.page(script="""
            Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); };
            Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
        """)
        await page.goto(self.url)
        await self.ready(page, "starlight")
        await page.locator("#theme-toggle").click()
        await self.ready(page, "quiet")
        await page.context.close()

        page = await self.page(saved="quiet")
        release = asyncio.Event()

        async def hang(route):
            await release.wait()
            await route.abort()

        await page.route("**/themes/quiet/ui.css", hang)
        await page.goto(self.url, wait_until="domcontentloaded")
        await self.ready(page, "starlight")  # Real 5-second resource timeout.
        release.set()
        await page.wait_for_load_state("networkidle")
        self.assertEqual(await page.evaluate("document.documentElement.dataset.theme"), "starlight")
        self.assertTrue(await page.locator("#theme-toggle").is_visible())

    async def test_responsive_geometry_and_background_hit_testing(self):
        for width, height in [(1440, 900), (1120, 800), (960, 800), (1366, 720), (769, 720), (768, 900), (390, 844), (320, 700)]:
            page = await self.page(viewport={"width": width, "height": height})
            await page.goto(self.url)
            for index, (theme, *_rest) in enumerate(THEMES):
                if index:
                    await page.locator("#theme-toggle").click()
                await self.ready(page, theme)
                await page.evaluate("scrollTo(0, 0)")
                metrics = await page.evaluate("""() => {
                    const rect = selector => {
                      const r = document.querySelector(selector).getBoundingClientRect();
                      return [r.x, r.y, r.width, r.height];
                    };
                    return {overflow: document.documentElement.scrollWidth > innerWidth,
                      geometry: ['.app','.sidebar','.main','.playback','.timeline','.video-panel'].map(rect)};
                }""")
                self.assertFalse(metrics["overflow"], (width, theme))
                if index == 0:
                    geometry = metrics["geometry"]
                else:
                    self.assertEqual(metrics["geometry"], geometry, (width, theme))
                for selector in ["#theme-toggle", ".play-button", ".timeline input"]:
                    await page.locator(selector).scroll_into_view_if_needed()
                    self.assertTrue(await page.locator(selector).evaluate("""e => {
                      const r = e.getBoundingClientRect();
                      const target = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
                      return e === target || e.contains(target);
                    }"""), (width, theme, selector))
                self.assertEqual(await page.locator(".app").evaluate("e => getComputedStyle(e).zIndex"), "1")
            await page.context.close()


if __name__ == "__main__":
    unittest.main()
