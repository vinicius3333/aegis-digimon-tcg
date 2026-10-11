# Local Chromium regressions

These tests run the real React GameScreen with the product stylesheets and a real Colyseus
AegisRoom. A test-only Vite HTML entry supplies deterministic decks and exposes a
read-only snapshot of the browser's synchronized state. It is not a product route
and is not included in the production bundle.

For reusable game regression boards, import a behavior-named API fixture and use
`ScenarioPage.openFixture`, which returns semantic alias references. API tests
share that preparation through `setupScenario`; browser actions and assertions
remain in the spec. No per-case arena registration is needed. See
[regression fixtures](../../../docs/TESTING.md) for the pattern and
`pnpm scenario open <behavior|fixture.ts>` for temporary manual reproductions.

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

By default Vite serves development styles. To verify production-only CSS
minification, build and preview the same real GameScreen harness instead:

```sh
AEGIS_E2E_PRODUCTION=true pnpm --filter @aegis/web test:browser feedback65-selection-window.spec.ts
```

This uses the normal Vite configuration, including Lightning CSS and its browser
targets, and serves only compiled assets from `/tmp/aegis-browser-production-4175`.
No development stylesheet tags remain to mask declarations dropped by the build.

One worker uses loopback ports 4175 (Vite), 2569 (a TCP edge that stands in for the production proxy) and 2570 (Colyseus). Do not run two copies
at once. Each test starts a new server/room and browser context. The Node heap is
limited to 2048 MB; Chromium consumes additional memory. No CI is configured.

The default browser is Chromium. Both the game and published-guide configurations
also accept `AEGIS_E2E_BROWSER=firefox`. Install Firefox before selecting it:

```sh
pnpm --filter @aegis/web exec playwright install firefox
AEGIS_E2E_BROWSER=firefox NODE_OPTIONS=--max-old-space-size=2048 \
  pnpm --filter @aegis/web exec playwright test discord-x7-digixros-zones.spec.ts
```

Use the direct command only when the shared and API builds already match the
checkout; it does not rebuild them. This is necessary while evolution games use
the pinned compiled engine. A Firefox pass proves Firefox behavior only.
On the Tailscale desktop, Chromium 153.0.8010.12 failed to produce animation
frames or click a button even on an empty page, in both headless and virtual-display
runs. Firefox 155 passed that probe and the real Shoutmon X7 DigiXros regression.
The Chromium environment remains unverified; product input guards were unchanged.

## Coverage and boundaries

### Published strategy guides

`strategy-guides.spec.ts` uses the production web build served through the deployment
gateway. It requires the three real published guides and their benchmark evidence;
it fails when the catalog is empty. This lane is separate from the game harness
and does not rebuild the API while evolution games are running.

Run on the Tailscale desktop with one browser instance, after publishing the
validated evolution run and building the web client:

```sh
AEGIS_GUIDES_BASE_URL=http://127.0.0.1:4176 AEGIS_E2E_BROWSER=firefox NODE_OPTIONS=--max-old-space-size=2048 \
  pnpm --filter @aegis/web exec playwright test -c playwright.guides.config.ts
```

Point the URL at a gateway serving that build and a running API. The lane checks all three guides
at 390px and 1440px in light and dark modes, keyboard access, horizontal overflow,
benchmark access, the Home entry, and the practice link into the real guest lobby.
It starts a bot match, keeps the opening hand, and reaches the player's main phase
through visible controls. Screenshots are saved with each test.

`acquisition-practice.spec.ts` independently exercises the same destination through
the real product App at `/play?utm_source=strategy-guides&utm_content=fundamentals`,
with a real Colyseus server and autonomous bot. It supplies no scenario, stored
deck, account, or mocked request. It runs at 390px and 1440px in light and dark
modes, checks horizontal overflow, and captures the player's main phase.
This verifies the guest practice flow before a
validated guide run is available; it does not prove that guides have been published.

- `security.spec.ts`: the actual security-chain board. The test server temporarily
  holds the bot's reactive decision callbacks, releasing the real bot policy once
  the browser has inspected each decision window. A frame probe catches a missing,
  transparent, or prematurely resolved reveal between the two decisions. This
  controls test pacing, not rules or outcomes; it does not benchmark bot timing.
- `dna.spec.ts`: normal seeded game, real mouse drag, exact material identities,
  printed source order, zero cost, hand consumption, and visible sources.
- `reconnect.spec.ts`: real page reload while Yuuki has an open decision; same room
  and decision resume, then UI actions pay exactly one card and resolve the effect.
- `effects-lab-pacing.spec.ts`: the effects lab's opponent chain under the stacked
  and sequential pacing styles, against the API's own entry point (it starts
  `apps/api/dist/index.js` on 2569 instead of the test server). It fails when the
  animation queue owes steps and starts or finishes none for 10 s, or when fewer
  than 5 bot clauses reach the screen. It catches presentation wait cycles that
  only close under real browser timing, which the jsdom pacing harness misses.

The default lane targets desktop Chromium; runs selecting Firefox establish
Firefox coverage instead. They do not claim full lobby/account coverage,
mobile-device validation, cross-browser parity, or screenshot baseline comparison.

`replay-video-export.spec.ts` requires `ffmpeg` on `PATH`. It decodes every packet
of the real tab recording independently of the browser to catch corrupt video
samples that a first-frame playback check can miss.

## Mobile cross-browser lane

`playwright.mobile.config.ts` runs every `mobile-*.spec.ts` under four emulated
phones: `mobile-chrome` and `mobile-brave` (Pixel 7, Chromium engines),
`mobile-firefox` (Gecko with a Firefox Android user agent) and `mobile-safari`
(iPhone 15, WebKit). Run one project per invocation so only one engine is in
memory:

```sh
pnpm --filter @aegis/web exec playwright install chromium firefox webkit
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web exec playwright test \
  -c playwright.mobile.config.ts --project=mobile-safari
```

Brave must be installed; set `AEGIS_BRAVE_PATH` when it is not at the default
macOS path. Set `AEGIS_E2E_WEB_PORT`, `AEGIS_E2E_EDGE_PORT` and
`AEGIS_E2E_SERVER_PORT` to run beside another copy of the suite.

`mobile-performance.spec.ts` records frame pacing (requestAnimationFrame deltas,
so it works in every engine), load timing, DOM size, Chromium heap and horizontal
overflow for the deck builder, the effect prompt gallery and a live match, and
fails on page errors. Each run prints `[perf]` JSON lines. Budgets catch freezes,
not small regressions: the host is a desktop running a dev build.

Limits: Gecko has no `isMobile` emulation, and Playwright WebKit on macOS draws
classic scrollbars where iOS overlays them. Long-press inspection needs Chromium's
CDP touch input, so those steps are skipped in Firefox and WebKit after the steps
before them have run. Emulation does not replace a real device.
Card artwork uses the application's normal external image URLs.

Failure screenshots, traces, and DOM context are in `apps/web/test-results/` and
are gitignored. Open a trace using its actual generated path:

```sh
NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/web exec playwright show-trace test-results/<failed-test>/trace.zip
```

## Deck-builder scenario: `deck-builder-hybrid-search`

Bug: Discord `1555813766040391700`. Run the real editor with the full catalog at
`http://127.0.0.1:4175/e2e/deck-builder.html` while the test Vite server is running.
The entry is test-only and needs no API, account or match. Automated reproduction:

```sh
pnpm --filter @aegis/web exec playwright test deck-builder.spec.ts
```

**English:** At a mobile viewport (390 × 844), open Filters, select Red and type
Variable in Trait / attribute: cards are available. Replace it with Hybrid:
cards must still be available (before the fix: Show 0 cards, as in the screenshot).
Keep all sets selected. Search BT7-011 in the separate card search to isolate
BurningGreymon; the footer must show 1 card. Try `  hYbRiD  `, apply the filters,
and add the card: a remove button appears. Repeat with English and Portuguese UI.

**Português:** Na viewport móvel (390 × 844), abra Filtros, selecione Red e digite
Variable em Traço / atributo: existem cartas disponíveis. Troque por Hybrid:
ainda devem existir cartas (antes da correção: Mostrar 0 cartas, como no anexo).
Mantenha todos os sets. Busque BT7-011 no campo separado de busca de cartas para
isolar BurningGreymon; o botão deve indicar 1 carta. Experimente `  hYbRiD  `,
aplique os filtros e adicione a carta: aparece o botão Remover. Repita nas duas
línguas. Os termos impressos das cartas permanecem em inglês nas duas interfaces.

The screenshot establishes the mobile trait field and zero-result symptom; Red
is selected in this scenario from the written report, since that chip is outside
the screenshot. Hybrid is a form and Variable an attribute, not an alias. The
scenario uses UI actions rather than game intents because the defect occurs
before a match. No dev arena layout or card behavior registration is involved.
