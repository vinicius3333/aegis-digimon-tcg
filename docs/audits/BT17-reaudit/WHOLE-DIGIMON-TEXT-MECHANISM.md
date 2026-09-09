# "This Digimon has [X] in its text" reads the top card only (BT17-036)

Status: **the engine is right; the retained red states the wrong expectation.** No code
changed. Recorded here so the question is not reopened.

## The claim under review

BT17-036 Boutmon's inherited clause: "[End of Attack] [Once Per Turn] If this Digimon has
[Pulsemon] in its text, by trashing the top card of your security stack, unsuspend this
Digimon."

Lane 42 filed a seam: `selfTopMatchesText` in
`apps/api/src/engine/effects/interpreter/matching/permanent.ts` reads only the permanent's
TOP card, so Boutmon sitting under a non-Pulsemon top card is gated off. The proposed fix
was to read the top card plus the digivolution cards, as "whole-Digimon text".

## Ruling

`data/kb/rules/comprehensive.md` §4-23-2 answers it directly, with this exact shape as its
worked example:

> 4-23-2. When an effect is gained, that doesn't mean that text is gained. (Example: A
> Digimon won't gain the \<Save\> text from a digivolution card whose inherited effect reads
> "[Your Turn] While this Digimon has \<Save\> in its text, it gets +2000 DP.")

A Digimon does not acquire its digivolution cards' text. §4-23-1 scopes "with XX in its text"
to the information printed on that one card. So the top card is the whole of the Digimon's
text for this predicate, and the current implementation is correct.

## What the whole-stack reading would have produced

It was implemented and run before the rule was found. BT17-034 Bulkmon carries the same
archetype clause and prints "[Digivolve][Pulsemon]: Cost 2" in its own text, so with the
stack included every Digimon holding BT17-034 anywhere satisfies "has [Pulsemon] in its
text" — the gate becomes unconditional. That immediately broke BT17-034's own comparative
proof:

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-036.test.ts src/cards/BT17/BT17-034.test.ts --maxWorkers=1 --no-file-parallelism
Tests  1 failed | 28 passed (29)
# BT17-034.test.ts:471 "grants the inherited +1000 DP only under a host whose text names
# Pulsemon" — Kyubimon received the bonus too.
```

The change was reverted and `selfTopMatchesText` now carries the §4-23-2 citation inline.

## Action left for the coordinator

`BT17-036.test.ts` keeps its `it.fails` "should still unsuspend when Pulsemon is only on an
underneath card (whole-Digimon text)". Its assertion is not weakened, and its comment now
records that the engine is right and the expectation is wrong. Inverting a card lane's claim
is the coordinator's call, not the engine lane's; either the test is rewritten around the
correct endpoint (the unsuspend does NOT happen) or it is dropped as an authoring error.

Current state:

```
pnpm --filter @aegis/api exec vitest run src/cards/BT17/BT17-036.test.ts src/cards/BT17/BT17-034.test.ts --maxWorkers=1 --no-file-parallelism
Tests  28 passed | 1 expected fail (29)
```

## Coordinator closeout (session 3)

The BT17-036 `it.fails` was rewritten by lane C3 as a plain negative asserting no unsuspend with Pulsemon only underneath (§4-23-2). No retained red remains.
