# RSS Talk Show agent handoff

## Current scope and architecture

The user authorized the functionality phase: Supabase migrations, unique QR tickets, registration, capacity controls, analytics, editable forms/content and a protected admin panel. Credentials are now in the ignored local `.env`. Never print or overwrite their values. Never apply migrations to an unrelated connected project. The project uses Next.js App Router, TypeScript, React, Tailwind CSS v4, and shadcn-style UI components built on Radix primitives. It is compatible with Vercel's standard Next.js deployment preset.

## Project map

- `src/app/layout.tsx`: shared frame, header, metadata, locally bundled Plus Jakarta Sans fonts.
- `src/app/page.tsx`: home hero and placeholder team cards.
- `src/app/tickets/page.tsx`: event information and registration CTA.
- `src/app/about/page.tsx`: introduction, organizer description and four-stage schedule.
- `src/app/contact/page.tsx`: question form and FAQ accordion.
- `src/app/globals.css`: official color variables, layout, responsive styles, hover/focus states and reduced-motion support.
- `src/components/layout/header.tsx`: active links and accessible mobile navigation.
- `src/components/ui/`: reusable shadcn-style Button, Card, Badge, Input, Textarea and Radix Accordion.
- `src/components/contact-form.tsx`: validation, preview feedback and real server-confirmed contact submission.
- `src/components/registration.tsx`: Register Now link to the registration form.
- `src/components/artwork.tsx`: original cropped artwork with intrinsic dimensions and responsive Next Image delivery.
- `src/config/site.ts`: navigation, navigation, preview defaults and original artwork paths; live content is in the database.
- `src/config/event.ts`: editable, unconfirmed date, venue, time and schedule.

## Design contract

Follow the user's four page reference compositions. Keep the exact branding “RSS Talk Show.” Preserve the navy, soft blue, muted teal, pale blue and white palette in CSS variables. Use restrained transitions, thin borders, gentle corners, white space and responsive grids. Never introduce unrelated sections, gradients, heavy shadows, generic replacement artwork or a new design direction. Respect `prefers-reduced-motion` and maintain keyboard focus visibility.

## Original artwork and current layout

The exact original artwork is now integrated. It was cropped directly from the user's second WhatsApp sheet in Downloads (`WhatsApp Image 2026-10-18 at 8.53.16 PM.jpeg`), with off-white backgrounds and green annotations removed. Do not replace these assets with the unrelated `rss-talk-illustrations.zip` artwork. See `public/assets/README.md` and `scripts/extract-artwork.py` for provenance and deterministic extraction. Lossless transparent WebP files live in `public/assets/` and paths are configured in `src/config/site.ts`.

The user explicitly requested a larger layout. The site now uses the full viewport width and a full-height shell, with a generous centered content area capped at 1680px for ultrawide screens. Do not restore the small 1240px inset preview panel. Preserve stable navigation widths, scrollbar gutters, intrinsic image dimensions, and the self-hosted font preloads to reduce layout shifting. Button hover effects move only the arrow, not the entire hit target.

## Registration and admin functionality

- `src/lib/site/model.ts`: shared Zod content, form and settings schemas and preview defaults. The database is the live source of content once configured. Names/email stay required; phone, role, grade and custom fields can be configured.
- `src/lib/site/server.ts`: request-deduplicated server settings reads, with closed registration on database failure. No credentials gives an explicitly labeled local preview.
- `src/lib/supabase/server.ts`: server-only secret-key client. No browser Supabase client or public keys.
- `supabase/migrations/`: tables, RLS/grants, transactional capacity, idempotent registration, unique active emails, QR check-in, audit logs, rate-limit counters and analytics. Migrations seed capacity 50 with registration paused.
- `/register` POSTs to `/api/register`, then navigates only after a successful database response. Required defaults: name, email, phone number, role and grade. Request IDs handle network retries. The form polls availability every 10 seconds; the database immediately enforces the seat limit under concurrency.
- `/thank-you` reads an HTTP-only receipt and shows the issued ticket. `/ticket/[token]` is a private capability link with a 256-bit random token. It exposes name/role/grade/QR, never email, phone or custom answers. `/api/tickets/[token]/qr` downloads the QR image. Email delivery is not implemented; never claim an email was sent.
- `/admin/login` uses a single password configured as a scrypt hash in `ADMIN_PASSWORD_HASH`. `ADMIN_SESSION_SECRET` signs eight-hour HTTP-only cookies. Sessions are checked against `admin_sessions` for expiry/revocation on each request. There are no Supabase Auth accounts or public admin signup. User explicitly chose this password model.
- `/admin`: analytics, search/edit/cancel attendees, camera/manual QR check-in, max seats/open-close controls, form builder, plain-text site content/FAQs/team/schedule and contact messages. The scanner library is imported only after camera activation.
- `src/app/api/admin/`: every handler authorizes on the server. Mutations additionally verify Origin, validate inputs and use authorized transactional RPCs. QR validation atomically admits each ticket once. Cancellation releases a seat; checked-in tickets still occupy capacity.
- `src/lib/http.ts`: request validation, bounded bodies, safe errors and shared Postgres rate counters. Login 5/15min/IP; register 10/10min; contact 5/10min; QR download 60/min; scanner 120/min/session. Failure to reach the counter denies the request.
- `src/middleware.ts`: per-document script nonce CSP and private-route cache headers. `next.config.ts` adds security headers. Keep style inline support because native motion and React use inline styles; scripts require nonces in production.
- `.env.example`: names only. Credentials remain server-only. `npm run admin:hash` consumes a password through stdin, returns a colon-separated scrypt hash safe for dotenv expansion. README has setup and rotation steps. Never commit passwords, service-role keys, generated hashes or session secrets.
- Shared password auditing identifies sessions rather than people. Preserve this limitation honestly.

## Database and security verification

Use a dedicated local Supabase database on 127.0.0.1:54322 for destructive tests. `npm run test:database` deletes local test registrations, tests 100 concurrent requests for 50 seats, idempotency, email uniqueness, cancellation, concurrent single-use scans, validation, version conflicts, grants/RLS, rate limits, password hashing and session tampering/expiry/revocation. Never point test scripts at a hosted database.

`npx supabase db lint --local --schema public,private --fail-on error` checks SQL. All tables have RLS enabled, no anonymous/authenticated data policies, and explicit grants only to service_role. RPCs use SECURITY INVOKER with fixed empty search_path; the private schema is not exposed. Do not add SECURITY DEFINER shortcuts or browser access to attendee data.

Keep the lock order event row then ticket row in registration/cancellation. Preserve optimistic settings version checks. Content must remain escaped plain text. No HTML injection, service secrets in client bundles or admission before a server-confirmed check-in result.

## Run and verify

Use Node.js 24.12+ and npm. `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm start`. Run `node scripts/check-browser.mjs` with the production server on port 3000. Development uses `.next-dev` while production uses `.next`, avoiding build artifact collisions. Check all routes at mobile, tablet and desktop widths; no horizontal overflow. Verify mobile navigation, active links, FAQ keyboard interaction, focus trapping and dismissal for dialogs, and form errors/preview feedback. Keep accessibility and reduced-motion behavior when adding logic.

## Vercel

Import this directory as the repository root; use the Next.js framework preset. Standard commands: install `npm ci`, build `npm run build`; leave the output directory at its framework default. The configured backend needs the five server-only environment variables in `.env.example` and the Supabase migrations. Preview mode runs without them. Do not switch to a static export without evaluating future server functionality. Deployment configuration is intentionally standard and requires no `vercel.json`.

Postman CLI is installed on this device and may be used for API engineering.

## Writing and motion preferences

The navigation order is Home, About, Tickets, Contact on both desktop and mobile. Keep the user-facing writing direct. No emojis or em dashes. Preserve the supplied artwork and avoid stock decorative patterns, exaggerated marketing copy, gradients and heavy shadows.

`src/components/motion/page-motion.tsx` adds one-time scroll entrances using IntersectionObserver and the native Web Animations API. It only observes sections below the initial viewport, uses opacity and a 12px translation, disconnects on navigation, and cancels when reduced motion is enabled or a section receives keyboard focus. Content remains visible without JavaScript. Mark a section with `data-reveal` when appropriate; never animate individual form fields or hide content until a scroll event. Initial hero/intro entrances live in CSS and honor reduced motion. Avoid animation dependencies, parallax, looping artwork, and animating layout properties.

## Directional page transitions

`src/components/motion/page-navigation.tsx` provides coordinated outgoing/incoming slides using the native View Transition API. Direction follows `navigation` in `src/config/site.ts`. Register and Thank You are inserted directly after Tickets. Advancing slides left; returning to an earlier page slides right. The shared header stays still. The animation lasts 460ms with an ease-in/ease-out curve, respects reduced motion, and falls back to normal routing when the API is unavailable. No animation dependency is added.

Use `src/components/motion/transition-link.tsx` instead of importing Next Link directly for site links. It retains Next prefetching, real anchor hrefs, modified clicks, and new-tab behavior through `onNavigate`. For programmatic navigation, use `usePageNavigation()` and await its returned promise. The form uses this for the thank-you route. Same-page navigation cancels any older pending slide. Browser history captures its outgoing frame before replaying the popstate event to Next's normal handler; it does not rewrite history entries or rely on private router contexts.

The provider waits for the target pathname's layout commit before animating. It skips superseded transitions and has a 1.6-second safety cutoff so a slow route cannot freeze the interface indefinitely. After the first animated navigation, `data-page-arrival` on main suppresses CSS opening entrances to avoid stacked animations. One-time scroll reveals remain enabled.

Run `RSS_PREVIEW_URL=http://localhost:3001 node scripts/check-transitions.mjs` against a production preview for forward/reverse slides, Back/Forward, registration, fast successive clicks, reduced motion and API fallback. `scripts/check-browser.mjs` retains the responsive and functional checks.

`src/components/motion/completion-mark.tsx` animates the thank-you check once after the page slide finishes. The provider dispatches `rss:page-transition-end` to coordinate this. With reduced motion, the complete static check is visible immediately. Keep the preview notice honest; this animation does not indicate that a real ticket was issued. Before taking an incoming page snapshot, the provider waits up to 140ms for visible illustrations to decode. Above-the-fold artwork loads eagerly to reduce image popping during transitions.

During the slide, `--page-old-offset-y` preserves the old page's visible scroll position relative to the new main element. This prevents the outgoing registration form or a scrolled page from jumping back to its hero before it slides out. New link/form navigations land at the top; history scroll restoration remains with the browser and Next.

Do not wrap an awaited `navigate()` call in React `useTransition` or another async transition. React can entangle that action with the router commit while the browser transition is waiting for that same commit, causing the safety timeout to skip the animation. Registration uses a plain local pending state and an async submit handler instead. Transition QA checks that the thank-you route actually reaches the native ready phase and that the completion mark is still waiting at that point.

Frontend-phase verification: production build, lint, TypeScript and responsive Chromium checks passed. Directional-transition tests passed in Chromium and Firefox, including real thank-you transition readiness and the delayed completion mark. WebKit verification is unavailable on this host because `libavif16` is missing; do not report Safari as tested.

## Setup handoff

The user supplied credentials in ignored `.env` and applied the existing-database upgrade. Recovery and contact role/grade columns were verified through schema-only reads. The configured project remains outside the currently connected Supabase account, so use only its intended credentials and never mutate unrelated connected projects. Read README.md for environment variables, password hashing, migrations, Vercel settings and registration activation. Use the existing Next.js deployment preset; builds do not push database migrations.

## Recovery and performance additions

- `/recover-ticket` and POST `/api/tickets/recover`: email + normalized phone lookup, one existing QR token, generic errors, shared IP/email counters, no new ticket/seat. Migration `20261019150053_ticket_recovery.sql` adds the service-only RPC and editable recovery copy. Knowledge-based matching is not OTP identity verification; do not describe it as verified ownership.
- PNG QR downloads and `ticket-save-actions.tsx` support native file sharing, user-chosen Photos/Files and ordinary download. No website can silently force a file into Photos or another app.
- `getSite()` caches only public presentation for 30 seconds, keyed by project URL and invalidated by settings saves. `getLiveSite()` bypasses persistent caching for critical pages/APIs. Never cache attendee records or capacity decisions. Register receives fresh server props and polls current availability. Production links prefetch; development disables prefetch and uses Turbopack.
- Same-page clicks skip redundant router refreshes when no other navigation is pending. Returning to the current page during an older slide still cancels that pending route.

## Requested role/grade behavior and local admin repair

Roles are Speaker, Teacher, Student and Parent on both forms. Only students see the native Grade 1–12 slider. Registration stores `Grade N`; contact messages store numeric grades. Non-student grades are omitted/cleared. Enforce this on the server as well as in the UI. The grade slider is accessible by keyboard and announced with `aria-valuetext`.

The user's ignored `.env` had a plain password in `ADMIN_PASSWORD_HASH` and an empty `ADMIN_SESSION_SECRET`. The chosen password was converted to a scrypt hash and a random session secret generated without displaying either. The password itself is unchanged. Login setup errors now name missing/invalid variables; the password input remains usable. Do not print or overwrite these credentials during QA.

The configured hosted project is not among the projects accessible through the current Supabase connection. Do not run destructive/local tests against it. `docs/UPGRADE_EXISTING_DATABASE.sql` is a concrete once-only upgrade for an existing database with the first two migrations; it adds recovery and the new form behavior. The user applied it in that project's SQL editor; schema-only checks confirmed recovery and contact role/grade fields are present. Future DDL still requires the intended project connection or an owner-run migration. Do not apply the bootstrap SQL to an existing initialized database.

Current functionality verification is recorded in `docs/VERIFICATION.md`. The owner-run hosted upgrade is present; admin hash/session configuration is repaired. Local database, API/browser and production build checks passed. Chrome/Firefox motion passed; do not claim Safari testing. Keep local destructive test scripts restricted to the dedicated localhost Supabase database.

Apple Wallet and Google Wallet support was removed at the user’s request. Keep QR PNG downloads, native file sharing and ticket recovery. No database rollback is needed.

`npm run test:http` checks bounded request streaming. Keep the 100 KB byte limit enforced before buffering the whole body, including absent Content-Length. Registration hides the grade field until Student is selected; keep the responsive regression checks.

## Automatic camera check-in

Camera QR reads immediately POST to the protected check-in endpoint. Keep manual entry as fallback. Scanner stops after each read; per-session capture and parent request locks prevent duplicate submissions. Never show green before server confirmation. Results use green for checked_in, amber for already_checked_in and red for cancelled/invalid/error, with icons and text. Counts refresh separately so an overview failure cannot hide confirmed admission. Keep camera cleanup on stop/unmount and constrained 640×480 capture with 250ms decode interval. `scripts/check-backend.mts` uses a canvas camera stream to exercise the real decoder and automatic POST. The admin content editor is dynamically loaded only when its tab opens.
