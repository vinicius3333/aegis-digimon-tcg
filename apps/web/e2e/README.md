# Local Chromium regressions

These tests run the real React GameScreen with production CSS and a real Colyseus
AegisRoom. A test-only Vite HTML entry supplies deterministic decks and exposes a
read-only snapshot of the browser's synchronized state. It is not a product route
and is not included in the production bundle.

## Run

Install the browser once:

```sh
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web exec playwright install chromium
```

From the repository root:

```sh
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web test:browser
```

To watch the browser or select one test:

```sh
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web test:browser --headed
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web test:browser dna.spec.ts
```

The command builds shared contracts and the API runtime before running tests, so
old dist output cannot silently stand in for current source. The API uses its dev
program with noCheck: this is runtime compilation, not a full API typecheck.

One worker uses loopback ports 4175 (Vite) and 2569 (Colyseus). Do not run two copies
at once. Each test starts a new server/room and browser context. The Node heap is
limited to 2048 MB; Chromium consumes additional memory. No CI is configured.

## Coverage and boundaries

- `security.spec.ts`: the actual security-chain board. The test server temporarily
  holds the bot's reactive decision callbacks, releasing the real bot policy once
  the browser has inspected each decision window. A frame probe catches a missing,
  transparent, or prematurely resolved reveal between the two decisions. This
  controls test pacing, not rules or outcomes; it does not benchmark bot timing.
- `dna.spec.ts`: normal seeded game, real mouse drag, exact material identities,
  printed source order, zero cost, hand consumption, and visible sources.
- `reconnect.spec.ts`: real page reload while Yuuki has an open decision; same room
  and decision resume, then UI actions pay exactly one card and resolve the effect.

These cover desktop Chromium. They do not claim full lobby/account coverage,
mobile-device validation, cross-browser parity, or screenshot baseline comparison.
Card artwork uses the application's normal external image URLs.

Failure screenshots, traces, and DOM context are in `apps/web/test-results/` and
are gitignored. Open a trace using its actual generated path:

```sh
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web exec playwright show-trace test-results/<failed-test>/trace.zip
```
