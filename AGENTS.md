# RSS Talk Show agent handoff

## Current scope and architecture

This phase implements frontend presentation, responsive layouts, subtle motion and local preview interactions only. Do not introduce backend functionality unless explicitly asked in a subsequent task. The project uses Next.js App Router, TypeScript, React, Tailwind CSS v4, and shadcn-style UI components built on Radix primitives. It is compatible with Vercel's standard Next.js deployment preset.

## Project map

- `src/app/layout.tsx`: shared frame, header, metadata, locally bundled Plus Jakarta Sans fonts.
- `src/app/page.tsx`: home hero and placeholder team cards.
- `src/app/tickets/page.tsx`: event information and registration CTA.
- `src/app/about/page.tsx`: introduction, organizer description and four-stage schedule.
- `src/app/contact/page.tsx`: question form and FAQ accordion.
- `src/app/globals.css`: official color variables, layout, responsive styles, hover/focus states and reduced-motion support.
- `src/components/layout/header.tsx`: active links and accessible mobile navigation.
- `src/components/ui/`: reusable shadcn-style Button, Card, Badge, Input, Textarea and Radix Accordion.
- `src/components/contact-form.tsx`: local validation and explicit preview feedback.
- `src/components/registration.tsx`: Register Now link to the demo form.
- `src/components/artwork.tsx`: original cropped artwork with intrinsic dimensions and responsive Next Image delivery.
- `src/config/site.ts`: navigation, placeholder team members, unconfirmed FAQ answers and artwork paths.
- `src/config/event.ts`: editable, unconfirmed date, venue, time and schedule.

## Design contract

Follow the user's four page reference compositions. Keep the exact branding “RSS Talk Show.” Preserve the navy, soft blue, muted teal, pale blue and white palette in CSS variables. Use restrained transitions, thin borders, gentle corners, white space and responsive grids. Never introduce unrelated sections, gradients, heavy shadows, generic replacement artwork or a new design direction. Respect `prefers-reduced-motion` and maintain keyboard focus visibility.

## Original artwork and current layout

The exact original artwork is now integrated. It was cropped directly from the user's second WhatsApp sheet in Downloads (`WhatsApp Image 2026-10-18 at 8.53.16 PM.jpeg`), with off-white backgrounds and green annotations removed. Do not replace these assets with the unrelated `rss-talk-illustrations.zip` artwork. See `public/assets/README.md` and `scripts/extract-artwork.py` for provenance and deterministic extraction. Lossless transparent WebP files live in `public/assets/` and paths are configured in `src/config/site.ts`.

The user explicitly requested a larger layout. The site now uses the full viewport width and a full-height shell, with a generous centered content area capped at 1680px for ultrawide screens. Do not restore the small 1240px inset preview panel. Preserve stable navigation widths, scrollbar gutters, intrinsic image dimensions, and the self-hosted font preloads to reduce layout shifting. Button hover effects move only the arrow, not the entire hit target.

## Registration pages added in the frontend phase

- `/register`: accessible demo form with name, email, optional organization, and explicit demo acknowledgement. Local validation moves focus to the first invalid field. The CTA is “Preview registration.”
- `/thank-you`: requested thank-you design, explicitly labeled as a demo. No registration, seat, ticket or email has actually been created. It is excluded from indexing.
- `src/components/registration-form.tsx`: form behavior. Valid input navigates to `/thank-you`; personal details are not sent, persisted, or placed in URLs.
- `src/components/registration.tsx`: server-rendered Register Now link to `/register`.
- `src/components/sections/event-faq.tsx`: reusable FAQ on Tickets and Register, configured by `registrationFaqs` in `src/config/site.ts`.
- The Tickets nav item remains active on registration and thank-you routes.

## Future functionality integration points

Only implement these when the user authorizes the functionality phase:

1. Contact form: replace the local preview branch in `contact-form.tsx` with the chosen submission service. Preserve validation, labels, errors, pending states and honest delivery feedback. Validate again on the backend. Never claim successful delivery before a real service confirms it.
2. Registration: connect `registration-form.tsx` to the approved service after registration requirements are confirmed. After real server-confirmed success, navigate to `/thank-you` and replace its demo copy with accurate next steps. Keep event information driven by configuration. No tickets, availability calculations, authentication, QR verification, payments, database or email service currently exist.
3. Content: confirm event date, time, venue, schedule timings, team identities and attendance policies before replacing placeholders. Historical dates from design references are not confirmed upcoming events.
4. Secrets: future credentials belong in server-only environment variables, never public client bundles. Add an `.env.example` with names only if required by a later implementation.
5. Preserve server components for static page content and narrow client boundaries for interactive widgets.

## Run and verify

Use Node.js 20.9+ and npm. `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm start`. Run `node scripts/check-browser.mjs` with the production server on port 3000. Development uses `.next-dev` while production uses `.next`, avoiding build artifact collisions. Check all routes at mobile, tablet and desktop widths; no horizontal overflow. Verify mobile navigation, active links, FAQ keyboard interaction, focus trapping and dismissal for dialogs, and form errors/preview feedback. Keep accessibility and reduced-motion behavior when adding logic.

## Vercel

Import this directory as the repository root; use the Next.js framework preset. Standard commands: install `npm ci`, build `npm run build`; leave the output directory at its framework default. No environment variables, databases or integrations are required for this frontend. Do not switch to a static export without evaluating future server functionality. Deployment configuration is intentionally standard and requires no `vercel.json`.

Postman CLI is installed on this device and may be used for API engineering in a later authorized functionality phase.

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

Latest verification: production build, lint, TypeScript and responsive Chromium checks passed. Directional-transition tests passed in Chromium and Firefox, including real thank-you transition readiness and the delayed completion mark. WebKit verification is unavailable on this host because `libavif16` is missing; do not report Safari as tested.
