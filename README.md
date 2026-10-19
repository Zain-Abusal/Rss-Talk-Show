# RSS Talk Show

Next.js App Router, TypeScript, React, Tailwind CSS and Supabase Postgres. Original artwork, responsive public pages and directional page transitions are preserved. Registration issues a unique QR ticket; a password-protected admin panel manages capacity, attendees, check-in, form fields, site content, FAQs and contact messages.

## Setup

Use Node.js 24.12+ and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Without credentials the public site stays in explicit preview mode. No demo submission creates a ticket. With credentials but an unavailable database, live registration fails closed.

### Supabase

Use a dedicated Supabase project. Apply the SQL files in `supabase/migrations/` in timestamp order through the Supabase SQL editor, or link the Supabase CLI to your intended project and run `npx supabase db push`. Review the project before pushing. Do not expose the `private` schema through the Data API.

Set these server-only variables in `.env.local` and Vercel's project environment settings:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Your project's HTTPS API URL |
| `SUPABASE_SECRET_KEY` | Its server secret key, or legacy service-role key |
| `SITE_URL` | Exact canonical site origin, e.g. `https://your-site.vercel.app`, without a path |
| `ADMIN_PASSWORD_HASH` | Hash generated below, never the plain password |
| `ADMIN_SESSION_SECRET` | A random secret of at least 32 characters |

No public Supabase key is needed. The browser only talks to same-origin Next.js handlers. Never use a `NEXT_PUBLIC_` prefix for these secrets.

### Admin password

The panel at `/admin` uses one shared password. Generate its scrypt hash without putting the password in command history:

```sh
read -rs -p 'Admin password (12+ characters): ' RSS_ADMIN_INPUT
printf '\n'
printf '%s' "$RSS_ADMIN_INPUT" | npm run --silent admin:hash
unset RSS_ADMIN_INPUT
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copy the first output into `ADMIN_PASSWORD_HASH` and the final output into `ADMIN_SESSION_SECRET`. The colon-separated hash is safe for Next.js environment expansion. Keep both outputs private. Redeploy after changing environment variables. Rotating either secret invalidates all existing signed sessions. Signing out also revokes the current session in the database.

There are no admin accounts, public signups or password reset emails. Anyone with the shared password has full admin access; audit records identify sessions rather than individual people.

### Open registration

Migrations seed 50 seats with registration **paused**. Sign in, confirm the event details, review role and grade options in Form builder, then enable registration in Event settings. Public forms update availability every 10 seconds; the database always enforces the limit immediately. Cancelling a ticket frees a seat. Checked-in tickets still occupy a seat. Capacity cannot be reduced below the active count.

## Routes

Public: `/`, `/about`, `/tickets`, `/contact`, `/register`, `/thank-you`, `/ticket/[private-token]`.

Admin: `/admin/login`, `/admin`. The admin includes analytics, searchable registrations, editing/cancellation, camera and manual QR validation, capacity settings, custom fields, plain-text content editing and contact messages.

A successful registration provides an immediate private ticket page and downloadable QR image. **Email delivery is not implemented.** Keep the ticket link private: possession of its unguessable token allows access to the holder's name, role, grade and QR code. Email, phone and custom answers are restricted to admins. QR codes use random 256-bit tokens, contain no personal details, and admit a ticket once. Checked-in and cancelled tickets cannot be admitted again.

## Security

- All tables use RLS and deny `anon` and `authenticated` access. Public RPC execution is revoked; server handlers use the secret key.
- Registration and cancellation update capacity transactionally. Request IDs make retries idempotent, and a partial unique index enforces one active ticket per email.
- Scrypt password verification, signed HTTP-only SameSite cookies, eight-hour sessions, database revocation and fresh server authorization on admin routes and APIs.
- Mutations enforce the configured Origin and server validation. Shared Postgres counters rate-limit login (5 attempts / 15 minutes / IP), registration (10 / 10 minutes), contact (5 / 10 minutes), QR downloads (60 / minute), and admin scanning (120 / minute / session). Limits persist across Vercel instances and fail closed if the database is unavailable.
- A per-document script nonce, restrictive CSP, anti-framing, no-referrer, nosniff and permissions headers. Private pages and API responses are not cached or indexed. Camera access requires HTTPS except on localhost.
- Content is plain text. No HTML editor or `dangerouslySetInnerHTML`. Input sizes and custom field counts are bounded.

Use Vercel's trusted forwarded IP headers when deploying. If hosting behind another proxy, configure it to replace incoming client IP headers. The application limits basic abuse; deployment-level rate limits or CAPTCHA can be added for public launch traffic. Do not expose the service-role secret or disable RLS to fix a setup error.

## Vercel

Import this directory with the standard Next.js preset. Install: `npm ci`. Build: `npm run build`. Leave output at the framework default. Add the five variables above for the intended environment, set its matching `SITE_URL`, and redeploy. No static export or custom `vercel.json` is required. Hosted migrations are intentionally not applied automatically by builds.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

For a disposable local Supabase instance with Docker:

```sh
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --schema public,private --fail-on error
npm run test:database
```

Database tests deliberately delete test registrations and require localhost port 54322. Never point them at hosted data. They test 100 concurrent requests for 50 seats, idempotency, duplicate emails, cancellations, concurrent QR scans, validation, closed forms, version conflicts, access restrictions, rate limits and password/session integrity.

`RSS_PREVIEW_URL=http://localhost:3001 node scripts/check-browser.mjs` and `scripts/check-transitions.mjs` check the unconfigured preview experience. `scripts/check-backend.mts` checks the configured local API and browser flows; see its header for test environment requirements. Playwright browser engines must be installed. Chromium and Firefox are supported by the motion tests. WebKit cannot run on this host because `libavif16` is missing.

## Source and design

See `AGENTS.md` for the developer handoff. `src/lib/site/model.ts` owns content and form schemas; migrations seed the same defaults. Once configured, the database drives public content. `public/assets/README.md` and `scripts/extract-artwork.py` document the exact WhatsApp artwork. Preserve the supplied palette, navigation order, reduced-motion behavior and original assets.

The production dependency audit is clean. The development ESLint toolchain still inherits a `braces` advisory with no patched release available at implementation time. It processes repository patterns during local linting, not public requests; avoid applying a forced framework downgrade as an audit workaround.

For the complete local integration test, leave port 3001 free and run:

```sh
umask 077
npx supabase status -o json > /tmp/rss-local-status.json
npm run build
RSS_LOCAL_STATUS=/tmp/rss-local-status.json npm run test:backend
rm /tmp/rss-local-status.json
```

The test starts and stops a production server with an ephemeral admin password, exercises the browser and APIs against local Supabase, and clears its local test records afterward. The status file contains local secrets, so keep it out of source control.

## Ticket recovery and saving

`/recover-ticket` matches the registration email and full phone number, ignoring phone formatting. It returns the existing private ticket with the same QR token. It never reserves another seat. Cancelled tickets cannot be recovered. IP limits (5 attempts / 15 minutes) and email limits (10 / 15 minutes) use shared database counters; failure messages do not reveal which detail matched. This is knowledge-based lookup, not email/SMS identity verification. Keep phone collection enabled if attendees need recovery; records with no phone require help from the event team. An OTP service can strengthen identity checks later.

Ticket pages offer PNG download plus the native file share menu where supported. Saving directly into Photos cannot be forced by a website; attendees choose an available destination. Touch-and-hold on the displayed QR image is another option.

### Saving tickets

Attendees can download their QR image or use their device’s native share menu to save it to Photos or Files. Ticket recovery returns the original QR code. Apple Wallet and Google Wallet integrations have been removed; no wallet credentials are required.

## Performance

Development uses Turbopack. Use `npm run dev`; use a production build (`npm run build` then `npm start`) when judging real page-load speed. The first development visit still compiles a route. Public presentation data is cached for 30 seconds and invalidated by admin settings saves. Ticket and registration pages, availability polling, admission checks, recovery and every mutation use live database checks. Private ticket data is never cached across requests. Production links prefetch routes; development disables link prefetch so opening the site does not compile every linked page.

Detailed setup and free-option guidance: [docs/WALLET_SETUP.md](docs/WALLET_SETUP.md).

### Updating an already initialized database

If you already applied the original two migrations, apply [docs/UPGRADE_EXISTING_DATABASE.sql](docs/UPGRADE_EXISTING_DATABASE.sql) **once** in the RSS project's Supabase SQL editor. It preserves tickets/counts and adds recovery, contact roles and conditional student grades. Do not rerun the bootstrap migration on an existing database. For a fresh project, use all timestamped migrations instead.


Current roles on registration and contact are Speaker, Teacher, Student and Parent. Only students see the accessible Grade 1–12 slider. The backend validates student grades and clears grades for other roles. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for the completed checks and local production response timings.
