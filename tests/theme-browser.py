"""Test the built design gallery with a local HTTP server and isolated enquiry fixtures."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright


FIXTURE = "https://themebrowserfixture.supabase.co"
DIST = Path(__file__).resolve().parents[1] / "dist"
THEMES = [
    ("Modern Corporate", "Business websites", "modern-corporate"),
    ("Warm Editorial", "Independent online stores", "warm-editorial"),
    ("Clean Premium Retail", "Independent online stores", "clean-premium-retail"),
    ("Product Showcase", "Independent online stores", "product-showcase"),
    ("Bold Studio", "Custom web applications", "bold-studio"),
]


class StaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def verify_full_theme(page, base_url, name, theme_id):
    page.goto(base_url + "/design-themes/")
    page.get_by_role("link", name="Explore " + name, exact=True).click()
    experience = page.locator(".experience-site")
    expect(page.get_by_role("heading", name=name, level=1)).to_be_visible()
    navigation = page.get_by_role("navigation", name="Theme pages")
    links = navigation.get_by_role("link")
    expect(links).to_have_count(4)
    destinations = [link.get_attribute("href") for link in links.all()]

    page.get_by_text("Customise this theme", exact=True).click()
    page.get_by_label("Brand name").fill("Example design")
    page.get_by_label("Main headline").fill("A new headline for this demo")
    page.get_by_label("Accent colour").select_option("clay")
    page.get_by_label("Heading style").select_option("serif")
    expect(experience.get_by_role("heading", name="A new headline for this demo")).to_be_visible()
    expect(experience).to_have_attribute("data-accent", "clay")
    expect(experience).to_have_attribute("data-type", "serif")
    if theme_id != "bold-studio":
        picture = "/images/themes/editorial.webp" if theme_id == "modern-corporate" else "/images/themes/corporate.webp"
        page.get_by_label("Hero image").select_option(picture)
        expect(experience.locator(".experience-hero img")).to_have_attribute("src", picture)

    for path in destinations[1:]:
        navigation.locator(f'a[href="{path}"]').click()
        expect(page).to_have_url(base_url + path)
        expect(experience.get_by_role("link", name="Example design")).to_be_visible()
        expect(experience).to_have_attribute("data-accent", "clay")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), path

    page.get_by_text("Customise this theme", exact=True).click()
    page.get_by_label("Page heading").fill("A customised inner page")
    page.get_by_label("Page introduction").fill("Customers can edit this introduction.")
    expect(experience.get_by_role("heading", name="A customised inner page")).to_be_visible()
    expect(experience.get_by_text("Customers can edit this introduction.")).to_be_visible()
    navigation.get_by_role("link").first.click()
    expect(experience.get_by_role("heading", name="A new headline for this demo")).to_be_visible()
    navigation.get_by_role("link").last.click()
    expect(experience.get_by_role("heading", name="A customised inner page")).to_be_visible()
    page.get_by_text("Customise this theme", exact=True).click()
    page.get_by_role("button", name="Reset customisation").click()
    expect(experience.get_by_role("heading", name="A customised inner page")).to_have_count(0)
    expect(experience).to_have_attribute("data-accent", "signature")

    if theme_id == "modern-corporate":
        page.get_by_label("Example name").fill("Example customer")
        page.get_by_label("Example message").fill("A demo enquiry")
        page.get_by_role("button", name="Try example enquiry").click()
        expect(page.get_by_text("Example enquiry complete. No message was sent.")).to_be_visible()
    elif theme_id == "bold-studio":
        navigation.get_by_role("link", name="Approvals").click()
        page.get_by_role("button", name="Approve Spring campaign").click()
        navigation.get_by_role("link", name="Approved", exact=True).click()
        expect(experience.get_by_text("Spring campaign")).to_be_visible()
    else:
        if theme_id in {"warm-editorial", "clean-premium-retail"}:
            navigation.get_by_role("link", name="Collection" if theme_id == "warm-editorial" else "Catalogue").click()
            page.get_by_label("Category").select_option("Decor" if theme_id == "warm-editorial" else "Audio")
            expect(experience.get_by_role("link", name="View small sculptural vessel" if theme_id == "warm-editorial" else "View wireless headphones")).to_be_visible()
        navigation.get_by_role("link", name="Product", exact=True).click()
        if theme_id == "product-showcase":
            page.get_by_label("Finish").select_option("Sandstone")
        page.get_by_role("button", name="Add to demo basket").click()
        navigation.get_by_role("link", name="Basket (1)", exact=True).click()
        expect(page.get_by_text("Quantity 1")).to_be_visible()
        if theme_id == "product-showcase":
            expect(page.get_by_text("Studio Wireless · Sandstone")).to_be_visible()
        page.get_by_role("button", name="Remove one").click()
        expect(page.get_by_text("Your demo basket is empty.")).to_be_visible()


def verify_gallery(browser, base_url, width):
    context = browser.new_context(
        viewport={"width": width, "height": 900}, service_workers="block"
    )
    context.tracing.start(screenshots=True, snapshots=True)
    submissions = []
    page_errors = []
    unexpected_requests = []

    def handle_request(route):
        url = urlsplit(route.request.url)
        origin = f"{url.scheme}://{url.netloc}"
        if origin == base_url:
            route.continue_()
        elif origin == FIXTURE:
            headers = {"access-control-allow-origin": base_url}
            if route.request.method == "OPTIONS":
                headers.update({
                    "access-control-allow-methods": "POST, OPTIONS",
                    "access-control-allow-headers": route.request.headers.get(
                        "access-control-request-headers", ""
                    ),
                })
                route.fulfill(status=204, headers=headers)
            elif route.request.method == "POST" and url.path == "/rest/v1/rpc/corporate_enquiry_intake_ready":
                route.fulfill(json=True, headers=headers)
            elif route.request.method == "POST" and url.path == "/rest/v1/rpc/corporate_submit_enquiry":
                submissions.append(route.request.post_data_json)
                route.fulfill(json="theme-test-reference", headers=headers)
            else:
                unexpected_requests.append(url.path)
                route.abort()
        else:
            if route.request.resource_type in {"fetch", "xhr"}:
                unexpected_requests.append(route.request.url)
            route.abort()

    context.route("**/*", handle_request)
    page = context.new_page()
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.set_default_timeout(8000)
    try:
        page.goto(base_url + "/")
        home_links = page.get_by_role("link", name="Explore design themes")
        expect(home_links).to_have_count(3)
        home_links.first.click()
        expect(page).to_have_url(base_url + "/design-themes/#business-websites")
        expect(page.locator(".store-theme-card")).to_have_count(len(THEMES))

        for name, service, theme_id in THEMES:
            page.goto(base_url + "/design-themes/")
            card = page.get_by_role("article").filter(
                has=page.get_by_role("heading", name=name, exact=True)
            )
            expect(card.locator("xpath=ancestor::section[1]").get_by_role(
                "heading", name=service, exact=True
            )).to_be_visible()
            card.get_by_text("Open " + name + " preview", exact=True).click()
            last_option = card.get_by_role("button").last
            last_option.click()
            expect(last_option).to_have_attribute("aria-pressed", "true")
            if theme_id == "bold-studio":
                expect(card.get_by_text("Studio portfolio")).to_be_visible()
                expect(card.get_by_text("Spring campaign")).to_have_count(0)
            for image in card.locator("img").all():
                image.scroll_into_view_if_needed()
                image.evaluate("(img) => img.decode()")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), name

            card.get_by_role("link", name="Choose " + name, exact=True).click()
            expect(page.get_by_label("What do you need?")).to_have_value(service)
            is_store = service == "Independent online stores"
            label = "Store theme" if is_store else "Design theme"
            expect(page.get_by_role("combobox", name=label, exact=True)).to_have_value(theme_id)
            email = page.get_by_role("link", name="Open email draft").get_attribute("href")
            assert name in unquote(email), name
            page.get_by_label("Your name").fill("Test User")
            page.get_by_label("Your email").fill("test@example.invalid")
            if is_store:
                page.get_by_label("Business name").fill("Test Company")
            page.get_by_label("Project details").fill("Testing the selected design direction.")
            page.get_by_role("button", name="Send enquiry").click()
            expect(page.get_by_role("heading", name="Enquiry received")).to_be_visible()
            payload = submissions[-1]
            assert payload["p_topic"] == service and name in payload["p_message"], name

        for name, _, theme_id in THEMES:
            verify_full_theme(page, base_url, name, theme_id)
        assert len(submissions) == len(THEMES)
        page.goto(base_url + "/services/")
        service_links = page.get_by_role("link", name="Explore design themes")
        expect(service_links).to_have_count(3)
        service_links.last.click()
        expect(page).to_have_url(base_url + "/design-themes/#custom-web-applications")
        page.goto(base_url + "/store-themes/")
        expect(page.locator(".store-theme-card")).to_have_count(3)
        page.goto(base_url + "/contact/?service=Independent+online+stores&theme=editorial")
        expect(page.get_by_role("combobox", name="Store theme", exact=True)).to_have_value("warm-editorial")
        page.get_by_label("What do you need?").select_option("Custom web applications")
        expect(page.get_by_role("combobox", name="Design theme", exact=True)).to_have_value("")
        assert not page_errors, page_errors
        assert not unexpected_requests, unexpected_requests
    except Exception:
        reports = Path("browser-test-results")
        reports.mkdir(exist_ok=True)
        context.tracing.stop(path=reports / f"theme-{width}px.zip")
        raise
    else:
        context.tracing.stop()
        print(f"{width}px: verified five theme sites, all 20 pages, live editing, sample workflows and project enquiries.")
    finally:
        context.close()


def main():
    page = DIST / "design-themes" / "index.html"
    if FIXTURE not in page.read_text(encoding="utf-8"):
        raise SystemExit("Build with the isolated browser-test fixture before running this test.")
    handler = partial(StaticHandler, directory=DIST)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
                for width in (375, 1440):
                    verify_gallery(browser, f"http://127.0.0.1:{server.server_port}", width)
                browser.close()
        finally:
            server.shutdown()
            worker.join()


if __name__ == "__main__":
    main()
