"""Test the built design gallery with a local HTTP server and isolated enquiry fixtures."""

from functools import partial
from os import environ
import re
import sys
from time import monotonic, sleep
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import unquote, urlsplit
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

from quote_desk_browser import verify as verify_quote_desk


FIXTURE = "https://themebrowserfixture.supabase.co"
PUBLIC_SITE = "https://www.techandguard.co.za"
PUBLIC_ENQUIRIES = "https://vthjdkwfvbfryofsmtdb.supabase.co"
CHROMIUM_EXECUTABLE = environ.get("CHROMIUM_EXECUTABLE_PATH")
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
    page.get_by_role("link", name="Open interactive demo for " + name, exact=True).click()
    experience = page.locator(".experience-site")
    expect(page.get_by_role("heading", name=name, level=1)).to_be_visible()
    navigation = page.get_by_role("navigation", name="Theme pages")
    links = navigation.get_by_role("link")
    expect(links).to_have_count(5 if theme_id in {"warm-editorial", "product-showcase"} else 4)
    expect(experience.locator(".experience-story h3")).to_be_visible()
    destinations = [link.get_attribute("href") for link in links.all()]

    page.get_by_text("Customise this theme", exact=True).click()
    page.get_by_label("Brand name").fill("Example design")
    page.get_by_label("Main headline").fill("A new headline for this demo")
    page.get_by_label("Accent colour").select_option("clay")
    page.get_by_label("Heading style").select_option("serif")
    expect(experience.get_by_role("heading", name="A new headline for this demo")).to_be_visible()
    expect(experience).to_have_attribute("data-accent", "clay")
    expect(experience).to_have_attribute("data-type", "serif")
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
        navigation.get_by_role("link", name="Services").click()
        expect(experience.locator(".advisory-offer")).to_have_count(12)
        page.get_by_role("link", name="Enquire about Systems selection").click()
        expect(page.get_by_role("combobox", name="Service of interest")).to_have_value("Systems selection")
        page.get_by_label("Example name").fill("Example customer")
        page.get_by_label("Example message").fill("A demo enquiry")
        page.get_by_role("button", name="Try example enquiry").click()
        expect(page.get_by_text("Example enquiry complete. No message was sent.")).to_be_visible()
    elif theme_id == "bold-studio":
        navigation.get_by_role("link", name="Projects").click()
        expect(experience.locator(".experience-projects > li")).to_have_count(12)
        navigation.get_by_role("link", name="Approvals").click()
        page.get_by_role("button", name="Approve Spring campaign").click()
        navigation.get_by_role("link", name="Approved", exact=True).click()
        expect(experience.get_by_text("Spring campaign")).to_be_visible()
    else:
        nav_label = "Catalogue" if theme_id == "clean-premium-retail" else "Collection"
        navigation.get_by_role("link", name=nav_label, exact=True).click()
        cards = experience.locator(".merchandise-card")
        expect(cards).to_have_count(12)
        pics = cards.locator("img")
        srcs = {pic.get_attribute("src") for pic in pics.all()}
        assert len(srcs) == 12, theme_id
        for pic in pics.all():
            pic.scroll_into_view_if_needed()
            pic.evaluate("(img) => img.decode()")
            assert pic.evaluate("(img) => img.naturalWidth") >= 300, theme_id
        page.get_by_label("Sort by").select_option("low")
        expect(cards.first.get_by_role("link")).to_have_accessible_name({
            "warm-editorial":"View Shea lip balm",
            "clean-premium-retail":"View Woven USB-C cable",
            "product-showcase":"View Audio cable organiser",
        }[theme_id])
        page.get_by_label("Search products").fill("impossible search")
        expect(page.get_by_text("No products match your search.")).to_be_visible()
        page.get_by_role("button", name="Clear filters").click()
        expect(cards).to_have_count(12)
        category = {"warm-editorial":"Body", "clean-premium-retail":"Audio", "product-showcase":"Desk setup"}[theme_id]
        page.get_by_label("Category").select_option(category)
        expect(cards.first).to_be_visible()
        assert 1 <= cards.count() < 12
        expect(cards.first.locator(".merchandise-category")).to_have_text(category)
        if theme_id == "warm-editorial":
            navigation.get_by_role("link", name="Treatments").click()
            page.get_by_role("button", name="Select Rest and restore").click()
            page.get_by_label("Sample appointment time").select_option("Saturday at 09:00")
            page.get_by_role("button", name="Try booking a treatment").click()
            expect(page.get_by_role("status")).to_contain_text("Rest and restore on Saturday at 09:00")
        navigation.get_by_role("link", name="Product", exact=True).click()
        expect(experience.locator(".merchandise-card")).to_have_count(3)
        if theme_id == "product-showcase":
            page.get_by_label("Finish").select_option("Sandstone")
            expect(experience.locator(".experience-product-hero img")).to_have_attribute("src", "/images/themes/catalogue/audio/studio-wireless-ivory.webp")
        page.get_by_role("button", name="Add to demo basket").click()
        navigation.get_by_role("link", name="Basket (1)", exact=True).click()
        expect(page.get_by_text("Quantity 1")).to_be_visible()
        if theme_id == "product-showcase":
            expect(page.get_by_text("Studio Wireless · Sandstone")).to_be_visible()
            expect(experience.locator(".merchandise-lines img")).to_have_attribute("src", "/images/themes/catalogue/audio/studio-wireless-ivory.webp")
        page.get_by_role("button", name="Add one").click()
        expect(page.get_by_text("Quantity 2")).to_be_visible()
        page.get_by_role("button", name="Try demo checkout").click()
        expect(page.get_by_role("status")).to_have_text("Demo checkout complete. No order or payment was placed.")
        page.get_by_role("button", name="Remove one").click()
        page.get_by_role("button", name="Remove one").click()
        expect(page.get_by_text("Your demo basket is empty.")).to_be_visible()


def verify_gallery(browser, base_url, width, enquiry_origin=FIXTURE):
    context = browser.new_context(
        viewport={"width": width, "height": 900}, service_workers="block"
    )
    context.tracing.start(screenshots=True, snapshots=True)
    submissions = []
    notifications = []
    page_errors = []
    unexpected_requests = []

    def handle_request(route):
        url = urlsplit(route.request.url)
        origin = f"{url.scheme}://{url.netloc}"
        if origin == base_url and route.request.method in {"GET", "HEAD"}:
            route.continue_()
        elif origin == enquiry_origin:
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
            elif route.request.method == "POST" and url.path == "/functions/v1/store-enquiry-notification":
                notifications.append(route.request.post_data_json)
                notification_ok = len(notifications) != 1
                route.fulfill(json={"sent": notification_ok, "configured": notification_ok}, headers=headers)
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
            link = card.get_by_role("link", name="Open interactive demo for " + name, exact=True)
            expect(link).to_have_attribute("href", "/design-themes/" + theme_id + "/")
            expect(card.get_by_role("list", name=name + " pages")).to_be_visible()
            for image in card.locator("img").all():
                image.scroll_into_view_if_needed()
                image.evaluate("(img) => img.decode()")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), name

            card.get_by_role("link", name="Choose " + name, exact=True).click()
            expect(page.get_by_label("What do you need?")).to_have_value(service)
            is_store = service == "Independent online stores"
            label = "Store theme" if is_store else "Design theme"
            expect(page.get_by_role("combobox", name=label, exact=True)).to_have_value(theme_id)
            email = page.get_by_role("link", name="Email info@techandguard.co.za", exact=True).get_attribute("href")
            assert email.startswith("mailto:info@techandguard.co.za?"), name
            assert name in unquote(email), name
            whats_app = page.get_by_role("link", name="Continue on WhatsApp", exact=True).get_attribute("href")
            assert whats_app.startswith("https://wa.me/27731127124?text="), name
            assert unquote(whats_app).count("Hello Tech & Guard") == 1, name
            page.get_by_label("Your name").fill("Test User")
            page.get_by_label("Your email").fill("test@example.invalid")
            if is_store:
                page.get_by_label("Business name").fill("Test Company")
            page.get_by_label("Project details").fill("Testing the selected design direction.")
            page.get_by_role("button", name="Send enquiry").click()
            expect(page.get_by_role("heading", name="Enquiry received")).to_be_visible()
            if len(notifications) == 1:
                expect(page.get_by_text("Your enquiry is saved in our admin queue, but we couldn’t confirm an email alert. You can contact us directly below.")).to_be_visible()
                expect(page.get_by_role("link", name="Continue on WhatsApp", exact=True)).to_be_visible()
            else:
                expect(page.get_by_text("The team email alert was accepted for delivery.")).to_be_visible()
            payload = submissions[-1]
            assert payload["p_topic"] == service and name in payload["p_message"], name

        for route, title in [
            ("terms", "Terms of use and sale"),
            ("returns", "Returns, cancellations and refunds"),
            ("delivery", "Delivery and collection"),
            ("privacy", "Privacy notice"),
        ]:
            page.goto(base_url + "/" + route + "/")
            expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()
            expect(page.get_by_text("Pre-launch notice", exact=True)).to_be_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), route

        for name, _, theme_id in THEMES:
            verify_full_theme(page, base_url, name, theme_id)
        assert len(submissions) == len(THEMES)
        assert len(notifications) == len(THEMES)
        for submission, notification in zip(submissions, notifications):
            assert notification["email"] == submission["p_email"]
            assert notification["id"] == "theme-test-reference"
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
        print(f"{width}px: verified five themes, 36 product photos, 12 services, 12 projects, editing, baskets and enquiries.")
    finally:
        context.close()


def verify_live_store(browser, width):
    context = browser.new_context(
        viewport={"width": width, "height": 900},
        is_mobile=width <= 600,
        has_touch=width <= 600,
    )
    page = context.new_page()
    page.set_default_timeout(15000)
    context.tracing.start(screenshots=True, snapshots=True)
    try:
        page.goto(PUBLIC_SITE + "/store/", wait_until="networkidle")
        heading = page.get_by_role("heading", name="Better gear for every day.")
        expect(heading).to_be_visible()
        cards = page.locator(".showroom-grid .product-card")
        assert cards.count() >= 10, f"expected at least 10 products, found {cards.count()}"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"store overflows at {width}px"
        columns = page.locator(".showroom-grid").evaluate(
            "el => getComputedStyle(el).gridTemplateColumns.split(' ').length"
        )
        assert columns <= 2 if width <= 600 else columns >= 2, (width, columns)
        for image in page.locator(".product-card img").all():
            image.scroll_into_view_if_needed()
            image.evaluate("(img) => img.decode()")
            assert image.evaluate("(img) => img.naturalWidth") >= 100, width
        add_button = cards.first.get_by_role("button", name=re.compile("Add to basket"))
        assert add_button.evaluate("(el) => el.getBoundingClientRect().height") >= 44, width
        add_button.click()
        expect(cards.first.get_by_text("1 in basket")).to_be_visible()
        expect(page.get_by_role("heading", name="Checkout setup is in progress")).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"basket overflows at {width}px"
        print(f"{width}px: live store has 16 products, loaded product images, working basket and no horizontal overflow.")
    except Exception:
        reports = Path("browser-test-results")
        reports.mkdir(exist_ok=True)
        context.tracing.stop(path=reports / f"store-mobile-{width}px.zip")
        raise
    else:
        context.tracing.stop()
    finally:
        context.close()



def verify_live():
    revision = environ.get("GITHUB_SHA", "")
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise SystemExit("A GitHub commit SHA is required for the live smoke test.")
    deadline = monotonic() + 360
    while monotonic() < deadline:
        try:
            with urlopen(PUBLIC_SITE + "/design-themes/?revision=" + revision, timeout=10) as response:
                if '<meta name="release-revision" content="' + revision + '"/>' in response.read().decode():
                    break
        except (URLError, TimeoutError):
            pass
        sleep(10)
    else:
        raise SystemExit("The matching Amplify release did not reach the public gallery in time.")

    print("Verifying public release " + revision, flush=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=CHROMIUM_EXECUTABLE)
        for width in (375, 1440):
            verify_gallery(browser, PUBLIC_SITE, width, PUBLIC_ENQUIRIES)
            verify_live_store(browser, width)
        browser.close()


def main():
    if sys.argv[1:] == ["--live"]:
        verify_live()
        return
    page = DIST / "design-themes" / "index.html"
    if FIXTURE not in page.read_text(encoding="utf-8"):
        raise SystemExit("Build with the isolated browser-test fixture before running this test.")
    handler = partial(StaticHandler, directory=DIST)
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=CHROMIUM_EXECUTABLE)
                for width in (375, 1440):
                    base_url = f"http://127.0.0.1:{server.server_port}"
                    verify_gallery(browser, base_url, width)
                    verify_quote_desk(browser, base_url, width)
                browser.close()
        finally:
            server.shutdown()
            worker.join()


if __name__ == "__main__":
    main()
