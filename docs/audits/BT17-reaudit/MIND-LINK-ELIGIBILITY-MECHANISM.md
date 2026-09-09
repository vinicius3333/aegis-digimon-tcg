# Mind Link eligibility (BT14-087)

## Verdict: not a defect. The reported reproducer used an effect key the engine
never issues.

## Reported symptom

`applyIntent(0, { type: "activateEffect", effectKey: "BT14-087/main" })` returns
`{ ok: false, reason: "illegal-target" }` with an eligible `[SoC]` Digimon
(BT17-062) and `[Dark Animal]` Digimon (BT14-071) on board and no Tamer under
either.

## What the engine actually does

BT14-087 Eiji Nagasumi reads "[Main] ＜Mind Link＞ with 1 of your Digimon with the
[Dark Animal] or [SoC] trait." Its IR compiles that to a `MindLink` action with
`filter: { controller: "mine", kind: ["Digimon"], trait: ["Dark Animal", "SoC"] }`.
`trait` is the alias for `nameOrTrait` with `match: "trait"`, and `nameOrTrait`
entries are a union (`packages/shared/src/effects/ir/filters/cardPredicates.ts`),
so the filter is the OR the card text asks for. Traits live in the catalog's
`types` array: BT17-062 has `["Beast","X Antibody","SoC"]`, BT14-071 has
`["Dark Animal","X Antibody","SoC"]`. Both match.

A scratch engine test placed BT14-087 in the battle area alongside each partner in
turn, read the offered effect with `observe(engine).activatableEffects(eiji)`, and
activated it:

```
PARTNER BT17-062 {"ok":true} linked= true
PARTNER BT14-071 {"ok":true} linked= true
```

Eiji is placed as the bottom digivolution card of the chosen Digimon in both cases.
`digimonEligibleForMindLink` (`apps/api/src/engine/effects/mindLink.ts`) and
`interpreter/actions/link.ts` behave correctly; neither needed a change.

## Why the reported call returned `illegal-target`

The engine's effect key for that ability is **`BT14-087/ir-27-0`**, not
`BT14-087/main`:

```
EFFECTS [{"instanceId":"inst-3","effectKey":"BT14-087/ir-27-0","description":"[Main] ＜Mind Link＞ Mind link"}]
```

`validateActivateEffect` (`apps/api/src/engine/actions/activateEffect.ts`, step 4)
rejects an effect key the source card does not contribute, and the rejection reason
for that step is `illegal-target`. Sending the invented key from the same board that
otherwise links successfully reproduces the report exactly:

```
BOGUS-KEY {"ok":false,"reason":"illegal-target"}
PARTNER BT17-062 {"ok":true} linked= true
```

Omitting `sourceInstanceId` entirely — the literal intent as written in the brief —
fails earlier still, at step 2, with `card-not-in-zone`.

`illegal-target` is therefore overloaded: it covers "you do not control the source",
"this card does not have that effect", and "the trigger/activation predicate fails".
Only the third meaning is a targeting statement. That naming is the real trap here,
and it is the one thing worth changing if the coordinator wants it — a distinct
`unknown-effect` reason for step 4 would have made this a one-line diagnosis. No
such change was made: `IntentResult` reasons are a client-visible contract and
splitting one is outside this lane's remit.

## Regression coverage

Already present and passing: `apps/api/src/cards/BT14/BT14-087.test.ts`
"naturally Mind Links Eiji under an eligible Dark Animal Digimon" performs the same
flow with BT14-074 and asserts the inherited ＜Alliance＞/＜Blocker＞ grant lands on
the host. The scratch reproducer was deleted after diagnosis; nothing under
`apps/api/src/engine/**` was edited for this seam.
