import { chromium, expect } from "@playwright/test";

const baseURL = process.env.RSS_PREVIEW_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const submissions = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.method() === "POST") submissions.push(request.url());
});
const routes = [
  "/",
  "/about",
  "/tickets",
  "/contact",
  "/register",
  "/thank-you",
  "/recover-ticket",
];

try {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      const response = await page.goto(`${baseURL}${route}`);
      expect(response.status()).toBe(200);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        frame: document.querySelector(".site-frame").getBoundingClientRect()
          .width,
        viewport: document.body.clientWidth,
      }));
      expect(dimensions.overflow, `${route} overflows at ${width}px`).toBe(
        false,
      );
      expect(
        Math.abs(dimensions.frame - dimensions.viewport),
        "Shell should use full viewport width",
      ).toBeLessThan(2);
      await expect(
        page.getByRole("link", { name: "RSS Talk Show home" }).locator("img"),
      ).toBeVisible();
      const broken = await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map((image) => image.decode().catch(() => {})),
        );
        return images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.src);
      });
      expect(broken, `Broken artwork on ${route}`).toEqual([]);
      if (width === 1440 || width === 375) {
        await page.screenshot({
          path: `/tmp/rss-${route === "/" ? "home" : route.slice(1)}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }

  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveText(["Home", "About", "Tickets", "Contact"]);

  await page.addInitScript(() => {
    const observe = IntersectionObserver.prototype.observe;
    IntersectionObserver.prototype.observe = function (element) {
      element.setAttribute("data-qa-motion-observed", "");
      return observe.call(this, element);
    };
  });
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(`${baseURL}/`);
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".team-section[data-qa-motion-observed]")
    .waitFor({ state: "attached" });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() =>
    document
      .querySelector(".team-section")
      .scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await page.waitForFunction(() =>
    document
      .querySelector(".team-section")
      .getAnimations()
      .some((animation) => animation.playState === "running"),
  );
  await expect
    .poll(() =>
      page
        .locator(".team-section")
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(0);
  await page.setViewportSize({ width: 1920, height: 1000 });

  await page.goto(`${baseURL}/contact`);
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Preview User");
  await page.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await page.getByLabel("Role", { exact: true }).selectOption("Teacher");
  await expect(page.getByRole("slider", { name: "Grade" })).toHaveCount(0);
  await page.getByLabel("Role", { exact: true }).selectOption("Student");
  await page.getByRole("slider", { name: "Grade" }).press("End");
  await expect(page.getByRole("slider", { name: "Grade" })).toHaveAttribute(
    "aria-valuetext",
    "Grade 12",
  );
  await page.getByLabel("Role", { exact: true }).selectOption("Teacher");
  await expect(page.getByRole("slider", { name: "Grade" })).toHaveCount(0);
  await page
    .getByLabel("Your Question")
    .fill("When will the event details be confirmed?");
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(
    page.getByText("Your form is ready.", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Your Question")
    .fill("An edited question for this demo form.");
  await expect(
    page.getByText("Your form is ready.", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "How can I register for the event?" })
    .click();
  await expect(
    page.getByText("Visit Tickets and choose Register Now", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "How can I register for the event?" })
    .click();
  await expect(
    page.getByRole("button", { name: "How can I register for the event?" }),
  ).toHaveAttribute("aria-expanded", "false");

  await page.goto(`${baseURL}/tickets`);
  await page.getByRole("link", { name: "Register Now" }).click();
  await page.waitForURL("**/register");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Tickets" }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Preview registration" }).click();
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await page.getByLabel("Full name").fill("Preview User");
  await page.getByLabel("Email address").fill("preview@example.com");
  await page.getByLabel("Phone number").fill("+971501234567");
  await expect(page.getByRole("slider", { name: /Grade/ })).toHaveCount(0);
  await page.getByLabel("Role", { exact: false }).selectOption("Teacher");
  await expect(page.getByRole("slider", { name: /Grade/ })).toHaveCount(0);
  await page.getByLabel("Role", { exact: false }).selectOption("Student");
  await page.getByRole("slider", { name: /Grade/ }).focus();
  await page.getByRole("slider", { name: /Grade/ }).press("End");
  await page.getByRole("button", { name: "Preview registration" }).click();
  await expect(
    page.getByText("Please acknowledge that this is a demo."),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Preview registration" }).click();
  await page.waitForURL("**/thank-you");
  await expect(
    page.getByRole("heading", { name: "Thank you for registering." }),
  ).toBeVisible();
  await expect(page.getByText("This is a preview only.")).toBeVisible();
  expect(page.url()).not.toContain("preview@example.com");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link"),
  ).toHaveText(["Home", "About", "Tickets", "Contact"]);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "About" })
    .click();
  await page.waitForURL("**/about");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseURL}/contact`);
  const motion = await page
    .locator(".faq-trigger svg")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(motion).toBe("0s");
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(`${baseURL}/`);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const initialMotion = await page
    .locator(".hero-copy h1")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(initialMotion).toBe("none");
  await page.evaluate(() =>
    document
      .querySelector(".team-section")
      .scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(
    await page
      .locator(".team-section")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await staticPage.goto(`${baseURL}/tickets`);
  await expect(
    staticPage.getByRole("heading", { name: /Be Part of the\s+Conversation/ }),
  ).toBeVisible();
  expect(
    await staticPage
      .locator(".ticket-faq")
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  await noScript.close();

  expect(submissions, "Frontend demo must not submit form data").toEqual([]);
  expect(errors, "Browser runtime errors").toEqual([]);
  console.log(
    "PASS: seven routes at 320/375/768/1024/1440/1920px; full-width layout; no overflow; all artwork loads; contact validation; FAQ; complete demo registration flow; keyboard mobile navigation; navigation order; scroll animation; reduced motion; no-JavaScript content visibility; no data submitted or persisted; no browser errors.",
  );
} finally {
  await browser.close();
}
