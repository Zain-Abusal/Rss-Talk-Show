# Verification record

Verified locally on 19 October 2026 with Node 24.20.0. Hosted schema-only checks confirmed the owner's upgrade added contact role/grade columns and the recovery RPC. No test registrations or destructive tests were run against the hosted project.

- Production build, ESLint, TypeScript and whitespace checks passed.
- Production dependency audit: zero known vulnerabilities. The separate development ESLint toolchain retains an unpatched `braces` advisory described in README.
- Local Postgres migrations replayed cleanly. Supabase database lint found no schema errors.
- 100 concurrent requests reserved exactly 50 seats. Tests covered idempotent retries, email/token uniqueness, closed forms, form-version conflicts, cancellation, capacity bounds, preserved hidden answers, single-use concurrent admission, grants/RLS denial, shared rate counters and revoked sessions.
- Browser/API integration passed: protected admin and logout, Origin checks, login rate limiting, HTTP-only cookies, all admin tabs at 375/768/1440px, settings and form editing, actual local registration, PNG download, private-data exclusion, email/phone recovery of the same QR without another seat, student contact grade validation/storage, check-in, cancellation and capacity closure.
- Public Chromium checks covered seven routes at 320/375/768/1024/1440/1920px, artwork, overflow, FAQs, form validation, demo completion, keyboard mobile navigation, scroll motion, reduced motion and no-JavaScript content visibility.
- Student-only contact grade behavior passed keyboard checks, including Grade 12 and hiding grade for Teacher/Parent.
- Chromium and Firefox passed directional transitions, browser Back/Forward, rapid clicks, completion timing, reduced motion and API fallback. WebKit was not tested: the host lacks libavif16.
- The running local admin login page allowed typing and enabled Sign in after the environment repair. No private environment values were found in `.next/static` browser assets, and `.env` remains ignored with owner-only permissions.

## Local production timing sample

Read-only requests against the configured Supabase project through a local production server:

| Request | Total response time |
| --- | --- |
| First uncached Home | 1.260 seconds |
| Warm Home | 0.028 seconds |
| Warm About | 0.031 seconds |
| Live registration page | 0.260 seconds |

These are localhost HTTP response timings, not a deployed mobile loading score or a guarantee. Public presentation caching avoids a database round trip for each page; registration availability stays live. Development's first route compilation remains separate from production serving speed.

## Final review before commit

Wallet routes, controls and signing dependencies were removed. QR downloads and recovery remain. Request bodies now enforce the 100 KB limit while streaming, including requests without Content-Length; oversized streams are cancelled. `npm run test:http` covers declared length, streaming limits, UTF-8 byte counts and JSON parsing. Registration now renders the grade slider only for Student; responsive QA checks the initial and Teacher states.
