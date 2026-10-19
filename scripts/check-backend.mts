/** Local integration QA. Requires a built .next and running local Supabase.
 * RSS_LOCAL_STATUS must point to the private JSON output of `supabase status -o json`.
 * Starts its own production server on 3001 with ephemeral credentials. No hosted data.
 */
import assert from "node:assert/strict";
import { readFileSync, openSync, closeSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { chromium, expect } from "@playwright/test";
import { hashAdminPassword } from "../src/lib/admin-password";
import { fallbackSite } from "../src/lib/site/model";
const status = JSON.parse(
  readFileSync(
    process.env.RSS_LOCAL_STATUS ?? "/tmp/rss-local-status.json",
    "utf8",
  ),
);
assert.equal(new URL(status.DB_URL).hostname, "127.0.0.1");
assert.equal(new URL(status.DB_URL).port, "54322");
assert.equal(new URL(status.API_URL).hostname, "127.0.0.1");
const base = "http://localhost:3001";
const password = randomBytes(32).toString("base64url");
const hash = await hashAdminPassword(password);
const pool = new pg.Pool({ connectionString: status.DB_URL });
const sql = (text: string, values: unknown[] = []) => pool.query(text, values);
const log = openSync("/tmp/rss-backend-preview.log", "w", 0o600);
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3001"],
  {
    env: {
      ...process.env,
      SUPABASE_URL: status.API_URL,
      SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
      ADMIN_PASSWORD_HASH: hash,
      ADMIN_SESSION_SECRET: randomBytes(48).toString("base64url"),
      SITE_URL: base,
    },
    stdio: ["ignore", log, log],
  },
);
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: base });
const page = await context.newPage();
const pageErrors: string[] = [];
const violations: string[] = [];
page.on("console", (message) => {
  if (message.text().includes("Content Security Policy"))
    console.log("CSP browser diagnostic:", message.text().slice(0, 500));
});
page.on("pageerror", (e) => pageErrors.push(e.message));
await page.addInitScript(() =>
  document.addEventListener(
    "securitypolicyviolation",
    (e) =>
      ((window as unknown as { cspErrors: string[] }).cspErrors = [
        ...((window as unknown as { cspErrors?: string[] }).cspErrors ?? []),
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`,
      ]),
  ),
);
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  options: Record<string, string> = {},
) {
  return context.request.fetch(path, {
    method,
    headers: { Origin: base, ...options },
    data: body,
  });
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/site")).ok) break;
    } catch {}
    if (i === 99) throw new Error("Preview server did not start.");
    await new Promise((r) => setTimeout(r, 200));
  }
  await sql("truncate private.request_limits");
  await sql("delete from public.admin_audit");
  await sql("delete from public.tickets");
  await sql(
    "update public.event_settings set max_seats=50,registration_open=true,version=1",
  );
  assert.equal((await request("/api/admin/dashboard")).status(), 401);
  assert.equal(
    (
      await request(
        "/api/admin/settings",
        "PUT",
        {},
        { Origin: "https://attacker.example" },
      )
    ).status(),
    403,
  );
  const anonymous = await fetch(status.REST_URL + "/tickets?select=*", {
    headers: {
      apikey: status.ANON_KEY,
      Authorization: `Bearer ${status.ANON_KEY}`,
    },
  });
  assert(anonymous.status >= 400);
  assert.equal(
    (
      await request("/api/register", "POST", {
        requestId: randomUUID(),
        version: 1,
        answers: {},
        website: "",
      })
    ).status(),
    400,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await request(
          "/api/admin/login",
          "POST",
          { password: "incorrect" },
          { "x-real-ip": "192.0.2.1" },
        )
      ).status(),
      401,
    );
  assert.equal(
    (
      await request(
        "/api/admin/login",
        "POST",
        { password },
        { "x-real-ip": "192.0.2.1" },
      )
    ).status(),
    429,
  );
  await page.goto(base + "/admin/login");
  await page.getByLabel("Admin password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(base + "/admin");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  const signed = (await context.cookies()).find((c) => c.name === "rss_admin");
  assert(signed?.httpOnly);
  assert.equal(signed.sameSite, "Lax");
  console.log("Admin login passed; checking responsive tabs.");
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const label of [
      "Overview",
      "Registrations",
      "QR check-in",
      "Event settings",
      "Form builder",
      "Site content",
      "Messages",
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator("h1")).toHaveText(label);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Admin overflow ${label} at ${width}`,
      );
    }
  }
  await page.screenshot({
    path: "/tmp/rss-admin-responsive.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Event settings", exact: true })
    .click();
  await page.getByLabel("Venue", { exact: true }).fill("Local Test Auditorium");
  await page.getByRole("button", { name: "Save event settings" }).click();
  await expect(page.locator('[role="status"]')).toContainText("Settings saved");
  let site = await (await request("/api/site")).json();
  assert.equal(site.venue, "Local Test Auditorium");
  await page.getByRole("button", { name: "Form builder", exact: true }).click();
  await page
    .locator("#field-options-role")
    .fill("Speaker\nTeacher\nStudent\nParent");
  await page.getByRole("button", { name: "Save form", exact: true }).click();
  await expect(page.locator('[role="status"]')).toContainText("Settings saved");
  site = await (await request("/api/site")).json();
  assert(
    site.fields
      .find((f: { key: string }) => f.key === "role")
      .options.includes("Speaker"),
  );
  console.log("Opening registration.");
  await page.goto(base + "/register");
  await page.getByLabel("Full name").fill("Local Browser Attendee");
  await page.getByLabel("Email address").fill("browser@example.test");
  await page.getByLabel("Phone number").fill("+971501234567");
  await page.getByLabel("Role", { exact: false }).selectOption("Student");
  await page.getByRole("slider", { name: /Grade/ }).focus();
  await page.getByRole("slider", { name: /Grade/ }).press("End");
  await page.getByRole("button", { name: "Reserve my seat" }).click();
  await page.waitForURL(base + "/thank-you");
  await expect(
    page.getByText("Your seat is reserved.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByAltText("Your personal ticket QR code")).toBeVisible();
  const receipt = (await context.cookies()).find(
    (c) => c.name === "rss_ticket",
  );
  assert(receipt?.httpOnly);
  assert.equal(receipt.value.length, 64);
  const token = receipt.value;
  const ticket = (
    await sql("select * from public.tickets where qr_token=$1", [token])
  ).rows[0];
  assert.equal(ticket.name, "Local Browser Attendee");
  assert.equal(ticket.role, "Student");
  assert.equal(ticket.grade, "Grade 12");
  const beforeRecovery = (await sql("select count(*) from public.tickets"))
    .rows[0].count;
  const recoverContext = await browser.newContext({ baseURL: base });
  const recoverPage = await recoverContext.newPage();
  await recoverPage.goto(base + "/recover-ticket");
  await recoverPage.getByLabel("Email address").fill("BROWSER@example.test");
  await recoverPage.getByLabel("Phone number").fill("+971 50 123 4567");
  await recoverPage.getByRole("button", { name: "Find my ticket" }).click();
  await recoverPage.waitForURL(base + `/ticket/${token}`);
  await expect(recoverPage.getByText("Local Browser Attendee")).toBeVisible();
  await recoverContext.close();
  assert.equal(
    (await sql("select count(*) from public.tickets")).rows[0].count,
    beforeRecovery,
  );
  const qr = await request(`/api/tickets/${token}/qr`);
  assert.equal(qr.status(), 200);
  assert.equal(qr.headers()["content-type"], "image/png");
  assert.equal((await qr.body()).subarray(1, 4).toString(), "PNG");
  assert(qr.headers()["content-disposition"].includes(ticket.ticket_number));
  await page.goto(base + `/ticket/${token}`);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download image", exact: true }).click();
  assert.equal(
    (await download).suggestedFilename(),
    `${ticket.ticket_number}.png`,
  );
  await expect(page.getByText("Local Browser Attendee")).toBeVisible();
  assert.equal((await page.content()).includes("browser@example.test"), false);
  assert.equal((await page.content()).includes("+971501234567"), false);
  assert.equal(
    (
      await request("/api/contact", "POST", {
        name: "Local Question",
        email: "question@example.test",
        question: "Please confirm the event entrance.",
        role: "Teacher",
        grade: null,
      })
    ).status(),
    201,
  );
  assert.equal(
    (
      await request("/api/contact", "POST", {
        name: "Student Question",
        email: "student-question@example.test",
        question: "Where is the student entrance?",
        role: "Student",
        grade: 13,
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await request("/api/contact", "POST", {
        name: "Student Question",
        email: "student-question@example.test",
        question: "Where is the student entrance?",
        role: "Student",
        grade: 12,
      })
    ).status(),
    201,
  );
  assert.equal(
    (
      await sql(
        "select grade from public.contact_messages where email='student-question@example.test'",
      )
    ).rows[0].grade,
    12,
  );
  await page.goto(base + "/admin");
  await page.getByRole("button", { name: "QR check-in", exact: true }).click();
  await page.getByLabel("Ticket code or number").fill(`RSS1:${token}`);
  await page
    .getByRole("button", { name: "Validate and check in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check-in recorded", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Validate and check in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Already checked in", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit Local Browser Attendee" })
    .click();
  await page.getByLabel("Full name").fill("Edited Attendee");
  await page.getByLabel("Ticket status").selectOption("cancelled");
  await page
    .getByRole("button", { name: "Save registration", exact: true })
    .click();
  await expect(page.locator('[role="status"]')).toContainText(
    "Registration updated",
  );
  site = await (await request("/api/site")).json();
  assert.equal(site.remaining, 50);
  await page
    .getByRole("button", { name: "Event settings", exact: true })
    .click();
  await page.getByLabel("Maximum seats").fill("1");
  await page.getByRole("button", { name: "Save event settings" }).click();
  await expect(page.locator('[role="status"]')).toContainText("Settings saved");
  site = await (await request("/api/site")).json();
  const id = randomUUID();
  const answers = {
    name: "API Attendee",
    email: "api@example.test",
    phone: "+971501234567",
    role: "Teacher",
    grade: "",
  };
  const payload = {
    requestId: id,
    version: site.version,
    answers,
    website: "",
  };
  const reg = await request("/api/register", "POST", payload);
  assert.equal(reg.status(), 201);
  const retry = await request("/api/register", "POST", payload);
  assert.equal(retry.status(), 201);
  assert.deepEqual(await retry.json(), await reg.json());
  assert.equal(
    (
      await request("/api/register", "POST", {
        ...payload,
        requestId: randomUUID(),
        answers: { ...answers, email: "soldout@example.test" },
      })
    ).status(),
    409,
  );
  await page.goto(base + "/register");
  await expect(page.locator('[role="status"]')).toContainText(
    "All seats are reserved",
  );
  await expect(
    page.getByRole("button", { name: "Reserve my seat" }),
  ).toBeDisabled();
  await page.goto(base + "/admin");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/admin/login");
  assert.equal((await request("/api/admin/dashboard")).status(), 401);
  assert.equal(
    (
      await request("/api/admin/dashboard", "GET", undefined, {
        Cookie: `rss_admin=${signed.value}`,
      })
    ).status(),
    401,
  );
  violations.push(
    ...(await page.evaluate(
      () => (window as unknown as { cspErrors?: string[] }).cspErrors ?? [],
    )),
  );
  assert.deepEqual(violations, []);
  assert.deepEqual(pageErrors, []);
  console.log(
    "Passed: protected admin, Origin checks, login rate limit, HTTP-only cookies, anonymous denial, all admin tabs at three widths, settings/form edits, live registration and QR download, private attendee data, contact submission, single-use UI check-in, attendee editing/cancellation, capacity closure, idempotent retries, sign-out and browser/CSP errors.",
  );
} catch (error) {
  console.log("Stopped on route", new URL(page.url()).pathname);
  await page.screenshot({
    path: "/tmp/rss-backend-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  closeSync(log);
  await sql("delete from public.admin_audit");
  await sql("delete from public.tickets");
  await sql("delete from public.contact_messages");
  await sql("delete from public.admin_sessions");
  await sql("truncate private.request_limits");
  await sql(
    "update public.event_settings set max_seats=50,registration_open=false,version=1,venue=$1,form_fields=$2,content=$3",
    [
      fallbackSite.venue,
      JSON.stringify(fallbackSite.fields),
      JSON.stringify(fallbackSite.content),
    ],
  );
  await pool.end();
}
