# Unregistered fixture cards read as engine seams (BT17-028, BT17-014)

Two BT17 reds queued for the engine lane were not engine defects. Both were fixture
cards whose modules the test file never imported, so the card sat on the board with no
IR at all and did nothing.

## How the registration works

A card's behaviour exists only once its module has run: `registerIrCard(cardId, compiled)`
at the bottom of `apps/api/src/cards/<SET>/<ID>.ts`. Nothing in the harness loads a module
on demand from `cards.json` — the catalog supplies names, colours, levels and DP, which is
why an unregistered card still looks right on the board and still satisfies colour, level
and name filters. Only its effects are missing. A test therefore has to import every card
it puts on the board whose effects matter; `./index.js` covers the file's own set only.

## BT17-028 — "whenEffectAddsToHand never fires"

Reported seam: the your-hand SubTrigger bus is shadowed by its opponent-hand twin because
both share one `oncePerTurnKey`.

Actual cause: `BT17-028.test.ts` imported `./index.js` and `../BT19/BT19-021.js`, but not
`../BT1/BT1-029.js` — the Gabumon whose [On Play] Draw is the effect that adds to your own
hand. With no module, playing it drew nothing, so no hand-add event was ever fired.

Diagnosis path: a probe at `GameEngine.fireSubTrigger` showed neither
`whenEffectAddsToHand` nor `whenEffectAddsToOpponentHand` firing; a probe at `fx.draw`
showed the draw never happening at all; a state dump after the play showed BT1-029 on the
board with the deck still at one card.

Red -> green:

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-028.test.ts --maxWorkers=1 --no-file-parallelism
Tests  11 passed | 1 expected fail (12)     # before, with it.fails
Tests  12 passed (12)                       # after adding the import and flipping to it
```

No engine change. The dedupe key in `SubTriggerRegistry.subscribe` already includes
`event`, so the two buses coexist as separate subscriptions; the shared `oncePerTurnKey`
does what BT17-028 prints — one security move per turn across both directions.

## BT17-014 — "Tamer-in-stack [Your Turn] +DP not conferred"

Reported seam: `GameEngine.runContinuousPass` does not confer a Tamer digivolution card's
`[Your Turn]` inherited +DP onto the host (Aldamon stayed 8000, expected 10000).

Actual cause: `BT17-014.test.ts` imported no card modules other than its own, so BT12-088
[Takuya Kanbara] — the Tamer whose inherited "[Your Turn] This Digimon gets +2000 DP" the
test asserts — was inert. A probe printing every continuous effect collected in
`runContinuousPass` showed only `BT17-014`'s own entry, never BT12-088's.

Red -> green:

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-014.test.ts --maxWorkers=1 --no-file-parallelism
Tests  7 passed | 1 expected fail (8)       # before
Tests  8 passed (8)                         # after `import "../BT12/BT12-088.js";`
```

No engine change. `listCandidateInstances` -> `collectPermanentInstances` already collects
stack instances, and `effectsOf(EffectTiming.None, source)` exposes a stack card's
continuous effects whatever its kind; nothing special-cases Tamers.

## Note for other lanes

A red whose symptom is "the other card did nothing" should be checked against the test
file's import list before it is written up as an engine seam. A card that is missing its
module fails silently and looks exactly like a conferral or event-bus gap.
