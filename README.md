# RSS Talk Show

Frontend-only Next.js App Router website, built with TypeScript, Tailwind CSS and shadcn-style components using Radix primitives. No backend, tracking, ticket issuance, or message delivery is included.

## Run locally

Requires Node.js 20.9 or later.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Routes: `/`, `/tickets`, `/about`, `/contact`, `/register`, `/thank-you`.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

Deploy to Vercel with the Next.js framework preset and default build settings.

## Browser verification

With the site running on port 3000, run `node scripts/check-browser.mjs`. It checks all six routes at 320 to 1920px, artwork loading, overflow, contact validation, FAQs, demo registration through to thank-you, keyboard navigation and reduced motion. Set `RSS_PREVIEW_URL` if using another local port. Install Playwright Chromium with `npx playwright install chromium` if needed.

See `AGENTS.md` for the AI/developer handoff and future integration points.

## Editable content

- `src/config/event.ts`: unconfirmed date, time, venue, schedule.
- `src/config/site.ts`: navigation, team placeholders, FAQ answers, original asset paths.
- `src/app/globals.css`: centralized brand colors and responsive layouts.

## Artwork

The original logo and illustrations are cropped from the user's exact WhatsApp sheet and saved as transparent, lossless WebP assets in `public/assets/`. See `public/assets/README.md` for provenance and `scripts/extract-artwork.py` for reproducible cropping. The unrelated ZIP artwork is not used.

## Layout and optimization

The site fills the viewport, with responsive content up to 1680px, fixed image aspect ratios, local preloaded fonts, stable scrollbar gutters, and reduced-motion support. Development output uses `.next-dev` so production builds do not overwrite a running dev server's assets.

## Preview interactions

The mobile menu and FAQ use accessible Radix primitives. Contact fields validate locally; valid submissions explain that no message was sent or stored. Register Now opens `/register`. The demo form validates locally and navigates to `/thank-you`, which explicitly states that no registration, seat reservation, ticket or email was created. No details are sent, persisted or placed in URLs. Event policies are intentionally unconfirmed.

## Motion

Opening content has short CSS entrances. Sections reached by scrolling animate once with IntersectionObserver and the native Web Animations API. No animation library is required. Reduced-motion settings disable both, and content remains visible without JavaScript. Navigation and form inputs stay stable.

Page navigation slides in the direction of the menu order. The header stays fixed in place during the transition. Browsers with reduced motion enabled or without the View Transition API use regular navigation. To verify, run `node scripts/check-transitions.mjs` against the running server (or set `RSS_PREVIEW_URL` for another port).

Implementation references: [Next.js 15 Link onNavigate](https://nextjs.org/docs/15/app/api-reference/components/link#onnavigate) and [the browser View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).

The thank-you checkmark draws once after the page transition settles. It is decorative confirmation of the preview flow, not a real ticket or submission result. Reduced motion shows a static check.

Transition QA also supports `RSS_BROWSER=firefox` or `RSS_BROWSER=webkit` when their Playwright engines and host dependencies are installed. Chromium and Firefox passed the directional, history, scroll-position, registration, completion, rapid-navigation and reduced-motion checks. WebKit could not launch on this host because `libavif16` is missing.
