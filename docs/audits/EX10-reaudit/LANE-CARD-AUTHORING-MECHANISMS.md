# Session 2 — card-authoring lane (seams 36, 37, 39, 40, 41, 44, 50, 51)

One lane, one file, a section per seam. Every fix is in a card module (plus the persisted IR and,
where the assertion contradicted the printed text or a KB ruling, the card's own test). No engine
file was changed.

Command shape used throughout:

```
cd apps/api && ./node_modules/.bin/vitest run <file> --maxWorkers=1 --no-file-parallelism
```

---

## Seam 36 — `revealadd-scaling-field-mismatch` (BT11-056 Jijimon)

**Mechanism.** `RevealAddAction` scales its reveal count from `revealScaling`
(`runRevealAdd`, `apps/api/src/engine/effects/interpreter/actions/reveal.ts:152`). The module put
the scale under `scaling`, a field the reveal resolver never reads, so the printed "for each green
or black Tamer you have in play, reveal 1 card" always revealed exactly 1.

**Fix.** `apps/api/src/cards/BT11/BT11-056.ts`: rename `scaling` to `revealScaling` on the
`WhenAttacking` `RevealAdd` (the shape already matched `Scaling`; BT3-073 is the reference card).

**Red / green.**

```
red:   × Q2089: may play a lower-cost revealed subset instead of filling the budget
green: Tests  4 passed (4)   src/cards/BT11/BT11-056.test.ts
```

**Production behaviour.** Jijimon now reveals one card per green/black Tamer in play instead of one
card total, so the 10-cost play budget actually has cards to spend on.

**Other cards.** None — `scaling` on a `RevealAdd` occurred only here (checked across
`packages/shared/src/effects/effects.json`).

---

## Seam 37 — `bt11-069-trait-as-nameexact` (BT11-069 MetalGreymon (X Antibody))

**Mechanism.** Printed: "if [MetalGreymon] or [X Antibody] is in this Digimon's digivolution
cards". `[X Antibody]` is a TRAIT, and `[MetalGreymon]` is a name. The module encoded both tokens
under one `selfDigivolutionStackHasTrait` condition with `match: "nameExact"` — a condition that
compares `filter.nameOrTrait` against each stack card's Form ∪ Attribute ∪ Type only. A base of
Greymon (X Antibody) (BT11-064, types `["Dinosaur","X Antibody"]`) matched neither, so the deletion
never fired.

**Fix.** `apps/api/src/cards/BT11/BT11-069.ts`: use the corpus shape for this exact printed phrase
(BT19-036, BT19-042, BT19-073) — condition `selfHasInDigivolutionCards` with two `nameOrTrait`
refs, `{ tokens: ["MetalGreymon"], match: "name" }` and
`{ tokens: ["X Antibody"], match: "trait" }`.

**Red / green.**

```
red:   × gains both protections and deletes a 6000-DP-or-less Digimon with a matching source
green: Tests  5 passed (5)   src/cards/BT11/BT11-069.test.ts
```

**Production behaviour.** The [When Digivolving] deletion now fires off an X Antibody base, which is
the card's own evolution line.

---

## Seam 39 — `cost-fused-with-digivolve-target` (BT13-010 Biyomon, Q2269)

**Mechanism.** Printed: "[On Play] If played by an effect, by returning 1 of your [Kristy Damon]s to
the hand, this Digimon may digivolve into [Garudamon] in the hand …". KB Q2269 ("Can I use this
card's [On Play] effect to return my [Kristy Damon] to my hand even if I don't have a [Garudamon] in
my hand?" — "Yes, you can.") makes the return independent of the digivolve target.

The module carried the return as the `Digivolve` action's own `cost`, and the `Digivolve` was the
clause's leading `abortOnDecline` action. `canActivateEffect`
(`apps/api/src/engine/effects/interpreter/effect.ts`) treats a leading gated `abortOnDecline` action
as the whole clause's activation gate and calls `intrinsicPossible` → `canAttemptDigivolve`, which
is false with no Garudamon in hand. The clause was refused outright and the return never happened.

Seam 25's clause-level `CardEffect.cost` is the semantically right home for the payment, but it does
not by itself unblock this: `canActivateEffect` still refuses a clause whose only action is an
impossible `Digivolve` (`isGated` treats every `Digivolve` as gated, and `intrinsicPossible` is
false), so the clause cost is never reached. Verified empirically — with the cost moved to
`CardEffect.cost` and nothing else changed, Kristy still stayed on the field; adding any single
ungated action to the clause made the same clause cost pay.

**Fix (card level).** `apps/api/src/cards/BT13/BT13-010.ts`: the printed "If played by an effect"
becomes the clause `condition`, and the Kristy return becomes the clause's **leading `Return`
action** (`optional: true`, `abortOnDecline: true`) followed by the `optional` `Digivolve`. A
`Return` with no condition and no cost is ungated, so `canActivateEffect` offers the clause; the
ordered abort keeps "decline the return ⇒ no digivolve" (the same idiom 139 other clauses use).

**Red / green.**

```
red:   × may return Kristy Damon even without a Garudamon in hand (Q2269)
green: Tests  5 passed (5)   src/cards/BT13/BT13-010.test.ts
```

**Test changed.** `BT13-010.test.ts` "keeps Garudamon and Kristy Damon bracket references exact"
read the Kristy ref off `actions[0].cost.target`; it now reads it off the leading `Return` action.
The bracket-exactness assertions themselves are unchanged.

**Engine note (left as-is).** A clause-level `CardEffect.cost` on a clause whose only payload is a
`Digivolve`/`DnaDigivolve`/`PlaceUnder`/`MindLink` can still never be paid, because
`canActivateEffect`'s `intrinsicPossible` gate runs before it. Cards that want seam 25's exact shape
for a Q2269-style ruling need that gate to consult the clause cost — an engine change, not made
here.

---

## Seam 40 — `restriction-beBlocked-unimplemented` (BT14-020 Gomamon, Q2390)

**Mechanism.** Printed: "This Digimon can't be blocked for the turn." The module emitted
`{ kind: "Restrict", restriction: "beBlocked" }`. No interpreter consumer reads a `beBlocked`
restriction, so the grant was inert. The enforced mechanism is
`{ kind: "GrantStatic", grant: "unblockable" }`, which maps to the `cantBeBlocked` restriction
(`apps/api/src/engine/effects/interpreter/actions/grantStatic.ts:498`; reference card BT4-035).

**Fix.** `apps/api/src/cards/BT14/BT14-020.ts`: replace the `Restrict` with a self-targeted
`GrantStatic { grant: "unblockable", tokens: [], duration: "forTheTurn" }`. It stays a separate
action, so per Q2390 it applies even when the preceding `TrashDigivolution` found nothing to trash.

**Red / green.**

```
red:   × Q2390 grants unblockable even when no opposing source can be trashed
green: Tests  6 passed (6)   src/cards/BT14/BT14-020.test.ts
```

**Test changed.** The IR-shape assertion in `BT14-020.test.ts` pinned the inert
`{ kind: "Restrict", restriction: "beBlocked" }`; it now pins the `GrantStatic`.

**Other `beBlocked` users.** None. `restriction: "beBlocked"` appears exactly once in the card
corpus and once in `packages/shared/src/effects/effects.json`, both BT14-020 (verified with
`rg` over `apps/api/src` and a JSON scan of every record). Nothing else to migrate.

---

## Seam 41 — `attack-action-target-is-attacker` (BT17-040 Kazuchimon)

**Mechanism.** `AttackAction.target` is documented as _"Who attacks (\"this Digimon\", \"1 of your
Digimon\")"_ (`packages/shared/src/effects/ir/actions/combat.ts:10`), and `runCombatAction` resolves
it as the attacking subject. The module set it to the opponent filter, so the [End of Your Turn]
"Then, 1 of your Digimon may attack an opponent's Digimon" resolved to an opposing Digimon as the
attacker and did nothing useful.

**Fix.** `apps/api/src/cards/BT17/BT17-040.ts`: `target` becomes
`{ filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }` with `attackPlayer: false`,
matching BT11-104, whose printed text is the same sentence. Without `attackPlayer: false` the
declared attack did not resolve into the opposing Digimon.

**Red / green.**

```
red:   × applies both exact-three-security branches and then attacks
       × naturally resolves both exact-three branches and then attacks at end of turn
green: Tests  7 passed (7)   src/cards/BT17/BT17-040.test.ts
```

**Test changed.** The IR-shape assertion pinned the opponent filter on `Attack.target`; it now pins
the controller's own Digimon, with a comment naming the IR contract.

---

## Seam 44 — `whenattacking-sourcefilter-vs-triggerfilter` (BT17-064 Pipismon)

**Mechanism (two defects, both card-authoring).**

1. `whenAttacking` is in `SUBJECT_TRIGGER_FILTER_EVENTS`
   (`apps/api/src/engine/effects/interpreter/actions/subTrigger.ts:825`): the attacking subject is
   gated through `triggerFilter`. The module used `sourceFilter`, which for this event is never
   consumed.
2. The defender gate lived on the **SubTrigger action** as
   `condition: { kind: "attackTargetMatchesFilter", … }`. `runAction` evaluates an action's
   `condition` when the action runs — i.e. while the `[Your Turn]` clause is _installing_ the
   watcher — and at install time the trigger payload carries no `defenderPermanentId`
   (`ctx.trigger.targetPermanentId ?? ctx.trigger.defenderPermanentId` is `undefined`), so the
   condition was always false and the watcher was never armed. Confirmed by deleting the condition:
   the deletion then fired.

**Fix.** `apps/api/src/cards/BT17/BT17-064.ts`: `sourceFilter` → `triggerFilter`, and the
`attackTargetMatchesFilter` condition moves down onto the sub-effect's own `Delete` action, where it
is evaluated at fire time against the attack payload.

**Red / green.**

```
red:   × deletes a no-source combat target before battle
       × does not trigger if the target had a source when the attack was declared
green: Tests  5 passed (5)   src/cards/BT17/BT17-064.test.ts
```

**Tests changed.**

- The IR-shape assertion moved to the new placement (`triggerFilter`, condition on the `Delete`).
- "does not trigger if the target had a source …" waited for the Pipismon **permanent** to leave the
  battle area. That can never happen in its own fixture: Pipismon prints ＜Armor Purge＞ and sits on
  a BT16-016 source, so losing the battle trashes its top card and leaves the permanent standing.
  The wait now observes the top card changing (the battle finishing), and the seam's real claim —
  the defender with a digivolution card survives — is asserted twice (`battleArea` length and the
  defender's stack still holding its source).

---

## Seam 50 — `trait-token-exact-vs-contains` (EX4-058 Ravemon)

**Mechanism (two defects, both card-authoring).**

1. Printed: "a digivolution card with [Bird] or [Avian] **in one of its traits**". That is a trait
   SUBSTRING match (`match: "traitContains"`, `definition.ts:357`), not the exact
   `match: "trait"` the module used. The test fixture stacks EX4-056 Crowmon, whose only type is
   `Mysterious Bird` — exact matching rejected it.
2. The "By deleting this Digimon …" cost sat on the **SubTrigger action**. `runAction` explicitly
   excludes `action.kind === "SubTrigger"` from every cost-payment path
   (`runAction.ts` ~L563/L787/L798/L857), so the cost was never paid and Ravemon never deleted
   itself. It is also the wrong timing: the deletion is paid at [End of Attack], while the
   sub-trigger fires at the end of the opponent's turn.
3. The delayed `PlayWithoutCost` had no `from: ["trash"]`, so it never played the trashed Ravemon
   even with a live source (verified independently, with the cost removed entirely).

**Fix.** `apps/api/src/cards/EX4/EX4-058.ts`:

- `match: "trait"` → `match: "traitContains"` for both `[Bird]` and `[Avian]`;
- the `deleteOwn` cost moves from the SubTrigger action to the clause's `CardEffect.cost`
  (seam 25's shape), so it is paid once at [End of Attack] before the watcher is armed;
- the delayed `PlayWithoutCost` gains `from: ["trash"]`, mirroring EX4-071's identical
  "play 1 [Ravemon] from your trash" encoding.

**Red / green.**

```
red:   × deletes itself from an Avian stack and plays Ravemon at the opponent's turn end
       × does not play a longer Ravemon name from trash
green: Tests  10 passed (10)   src/cards/EX4/EX4-058.test.ts
```

**Test changed.** The IR-shape assertion pinned `match: "trait"` and the cost's old home on the
SubTrigger action; it now pins `traitContains`, `from: ["trash"]`, and the clause-level cost, with a
comment naming the printed wording and the CR §15-7-2 reading.

**Production behaviour.** Ravemon can now actually pay its [End of Attack] cost (it deletes itself)
and returns from the trash at the end of the opponent's turn — previously the whole ability was
inert.

---

## Seam 51 — `whenSecurityRemoved-default-seat` (EX5-014 Apollomon)

**Mechanism.** The `whenSecurityRemoved` seat gate reads `sourceFilter.controller` and defaults to
`"mine"` (`subTrigger.ts`, `securityRemovalGate`). The module omitted `sourceFilter` entirely, so
Apollomon watched its own controller's security stack; the printed text is "When a card is removed
from **your opponent's** security stack".

**Fix.** `apps/api/src/cards/EX5/EX5-014.ts`: add `sourceFilter: { controller: "opponent" }` to the
`whenSecurityRemoved` SubTrigger — the same shape EX12-046 uses for an opponent-stack watcher
(BT4-097 and EX12-019 show the `"mine"` and `"any"` directions).

**Red / green.**

```
red:   × deletes one opposing Digimon at the DP boundary only once per turn after security removal
green: Tests  4 passed (4)   src/cards/EX5/EX5-014.test.ts
```

**Production behaviour.** Apollomon's [Your Turn] [Once Per Turn] deletion now fires on the
opponent's security loss (its own security checks, which is what actually happens on your turn),
and no longer fires when your own security is removed.

---

## Lane gate

```
node tools/sync-effects-from-card-modules.mjs --set {BT11,BT13,BT14,BT17,EX4,EX5}
node tools/sync-effects-from-card-modules.mjs --set {BT11,BT13,BT14,BT17,EX4,EX5} --check
  -> BT11 112 / BT13 112 / BT14 102 / BT17 102 / EX4 74 / EX5 74 records already synchronized
pnpm --filter @aegis/shared build                                   -> exit 0

cd apps/api && ./node_modules/.bin/vitest run src/cards/BT11 src/cards/BT13 src/cards/BT14 \
  src/cards/BT17 src/cards/EX4 src/cards/EX5 --maxWorkers=1 --no-file-parallelism
  -> Test Files  1 failed | 589 passed (590);  Tests  1 failed | 3490 passed (3491)
     (the one failure is collateral — see below)

cd apps/api && ./node_modules/.bin/vitest run src/engine/conformance src/engine/effects \
  src/engine/combat --maxWorkers=1 --no-file-parallelism
  -> Test Files  108 passed (108);  Tests  1860 passed (1860)

cd apps/api && ./node_modules/.bin/vitest run src/cards/{BT11,BT13,BT14,BT17}/*-catalog-sync.test.ts \
  --maxWorkers=1 --no-file-parallelism
  -> Test Files  4 passed (4);  Tests  439 passed (439)
     (EX4 and EX5 have no catalog-sync test)

pnpm typecheck                                   -> exit 0
pnpm exec oxlint <13 changed files>              -> clean (exit 0, no diagnostics)
pnpm exec oxfmt <13 changed files> && --check    -> All matched files use the correct format.
```

### Collateral failure (not this lane)

`src/cards/BT17/BT17-073.test.ts` → "unsuspends after an opponent's Digimon is deleted in a natural
battle" fails with _permanent for "dexDorugoramon" … is no longer on the board_. Re-run alone,
it still fails. Attribution: BT17-073's module and its `effects.json` record are both unmodified
(the 47 records this working tree changes are listed by a `git show HEAD:…effects.json` diff and do
not include BT17-073), and the failure is in the natural-battle deletion/unsuspend path that other
lanes are editing.
