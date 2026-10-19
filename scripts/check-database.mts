import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  hashAdminPassword,
  verifyAdminPassword,
  signAdminSession,
  verifyAdminSession,
  SESSION_SECONDS,
} from "../src/lib/admin-password";
// Explicitly local and disposable. Never run this against a hosted database.
const url =
  process.env.RSS_TEST_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsed = new URL(url);
assert(
  ["127.0.0.1", "localhost"].includes(parsed.hostname) &&
    parsed.port === "54322",
  "Tests require the local Supabase database on port 54322.",
);
const pool = new pg.Pool({ connectionString: url, max: 25 });
const sql = (text: string, values: unknown[] = []) => pool.query(text, values);
const actor = randomUUID();
const answers = (i: number) => ({
  name: `Test Attendee ${i}`,
  email: `attendee${i}@example.test`,
  phone: "+971501234567",
  role: "Student",
  grade: "Grade 12",
});
async function register(i: number, id = randomUUID(), value = answers(i)) {
  return (
    await sql("select public.register_ticket($1,$2,1) as ticket", [id, value])
  ).rows[0].ticket;
}
try {
  await sql("delete from public.admin_audit");
  await sql("delete from public.tickets");
  await sql(
    "update public.event_settings set max_seats=50,registration_open=true,version=1 where id=1",
  );
  await sql(
    "insert into public.admin_sessions(id,expires_at) values($1,now()+interval '1 hour')",
    [actor],
  );
  const requests = await Promise.allSettled(
    Array.from({ length: 100 }, (_, i) => register(i)),
  );
  const won = requests.filter((r) => r.status === "fulfilled");
  assert.equal(won.length, 50);
  assert.equal(
    requests.filter(
      (r) => r.status === "rejected" && r.reason.message.includes("SOLD_OUT"),
    ).length,
    50,
  );
  assert.equal(
    (await sql("select registered_count from public.event_settings")).rows[0]
      .registered_count,
    50,
  );
  const first = (
    won[0] as PromiseFulfilledResult<{
      id: string;
      request_id: string;
      answers: ReturnType<typeof answers>;
      qr_token: string;
      email: string;
    }>
  ).value;
  assert.equal(
    (await register(0, first.request_id, first.answers)).id,
    first.id,
  );
  await assert.rejects(register(999, first.request_id), /IDEMPOTENCY_CONFLICT/);
  assert.equal(
    (
      await sql("select public.recover_ticket($1,$2) as token", [
        first.email.toUpperCase(),
        "+971 50 123 4567",
      ])
    ).rows[0].token,
    first.qr_token,
  );
  assert.equal(
    (
      await sql("select public.recover_ticket($1,$2) as token", [
        first.email,
        "+971599999999",
      ])
    ).rows[0].token,
    null,
  );
  const scans = await Promise.all(
    Array.from({ length: 10 }, () =>
      sql("select public.validate_ticket($1,$2) as result", [
        actor,
        first.qr_token,
      ]),
    ),
  );
  assert.equal(
    scans.filter((r) => r.rows[0].result.result === "checked_in").length,
    1,
  );
  assert.equal(
    scans.filter((r) => r.rows[0].result.result === "already_checked_in")
      .length,
    9,
  );
  await sql("select public.admin_update_ticket($1,$2,$3)", [
    actor,
    first.id,
    { status: "cancelled", answers: first.answers },
  ]);
  assert.equal(
    (await sql("select registered_count from public.event_settings")).rows[0]
      .registered_count,
    49,
  );
  assert.equal(
    (
      await sql("select public.recover_ticket($1,$2) as token", [
        first.email,
        "+971501234567",
      ])
    ).rows[0].token,
    null,
  );
  const replacement = await register(200);
  assert(replacement.qr_token !== first.qr_token);
  assert.equal(replacement.qr_token.length, 64);
  await sql(
    `update public.event_settings set form_fields=(select jsonb_agg(case when item->>'key'='phone' then jsonb_set(item,'{enabled}','false') else item end) from jsonb_array_elements(form_fields) item)`,
  );
  const withoutPhone = { ...replacement.answers };
  delete withoutPhone.phone;
  const preserved = (
    await sql("select public.admin_update_ticket($1,$2,$3) as ticket", [
      actor,
      replacement.id,
      { status: "registered", answers: withoutPhone },
    ])
  ).rows[0].ticket;
  assert.equal(preserved.phone, replacement.phone);
  await sql(
    `update public.event_settings set form_fields=(select jsonb_agg(case when item->>'key'='phone' then jsonb_set(item,'{enabled}','true') else item end) from jsonb_array_elements(form_fields) item)`,
  );
  await sql("select public.admin_update_ticket($1,$2,$3)", [
    actor,
    replacement.id,
    { status: "cancelled", answers: replacement.answers },
  ]);
  await assert.rejects(
    register(300, randomUUID(), {
      ...answers(300),
      email: (
        won[1] as PromiseFulfilledResult<{
          id: string;
          request_id: string;
          answers: ReturnType<typeof answers>;
          qr_token: string;
          email: string;
        }>
      ).value.email,
    }),
    /duplicate key/,
  );
  await assert.rejects(
    register(300, randomUUID(), { ...answers(300), role: "Not a role" }),
    /INVALID_OPTION/,
  );
  await sql("update public.event_settings set registration_open=false");
  await assert.rejects(register(301), /REGISTRATION_CLOSED/);
  await sql("update public.event_settings set registration_open=true");
  await assert.rejects(
    sql("select public.register_ticket($1,$2,999)", [
      randomUUID(),
      answers(302),
    ]),
    /FORM_CHANGED/,
  );
  const cfg = (await sql("select * from public.event_settings")).rows[0];
  await assert.rejects(
    sql("select public.save_event_settings($1,$2)", [
      actor,
      { version: 1, fields: cfg.form_fields, maxSeats: 1 },
    ]),
    /CAPACITY_BELOW_REGISTRATIONS/,
  );
  for (const role of ["anon", "authenticated"]) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${role}`);
      await assert.rejects(
        client.query("select * from public.tickets"),
        /permission denied/,
      );
      await client.query("rollback");
      await client.query("begin");
      await client.query(`set local role ${role}`);
      await assert.rejects(
        client.query("select public.register_ticket($1,$2,1)", [
          randomUUID(),
          answers(400),
        ]),
        /permission denied/,
      );
      await client.query("rollback");
    } finally {
      client.release();
    }
  }
  const limits = await Promise.all(
    Array.from({ length: 20 }, () =>
      sql("select public.consume_rate_limit($1,5,60) as allowed", [
        `test-${actor}`,
      ]),
    ),
  );
  assert.equal(limits.filter((r) => r.rows[0].allowed).length, 5);
  await sql("update public.admin_sessions set revoked_at=now() where id=$1", [
    actor,
  ]);
  await assert.rejects(
    sql("select public.validate_ticket($1,$2)", [actor, first.qr_token]),
    /ADMIN_REQUIRED/,
  );
  const password = "local test password only";
  const hash = await hashAdminPassword(password);
  assert(await verifyAdminPassword(password, hash));
  assert(!(await verifyAdminPassword("wrong password", hash)));
  assert(!hash.includes("$"));
  const secret = "test-secret-".repeat(5);
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signed = signAdminSession(actor, expiry, secret, hash);
  assert(verifyAdminSession(signed, secret, hash));
  assert.equal(verifyAdminSession(signed + "x", secret, hash), null);
  assert.equal(verifyAdminSession(signed, secret, hash + "rotated"), null);
  assert.equal(
    verifyAdminSession(signAdminSession(actor, 1, secret, hash), secret, hash),
    null,
  );
  console.log(
    "Passed: 100 concurrent requests / 50 seats, idempotency, unique emails and tokens, single-use concurrent check-in, cancellation, form validation, closed form, version checks, RLS/grants, rate limits, revoked sessions, password hashes and signed cookies.",
  );
} finally {
  await sql("delete from public.admin_audit");
  await sql("delete from public.tickets");
  await sql("delete from public.admin_sessions where id=$1", [actor]);
  await sql(
    "update public.event_settings set registration_open=false,version=1,max_seats=50",
  );
  await pool.end();
}
