# Original artwork

These assets were cropped directly from the user's WhatsApp sheet, not regenerated or sourced from the unrelated rss-talk-illustrations ZIP.

Source: `WhatsApp Image 2026-10-18 at 8.53.16 PM.jpeg` (1448 × 1086) supplied by the user in Downloads.

Extraction: `scripts/extract-artwork.py` (requires Python, Pillow, NumPy and SciPy). It crops individual assets, removes the neutral JPEG background and excludes green annotations; source colors, design and proportions are preserved. Outputs use lossless WebP with transparency. Full annotated sheets are not served by the website.

- `logo/rss-talk-show.webp`: the sheet's correctly spelled RSS Talk Show logo.
- `illustrations/microphone.webp`: homepage illustration.
- `illustrations/conversation.webp`: About page illustration.
- `illustrations/question.webp`: Contact page illustration.
- `illustrations/ticket.webp`: Tickets and registration illustration.
- `icons/calendar.webp`, `icons/clock.webp`, `icons/location.webp`: event details.
- `illustrations/wave.webp`: extracted decorative asset, available for future use.

Paths are configured in `src/config/site.ts`. Retain intrinsic aspect ratios. Source resolution is limited by the supplied JPEG; replace only with higher-resolution originals of the same artwork if available.
