# Engine lane 1 — EX10 re-audit seams

One section per seam, in the brief's priority order. Every "fixed" seam has a red-then-green
test named below; every "design only" seam ends with the change it would take and why it was
not made in this lane.

Files changed (engine only, plus the two allowed `it.fails` flips):

- `apps/api/src/engine/effects/interpreter/registration/normalize.ts` (seam 16)
- `apps/api/src/engine/effects/interpreter/costs.ts` (seam 19)
- `apps/api/src/engine/GameEngine.ts` (seam 23)
- `apps/api/src/engine/cards/keywordToken.ts` (new), `apps/api/src/engine/cards/cardData.ts`,
  `apps/api/src/engine/effects/interpreter/matching/definition.ts` (seam 12)
- `apps/api/src/engine/testkit/advance.ts`, `apps/api/src/engine/testkit/harness.ts` (seam 7)
- Reds flipped: `apps/api/src/cards/EX10/EX10-033.test.ts`, `apps/api/src/cards/EX10/EX10-048.test.ts`

New engine tests:

- `apps/api/src/engine/effects/saveKeywordPlacement.test.ts` (seam 16)
- `apps/api/src/engine/cards/keywordToken.test.ts` (seam 12)
- `apps/api/src/engine/effects/immunityGrantInstall.test.ts` (seam 1)
- `apps/api/src/engine/testkit/linkAffordance.test.ts` (seam 7)

---

## Seam 16 `save-placeunder-position-default` — FIXED

**Mechanism.** ＜Save＞ compiles to an `[On Deletion]` effect carrying
`keywords: [{ keyword: "Save" }]` whose single action is a `PlaceUnder`. Most ＜Save＞ records
carry no `position`, and `runPlaceUnder`
(`interpreter/actions/placeUnder.ts`) reads `belowTop: action.position !== "bottom"` — so a
positionless record inserted the card directly beneath the Tamer's top card instead of at the
stack bottom (Comprehensive Rules 4-3). Stack order decides which inherited effects the stack
grants and what a later "bottom digivolution card" clause reads, so this was live production
behaviour, not cosmetics.

**Fix.** `normalizeCompiledCard` — the single registration funnel every card passes through
(`registerIrCard`) — now defaults a positionless `PlaceUnder` to `position: "bottom"` inside any
effect whose `keywords` include `Save`, recursing into nested action lists. An explicit
`position` on the record always wins, so the card modules that already set it (EX10-026, and the
EX10 lanes that copied it) are unaffected.

**Red → green.** `src/engine/effects/saveKeywordPlacement.test.ts`, two cases against BT10-020
Deckerdramon (a positionless ＜Save＞ record): the normalized record carries `position: "bottom"`,
and a battle deletion lands the card *below* the card already on the Tamer.

```
before: Tests 2 failed (2)   —  ['inst-6','inst-3'] instead of ['inst-3','inst-6']
after:  Tests 2 passed (2)
```

Out-of-set cards this now corrects: BT10-020/021/075, BT11-015/077, BT12-008/086, BT14-057/059,
EX4-016/018, and in-set EX10-015 (which still has no `position` field of its own).

---

## Seam 19 `any-digimon-digivolution-trash-cost-ignores-upTo` — FIXED

**Mechanism.** `payCost`'s "trash N card(s) from ANY of your Digimon's digivolution cards" branch
(`interpreter/costs.ts`) read `cost.target.count` as a hard requirement:
`const n = ...count; if (n <= 0 || candidates.length < n) return false;`, then demanded exactly
`n` moved cards. `upTo`/`minimum` were ignored, so EX10-033's printed "by trashing **up to 3**"
was an all-or-nothing 3: unpayable with 1-2 candidates and never offering a 1- or 2-card payment
with 4. The neighbouring `isSelfRef` (＜Digi-Burst＞) branch already implemented `upTo`.

**Fix.** The branch now separates the maximum from the minimum:
`requested` (printed count) → `n = min(requested, candidates.length)` when `upTo`, and
`minCount = upTo ? min(minimum ?? 0, n) : requested`. The payability guard, the `pickLoose`
count and the post-payment checks all read the right one; `paidCount` (which scales "for each
card trashed") is the chosen count.

**Red → green.** The retained red `EX10-033.test.ts`
`it.fails("Q5094/Q5099: reduction first still pays with the single eligible card for -2")`,
flipped to `it(...)`.

**Knock-on, needs a card lane.** `EX10-033.test.ts`
`"Q5096/Q5099: declining both optional clauses places nothing and trashes nothing"` now fails.
Its expectation encodes the old defect: only clause 2 (the placement) is optional; clause 3
("By trashing up to 3 …, reduce the play cost by 2 for each card trashed") is mandatory and, on
that fixture, has two eligible cards. Under the fix it pays and trashes them, which is exactly
what Q5099 asks for. Verified with a probe: the decision sequence is
`orderTriggers`, `optional` (clause 2, declined), `selectCards {min:1,max:2}` (clause 3's cost) —
there is no declined prompt whose cost leaked. The assertion list needs rewriting by the card
lane; this lane may only flip `it.fails`.

---

## Seam 23 `reduce-cost-deletion-triggers-not-batched` — FIXED

**Mechanism.** EX10-048's "when this card would be played, by deleting 1 of your Digimon …,
reduce the play cost by 4" is a self `wouldBePlayed` reducer, paid inside
`GameEngine.fireBeforePayCost`. The deletion runs `deletePermanent` → `resolveDeletionReactions`
→ an `OnDestroyedAnyone` window of its own, which opens and closes *before* the card is even
played. The deleted Digimon's `[On Deletion]` therefore resolved first, in its own window, and
never competed with the played card's `[On Play]` — no `orderTriggers` was ever raised (Q5131
says the two trigger simultaneously and the turn player picks).

**Fix.** Three small pieces in `GameEngine`:

1. `payingPlayCost` is set for the part of `fireBeforePayCost` that actually pays reducer costs
   (projection is excluded), in a `try/finally`.
2. `runTimingWindow` — not `fireTiming`, because a rule-check pass routes its pooled deletion
   window straight to the runner — parks an `OnDestroyedAnyone` window raised while that flag is
   set: it *collects* the triggered effects there and then (CR §15-4-4, trigger time) into
   `pendingPlayCostDeletionEffects`.
3. `firePlayEntryWindows` splices that list and passes it to `fireTimingForInstance` as
   `extraPending`, the existing `resolutionDeps.extraPending` channel `fireTimingForPermanent`
   already used. The play's window then holds both effects, and the resolver's `chooseOrder`
   raises the two-key `orderTriggers`.

The list is deliberately separate from `pendingNestedTimingEffects`: that pool is drained by any
outermost window, and an intervening one consumed the deletion trigger before the play window
opened (observed while building this fix).

**Red → green.** The retained red `EX10-048.test.ts`
`it.fails("Q5131: the cost deletion's [On Deletion] and this card's [On Play] are ordered by the
turn player")`, flipped to `it(...)`. Decision payload after the fix:

```
{"triggerKeys":["inst-1::EX10-048/ir-6-0","inst-5::EX10-047/ir-11-0"],
 "triggerCardIds":["EX10-048","EX10-047"],
 "triggerTimings":["OnPlay","OnDestroyedAnyone"],"timing":"OnPlay"}
```

**Production behaviour changed.** Any play whose cost deletes a Digimon now batches that
Digimon's `[On Deletion]` with the played card's `[On Play]` and asks the controller for an
order. That is the intended §15-4 behaviour, but it introduces an ordering prompt where none
was raised before.

---

## Seam 1 `immunity-grant-not-installed` — NO ENGINE DEFECT (report premise is wrong)

`grantStatic.ts`'s `immuneToOpponentDigimonEffects` branch **does** install
`fx.restrict(id, "beAffected", duration, { fromSourceKind: ["Digimon"] })`, and it works for all
three shapes the notes named. `src/engine/effects/immunityGrantInstall.test.ts` proves it:

- EX8-029 Aegisdramon's continuous `[All Turns]` grant (the exact board and memory of the
  EX10-003 red) → `observe().hasRestriction(perm, "beAffected", "Digimon") === true`.
- BT15-047 Kabuterimon's suspended self-grant → true.
- BT25-042 ClavisAngemon played from hand: security 2 → 1 (**the security-trash cost is paid**,
  contrary to seam 1's note) and the restriction is installed.

**Why EX10-003's red fails.** `apps/api/src/cards/EX10/EX10-003.test.ts` does not
`import "../index.js"`; it imports only `./EX10-003.js`. EX8-029's module is therefore never
registered in that file's module graph, so its continuous grant cannot exist. Run inside the
whole EX10 folder — where a sibling file imports the card index — the same `it.fails` *passes*
and the file reports "Expect test to fail". The `it.fails` was left in place (flipping it makes
the file fail when run alone). Card-lane fix: add the card-index import, then flip.

---

## Seam 9 `simultaneous-when-attacking / when-digivolving ordering` — DESIGN ONLY

**Mechanism, established by probe.** EX10-023 Quartzmon prints two `[When Digivolving]` effects
(suspend everything; delete 1 suspended opposing Digimon). Digivolving raises **no** decision at
all — not even a target prompt — and both resolve in registration order.

The resolver (`effects/stack.ts`) is not at fault in the way the note assumed. Its
`drainCurrentTimingWindow` groups by *activation tier*: effects that become activatable in the
same pass share a tier, and only the newest tier's effects are offered to `chooseOrder`. In this
window only the suspend clause is activatable on pass 1, because
`canActivateEffect` (`interpreter/effect.ts`) gates a board-targeted action on having a live
candidate ("Board-targeted actions gate activation", citing BT3-014). No opposing Digimon is
suspended yet, so the Delete is inactive, resolves alone on pass 2, and never enters a group of
two.

**What a fix requires.** A rules decision, then a corpus-wide change: does a triggered effect
whose only action currently has no legal target still *trigger* (and so take its place in the
ordering, fizzling if still targetless at resolution)? The engine currently says no, deliberately
and with card citations; §15-4-2 plus the ＜Alliance＞ precedent in `GameEngine` (`canActivate: () =>
true`, "it takes its place in the ordered set") says yes. Making board-target availability a
resolution-time check rather than an activation gate would change how every mandatory
board-targeted effect behaves on an empty board, including whether a prompt appears. That is out
of proportion to one lane and needs the coordinator's ruling first.

Not attempted: the second half of seam 9 ("drop a queued entry whose source is no longer the top
card"). `stack.ts` already implements it — `identityAtFirstCollect` / `permanentIdentityOf`
retires a pending effect whose source card is no longer the same thing on the same permanent
(§15-4-4-3). Any residual defect needs a fresh reproduction.

`EX10-009` and `EX10-023` reds were **not** flipped.

---

## Seam 15 `unaffectable-still-choosable` — DESIGN ONLY

The engine already has the seam: `resolvePermanentTargets` takes `includeUnaffectable`, and
`filterAffectable` (`targeting/permanents.ts:~500`) is the second half of it. The change CR
15-15-5-3 asks for is not "stop filtering" but "decide per effect shape whether the choice is
offered and then fizzles". Passing `includeUnaffectable` unconditionally would let every
mandatory opponent-targeting effect pick an immune permanent and do nothing, which contradicts
the existing conformance expectations around immunity. Proposal for the coordinator: add an IR
flag (`target.allowUnaffectableChoice`) set on "choose 1, then …" shapes, thread it into the
`includeUnaffectable` option, and leave plain "delete 1 of your opponent's Digimon" filtering as
it is. `EX10-021`'s red was **not** flipped.

---

## Seam 12 `save-keyword-substring-overmatch` (with seam 30) — FIXED

**Mechanism.** `texts: ["Save"]` was a plain lowercase substring test in two places:
`engine/cards/cardData.ts` (digivolution-requirement text gate) and `matchNameOrTrait`'s
`match: "text"` branch (`interpreter/matching/definition.ts`, which also unions the card's names
and traits). BT10-111 prints ＜Material Save＞ and BT21-059 is named Savemon; both matched, so
either was a legal base for a "＜Save＞ in its text" requirement.

**Fix.** New module `engine/cards/keywordToken.ts` holds the printed keyword spellings and two
predicates: `isPrintedKeywordToken` and `textPrintsKeyword`, which requires the token to sit
immediately after ＜ / < / 〈 and be followed by the closing bracket, a space or `(` — so
"＜Draw 1＞" and "＜Fragment (3)＞" still match their tokens while "＜Material Save＞" does not.
`textMatchesToken` applies it to keyword tokens and keeps plain substring semantics for names
and traits. `cardData.ts` uses `textMatchesToken`; the interpreter's text branch returns
`textPrintsKeyword` on the printed text alone for a keyword token, so a card merely *named*
[Savemon] no longer qualifies through the name union.

**Red → green.** `src/engine/cards/keywordToken.test.ts` (both cases fail with the keyword gate
disabled, pass with it):

```
before: Tests 2 failed (2)
after:  Tests 2 passed (2)
```

**Seam 30 (reminder text)** folds in for the practical cases: CR §4-22-5 excludes parenthetical
reminder notes, and reminder notes spell keywords in prose rather than between brackets, so the
anchoring already rejects them. A note that repeats the bracketed icon inside its parentheses
would still match; stripping parentheses outright was rejected because it would also strip a
keyword's own printed parameter.

EX10-015 (＜Save＞ DigiXros material, `materials: [{ texts: ["Save"] }]`) and EX10-018 were
re-run under both this and seam 16 and stay green; EX10-018's hand-written
`texts: ["＜Save＞", "<Save>"]` workaround still matches (a bracketed token is not a bare keyword
token, so it keeps substring semantics).

---

## Seam 7 `testkit-link-grant-affordance` — FIXED (2 of 3 parts)

1. **`advance(engine).verb.grantLinkMax(permanentId, delta, duration)`** now exists, routed
   through the production primitive `fx.grantLinkMax` (the verb every ＜Link +N＞ clause compiles
   to) with a recompute either side, like every other Advance Surface verb. Tests no longer need
   `(engine as ...).continuous.addLinkMaxGrant`.
2. **Seeded link DP.** `setupEngine` now runs `ModifierLedger.recomputeDP` for every laid
   permanent that has linked cards, so a Board Spec's seeded link contributes its printed
   `linkDp` (CR §4-2-4) exactly as a real `linkCard` intent would. This is deliberately the
   narrow DP refresh, not the continuous recompute the harness withholds on purpose (see the
   long comment there — recomputing continuous effects at setup regresses 27 tests).
3. **Not done: the over-cap seeded board.** `trashExcessLinkCards` raises an unanswered
   `selectCards` at the first rule sweep, so an over-cap Board Spec still cannot enter the turn
   loop. The fix belongs with the harness's answer defaults (an `autoTrashExcessLinks` option, or
   an Answer Queue entry) and is bundled with seam 28's scripted-optional responder; both are
   testkit-shaped and neither has a card blocked on it today.

**Red → green.** `src/engine/testkit/linkAffordance.test.ts`. Part 1's red is a compile error
(the verb did not exist); part 2's red is `currentDP === 10000` where the linked BT21-009 should
make it 12000.

---

## Seams 25 / 21 / 29 — DESIGN NOTES

**25 `whole-clause-cost-gate`.** `Action.cost` gates only its own action, and `CardEffect` has no
clause-level cost, so EX10-052's "by trashing 1 card in your hand, [opponent may delete]; if not
deleted, Recovery" performs the Recovery for free with an empty hand. Proposed shape: add
`CardEffect.cost?: Cost` (shared IR) plus, in `runEffect`, a preflight that `canPayCost`s it
before any action runs and pays it once, aborting the whole clause when unpayable — the same
place `effect.condition` is evaluated. The interpreter change is small; the IR field and the
re-authoring of the affected cards are not, and the clause-level cost also has to interact with
`abortOnDecline` (an opponent's declined optional inside the clause must not refund the cost).

**21 `pending-activation-lapses-when-source-leaves`.** CR §15-4-4-3/-5 retire a pending trigger
whose source left its area. `stack.ts` already implements exactly this for the *timing window* it
is resolving (the `departed` latch, the presence diff and `identityAtFirstCollect`). What has no
general gate is a trigger parked *between* windows — `deferredTimingWindows` and
`pendingPlayCostDeletionEffects` (added by seam 23) are re-collected or replayed without a fresh
residency check. Proposed shape: give the deferred queues the same one-way `departed` treatment
by re-running `gatherTriggeredEffects` at flush time instead of replaying the captured list, so a
source that left is simply not re-collected. Note that seam 23's list is a captured list by
design (the source is *always* gone — it was deleted to pay the cost), so it must opt out.

**29 `digixros-expander-table-vs-compiled-ir`.** `engine/actions/digiXros.ts` reads the static
`DIGIXROS_ZONE_EXPANDERS` table in `packages/shared/src/cards/zoneExpanders.ts` while the
effect-play route reads the compiled `DigiXrosMaterialZoneExpansion`. Two sources of truth for
one card fact, and a `playCard`-driven test grades the table rather than the module. Proposed
shape: derive the table at registration — `registerIrCard` already walks every compiled record
(`detectAllowDigiXrosMaterialsFromTrash` does exactly this kind of scan), so the expander entry
can be registered from the compiled action and the static table deleted, keeping the intent route
and the effect route on one fact. Low risk, but it changes a shared package and wants its own
lane.

---

## Triage of the remaining seams

| Seam | Verdict |
| --- | --- |
| 2 `attack-ended-still-enters-counter` | Not reached. Blocked on seam 3 for a red, as the notes say. |
| 3 `battle-area-counter-sources-empty` | Not reached. `counterEligibleSources` needs a battle-area scan; > 30 lines and 7 out-of-set cards to re-verify. |
| 4 `granted-trigger-beaffected-gate` | Endpoint already matches the ruling (notes). No red available; leave as investigation. |
| 5 `attack-target-switched-source-convention` | Coordinator decision, not an engine change. |
| 6 `inherited-modifydp-duration-inert` | Rubric ceiling; no card observes the difference. |
| 8 `conferral-immunity-conformance` | Not reached — a conformance test, not a defect. Cheap follow-up for a card-free lane. |
| 10 `breeding-phase-parks-with-stocked-egg-deck` | Not reached; needs a turn-loop/`waitForMainPhase` investigation. |
| 11 `text-blob-excludes-requirements` | Latent. Note that seam 12 touched the same union: `cardData.ts` already includes `linkRequirement`, `matchNameOrTrait` does not. Fixing 11 means adding the structural requirement text to that second union; no catalog card changes result today. |
| 13 `order-triggers-choice-evidence` | Evidence gap, no defect. |
| 14 `link-candidate-set-not-observable` | Testkit affordance; same family as seam 7 part 3. |
| 17 `return-with-cost-skips-cost-without-target` | Not reached. Same shape as seam 25 (pay the cost, do nothing) and wants the same ruling. |
| 18 / 27 `activatable-offered-without-host`, `place-under-prompt-without-legal-pair` | UI affordance warts; both are the *opposite* of seam 9's gate (offering with no legal outcome). Decide with seam 9. |
| 20 `security-shuffle-affordance` | Testkit affordance; add `advance().verb.shuffleSecurity` alongside seam 7's verb in the next testkit pass. |
| 22 `attack-stays-mid-resolution-after-collision-block-window` | Not reached; needs the EX10-045 reproduction. |
| 26 `digixros-numeric-count-ignores-costReduction` | Latent and correct today (`count === costReduction` in every numeric recipe). One-line fix when a `[DigiXros -1] 2 cards` recipe lands. |
| 28 `testkit-scripted-optional-responder` | Testkit; bundle with seam 7 part 3. |
| 31 `delayed-delete-played-source-fallback` | Latent; benign for the trashed ＜Delay＞ source. |
| 32 `settle-silent-timeout` | **Not done, and it bit this lane**: a `settle` whose predicate never holds returns quietly, which made a probe look like "no decisions were raised". Making it throw is a two-line change with a full-card-suite blast radius; it deserves its own run rather than riding along with four production fixes. |

---

## Gate

```
timeout 1800 pnpm --filter @aegis/api exec vitest run src/cards/EX10 src/engine/conformance \
  src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism
  -> Test Files 3 failed | 198 passed (201); Tests 4 failed | 3002 passed | 4 expected fail
  -> logs/engine-lane-1-gate-final.log (first run: logs/engine-lane-1-gate-run1.log, identical)
pnpm typecheck                          -> exit 0 (logs/engine-lane-1-typecheck.log)
oxlint <changed files>                  -> 1 error, pre-existing at HEAD:
                                           GameEngine.ts:4 unused import AsyncLocalStorage
oxfmt --check <changed files>           -> clean
git diff --check                        -> clean
```

### The four failures, attributed

A pristine `git archive HEAD` copy (`logs/engine-lane-1-pristine.log`, extracted under
`logs/pristine/`, node_modules symlinked from the worktree, then deleted) runs the same glob
**green**: 198 files / 2619 tests, 0 failures. The worktree's failures therefore come from the
uncommitted card-lane work plus this lane. Copying the worktree's current
`apps/api/src/cards/EX10/*.ts` onto the pristine engine separates them:

| Failure | Cause |
| --- | --- |
| `EX10-003` Q5009 "Expect test to fail" | **Pre-existing** (fails the same way on the pristine engine). Order-dependent `it.fails`: passes when a sibling file has registered the card index. See seam 1. |
| `EX10-003` "fires once per opponent's turn and resets on the next opponent's turn" | **Pre-existing** (fails identically on the pristine engine). Card-lane state, untouched by this lane. |
| `EX10-catalog-sync` (18 records) | **Pre-existing** (fails identically on the pristine engine): 18 EX10 modules were edited by the card lanes without re-running the effects sync. Not caused by seam 16 — verified by neutralizing `withSavePlacementDefaults` and re-running, the same 18 mismatch. |
| `EX10-033` "declining both optional clauses …" | **This lane** (seam 19). The assertion encodes the pre-fix all-or-nothing cost; see seam 19 above for the evidence and the card-lane follow-up. |
