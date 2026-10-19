import { chromium, firefox, webkit, expect } from "@playwright/test";

const baseURL = process.env.RSS_PREVIEW_URL || "http://localhost:3000";
const engine = { chromium, firefox, webkit }[
  process.env.RSS_BROWSER || "chromium"
];
if (!engine)
  throw new Error("RSS_BROWSER must be chromium, firefox or webkit.");
const browser = await engine.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__routeTransitions = [];
  const original = document.startViewTransition.bind(document);
  document.startViewTransition = (callback) => {
    const record = {
      direction: document.documentElement.dataset.pageDirection,
      oldTitle: document.querySelector("#main h1")?.textContent,
      ready: false,
      finished: false,
    };
    window.__routeTransitions.push(record);
    const view = original(callback);
    view.ready
      .then(() => {
        record.newTitle = document.querySelector("#main h1")?.textContent;
        record.oldAnimation = getComputedStyle(
          document.documentElement,
          "::view-transition-old(page-content)",
        ).animationName;
        record.newAnimation = getComputedStyle(
          document.documentElement,
          "::view-transition-new(page-content)",
        ).animationName;
        record.duration = getComputedStyle(
          document.documentElement,
          "::view-transition-new(page-content)",
        ).animationDuration;
        record.completionAtReady =
          document.querySelector(".completion-icon")?.dataset.completion;
        record.scrollY = window.scrollY;
        record.oldOffsetY = getComputedStyle(document.documentElement)
          .getPropertyValue("--page-old-offset-y")
          .trim();
        record.ready = true;
      })
      .catch(() => {
        record.skipped = true;
      });
    view.finished
      .then(() => {
        record.finished = true;
      })
      .catch(() => {});
    return view;
  };
});
async function waitForFinish() {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.pageDirection),
    )
    .toBe(undefined);
}
async function navigate(label, path, direction) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: label, exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === path);
  await page.waitForFunction(() => window.__routeTransitions.at(-1)?.ready);
  const record = await page.evaluate(() => window.__routeTransitions.at(-1));
  expect(record.direction).toBe(direction);
  expect(record.oldAnimation).toBe(
    direction === "forward" ? "page-exit-left" : "page-exit-right",
  );
  expect(record.newAnimation).toBe(
    direction === "forward" ? "page-enter-left" : "page-enter-right",
  );
  expect(record.duration).toBe("0.46s");
  expect(record.oldTitle).not.toBe(record.newTitle);
  await waitForFinish();
}
try {
  await page.goto(baseURL);
  await navigate("About", "/about", "forward");
  await navigate("Home", "/", "backward");
  await navigate("Tickets", "/tickets", "forward");
  await navigate("Contact", "/contact", "forward");
  await navigate("About", "/about", "backward");
  await page.goBack();
  await page.waitForURL("**/contact");
  await waitForFinish();
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).direction),
  ).toBe("forward");
  await page.goForward();
  await page.waitForURL("**/about");
  await waitForFinish();
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).direction),
  ).toBe("backward");
  await navigate("Tickets", "/tickets", "forward");
  const previousScroll = await page.evaluate(() => {
    window.scrollTo({ top: 350, behavior: "instant" });
    return window.scrollY;
  });
  // Keyboard/programmatic activation avoids Playwright scrolling the CTA into view first.
  await page.evaluate(() =>
    document.querySelector('a[href="/register"]').click(),
  );
  await page.waitForURL("**/register");
  await waitForFinish();
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).oldOffsetY),
  ).toBe(`${-previousScroll}px`);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).ready),
  ).toBe(true);
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).direction),
  ).toBe("forward");
  await page.getByLabel("Full name").fill("Preview User");
  await page.getByLabel("Email address").fill("preview@example.com");
  await page.getByLabel("Phone number").fill("+971501234567");
  await page.getByLabel("Role", { exact: false }).selectOption("Student");
  await page.getByRole("slider", { name: /Grade/ }).focus();
  await page.getByRole("slider", { name: /Grade/ }).press("End");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Preview registration" }).click();
  await page.waitForURL("**/thank-you");
  await page.waitForFunction(() => window.__routeTransitions.at(-1)?.ready);
  expect(
    await page.evaluate(
      () => window.__routeTransitions.at(-1).completionAtReady,
    ),
  ).toBe("waiting");
  await waitForFinish();
  await expect(page.locator(".completion-icon")).toHaveAttribute(
    "data-completion",
    "playing",
  );
  expect(
    await page
      .locator(".completion-icon path")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("completion-check");
  expect(
    await page
      .locator(".completion-ring")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("completion-ring");
  await expect
    .poll(() =>
      page
        .locator(".completion-icon path")
        .evaluate((element) => getComputedStyle(element).strokeDashoffset),
    )
    .toBe("0px");
  expect(
    await page.evaluate(() => window.__routeTransitions.at(-1).direction),
  ).toBe("forward");
  await navigate("Home", "/", "backward");
  await page.evaluate(() => {
    document.querySelector('.desktop-nav a[href="/about"]').click();
    document.querySelector('.desktop-nav a[href="/contact"]').click();
  });
  await page.waitForURL("**/contact");
  await waitForFinish();
  await expect(
    page.getByRole("heading", { name: "Questions? Let’s Talk" }),
  ).toBeVisible();

  await navigate("Home", "/", "backward");
  await page.evaluate(() => {
    document.querySelector('.desktop-nav a[href="/about"]').click();
    document.querySelector('.desktop-nav a[href="/"]').click();
  });
  await page.waitForURL((url) => url.pathname === "/");
  await waitForFinish();
  await page.waitForTimeout(100);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(
    page.getByRole("heading", { name: /Every Voice\s+Has a Story/ }),
  ).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  const count = await page.evaluate(() => window.__routeTransitions.length);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === "/");
  expect(await page.evaluate(() => window.__routeTransitions.length)).toBe(
    count,
  );

  await page.waitForLoadState("networkidle");
  await page.goto(`${baseURL}/thank-you`);
  expect(
    await page
      .locator(".completion-icon path")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".completion-icon path")
      .evaluate((element) => getComputedStyle(element).strokeDashoffset),
  ).toBe("0px");

  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    document.startViewTransition = undefined;
  });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(baseURL);
  await fallbackPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "About", exact: true })
    .click();
  await fallbackPage.waitForURL("**/about");
  await expect(
    fallbackPage.getByRole("heading", { name: "What Is RSS Talk?" }),
  ).toBeVisible();
  await fallback.close();
  expect(errors).toEqual([]);
  console.log(
    "PASS: coordinated outgoing/incoming slides; forward and reverse route order; browser Back/Forward; registration and thank-you; sequenced completion animation; rapid navigation; reduced motion; unsupported-browser fallback; no browser errors.",
  );
} finally {
  await browser.close();
}
