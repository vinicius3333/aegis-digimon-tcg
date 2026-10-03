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

One worker uses loopback ports 4175 (Vite), 2569 (a TCP edge that stands in for the production proxy) and 2570 (Colyseus). Do not run two copies
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
- `effects-lab-pacing.spec.ts`: the effects lab's opponent chain under the stacked
  and sequential pacing styles, against the API's own entry point (it starts
  `apps/api/dist/index.js` on 2569 instead of the test server). It fails when the
  animation queue owes steps and starts or finishes none for 10 s, or when fewer
  than 5 bot clauses reach the screen. It catches presentation wait cycles that
  only close under real browser timing, which the jsdom pacing harness misses.

These cover desktop Chromium. They do not claim full lobby/account coverage,
mobile-device validation, cross-browser parity, or screenshot baseline comparison.
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
