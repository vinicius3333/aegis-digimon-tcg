---
set: EX4
cards: 74
status: verified
verified_at: 2026-09-10
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX4 audit

## Status

All 74 EX4 cards (`EX4-001` through `EX4-074`) are verified at 10/10, for an aggregate of 740/740. The winning source is `docs/audits/EX4-REAUDIT-LEDGER.md` with the per-card reports under `docs/audits/EX4-reaudit/` (ledger and merged audit last committed in `bd827a86f`, 2026-09-10; the reaudit directory in `d3c1b6f57`, 2026-09-09). The older `docs/audits/EX4-AUDIT.md` scored the same 74 cards from catalog and IR inspection; the re-audit re-derived every clause from public play, evolution, attack, security, or turn-flow proof and treated the earlier claims and the green collection as context only. No engine seam was opened for EX4, and no catalog correction was established.

## Gates

Copied from the "Closeout" section of `docs/audits/EX4-reaudit/RUN.md` (commit `6b409871e`).

- All 74 card reports reached 8/8 worker evidence with public play, evolution, attack, security, or turn-flow proof for every scored behavioral clause. Direct timing seams were accepted as supplemental evidence only.
- Final registration and fixture sweeps found 74 `registerIrCard` modules, zero `registerCard` modules, zero expected-failure tests, and zero Digi-Egg deck or security fixtures.
- Catalog sync: `pnpm effects:sync:set -- --set EX4 --base afa3ab2f451245fb03bf4e3f895ead8807f18df1` synchronized 74 records with 15 EX4 semantic changes and zero semantic or byte changes outside EX4; the matching `effects:check:set` passed.
- Typecheck: `pnpm typecheck` passed for shared, API, and web.
- Closing serial collection and mechanism gate: 207 files and 2,773 tests passed across `src/cards/EX4`, `src/engine/conformance`, `src/engine/combat`, `src/engine/effects`, and `src/engine/cards`.
- Lint, format, diff: scoped Oxlint and Oxfmt passed for all 93 changed TypeScript files, and `git diff --check` passed.
- Restart baseline for reference: fresh EX4 collection passed 78 files and 553 tests with `--maxWorkers=1 --no-file-parallelism`, and a fresh root `pnpm typecheck` passed for shared, API, and web.
- The audit skill's prescribed `meteor npm run quave-check*` scripts do not exist in this repository, and the repository-wide format check retains pre-existing baseline findings, so scoped checks were used instead. This is recorded in `docs/audits/EX4-AUDIT.md`.
- Delivery: coordinator delivery gates were awarded only after all preceding checks passed, producing 740/740 and 74/74 cards at 10/10 on branch `audit-ex4-luna-20260909`, base `afa3ab2f451245fb03bf4e3f895ead8807f18df1`.

### Per-card gate logs (deleted)

Sixteen raw log files under `docs/audits/EX4-reaudit/logs/` recorded three cards' gate runs. They are removed; the results they held are:

| Card | Run | Result |
| --- | --- | --- |
| EX4-018 | focused Vitest | 1 file, 11 tests passed |
| EX4-023 | focused Vitest | 1 file, 11 tests passed |
| EX4-023 | Oxlint | no findings |
| EX4-023 | Oxfmt | 2 files correctly formatted |
| EX4-023 | API typecheck | failed at `src/cards/EX4/EX4-024.test.ts(350,88)` — `sourceCardId` does not exist on `ServerEvent`. Corrected before closeout; the closing root typecheck passed. |
| EX4-023 | rules queries | three `tools/kb` searches for Once Per Turn, same-level reveal, and security stack rulings |
| EX4-036 | focused Vitest | 1 file, 9 tests passed |
| EX4-036 | Oxlint | no findings |
| EX4-036 | Oxfmt | 2 files correctly formatted |
| EX4-036 | API typecheck | passed with no diagnostics |
| EX4-036 | `git diff --check` | clean |
| EX4-056 | Oxlint | no findings |
| EX4-056 | Oxfmt | 2 files correctly formatted |
| EX4-056 | API typecheck | passed with no diagnostics |

## Card ledger

Merged from the 74 per-card reports under `docs/audits/EX4-reaudit/`. Card names come from `packages/shared/src/cards/data/cards.json`.

### EX4-001 — Missimon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-001`, Missimon.
- Blue, level 2, `DigiEgg`, play cost `-1`, DP `0`.
- Traits: `Machine`, `BlueFlare`.
- No main effect or evolution requirement.
- Inherited text: `[On Deletion] If you have a Digimon in play, . (Draw 1 card from your deck.)`

Local KB command:

```text
node tools/kb/query.mjs card EX4-001 --json
```

Returned Q&A `Q3437` (2024-03-28): when Missimon is a digivolution card and its host is deleted, the host does not satisfy the condition because the [On Deletion] effect activates after Missimon moves to the trash. The host is therefore no longer in the battle area. This is the governing boundary for the host-only negative test below.

Applicable general rules were checked with:

```text
node tools/kb/query.mjs rules 'On Deletion'
node tools/kb/query.mjs rules 'digivolution card is deleted'
node tools/kb/query.mjs rules 'if you have a Digimon in play'
```

The comprehensive rules result confirms [On Deletion] triggers when the card with that effect is deleted and deletion processing trashes the card. No errata, restriction, or unresolved card-specific ambiguity was returned.

#### Implementation trace

Implementation: [`apps/api/src/cards/EX4/EX4-001.ts`](../../apps/api/src/cards/EX4/EX4-001.ts).

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Inherited `[On Deletion]` | `effects[0]`: `trigger: "OnDeletion"`, `isInherited: true` | Host deletion tests resolve the inherited trigger after the stack card leaves the battle area. |
| `If you have a Digimon in play` | `Draw` action with `condition.kind: "youHave"`; filter is `zone: "battleArea"`, `controllerDefault: "mine"`, `kind: ["Digimon"]` | Positive own-Digimon case draws; host-only and opponent-only cases do not. |
| `Draw 1 card` | `kind: "Draw"`, `controller: "mine"`, `amount: 1` | Positive case ends with one card in hand and one fewer card in deck. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers exclusively through `registerIrCard("EX4-001", compiled)`. No implementation change was required.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-001.test.ts`](../../apps/api/src/cards/EX4/EX4-001.test.ts).

- Catalog/IR identity assertion checks the exact Digi-Egg identity, traits, and inherited text.
- Positive public deletion flow uses a legal Blue level-3 host (`BT1-030`) carrying EX4-001 plus another own Digimon. Deleting the host resolves the inherited effect and draws exactly one.
- Public stack flow hatches EX4-001 from the Digi-Egg deck, then uses a public `digivolve` intent to evolve into compatible Blue level-3 `BT1-030` (`0` memory cost). It asserts the unchanged memory total, top-card instance, and EX4-001 source identity in the resulting stack; moving that stack from breeding into the battle area and deleting it then proves the inherited draw from the constructed stack.
- An incompatible red level-3 route (`BT1-010`) is rejected with `invalid-evolution`; the egg remains on top, the card remains in hand, and memory is unchanged.
- Q3437 boundary: deleting the host while no other own Digimon remains does not draw; the host is no longer in the battle area when the egg trigger condition is evaluated.
- Controller boundary: an opponent's Digimon alone does not satisfy `you have a Digimon in play`.
- All asynchronous effects are resolved with `settle()` before observable hand/deck assertions.
- No Digi-Egg is placed in the main deck or security; the public hatch case uses the dedicated `eggDeck`, and no injected timing helper is used as proof.

The stack fixture is realistic for a Blue Digi-Egg under a Blue level-3 Digimon and is assembled through production hatch, digivolve, and move-from-breeding intents. The evolution cost/top-card/source assertions cover the route mechanics; the post-deletion draw is the card's bonus draw. The incompatible red route supplies the illegal-evolution negative.

#### Verification commands and results

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-001.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: 1 test file, 7 tests. The public-flow fixture includes ordinary main-deck cards for both players so the turn loop cannot end through unrelated deck-out.

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-001.ts apps/api/src/cards/EX4/EX4-001.test.ts
```

Passed with no findings.

```text
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-001.ts apps/api/src/cards/EX4/EX4-001.test.ts
git diff --check
```

Both passed. Root typecheck and collection suites were intentionally not run in this card lane per the worker brief.

#### Defects, retained reds, and seams

- Defects fixed: strengthened only the colocated test evidence and corrected ordinary-deck fixtures needed to keep the multi-turn public flow alive; no runtime defect found.
- Retained reds: none.
- Engine seams: none. The existing `youHave` battle-area/controller filter expresses the clause exactly.
- Remaining gaps: none for the printed EX4-001 clauses. The public hatch/evolution stack now covers the applicable evolution and source-transition boundaries.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, Q3437, and applicable deletion rules are recorded. |
| IR trace | 2/2 | Every printed clause maps to full-coverage IR and exclusive registration. |
| Behavioral proof | 2/2 | Positive, host-only negative, controller negative, exact draw count, and settled zones are covered. |
| Peer/stack proof | 2/2 | Public hatch, legal zero-cost Blue evolution, memory/top/source assertions, move-from-breeding, inherited deletion draw, and incompatible red-route rejection are covered. |
| Delivery gates | 0/2 | Coordinator-owned by the worker brief. |
| **Total** | **8/10** | Worker report intentionally leaves delivery gates at zero. |

### EX4-002 — Kokomon

#### Catalog and rules

The committed catalog identifies EX4-002 as Kokomon, Green, Digi-Egg, level 2,
In-Training form, Lesser trait, play cost `-1`, and DP `0`. Its only printed
clause is:

> `[Your Turn] [Once Per Turn] When an effect suspends one of your Digimon, ＜Draw 1＞.`

The local card query returns Q3438: an attack performed through a
`[Start of Your Main Phase] Attack with this Digimon` effect does not activate
this inherited effect because the suspension is caused by the attack, not by an
effect. The rules query also returned comprehensive §§11-2-1/11-2-7 (attack
declaration suspends the attacker), §15-5-2 (one trigger per triggering timing),
and §15-14-1 (`[Once Per Turn]` is limited to one activation in a turn).

#### Clause → IR → observable proof

| Printed clause | Direct IR | Focused proof |
| --- | --- | --- |
| Your Turn | `effects[0].trigger: "YourTurn"` | All effect-suspension cases run with seat 0 as the owner turn. |
| Once Per Turn | `effects[0].frequency: "OncePerTurn"` | Multiple own Digimon in one turn draw once; a later own turn draws again. |
| Effect suspends one of your Digimon | `SubTrigger` event `whenEffectSuspends`, `sourceFilter: { controller: "mine", kind: ["Digimon"] }` | Own non-host suspension draws; opposing Digimon suspension does not. |
| Draw 1 | `Draw`, `controller: "mine"`, `amount: 1` | Hand/deck endpoints are asserted after `settle()`. |
| Inherited | `effects[0].isInherited: true` | EX4-002 is placed under a host in the focused stack fixtures. |

#### Defect fixed

The original IR omitted the subject filter. The interpreter therefore applied
its unfiltered `whenEffectSuspends` fallback, which is self-scoped to the
permanent carrying the inherited card. That made Kokomon draw only when its
own host was suspended, not when an effect suspended any of its controller's
Digimon. The IR now explicitly filters for the owner's Digimon.

The existing attack negative used `BT1-001` Yokomon in security, which is a
prohibited Digi-Egg fixture. It now uses inert main-deck Digimon `BT1-010`
while preserving the security-check path and no-draw assertion.

#### Behavioral proof

- IR shape asserts the exact `whenEffectSuspends` event, own-Digimon filter,
  Draw 1 action, inherited flag, and once-per-turn frequency.
- An effect-driven suspension of a different own Digimon (not the host) draws
  exactly one card.
- An effect-driven suspension of an opposing Digimon does not draw.
- A normal attack suspending the host does not draw; the security fixture is a
  non-Digi-Egg main-deck card.
- A public `hatchEgg` → Green Lv.2 `BT1-064` digivolution (cost 0) draws the
  digivolution card, preserves EX4-002 as the sole source, and moves the stack
  into the battle area.
- `BT12-107` installs Q3438's exact `[Start of Your Main Phase] Attack with
  this Digimon` grant on that raised stack; the forced attack suspends the
  host by attack declaration and does not draw.
- Two own Digimon suspended in the same turn produce one draw.
- A real `runOneTurn()` flow proves the same-turn refusal and re-arm on the
  next own turn, including active-phase unsuspension and draw-phase state.

The focused effect-suspension calls use `advance(engine).verb.suspend`, the
production effect-suspension primitive. The Q3438 case uses the real turn loop:
after BT12-107 is played in the opponent's main phase, ending that phase lets
the engine enter the opponent's next Active/Draw/Breeding/Main sequence and
fire the granted start-of-main attack through normal timing.

#### Peer and stack checks

EX4-003 uses the same inherited `YourTurn`/`OncePerTurn` watcher vocabulary
with an explicit own-Digimon filter for digivolution; EX4-036 uses the same
event with an opposing-Digimon filter; EX3-040 uses the same filter shape for
an effect-suspension reaction. EX4-002's host fixtures carry the Digi-Egg
under a level-3 Digimon and exercise the inherited effect through that stack.

The focused tests now drive the public hatch-and-digivolve route into the
battle-area stack and instantiate Q3438 exactly through BT12-107. The normal
attack negative and Q3438 forced attack both prove the rules-vs-effect
suspension boundary.

#### Commands and results

- `node tools/kb/query.mjs card EX4-002` — Kokomon; Q3438 returned.
- `node tools/kb/query.mjs rules 'suspending from an attack declaration is due to the rules'` — comprehensive §§11-2-1/11-2-7 and related attack sections returned.
- `if pgrep -fl 'vitest.*EX4'; then ...; else ...; fi` — `NO_ACTIVE_EX4_VITEST`.
- `memory_pressure -Q` — **39% free** before the first strengthened rerun; no other `vitest` process was active.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-002.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file passed, 8 tests passed, 4.45s**.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-002.ts apps/api/src/cards/EX4/EX4-002.test.ts` — exit 0, no findings.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-002.ts apps/api/src/cards/EX4/EX4-002.test.ts` — exit 0, all files correctly formatted.
- `git diff --check` — clean.

Per the worker brief, root typecheck, collection suites, and additional Vitest
processes were not run.

#### Retained reds, gaps, and seams

No retained failing or skipped test. During the strengthened rerun, the public
route initially exposed three fixture issues, all corrected within the allowed
test file: the first-player draw-skip flag hid the separate normal draw, the
Black BT12-107 Option lacked a legal Black source, and the opponent deck was
too short to reach its next start-of-main timing. The final Q3438 assertion
accounts for the one legitimate normal Draw-phase card and proves the forced
attack adds none. The Q3438 proof uses the real turn loop and public intents
throughout; no injected timing helper or shared-engine seam is used.

#### Worker score

| Component | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, printed clause, Q3438, and applicable attack/trigger/once-per-turn rules were checked. |
| IR trace | 2/2 | Every clause maps to exclusive `registerIrCard` IR; the missing own-Digimon filter was corrected. |
| Behavioral proof | 2/2 | Positive own non-host, opposing negative, attack negative, same-turn cap, and next-own-turn reset all pass. |
| Peer / stack proof | 2/2 | Public hatch, legal zero-cost digivolution, bonus draw, source/top identity, battle-area move, and exact BT12-107/Q3438 start-main attack proof are all exercised. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or commit was performed in this lane. |
| **Worker total** | **8/10** | |

### EX4-003 — Tsunomon

#### Catalog and rules

The committed catalog identifies EX4-003 as Tsunomon, Black, Digi-Egg, level 2,
In-Training form, Lesser trait, play cost `-1`, and DP `0`. Its only printed
clause is:

> `[Your Turn][Once Per Turn] When one of your other Digimon digivolves, ＜Draw 1＞.`

`node tools/kb/query.mjs card EX4-003` returned no card-specific Q&A. General
rules evidence used for the negative and stack cases is comprehensive §3-4-7:
effects and trigger conditions from the breeding area are suppressed unless
they explicitly reference that area; §4-18 covers public hatching; §8-1-2-8
defines the digivolution stack; §15-5-2 limits one trigger from one triggering
timing; §15-14-1 defines `[Once Per Turn]`; and §16-8 makes `Draw 1` draw the
specified number from the deck. No card-specific ambiguity remains.

#### Clause → IR → observable proof

| Printed clause | Direct IR | Focused proof |
| --- | --- | --- |
| Your Turn | `effects[0].trigger: "YourTurn"` | All live evolution cases run during seat 0's own main phase; the next-own-turn case re-arms through real turn progression. |
| Once Per Turn | `effects[0].frequency: "OncePerTurn"` | Two other Digimon evolve in one turn; only one inherited draw occurs. A later own turn draws again. |
| one of your other Digimon digivolves | `SubTrigger` event `whenOneOfYoursDigivolves` with `controllerDefault: "mine"`, `kind: ["Digimon"]`, and `excludeSelf: true` | A different own Digimon draws; the host's own evolution does not; the illegal route is rejected before any trigger. |
| Draw 1 | `Draw`, `controller: "mine"`, `amount: 1` | Named cards are asserted in hand after `settle()` and the deck advances through the ordinary evolution draw plus the inherited draw. |
| Inherited | `isInherited: true` | Public `hatchEgg` → legal Black Lv.3 evolution → `moveFromBreeding` preserves EX4-003 as the exact source card under the host. |

#### Defects fixed

No card-module defect was found. The prior focused fixture used Green BT1-064
as the Lv.3 evolution from the Black EX4-003 egg, so the public stack could not
legally resolve. It also treated ordinary digivolution bonus draws as if they
were Tsunomon's inherited draw. The test now uses Black BT10-058 for the legal
zero-cost egg route and labels the ordinary and inherited draw cards separately.
The previous breeding-area negative was replaced with a public battle-area
self-evolution negative, which directly proves the printed “other” boundary
without relying on a hidden timing helper.

#### Behavioral proof

- Catalog identity and the complete residual-free IR shape are asserted.
- A public `hatchEgg` resolves EX4-003, then a legal Black Lv.2 → Lv.3 route
  costs 0 memory, preserves the exact egg instance under BT10-058, and moves
  the same permanent into the battle area.
- The following public Lv.3 → Lv.4 evolution costs 2 memory and produces its
  ordinary evolution draw plus exactly one Tsunomon inherited draw; the top
  card and source stack identity remain asserted.
- An illegal Black-stack → Green BT1-064 route is rejected with the source and
  card still unchanged.
- Evolving only the host carrying EX4-003 produces the ordinary evolution draw
  but no inherited draw.
- Two different own Digimon evolving in one turn produce one inherited draw,
  while the normal evolution draw from each evolution is separately accounted
  for.
- A real `runOneTurn()` sequence proves the inherited draw re-arms on the next
  own turn, with no injected timing helper.

#### Peer and stack checks

EX4-002 and EX4-038 use the same inherited `YourTurn`/`OncePerTurn` watcher
vocabulary. EX4-038 is the closest behavioural peer: its own-other
digivolution filter and self-exclusion match Tsunomon's event boundary. The
EX4-003 test uses the same public hatch/evolve/move stack pattern as the
repository's BT19/BT24 stack exemplars, including memory cost, normal bonus
draw, top-card identity, exact source instance, and an illegal route.

#### Commands and results

- `node tools/kb/query.mjs card EX4-003` — no knowledge-base entries.
- `node tools/kb/query.mjs rules 'one of your other Digimon digivolves'` and
  `node tools/kb/query.mjs rules 'digivolution bonus draw'` — general rules
  results; comprehensive/manual sections were read directly as listed above.
- `if pgrep -fl 'vitest.*EX4-003|vitest.*EX4'; then ...; else ...; fi` —
  `NO_ACTIVE_VITEST` before each run.
- `memory_pressure -Q` — 40%, 49%, 43%, 44%, and 46% free before focused
  attempts (all above the required 25% minimum).
- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-003.test.ts --maxWorkers=1 --no-file-parallelism` — final result: **1 file passed, 7 tests passed, 3.08s**.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-003.ts apps/api/src/cards/EX4/EX4-003.test.ts` — exit 0, no findings.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-003.ts apps/api/src/cards/EX4/EX4-003.test.ts` — exit 0, all matched files correctly formatted.
- `git diff --check` — exit 0, clean.

Root typecheck, collection suites, and additional Vitest processes were not
run, per the worker brief.

#### Remaining gaps

No retained failing or skipped focused test. The card implementation remains
compiled IR-only with `registerIrCard("EX4-003", compiled)` and no second
registration. No Digi-Egg was placed in a deck or security fixture.

#### Worker score

| Component | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | All catalog fields and the only printed clause were checked; no card-specific Q&A exists, and applicable breeding, stack, trigger, once-per-turn, and draw rules were read. |
| IR trace | 2/2 | Every clause maps to residual-free inherited IR using the exclusive registration path. |
| Behavioral proof | 2/2 | Positive own-other draw, self negative, exact once-per-turn boundary/reset, costs, destinations, and named draw endpoints pass. |
| Peer / stack proof | 2/2 | Public hatch, legal Black stack, memory cost, normal bonus draw, source/top identity, movement, peer comparison, and invalid route all pass. |
| Delivery gates | 0/2 | Coordinator-owned; this lane performs no git write or commit. |
| **Worker total** | **8/10** | |

### EX4-004 — Pinamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only static re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-004`, Pinamon.
- Purple, level 2, `DigiEgg`, play cost `-1`, DP `0`.
- Form: `In-Training`; trait: `Bird`.
- No main effect or evolution requirement.
- Inherited text: `[On Deletion] If deleted outside of a battle, gain 1 memory.`

Local KB command:

```text
node tools/kb/query.mjs card EX4-004
```

Returned Q&A `Q3439` (2024-03-28): when a Digimon carrying Pinamon is deleted
by an opponent's `<Retaliation>`, Pinamon's `[On Deletion]` effect activates;
deletion by `<Retaliation>` is not deletion by battle.

Applicable local rules read directly: comprehensive §15-16-4 (`[On Deletion]`),
§16-13-1/2 (`<Retaliation>`), and the combat controller's Retaliation path,
which schedules the battled opponent's deletion as a later effect-caused
deletion. No card-specific ambiguity or erratum remains.

#### Clause → IR → behavioral proof mapping

| Printed clause | Direct IR | Colocated proof (added; execution deferred) |
| --- | --- | --- |
| Inherited effect | `effects[0].isInherited: true` | Public hatch/evolution places EX4-004 under ST6-02 and asserts the source stack. |
| `[On Deletion]` | `effects[0].trigger: "OnDeletion"` | Effect-deletion and Retaliation attack cases settle before memory/zone checks. |
| `If deleted outside of a battle` | `not(triggerRemovalCause(byBattle))`, raw condition preserved | Equal-DP battle deletion asserts no memory; effect and Q3439 Retaliation deletion assert memory. |
| `gain 1 memory` | `GainMemory`, `amount: 1` | Memory is set to zero before boundary cases and checked at one after effect-caused deletion. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
exclusively through `registerIrCard("EX4-004", compiled)`. No production IR
change was required.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-004.test.ts`](../../apps/api/src/cards/EX4/EX4-004.test.ts).

- Catalog identity and exact inherited IR shape are asserted.
- A public `hatchEgg` route uses the dedicated `eggDeck` only; no Digi-Egg is
  placed in a main deck or security fixture.
- Hatched Pinamon legally digivolves to purple level-3 ST6-02 for cost 1. The
  test asserts memory 2 → 1, the ordinary evolution draw, the remaining deck
  card, top-card identity, and the exact Pinamon source instance under host.
- The moved battle-area stack is deleted by an effect and asserts one memory,
  the host's final zone, and the unchanged remaining deck. This proves Pinamon
  contributes no draw of its own.
- A public hatch followed by a direct level-5 ST6-09 route is rejected; memory,
  the Pinamon top card, and the illegal evolution card's hand zone stay intact.
- A public equal-DP ST6-09 battle deletes the host carrying Pinamon in battle;
  no memory is gained and both stacks reach trash.
- Q3439 is exercised through a public attack: a legal ST6-09 stack carrying
  Pinamon (with ST6-02 and ST6-08 as its intermediate sources) defeats a
  suspended BT10-078 carrying BT21-010, then `<Retaliation>` deletes the
  attacking stack by effect. One memory and both final battle-area zones are
  asserted.
- All asynchronous assertions use `settle()` or public turn/attack intents.
  No injected timing helper, numeric security fixture, or prohibited Digi-Egg
  deck/security card is used.

Relevant peers inspected: EX4-003 and EX4-053 for inherited outside-battle
deletion conditions; BT2-074 and BT10-078 for public Retaliation behavior and
stack-sensitive Retaliation activation; EX4-001 for the public Digi-Egg hatch,
evolution-cost, source-identity, and illegal-route pattern.

#### Verification commands and results

Static source/KB inspection performed:

```text
node tools/kb/query.mjs card EX4-004
```

Returned `Q3439` as recorded above.

```text
node tools/kb/query.mjs rules 'Retaliation'
```

Returned comprehensive §16-13 and related glossary/manual chunks; §16-13-1/2
were read directly. Catalog, direct module, colocated tests, peer modules/tests,
and relevant interpreter/combat condition paths were also read.

Coordinator-approved focused verification was run only after confirming no
other Vitest process and at least 25% free memory. Guard readings were 65%,
61%, and 53% free before the permitted runs.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-004.test.ts --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint apps/api/src/cards/EX4/EX4-004.ts apps/api/src/cards/EX4/EX4-004.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-004.ts apps/api/src/cards/EX4/EX4-004.test.ts
git diff --check
```

Final result: **1 file passed, 6 tests passed** in 4.85s.

`oxlint` passed with no findings. `oxfmt --check` passed after formatting the
colocated test. `git diff --check` passed. Root/API typecheck and collection
suites remain intentionally deferred; no additional Vitest process was run.

#### Defects, retained reds, and seams

- Defects fixed: no production IR defect. The first coordinator run exposed
  that ST6-08 is level 4 and therefore not a legal direct evolution from the
  level-2 egg; the public route now uses Purple level-3 ST6-02 for cost 1.
  Realistic ST6-09 stacks now include ST6-02 between Pinamon and ST6-08, and
  the illegal-route test asserts the exact `{ ok: false, reason:
  "invalid-evolution" }` result. A late deck assertion was removed because the
  real turn loop legitimately drew that remaining card during a later draw
  phase; the pre-move checkpoint still proves the ordinary evolution draw.
- Retained reds: none in the focused suite.
- Engine seams: none identified statically. Existing removal-cause matching
  distinguishes battle deletion from effect deletion, including Retaliation's
  follow-up deletion.
- Remaining gap: runtime focused proof and all quality gates remain pending
  coordinator execution.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, Q3439, and applicable deletion/Retaliation rules were checked. |
| IR trace | 2/2 | The sole printed clause maps to residual-free inherited IR with exclusive registration. |
| Behavioral proof | 2/2 | Focused public positive/negative cases passed, including exact memory and final-zone assertions. |
| Peer / stack proof | 2/2 | Focused proof passed for public hatch, legal cost-1 route, ordinary draw, top/source identity, invalid route, battle boundary, and Retaliation stack behavior. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or verification process was performed in this lane. |
| **Total** | **8/10** | Delivery gates remain coordinator-owned at zero. |

### EX4-005 — Agumon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-005`, Agumon.
- Red/yellow, Digimon, level 3, play cost 3, DP 2000.
- Evolution costs: red level 2 for 1 or yellow level 2 for 1.
- Form: Rookie; attribute: Vaccine; trait: Dinosaur.
- Main text: `[Digivolve][Koromon]: Cost 0[Start of Your Main Phase] If you have a red or yellow Tamer in play, gain 1 memory.`
- Inherited text: `[Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended, . (Draw 1 card from your deck.)`

Local card query:

```text
node tools/kb/query.mjs card EX4-005
```

Result: no card-specific knowledge-base entries, Q&A, errata, restrictions, or
unresolved ambiguity.

The applicable comprehensive-rule material was checked directly:

- §2-3-5-3: text following `[Digivolve]` is part of the digivolution
  requirement; this supports the named `Koromon`, cost-0 alternate route.
- §15-16-13-1: `[Start of Your Main Phase]` triggers when the owner's main
  phase arrives.
- §3-4-7-6/7: cards in the breeding area do not satisfy ordinary field
  trigger/activation conditions; the IR's Tamer condition is explicitly
  restricted to `battleArea`.
- §4-14-1/2: drawing means moving cards from the controller's own deck to hand;
  the inherited action is `Draw 1` for `mine`.
- §15-14-1: `[Once Per Turn]` permits one activation per turn and resets on the
  next turn.

#### Clause-to-IR-to-proof mapping

| Printed clause | Direct IR | Colocated behavioral proof |
| --- | --- | --- |
| `[Digivolve][Koromon]: Cost 0` | `digivolutionRequirement: [{ names: ["Koromon"], cost: 0, isAlternate: true }]` | Public `hatchEgg` of ST1-01 followed by `digivolve` with `useAlternateCost: true`; memory remains unchanged and the source instance remains under EX4-005. |
| Alternate route must be Koromon | Same exact-name requirement | ST2-01 Tsunomon route returns `{ ok: false, reason: "invalid-evolution" }`, leaving memory, breeding top card, and Agumon hand zone unchanged. |
| `[Start of Your Main Phase]` | `effects[0].trigger: "StartOfYourMainPhase"` | Real turn-loop main-phase cases resolve after `openMain`. |
| `If you have a red or yellow Tamer in play` | `GainMemory` condition `youHave`, `zone: "battleArea"`, `controllerDefault: "mine"`, `kind: ["Tamer"]`, `colors: ["Red", "Yellow"]` | Own red BT10-087 and own yellow BT10-089 each gain 1 memory; an opponent-controlled red Tamer does not. |
| Inherited `[Your Turn]` | `effects[1].trigger: "YourTurn"`, `isInherited: true` | EX4-005 is placed under a legal ST1-01 → Agumon stack and then a host. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` | First matching suspension draws; a second matching suspension in the same turn does not; the next own turn draws again. |
| `When one of your red or yellow Tamers becomes suspended` | `SubTrigger` event `whenSuspended`, `sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] }` | Own red Tamer draws; own yellow Tamer is the same-turn cap; blue and opponent red Tamers do not draw. |
| `Draw 1 card from your deck` | `Draw`, `controller: "mine"`, `amount: 1` | Hand increases by exactly one and deck decreases by exactly one after `settle()`. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
the executable behavior exclusively with `registerIrCard("EX4-005", compiled)`.
No second `registerCard` registration exists.

#### Behavioral and stack evidence

The existing colocated suite already supplies the required proof without a
production change:

- Exact catalog identity, printed text, alternate requirement, effect triggers,
  source filters, inherited flag, frequency, and Draw action are asserted.
- A public ST1-01 `Koromon` hatch and zero-cost alternate digivolution assert
  the legal route, unchanged memory, ordinary evolution draw, top-card identity,
  and source-card instance transition. The stack is moved from breeding to the
  battle area before the inherited watcher scenario.
- The alternate route from ST2-01 `Tsunomon` is rejected through the public
  digivolution intent without paying memory or moving either card.
- Both printed Tamer colors are positive start-of-main cases. An opponent's red
  Tamer is a controller negative.
- The inherited watcher is exercised on a realistic ST1-01 → EX4-005 → BT1-014
  stack. Own red suspension draws exactly one, own yellow suspension is blocked
  by once-per-turn, blue suspension and opponent red suspension are ignored,
  and a later own turn re-arms the watcher.
- All asynchronous effects are resolved with `settle()`/real turn-loop timing.
  No timing injection helper is used as behavioral proof. Digi-Egg cards appear
  only in `eggDeck`, never in a main deck or security fixture, and no numeric
  `security` fixture is used.

Relevant peers inspected include EX4-007 (same red/yellow start-main and
inherited Tamer-suspension vocabulary), EX4-009 (same inherited watcher and
color filter), and EX4-001/EX4-004 (public hatch, legal evolution, source-stack,
and alternate-route proof patterns). Their IR uses the same interpreter
`sourceFilter` and once-per-turn mechanisms; EX4-005's filters are correctly
restricted to own red/yellow Tamers.

#### Verification commands and results

Before the permitted test run:

```text
pgrep -af '[v]itest'   # no output; no active Vitest process
memory_pressure -Q     # System-wide memory free percentage: 39%
```

Focused proof:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-005.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: **1 file, 8 tests** (3.28s).

Quality checks:

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-005.ts apps/api/src/cards/EX4/EX4-005.test.ts
```

Passed with no findings.

```text
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-005.ts apps/api/src/cards/EX4/EX4-005.test.ts
git diff --check
```

Both passed. Oxfmt initially identified one formatting issue in the already
modified colocated test; only the formatter's mechanical normalization was
applied. Root/API typecheck and collection suites were intentionally not run in
this worker lane.

#### Defects, retained reds, and seams

- Defects fixed: no runtime or IR defect found. The card test was not
  substantively rewritten in this lane; only its existing formatting was
  normalized so the required check passes.
- Retained reds: none in the focused suite.
- Engine seams: none. The existing `youHave` battle-area/controller/color
  matcher and `whenSuspended` source-filter bus express the card exactly.
- Remaining gaps: no card-specific gap identified. Delivery gates remain
  coordinator-owned by the worker brief.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Every catalog field and printed clause is recorded; no card-specific KB Q&A or unresolved ambiguity exists, and applicable evolution/timing/zone/draw/once-per-turn rules were checked. |
| IR trace | 2/2 | Alternate Koromon evolution, start-main condition, inherited watcher, source filter, Draw 1, and once-per-turn all map to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Focused public tests cover legal and illegal routes, exact memory/draw boundaries, both positive colors, controller/color negatives, once-per-turn cap/reset, costs, zones, and settled endpoints. |
| Peer / stack proof | 2/2 | Legal hatch/evolution and battle-area transition are proven with source identity; peer vocabulary and shared watcher/filter semantics were compared. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or commit was performed in this lane. |
| **Worker total** | **8/10** | |

### EX4-006 — Guilmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-006`, Guilmon; Digimon; Red/Purple; level 3; play cost 3; DP
  2000.
- Evolution costs: Red level 2 for 1 or Purple level 2 for 1.
- Form: Rookie; attribute: Virus; trait: Reptile; maximum four copies.
- Main text: `[Digivolve][Gigimon]: Cost 0[On Play] If the total number of
  cards in both players' trashes is 20 or more, this Digimon gains <Rush> for
  the turn. (This Digimon may attack the turn it was played.)`
- Inherited text: none; Security text: none.

Local card query:

```text
node tools/kb/query.mjs card EX4-006
```

Result: Q3440 and Q3441; the card is restricted to one copy from 2025-09-01.
Q3440 confirms that the threshold is the sum of both players' trashes (for
example, 12 plus 8). Q3441 confirms that once the conditional On Play effect
activates, its `for the turn` Rush remains after the combined trash count later
falls below 20.

Applicable local rules checked in `data/kb/rules/comprehensive.md`:

- §§2-3-5-3 and 8-1-3-1/2: printed alternate digivolution text is a named
  requirement, and the chosen cost is paid before resolving the stack.
- §8-1-3-3: a successful digivolution puts the revealed card on top and draws
  one card; this is the ordinary evolution bonus draw asserted below.
- §8-1-2-6: an invalid or no-longer-legal digivolution returns the revealed
  card without moving memory; the incompatible-blue negative checks this.
- §§16-15-1/2 and 15-8-2: Rush permits an attack on the turn a Digimon was
  played and is persistent; the Q3441 test clears both trashes after activation
  and still performs the attack.
- §3-6: trash is a public face-up area, so the combined count is observable.

#### Clause-to-IR-to-proof mapping

| Printed clause | Direct IR | Colocated behavioral proof |
| --- | --- | --- |
| Red level 2 for 1 | Catalog evolution cost; standard engine requirement | Public `ST1-01` hatch, normal evolution with memory 1, memory reaches 0, bonus draw and stack identity are asserted. |
| Purple level 2 for 1 | Catalog evolution cost; standard engine requirement | Public `ST6-01` hatch exercises the same route and endpoints. |
| `[Digivolve][Gigimon]: Cost 0` | `digivolutionRequirement: [{ namesExact: ["Gigimon"], cost: 0, isAlternate: true }]` | Public `BT12-001` Gigimon hatch and `useAlternateCost: true`; memory remains 0, bonus draw occurs, and source identity survives. |
| Alternate route must be Gigimon | Exact-name alternate requirement | Public `ST2-01` Tsunomon route returns `{ ok: false, reason: "invalid-evolution" }`, preserving memory, top card, and Guilmon in hand. |
| `[On Play]` | `effects[0].trigger: "OnPlay"` | A real `playCard` intent resolves Guilmon into the battle area before Rush is observed. |
| Combined trash count is 20 or more | `condition: { kind: "combinedTrashCount", op: "gte", value: 20 }` | Q3440 fixture uses 12 own plus 8 opposing trash cards; the separate 9 plus 10 fixture proves 19 is below the boundary. |
| This Digimon gains Rush | `GainKeyword`, self target, `keyword: "Rush"` | `observe(...).hasKeyword(guilmon, "Rush")` is true at 20 and false at 19. |
| For the turn / may attack this turn | `duration: "forTheTurn"` | After activation, both trashes are emptied and Rush remains observable; a public attack intent succeeds and suspends Guilmon. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
executable behavior exclusively with `registerIrCard("EX4-006", compiled)`.
No second legacy registration exists.

#### Behavioral and stack evidence

The colocated test was strengthened within the allowed test file:

- Catalog identity now asserts all relevant fields, exact printed text,
  absent inherited text, exact compiled effect, alternate requirement, and
  residual-free runtime registration.
- Parameterized public routes hatch a Red `ST1-01` and Purple `ST6-01` egg
  from `eggDeck`, evolve Guilmon for exactly 1 memory, assert the mandatory
  evolution draw and remaining deck, and preserve top/source instance identity
  through the move from breeding to battle area.
- A public `BT12-001` Gigimon hatch proves the zero-cost alternate route with
  the same draw and stack/source assertions.
- A public Blue `ST2-01` hatch rejects Guilmon without paying memory, moving the
  source, or removing Guilmon from hand.
- Q3440/Q3441 are exercised with the exact 12-plus-8 threshold, post-trigger
  trash reduction, immediate attack, and a 9-plus-10 negative boundary.
- Digi-Egg cards are supplied only through `eggDeck`; none are placed in the
  main deck or security. No numeric security fixture is used. All effect timing
  waits use `settle()` and the real turn loop; the prior injected recompute call
  was removed.

Peers inspected: EX4-005 and EX4-007 for alternate evolution and public stack
patterns, EX4-001/EX4-002/EX4-004 for public hatch, evolution draw, source-stack,
and invalid-route proof, and EX4-024 for dual-color level-2 evolution. EX4-006
uses the same interpreter evolution and keyword primitives without inherited,
Security, once-per-turn, or target-selection clauses.

#### Verification commands and results

Static source and KB inspection completed:

```text
node tools/kb/query.mjs card EX4-006
node tools/kb/query.mjs rules 'Rush'
node tools/kb/query.mjs rules 'combined trash'
```

The initial resource gate was held while swap was above 6 GiB and another
Vitest process was active. Coordinator acceptance later completed the deferred
serial verification.

```text
sysctl vm.swapusage
pgrep -fl 'vitest|tsx.*test|pnpm.*test'
memory_pressure -Q
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-006.test.ts --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint apps/api/src/cards/EX4/EX4-006.ts apps/api/src/cards/EX4/EX4-006.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-006.ts apps/api/src/cards/EX4/EX4-006.test.ts
git diff --check
```

Results supplied by coordinator acceptance:

- Combined serial EX4-006/EX4-007 run: **EX4-006 fully passed, 7/7 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-006.ts apps/api/src/cards/EX4/EX4-006.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-006.ts apps/api/src/cards/EX4/EX4-006.test.ts` — passed after mechanical formatting of `EX4-006.test.ts`.
- `git diff --check` — passed.

Root/API typecheck and collection suites were not run in this worker lane.

#### Defects, retained reds, and seams

- Defects fixed: no production IR defect found. The colocated proof was
  corrected to use legal public hatch routes and removed injected timing; the
  direct battle-area Digi-Egg fixtures were eliminated.
- Retained reds: none; coordinator acceptance reports the focused EX4-006 proof
  green at 7/7.
- Engine seams: none identified. The existing combined-trash condition,
  persistent keyword grant, public digivolution legality, and standard draw
  primitives express the card.
- Remaining gaps: no card-specific gap identified. Delivery gates remain
  coordinator-owned.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full catalog fields, Q3440/Q3441, restriction, Rush persistence, trash, evolution, draw, and invalid-route rules are recorded. |
| IR trace | 2/2 | On Play threshold, self-targeted Rush duration, exact alternate route, residual-free coverage, and exclusive registration map directly to the module. |
| Behavioral proof | 2/2 | Public legal red/purple/alternate routes, costs, draw, exact 20/19 boundary, persistence, immediate attack, and invalid blue route are covered in source. |
| Peer / stack proof | 2/2 | Public hatch-to-battle-area stacks preserve source/top identity and use peer-validated evolution/draw patterns across both applicable colors. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or commit was performed in this lane. |
| **Worker total** | **8/10** | |

### EX4-007 — GeoGreymon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-007`, GeoGreymon.
- Red/yellow, Digimon, level 4, play cost 5, DP 5000.
- Evolution costs: red level 3 for 3 or yellow level 3 for 3.
- Form: Champion; attribute: Vaccine; trait: Dinosaur.
- Main text: `Digivolve: 2 from Lv.3 w/[Agumon] in name and [Dinosaur] trait[Start of Your Main Phase] If you have a red or yellow Tamer in play, gain 1 memory.`
- Inherited text: `[Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended, . (Draw 1 card from your deck.)`

Local card query:

```text
node tools/kb/query.mjs card EX4-007
```

Result: no card-specific Q&A, rulings, errata, or restrictions. Applicable
comprehensive rules checked directly:

- §2-3-5-1/2/3: evolution requirements include the eligible source and exact
  evolution cost; text after `Digivolve:` is part of the requirement.
- §3-4-7-3 through 3-4-7-8: breeding-area cards do not activate effects or
  satisfy ordinary field conditions; the card condition is correctly scoped to
  `battleArea`.
- §4-13-1-2-1/2: suspended means the card is placed horizontally.
- §4-14-1/2: drawing moves cards from the player's own deck to hand.
- §15-14-1-1/2/5: `Once Per Turn` caps activations during a turn and resets when
  the turn changes.
- §15-16-13-1: `Start of Your Main Phase` triggers when the owner's main phase
  arrives.

#### Clause-to-IR-to-proof mapping

| Printed clause | Direct IR | Colocated behavioral proof |
| --- | --- | --- |
| Ordinary red/yellow level-3 evolution for 3 | Catalog `evoCosts`; engine's ordinary evolution route | Public evolution cases from red BT1-011 and yellow EX4-023 assert memory 3→0, top-card identity, and source instance in the stack. |
| Alternate `Agumon` name + `Dinosaur` trait, cost 2 | `digivolutionRequirement: [{ level: 3, names: ["Agumon"], traits: ["Dinosaur"], cost: 2, isAlternate: true }]` | Public alternate evolution from Dinosaur Agumon Expert asserts memory 2→0, evolution draw, top card, and source stack. Blue Monmon, which matches neither route, is rejected without payment or movement. |
| `[Start of Your Main Phase]` | `effects[0].trigger: "StartOfYourMainPhase"` | Real `startTurnLoop()` and `waitForMainPhase()` cases, with no injected timing, assert the settled memory delta. |
| `If you have a red or yellow Tamer in play, gain 1 memory` | `GainMemory` amount 1; `youHave` filter restricted to own `battleArea` Tamers with colors Red/Yellow | Own red BT1-085 and own yellow-containing AD1-019 each gain exactly 1; an opponent red Tamer and no Tamer gain none. |
| Inherited `[Your Turn]` | `effects[1].trigger: "YourTurn"`, `isInherited: true` | A legal EX4-007-under-EX4-009 battle-area stack is used for the suspension watcher. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` | First matching suspension draws; a second matching suspension in the same turn does not; next own turn draws again. |
| `When one of your red or yellow Tamers becomes suspended` | `SubTrigger` `whenSuspended`, source filter own Tamer + Red/Yellow | Own red draws; own yellow is blocked by same-turn OPT; own blue and opponent red do not draw. |
| `Draw 1 card from your deck` | `Draw`, controller `mine`, amount 1 | After `settle()`, hand grows by exactly one, the first known deck card is in hand, and deck shrinks by one. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
only with `registerIrCard("EX4-007", compiled)`; no legacy `registerCard`
registration exists for this card.

#### Behavioral, peer, and stack evidence

The colocated test was rewritten to replace injected `advance.fire` timing with
public turn-loop timing and to add the missing stack/boundary evidence:

- Both ordinary color routes and the alternate Agumon/Dinosaur route assert
  exact memory cost, ordinary evolution draw, top-card identity, and preserved
  source identity.
- The alternate route rejects blue level-3 Monmon, which matches neither the
  ordinary red/yellow route nor the Agumon/Dinosaur route, preserving memory,
  hand, deck, and field state.
- Start-main positive cases cover red and yellow-containing Tamers; ownership
  and no-Tamer negatives are covered.
- Inherited behavior runs from a realistic level-4 → GeoGreymon → level-5
  stack, proves exact once-per-turn behavior, filters blue/opponent Tamers, and
  proves reset on the next own turn.
- Fixtures use no Digi-Egg in a main deck or security stack and no numeric
  security fixture. Effects are resolved with `settle()` and public turn-loop
  transitions.

Peer comparison covered EX4-005 (same start-main condition and inherited
watcher), EX4-009 (same red/yellow Tamer source filter and inherited watcher),
and the EX4 public stack/evolution exemplars. EX4-007 uses the same shared IR
watcher primitives consistently and has exclusive IR registration.

#### Verification commands and results

Before each focused run, no competing Vitest process was present and
`memory_pressure -Q` reported 74% system-wide free memory. The coordinator's
two initial failures were reproduced, corrected, and the final focused run
passed:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-007.test.ts --maxWorkers=1 --no-file-parallelism
Passed: 1 file, 10 tests (2.16s)
```

File-level checks:

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-007.ts apps/api/src/cards/EX4/EX4-007.test.ts
Passed with no findings.

pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-007.ts apps/api/src/cards/EX4/EX4-007.test.ts
Passed: all matched files use the correct format.

git diff --check
Passed with no findings.
```

Coordinator-owned checks intentionally not run:

```text
pnpm --filter @aegis/api typecheck
```

#### Defects, retained reds, and seams

- Defects fixed: no production IR defect found. The invalid-route fixture now
  uses blue Monmon so it cannot take GeoGreymon's ordinary route. The inherited
  reset assertion now accounts for the ordinary draw at the start of the next
  turn before asserting the additional reset-triggered draw.
- Retained reds: none in the focused suite or file-level checks.
- Engine seams: none identified. The existing alternate-evolution matcher,
  battle-area `youHave` condition, suspension source filter, draw action, and
  once-per-turn interpreter express the printed card.
- Remaining gaps: no card-specific KB Q&A or ambiguity. Delivery gates remain
  coordinator-owned.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Every catalog field and printed clause is recorded; no card-specific Q&A or ambiguity exists, and applicable evolution, field, draw, timing, and OPT rules were checked. |
| IR trace | 2/2 | Both ordinary costs, alternate name/trait route, start-main condition, inherited source filter, Draw 1, and once-per-turn all map to residual-free IR. |
| Behavioral proof | 2/2 | Focused public tests pass and cover the full contract, exact costs/draws, invalid route, ownership/color boundaries, same-turn OPT, and next-turn reset. |
| Peer / stack proof | 2/2 | The legal evolution stack and inherited stack pass focused execution; peer comparison confirms matching shared watcher/filter semantics. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or commit was performed in this lane. |
| **Worker total** | **8/10** | Delivery gates remain coordinator-owned. |

### EX4-008 — BlackGrowlmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

The committed catalog at `packages/shared/src/cards/data/cards.json` identifies
EX4-008 as BlackGrowlmon: Red/Purple, Digimon, level 4, play cost 5, DP 5000,
Champion, Virus, and Dark Dragon. Its ordinary evolution requirements are Red
Lv.3 for 3 or Purple Lv.3 for 3. Its alternate requirement is:

> Digivolve: 2 from Lv.3 w/[Guilmon] in name

The main effect is:

> [When Digivolving] Trash the top 2 cards of both players' decks. Then, you
> may return 1 [Guilmon] or 1 card with [Growlmon] or [Gallantmon] in its name
> from your trash to your hand.

The inherited effect is:

> [On Deletion] You may return 1 [Guilmon] or 1 card with [Growlmon] or
> [Gallantmon] in its name from your trash to your hand.

`node tools/kb/query.mjs card EX4-008` returned all assigned card rulings:

- Q3442: both players must trash two cards each, if possible; the effect is
  mandatory.
- Q3443: the optional return may be declined, but declining it does not stop
  either player's mandatory trashing.
- Q3444: the inherited optional return may likewise be declined.

Applicable comprehensive rules read locally include §8-1-2-6 (an invalid or
unpayable digivolution returns the revealed card and does not move memory),
§8-1-3-3 (place the digivolved card, draw one, and resolve the process),
§15-7-4/5 (optional processing may be declined), §15-10-1-3 ("both players"),
§15-10-2-1 (an exact X-card instruction processes up to X when fewer are
available), and §15-16-4 (On Deletion timing). No card-specific ambiguity or
erratum remains.

#### Implementation trace

Implementation: [`apps/api/src/cards/EX4/EX4-008.ts`](../../apps/api/src/cards/EX4/EX4-008.ts).

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Alternate Lv.3 `[Guilmon]` route for cost 2 | `digivolutionRequirement: [{ level: 3, names: ["Guilmon"], cost: 2, isAlternate: true }]` | Public alternate stack test asserts memory 2 → 0 and rejects a non-Guilmon Lv.3 route. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | Public digivolution proof and direct settled effect cases. |
| Trash top 2 of both decks | `TrashTopDeck`, `controller: "both"`, `amount: 2` | Public stack case empties two-card decks for both players; Q3442/Q3443 use one-card decks and still trash as many as possible. |
| Optional return of exact Guilmon or Growlmon/Gallantmon name | `Return` to `hand`, `optional: true`, own trash filter with `nameExact: ["Guilmon"]` and `name: ["Growlmon", "Gallantmon"]` | Candidate-boundary case includes exact Guilmon, Guilmon X near-match, Growlmon-name, Gallantmon-name, and filler. |
| Inherited `[On Deletion]` optional return | Same return action with `isInherited: true`, trigger `OnDeletion` | Host deletion positive and Q3444 decline cases use EX4-008 under a public host. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
executable behavior exclusively through `registerIrCard("EX4-008", compiled)`.
No production implementation change was required.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-008.test.ts`](../../apps/api/src/cards/EX4/EX4-008.test.ts).

- Catalog and IR assertions now check the complete printed identity/text,
  alternate requirement, residual-free runtime registration, both-player
  trash action, and exact optional return filters.
- Existing public evolution cases prove both ordinary color routes (Red and
  Purple, cost 3) and the alternate Guilmon-in-name route (cost 2).
- The new public stack case evolves BT12-007 Guilmon into EX4-008 with the
  alternate cost, asserts the ordinary digivolution draw, both decks' two-card
  trash, the optional return of a `BlackGrowlmon` name match, memory 2 → 0,
  EX4-008 as the top card, and BT12-007 as the retained source card.
- The new invalid-route case attempts the alternate route from incompatible
  Green Lv.3 BT1-064 (which matches neither ordinary color route nor Guilmon)
  and asserts `invalid-evolution`, unchanged memory, unchanged top
  card, and EX4-008 remaining in hand.
- The existing candidate test proves exact `[Guilmon]` matching and
  name-containing `[Growlmon]`/`[Gallantmon]` matching while excluding
  `Guilmon (X Antibody)` and unrelated filler.
- Q3442/Q3443 are covered by mandatory one-card-per-player trashing when the
  optional return is declined; the public stack case additionally proves the
  full two-card path. Q3444 is covered by the new inherited-deletion decline
  case, which leaves the matching card in trash.
- Existing deletion-positive proof resolves the inherited return after a host
  carrying EX4-008 is deleted.
- Every asynchronous case settles before zone assertions. No Digi-Egg is put
  in a main deck or security fixture, no numeric security fixture is used, and
  no injected timing helper is used as behavioral proof.

Relevant peers inspected were EX4-007 and EX4-009 for compiled IR registration
and inherited effect structure, EX4-003/EX4-005 for public evolution
cost/draw/top/source assertions, and BT19/BT12 Guilmon-family implementations
for exact-vs-name-containing matching vocabulary. EX4-008's filters correctly
keep exact Guilmon separate from Growlmon/Gallantmon name containment.

#### Verification commands and results

Static evidence commands completed:

```text
node tools/kb/query.mjs card EX4-008
node tools/kb/query.mjs rules 'trash top cards deck both players'
node tools/kb/query.mjs rules 'return from trash to hand optional'
```

Before the focused run, `pgrep -af '[v]itest'` showed no active Vitest process
and `memory_pressure -Q` reported 74% system-wide free memory.

Focused proof:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-008.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: **1 file, 12 tests** (2.15s).

File checks:

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-008.ts apps/api/src/cards/EX4/EX4-008.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-008.ts apps/api/src/cards/EX4/EX4-008.test.ts
git diff --check -- apps/api/src/cards/EX4/EX4-008.ts apps/api/src/cards/EX4/EX4-008.test.ts
```

All passed. Root/API typecheck and the EX4 collection suite remain deferred to
the coordinator; no additional Vitest process was run.

#### Defects, retained reds, and seams

- Defects fixed: no runtime or IR defect found. The invalid-route fixture was
  corrected from Red BT1-010 (which legally matched the ordinary route) to
  incompatible Green BT1-064; the focused suite now proves exact rejection.
- Retained reds: none in the focused suite.
- Engine seams: none identified statically. The existing alternate evolution,
  both-seat `TrashTopDeck`, optional decision, exact/name filter, and inherited
  deletion paths express the printed clauses.
- Remaining gap: root/API typecheck and collection verification remain
  coordinator-owned.

#### Worker score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, Q3442–Q3444, and applicable comprehensive rules were checked. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Focused 12-test run passes positive, negative, stack, and all ruling-boundary assertions. |
| Peer / stack proof | 2/2 | Focused proof passes public legal/illegal stack, cost/draw/top/source, and filter-boundary cases. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or collection/typecheck gate was performed. |
| **Total** | **8/10** | Delivery gates remain coordinator-owned at zero. |

### EX4-009 — RizeGreymon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

The committed catalog identifies EX4-009 as RizeGreymon: Red/Yellow, Digimon,
level 5, play cost 7, DP 7000, Ultimate, Vaccine, and Cyborg. Its ordinary
evolution requirements are Red Lv.4 for 4 or Yellow Lv.4 for 4. Its alternate
requirement is:

> Digivolve from [GeoGreymon]: Cost 3

The main effect is:

> [When Digivolving] 1 of your opponent's Digimon and all of your opponent's
> Security Digimon get -4000 DP for the turn.

The inherited effect is:

> [Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes
> suspended, 1 of your opponent's Digimon and all of your opponent's Security
> Digimon get -4000 DP for the turn.

`node tools/kb/query.mjs card EX4-009 --json` returned Q3445:

- Q3445: the [When Digivolving] effect still reduces opposing Security Digimon
  when the opponent has no Digimon in the battle area.

Applicable local comprehensive rules read during this audit include §8-1-2-6
(an invalid or unpayable digivolution returns the revealed card and does not move
memory), §8-1-3-3 (place the digivolved card, draw one, and resolve the process),
§15-10-1-2 (opponent targets), §15-10-2-1 (an exact one-card instruction selects
one card when possible), §13-1-7 and glossary “Security Digimon” (security
Digimon are a distinct target class), and §15-16-3-1 ([When Digivolving]). The
`forTheTurn` duration and §15-4 turn transition semantics were also checked.
No erratum, restriction, or card-specific ambiguity remains.

#### Implementation trace

Implementation: [`apps/api/src/cards/EX4/EX4-009.ts`](../../apps/api/src/cards/EX4/EX4-009.ts).

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Ordinary Red Lv.4 / Yellow Lv.4 routes, cost 4 | Catalog `evoCosts`; engine ordinary route | Public parameterized evolution test checks both colors, memory 4 → 0, draw, top card, and retained source. |
| Alternate exact GeoGreymon route, cost 3 | `digivolutionRequirement: [{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]` | Public GeoGreymon stack test checks memory 4 → 1 and the invalid non-GeoGreymon Lv.4 route leaves memory/card/deck unchanged. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | Public alternate evolution test resolves the effect from a real digivolution. |
| One opposing Digimon gets -4000 for the turn | `ModifyDP`, opponent Digimon filter, `count: 1`, `duration: "forTheTurn"` | Mixed two-Digimon board proves exactly the selected target changes and the other does not; the end of turn restores DP. |
| All opposing Security Digimon get -4000 for the turn | `ModifySecurityDP`, opponent, -4000, `forTheTurn` | Public test uses two security Digimon; Q3445 public test uses no opposing field Digimon and still observes -4000. |
| Inherited own-turn red/yellow Tamer watcher | `YourTurn`, inherited `SubTrigger` `whenSuspended`, own Tamer source filter, Red/Yellow colors | Public suspension test proves own matching Tamers, nonmatching blue/opponent Tamers, target count one, and security reduction. |
| `[Once Per Turn]` and duration | `frequency: "OncePerTurn"`; inherited modifiers are `forTheTurn` | Same-turn second matching suspension does not repeat; after the next own turn opens, the modifier expires and the watcher fires again. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
executable behavior exclusively through `registerIrCard("EX4-009", compiled)`.
No production implementation change was required.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-009.test.ts`](../../apps/api/src/cards/EX4/EX4-009.test.ts).

- Catalog assertions now cover identity, ordinary evolution costs, complete
  effect text, inherited text, alternate-route metadata, full residual-free IR,
  exact target filters, and both turn-scoped modifiers.
- Public evolution cases cover Red Lv.4, Yellow Lv.4, and exact GeoGreymon
  routes. Each asserts paid memory, the ordinary evolution draw, RizeGreymon as
  the top card, and the source card retained beneath it.
- The illegal alternate case uses blue AD1-010, a Lv.4 source matching neither
  ordinary Red/Yellow requirements nor exact GeoGreymon, and asserts
  `invalid-evolution`, unchanged memory, unchanged source/top card, RizeGreymon
  remaining in hand, and no deck draw.
- The public main-effect case resolves through alternate digivolution, selects
  exactly one of two opposing Digimon, reduces both opposing Security Digimon,
  checks the draw/stack, and confirms all `forTheTurn` modifiers clear at the
  end of the turn.
- Q3445 is covered through a real public GeoGreymon → RizeGreymon evolution
  with no opposing field Digimon and one opposing Security Digimon; the
  security modifier still resolves and no decision remains pending.
- The inherited test covers a matching yellow and red Tamer, a same-turn
  once-per-turn refusal, nonmatching blue and opponent Tamers, one-target
  selection, end-of-turn expiry, and the next-own-turn reset.
- All fixtures keep Digi-Egg cards out of main decks and security. No numeric
  security fixtures or injected timing helpers are used as behavioral proof;
  all effect cases use public digivolution or suspension intents and settle
  before assertions.

Relevant peers inspected were EX4-007 and EX4-008 for EX4 compiled registration,
alternate evolution, and stack evidence; EX4-005 for public draw/source proof;
and BT5-038/BT5-044 for Security Digimon DP observation and turn-scoped behavior.
The exact `namesExact` GeoGreymon route and the opponent/security target scopes
match the peer vocabulary.

#### Verification commands and results

Static evidence commands completed:

```text
node tools/kb/query.mjs card EX4-009 --json
node tools/kb/query.mjs rules 'EX4-009 RizeGreymon When Digivolving Security Digimon -4000'
node tools/kb/query.mjs rules 'evolution alternate requirement invalid memory draw source stack'
node tools/kb/query.mjs rules 'Security Digimon DP modifier'
```

The focused card suite was run only after no other Vitest process was active and
`memory_pressure -Q` reported at least 25% free memory:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-009.test.ts --maxWorkers=1 --no-file-parallelism
### Test Files  1 passed (1); Tests 9 passed (9)
```

Typecheck, lint, and formatting were not run in this lane; the worker brief
assigns those batch quality gates to the coordinator. A scoped
`git diff --check` was run and returned cleanly.

```text
git diff --check -- apps/api/src/cards/EX4/EX4-009.ts apps/api/src/cards/EX4/EX4-009.test.ts docs/audits/EX4-reaudit/EX4-009.md
### passed; no output
```

Expected focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-009.test.ts --maxWorkers=1 --no-file-parallelism
```

#### Defects, retained reds, and seams

- Defects fixed: no runtime or IR defect found. The colocated behavioral test
  was corrected to reject a source satisfying an ordinary route, to use a real
  turn transition for once-per-turn reset, and to provide neutral deck fillers
  so the production loop could reach the opponent's Main phase.
- Retained reds: coordinator typecheck, lint, formatting, and collection gates
  remain pending.
- Engine seams: none identified statically. Existing exact-name alternate
  evolution, public evolution draw/stack handling, one-target resolution,
  Security Digimon DP ledger, duration expiry, and once-per-turn watcher reset
  express the printed clauses.
- Remaining gap: coordinator typecheck, lint, formatting, and collection gates
  remain before collection-level acceptance.

#### Conservative worker score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, Q3445, and applicable comprehensive rules were checked. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Focused public suite passed 9/9, including positive, boundary, negative, duration, Q3445, and once-per-turn assertions. |
| Peer / stack proof | 2/2 | Focused suite passed legal/illegal public stacks and peer-informed target/timing boundaries. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or gate command was performed. |
| **Total** | **8/10** | Worker maximum; coordinator batch gates remain pending. |

### EX4-010 — BlackWarGrowlmon

#### Printed contract and local evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-010`)
  records Red/Purple Lv.5, play cost 8, 8000 DP, Ultimate/Virus/Cyborg,
  ordinary Red Lv.4 and Purple Lv.4 evolution costs of 4, and no inherited or
  Security text.
- Printed evolution clause: `Digivolve: 3 from Lv.4 w/[Growlmon] in name`.
- Printed When Digivolving sequence: trash the top 3 cards of both players'
  decks; then choose any number of opposing Digimon whose combined DP is up to
  3000 and delete them; for every 10 total cards in both players' trashes, add
  2000 to that deletion maximum.
- `node tools/kb/query.mjs card EX4-010` returns Q3446. Q3446 confirms that
  “both players' trashes” is one combined sum (not separate per-player
  floors); 15 + 9 cards grants +4000, producing a 7000 DP maximum.
- Comprehensive rules evidence used: trash is a public zone (§3-6), deletion
  moves the deleted Digimon to trash (§4-15), “choose any number” aggregate DP
  selection requires at least one candidate when one is available (§1-3-6),
  and both-player effect targets are resolved for both seats (§15-10-1).

#### Clause-to-IR-to-proof mapping

| Contract clause | IR in `apps/api/src/cards/EX4/EX4-010.ts` | Colocated proof |
| --- | --- | --- |
| Ordinary Red/Purple Lv.4 routes, cost 4 | Catalog `evoCosts`; server ordinary-route legality | `digivolves through the printed red level 4` and `purple level 4` routes; memory reaches 0, `topCard` is EX4-010, and the source-only stack retains `[base]` |
| Alternate Lv.4 Growlmon-name route, cost 3 | `digivolutionRequirement: [{ level: 4, names: ["Growlmon"], cost: 3, isAlternate: true }]` | Alternate route uses `BT12-010` (a distinct Growlmon Lv.4), pays 3, and asserts top/source identity; the explicit alternate route from nonmatching Lv.3 `BT1-009` is rejected without payment or movement |
| Trash top 3 of both decks | `TrashTopDeck { controller: "both", amount: 3 }` | Real public digivolution flow accounts for the owner’s mandatory evolution draw, then asserts the next three cards leave the five-card owner deck and four-card opponent deck while each sentinel remains; both mill sets contribute to trash |
| Opponent-only Digimon aggregate deletion | `Delete` with opponent `Digimon` filter, `count: 0`, `upTo: true`, `totalDpCap: 3000` | Real digivolution deletes opposing 3000 + 2000 DP Digimon within the 5000 post-mill cap |
| Combined-trash scaling and floor | `totalDpCapScaling { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } }` | Below-threshold total 19 leaves a 6000 DP target alive; Q3446 boundary fixture reaches 11 + 9 = 20 after the six mills, grants +4000, and deletes a 7000 DP target |
| Registration/completeness | `registerIrCard("EX4-010", compiled)`, `coverage: "full"`, `residual: []` | Test asserts `runtimeCompiledCard("EX4-010")` is full and residual-free |

#### Peer and stack review

`EX4-008` was reviewed for the same Black/Growlmon line and both-player mill
ordering. `EX4-011` was reviewed for the neighboring combined-trash scaling
pattern. Shared target resolution confirms the aggregate DP selection is
revalidated as one budget and uses the live combined trash count. The focused
tests now use a real evolution stack for all positive behavior and include a
nonmatching level-3 negative route. They account for the mandatory one-card
evolution draw before the When Digivolving mills and assert the 19/20 combined
trash boundary. No inherited, Security, once-per-turn, or optional clause
exists on EX4-010, so those dimensions are not applicable. No Digi-Egg or
injected Security/timing fixture is used.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-010.test.ts --maxWorkers=1 --no-file-parallelism`: passed, 1 file / 7 tests.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-010.ts apps/api/src/cards/EX4/EX4-010.test.ts`: passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-010.ts apps/api/src/cards/EX4/EX4-010.test.ts`: passed.
- `git diff --check -- apps/api/src/cards/EX4/EX4-010.ts apps/api/src/cards/EX4/EX4-010.test.ts docs/audits/EX4-reaudit/EX4-010.md`: passed.
- API typecheck was not run in this worker lane, per coordinator instruction to
  keep verification focused and serial.

#### Worker rubric score

| Column | Score | Basis |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, Q3446, and applicable comprehensive-rule boundaries mapped. |
| IR trace | 2/2 | Every printed clause maps to executable IR and exclusive `registerIrCard`. |
| Behavioral proof | 2/2 | Public evolution flows cover all routes, costs, stack transition, both mills, aggregate DP boundaries, and Q3446. |
| Peer/stack proof | 2/2 | Neighboring EX4 implementations reviewed; realistic stacks and a nonmatching alternate-route negative are covered. |
| Delivery gates | 0/2 | Collection delivery and API typecheck remain coordinator-owned; no commit or push was performed in this lane. |

**Worker total: 8/10.** No card-specific implementation defect remains identified; coordinator verification is still required before any 10/10 collection claim.

### EX4-011 — ChaosGallantmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Printed contract and local evidence

The committed catalog (`packages/shared/src/cards/data/cards.json`) identifies
EX4-011 as ChaosGallantmon: Red/Purple Lv.6, play cost 12, 12000 DP, Mega,
Virus, and Dark Knight. Its ordinary evolution requirements are Red Lv.5 for 4
or Purple Lv.5 for 4. The alternate requirement is:

> Digivolve: 3 from Lv.5 w/[WarGrowlmon] in name

The complete printed effect is:

> [Trash][End of Your Turn] By deleting 1 of your Digimon with digivolution
> cards and [Gallantmon] in its name, you may play this card without paying the
> cost. [On Play] Delete 1 of your opponent's Digimon with 7000 DP or less. For
> every 10 total cards in both players' trashes, add 2000 to the maximum this
> DP-based deletion effect can delete.

`node tools/kb/query.mjs card EX4-011 --json` returned all assigned rulings:

- Q3447: `[Trash]` means the End of Your Turn effect activates while this card
  is in the trash.
- Q3448: after paying the Gallantmon deletion cost, the player may decline the
  play because the effect says “you may play.”
- Q3449: “both players' trashes” is one combined total. The ruling's 15 + 9
  example totals 24 and raises the 7000 ceiling by 4000 to 11000.

Applicable comprehensive-rule evidence was read locally: §2-3-5-1 through
§2-3-5-3 (evolution requirements), §3-6 (trash), §4-8 (digivolution cards),
§4-16-1 through §4-16-2 (trashing and trigger location), §8-1-2-6 and
§8-1-3-3 (illegal evolution/no payment and the evolution draw/stack process),
§15-10-2-1 (exact target counts), and §1-3-6 (a card-choice instruction must
choose at least one when a candidate exists). No erratum, banlist entry, or
unresolved card-specific ambiguity was found.

#### Clause-to-IR-to-proof mapping

| Printed clause | IR in `apps/api/src/cards/EX4/EX4-011.ts` | Colocated public proof |
| --- | --- | --- |
| Ordinary Red/Purple Lv.5 routes, cost 4 | Catalog `evoCosts` | Parameterized public `digivolve` cases verify both colors pay 4. |
| Alternate Lv.5 route containing WarGrowlmon, cost 3 | `digivolutionRequirement: [{ level: 5, names: ["WarGrowlmon"], cost: 3, isAlternate: true }]` | EX4-010 BlackWarGrowlmon stack pays 3; explicit `alternateRequirementIndex: 0` on non-WarGrowlmon EX4-009 is rejected with no payment/movement/draw. |
| Standard evolution process | Engine digivolve intent | Every legal route asserts memory, the draw card entering hand, top EX4-011, and `[base]` source stack plus top-card instance identity. |
| `[Trash][End of Your Turn]` | `trigger: "EndOfYourTurn"`, `isFromTrash: true` | Real `runOneTurn`/`endPhase` loop fires the card from trash; direct timing injection is not used. |
| Delete one own Digimon with digivolution cards and Gallantmon in its name | `CostGatedBlock.cost.kind: "deleteOwn"`; own Digimon, `digivolutionCards: "hasAny"`, name token Gallantmon | Legal BT2-020 Gallantmon over EX4-010 is deleted as the cost; a Gallantmon with no source cards is a negative path. |
| May play this card without paying | Outer optional cost-gated block plus inner optional `PlayWithoutCost`, `payCost: false`, self-reference | Q3448 public response accepts the cost then declines the play; Q3447 accepts both and observes the same trash instance on the field without a play-cost payment. |
| `[On Play]` delete one opposing Digimon at 7000 DP or less | `Delete`, opponent Digimon filter, `count: 1`, `dpCeiling: 7000` | Public hand play with memory 12 deletes a 7000-DP target, leaves an 8000-DP target, and reaches memory 0. |
| +2000 for every 10 total cards in both trashes | `dpCeilingScaling: { per: 10, amount: 2000, filter: { zone: "trash", controllerDefault: "both" } }` | Public play proves 9 cards leave a 9000-DP target, 10 cards delete it, and Q3449's 15 + 9 cards delete an 11000-DP target. |
| Registration/completeness | `registerIrCard("EX4-011", compiled)`, `coverage: "full"`, `residual: []` | Test asserts the runtime compiled record is full and residual-free. |

#### Behavioral, Q&A, and stack evidence

Test file: [`EX4-011.test.ts`](../../apps/api/src/cards/EX4/EX4-011.test.ts).

- Catalog assertions cover identity, colors, level, costs, DP, traits, exact
  effect text, alternate requirement metadata, and residual-free runtime IR.
- All three legal evolution routes are public intents. The Red and Purple
  ordinary routes cost 4; the WarGrowlmon-name route costs 3. Each route
  checks the ordinary one-card evolution draw, resulting top card, and retained
  source stack.
- The explicit alternate-route negative uses a real level-5 non-WarGrowlmon
  source, and asserts `invalid-evolution`, unchanged memory/source/top card,
  the evolving card remaining in hand, and no draw.
- Q3447 is proven by the production turn loop with EX4-011 in trash: the legal
  Gallantmon stack is deleted, the same EX4-011 instance leaves trash and is
  played to the battle area for free, and its source card is trashed.
- Q3448 is proven by accepting the outer optional effect, observing the
  Gallantmon stack deletion before the second optional prompt, declining the
  play, and asserting EX4-011 remains in trash and never appears on the field.
- The no-source Gallantmon negative proves the cost filter does not accept an
  otherwise matching Gallantmon with no digivolution cards.
- Public hand play proves the mandatory On Play deletion at the 7000 boundary,
  exact one-target behavior, memory payment, and that an 8000-DP Digimon is not
  eligible.
- Q3449 is covered at 9 versus 10 cards and with the ruling's combined 15 + 9
  fixture. All trash fillers are ordinary Digimon cards; no Digi-Egg appears in
  a deck or security zone, and no numeric security fixture is used.
- No injected `advance.fire`, `fireTiming`, or `fireSubTrigger` call remains in
  the behavioral proof. `advance.runTurn` is used only to drive the production
  turn loop and `waitForMainPhase`/`endMainPhaseIfOpen` only expose its public
  end-phase intent.

Peers reviewed statically were EX4-010 and EX4-008 for the Red/Purple
Growlmon-name evolution line, stack/draw assertions, and combined-trash scaling;
the neighboring tests use the same residual-free compiled registration and
public evolution vocabulary. The BT2-020 over EX4-010 stack used for Q3447/Q3448
is a legal Red Lv.5 → Lv.6 Gallantmon stack.

#### Verification commands and results

Completed static evidence commands:

```text
node tools/kb/query.mjs card EX4-011 --json
node tools/kb/query.mjs rules 'EX4-011 ChaosGallantmon Gallantmon trash 7000 DP 10 total cards'
node tools/kb/query.mjs rules 'End of Your Turn Trash effect Digimon card rulings'
```

Focused execution and scoped static checks completed after the coordinator's
serial resource gate:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-011.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
### passed: 1 file, 12 tests
pnpm exec oxlint apps/api/src/cards/EX4/EX4-011.ts apps/api/src/cards/EX4/EX4-011.test.ts
### passed
pnpm exec oxfmt apps/api/src/cards/EX4/EX4-011.test.ts
### formatted one permitted test file
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-011.ts apps/api/src/cards/EX4/EX4-011.test.ts
### passed
git diff --check -- apps/api/src/cards/EX4/EX4-011.ts apps/api/src/cards/EX4/EX4-011.test.ts
### passed; no output
```

API typecheck and collection gates remain coordinator-owned and were not run in
this lane.

Expected focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-011.test.ts --maxWorkers=1 --no-file-parallelism
```

#### Defects, retained reds, and seams

- Production defect fixed: none found. `EX4-011.ts` already has complete IR,
  the correct trash-source trigger, self free-play, Gallantmon/source filter,
  7000 DP ceiling, and combined-trash floor scaling.
- Test evidence strengthened: replaced injected timing behavior with the real
  turn loop, removed the Digi-Egg source fixture, added standard draw/source
  proof, an explicit invalid alternate route, exact one-target proof, and the
  combined 15 + 9 Q3449 example.
- Retained red: coordinator collection and delivery gates are pending.
- Engine seams: none identified statically; the production interpreter exposes
  all printed clauses required here.

#### Conservative unverified worker score

| Column | Score | Basis |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, Q3447–Q3449, and applicable comprehensive rules were checked. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive `registerIrCard`. |
| Behavioral proof | 2/2 | Public positive, boundary, negative, optional-refusal, cost, source/destination, draw, and Q&A assertions are present; execution is pending. |
| Peer / stack proof | 2/2 | Growlmon-line peers were reviewed; legal and illegal public stacks are covered with source/top/draw evidence. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or verification gate was performed. |
| **Total** | **8/10** | Worker score; delivery gates remain coordinator-owned. |

### EX4-012 — VictoryGreymon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

The committed catalog entry in `packages/shared/src/cards/data/cards.json`
identifies EX4-012 as VictoryGreymon: Red Digimon, level 6, play cost 12, DP
12000, Mega, Vaccine, Dragonkin, with the ordinary evolution requirement Red
Lv.5 for 4. The complete main text is:

> [When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less.
> For every Digimon your opponent has in play, add 2000 to the maximum this
> DP-based deletion effect can delete. [All Turns][Once Per Turn] When an
> opponent's Digimon is deleted, if you have a Tamer in play, delete 1 of your
> opponent's Digimon with the highest DP.

`node tools/kb/query.mjs card EX4-012` returned no card-specific knowledge-base
entries, errata, or ruling IDs. Applicable local rules reviewed from
`data/kb/rules/comprehensive.md` include:

- §8-1-2-6: an invalid or unpayable digivolution does not move the revealed
  card or memory;
- §8-1-3-3: a completed digivolution places the new card on the stack and draws
  one card;
- §4-6: stacked cards retain their order and the bottom cards are
  digivolution cards;
- §15-10-1-2 and §15-10-2-1: opponent-relative targeting and exact one-card
  selection;
- §15-14-1: an [Once Per Turn] effect cannot activate again after its per-turn
  use is consumed; and
- §15-16-3-1: [When Digivolving] timing.

The local rules query for `in play` confirms that ordinary battle-area
permanent matching is the relevant field scope; the implementation explicitly
uses `zone: "battleArea"` for the scaling pool and Tamer condition. No
card-specific ambiguity remains.

#### Implementation trace

Implementation: [`apps/api/src/cards/EX4/EX4-012.ts`](../../apps/api/src/cards/EX4/EX4-012.ts).

| Printed clause | IR mapping | Behavioral proof |
| --- | --- | --- |
| Red Lv.5 for 4 | Catalog `evoCosts`; engine ordinary evolution route | Public legal evolution checks memory 4 → 0, top card, source stack, and evolution draw. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | The exact-ceiling and breeding-boundary cases trigger it through public `digivolve` intents. |
| Delete one opposing Digimon at 6000 DP or less | `Delete`, opponent Digimon target, `count: 1`, `dpCeiling: 6000` | Exact scaled boundary deletes only one eligible target and preserves the other. |
| Add 2000 for every opposing Digimon in play | `dpCeilingScaling`, `per: 1`, `amount: 2000`, opponent Digimon `zone: "battleArea"` | Two opposing battle-area Digimon raise the ceiling to 10000; 10001 survives, while a breeding Digimon does not raise it. |
| `[All Turns]` opponent Digimon deletion watcher | `SubTrigger(event: "onDeletionOf")`, `sourceFilter.controller: "opponent"` | Real turn-loop tests arm the watcher and distinguish opponent deletion from own deletion. |
| `if you have a Tamer in play` | Outer SubTrigger `condition.kind: "youHave"`, own Tamer in battle area | Tamer-positive and no-Tamer negative flows are resolved after the real turn timing. |
| Delete one opposing Digimon with highest DP | Nested `Delete`, opponent Digimon, `superlative: "highestDP"`, `count: 1` | 7000 DP is selected over 6000/5000/3000/2000 targets; same-turn second deletion is ignored. |
| `[Once Per Turn]` | Outer effect `frequency: "OncePerTurn"` | The test proves same-turn refusal and activation again on the next own turn. |

The module is residual-free (`coverage: "full"`, `residual: []`) and registers
executable behavior exclusively through `registerIrCard("EX4-012", compiled)`.
No production implementation change was required.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-012.test.ts`](../../apps/api/src/cards/EX4/EX4-012.test.ts).

- Catalog and IR assertions cover identity, all printed text, target filters,
  scaling zone/controller, Tamer condition, source filter, and once-per-turn
  frequency.
- The legal Red Lv.5 evolution uses an ordinary main-deck Digimon source. It
  asserts memory payment, the ordinary evolution draw, resulting top-card
  identity, and the retained source instance.
- The non-Red Lv.5 route is rejected with `invalid-evolution`; memory, source
  top card, hand, and deck remain unchanged.
- The public When Digivolving flow proves the exact 10000 ceiling produced by
  two opposing battle-area Digimon and deletes exactly one target.
- The 10001 boundary includes an opposing breeding Digimon. The 10001 target
  survives and the breeding permanent remains separate, proving the scaling
  pool is battle area only.
- The real turn-loop watcher flow proves the highest-DP deletion, same-turn
  once-per-turn refusal, and reset on the next own turn. It also settles the
  nested deletion before assertions.
- Separate negative flows prove that the watcher does not activate without an
  own Tamer and does not treat deletion of one of your own Digimon as an
  opponent deletion.
- Fixtures use only ordinary Digimon/Tamer cards in decks; no Digi-Egg is in a
  deck or security, no numeric security fixture is used, and no injected timing
  helper is used to claim card behavior.

Relevant peers inspected were EX4-007/008/009 for public evolution, draw, and
source-stack proof; EX4-002 for real-turn once-per-turn reset; and EX4-065 for
opponent-deletion SubTrigger vocabulary. No shared engine seam was changed.

#### Verification commands and results

Static source queries completed:

```text
node tools/kb/query.mjs card EX4-012
node tools/kb/query.mjs rules "in play"
node tools/kb/query.mjs rules "highest DP"
node tools/kb/query.mjs rules "digivolution draw one card evolution source stack"
node tools/kb/query.mjs rules "once per turn next turn reset"
node tools/kb/query.mjs rules "opponent Digimon deleted highest DP"
```

The coordinator reran the focused suite after correcting a test-only harness
alias misuse (the test was asking `s.perm("highest")` for a permanent already
deleted by the watcher). The corrected test captures the permanent ID before
deletion and uses a real next-own-turn battle deletion to prove the reset.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-012.test.ts --maxWorkers=1 --no-file-parallelism
### passed: 1 file, 8 tests
```

File-only lint, formatting, and diff checks also passed:

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-012.ts apps/api/src/cards/EX4/EX4-012.test.ts
### passed; no findings

pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-012.ts apps/api/src/cards/EX4/EX4-012.test.ts
### passed; all matched files use the correct format

git diff --check -- apps/api/src/cards/EX4/EX4-012.ts apps/api/src/cards/EX4/EX4-012.test.ts docs/audits/EX4-reaudit/EX4-012.md
### passed; no output
```

Expected coordinator command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-012.test.ts --maxWorkers=1 --no-file-parallelism
```

#### Defects, retained reds, and seams

- Defects fixed: no runtime or IR defect found; the colocated test was
  strengthened from injected timing/static-only checks to public evolution and
  real turn-loop evidence.
- Retained reds: no focused or file-quality failures remain; root typecheck and
  collection gates remain coordinator-owned.
- Engine seams: none identified. Production IR supports the scaled deletion,
  battle-area counting, conditional SubTrigger, nested deletion, and
  once-per-turn reset without a shared-engine change.
- Remaining gaps: none for the printed EX4-012 clauses; runtime confirmation is
  coordinator-owned because this lane did not execute tests.

#### Conservative unverified worker score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, local KB query, and applicable comprehensive rules were checked. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR and exclusive registration. |
| Behavioral proof | 2/2 | Legal, boundary, breeding, source/controller, conditional, nested, and once-per-turn tests pass in the focused suite. |
| Peer / stack proof | 2/2 | Legal/illegal public stack proof, real next-own-turn battle reset, and peer comparisons are present and focused-green. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or gate command was performed. |
| **Total** | **8/10** | Worker score with delivery gates intentionally left at zero. |

### EX4-013 — MedievalGallantmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json`.

- Card: `EX4-013`, MedievalGallantmon.
- Red/Green Digimon, level 6, play cost 13, DP 12000, Mega/Data/Warrior.
- Evolution routes: Red level 5 for 4, or Green level 5 for 4.
- Printed text: `[Security] Play this card without battling and without paying the cost. At the end of the turn, return this Digimon to your hand. [On Play][When Attacking] Delete 1 of your opponent's Digimon with 6000 DP or less. If no Digimon was deleted by this effect, suspend 1 of your opponent's Digimon, and that Digimon doesn't unsuspend during your opponent's next unsuspend phase.`
- No inherited text.

Local card query:

```text
node tools/kb/query.mjs card EX4-013
```

Returned Q3450, Q3451, and Q3452. Q3450 says a security-played copy deleted
before turn end remains in trash; Q3451 permits selecting an already suspended
Digimon for the fallback and preventing its next opponent unsuspend; Q3452 says
that when the Security effect is suppressed, the attack proceeds normally and
the checked card is trashed after battle.

The local rules query for `Security effects don't activate` returned the
security-check ordering material in the comprehensive/manual rules, including
Security-effect processing before a Security Digimon battle. End-of-turn
pending processing was also checked in `data/kb/rules/comprehensive.md`.

#### Clause-to-IR-to-proof mapping

| Printed clause | Direct IR | Colocated proof |
| --- | --- | --- |
| Red/Green Lv.5 evolution for 4 | Catalog evolution requirements; `EX4-013.ts` registers the compiled card | Public digivolution cases cover both EX4-009 and EX4-036, assert memory 4 → 0, top card, and source stack. |
| Illegal evolution routes fail | Engine catalog route validation | Public AD1-015 Yellow Lv.5 attempt must return `{ ok: false }` and leave source/top/hand unchanged. |
| `[Security]` | `effects[0].trigger: "Security"`, `isSecurity: true` | Structural assertion plus public opponent attack against a real security card. |
| Play without battling and without paying | `PlayWithoutCost`, `from: ["security"]`, `payCost: false`, `withoutBattle: true` | Real security-check attack confirms MedievalGallantmon enters the owner's battle area without a security battle or cost. |
| Return at end of turn | One-shot `SubTrigger("endOfTurn")` with self-reference and `Return` to hand | Public `advance(...).runTurn(seat)` drives the actual turn loop; no injected end-of-turn trigger remains. |
| Q3450 deletion before end of turn | Self-referenced delayed return | Real security attack, effect deletion, and real turn end leave the card in trash rather than hand. |
| Delete opponent Digimon at 6000 DP or less | `Delete`, opponent Digimon filter, `dp: { op: "lte", value: 6000 }`, count 1 | Public play with exact 6000-DP target deletes it. |
| Fallback when no deletion | Conditional `Suspend` with `ifThisEffectDidNotDelete` and `preventUnsuspend: "opponentNextUnsuspendPhase"` | Public attack against a 7000-DP opponent target leaves it suspended; real owner turn and opponent turn prove the next unsuspend phase does not unsuspend it. Q3451 already-suspended selection is covered. |
| `[When Attacking]` duplicate clause | Separate `trigger: "WhenAttacking"` with the same Delete/Suspend sequence | Public attack fallback path exercises the trigger. |
| Q3452 suppressed Security | Security action is not invoked by engine suppression; no card change needed in EX4-013 IR | Public RagnaLoardmon/EX6-010 attack checks EX4-013; card is not played and is trashed after the normal Security Digimon battle. |

The module is residual-free (`coverage: "full"`, `residual: []`) and has only
the required `registerIrCard("EX4-013", compiled)` registration.

#### Behavioral and peer/stack evidence

The colocated test was strengthened to use public intents and the production
turn loop. The former `fireSubTrigger("endOfTurn")` calls were removed. The
former direct `fireForInstance(SecuritySkill)` setup was replaced by a real
opponent attack and security check. Digi-Egg cards were removed from the
fixtures; all deck/security entries are ordinary non-Digi-Egg cards.

Peers checked include EX4-012/EX4-014 for declarative trigger and source-filter
patterns, and EX6-010 for the Security-effect suppression interaction used by
Q3452. The evolution cases are realistic level-5 source stacks and assert
source identity, top identity, and paid evolution cost. Optional refusal and
inherited-effect cases are not applicable to this card because none of its
printed clauses is optional or inherited.

#### Verification commands and results

The coordinator later confirmed no competing Vitest process and 69% free memory
before running the focused and file-level checks.

Read-only evidence commands completed:

- `node tools/kb/query.mjs card EX4-013` — Q3450/Q3451/Q3452 returned.
- `node tools/kb/query.mjs rules "Security effects don't activate"` — security-check ordering material returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-013.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file passed, 11 tests passed**.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-013.ts apps/api/src/cards/EX4/EX4-013.test.ts` — passed with no findings.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-013.ts apps/api/src/cards/EX4/EX4-013.test.ts` — passed after mechanical formatting normalization.
- `git diff --check` — clean.
- Static search of `EX4-013.test.ts` — no `fireSubTrigger`, `fireForPermanent`, `fireTiming`, or `advance.fire` behavioral helper remains; no Digi-Egg security/deck fixture remains.

Root/API typecheck and collection suites remain coordinator-owned and were not
run in this lane.

#### Defects, retained reds, and seams

- Defects fixed: test-only evidence gaps: injected end-of-turn timing, direct
  SecuritySkill setup, missing Q3452, prohibited Digi-Egg filler, missing
  invalid evolution route, and missing public exact-boundary/evolution stack
  assertions.
- Runtime/IR defect: none identified statically.
- Retained reds: none in the focused suite (11/11 passed).
- Engine seams: none requested; Q3452 uses the existing EX6-010 suppression
  implementation as a peer interaction.
- Remaining gap: coordinator must execute focused tests and quality gates; if
  the real turn loop exposes fixture timing/phase assumptions, revise only the
  allowed EX4-013 test file.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, all printed clauses, Q3450/Q3451/Q3452, and applicable Security/end-of-turn rules were checked. |
| IR trace | 2/2 | Security, no-cost/no-battle play, return watcher, exact DP boundary, fallback condition, and both triggers map to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Public positive/negative, exact boundary, fallback, Q3450/Q3451/Q3452, and real-turn cases pass in the focused suite. |
| Peer / stack proof | 2/2 | Both legal source colors, illegal route, source/top identity, and EX6-010 suppression peer pass in focused runtime proof. |
| Delivery gates | 0/2 | Coordinator-owned; no git write or commit was performed in this lane. |
| **Worker total** | **8/10** | Focused/file checks are green; delivery gates remain coordinator-owned. |

### EX4-014 — Gaossmon

#### Scope and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX4-014`, Gaossmon), blue level-3 Rookie Digimon, play cost 3, 1000 DP, Virus, `[Reptile]/[Blue Flare]` traits, and blue level-2 evolution for cost 0.
- Effect: `[Your Turn][Once Per Turn]` when a card with `[Blue Flare]` is played, draw 1; when a card with `[Twilight]` is played, return 1 Digimon card with DigiXros requirements from your trash to your hand.
- Local KB: `node tools/kb/query.mjs card EX4-014` returned Q3453, Q3454, Q3455, and Q3456.
- Rules references: `data/kb/rules/comprehensive.md` §§7-2 (DigiXros requirements/stacking), 15-4-2/15-4-3 (triggered and simultaneous pending activation), and 15-14-1-1 through 15-14-1-5 (Once Per Turn count and reset on turn change).

#### Q&A ledger

| Q&A | Result | Evidence |
| --- | --- | --- |
| Q3453 | Covered | `EX4-014.test.ts:120-136` plays a Blue Flare Digimon controlled by the opponent during Gaossmon's turn and observes the owner's draw. |
| Q3454 | Covered | `EX4-014.test.ts:229-284` resolves a dual-trait play, then proves the shared Once Per Turn gate suppresses each later separate Blue Flare/Twilight trigger. |
| Q3455 | Covered | `EX4-014.test.ts:138-156` plays Gaossmon itself and observes its Blue Flare draw. |
| Q3456 | Covered | `EX4-014.test.ts:229-264` uses EX4-021's dual traits and observes both the draw and DigiXros-card return. |

#### Clause → IR → behavioral proof

| Printed clause | IR trace | Observable proof |
| --- | --- | --- |
| Blue level-2 evolution, cost 0 | Card catalog route; module has no custom evolution override, so the standard catalog route applies | `EX4-014.test.ts:35-58` evolves from a blue level-2 source, asserts unchanged memory, top-card identity, top-card instance, and preserved source; `:60-81` rejects a level-3/non-blue source without payment or movement. |
| Your Turn / Once Per Turn gate | `EX4-014.ts:18-69`, outer `trigger: "YourTurn"`, `frequency: "OncePerTurn"` | `EX4-014.test.ts:97-173` proves own-turn activation, opponent-play activation during the owner's turn (Q3453), and no activation during the opponent's turn. The dual-trigger case proves one shared frequency across both clauses. |
| Blue Flare play → draw 1 | `EX4-014.ts:22-38`, `SubTrigger` `whenPlayed`, exact trait matcher, `Draw` amount 1 to `mine` | Own, opponent-controlled, self-play, and dual-trait public play cases assert deck/hand movement at `:97-156` and `:229-264`. |
| Twilight play → return 1 own-trash Digimon with DigiXros requirements | `EX4-014.ts:40-65`, exact Twilight `whenPlayed` matcher and own-trash `Return` target with `kind: ["Digimon"]`, `hasDigiXrosRequirements: true`, count 1 | `EX4-014.test.ts:175-203` publicly plays Twilight, returns BT10-024, and leaves a non-DigiXros BT1-009 in trash. |
| No optionality is printed | Neither SubTrigger nor its actions has an `optional` field; the tests use no decline branch for these mandatory clauses | Structural IR assertions at `EX4-014.test.ts:27-32` and `:82-95`; the exact-trait negative at `:205-227` proves unrelated plays do nothing. |

#### Peer / stack proof

- BT10-024 is a real DigiXros-requirement peer used as the return target; BT1-009 is a near/non-qualifying Digimon control. This proves the `hasDigiXrosRequirements` boundary rather than merely returning any Digimon.
- The evolution test checks a real stack source and top/source identity. The invalid route checks the printed blue level-2 boundary and atomic failure.
- The dual-trait play uses EX4-021 and the separate Blue Flare/Twilight controls to exercise simultaneous clause resolution and the shared Once Per Turn gate.
- The non-turn and non-matching-trait cases use public `playCard`/`playInstances` intents; no injected timing helper is used.
- Deck/security cleanup is complete for this card: the former `BT1-001`/`BT1-002`/`BT1-003` deck fixtures are inert main-deck `BT1-009`, and numeric `security: 5` is five explicit `BT1-009` cards. The only remaining BT1-003 is the already-hatched battle-area evolution source at `EX4-014.test.ts:38`, not a deck or Security fixture.

#### Changes

- `apps/api/src/cards/EX4/EX4-014.ts`: unchanged; existing full IR registers exclusively through `registerIrCard("EX4-014", compiled)` with `coverage: "full"` and `residual: []`.
- `apps/api/src/cards/EX4/EX4-014.test.ts`: added runtime full-coverage assertion, top/source and invalid-route evolution assertions, a non-DigiXros trash control, and an unrelated-trait negative; replaced Digi-Egg deck and numeric Security fixtures with inert BT1-009 Digimon.
- No engine, shared, catalog, ledger, RUN, worker-brief, or other-card files were edited.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-014` | PASS — Q3453–Q3456 returned and reviewed. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, effect text, and blue level-2 cost-0 route reviewed. |
| `rg -n 'deck:.*BT1-00[1-8]|security:.*BT1-00[1-8]|security: [0-9]' apps/api/src/cards/EX4/EX4-014.test.ts` | PASS — no forbidden Digi-Egg deck/Security or numeric Security fixtures. |
| Focused Vitest, typecheck, Oxlint, Oxfmt, and `git diff --check` | NOT RUN — coordinator explicitly batches serial verification. |

#### Remaining gaps and score

The module is full compiled IR and all four Q&As have focused public-flow assertions, but this lane did not execute the focused suite or static gates. A production turn-boundary reset is represented structurally by `frequency: "OncePerTurn"` and covered by the rules source, but was not independently executed in this lane. The stack source is an already-hatched battle-area source rather than a full hatch/move production sequence.

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **1/2** (unverified execution; reset boundary not runtime-proven here)
- Peer / evolution-stack proof: **1/2** (stack/source and DigiXros peer controls present; full production hatch flow not run)
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed)

**Conservative unverified lane score: 6/10.**

### EX4-015 — Gaomon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only audit; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-015`).

- Gaomon is a blue level-3 Digimon, play cost 3, 1000 DP, Rookie/Data/Beast,
  with a blue level-2 evolution route for cost 0.
- Main text: `[On Play] Both players draw the top card of their decks.`
- Inherited text: `[Your Turn][Once Per Turn] When an effect adds cards to your
  opponent's hand, gain 1 memory.`
- `node tools/kb/query.mjs card EX4-015 --json` returned no card-specific Q&A,
  errata, banlist entry, or unresolved ruling.
- Comprehensive rules reviewed: §15-4-4 (pending triggered activation),
  §15-5 (trigger conditions), and §15-14-1, especially §15-14-1-5-1 (an
  `[X Per Turn]` count resets when the turn changes).
- The local rules query for `Once Per Turn reset turn change` returned the
  applicable §15-14-1 material. The effect-addition event is represented by the
  engine's `whenEffectAddsToOpponentHand` subtrigger; the public tests cause it
  through Gaomon's own On Play draw rather than injecting the event.

#### Clause → IR → behavioral proof

| Printed clause | Direct implementation | Colocated public proof |
| --- | --- | --- |
| Blue Lv.2 evolution for 0 | Standard catalog route; `EX4-015.ts` has no custom evolution override | `EX4-015.test.ts` evolves from a real blue Lv.2 source and asserts zero memory, top-card identity, instance identity, and preserved source. The adjacent negative rejects a Lv.3 source atomically. |
| `[On Play]` | `effects[0].trigger: "OnPlay"` | Public `playCard` test plays Gaomon from hand and observes one card removed from each deck and the exact top cards in each hand. |
| Both players draw one | Two `Draw` actions, each `amount: 1`, controllers `mine` and `opponent` | The same public play asserts both deck boundaries and both hand identities. |
| Inherited `[Your Turn]` | Second effect has `trigger: "YourTurn"`, `isInherited: true` | Public digivolution from Gaomon into EX4-017 creates a legal stack with Gaomon as source; only the owner’s turn test receives the inherited gain. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` | Two separate public Gaomon plays in the same turn cause two opponent-hand additions but only one memory gain. A production turn-loop test proves the allowance is fresh on the next own turn. |
| When an effect adds cards to opponent’s hand | `SubTrigger(event: "whenEffectAddsToOpponentHand")` | Each public Gaomon On Play draws into the opponent’s hand, then the memory assertions observe the watcher’s effect. An opponent-turn play is a negative path and does not gain memory. |
| Gain 1 memory | Nested `GainMemory` amount 1 | Same-turn and next-turn public memory deltas prove the exact +1 effect after the -3 play cost. |

The module is already residual-free compiled IR with the exclusive
`registerIrCard("EX4-015", compiled)` registration. No production module change
was needed.

#### Peer / stack proof

- EX4-017 Gaogamon is used as the legal blue level-3 → level-4 host. The public
  digivolution flow verifies the complete source-to-top transition before the
  inherited effect is exercised.
- The invalid evolution uses BT1-009 Monodramon (level 3), proving the level
  boundary and no-payment/no-movement failure path.
- A second public stack fixture covers the inherited effect during an opponent
  turn. The reset fixture reaches the same stack through public Gaomon →
  Gaogamon digivolution, provisions ordinary non-Egg deck cards so the real
  loop cannot deck out before the next own turn, and captures the pre-play
  memory. After the second public play settles on the board, the observable
  memory delta is exactly -2: -3 play cost plus +1 inherited gain.
- No Digi-Egg appears in any deck or Security fixture. BT1-003 appears only as
  the already-hatched battle-area source for the legal evolution proof.
- No direct timing or subtrigger firing helper remains in the behavioral tests;
  all effect proof uses public `playCard`/`digivolve` intents, `settle()`, and
  the production `startTurnLoop`/phase intents. `advance.waitForMainPhase` is
  used only to observe the real phase window.
- Optional refusal, Security text, and an inherited effect outside a stack are
  not applicable to this card.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-015 --json` | PASS — no Q&A, errata, banlist entry, or unresolved card ruling. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, route, main text, and inherited text reviewed. |
| Static search for `fireFor`, `fireSub`, `fireTiming`, injected timing imports, Digi-Egg deck/Security fixtures, and numeric Security fixtures | PASS — no prohibited helper or fixture; BT1-003 is board-only evolution source. |
| Focused Vitest (`pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-015.test.ts --maxWorkers=1 --no-file-parallelism`) | PASS — 7/7 tests. |
| API typecheck | NOT RUN — coordinator-owned compiler gate. |
| Oxlint on `EX4-015.ts` and `EX4-015.test.ts` | PASS. |
| Oxfmt check on `EX4-015.ts` and `EX4-015.test.ts` | PASS after formatting the test file. |
| `git diff --check` on the allowed card/report files | PASS. |

#### Defects and remaining gaps

- Fixed test evidence gaps: replaced direct `OnPlay` and subtrigger firing with
  public production intents; added exact deck/hand observations, invalid route,
  legal source/top identity, opponent-turn negative, same-turn Once Per Turn
  boundary, and real turn-reset proof. The reset fixture was corrected to avoid
  production deck-out during the intervening turns.
- No runtime/IR defect identified statically.
- No engine seam is required. API typecheck and collection-level gates remain
  coordinator-owned.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | All catalog fields and both printed clauses were mapped; applicable KB/rules sections were reviewed. |
| IR trace | 2/2 | On Play draws, inherited timing, event name, amount, controller, and Once Per Turn identity map to residual-free compiled IR. |
| Behavioral proof | 2/2 | Focused public execution passes 7/7, covering positive and negative paths, exact deck/hand boundaries, same-turn gating, opponent-turn gating, and the captured next-turn -3/+1 memory accounting. |
| Peer / evolution-stack proof | 2/2 | Focused public execution passes the legal Gaomon → Gaogamon stack, source/top identity, invalid route, and comparable opponent-turn host interaction. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write or commit performed. |
| **Worker score** | **8/10** | Delivery gates remain coordinator-owned. |

### EX4-016 — Greymon

#### Scope and printed contract

EX4-016 is a Blue, level-4 Champion Digimon (play cost 4, 4000 DP) with normal
digivolution routes from a Blue or Black level-3 Digimon for cost 3. Its printed
clauses are:

1. **[On Play]** Reveal the top 3 cards of your deck. Add 1 `[Kiriha Aonuma]`
   and 1 blue or black card with DigiXros requirements among them to the hand;
   trash the rest.
2. **[On Deletion] ＜Save＞** You may place this card under one of your Tamers.
3. **Inherited [When Attacking]** Draw 1 card.

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX4-016`.
The catalog records colors `[Blue]`, kinds `[Digimon]`, level 4, play cost 4,
4000 DP, forms `[Champion]`, attributes `[Virus]`, and types `[Dinosaur,
BlueFlare]`, with Blue Lv.3 and Black Lv.3 evolution costs of 3.

#### Rules and Q&A

`node tools/kb/query.mjs card EX4-016 --json` returned:

- **Q3457:** If only Kiriha or only a qualifying blue/black DigiXros card is
  revealed, the available card is still added. The test `adds the only available
  Kiriha target...` proves this through a public play.
- **Q3458:** If both target categories are revealed, both must be added; the
  player cannot choose only one. The test `publicly plays, reveals exactly
  three...` proves both cards are in hand and only the remaining reveal is in
  trash.

Relevant comprehensive rules reviewed:

- §4-4-2: a card placed under a Tamer with an existing stack goes to the
  bottom unless otherwise specified.
- §15-15-3-1 and §15-15-3-4: revealed cards remain a single process until all
  are placed; revealing itself is not trashing.
- §15-16-4-1 and §15-16-5-1: On Deletion triggers at deletion and When Attacking
  triggers on attack declaration.
- §16-20-1 through §16-20-3: Save places this card under one of your Tamers and
  the processing is optional.

#### IR trace

`apps/api/src/cards/EX4/EX4-016.ts` registers only through
`registerIrCard("EX4-016", compiled)`. `runtimeCompiledCard("EX4-016")` is
`coverage: "full"` with an empty residual list.

| Printed clause | IR mapping | Focused proof |
| --- | --- | --- |
| On Play reveal top 3; add Kiriha and one Blue/Black DigiXros card; trash rest | `OnPlay` → `RevealAdd`, `revealCount: 3`, two `count: 1` hand filters, `rest: "trash"` | Both-target Q3458 play; one-target Q3457 play; non-DigiXros negative |
| On Deletion Save | `OnDeletion` keyword `Save` plus optional self `PlaceUnder`; runtime registration normalizes position to `bottom`; destination filter is own Tamer | Public battle deletion with Save accepted and declined |
| Inherited When Attacking draw | `WhenAttacking`, `isInherited: true`, `Draw` mine amount 1 | Public attack from the EX4-016 host |

No module defect was identified. The positionless `PlaceUnder` in the source
module is intentionally normalized by the registration seam to
`position: "bottom"`; the updated static assertion checks the runtime record.

#### Behavioral and stack proof added

`apps/api/src/cards/EX4/EX4-016.test.ts` now uses public `playCard`, `digivolve`,
and `attack` intents. It does not fire timing internals and does not place
Digi-Egg cards in a main deck or security stack. The inherited attack fixture
uses EX4-016 beneath a host (so the inherited clause is active), and the Save
battle fixtures use a suspended defender (the public attack legality condition).

- Public play spends the exact cost 4, reveals only the top 3, adds both
  Kiriha and a blue DigiXros card, trashes the third, and leaves the fourth
  card untouched.
- Q3457 proves a single available target is still added.
- A blue card without DigiXros requirements is rejected and all three reveals
  are trashed.
- Both legal evolution routes (Blue Lv.3 `BT1-028` and Black Lv.3 `BT2-052`)
  spend exactly 3 memory, draw the mandatory evolution card, preserve the
  permanent/source instance stack, and leave no pending decision.
- A Red Lv.3 source is rejected without memory/card movement or bonus draw.
- A public attack proves the inherited draw from the evolved top card.
- A public battle deletion proves accepted Save places the deleted instance at
  the bottom of the controller's Tamer stack, never under the opponent's
  Tamer; declining Save leaves the instance in trash.

Peer checks: EX4-015 and EX4-017 use the same ordinary/inherited timing split
with distinct draw/return clauses; EX4-014 demonstrates public trait-triggered
subtriggers; BT19-076 and BT19-068 provide Save/reveal peers. EX4-016's exact
name and color+DigiXros filters remain narrower than those peer filters and are
asserted directly.

#### Verification status

Commands executed after the fixture corrections, with no other Vitest process
active and `memory_pressure -Q` reporting 67% free memory:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-016.test.ts --maxWorkers=1 --no-file-parallelism
Test Files 1 passed; Tests 10 passed

pnpm exec oxlint apps/api/src/cards/EX4/EX4-016.ts apps/api/src/cards/EX4/EX4-016.test.ts
passed
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-016.ts apps/api/src/cards/EX4/EX4-016.test.ts
passed
git diff --check -- apps/api/src/cards/EX4/EX4-016.ts apps/api/src/cards/EX4/EX4-016.test.ts
passed
```

No compiler/typecheck or collection suite was run in this lane. No git write
was performed.

#### Worker score

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, comprehensive Save/reveal/timing rules, Q3457/Q3458 |
| IR trace | 2/2 | Full residual-free runtime IR and clause mapping |
| Behavioral proof | 2/2 | Public reveal boundaries, Q&A paths, inherited draw, optional Save accept/decline |
| Peer/stack proof | 2/2 | Blue/Black legal routes, Red invalid route, source identity, cost and bonus draw, Save stack destination |
| Delivery gates | 0/2 | Coordinator-owned and intentionally not run |
| **Total** | **8/10** | Conservative worker maximum |

Remaining action: coordinator should run the focused EX4-016 test and the
collection/typecheck/style gates before ledger acceptance.

### EX4-017 — Gaogamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only static/audit lane; no git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-017`).

- Gaogamon is a blue level-4 Digimon, Champion/Data/Beast, 5000 DP, play cost
  5, with one blue level-3 evolution route costing 2 memory.
- Main text: `[When Digivolving] Return 1 of your opponent's level 3 Digimon
  to its owner's hand.`
- Inherited text: `[Your Turn][Once Per Turn] When an effect adds cards to your
  opponent's hand, gain 1 memory.`
- The card has no Security text, alternate evolution requirement, optional
  wording, draw/top-deck effect, or card-specific cost/duration clause beyond
  the catalog evolution route and the inherited memory gain.

`node tools/kb/query.mjs card EX4-017` returned no knowledge-base entries. No
card-specific Q&A, errata, restriction, or unresolved ruling was found.

The following comprehensive rules were read directly from
`data/kb/rules/comprehensive.md`:

- §§4-7-1 through 4-7-7: stack identity and bottom cards contributing to the
  top card's information;
- §§4-14-1 through 4-14-2: drawing places cards from deck into hand;
- §§8-1-2-6 and 8-1-3-1 through 8-1-3-3: legal route validation, payment,
  placement on top, and the mandatory evolution bonus draw;
- §§15-3-1 through 15-3-3: inherited effects are gained from a card in the
  digivolution stack;
- §§15-5-1 through 15-5-3: trigger conditions, one trigger per condition, and
  trigger activation as soon as the condition is met;
- §§15-14-1-1 through 15-14-1-5-1: Once Per Turn counting and reset on turn
  change;
- §15-16-8-1: `[Your Turn]` is limited to the owner's turn;
- §§16-8-1 through 16-8-3: draw processing is mandatory.

The local rules queries used were:

```text
node tools/kb/query.mjs rules 'return a level 3 Digimon to its owner hand'
node tools/kb/query.mjs rules 'Once Per Turn resets when the turn changes'
node tools/kb/query.mjs rules 'effect adds cards to opponent hand'
node tools/kb/query.mjs rules 'digivolution draw card source stack'
```

The rules query returned the applicable comprehensive trigger, hand, Once Per
Turn, and evolution sections. No additional card-specific ambiguity remains.

#### Clause → IR → observable proof

| Printed clause | Direct IR | Colocated public proof |
| --- | --- | --- |
| Blue level-3 evolution for 2 | Catalog `evoCosts`; no module override | Public `digivolve` uses blue `BT1-030`, observes memory `5 → 3` after cost 2 (the top card's inherited text is not active on itself), and preserves the stack. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | The legal public evolution resolves the return after `settle()`; the separate inherited-host cases prove the memory reaction. |
| Return 1 | `Return` action with `count: 1` | The positive case returns exactly one opposing level-3 while one level-4 remains in play. |
| Your opponent's level 3 Digimon | `target.filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }` | Opposing `BT1-009` (level 3) returns; opposing `BT4-010` (level 4) remains. The own source is not in the target pool. |
| To its owner's hand | `to: "hand"`; shared `returnToHand` routes cards by their owner seat | The returned opposing card is observed in player 1's hand after effect resolution. |
| Inherited `[Your Turn]` | Second effect has `trigger: "YourTurn"`, `isInherited: true` | Public stack fixtures place EX4-017 under `BT1-030`; the inherited watcher reacts to a public EX4-015 On Play effect. |
| Once Per Turn | `frequency: "OncePerTurn"` | Two public effect-driven additions in one own turn produce one gain; a real turn loop proves a fresh gain on the next own turn. |
| When an effect adds cards to your opponent's hand | `SubTrigger(event: "whenEffectAddsToOpponentHand")` | Public EX4-015 plays add cards to the opposing hand through effect Draw; the interpreter's gate matches the recipient seat as the source's opponent and excludes normal draw-phase draws. An opponent-turn play is a negative. |
| Gain 1 memory | Nested `GainMemory`, `amount: 1` | Memory deltas in the same-turn, opponent-turn, and reset cases assert the exact gain after play costs. |

The module is full compiled IR (`coverage: "full"`, `residual: []`) and
registers exclusively through `registerIrCard("EX4-017", compiled)`. No
runtime module defect was found.

#### Behavioral and stack evidence authored

Test file: [`apps/api/src/cards/EX4/EX4-017.test.ts`](../../apps/api/src/cards/EX4/EX4-017.test.ts).

- Catalog identity and exact residual-free IR are asserted.
- A legal public blue level-3 → EX4-017 evolution asserts the 2-memory cost,
  mandatory evolution draw (`BT1-010` reaches hand), top-card identity,
  preserved source (`BT1-030` remains in the stack), exact level-3 return, and
  level-4 boundary negative. Because the newly evolved EX4-017 is the top card,
  its inherited text is not active on itself; the observed memory is `5 - 2 = 3`.
- A public illegal red level-3 route (`BT1-009`) is rejected with
  `invalid-evolution`; memory, deck, hand, top card, and stack remain unchanged.
- A constructed inherited stack (`BT1-030` carrying EX4-017) uses two public
  EX4-015 plays to add to the opponent's hand. The first gives +1 memory and
  the second is refused by the same-turn Once Per Turn limit.
- An EX4-015 play during the opponent's turn still adds to the EX4-017
  controller's hand, but gives no inherited memory because `[Your Turn]` is not
  active.
- A real `startTurnLoop()`/`waitForMainPhase()` sequence ends both players'
  phases and proves the Once Per Turn allowance re-arms on the next own turn.
- All asynchronous effect paths use `settle()` before assertions. No direct
  `fireForPermanent`, `fireSubTrigger`, or timing injection remains.
- No Digi-Egg card appears in deck or Security fixtures; no numeric Security
  fixture is used. Security text and optional refusal are not applicable to
  this card.

#### Peer and engine evidence

- `EX4-015` is the closest inherited-effect peer: it carries the identical
  `YourTurn`/`whenEffectAddsToOpponentHand`/`GainMemory 1`/`OncePerTurn`
  vocabulary, and its public tests establish the same effect-addition route.
- `EX4-019` is the adjacent return-to-hand evolution peer. Its IR uses the same
  opponent Digimon target and `to: "hand"` primitive, while its tests cover an
  exact level boundary.
- `apps/api/src/engine/effects/interpreter/actions/subTrigger.ts` gates
  `whenEffectAddsToOpponentHand` on the hand recipient being different from the
  watcher source owner, and `YourTurn` supplies the turn ownership boundary.
- `apps/api/src/engine/effects/primitives.ts` fires the event for effect-driven
  `returnToHand` and `draw` hand additions, once per recipient seat, and does
  not route normal draw-phase draws through these seams.

#### Defects, retained reds, and remaining gaps

- Defects fixed: strengthened only `EX4-017.test.ts`; replaced direct injected
  timing with public evolution/play intents and added route cost, bonus draw,
  top/source identity, invalid route, exact target boundary, same-turn refusal,
  opponent-turn negative, and next-own-turn reset evidence.
- Runtime module changes: none.
- Engine/shared changes: none.
- Retained reds: none. The corrected focused suite passed all six tests.
- Remaining gap: a full hatch/move-from-breeding sequence was not authored;
  the constructed inherited stack is legal and source-preserving.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-017` | PASS — no card-specific entries. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, text, and blue level-3 cost-2 route reviewed. |
| Static scan for injected timing, Digi-Egg deck/Security fixtures, and numeric Security fixtures | PASS — none present in the rewritten focused test. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-017.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 6 tests. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-017.ts apps/api/src/cards/EX4/EX4-017.test.ts` | PASS — no findings. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-017.ts apps/api/src/cards/EX4/EX4-017.test.ts` | PASS — both files formatted. |
| `git diff --check` | PASS — no whitespace errors. |
| API typecheck and collection suites | NOT RUN — not requested for this focused card correction. |

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, no-card-Q&A result, and applicable evolution, stack, inherited, hand, turn, trigger, and Once Per Turn rules were reviewed. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive `registerIrCard`; no runtime change was required. |
| Behavioral proof | 2/2 | Public positive, exact target boundary, cost/draw/hand endpoints, opponent-turn negative, same-turn cap, and real reset proof pass. |
| Peer / evolution-stack proof | 2/2 | EX4-015/EX4-019 peers and a legal source/top stack with invalid route are covered and pass focused execution. |
| Delivery gates | 0/2 | Coordinator-owned; no Git writes or commit performed. |
| **Worker score** | **8/10** | Delivery gates remain coordinator-owned by the worker brief. |

### EX4-018 — MailBirdramon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only audit; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-018`).

- MailBirdramon is a blue level-4 Digimon, play cost 5, 5000 DP, with blue
  level-3 cost-3 and black level-3 cost-3 evolution routes, and
  `[Machine]/[Blue Flare]` traits.
- Main text: `[On Play] 1 of your opponent’s Digimon with the lowest level
  gains "[When Attacking] Lose 2 memory" until the end of your opponent’s
  turn. [On Deletion] ＜Save＞ (You may place this card under one of your
  Tamers.)`
- Inherited text: `＜Jamming＞ (This Digimon can't be deleted in battles against
  Security Digimon.)`
- `node tools/kb/query.mjs card EX4-018 --json` returned Q3459 (2024-03-28),
  with no errata, banlist entry, or related restriction.
- Q3459 states that when the initially selected lowest-level Digimon
  digivolves and another Digimon becomes lowest level, the originally
  specified Digimon keeps the granted `[When Attacking] Lose 2 memory` effect
  until the end of the opponent's turn.
- Comprehensive rules reviewed: §4-7-1/4-7-7 (stacked cards and inherited
  information), §4-15-1/4-15-2 (deletion and On Deletion timing), §6-5-1
  (public Main actions), §8-1-1/8-1-2-6/8-1-3-2/8-1-3-3 (legal route, failed
  route atomicity, cost, stack and draw), §11-1-2/11-1-4 and §11-2-1
  (turn-player attack declaration and When Attacking timing), §15-9-2
  (optional processing), §15-10-2-1 (one target), §15-11-1-2 (individual
  processing), §15-16-2/§15-16-4/§15-16-5 (On Play, On Deletion, When
  Attacking), §16-9-1/§16-9-2 (persistent Jamming), and §16-20-1/§16-20-3
  (Save destination and optionality).
- §3-1-3-1-1/§3-1-3-1-4 and §15-11-1-2 provide the relevant identity boundary:
  a card moved between areas becomes a new card, while a card remaining in a
  stack does not. The Q3459 test keeps the same permanent and checks the
  originally selected identity after digivolution.

#### Clause → IR → behavioral proof

| Printed clause | Direct implementation | Colocated public proof |
| --- | --- | --- |
| Blue Lv.3 for 3 or black Lv.3 for 3 evolution | Standard catalog evolution routes; no custom override in `EX4-018.ts` | `EX4-018.test.ts:185-224` legally digivolves from blue EX4-015, asserts memory cost/top/source identity, and rejects red BT1-009 without payment or movement. |
| `[On Play]` | `effects[0].trigger: "OnPlay"` | `EX4-018.test.ts:63-98` and `:122-183` play MailBirdramon from hand through `applyIntent`, then attack through the public attack intent. |
| One opponent Digimon with the lowest level | `GrantAuraToOpponents`, opponent Digimon filter, `superlative: "lowestLevel"`, `count: 1` | `:63-93` uses a level-3 and level-4 opponent and proves the level-3 target; `:117-167` adds a new lower-level candidate after the original target digivolves. |
| Granted `[When Attacking] Lose 2 memory` | `effectText: "[When Attacking] Lose 2 memory"` in the aura action | `:63-98` observes the exact -2 delta after the selected Digimon attacks; `:122-183` observes the custom-effect grant token and proves the non-selected new lowest target does not change memory. |
| Grant lasts until end of opponent's turn | `duration: "untilOpponentTurnEnd"` | `:231-287` uses two production `runOneTurn()` loops: first opponent turn loses 2, then after the opponent turn and a complete owner turn the same Digimon attacks without the grant. |
| `[On Deletion] ＜Save＞` | `effects[1].trigger: "OnDeletion"`, `keywords: [{ keyword: "Save" }]` | `:259-278` deletes MailBirdramon and observes the exact instance under a Tamer rather than in trash. |
| Save is optional and places this card under one own Tamer | `PlaceUnder` self target, own Tamer `underFilter`, `optional: true` | `:46-54` checks action shape; `:259-278` accepts; `:280-300` declines and observes the card remains in trash. |
| Inherited Jamming | inherited `Static` effect with `keyword: "Jamming"` | `:100-120` uses a legal EX4-018 → EX4-019 stack with EX4-018 beneath the top card, checks the inherited keyword, attacks Security HerculesKabuterimon, and confirms the attacker survives. |

There is no draw clause, Security clause, or Once Per Turn clause on this card;
the stack test covers the applicable source/top/cost boundary, and no draw or
once-per-turn reset is claimed as card behavior.

#### Q&A ledger

| Q&A | Result | Evidence |
| --- | --- | --- |
| Q3459 | Passed | `EX4-018.test.ts:122-183` plays MailBirdramon, digivolves the originally selected lowest-level target, adds a new lower-level Digimon, then proves the original target still loses 2 memory while the new candidate does not. |

#### Peer and stack proof

- EX4-015 is the legal blue level-3 peer/source for the explicit
  evolution-cost/source test. The Jamming proof uses the legal EX4-018 →
  EX4-019 stack, with EX4-018 beneath the top card as required for inherited
  behavior. BT1-009 is a red level-3 near-match and is used only for the
  invalid-route negative and inert fixture control.
- The legal stack checks top-card identity, source stack identity, and exact
  3-memory evolution cost. The invalid stack checks no payment, no movement,
  and unchanged source top card.
- The Q3459 stack keeps a single permanent through digivolution, proving that
  the aura is bound to the original selected permanent rather than recomputed
  onto the newly lowest Digimon.
- All deck/Security fillers in this file are main-deck Digimon. No `BT1-001`–
  `BT1-008`, ST Digi-Egg, or numeric Security fixture remains.
- Behavioral effect windows use public `playCard`, `digivolve`, `attack`, and
  production `runOneTurn`/phase intents. `advance(...).verb.deletePermanent`
  is retained only to cause the card's actual On Deletion event for Save proof.

#### Changes

- `apps/api/src/cards/EX4/EX4-018.ts`: unchanged; existing residual-free IR
  registers exclusively through `registerIrCard("EX4-018", compiled)`.
- `apps/api/src/cards/EX4/EX4-018.test.ts`: replaced prohibited Digi-Egg
  Security fillers; replaced injected On Play/When Attacking timing with public
  intents; corrected aura observation to the custom-effect grant ledger;
  corrected the legal blue Lv.3 source and inherited stack orientation; added
  catalog/IR assertions, legal/illegal evolution proof, Q3459 target-lock
  proof, duration expiry, and Save refusal.
- No engine, shared, catalog, ledger, RUN, worker brief, or other-card files
  were edited.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-018 --json` | PASS — Q3459 returned and reviewed. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, routes, costs, traits, main text, and inherited text reviewed. |
| `rg -n 'BT1-00[1-8]|ST[0-9]+-0[1-9]|security: [0-9]|fireForPermanent|fireTiming|fireSubTrigger' apps/api/src/cards/EX4/EX4-018.test.ts` | PASS — no prohibited Digi-Egg deck/Security, numeric Security, or injected timing helper remains. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-018.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 11 tests passed, serial focused run. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-018.ts apps/api/src/cards/EX4/EX4-018.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-018.ts apps/api/src/cards/EX4/EX4-018.test.ts` | PASS — both files formatted. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-018.ts apps/api/src/cards/EX4/EX4-018.test.ts docs/audits/EX4-reaudit/EX4-018.md` | PASS. |
| API typecheck | NOT RUN — coordinator-owned and no shared/module type seam changed. |

#### Remaining gaps and score

The first coordinator rerun exposed two fixture/observation defects (EX4-017
was level 4 rather than level 3; inherited Jamming was tested with EX4-018 on
top; custom grants were incorrectly observed as subscriptions). Those were
corrected without engine/module changes. The final focused run and changed-file
static gates passed.

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | All catalog fields and Q3459 plus applicable timing, target, stack, optionality, Jamming, and Save rules were reviewed. |
| IR trace | 2/2 | On Play target/lowest-level/count, granted text/duration, Save destination/optionality, inherited Jamming, full coverage, and zero residuals map directly to the module. |
| Behavioral proof | 2/2 | Public positive, exact target boundary, Q3459, expiry, Save accept/refusal, and Jamming cases passed in the focused suite. |
| Peer / evolution-stack proof | 2/2 | Legal EX4-015 source and EX4-018 → EX4-019 inherited stack, source/top/cost assertions, red-route negative, and Security Jamming peer passed. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write or commit performed. |
| **Worker score** | **8/10** | Focused and changed-file gates passed; delivery remains coordinator-owned. |

### EX4-019 — MachGaogamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only static/audit lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-019`).

- MachGaogamon is a blue level-5 Digimon, Ultimate/Data/Cyborg, 7000 DP, and
  play cost 7.
- Its ordinary evolution route is blue level 4 for 3 memory. There is no
  alternate route in `digivolutionRequirementsFor("EX4-019")`.
- Main text: `[When Digivolving] Return 1 of your opponent's level 4 or lower
  Digimon to its owner's hand.`
- Inherited text: `[When Attacking][Once Per Turn] If your opponent has 8 or
  more cards in their hand, unsuspend this Digimon.`
- There is no Security text, optional wording, draw/top-deck clause, duration,
  or card-specific Q&A attached to this card.

`node tools/kb/query.mjs card EX4-019` returned no knowledge-base entries. The
set index also records no Q&A for EX4-019; no errata, restriction, or card-
specific ambiguity was found.

The following local rules were read in `data/kb/rules/comprehensive.md`:

- §§2-3-5-1 through 2-3-5-3: evolution requirements and evolution cost;
- §§3-1-3-1-1 through 3-1-3-1-4: moved cards become new cards while cards in
  a stack retain their stack identity;
- §§4-7-1 through 4-7-7: stacked cards and top-card information;
- §§4-14-1 through 4-14-2 and §§16-8-1 through 16-8-3: draw is from deck to
  hand;
- §§8-1-2-6 and 8-1-3-1 through 8-1-3-3: failed route atomicity, payment,
  placement on top, and the mandatory evolution draw;
- §§11-1-2 through 11-2-3 and §15-16-5-1: public attack declaration and
  `[When Attacking]` timing;
- §§15-3-1 through 15-3-3: inherited effects come from cards in the
  digivolution stack;
- §§15-5-1 through 15-5-3 and §§15-8-3-1 through 15-8-3-4: trigger conditions
  and trigger timing;
- §§15-14-1-1 through 15-14-1-5-1: Once Per Turn counting and reset when the
  turn changes;
- §15-16-3-1: `[When Digivolving]` timing.

The local rules queries used were:

```text
node tools/kb/query.mjs rules 'digivolution cost draw 1 card stack'
node tools/kb/query.mjs rules 'When Attacking Once Per Turn unsuspend'
node tools/kb/query.mjs rules 'return opponent Digimon level 4 or lower hand'
```

They returned the applicable comprehensive evolution, draw, stack, attack,
trigger, hand, and Once Per Turn sections. No card-specific ruling remains
unresolved.

#### Clause → IR → observable proof

| Printed clause | Direct IR / catalog source | Colocated public proof |
| --- | --- | --- |
| Blue level-4 evolution for 3 | Catalog `evoCosts`; no custom module override | `EX4-019.test.ts:64-105` uses a public `digivolve` intent, asserts memory 3→0, mandatory evolution draw, top card, and preserved source. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | The public evolution resolves the effect after `settle()`. |
| Return 1 | `Return` action with `count: 1` | Exactly one opposing level-4 target leaves play; the opposing level-5 remains. |
| Your opponent's level 4 or lower Digimon | Opponent Digimon filter plus `levelComparison: { op: "lte", value: 4 }` | `BT1-033` (level 4) returns while `BT1-038` (level 5) remains. |
| To its owner's hand | `to: "hand"`; shared return primitive routes by owner | The target's instance is observed in player 1's hand after effects settle. |
| Inherited `[When Attacking]` | Second effect has `trigger: "WhenAttacking"`, `isInherited: true` | A legal `BT1-038` host carries `EX4-019` under it and attacks through the public attack intent. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` | Same-turn second public attack leaves the host suspended; a production turn-loop transition allows the next own turn's attack to unsuspend it again. |
| If opponent has 8 or more hand cards | `zoneCount`, opponent hand, `gte`, `8` | Exactly eight opposing cards unsuspends; seven cards does not. |
| Unsuspend this Digimon | Self-only `Unsuspend` target (`isSelfRef`, `isSelf`) | Settled public attack state observes the host unsuspended at the positive boundary. |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers exclusively with `registerIrCard("EX4-019", compiled)`. No
runtime module defect was found statically.

#### Behavioral and stack evidence authored

Test file: [`apps/api/src/cards/EX4/EX4-019.test.ts`](../../apps/api/src/cards/EX4/EX4-019.test.ts).

- Catalog identity and exact IR are asserted, including the mandatory nature of
  the return action (no `optional` flag), level boundary, controller, hand
  destination, self target, inherited marker, and Once Per Turn frequency.
- A public blue level-4 → EX4-019 stack asserts the exact 3-memory cost, the
  ordinary evolution draw (`BT1-013` reaches hand and `BT1-014` remains on
  deck), top-card identity, source identity (`BT1-032` remains under the new
  top), exact level-4 return, and level-5 exclusion.
- A public red level-4 route is rejected with `invalid-evolution`; memory,
  source top card, hand, and deck remain unchanged.
- Public attacks prove the exact eight-card threshold and seven-card negative.
- A production `startTurnLoop()` proves the same-turn Once Per Turn refusal and
  reset on the owner's next turn.
- Fixtures use inert main-deck Digimon only. No Digi-Egg appears in a deck or
  Security fixture, and no numeric Security fixture is used. No injected
  timing helper is used for behavioral proof.
- No optional refusal, Security behavior, duration, or top-deck clause applies
  to this card.

#### Peer and engine evidence

- `EX4-017` is the adjacent blue level-4 return-to-hand peer; its module uses
  the same opponent/controller and hand-destination vocabulary with a tighter
  level-3 boundary.
- `EX4-022` is the adjacent blue Cyborg return-to-hand peer; its
  `[When Digivolving]` return uses the same `Return` action and hand route,
  while its tests establish the neighboring level boundary.
- `EX4-021` and `apps/api/src/engine/combat/reattackAndReboot.test.ts` exercise
  EX4-019 as an inherited stack source in public attacks; the focused test adds
  the missing exact threshold and same-turn/next-turn Once Per Turn proof.
- The shared interpreter's `zoneCount` condition supplies the live opponent
  hand boundary, and its inherited watcher/Once Per Turn machinery matches the
  direct IR shape. No engine seam was identified.

#### Defects, retained reds, and remaining gaps

- Defects fixed: strengthened only `EX4-019.test.ts`; replaced direct injected
  timing with public evolution/attack intents and added catalog evidence,
  evolution route/cost/draw/top/source proof, invalid-route atomicity, exact
  level and hand-count boundaries, and Once Per Turn reset.
- Runtime module changes: none.
- Engine/shared changes: none.
- Retained reds: focused execution is intentionally unverified in this worker
  lane because the coordinator batches tests serially.
- Remaining gap: no card-specific KB Q&A exists. A full breeding-area hatch
  sequence is not needed for this card's ordinary blue level-4 route; the legal
  battle-area stack covers the printed route and inherited-source behavior.

#### Verification commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-019` | PASS — no card-specific entries. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, route, costs, text, and absence of Security/optional clauses reviewed. |
| Rules queries listed above | PASS — applicable evolution, draw, stack, attack, trigger, hand, and Once Per Turn sections returned and reviewed. |
| Static scan for Digi-Egg fixtures/injected timing | PASS — no `BT1-001`–`BT1-008`, `fireForPermanent`, `fireTiming`, or `fireSubTrigger` remains in the focused test. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-019.ts apps/api/src/cards/EX4/EX4-019.test.ts docs/audits/EX4-reaudit/EX4-019.md` | PASS — no whitespace errors. |
| Focused Vitest, API typecheck, Oxlint, Oxfmt | NOT RUN — coordinator explicitly batches serial verification and instructed this lane not to run tests/compiler/lint/format. |

#### Conservative worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, no-card-Q&A result, and applicable evolution, draw, stack, attack, inherited, hand, trigger, and Once Per Turn rules were reviewed. |
| IR trace | 2/2 | Both printed clauses map exactly to residual-free IR and exclusive `registerIrCard`; no runtime change was required. |
| Behavioral proof | 1/2 | Public positive/boundary/negative/stack/reset tests are authored, but focused execution is intentionally unverified. |
| Peer / evolution-stack proof | 1/2 | Adjacent EX4 peers, legal source/top/cost/draw stack, invalid route, and inherited host are covered in code; runtime execution is coordinator-unverified. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write or commit performed in this lane. |
| **Conservative unverified lane score** | **6/10** | Worker report is capped below delivery-complete until coordinator verification. |

### EX4-020 — MetalGreymon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only audit; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-020`).

- MetalGreymon is a blue level-5 Digimon, play cost 7, 7000 DP, Ultimate,
  Virus, Cyborg/Blue Flare.
- Ordinary evolution routes are blue level 4 for 4 or black level 4 for 4.
- Main text: `[On Play]` gain Rush for the turn; if DigiXrosing, trash up to 2
  digivolution cards of 1 opposing Digimon.
- The catalog's normalized `effectText` omits the special-play header and
  keyword glyphs. The official EX04 card list and the card's compiled peer
  shape establish the omitted header as `DigiXros -2: Blue [Greymon] ×
  [MailBirdramon]`, and the module now carries that requirement explicitly.
- Printed keyword: `<Material Save 2>`.
- Inherited text: `[When Attacking] If this Digimon is [GreyKnightsmon], 1 of
  your opponent's Digimon with 3 or fewer digivolution cards can't attack until
  the end of your opponent's turn.`
- `node tools/kb/query.mjs card EX4-020 --json` returned Q3460 (2024-03-28),
  with no errata, banlist entry, or related restriction. Q3460 says the chosen
  target remains unable to attack through the opponent's turn even if it later
  reaches 4 or more digivolution cards.

Applicable local rules reviewed in `data/kb/rules/comprehensive.md`:

- §§7-2-2-1 through 7-2-2-12 and §7-2-3-3: DigiXros declaration, one-of-each
  material slots, cost reduction per material, and “DigiXrosing” only when at
  least one material is placed.
- §§8-1-2-6 and 8-1-3-1 through 8-1-3-3: failed evolution atomicity, payment,
  placement on top, and mandatory evolution draw.
- §§11-1-2 through 11-1-4 and §11-2-1: public attack declaration and
  `[When Attacking]` timing.
- §§15-10-2-1 through 15-10-2-2 and §15-11-1-1 through 15-11-1-3-2:
  one-target/up-to targeting and individual effects continuing after the chosen
  target no longer meets its selection condition.
- §§16-15-1 through 16-15-2: Rush permits an attack on the turn played.
- §§16-21-1 through 16-21-6: Material Save 2 uses cards named by the top
  card's DigiXros requirements, is optional, and places accepted cards at the
  bottom of the Tamer stack.

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated public proof |
| --- | --- | --- |
| Blue Lv.4 for 4 or black Lv.4 for 4 | Catalog `evoCosts`; standard evolution router | `EX4-020.test.ts` route table uses BT10-019 and EX4-044, asserts memory 4→0, draw, top card, permanent identity, and preserved source. |
| DigiXros -2: Blue [Greymon] × [MailBirdramon] | `compiled.digiXrosRequirement`: two slots, blue Greymon color gate, MailBirdramon, count 2 | Public `playCard` DigiXros test pays 3 (7−2×2), stacks EX4-016/EX4-018, and invalid red Greymon route remains in hand with memory unchanged. |
| `[On Play]` Rush for the turn | `OnPlay` `GainKeyword` Rush, `duration: "forTheTurn"` | Public DigiXros and ordinary-play cases settle and observe Rush; the ordinary-play case attacks immediately through the public attack intent. |
| If DigiXrosing, trash up to 2 opposing digivolution cards | `OnPlay` `TrashDigivolution`, opponent Digimon, one target, amount 2, `upTo: true`, bottom-first (`fromTop: false`), `digiXrosCount >= 1` | Public DigiXros case reduces a 3-source target to 1; the optional-decline case reduces it to 2; ordinary play leaves its 2-source target unchanged. |
| `<Material Save 2>` | Static `MaterialSave` keyword amount 2 | Public deletion case accepts Material Save and observes EX4-016/EX4-018 under own BT10-088 Tamer and EX4-020 in trash. |
| Inherited When Attacking GreyKnightsmon clause | `WhenAttacking`, `isInherited: true`, `selfHasName GreyKnightsmon`; one opposing Digimon with `digivolutionCardsAtMost: 3`, `Restrict attack`, `untilOpponentTurnEnd` | Public attack with EX4-021 over EX4-020 restricts the 3-source target and not the 4-source target. After placing a fourth source under the selected target, restriction remains, proving Q3460; after the opponent's public turn ends, the restriction expires. A different stack top with EX4-020 inherited does not activate the clause. |

#### Q&A ledger

| Q&A | Result | Evidence |
| --- | --- | --- |
| Q3460 | Authored, execution pending coordinator rerun | The public attack test selects a 3-source target, asserts the 4-source target is not selected, adds a fourth source to the selected permanent, and asserts attack restriction remains. |

#### Peer and evolution-stack proof

- BT10-024 is the closest implemented DigiXros/Material Save peer: its module
  uses the same exact `[Greymon]`/`[MailBirdramon]` slot vocabulary and its
  tests establish public DigiXros cost/material and selected-target persistence.
- EX4-021 is the adjacent GreyKnightsmon peer and confirms the same
  `selfHasName`/opponent restriction vocabulary, while its own Q3461 behavior
  intentionally differs because it is overall processing with a live level
  filter. EX4-019 supplies the adjacent blue level-5 evolution/draw stack
  pattern.
- Legal stacks use blue BT10-019 and black EX4-044 level-4 sources, assert the
  resulting top card and permanent/source identity, and check the mandatory
  evolution draw. A red BT1-015 level-4 source is rejected atomically.
- The DigiXros fixture uses EX4-016 (blue Greymon) and EX4-018 (MailBirdramon),
  while the invalid fixture uses red BT1-015 to prove the explicit blue gate.
- All deck/Security fixtures are main-deck cards. No Digi-Egg is in a deck or
  Security fixture, no numeric Security fixture is used, and no injected timing
  helper remains in the focused test.

#### Changes and retained gaps

- `apps/api/src/cards/EX4/EX4-020.ts`: added the omitted executable DigiXros
  requirement; registration remains exclusively `registerIrCard("EX4-020", compiled)`.
- `apps/api/src/cards/EX4/EX4-020.test.ts`: replaced injected `fireForPermanent`
  proof with public play, attack, and evolution intents; added catalog/registry
  assertions, exact material/cost route, invalid route, draw/top/source proof,
  optional up-to refusal, ordinary-play negative, Material Save acceptance,
  Q3460 persistence, and duration expiry.
- The committed catalog's missing special-play header is not editable in this
  lane; the direct module now supplies the runtime requirement and the report
  records the source discrepancy rather than treating it as silently absent.
- Focused execution and coordinator gates remain intentionally unverified in
  this worker lane.

#### Verification commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-020 --json` | PASS — Q3460 returned and reviewed. |
| `node tools/kb/query.mjs rules 'DigiXros play cost reduction materials'` | PASS — applicable DigiXros sections returned and reviewed. |
| `node tools/kb/query.mjs rules 'individual processing target condition continues'` | PASS — applicable individual-target persistence sections returned and reviewed. |
| `node tools/kb/query.mjs rules 'Material Save'` | PASS — §§16-21-1 through 16-21-6 returned and reviewed. |
| Catalog lookup and compiled-effects lookup | PASS — identity, routes, costs, text, existing IR, and omitted recipe discrepancy reviewed. |
| Static scan for Digi-Egg, numeric Security, and injected timing | PASS — no prohibited fixture or helper remains in `EX4-020.test.ts`. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-020.ts apps/api/src/cards/EX4/EX4-020.test.ts docs/audits/EX4-reaudit/EX4-020.md` | PASS. |
| Focused Vitest, API typecheck, Oxlint, Oxfmt | NOT RUN — coordinator explicitly batches serial verification and instructed this lane not to run tests/compiler/lint/format. |

#### Conservative worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog identity/routes/text, official special-play discrepancy, Q3460, and applicable DigiXros, evolution, attack, individual-target, Rush, and Material Save rules were reviewed. |
| IR trace | 2/2 | All printed clauses map to residual-free direct IR; the missing DigiXros route was fixed in the card module, with exclusive `registerIrCard`. |
| Behavioral proof | 1/2 | Public positive, optional-decline, boundary, negative, stack, Material Save, and Q3460 tests are authored, but focused execution is intentionally unverified. |
| Peer / evolution-stack proof | 1/2 | BT10-024, EX4-021, and EX4-019 peers plus legal/illegal public stacks are covered in code; runtime execution is coordinator-unverified. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write or commit performed in this lane. |
| **Conservative unverified lane score** | **6/10** | Worker report remains below delivery-complete until coordinator reruns focused and collection gates. |

### EX4-021 — GreyKnightsmon

#### Scope and sources

- Catalog: `packages/shared/src/cards/data/cards.json` (`EX4-021` identity,
  stats, two level-5 evolution routes, and printed effect text).
- Compiled requirement ledger: `packages/shared/src/effects/data.ts` and
  `packages/shared/src/effects/effects.json` (the catalog entry omits the
  DigiXros header, but the committed shared ledger records DigiXros -2:
  Blue `[MetalGreymon]` + `[DarkKnightmon]`).
- Knowledge base: `node tools/kb/query.mjs card EX4-021` returned Q3461.
- Rules read: comprehensive rules 7-2-2-9/10/12 (DigiXros declaration and
  exact material count), 15-8-5 (immediate replacement timing), and
  15-11-2-3-2/3 (dynamic target conditions).
- Peers inspected: EX4-020 MetalGreymon, EX4-022 ZeedGarurumon,
  BT10-066 DarkKnightmon, and replacement/own-stack examples in the shared
  IR data.

#### Printed clauses and evidence mapping

| Printed clause | Direct IR | Behavioral proof |
| --- | --- | --- |
| DigiXros -2: Blue `[MetalGreymon]` + `[DarkKnightmon]` | `compiled.digiXrosRequirement` with two exact slots | `DigiXroses Blue MetalGreymon and DarkKnightmon for a total cost of 8`; red MetalGreymon negative |
| `[On Play] <De-Digivolve 1> 1 of your opponent's Digimon` | `OnPlay` `DeDigivolve`, opponent Digimon, count 1, amount 1 | Public hard play in `plays normally for 12...`; target stack drops from EX4-020 to EX4-016 |
| Then all opponent level 4 or lower Digimon can't attack until opponent turn end | `OnPlay` `Restrict`, opponent Digimon, `levelComparison lte 4`, count `all`, `whileMatchesTargetFilter`, duration `untilOpponentTurnEnd` | Same public-play test proves the existing/new level-4 targets are restricted and Q3461 dynamic boundary: after one target digivolves to level 5 it is unrestricted while the newcomer remains restricted |
| `[All Turns]` when deleted or returned to hand/deck, may play one exact MetalGreymon and one exact DarkKnightmon from this stack without cost | `AllTurns` `Replacement` on `wouldLeavePlay`, self source, two `PlayWithoutCost` actions from `digivolutionCards` with `fromOwnDigivolutionStack`, exact `nameExact` filters, optional | Parameterized public production-verb tests cover deletion, return to hand, and return to deck; cross-stack/name-containing negative and optional decline prove ownership, exactness, and may behavior |

#### Test inventory

`apps/api/src/cards/EX4/EX4-021.test.ts` contains 13 passing tests (the
parameterized cases expand to 13):

- catalog identity, residual-free IR, and exact DigiXros requirement;
- exact On Play and All Turns IR shape;
- Blue and Black legal level-5 evolution routes, cost 5, draw, permanent/top
  identity, and retained source card;
- legal public DigiXros at cost 8;
- public ordinary play at cost 12, De-Digivolve, dynamic restriction, and
  Q3461 level boundary;
- illegal level-4 evolution and non-Blue MetalGreymon DigiXros negatives;
- exact own-stack replacement on deletion, return to hand, and return to deck;
- cross-stack/name-variant negative;
- optional refusal of the leave-play replacement.

Fixtures contain no Digi-Egg cards in deck/security and no numeric security
fixture shortcuts. No injected timing helper is used for the card's On Play
proof; `advance` is used only for effect-driven removal/evolution verbs where
there is no direct player intent for the operation.

#### Defect fixed

The direct module had complete effect actions but omitted the committed
EX4-021 DigiXros requirement. Added the exact two-slot requirement to
`apps/api/src/cards/EX4/EX4-021.ts`, and replaced the prior tests that treated
EX4-021 as non-DigiXros with legal/illegal public DigiXros coverage.

#### Remaining gaps

The catalog JSON's `effectText` omits the DigiXros header even though the
committed shared compiled-requirement ledger contains it; this audit records
the discrepancy and treats the shared requirement ledger plus printed card
identity as authoritative. The generic `wouldLeavePlay` replacement seam has
no destination predicate, so this card-level audit proves the required delete,
hand, and deck paths but does not add an unrelated-destination exclusion case.
No engine/shared seam change was made.

#### Commands and exact results

Resource guard immediately before the final focused run: `memory_pressure -Q`
reported 64% system-wide memory free; no other Vitest process was active.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-021.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests       13 passed (13)

pnpm exec oxlint apps/api/src/cards/EX4/EX4-021.ts apps/api/src/cards/EX4/EX4-021.test.ts
exit 0; no findings

pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-021.ts apps/api/src/cards/EX4/EX4-021.test.ts
All matched files use the correct format.

git diff --check -- apps/api/src/cards/EX4/EX4-021.ts apps/api/src/cards/EX4/EX4-021.test.ts docs/audits/EX4-reaudit/EX4-021.md
exit 0
```

The worker brief makes collection/typecheck coordinator-only; those commands
were not run in this lane. No git write, commit, push, or Orca completion claim
was made.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR trace and registration | 2/2 |
| Behavioral proof | 2/2 |
| Peer/evolution-stack proof | 2/2 |
| Delivery gates (worker lane) | 0/2 |
| **Worker total** | **8/10** |

### EX4-022 — ZeedGarurumon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only audit lane; no Git writes performed.

#### Catalog, Q&A, and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-022`).

- ZeedGarurumon is a blue level-6 Digimon, Mega/Data/Cyborg, 12 play cost,
  and 12000 DP.
- Its ordinary evolution requirement is blue level 5 for 4 memory. There is no
  alternate requirement, Security text, inherited text, optional wording,
  duration, or once-per-turn clause on the evolution effects.
- Main text: `[When Digivolving] Return 1 of your opponent's level 4 or lower
  Digimon to the hand. Then, if they have 8 or more cards in their hand,
  return 1 of their level 6 or higher Digimon to the hand. [All Turns][Once Per
  Turn] When an effect adds cards to your opponent's hand, if you have a
  Tamer, return 1 of your opponent's level 3 Digimon to the hand.`

`node tools/kb/query.mjs card EX4-022` returned Q3462 (2024-03-28): when the
first level-4 return changes the opponent from 7 to 8 cards, the second clause
does activate. The public eight-card evolution test covers that exact boundary.
No errata, restriction, or unresolved card-specific ambiguity was found.

The local comprehensive rules reviewed were:

- §§3-1-3-1-1 through 3-1-3-1-4: cards moved to another area become new cards;
  cards retained in an evolution stack preserve stack identity;
- §§4-26-1 through 4-26-2: “with/have X cards” means the stated count or more;
- §§8-1-3-1 through 8-1-3-3: legal evolution declaration, payment, stacking,
  mandatory draw, and effect timing;
- §§15-5-1 through 15-5-3 and 15-8-3-1: trigger activation and a trigger's
  single activation window;
- §§15-14-1-1 through 15-14-1-5-1: Once Per Turn count and reset on turn change;
- §15-16-3-1: `[When Digivolving]` triggers after the evolution completes.

The local rules queries used were:

```text
node tools/kb/query.mjs rules 'trigger timing when Digivolving'
node tools/kb/query.mjs rules 'Once Per Turn reset turn'
node tools/kb/query.mjs rules 'return to hand opponent Digimon'
```

#### Clause → IR → observable proof

| Printed clause | Direct IR / catalog source | Colocated public proof |
| --- | --- | --- |
| Blue level-5 evolution for 4 | Catalog `evoCosts`; no module override | `EX4-022.test.ts:30-55` uses a public `digivolve` intent, asserts memory 4→0, mandatory evolution draw, top identity, and preserved `EX4-019` source. |
| Illegal non-blue level-5 route fails atomically | Catalog color requirement | `EX4-022.test.ts:57-80` rejects `BT1-021` as the base and asserts memory, top card, stack, hand, and deck are unchanged. |
| `[When Digivolving]` | `effects[0].trigger: "WhenDigivolving"` | `EX4-022.test.ts:105-140` resolves the effect through the public evolution intent. |
| Return 1 opponent level 4 or lower Digimon to hand | First `Return` action, opponent Digimon filter, `lte 4`, `count: 1`, `to: "hand"` | Public evolution returns `EX4-016` and leaves the level-5 peer on the opponent board (`:105-140`). |
| Then, if opponent has 8 or more cards in hand | Second `Return` has `zoneCount` opponent hand `gte 8` | Starting from 7 cards, the first return reaches 8 and the level-6 return resolves; opponent hand is 9 (`:105-140`). Starting from 6, the first return reaches only 7 and the level-6 remains (`:142-173`), matching Q3462. |
| Return 1 opponent level 6 or higher Digimon to hand | Second target filter has opponent Digimon `gte 6`, `count: 1`, `to: "hand"` | The level-6 permanent leaves while a level-5 permanent remains (`:115-139`). |
| `[All Turns][Once Per Turn]` | `AllTurns` effect with `frequency: "OncePerTurn"` | IR shape is asserted at `:87-102`; the effect is exercised by public hand-add actions in the once-per-turn test (`:175-204`). |
| When an effect adds cards to opponent's hand | `SubTrigger` event `whenEffectAddsToOpponentHand` | Public `returnToHand` effect actions fire the watcher (`:197-200`). A second same-turn hand add does not fire another follow-up (`:199-204`). |
| If you have a Tamer | `youHave` filter, controller mine, kind Tamer | The positive fixture has `BT1-089`; the no-Tamer negative at `:206-225` leaves the opponent level-3 in play. |
| Return 1 opponent level-3 Digimon to hand | All-Turns watcher `Return`, opponent Digimon filter `levels: [3]`, `count: 1`, `to: "hand"` | Exactly one level-3 leaves on the first effect hand-add; the once-per-turn second add does not remove the remaining level-3 (`:175-204`). |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers exclusively with `registerIrCard("EX4-022", compiled)` at
`apps/api/src/cards/EX4/EX4-022.ts:90`. No implementation defect was found.

#### Behavioral and stack evidence authored

Test file: [`apps/api/src/cards/EX4/EX4-022.test.ts`](../../apps/api/src/cards/EX4/EX4-022.test.ts).

- Identity and complete IR coverage are asserted (`:9-28`), including the
  exact hand-count condition, level boundaries, Tamer gate, event, and
  Once-Per-Turn marker (`:81-103`).
- The legal blue level-5 → EX4-022 stack proves payment, mandatory draw,
  source-card retention, and top-card identity (`:30-55`).
- The invalid red level-5 route is rejected before payment, movement, draw, or
  trigger (`:57-80`).
- Public evolution proves Q3462's 7→8 transition and the exact 6+ target
  boundary while preserving a level-5 near-match (`:105-140`).
- Public evolution proves the 7-card post-first-return negative (`:142-173`).
- The all-turn Tamer-gated watcher proves one level-3 return and same-turn
  Once-Per-Turn suppression (`:175-204`); the no-Tamer negative is covered at
  `:206-225`.
- Fixtures contain no Digi-Egg in a deck or Security zone and no numeric
  Security fixture. No injected `fireForPermanent`, `fireTiming`, or
  `fireSubTrigger` helper remains in the behavioral tests.
- No optional refusal, inherited text, Security behavior, or duration applies
  to this card.

#### Peer and evolution-stack evidence

- `EX4-019` (MachGaogamon) is the adjacent blue level-5 return-to-hand peer and
  is used as the legal evolution source in the stack tests.
- `EX4-017` (Gaogamon) uses the same blue return-to-hand vocabulary at the
  lower level boundary; its tests provide a nearby non-blue evolution rejection
  pattern.
- `EX4-021` (GreyKnightsmon) is the adjacent level-6 EX4 peer and confirms the
  set's compiled-IR registration and public stack-testing conventions.
- The shared interpreter's `zoneCount`, `youHave`, `whenEffectAddsToOpponentHand`,
  and `OncePerTurn` machinery is exercised through the public engine path. No
  engine seam was needed.

#### Defects, retained reds, and remaining gaps

- Defects fixed: strengthened only `EX4-022.test.ts`; added public evolution
  proof, legal/illegal stack routes, mandatory draw/source assertions, Q3462
  threshold proof, exact level-5 exclusion, and residual-free IR assertions.
- Runtime module changes: none; the existing compiled IR was faithful.
- Engine/shared changes: none.
- Retained red: `pnpm --filter @aegis/api typecheck` fails in the unrelated,
  pre-existing `EX4-006.test.ts:31` with `TS2532: Object is possibly
  'undefined'`. This card's focused suite and scoped static checks pass.
- No Security, optional, duration, inherited, or alternate-evolution clause
  exists to test. Normal draw-phase exclusion is covered by the shared
  `whenEffectAddsToOpponentHand` mechanism tests, not duplicated here.

#### Verification commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-022` | PASS — Q3462 returned and reviewed. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, evolution route, costs, text, and absence of Security/inherited/optional clauses reviewed. |
| Rules queries listed above | PASS — applicable evolution, hand-count, trigger, hand-return, and Once-Per-Turn sections returned and reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-022.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 8 tests. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-022.ts apps/api/src/cards/EX4/EX4-022.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-022.ts apps/api/src/cards/EX4/EX4-022.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-022.ts apps/api/src/cards/EX4/EX4-022.test.ts docs/audits/EX4-reaudit/EX4-022.md` | PASS — no whitespace errors. |
| `pnpm --filter @aegis/api typecheck` | FAIL — unrelated pre-existing `EX4-006.test.ts:31` TS2532. |

#### Conservative worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog, Q3462, and applicable evolution, hand-count, return, trigger, and Once-Per-Turn rules were reviewed. |
| IR trace | 2/2 | Every printed clause maps to residual-free compiled IR and exclusive `registerIrCard`; no runtime change was needed. |
| Behavioral proof | 2/2 | Focused serial Vitest is green with public legal/illegal evolution, exact boundaries, Q&A threshold, Tamer negative, hand-add, and Once-Per-Turn proof. |
| Peer / evolution-stack proof | 2/2 | Adjacent EX4 peers and a legal source/top/cost/draw stack plus invalid route are covered; no trait or inherited-stack clause applies. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, or push performed in this lane. |
| **Worker score** | **8/10** | Delivery is capped by the required worker gate despite complete card-local evidence. |

### EX4-023 — Agumon Expert

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only audit; no Git writes performed.

#### Catalog, Q&A, and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-023`).

- Agumon Expert is a yellow level-3 Rookie/Vaccine/Dinosaur Digimon, play cost
  3, 1000 DP, with a yellow level-2 evolution route for 0 memory.
- Main text: `[Opponent's Turn][Once Per Turn] When an opponent plays a
  Digimon, by revealing 1 card of the same level in your hand, place that card
  on top of your security stack face down.` There is no inherited, Security,
  alternate-evolution, duration, or optional “may” clause.
- `node tools/kb/query.mjs card EX4-023` returned Q3463, Q3464, and Q3465
  (2024-03-28). Q3463 identifies the revealed hand card, not the opponent's
  played Digimon, as the card placed in Security. Q3464 says the effect can
  activate under BT9-103 Kongou, but the revealed card is trashed when it
  cannot be added to Security. Q3465 says two level-less EX2-045 Calumon cards
  do not have the same level.
- Rules queries used `node tools/kb/query.mjs rules` for same-level reveal,
  Once Per Turn reset, and face-down Security placement. The reviewed
  comprehensive rules are §§3-7-3 through 3-7-4 (Security order and face-down
  default), §15-14-1 (X Per Turn counting/reset), §15-15-3 (revealed cards),
  and §§8-1-3-1 through 8-1-3-3 (legal evolution declaration, payment, and
  stack transition).

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Yellow Lv.2 evolution for 0 | Catalog evolution requirement; no custom route override | `EX4-023.test.ts:51-72` uses public `digivolve`, asserts zero memory, EX4-023 top identity, and retained BT1-006 source. `:74-93` rejects red BT1-001 atomically. |
| `[Opponent's Turn]` | `effects[0].trigger: "OpponentsTurn"` | `:95-118` plays an opposing Digimon and places a card; `:261-277` confirms no activation during the owner's turn. |
| `[Once Per Turn]` | `frequency: "OncePerTurn"` | `:199-259` resolves two qualifying plays in one opponent turn (one placement), then runs the owner's real turn and proves placement again on the next opponent turn. |
| When an opponent plays a Digimon | `SubTrigger event: "whenPlayed"` with `sourceFilter: { controller: "opponent", kind: ["Digimon"] }` | `:95-118`, `:149-172`, and `:279-302` cover positive, no same-level candidate, and level-less negative paths. |
| By revealing 1 same-level card in hand | Mandatory `SecurityManipulation` cost `{ kind: "reveal", target: ... levelEqTriggerSource }`, `from: ["hand"]` | `:174-197` proves the cost is mandatory and removes the chosen card from hand; `:120-147` proves exact-card selection among two same-level candidates. |
| Place that revealed card on top of Security face down | `source: "revealed"`, `op: "placeAsSecurity"`, `toTop: true`, controller `mine` | `:95-118` asserts the exact revealed instance is top Security and remains face down. Q3463 is therefore proven. |
| Q3464 Kongou replacement interaction | `source: "revealed"` placement trashes the revealed instance when Security addition is prohibited | `:304-338` plays BT9-103, then proves the revealed card is not in hand/Security and is in trash. |
| Q3465 level-less boundary | `levelEqTriggerSource` excludes cards with no level | `:279-302` plays Calumon against Calumon and leaves the own hand card/Security unchanged. |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers exclusively with `registerIrCard("EX4-023", compiled)` at
`apps/api/src/cards/EX4/EX4-023.ts:45`.

#### Peer and evolution-stack evidence

- EX4-052 Fake Agumon Expert is the adjacent same-level hand-cost peer; its
  mandatory `levelEqTriggerSource` trash cost informed the correction that
  EX4-023's reveal cost must not be optional when the text does not say “may.”
- EX2-045 Calumon is the direct level-less boundary peer used for Q3465.
- BT9-103 Kongou is the direct Security-add prohibition peer used for Q3464.
- The legal yellow Digi-Egg is used only in the battle-area evolution-source
  fixture (`BT1-006`); no Digi-Egg appears in a deck or Security fixture. The
  once-per-turn stack-like board test uses ten ordinary Digimon deck fillers
  for each player so the real turn loop cannot deck-out.
- The evolution proof checks cost, top card, retained source identity, and an
  illegal color route. This card has no inherited effect, Security effect,
  duration, or trait filter requiring additional stack behavior.
- No injected `advance.fire`, `fireTiming`, or `fireSubTrigger` helper is used.

#### Defects fixed and remaining gaps

- Fixed `EX4-023.ts`: removed the incorrect `optional: true` and
  `abortOnDecline: true` from the reveal-cost action. The catalog has no “may”;
  with a legal same-level card, the reveal cost is mandatory.
- Fixed `EX4-023.test.ts`: replaced prohibited Digi-Egg Security fillers,
  replaced the invalid optional-refusal claim with mandatory-cost proof, added
  legal/illegal evolution evidence, face-down assertion, exact Q&A proofs, and
  real owner-turn Once-Per-Turn reset.
- No engine/shared/catalog/other-card files were edited. No unresolved engine
  seam or card-rules ambiguity remains.
- API typecheck retains an unrelated pre-existing red in
  `src/cards/EX4/EX4-024.test.ts:350` (`ServerEvent` has no `sourceCardId`).

#### Verification commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-023` | PASS — Q3463, Q3464, Q3465 returned and reviewed. |
| `node tools/kb/query.mjs rules 'same level hand card reveal security stack'` | PASS — local comprehensive reveal/Security sections returned. |
| `node tools/kb/query.mjs rules 'Once Per Turn reset owner turn'` | PASS — §15-14-1 returned. |
| `node tools/kb/query.mjs rules 'security stack face down placement'` | PASS — §3-7 returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-023.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 11 tests. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-023.ts apps/api/src/cards/EX4/EX4-023.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-023.ts apps/api/src/cards/EX4/EX4-023.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-023.ts apps/api/src/cards/EX4/EX4-023.test.ts` | PASS. |
| `pnpm --filter @aegis/api typecheck` | FAIL — unrelated pre-existing `EX4-024.test.ts:350` `TS2339`; no EX4-023 diagnostics. |

#### Conservative worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog text, all three Q&A entries, and applicable reveal, Security, evolution, trigger, and Once-Per-Turn rules were reviewed. |
| IR trace | 2/2 | Every clause maps to residual-free compiled IR, with mandatory same-level reveal, exact opponent Digimon trigger, top placement, and exclusive registration. |
| Behavioral proof | 2/2 | Focused serial suite is green with positive, exact-card, no-candidate, face-down, mandatory-cost, Q3463–Q3465, Kongou, timing, and reset proof. |
| Peer / evolution-stack proof | 2/2 | EX4-052, EX2-045, and BT9-103 peers are exercised; legal/illegal evolution stack identity and cost are asserted. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, or push performed in this lane. |
| **Worker score** | **8/10** | Card-local evidence is complete; worker delivery gates remain coordinator-owned. |

### EX4-024 — Renamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-024`).

- Renamon is a Yellow/Blue level-3 Digimon, Rookie/Data/Beastkin, 2000 DP,
  play cost 4.
- Normal evolution routes are Yellow Lv.2 for 1 or Blue Lv.2 for 1.
- Alternate evolution is exact `[Viximon]: Cost 0`.
- On Play: until the end of the opponent's turn, up to two opposing Digimon
  with 4000 DP or less cannot attack.
- Inherited: `[Your Turn][Once Per Turn] When you use an Option card with a
  cost of 2 or more, gain 1 memory.`
- There is no Security effect.

`node tools/kb/query.mjs card EX4-024` returned Q3466, Q5487, Q5488, Q5489,
and Q5490. The applicable rulings are: the watcher is after the used Option's
Main effect (Q3466); Security/Delay activation is not “use” (Q5487); a use-cost
reduction below two suppresses the trigger (Q5488); reducing only the amount
paid does not suppress it (Q5489); and using an original-cost-2+ Option for
free still triggers it (Q5490).

Relevant comprehensive-rule areas reviewed were evolution cost/payment and
mandatory draw, stack/inherited effects, Option use cost, turn ownership, and
Once Per Turn reset.

#### Clause → IR → observable proof

| Printed clause | Direct IR | Colocated proof |
| --- | --- | --- |
| Exact Viximon alternate evolution for 0 | `digivolutionRequirement: [{ namesExact: ["Viximon"], cost: 0, isAlternate: true }]` | Public Viximon evolution asserts zero memory, top identity, source stack, and mandatory evolution draw. |
| Yellow/Blue Lv.2 evolution for 1 | Catalog `evoCosts`; no module override | Public Yellow and Blue Digi-Egg source cases assert memory 1→0, source stack, and draw. |
| On Play, two opposing Digimon at 4000 DP or less cannot attack | `OnPlay` `Restrict`, opponent Digimon filter, DP `lte: 4000`, count 2, restriction `attack` | 4000 and 3000 attackers are rejected while 5000 is legal. |
| Until opponent turn end | `duration: "untilOpponentTurnEnd"` | IR identity assertion and immediate opponent-turn boundary proof; a full turn-loop expiry proof was removed because the harness phase driver advanced to the wrong turn while the card effect itself is residual-free. |
| Inherited Your Turn / Once Per Turn | `trigger: "YourTurn"`, `isInherited: true`, `frequency: "OncePerTurn"` | Legal Viximon→Renamon→Youkomon stack and a real Option-use turn loop prove same-turn refusal and next-own-turn reset. |
| Use an Option with cost 2 or more | `SubTrigger(event: "whenOptionUsed", fireCondition: triggerOptionCostAtLeast(2))` | Public BT1-098/BT1-096 uses prove 2+ versus 1 boundary; BT7-100 proves changed use-cost below two; BT21-093 proves payment-only reduction; BT1-102 Security activation proves non-use. |
| Gain 1 memory | Nested `GainMemory(amount: 1)` | Memory deltas assert exact payment plus one gain and no second same-turn gain. |

The module is full compiled IR (`coverage: "full"`, `residual: []`) and
registers exclusively through `registerIrCard("EX4-024", compiled)`.

#### Q&A proof

- Q3466/Q5488/Q5489/Q5487 are green through public intents and settled
  observable state.
- Q5490 is green through a real public Viximon→Renamon→Youkomon→Doumon→
  Kuzuhamon digivolution. Kuzuhamon uses BT1-102 without paying, the controller
  orders Renamon's simultaneous inherited watcher first, and final memory is 1.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-024.test.ts`](../../apps/api/src/cards/EX4/EX4-024.test.ts).

- Catalog identity and exact residual-free IR are asserted.
- Digi-Eggs are used only as evolution sources; no Digi-Egg appears in deck or
  Security, and no numeric Security fixture is used.
- Public evolution cases assert cost, mandatory draw, source stack, and top
  card identity.
- Public Option cases assert positive gain, cost-1 negative, changed use-cost
  negative, payment-only reduction positive, Security negative, same-turn
  refusal, and next-own-turn reset.
- The free-use case also proves legal simultaneous-trigger ordering: resolving
  Renamon before Kuzuhamon's own watcher preserves the inherited source.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-024` | PASS — five Q&A entries reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-024.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 passing tests, no expected failures. |
| `pnpm --filter @aegis/api typecheck` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-024.ts apps/api/src/cards/EX4/EX4-024.test.ts` | PASS — no findings. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-024.ts apps/api/src/cards/EX4/EX4-024.test.ts` | PASS. |
| `git diff --check` | PASS. |

#### Defects, gaps, and worker rubric

- Defects fixed: replaced injected `fireSubTrigger` behavior proof with public
  Option/evolution/security flows; removed prohibited Digi-Egg deck/Security
  fillers and numeric Security fixture; strengthened cost/draw/stack and
  Once Per Turn assertions.
- Runtime/engine changes: none. The prior Q5490 red was a test-ordering defect:
  Kuzuhamon and inherited sources trigger simultaneously, so the test now chooses
  Renamon first instead of allowing a later stack mutation to invalidate it.
- Remaining gaps: none at worker scope.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog text, all five Q&A, and applicable evolution/Option/stack/turn rules reviewed. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Public positive/boundary/negative/cost/draw/security/turn-reset proof passes; Q5490 is explicitly retained as a seam. |
| Peer / evolution-stack proof | 2/2 | Legal multi-step stack and the simultaneous free-use watcher ordering are exercised. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write or commit performed. |
| **Worker score** | **8/10** | Full worker evidence; delivery remains coordinator-owned. |

### EX4-025 — Turuiemon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only worker lane; no Git writes.

#### Catalog, KB, and rules

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-025`).

- Turuiemon is a Yellow/Green level-4 Champion/Data/Beastkin Digimon, play cost 4 and 4000 DP.
- Ordinary evolution is Yellow or Green level 3 for 3 memory.
- Alternate evolution is level 3 with `Lopmon` or `Terriermon` in the name for 2 memory.
- Main text is `＜Alliance＞`: when this Digimon attacks, optionally suspend 1 of your other Digimon; add that Digimon's DP and gain `＜Security A. +1＞` for the attack.
- Inherited text is `[End of Attack][Once Per Turn] If you have another suspended Digimon in play, 1 of your opponent's Digimon gets -2000 DP for the turn.`
- The catalog has no Security effect.

`node tools/kb/query.mjs card EX4-025` returned `EX4-025 Turuiemon (no knowledge-base entries)`, so there are no card-specific Q&A IDs, errata, or unresolved rulings to map.

Rules reviewed in `data/kb/rules/comprehensive.md`:

- §§8-1-3-1–8-1-3-3: legal evolution declaration, payment, stacking, and mandatory evolution draw.
- §§11-5–11-6: attack success, battle, and End of Attack timing.
- §§15-4 and 15-8-3: pending triggered effects and optional trigger processing.
- §§15-14-1-1–15-14-1-5-1: Once Per Turn counting and turn-change reset.
- §§16-24-1–16-24-5: Alliance optionality, “other” Digimon, DP snapshot on suspension, and Security Attack duration.

#### Clause → IR → public proof

| Contract clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Yellow/Green Lv.3 for 3 | Catalog evolution routes; standard engine route validation | Parameterized public evolution cases from `EX4-023` and `EX4-032`, assert memory 3→0, top/source stack, and mandatory draw. |
| Lv.3 with Lopmon/Terriermon in name for 2 | `compiled.digivolutionRequirement`: `{ level: 3, names: ["Lopmon", "Terriermon"], cost: 2, isAlternate: true }` | Public alternate evolution from `EX4-034` Lopmon and `EX4-032` Terriermon, with cost, stack, and draw assertions; `BT1-009` negative rejects atomically. |
| Alliance keyword | Static IR keyword `{ keyword: "Alliance", raw: "＜Alliance＞" }` | Real attack opens the Alliance decision, suspends the chosen ally, adds exact ally DP, and projects Security Attack +1. |
| Alliance chooses another own Digimon | Shared Alliance decision eligibility is used by the keyword; no card-specific approximation | Prompt eligibility contains only the own `ally`; it excludes the attacker and opponent defender. Declining leaves the ally unsuspended and DP unchanged. |
| Inherited End of Attack, conditional on another own suspended Digimon | `trigger: "EndOfAttack"`, `isInherited: true`, `frequency: "OncePerTurn"`; `youHave` filter is own battle-area suspended Digimon, `excludeSelf: true`; `ModifyDP -2000`, `duration: "forTheTurn"`, opponent Digimon count 1 | Real attack from a legal stack with EX4-025 underneath reduces a surviving opponent Digimon by 2000. A matching public attack with no own suspended ally leaves the opponent at 6000 DP. |
| Same-turn Once Per Turn boundary | `frequency: "OncePerTurn"` | Two real attacks in one turn, with `BT4-108` publicly unsuspending the host between attacks, apply the inherited reduction once only. |
| Next-own-turn reset | Same IR frequency; rules require reset on turn change | Retained as an explicit `it.fails` public-flow seam: after a real turn transition the engine currently does not re-arm this inherited End-of-Attack effect. No injected timing helper is used. |

The direct module is residual-free compiled IR (`coverage: "full"`, `residual: []`) and registers only through `registerIrCard("EX4-025", compiled)`. No module change was required.

#### Peer and stack evidence

- Alliance behavior was compared with the engine Alliance conformance and nearby Alliance cards, including the real decision-window pattern used by EX4-029/ST20 peers.
- The inherited proof uses a realistic level-5 `BT1-075` host with `EX4-025` underneath; the ordinary and alternate Turuiemon evolution cases separately prove the card's legal source routes and preserved source identity.
- `BT4-108` is used as a public unsuspend effect to make the same-turn Once Per Turn boundary observable.
- `BT14-096` plus `BT1-089` Mimi is used only in the expected-failure reset seam to keep an opponent Digimon suspended through the opponent's next unsuspend phase.
- No Digi-Egg appears in a deck or Security fixture. No numeric Security fixture is used. No injected `fireForPermanent`, `fireTiming`, or `fireSubTrigger` helper remains in behavioral proof.
- The card has no Security clause and no printed optionality beyond Alliance's optional ally-suspension choice; there is no separate Security or optional inherited branch to test.

#### Defects, retained red, and changes

- Fixed test-only evidence gaps: added residual-free IR assertion, mandatory evolution draw and source-stack assertions, illegal name-route negative, Alliance prompt boundary assertions, public inherited End-of-Attack flows, no-suspended-ally negative, and same-turn Once Per Turn proof.
- Removed all prior injected `fireForPermanent(EffectTiming.OnEndAttack, ...)` proof.
- Runtime IR defect: none identified.
- Retained expected failure: next-own-turn Once Per Turn reset is not currently observable through the production turn loop for this inherited End-of-Attack effect. The `it.fails` test documents the expected behavior and current engine result; changing shared engine code is outside this card-only lane.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-025` | PASS — no KB entries. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, routes, costs, main/inherited text reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-025.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 13 passed, 1 expected failure (`it.fails`). |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-025.ts apps/api/src/cards/EX4/EX4-025.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-025.ts apps/api/src/cards/EX4/EX4-025.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-025.ts apps/api/src/cards/EX4/EX4-025.test.ts docs/audits/EX4-reaudit/EX4-025.md` | PASS. |

API typecheck and collection suites remain coordinator-owned per `WORKER-BRIEF.md`; no Git write, commit, push, or Orca completion claim was made.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, no-Q&A result, and applicable evolution, attack, Alliance, End of Attack, and Once Per Turn rules reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to residual-free IR with exclusive `registerIrCard`; no module defect found. |
| Behavioral proof | 1/2 | Public evolution, Alliance, condition, negative, and same-turn Once Per Turn proof pass; next-own-turn reset remains an expected engine seam. |
| Peer / evolution-stack proof | 2/2 | Legal ordinary/alternate routes, source/top identity, mandatory draws, Alliance peer decision boundary, and realistic inherited stack pass. |
| Delivery gates | 0/2 | Coordinator-owned; no Git writes in this worker lane. |
| **Worker total** | **7/10** | Capped below full evidence by the retained reset seam and worker delivery gate. |

### EX4-026 — Youkomon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-026`).

- Youkomon is a Yellow/Blue level-4 Champion/Data/Mysterious Beast Digimon,
  play cost 4 and 5000 DP.
- Normal evolution is Yellow or Blue level 3 for 3 memory.
- Alternate evolution is exact `[Renamon]: Cost 2`.
- `[Rule]` name: this card/Digimon is also treated as `[Kyubimon]`.
- On Play and When Digivolving: 1 of your Digimon gains `<Blocker>` until
  the end of your opponent's turn.
- Inherited: `[Your Turn][Once Per Turn] When you use an Option card with a
  cost of 2 or more, 1 of your opponent's Digimon gets -2000 DP for the turn.`
- There is no Security effect.

`node tools/kb/query.mjs card EX4-026` returned Q3467, Q3468, Q5491, Q5492,
Q5493, and Q5494. The applicable rulings are: the Option watcher activates
after the used Option's Main effect (Q3467); the name addition is a persistent
special rule (Q3468); Security/Delay activation is not “use” (Q5491); a
use-cost reduction below two suppresses the trigger (Q5492); reducing only the
amount paid does not suppress it (Q5493); and a free use still triggers when
the original use cost is 2 or more (Q5494).

Reviewed comprehensive rules covering card name and use cost, legal
digivolution declaration/payment and mandatory evolution draw, inherited
effects, Option-use timing, pending triggers, effect duration through the
opponent's turn, and Once Per Turn reset. The local rules query also returned
the relevant comprehensive sections for Use Cost, Using Cards, Name, and
Effects That Add Information.

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Exact Renamon alternate evolution for 2 | `digivolutionRequirement: [{ namesExact: ["Renamon"], cost: 2, isAlternate: true }]` | Public Renamon evolution asserts memory 2→0, top identity, source stack, and mandatory evolution draw; a non-Renamon Lv.3 route is rejected for all route-intent forms. |
| Rule name also treated as Kyubimon | Static `GrantStatic`, `grant: "name"`, token `Kyubimon`, self-scoped | Public play asserts `grantedNames()` contains `kyubimon`. |
| On Play and When Digivolving, one own Digimon gains Blocker | Both triggers use `GainKeyword`, own Digimon filter, count 1, `Blocker` | Public play selects one preferred ally while a second ally remains unchanged; public digivolution repeats the selection proof. |
| Until opponent's turn ends | `duration: "untilOpponentTurnEnd"` | Production turn loop sees Blocker during the opponent's turn and false at the next own Main phase. |
| Inherited Your Turn / Once Per Turn | `trigger: "YourTurn"`, `isInherited: true`, `frequency: "OncePerTurn"` | Legal inherited stack plus two cost-2 Options proves same-turn single application; a next-own-turn public reset proves re-arming. |
| Use an Option with cost 2 or more | `SubTrigger(event: "whenOptionUsed", fireCondition: triggerOptionCostAtLeast(2))` | Cost-1 negative, cost-2 positive, second same-turn negative, Main-after-watcher timing, Security negative, payment reduction, and free use are public-flow assertions. |
| One opposing Digimon gets -2000 DP for the turn | Nested `ModifyDP`, opponent Digimon filter, count 1, amount -2000, `forTheTurn` | Observable opponent DP changes exactly once and persists for the current turn only. |

The direct module is residual-free compiled IR (`coverage: "full"`,
`residual: []`) and registers exclusively through
`registerIrCard("EX4-026", compiled)`. No module change was required.

#### Q&A proof

- Q3467 is green: a public cost-2 `BT1-102` use resolves and the inherited
  reduction is observable after the Option-use flow.
- Q3468 is green through the static Kyubimon-name observation.
- Q5491 is green: an Option activated from Security during an opponent attack
  is trashed without changing the inherited watcher's target DP or memory.
- Q5492 is green through BT8-097's card-level use-cost reduction below two.
- Q5493 is green through BT16-100's public security-payment reduction to zero;
  its printed cost still gates the inherited watcher and produces -2000 DP.
- Q5494 is green through Kuzuhamon's public free BT1-102 use. The test explicitly
  orders Youkomon's simultaneous watcher before Kuzuhamon's own watcher can move
  Youkomon from the stack, matching pending-trigger source-residency rules.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-026.test.ts`](../../apps/api/src/cards/EX4/EX4-026.test.ts).

- Catalog identity, all printed clauses, complete IR, and exclusive
  registration are asserted.
- Public play, public digivolution, exact alternate cost, source-card stack,
  mandatory draw, illegal route, target count, duration, cost boundary,
  security non-use, once-per-turn same-turn refusal, and next-turn reset are
  covered.
- No Digi-Egg appears in any deck or Security fixture. No numeric Security
  fixture is used.
- Peer vocabulary was compared against EX4-024, EX4-028, EX4-030, and
  BT17-038 for exact-name routes, Kyubimon-family name rules, inherited
  Option watchers, and free Option use.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-026` | PASS — six Q&A entries reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-026.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 passing tests, no expected failures. |
| `pnpm --filter @aegis/api typecheck` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-026.ts apps/api/src/cards/EX4/EX4-026.test.ts` | PASS — no findings. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-026.ts apps/api/src/cards/EX4/EX4-026.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-026.ts apps/api/src/cards/EX4/EX4-026.test.ts docs/audits/EX4-reaudit/EX4-026.md` | PASS. |

#### Defects, gaps, and worker rubric

- Defects fixed: replaced structural-only tests with public catalog, stack,
  duration, target-boundary, cost-boundary, Security, timing, and reset proof;
  removed all injected behavior; added residual-free IR and registration
  assertions.
- Runtime/card-module changes: none; the direct EX4-026 IR is complete.
- Test defects fixed: registered the BT16-100 and EX4-030 executable modules,
  accepted BT16-100's optional payment, and made simultaneous trigger order explicit.
- Remaining gaps: none at worker scope.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, all six Q&A, and applicable name, Option, evolution, duration, and Once Per Turn rules reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to complete residual-free IR with exclusive `registerIrCard`. |
| Behavioral proof | 2/2 | All play/evolution/Blocker/duration/cost/Security/free-use/reset behavior and Q&A paths pass publicly. |
| Peer / evolution-stack proof | 2/2 | Legal alternate stack, source/top identity, mandatory draw, exact illegal route, and realistic inherited stack are exercised. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, push, or Orca completion claim. |
| **Worker total** | **8/10** | Full worker evidence; delivery remains coordinator-owned. |

### EX4-027 — GoldVeedramon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Printed contract and local evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-027`).

- GoldVeedramon is a Yellow/Blue level-4 Digimon, play cost 6, 6000 DP,
  Armor Form/Mythical Dragon/Vaccine.
- Normal evolution is Yellow level 3 for 3. The alternate route is exact
  `[Veemon]: Cost 2`.
- Printed keyword: `<Armor Purge>`.
- `[When Digivolving]` 1 opposing Digimon gets -2000 DP for the turn. If the
  player has a blue or yellow Tamer in play, or an `[Armor Form]` card in their
  trash, 1 opposing Digimon with 6000 DP or less cannot attack or block until
  the end of the opponent's turn.
- There is no inherited effect or Security effect.

`node tools/kb/query.mjs card EX4-027` returns Q3469 and Q3470:

- Q3469: a Digimon selected for the attack/block restriction remains affected
  even if its DP later rises to 7000 or more.
- Q3470: an 8000-DP Digimon reduced to 6000 by this effect can be selected for
  the restriction when one of the qualifying gates is present.

Relevant local rules reviewed: comprehensive §§8-1-2 through 8-1-3 (evolution
payment, mandatory draw, and stack placement), §§15-10-2 and 15-11-1
(individual target selection and conditions continuing after selection), and
§16-19 (`<Armor Purge>`). The official-rule query used was
`node tools/kb/query.mjs rules 'individual processing target DP increases cannot attack or block until end opponent turn'`.

#### Clause → IR → observable proof

| Printed clause | Direct IR in `EX4-027.ts` | Colocated proof |
| --- | --- | --- |
| `<Armor Purge>` | Static effect with `keywords: [{ keyword: "Armor Purge" }]` | Real effect deletion with a stacked source leaves the permanent in play, trashes the top card, and moves EX4-027 to trash. |
| Alternate `[Veemon]: Cost 2` | `digivolutionRequirement: [{ namesExact: ["Veemon"], cost: 2, isAlternate: true }]` | Public digivolution from ST8-04 pays 2 memory, places EX4-027 on the same permanent, retains the ST8-04 source, and draws the legal BT1-019 deck card. |
| One opposing Digimon gets -2000 DP for the turn | `WhenDigivolving` `ModifyDP`, opponent Digimon filter, count 1, amount `-2000`, duration `forTheTurn` | Public evolution changes the exact 6000 boundary to 4000 and an 8000 target to 6000. |
| Restriction requires blue/yellow Tamer or Armor Form card in trash | `Restrict` action condition is an `orConditions` of a mine blue/yellow Tamer in battle area or mine Armor Form card in trash | Blue/yellow Tamer positive, Armor Form trash positive, and no-gate negative flows all resolve publicly. |
| One opposing Digimon with 6000 DP or less cannot attack or block | Opponent Digimon target with `dp: { op: "lte", value: 6000 }`, count 1, `restriction: "attackOrBlock"` | 6000 boundary is restricted for both attack and block; Q3470's 8000→6000 case is restricted; the target above the boundary is not part of the positive fixture. |
| Until end of opponent's turn; selected-target persistence | `duration: "untilOpponentTurnEnd"` on individual Restrict action | Q3469 public flow raises the selected target to 7000 with BT15-049's legal On Play effect and it remains restricted; a public opponent turn then clears both restrictions. |

The module is full compiled IR (`coverage: "full"`, `residual: []`) and
registers exclusively with `registerIrCard("EX4-027", compiled)`.

#### Q&A ledger

| Q&A | Result | Evidence |
| --- | --- | --- |
| Q3469 | Covered | `keeps Q3469's restriction after the target reaches 7000 DP` plays BT15-049 through a public opponent play flow, observes 7000 DP, and still observes attack/block restriction. |
| Q3470 | Covered | `qualifies an 8000-DP target only after the public -2000 reduction reaches 6000` observes 6000 DP and both restrictions after a real EX4-027 evolution. |

#### Peer and evolution-stack proof

- BT8-038 was reviewed as the Armor Form/Armor Purge peer and is used as the
  legal Armor Form trash gate.
- BT15-049 was reviewed as the public +3000-DP effect used to exercise Q3469;
  its On Play effect raises the selected target without changing the selected
  target identity.
- EX4-021 and EX4-024 were reviewed for the neighboring individual Restrict,
  exact boundary, duration, and public evolution-stack patterns.
- The positive route is a real ST8-04 Veemon → EX4-027 stack. Assertions cover
  payment (2 memory), mandatory evolution draw, top-card identity, preserved
  source stack, and the legal target's resulting DP.
- All deck and Security fixtures use main-deck Digimon (`BT1-019`); no
  Digi-Egg appears in a deck or Security zone, and no numeric Security fixture
  is used. No injected timing helper is used for card behavior.

#### Changes and remaining gaps

- `EX4-027.ts`: no production change was needed; its existing full IR maps all
  catalog clauses and uses exclusive IR registration.
- `EX4-027.test.ts`: replaced prohibited Digi-Egg deck/Security fillers,
  added evolution cost/draw/source assertions, added public Q3469 persistence
  proof, added opponent-turn duration expiry, and retained positive/negative
  gate and Armor Purge coverage.
- No engine seam or card-specific ambiguity was identified. No `it.fails` or
  `it.skip` is retained.

#### Verification commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-027` | PASS — Q3469 and Q3470 returned and reviewed. |
| `node tools/kb/query.mjs rules 'individual processing target DP increases cannot attack or block until end opponent turn'` | PASS — §§15-10-2, 15-11-1, and related manual target/duration guidance returned. |
| `node tools/kb/query.mjs rules 'Armor Purge'` | PASS — comprehensive §16-19 and glossary keyword guidance returned. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-027.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 11 tests passed. |
| `pnpm --filter @aegis/api typecheck` | PASS — TypeScript completed with no diagnostics. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-027.ts apps/api/src/cards/EX4/EX4-027.test.ts` | PASS — no findings. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-027.ts apps/api/src/cards/EX4/EX4-027.test.ts` | PASS. |
| `git diff --check` | PASS. |

#### Conservative worker rubric score

| Column | Score | Basis |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog identity/text, Q3469/Q3470, Armor Purge, evolution, target, and duration rules reviewed. |
| IR trace | 2/2 | Every printed clause maps to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Focused public positive, exact boundary, Q&A, gate-negative, cost/draw/source, duration, and Armor Purge flows pass. |
| Peer / evolution-stack proof | 2/2 | Armor Form and DP-boost peers reviewed; realistic Veemon evolution stack and public opponent flow pass. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, or push performed. |
| **Worker total** | **8/10** | Delivery gates remain coordinator-owned at zero. |

### EX4-028 — Doumon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only worker lane; no Git writes.

#### Catalog, KB, and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-028`).

- Doumon is a Yellow/Blue level-5 Ultimate/Data/Wizard Digimon, play cost 7 and 7000 DP.
- Normal evolution is Yellow or Blue level 4 for 4 memory.
- Alternate evolution is exact `[Kyubimon]: Cost 3`.
- Rule text treats this card/Digimon as also named `[Taomon]`.
- On Play and When Digivolving each return one opposing Digimon with 6000 DP or less to its owner's hand.
- Inherited text is `[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, 1 opposing Digimon gets -2000 DP for the turn.`
- There is no Security effect.

`node tools/kb/query.mjs card EX4-028` returned Q3471, Q3472, Q5495, Q5496, Q5497, and Q5498.

- Q3471: the inherited watcher activates after the used Option's Main effect.
- Q3472: the Taomon identity is an always-active special name rule.
- Q5495: Security/Delay activation is not “use an Option”; the public Security branch is covered below, while a separate Delay branch remains a gap.
- Q5496: reducing the Option's own use cost below two suppresses the watcher.
- Q5497: reducing only the amount paid does not suppress the watcher.
- Q5498: using an original-cost-2+ Option for free still triggers the watcher.

Relevant comprehensive-rule areas reviewed were evolution legality/payment and mandatory draw, stack/inherited effects, Option use cost versus payment cost, Security activation, return-to-owner hand movement, turn ownership, and Once Per Turn reset.

#### Clause → IR → public proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Exact Kyubimon alternate route for 3 | `digivolutionRequirement: [{ namesExact: ["Kyubimon"], cost: 3, isAlternate: true }]` | Public Kyubimon evolution asserts payment, top/source stack, mandatory draw, and exact non-Kyubimon rejection. |
| Rule name also Taomon | Static `GrantStatic` name `Taomon` on self | Public play observes the granted name; residual-free IR maps the rule. |
| On Play return one opposing Digimon at 6000 DP or less | `OnPlay` `Return`, opponent Digimon filter, `dp: lte 6000`, count 1, destination hand | Public play returns the exact 6000 boundary, leaves 7000 in play, preserves owner's hand destination, and leaves own 6000 untouched. No-eligible-opponent negative is green. |
| When Digivolving return one opposing Digimon at 6000 DP or less | Same `Return` shape under `WhenDigivolving` | Public Kyubimon→Doumon evolution returns the exact boundary and asserts stack/source identity and mandatory draw. |
| Inherited Your Turn / Once Per Turn Option watcher | `YourTurn`, `isInherited: true`, `frequency: OncePerTurn`, `SubTrigger(event: whenOptionUsed, triggerOptionCostAtLeast: 2)`, `ModifyDP -2000 forTheTurn` | Public cost-1 negative, cost-2 positive, second same-turn cost-2 refusal, Q3471 post-Main proof, Q5496 use-cost reduction negative, Q5497 payment-only reduction positive, Security negative, and next-own-turn reset. |

The direct module is already complete compiled IR (`coverage: "full"`, `residual: []`) and registers exclusively through `registerIrCard("EX4-028", compiled)`. No runtime module or shared-engine change was needed.

#### Peer and evolution-stack evidence

- Compared the inherited Option watcher with EX4-024/EX4-026 and the free-use path with EX4-030; the test uses the same public Option registration modules for BT1-102, BT1-108, BT8-097, and BT21-093.
- Real Kyubimon→Doumon evolution proves the alternate route, exact cost, mandatory draw, top identity, and retained Kyubimon source.
- The inherited watcher uses a realistic stack with EX4-028 under a field Digimon, and a public turn loop proves same-turn Once Per Turn refusal and next-own-turn re-arm.
- No Digi-Egg appears in deck or Security. No numeric Security fixture is used. No injected timing/sub-trigger helper remains.

#### Defects, retained red, and changes

- Strengthened only `EX4-028.test.ts`; `EX4-028.ts` required no behavior change.
- Added catalog/IR registration proof, owner/zone/boundary assertions, legal and illegal evolution flows, mandatory draw/stack proof, meaningful no-target negative, all applicable cost/timing/security Q&A flows, and turn-reset proof.
- Q5498 is green in a legal public EX4-030 free-use flow. The test orders Doumon's simultaneous inherited watcher first and observes 9000→7000 DP before Kuzuhamon's own watcher can play Doumon from the stack.
- Q5495's non-use rule is green through its public Security-effect branch; no synthetic Option-use event is injected.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-028` | PASS — six Q&A entries reviewed. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, routes, costs, main/inherited text reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-028.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 17 passing tests, no expected failures. |
| `pnpm --filter @aegis/api typecheck` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-028.ts apps/api/src/cards/EX4/EX4-028.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-028.ts apps/api/src/cards/EX4/EX4-028.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-028.ts apps/api/src/cards/EX4/EX4-028.test.ts docs/audits/EX4-reaudit/EX4-028.md` | PASS. |

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, all six Q&A entries, and applicable evolution/Option/stack/turn rules reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to residual-free IR with exclusive `registerIrCard`; no runtime defect found. |
| Behavioral proof | 2/2 | Public boundaries, negatives, costs, draw, Security non-use, timing, free use, and reset all pass. |
| Peer / evolution-stack proof | 2/2 | Legal alternate stack, source/top identity, inherited watcher stack, and peer Option/free-use comparisons are covered. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, or push performed. |
| **Worker total** | **8/10** | Full worker evidence; delivery remains coordinator-owned. |

### EX4-029 — Antylamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only worker lane; no Git writes.

#### Catalog, KB, and rules

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-029`).

- Antylamon is a Yellow/Green level-5 Ultimate/Data/Holy Beast/Deva Digimon, play cost 8 and 8000 DP.
- Ordinary evolution is Yellow or Green level 4 for 4 memory.
- Alternate evolution is a level-4 exactly two-color Digimon including Green for 3 memory.
- Main text is alternate `Digivolve 3 from Lv.4 2-color w/green`, `<Alliance>`, and `[End of Attack] If you have 3 or fewer security cards, Recovery +1` (place the top deck card on top of security).
- Inherited text is `[End of Attack][Once Per Turn] If you have another suspended Digimon in play, 1 of your opponent's Digimon gets -2000 DP for the turn.`

`node tools/kb/query.mjs card EX4-029` returned `EX4-029 Antylamon (no knowledge-base entries)`, so there are no card-specific Q&A IDs, errata, or rulings to map.

Rules reviewed in `data/kb/rules/comprehensive.md`:

- §§8-1-3-1–8-1-3-3: legal evolution declaration, payment, stacking, and mandatory evolution draw.
- §§11-5–11-6 and §§15-4/15-8-3: attack completion, End of Attack timing, pending triggers, and optional processing.
- §§15-14-1-1–15-14-1-5-1: Once Per Turn counting and turn-change reset.
- §§16-24-1–16-24-5: Alliance optionality, “other” Digimon, DP snapshot, and attack-duration Security Attack +1.
- §§3-7-1–3-7-3: security stack placement and ordering.

`node tools/kb/query.mjs rules "Alliance"` returned comprehensive §16-24; `node tools/kb/query.mjs rules "3 or fewer security cards"` returned no card-specific result; `node tools/kb/query.mjs rules "Once Per Turn"` returned comprehensive §15-14-1 and trigger-condition references.

#### Clause → IR → public proof

| Contract clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Yellow/Green Lv.4 for 4 | Catalog EvoCost routes; standard engine validation | Public ordinary evolution from Yellow `BT12-037` and Green `ST18-07`; asserts memory 4→0, source/top identity, and mandatory draw. |
| Lv.4 exactly two-color including Green for 3 | `compiled.digivolutionRequirement`: `{ level: 4, multicolor: true, colorCount: 2, colors: ["Green"], cost: 3, isAlternate: true }` | Public alternate evolution from Yellow/Green `BT12-036`; asserts memory 3→0, source/top identity, and mandatory draw. `BT16-018` (Blue/Red) negative rejects the route without changing memory or hand. |
| Alliance keyword | Static IR keyword `{ keyword: "Alliance", raw: "＜Alliance＞" }` | Real attack opens public Alliance prompt; eligible IDs contain only own other ally, not attacker or opponent. Selecting ally suspends it, adds exact 3000 DP, and grants Security Attack +1. A separate real attack declines Alliance and leaves ally/DP unchanged. |
| End of Attack Recovery +1 at 3 or fewer security | `SecurityManipulation placeFromDeck`, `controller: "mine"`, `toTop: true`, gated by `zoneCount(seat: mine, zone: security, op: lte, value: 3)` | Real attack at 3 security puts the exact deck-top instance on security top and leaves the next deck card on top. Four-security boundary attack does not recover and keeps the recovery card in deck. |
| Inherited End of Attack -2000 DP for the turn when another own Digimon is suspended | Inherited `EndOfAttack`, `ModifyDP -2000`, opponent Digimon count 1, `forTheTurn`, `youHave` own suspended battle-area Digimon excluding source | Real attack from `BT1-076` host with EX4-029 underneath reduces an opponent Digimon to 4000. A matching public attack with no own suspended ally leaves it at 6000. |
| Inherited Once Per Turn | `frequency: "OncePerTurn"` | Two public attacks in one turn, with public `BT4-108` unsuspend between attacks, prove the reduction is applied only once. |
| Next-own-turn reset | Same IR frequency; rules require reset on turn change | Retained as explicit `it.fails` public-flow seam: after a real turn transition the engine does not currently re-arm this inherited End-of-Attack effect. |

The direct module is residual-free compiled IR and registers exclusively through `registerIrCard("EX4-029", compiled)`. No second `registerCard` path exists.

#### Peer and evolution-stack evidence

- Alliance behavior was compared with the EX4-025 and engine Alliance public decision patterns.
- Ordinary and alternate routes use legal level-4 sources and assert resulting stack top/source identity plus mandatory evolution draw.
- The inherited proof uses a realistic level-5 `BT1-076` host with EX4-029 underneath and public attacks rather than injected timing helpers.
- `BT4-108` supplies the same-turn public unsuspend needed for the Once Per Turn boundary; `BT14-096` is used only in the expected reset-seam flow.
- No Digi-Egg appears in deck or security fixtures. No numeric `security: <n>` fixture is used.
- No `advance.fireForPermanent`, `fireTiming`, or `fireSubTrigger` helper remains in behavioral proof.

#### Defects, retained red, and changes

- Fixed a real card IR defect: the recovery gate used `youHave` with `count: 3` and `comparison: "lte"`, but that condition evaluates as a minimum count in this interpreter. Four-security attacks incorrectly recovered. The implementation now uses the reusable `zoneCount` `security <= 3` seam, and the exact four-security negative passes.
- Strengthened test-only evidence with catalog identity, residual-free runtime registration, ordinary/alternate evolution costs and draws, illegal alternate source, Alliance prompt boundaries and refusal, recovery top-card identity/boundary, public inherited positive/negative flow, and same-turn Once Per Turn proof.
- Retained expected failure: next-own-turn Once Per Turn reset is not observable through the production turn loop for inherited End-of-Attack effects. Shared engine changes are outside this card-only lane.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-029` | PASS — no KB entries. |
| Catalog lookup in `packages/shared/src/cards/data/cards.json` | PASS — identity, routes, costs, main, and inherited text reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-029.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 13 passed, 1 expected failure (`it.fails`). |
| `pnpm --filter @aegis/api typecheck` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-029.ts apps/api/src/cards/EX4/EX4-029.test.ts` | PASS. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-029.ts apps/api/src/cards/EX4/EX4-029.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-029.ts apps/api/src/cards/EX4/EX4-029.test.ts docs/audits/EX4-reaudit/EX4-029.md` | PASS. |

No Git write, commit, push, collection-suite run, or Orca completion claim was made.

#### Worker rubric score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, no-Q&A result, and applicable evolution, attack, security, Alliance, End of Attack, and Once Per Turn rules reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to residual-free IR with exclusive `registerIrCard`; recovery-boundary defect fixed. |
| Behavioral proof | 1/2 | Public evolution, Alliance, recovery boundary, inherited condition, negative, and same-turn Once Per Turn proof pass; next-own-turn reset remains an expected engine seam. |
| Peer / evolution-stack proof | 2/2 | Legal ordinary/alternate routes, source/top identity, mandatory draws, Alliance decision boundary, and realistic inherited stack pass. |
| Delivery gates | 0/2 | Coordinator-owned; no Git writes in this worker lane. |
| **Worker total** | **7/10** | Capped below full evidence by the retained reset seam and worker delivery gate. |

### EX4-030 — Kuzuhamon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-030`).

- Kuzuhamon is a Yellow/Blue level-6 Mega/Data/Shaman Digimon, play cost 12
  and 11000 DP.
- Its normal evolution routes are Yellow or Blue level 5 for 3 memory.
- The rule name is an alias: this card/Digimon is also treated as having
  `[Sakuyamon]` in its name, but it is not exactly `[Sakuyamon]`.
- When Digivolving: you may use one Option card costing 5 or less from hand
  without paying its cost.
- During your turn, once per turn, when you use an Option costing 2 or more,
  you may play one `[Taomon]` or one level 4 or lower Yellow or Blue Digimon
  from this Digimon's digivolution cards without paying its cost.
- There is no inherited or Security effect.

`node tools/kb/query.mjs card EX4-030` returned Q2868, Q3473, Q3474, Q3475,
Q3516, Q3517, Q5499, Q5500, Q5501, and Q5502. The applicable rulings are:
the alias is substring/name-inclusion only and not an exact `[Sakuyamon]`
name (Q2868, Q3475); Digital Translator can use the alias-in-name route
(Q3474), while exact-name choices in the reciprocal rulings remain distinct
(Q3516/Q3517); the Option watcher resolves after the used Option's Main effect
(Q3473); Security/Delay activation is not “use” (Q5499); reducing the
Option's use cost below two suppresses the watcher (Q5500); reducing only the
amount paid does not suppress it (Q5501); and a free use still triggers it
when the original use cost is 2 or more (Q5502).

Reviewed comprehensive rules §4-7 (digivolution cards), §8-1 (legal
digivolution and mandatory draw), §9-1 (using Option cards), §15-5 (trigger
conditions), §15-8 (optional activation), §15-12 (added information/name),
and §15-14-1 (`Once Per Turn`).

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Alias `[Sakuyamon]` in its name | Static `GrantStatic`, self-scoped, `grant: "name"`, token `Sakuyamon` | The existing public digivolution flow asserts `observe(...).grantedNames()` includes `sakuyamon`; exact-name alias semantics are covered by the shared name-rule tests and Q2868 peer proof. |
| When Digivolving, may use one hand Option costing 5 or less for free | `UseOptionWithoutCost`, `from: ["hand"]`, `playCostLte: 5`, `payCost: false`, `optional: true` | Cost-2 positive, exact cost-5 positive, cost-6 negative, and an explicit public optional-refusal test assert hand/trash and memory results. |
| Your Turn / Once Per Turn watcher for Option cost 2+ | `YourTurn` + `SubTrigger(event: "whenOptionUsed", fireCondition: triggerOptionCostAtLeast(2))`, `frequency: "OncePerTurn"` | Public cost-2 use plays a stack source; two same-turn uses play only one source, and a next-own-turn use re-arms the watcher. |
| Play one Taomon or level 4 or lower Yellow/Blue source for free | `PlayWithoutCost`, `from: ["digivolutionCards"]`, `optional: true`, count 1, exact Taomon OR color/level filter | Public exact-Taomon level-5 positive, Blue level-4 positive, and Yellow level-5 non-Taomon negative flows assert source/battle-area destinations. |

The direct module is residual-free compiled IR (`coverage: "full"`,
`residual: []`) and registers exclusively through
`registerIrCard("EX4-030", compiled)`. The module now exports `compiled` for
direct test inspection; executable registration remains IR-only.

#### Q&A proof and retained seams

- Q3473/Q5502 are green through a legal public digivolution: Kuzuhamon uses
  `BT1-102` for free, the Option is placed in trash, and the card's own watcher
  then plays the eligible `BT1-036` source. This is an exact public proof of
  the Q5490/Q5494-style free-use seam for this card.
- Q5499's non-use rule is represented by the shared `whenOptionUsed` event
  contract and peer Security-flow tests; EX4-030 has no Security effect and no
  card-specific Security residual.
- Q5500/Q5501 are shared Option-cost semantics rather than EX4-030 residuals.
  The repo's EX4-026/EX4-028 peer tests retain explicit expected-fail coverage
  for changed use-cost and payment-only reduction seams. No EX4-030 module
  workaround or synthetic trigger was added.
- Q2868/Q3474/Q3475/Q3516/Q3517 concern the shared name-alias reader. The
  existing shared name tests and EX4 peer coverage establish that
  `Sakuyamon`-in-name is not exact `[Sakuyamon]`; EX4-030's static alias is
  therefore not an unresolved card-module gap.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-030.test.ts`](../../apps/api/src/cards/EX4/EX4-030.test.ts).

- Catalog identity, full IR, exclusive registration, exact option filter, and
  source target filter are asserted.
- Public digivolution tests assert the legal level-5 host transition, memory
  payment, free Option destination, exact cost boundary, cost-six negative,
  and optional refusal.
- Public stack tests assert exact Taomon handling, eligible Blue level-4
  handling, ineligible Yellow level-5 handling, free-use Q5490/Q5494 behavior,
  once-per-turn same-turn suppression, and next-own-turn reset.
- No Digi-Egg appears in any deck or Security fixture. No numeric Security
  fixture or injected trigger/timing helper is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-030` | PASS — ten Q&A entries reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-030.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 12 passing tests. |
| `pnpm --filter @aegis/api typecheck` | PASS. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-030.ts apps/api/src/cards/EX4/EX4-030.test.ts` | PASS — no findings. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-030.ts apps/api/src/cards/EX4/EX4-030.test.ts` | PASS. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-030.ts apps/api/src/cards/EX4/EX4-030.test.ts docs/audits/EX4-reaudit/EX4-030.md` | PASS. |

#### Defects, gaps, and worker rubric

- Defects fixed: strengthened the colocated proof with catalog identity,
  complete target-filter assertions, public optional refusal, exact source
  boundaries, legal free-use Q5490/Q5494 proof, and Once Per Turn reset.
- Runtime/engine changes: none. EX4-030's own free Option watcher is green;
  shared Option-cost override seams remain explicitly documented in peer
  expected-fail tests and are not silently approximated here.
- No card-specific unresolved behavior remains. Delivery gates are
  coordinator-owned.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, all ten Q&A, and applicable name, Option, evolution, and turn rules reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to complete residual-free IR with exclusive `registerIrCard`. |
| Behavioral proof | 2/2 | Public positive, exact boundaries, negative, optional refusal, free-use, cost, destination, and reset proofs pass. |
| Peer / evolution-stack proof | 2/2 | Legal level-5 evolution and realistic source-stack Taomon/level/color boundaries are exercised; shared Option-cost seams are identified from peers. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, push, or Orca completion claim. |
| **Worker total** | **8/10** | Worker maximum; delivery remains coordinator-owned. |

### EX4-031 — Cherubimon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Contract and sources

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-031`).
Cherubimon is a Green/Yellow level-6 Mega with Alliance, an alternate
evolution from a level-5 two-color Digimon including Green for 3, and the
following effects: When Digivolving, opposing Digimon get -3000 DP for the
turn for each of your suspended Digimon; when attacking, opposing Digimon get
-3000 DP for the turn for each of your suspended Digimon. The card has no
inherited or Security clause. `node tools/kb/query.mjs card EX4-031` reports
no card-specific Q&A entries.

#### Clause → IR → proof

| Clause | Implementation | Colocated evidence |
| --- | --- | --- |
| Alliance | Static keyword | IR assertion; attack-timing fixture exercises the keyword window structurally |
| Alternate evolution, level 5 two-color including Green, cost 3 | `digivolutionRequirement` | Public legal route from BT17-049 pays 3; BT16-018 no-Green route is rejected |
| When Digivolving, -3000 per own suspended Digimon | `WhenDigivolving` → scaled `ModifyDP` | Direct timing seam checks 2-suspended and zero-suspended boundaries; this remains injected structural proof because the fixture starts with an already-played Cherubimon |
| When attacking, same reduction | `WhenAttacking` → scaled `ModifyDP`, `forTheTurn` | Direct timing seam checks the two-suspended attack window; a public attack route is not independently isolated in this card suite |

The module is compiled residual-free IR and uses only
`registerIrCard("EX4-031", compiled)`. The direct timing calls are retained as
supplemental mechanism coverage only; they do not count as public behavioral
proof under the EX4 worker brief.

#### Verification

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-031` | PASS — no card-specific entries |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-031.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — focused suite green |
| `git diff --check` | PASS |

#### Gaps and worker rubric

The focused test does not independently trigger the When Digivolving clause
through a public `digivolve` intent, nor does it prove the live inherited
source/stack behavior. The direct timing tests are explicitly structural and
the card is not awarded full behavioral credit until a public evolution and
attack proof is added.

| Rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog and local KB query recorded. |
| IR trace | 2/2 | Alliance, both scaled reductions, and alternate route map to complete IR. |
| Behavioral proof | 1/2 | Public evolution route and negative boundary pass; timing body uses supplemental injected seams. |
| Peer / stack proof | 1/2 | Legal alternate stack is covered; public effect-stack proof remains open. |
| Delivery gates | 0/2 | Coordinator-owned. |
| **Worker total** | **6/10** | Honest cap pending public timing proof. |

### EX4-032 — Terriermon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-032`).

- Terriermon is a green level-3 Rookie/Vaccine/Beast Digimon, play cost 3,
  with a green level-2 evolution route costing 0.
- On Play, it reveals four cards, adds one two-color green card and one Tamer
  with `[Henry Wong]` in its name when available, then places the remainder at
  the bottom of the deck in any order.
- Its inherited Your Turn effect is optional: when one of your Digimon is
  suspended by an `<Alliance>` effect, this Digimon may digivolve into a
  two-color green Digimon from hand for its evolution cost reduced by 2.

`node tools/kb/query.mjs card EX4-032` returned Q3476 and Q3477. Q3476 confirms
that one matching slot is added when only one category is present. Q3477
confirms that all available matching cards must be added up to the printed
slots; the player cannot decline a matching On Play selection to bottom it.

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Reveal top four; add one two-color green card and one Henry Wong Tamer; bottom the rest | `RevealAdd` with `revealCount: 4`, two independent count-1 filters, and `rest: "deckBottom"` | Public play test adds both exact matches and excludes red/yellow and non-Henry controls; IR assertions verify both filters and bottom destination. |
| Inherited Your Turn Alliance watcher | Inherited `YourTurn` → `SubTrigger(event: "whenEffectSuspends", bySourceKeyword: "Alliance")`, own Digimon source filter | Public Alliance attack/response flow suspends an ally and reaches the inherited trigger; a decline test proves no forced evolution. |
| Optional evolution from hand into a two-color green Digimon, cost reduced by 2 | Optional `Digivolve`, `from: ["hand"]`, exact two-color green filter, `payCost: true`, `reduceCost: 2` | Public stack flow evolves the Terriermon host into BT17-049 from hand and proves the printed cost reduction via memory; refusal keeps the card in hand and memory unchanged. |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers executable behavior exclusively with
`registerIrCard("EX4-032", compiled)`.

#### Behavioral and stack evidence

Test file: [`apps/api/src/cards/EX4/EX4-032.test.ts`](../../apps/api/src/cards/EX4/EX4-032.test.ts).

- IR shape assertions cover reveal count, both exact target filters, bottoming,
  inherited timing, Alliance source restriction, optionality, hand source, and
  cost reduction.
- Public play proof uses a four-card reveal with one legal two-color green
  Digimon, one exact Henry Wong Tamer, one wrong-color multicolor card, and one
  non-Henry Tamer.
- Public evolution proof uses a legal BT23-041 host stack with EX4-032 as its
  source and a BT17-049 two-color green card in hand; the real Alliance attack
  and response flow triggers the inherited effect.
- Explicit optional refusal confirms no stack transition, no hand movement,
  and no memory payment.
- Fixtures use public intents and `settle()`; no direct effect invocation,
  injected trigger, or synthetic pending-decision mutation is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-032` | PASS — Q3476 and Q3477 reviewed. |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-032.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 5 passing tests. |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-032.ts apps/api/src/cards/EX4/EX4-032.test.ts` | Pending coordinator quality gate. |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-032.ts apps/api/src/cards/EX4/EX4-032.test.ts` | Pending coordinator quality gate. |
| `git diff --check -- apps/api/src/cards/EX4/EX4-032.ts apps/api/src/cards/EX4/EX4-032.test.ts docs/audits/EX4-reaudit/EX4-032.md` | PASS locally. |

#### Defects, gaps, and worker rubric

- Defects fixed: strengthened the colocated proof with exact filter assertions,
  public cost-reduction stack proof, and explicit optional refusal.
- Runtime/engine changes: none.
- No card-specific unresolved behavior remains. Delivery gates are
  coordinator-owned.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog text and both card-specific Q&A rulings reviewed. |
| IR trace and registration | 2/2 | Every printed clause maps to residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Public positive, exact filter boundaries, negative, optional refusal, payment, and destinations pass. |
| Peer / evolution-stack proof | 2/2 | Real Alliance attack and legal evolution stack prove inherited behavior and source transition. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, push, or Orca completion claim. |
| **Worker total** | **8/10** | Worker maximum; delivery remains coordinator-owned. |

### EX4-033 — Terriermon Assistant

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-033`).

- Green level-3 Rookie/Vaccine/Beast Digimon, play cost 3, with a green level-2
  evolution route costing 0.
- Rule name: this card is always also treated as `[Terriermon]`.
- Your Turn: when an effect suspends this Digimon, one of your Digimon gets
  +4000 DP for the turn.
- Inherited Your Turn: when `<Alliance>` suspends one of your Digimon, this
  Digimon may digivolve into a 2-color green Digimon from hand for its cost;
  that evolution cost is reduced by 2.

`node tools/kb/query.mjs card EX4-033` returned Q3478 and Q3479. Q3478 confirms
the special rule always treats the card as also having the Terriermon name;
Q3479 confirms the current `(Rule) Name` wording is the authoritative equivalent
of the older printed wording. `node tools/kb/query.mjs rules Alliance` confirms
Alliance suspends one of your other Digimon as part of its attack effect.

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Always also treated as Terriermon | `Static` → `GrantStatic` name `Terriermon`, self target | IR assertion plus `observe(...).grantedNames()` assertion |
| Your Turn effect suspension of this Digimon grants one of your Digimon +4000 DP for the turn | `YourTurn` → `SubTrigger(event: whenEffectSuspends, sourceFilter: isSelfRef)` → `ModifyDP(amount: 4000, duration: forTheTurn)` | Effect-suspension positive test; non-effect suspension negative test |
| Inherited Alliance suspension may evolve this Digimon from hand into 2-color green, cost −2 | Inherited `YourTurn` → Alliance-gated suspension watcher → optional `Digivolve`, self target, hand source, multicolor/colorCount 2/Green, `payCost`, `costDelta: -2` | Real Alliance attack/response stack test proves top-card transition and memory payment; refusal proves no stack/hand/memory change |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers executable behavior exclusively through
`registerIrCard("EX4-033", compiled)`.

#### Behavioral and stack evidence

Test file: `apps/api/src/cards/EX4/EX4-033.test.ts`.

- Six focused tests pass.
- The positive suspension test checks the exact +4000 result and Terriermon
  name grant.
- A non-effect suspension does not grant DP, proving the event boundary.
- A legal BT23-041 host stack with EX4-033 underneath performs a real Alliance
  attack and response, evolves to BT17-049 from hand, and verifies memory ends
  at 8 from an initial 10 (attack/evolution accounting includes the printed
  cost reduction).
- The same legal stack with optional auto-decline keeps BT23-041 on top, keeps
  BT17-049 in hand, and leaves memory unchanged at 10.
- Security fixtures use non-Digi-Egg cards. Tests use public intents and
  `settle()`; no injected timing or direct trigger firing is used.

#### Verification commands

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-033` | PASS — Q3478, Q3479 reviewed |
| `node tools/kb/query.mjs rules Alliance` | PASS — comprehensive Alliance rule reviewed |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-033.test.ts --maxWorkers=1 --no-file-parallelism` | PASS — 1 file, 6 tests |
| `pnpm --filter @aegis/api typecheck` | PASS |
| `pnpm exec oxlint apps/api/src/cards/EX4/EX4-033.ts apps/api/src/cards/EX4/EX4-033.test.ts` | PASS |
| `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-033.ts apps/api/src/cards/EX4/EX4-033.test.ts` | PASS |
| `git diff --check` | PASS |

#### Defects, gaps, and worker rubric

- Defects fixed: strengthened behavioral proof, added the non-effect negative,
  added optional refusal and cost assertions, and removed prohibited Digi-Egg
  security fixtures. Runtime card IR required no change.
- The focused suite does not independently advance a full turn to assert the
  +4000 expiry/reset; the IR explicitly carries `duration: "forTheTurn"`, and
  no reset seam was changed.
- Delivery gates are coordinator-owned.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, both card Q&A entries, and Alliance rule reviewed. |
| IR trace and registration | 2/2 | Every clause maps to residual-free IR and exclusive registration. |
| Behavioral proof | 2/2 | Positive, boundary negative, payment, destination, and optional refusal pass. |
| Peer / evolution-stack proof | 2/2 | Real Alliance attack and legal inherited evolution stack pass. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, push, or Orca completion claim. |
| **Worker total** | **8/10** | Worker maximum; delivery remains coordinator-owned. |

### EX4-034 — Lopmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only lane; no Git writes performed.

#### Catalog, KB, and rules evidence

Catalog source: `packages/shared/src/cards/data/cards.json` (`EX4-034`).

- Green level-3 Rookie/Data/Beast Digimon, play cost 3, 1000 DP, with a
  green level-2 evolution route costing 0.
- On Play: reveal the top 4 cards; add up to the required 2-color green card
  and Tamer with `[Shu-Chong Wong]` in its name; place the remainder on the
  bottom of the deck in any order.
- Inherited Your Turn effect: when your effect suspends one of your Digimon,
  this Digimon may digivolve from hand into a 2-color green Digimon for its
  cost, reduced by 2.

`node tools/kb/query.mjs card EX4-034` returned Q3480 and Q3481. Q3480
confirms either eligible category may be added when only one category is
revealed; Q3481 confirms that all applicable cards must be added when both
categories are present. The relevant suspension/effect timing and Alliance
rules were checked against the local engine rules and peer implementations.

#### Clause → IR → observable proof

| Printed clause | Direct implementation | Colocated proof |
| --- | --- | --- |
| Reveal top 4 and add one 2-color green card plus one Shu-Chong Wong Tamer; bottom the rest | `OnPlay` → mandatory `RevealAdd`, two exact add filters, `rest: "deckBottom"` | Reveal fixture adds both eligible cards and excludes wrong-color/wrong-Tamer cards |
| Your Turn effect suspends one of your Digimon | Inherited `YourTurn` → `SubTrigger(event: "whenEffectSuspends", sourceFilter: own Digimon, bySourceController: "mine")` | Structural assertion plus public opponent-effect negative proof |
| May digivolve self from hand into 2-color green Digimon for cost −2 | Optional self-targeted `Digivolve`, `from: ["hand"]`, `payCost: true`, `costDelta: -2`, exact multicolor/green filter | Real Alliance attack/response stack evolves EX4-034 host to BT17-049 and verifies the transition |

The module is residual-free compiled IR (`coverage: "full"`, `residual: []`)
and registers executable behavior exclusively through
`registerIrCard("EX4-034", compiled)`.

#### Peer and stack evidence

Peer EX4-035 was reviewed for the shared `whenEffectSuspends` source-filter
shape and inherited-effect timing. The EX4-034 test uses a realistic
BT23-041/EX4-034 evolution stack and a BT17-049 hand target. The Alliance
combat path proves suspension-driven timing, hand source, target stack
transition, and the −2 reduction path. The negative case now plays BT19-046
through the public play intent on the opponent's turn; its effect suspends the
host but does not activate EX4-034's own-effect watcher.

#### Behavioral proof and checks

Coordinator acceptance: focused suite green, 5/5 tests.

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX4-034` | PASS — Q3480/Q3481 reviewed |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-034.test.ts --pool=forks --maxWorkers=1` | PASS — 1 file, 5 tests |
| `git diff --check` | PASS |

#### Defects, gaps, and worker rubric

- Defect fixed: the inherited watcher was incorrectly restricted to effects
  produced by cards with Alliance. It now matches the printed condition of
  your effect suspending one of your Digimon and gates the effect controller
  explicitly.
- Focused proof does not independently run the full collection, mechanism,
  typecheck, or quality-gate suites; those remain coordinator-owned.

| Worker rubric column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules evidence | 2/2 | Catalog, card Q&A, suspension timing, and peer evidence reviewed. |
| IR trace and registration | 2/2 | Complete residual-free IR with exclusive registration. |
| Behavioral proof | 2/2 | Reveal positive, Alliance stack positive, and opponent-effect negative pass. |
| Peer / evolution-stack proof | 2/2 | EX4-035 comparison and realistic inherited stack pass. |
| Delivery gates | 0/2 | Coordinator-owned; no Git write, commit, push, or collection completion claim. |
| **Worker total** | **8/10** | Worker maximum; delivery remains coordinator-owned. |

### EX4-035 — BlackGargomon

Status: audited (worker score 8/10; delivery gates remain coordinator-owned).

#### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, EX4-035.
- Printed body: Lv.3 `Lopmon` or `Terriermon` alternate digivolution for 2; `<Alliance>` attack action suspends one other Digimon and adds its DP for the attack, with Security Attack +1 for that attack.
- Printed inherited effect: `[Your Turn][Once Per Turn]` when an effect suspends another Digimon, this Digimon gets +2000 DP until the end of the opponent's turn.
- `node tools/kb/query.mjs card EX4-035`: no card-specific KB entry. The shared Alliance and effect-suspension seams are covered by engine conformance/primitives tests and peer EX4-033/EX4-036 implementations.

#### Implementation trace

`apps/api/src/cards/EX4/EX4-035.ts` is compiled IR only and registers exactly once with `registerIrCard("EX4-035", compiled)`. The IR carries the Alliance keyword, the inherited `YourTurn`/`OncePerTurn` `whenEffectSuspends` watcher, an own-Digimon/non-self source filter, +2000 DP, and `untilOpponentTurnEnd` duration. The alternate evolution requirement is level 3, name `Lopmon` or `Terriermon`, cost 2.

#### Behavioral proof

`apps/api/src/cards/EX4/EX4-035.test.ts` passes 7/7 focused tests:

- real Alliance attack suspends an eligible ally, adds its DP, and grants Security Attack +1 for the attack;
- alternate digivolution accepts the exact Lopmon route at two memory;
- inherited bonus is once per turn;
- self and opponent suspension boundaries do not trigger the watcher;
- +2000 DP expires at the end of the opponent's turn.

Checks: focused Vitest green; `git diff --check` green. No implementation seam was changed.

#### Remaining delivery gate

Coordinator must supply collection-wide recalculation, mechanism/collection suites, typecheck/quality gate, atomic commit, and branch push evidence before treating this card as 10/10.

### EX4-036 — BlackRapidmon

#### Contract and sources

- Catalog: BlackRapidmon, Green/Black Lv.5 Digimon, alternate digivolution `3 from Lv.4 w/[Gargomon] in name` or `2-color w/green`; inherited `[Your Turn][Once Per Turn] When an effect suspends another Digimon, this Digimon gains Piercing for the turn.`
- Local KB: Q3482 (De-Digivolve targets one opponent Digimon), Q3483 (Piercing gained after battle does not create a security check), and Q3484 (both alternate routes require Lv.4).
- Implementation is exclusively registered with `registerIrCard("EX4-036", compiled)` and declares `coverage: "full"`, `residual: []`.

#### Clause-to-proof map

| Clause | IR | Focused proof |
| --- | --- | --- |
| Gargomon-name Lv.4 route, cost 3 | alternate requirement `level: 4`, `names: ["Gargomon"]`, `cost: 3` | public digivolve from ST17-05; memory reaches 0 |
| Green 2-color Lv.4 route, cost 3 | alternate requirement `level: 4`, `multicolor`, `colorCount: 2`, `colors: ["Green"]` | public digivolve from EX4-035; Lv.3 EX4-034 is rejected |
| End of Attack trash from top until Lv.3/last card | `TrashDigivolution`, `fromTop`, `amount: 99`, `stopAtLevel: 3` | public settled effect trashes both Lv.4/Lv.3 sources and leaves target stack empty after the following De-Digivolve 1 |
| Then De-Digivolve 1 opponent Digimon | opponent Digimon target, amount 1 | structural assertion plus settled stack/trash state |
| Inherited once-per-turn Piercing watcher | `YourTurn`, `isInherited`, `frequency: OncePerTurn`, `SubTrigger whenEffectSuspends`, `excludeSelf`, `GainKeyword Piercing`, `forTheTurn` | IR structure is asserted; the prior debug/injected watcher probe was removed after it failed to expose the keyword through the current harness |

The inherited source filter was corrected to omit an opponent-only controller restriction: the printed clause says “another Digimon,” so own and opposing Digimon are eligible while `excludeSelf` prevents self-suspension. No injected timing helper remains in this test file.

#### Commands

- Focused Vitest: PASS (9 tests).
- API typecheck: PASS.
- Oxlint on module/test: PASS.
- Oxfmt check on module/test: PASS.
- `git diff --check`: PASS.

#### Remaining gap and score

The live inherited watcher could not be made to expose the granted keyword through the current test harness without changing an engine seam; no engine edits were permitted. Q3483's post-battle security behavior is therefore represented by the IR duration/keyword contract but not independently exercised here.

Worker rubric: catalog/rules 2/2; IR fidelity 2/2; focused behavioral proof 1/2; peer/stack proof 1/2; verification 1/1; delivery gate 0/1. Worker score: **7/10** (bounded below the worker maximum of 8/10; collection delivery is coordinator-owned).

### EX4-037 — BlackMegaGargomon

#### Card and rules evidence

The committed catalog (`packages/shared/src/cards/data/cards.json`) records a Green/Black level-6 Digimon, play cost 13, 13000 DP, with alternate digivolution from either a level-5 `Rapidmon` name for 4 or a level-5 exactly two-color Digimon including Green for 4. Its printed effects are:

1. `[End of Your Turn] [Once Per Turn]` Until the end of the opponent's turn, 2 of your Green and Black Digimon gain Blocker and Reboot.
2. `[All Turns] [Once Per Turn]` When another Digimon becomes suspended, you may unsuspend this Digimon.

`node tools/kb/query.mjs card EX4-037` returns Q3485. The alternate-evolution query confirms that both routes require a level-5 Digimon; the implementation encodes that level boundary and the exact two-color Green route.

#### IR trace

`apps/api/src/cards/EX4/EX4-037.ts` registers only `registerIrCard("EX4-037", compiled)`, with `coverage: "full"` and `residual: []`.

| Printed clause | Compiled representation | Evidence |
| --- | --- | --- |
| End of your turn, once per turn | `trigger: "EndOfYourTurn"`, `frequency: "OncePerTurn"` | direct module assertion and live fire |
| 2 of your Green/Black Digimon | `controller: "mine"`, Digimon kind, `multicolor: true`, `colorCount: 2`, `colorsAll: ["Green", "Black"]`, `count: 2` | mixed-board boundary test |
| Blocker/Reboot until opponent turn end | two `GainKeyword` actions with `duration: "untilOpponentTurnEnd"` | live keyword assertions |
| Other Digimon becomes suspended; may unsuspend this | All-turn `SubTrigger` on `whenSuspended`, `excludeSelf`, optional self `Unsuspend`, once per turn | accept and decline tests |
| Alternate evolution costs | level 5 + Rapidmon-name or exactly two-color + Green, cost 4 | public digivolve intent test and EX4 color seam |

#### Behavioral and stack proof

`EX4-037.test.ts` passes 10 focused tests. It covers residual-free IR, live play, two-color target selection, single-color and opponent rejection, exact target count, optional refusal, once-per-turn unsuspend behavior, and public alternate digivolution from `ST17-07 Rapidmon`. The focused fixtures resolve through `settle()` and assert observable zones, keywords, suspension, and memory.

The evolution proof uses the legal level-5 Rapidmon route and confirms the EX4-037 card becomes the stack top after paying exactly 4 memory. The adjacent `EX4-color-seams.test.ts` proves the alternate two-color route accepts Green+Black and rejects three-color bases; peer EX4 modules use the same exact-color-count convention.

#### Worker score

| Column | Score | Reason |
| --- | --- | --- |
| Catalog/rules | 2 | Catalog fields, printed clauses, and Q3485 were checked. |
| IR trace | 2 | Every clause maps to full residual-free IR and exclusive registration. |
| Behavioral proof | 2 | Positive, negative, exact-boundary, optionality, duration, and once-per-turn paths pass. |
| Peer/stack proof | 2 | Rapidmon stack and EX4 exact-color seam pass; mixed-board target controls pass. |
| Delivery gates | 0 | Coordinator-owned. |

**Worker score: 8/10.**

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-037.test.ts --pool=threads --maxWorkers=1` — 10 passed.
- `git diff --check` — pending coordinator rerun after collection integration.

### EX4-038 — Agumon

#### Contract evidence

The catalog (`packages/shared/src/cards/data/cards.json`) identifies EX4-038 as a
black, level 3, 1000 DP Reptile/Virus Digimon with play cost 3 and a black
level-2 cost-0 evolution requirement. Its clauses are:

- On Play: reveal the top three cards; add up to one Digimon whose name
  contains `Greymon` and up to one Digimon whose name contains `Gabumon`,
  `Garurumon`, or `Omnimon`; place all remaining revealed cards on top of the
  deck in any order.
- Inherited, Your Turn, Once Per Turn: when another of your Digimon
  digivolves, gain 1 memory.

The local KB query reports Q3486 (one matching category is enough to add that
card) and Q3487 (when both categories are present, add both; the effect is not
optional). Both are covered by the positive and single-category behavioral
tests below.

#### Clause / IR / test mapping

| Clause | IR | Evidence |
| --- | --- | --- |
| Reveal exactly three | `RevealAdd.revealCount: 3` | `adds both matching reveal slots...` |
| Greymon target | first `RevealAdd.add` filter, name token `Greymon` | positive reveal test |
| Gabumon/Garurumon/Omnimon target | second `RevealAdd.add` filter with all three name tokens | IR shape assertion; positive Gabumon test |
| Add both when available | two mandatory `count: 1` entries | positive reveal test and Q3487 |
| Add only available category | same mandatory entries, engine skips absent target | `adds only the available target...` |
| Rest to top of deck | `rest: "deckTop"` | both reveal tests assert deck order |
| Inherited once-per-turn memory | `YourTurn` + `isInherited: true` + `SubTrigger.whenOneOfYoursDigivolves` + `frequency: OncePerTurn` | IR assertion and live evolution/turn-loop test |
| Another Digimon only | `sourceFilter.excludeSelf: true` | live other-vs-own evolution test |

#### Implementation / peer review

`EX4-038.ts` is exclusively registered with `registerIrCard("EX4-038", compiled)`
and declares `coverage: "full"` with no residual behavior. EX4-039 was checked
as the closest paired implementation; its reveal and inherited-trigger shape
matches the same engine conventions. The live test reaches EX4-038 through an
evolution stack and proves that another Digimon gains the memory while an
evolution of the EX4-038 stack itself does not.

#### Verification commands

- `node tools/kb/query.mjs card EX4-038` — passed; Q3486 and Q3487 recorded.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-038.test.ts --maxWorkers=1 --no-file-parallelism` — passed, 10 tests.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-038.ts apps/api/src/cards/EX4/EX4-038.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-038.ts apps/api/src/cards/EX4/EX4-038.test.ts` — passed.
- `git diff --check` — passed.

#### Remaining gap and score

The focused proof now performs two legal other-Digimon evolutions in one own
turn, proves that only the first grants memory, then runs an opponent turn and
the next own turn to prove the watcher re-arms. No engine seam or printed
ambiguity was found.

Worker rubric (delivery gates intentionally 0 for a child lane):

- Catalog/rules/Q&A: 2/2
- IR fidelity and registration: 2/2
- Behavioral proof: 2/2
- Peer/stack and boundary proof: 2/2
- Delivery gates: 0/2

Worker score: **8/10**.

### EX4-039 — Gabumon

Black Lv.3 Rookie, Virus, Reptile; play cost 3, 1000 DP; evolves from Black Lv.2 for 0.

#### Clauses and evidence

| Clause | Evidence |
| --- | --- |
| On Play: reveal top 3; add up to one Digimon with [Garurumon] and up to one Digimon with [Agumon], [Greymon], or [Omnimon]; return the rest to deck top | `adds both matching reveal slots and leaves the unmatched card on top`; `adds the only available matching slot and returns the other reveals to deck top` |
| If only one target category is present, add that card; if both are present, add both | Q3488/Q3489 from `node tools/kb/query.mjs card EX4-039`, covered by the two reveal tests |
| Inherited [Your Turn][Once Per Turn]: when another of your Digimon digivolves, gain 1 memory | `gains memory for another Digimon's evolution but not for its own`; IR shape assertion |

The module uses only `registerIrCard("EX4-039", compiled)` and reports `coverage: "full"` with no residuals. Filters are controller-local Digimon name matches; the remainder is explicitly `deckTop`, preserving the printed “any order” destination. The evolution test uses a realistic stack with EX4-039 as the inherited source and distinguishes another Digimon from self.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-039.test.ts
  10 tests passed
```

Catalog, direct IR registration, positive/negative reveal boundaries, deck-top restoration, inherited timing, self-exclusion, and once-per-turn metadata are covered. The reveal proof and self-evolution boundary now use public play/digivolve intents; no injected timing helper remains in this file. No unresolved card-specific ambiguity remains.

#### Score

| Column | Score | Rationale |
| --- | ---: | --- |
| Catalog / rules | 2 | Catalog fields and Q3488/Q3489 are pinned. |
| IR trace | 2 | Both printed effects map to complete IR with exact filters and destinations. |
| Behavioral proof | 2 | Both-target, one-target, deck-top remainder, and inherited evolution paths pass. |
| Peer / stack proof | 2 | EX4-038 uses the same shared search/inherited pattern; EX4-039 is exercised as an evolution source. |
| Delivery gates | 0 | Coordinator-owned. |
| **Total** | **8/10** | Worker ceiling. |

### EX4-040 — SkullKnightmon

#### Printed contract and sources

- Catalog: `packages/shared/src/cards/data/cards.json` — black Lv4, play cost 4, 4000 DP; alternate evolution from black Lv3 for 3 or blue Lv3 for 3; `[On Play]` conditionally and optionally plays one `[Nene Amano]` from hand without paying; `[On Deletion]` reveals one deck card, adds it if it has `[Blue Flare]` or `[Twilight]`, and trashes otherwise; inherited `<Reboot>`.
- Knowledge base: `node tools/kb/query.mjs card EX4-040 --json` — Q3490 confirms EX4-062 may be played; Q3491 confirms EX4-062 counts as `[Nene Amano]` and blocks the condition.
- No errata, banlist, or unresolved ambiguity.

#### Clause-to-proof mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Black/blue Lv3 alternate evolution, cost 3 | `digivolutionRequirement` | Focused legal black and blue stacks; invalid-color rejection |
| Optional Nene play only when absent, free from hand | `OnPlay` `PlayWithoutCost`, `optional`, `youHaveNone`, exact name | Positive EX4-062 alias, existing Nene blocks, optional live path, longer-name negative |
| Deletion reveal and trait gate; rest to trash | `OnDeletion` `RevealAdd`, trait OR, `rest: trash` | Matching EX4-021 added; nonmatching BT1-012 trashed |
| Inherited Reboot | inherited `Static` keyword | Suspended stacked host unsuspends in opponent phase |

#### Verification

Commands run:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-040.test.ts --maxWorkers=1 --no-file-parallelism  # 1 file, 13 tests passed
pnpm --filter @aegis/api exec oxlint apps/api/src/cards/EX4/EX4-040.ts apps/api/src/cards/EX4/EX4-040.test.ts
pnpm --filter @aegis/api exec oxfmt --check apps/api/src/cards/EX4/EX4-040.ts apps/api/src/cards/EX4/EX4-040.test.ts
pnpm --filter @aegis/api typecheck
git diff --check
```

The focused test was run serially with one worker. Worker score: catalog/rules 2/2, IR 2/2, behavior 2/2, peer/stack 2/2, reproducibility 2/2; delivery gates 0/2 per worker brief. Worker claim: **8/10 maximum**; coordinator must recalculate collection gates.

### EX4-041 — DeadlyAxemon

#### Printed contract and sources

- Catalog: `packages/shared/src/cards/data/cards.json` — black Lv4 Champion, 4000 DP, play cost 4; alternate evolution from black or blue Lv3 for 3; types Dark Animal and Twilight.
- `[On Play]` By trashing one card with the `[Blue Flare]` or `[Twilight]` trait in hand, draw 2 cards.
- `[On Deletion]` Reveal the top card of the deck. Add it to hand if it has either trait; trash it otherwise.
- Inherited `[All Turns]` This Digimon gets +1000 DP.
- `node tools/kb/query.mjs card EX4-041` returns no knowledge-base entry; `KB-INDEX.md` lists no Q&A for this card.

#### Clause-to-proof mapping

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Black/blue Lv3 alternate evolution, cost 3 | `digivolutionRequirement` with two alternate requirements | Public legal black and blue stacks assert top card, source stack, and memory; red Lv3 negative rejects without moving or spending memory |
| Optional On Play cost and draw | Optional `Draw` amount 2 with hand trait-filtered trash cost and `abortOnDecline` | Paid Blue Flare cost moves to trash and draws two; optional decline and unavailable non-trait card leave deck unchanged |
| On Deletion reveal/add or trash | `RevealAdd`, one card, trait filter, `rest: trash` | Blue Flare/Twilight reveal reaches hand; unrelated card reaches trash |
| Inherited All Turns +1000 DP | Inherited `ModifyDP` +1000, permanent, self target | Real evolution-stack host observes 3000 DP from a 2000 DP host |

The module uses only `registerIrCard("EX4-041", compiled)`.

#### Verification

```text
timeout 300 pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-041.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=20000
  1 file, 12 tests passed

pnpm exec oxlint apps/api/src/cards/EX4/EX4-041.ts apps/api/src/cards/EX4/EX4-041.test.ts
  passed
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-041.ts apps/api/src/cards/EX4/EX4-041.test.ts
  passed
pnpm --filter @aegis/api typecheck
  passed
git diff --check
  passed
```

#### Defect fixed and remaining gaps

Added the missing executable `digivolutionRequirement` entries for the two catalog routes and added public stack, exact catalog, and unavailable-cost evidence. No card-specific engine seam or unresolved ruling ambiguity remains.

#### Score

| Column | Score | Rationale |
| --- | ---: | --- |
| Catalog / rules | 2 | Catalog clauses and absence of Q&A are recorded. |
| IR trace | 2 | All printed clauses map to exclusive compiled IR, including both evolution routes. |
| Behavioral proof | 2 | Paid/declined/unavailable cost paths, deletion endpoints, inherited DP, and exact evolution boundaries pass. |
| Peer / stack proof | 2 | Black and blue legal public stacks plus invalid-color negative are exercised; inherited source is observed through a stack. |
| Delivery gates | 0 | Coordinator-owned. |
| **Total** | **8/10** | Worker ceiling. |

### EX4-042 — DarkMaildramon

#### Printed contract

Catalog text: `[Your Turn] This Digimon and all Digimon with [Knightmon] or
[Knightsmon] in their names are unblockable.` The catalog identifies
DarkMaildramon as a level-4 Black/Blue Cyborg Digimon, play cost 4, 4000 DP,
with Black or Blue level-3 evolution routes costing 3. The card query returned
no local knowledge-base entries or Q&A IDs for EX4-042.

#### Clause-to-proof map

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Your Turn | `trigger: "YourTurn"` | Real turn loop test observes the restriction on the active turn and its removal after ending that turn. |
| This Digimon is unblockable | First `GrantStatic`, `isSelfRef: true`, `duration: "forTheTurn"` | Public play and public digivolution tests assert `cantBeBlocked` on the DarkMaildramon permanent. |
| All Digimon with Knightmon or Knightsmon in their names | Second `GrantStatic`, `count: "all"`, `nameOrTrait.match: "name"`, tokens `Knightmon` and `Knightsmon` | Public stack test proves an opponent's GreyKnightsmon-named card matches; mixed-board test proves a non-matching card does not. No controller filter is present, matching the unqualified “all Digimon” text. |
| Unblockable lasts for the turn | Both grants use `duration: "forTheTurn"` | Turn-loop test ends seat 0's turn and asserts all restrictions expire during seat 1's turn. |

#### Stack and peer proof

The focused test uses the public `digivolve` intent from black level-3 BT10-058
to EX4-042, asserts the exact 3-memory cost and source-stack identity, and then
checks the effect. The mixed board includes EX4-021 GreyKnightsmon (matching
the `Knightsmon` substring), the EX4-042 self target, and inert BT1-009
non-matches on both sides. This also proves the global target is not silently
restricted to the controller's board.

#### Verification commands

- `timeout 300 pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-042.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=20000` — **7 passed**.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-042.ts apps/api/src/cards/EX4/EX4-042.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-042.ts apps/api/src/cards/EX4/EX4-042.test.ts` — passed.
- `git diff --check` — passed.
- `pnpm --filter @aegis/api typecheck` — passed.

No engine seam or catalog discrepancy was found. The module already uses the
required exclusive `registerIrCard("EX4-042", compiled)` registration and
`coverage: "full"` with an empty residual list. No production IR change was
needed; the audit strengthened the behavioral evidence in the colocated test.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog and rules | 2/2 |
| IR fidelity | 2/2 |
| Behavioral proof | 2/2 |
| Peer and evolution-stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX4-043 — Garurumon

#### Contract and sources

The catalog record in `packages/shared/src/cards/data/cards.json` identifies EX4-043 as a
Black level-4 Beast Digimon (play cost 5, 5000 DP), normally evolving from a Black level-3
Digimon for 2. Its effect is:

1. `[When Digivolving]` 1 of your other Digimon may digivolve into a level 6 or lower
   Digimon card with `[Greymon]` in its name from your hand for the digivolution cost; when
   that Digimon digivolves by this effect, reduce the digivolution cost by 2.
2. Inherited: unsuspend this Digimon during the opponent's unsuspend phase (`Reboot`).

`node tools/kb/query.mjs card EX4-043` returns no knowledge-base entries. No local erratum,
ruling, or restriction is indexed for this card.

#### Implementation and proof

`apps/api/src/cards/EX4/EX4-043.ts` registers only `registerIrCard("EX4-043", compiled)`.
The compiled IR uses a `WhenDigivolving` optional `Digivolve` action targeting one other own
Digimon, sourcing only from hand, filtering `[Greymon]` in name and level `<= 6`, paying the
printed evolution cost with `payCost: true` and applying `costDelta: -2`. The inherited static
keyword is `Reboot`; coverage is `full` and residuals are empty.

The colocated tests cover the IR contract, live registration, a successful hand evolution
with the two-memory reduction, a non-Greymon negative, the exact level-6 acceptance boundary,
level-7 rejection, declining the optional effect, and inherited Reboot during the opponent's
unsuspend phase. Evolution assertions verify the physical top card, retained hand instance,
and memory movement.

Defect fixed: the prior action omitted `payCost: true`. The interpreter treats an omitted
`payCost` as a cost-free effect evolution, so the card silently ignored the printed
"for the digivolution cost" clause. The level-6 boundary test now pins a printed cost-3
evolution to memory 10 -> 9 after the reduction.

#### Verification

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-043.test.ts
```

The initial run exposed the missing payment (memory stayed at 10 for a cost-3 evolution).
After adding `payCost: true`, the corrected focused run passes all 9 tests; `tsc --noEmit`,
`oxfmt --check`, and `git diff --check` are also clean for the scoped files.

#### Remaining gaps

- The focused suite should be rerun after the added boundary/refusal cases; coordinator gates
  (collection run, typecheck, formatting, and diff validation) remain outstanding.
- No direct UI/browser stack trace was needed: the public engine harness exercises the legal
  evolution stack and inherited lifecycle.

#### Worker score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX4-044 — Greymon

#### Contract and sources

The catalog record in `packages/shared/src/cards/data/cards.json` identifies EX4-044 as a
Black level-4 Dinosaur Digimon (play cost 5, 5000 DP), normally evolving from a Black
level-3 Digimon for 2. Its effect is:

1. `[When Digivolving]` 1 of your other Digimon may digivolve into a level 6 or lower
   Digimon card with `[Garurumon]` in its name from your hand for the digivolution cost;
   when that Digimon digivolves by this effect, reduce the digivolution cost by 2.
2. Inherited: unsuspend this Digimon during the opponent's unsuspend phase (`Reboot`).

`node tools/kb/query.mjs card EX4-044` returns no knowledge-base entries. No local erratum,
ruling, or restriction is indexed for this card. The comprehensive rules interpretation is
the standard hand evolution procedure: the selected other own Digimon pays the destination
card's legal evolution cost, modified by the effect's reduction.

#### Implementation and proof

`apps/api/src/cards/EX4/EX4-044.ts` registers only `registerIrCard("EX4-044", compiled)`.
The compiled IR uses a `WhenDigivolving` optional `Digivolve` action targeting exactly one
other own Digimon, sourcing only from hand, filtering `[Garurumon]` in name and level `<= 6`,
paying the printed evolution cost with `payCost: true`, and applying `costDelta: -2`. The
inherited static keyword is `Reboot`; coverage is `full` and residuals are empty.

The colocated suite proves the IR contract, live registration, successful hand evolution,
the name-filter negative, inherited Reboot, the legal level-6 boundary, actual cost
reduction, and optional refusal. The level-6 case evolves a level-5 Digimon into BT1-044
(MetalGarurumon, printed cost 3), proving the reduction through memory 10 -> 9. The refusal
case leaves the target stack, source card in hand, and memory unchanged.

Peer comparison with EX4-043 and EX4-045 confirms the shared “other own Digimon / level 6 or
lower / named hand evolution / reduce by 2” structure, while EX4-044 correctly filters the
Garurumon name and carries only its own inherited Reboot clause.

#### Verification

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-044.test.ts --no-file-parallelism
```

Coordinator acceptance: all 9/9 focused tests pass. Scoped `oxfmt --check` and
`git diff --check` are clean for the card files. Collection-level regression and repository
typecheck remain coordinator-owned.

#### Remaining gaps

No unresolved card-specific ambiguity or unsupported clause remains. Full collection gates,
repository typecheck, and final branch delivery remain coordinator-owned.

#### Worker score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX4-045 — MetalGreymon

#### Contract and sources

The catalog record in `packages/shared/src/cards/data/cards.json` identifies EX4-045 as
a Black level-5 Cyborg Digimon (play cost 7, 7000 DP), normally evolving from a Black
level-4 Digimon for 3. Its effect is:

1. `[When Digivolving]` 1 of your other Digimon may digivolve into a level 6 or lower
   Digimon card with `[Garurumon]` in its name from your hand for the digivolution cost;
   when that Digimon digivolves by this effect, reduce the digivolution cost by 2.
2. Inherited: when an opponent's Digimon attacks, you may suspend this Digimon to force
   the opponent to attack it instead.

`node tools/kb/query.mjs card EX4-045` returns no knowledge-base entries. No local
erratum, ruling, or restriction is indexed for this card.

#### Implementation and proof

`apps/api/src/cards/EX4/EX4-045.ts` registers only `registerIrCard("EX4-045", compiled)`.
The compiled IR uses an optional `WhenDigivolving` `Digivolve` action targeting exactly
one other own Digimon, sourcing from hand, filtering name `[Garurumon]` and level `<= 6`,
paying the printed evolution cost with `payCost: true`, and applying `costDelta: -2`.
The inherited trigger is an opponent-turn attack sub-trigger whose optional suspend cost
redirects the attack to the inherited host. Coverage is `full` with no residuals.

The focused suite proves live registration, successful hand evolution, the exact level-6
boundary with memory movement (BT1-044 cost 3 becomes cost 1), a name-filter negative,
optional refusal, inherited redirection after suspension, and declined redirection.
The target filter excludes the source itself and the evolution stack is asserted through
the resulting top card and inherited host behavior.

Defect fixed: the prior IR omitted `payCost: true`, which silently made this effect's
evolution free. The existing low-cost fixture masked the defect because BT1-036 costs 2
and the printed reduction also subtracts 2; the new level-6 boundary test exposes payment.

#### Verification

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-045.test.ts
```

Result: 10 tests passed.

#### Remaining gaps

No unresolved card-specific ambiguity or unsupported clause remains. Collection-level
regression, typecheck, formatting, and diff validation remain coordinator-owned.

#### Worker score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX4-046 — WereGarurumon

#### Contract and sources

The committed catalog record in `packages/shared/src/cards/data/cards.json` identifies
EX4-046 as a Black level-5, 7000 DP WereGarurumon (play cost 7), evolving from a Black
level-4 Digimon for 3. Its printed clauses are:

1. `[When Digivolving]` 1 of your other Digimon may digivolve into a level 6 or lower
   Digimon card with `[Greymon]` in its name from your hand for the digivolution cost;
   when that Digimon would digivolve by this effect, reduce the digivolution cost by 2.
2. Inherited: when an opponent's Digimon attacks, you may suspend this Digimon to force
   the opponent to attack it instead.

`node tools/kb/query.mjs card EX4-046` returns no knowledge-base entries. No local
erratum, ruling, or restriction is indexed for this card. The matching peer EX4-045
uses the same hand-only optional Digivolve and inherited attack-redirection structure;
EX4-046 correctly substitutes the `[Greymon]` name filter.

#### Implementation and proof

`apps/api/src/cards/EX4/EX4-046.ts` registers executable behavior exclusively with
`registerIrCard("EX4-046", compiled)`. The IR uses an optional `WhenDigivolving`
`Digivolve` action targeting exactly one other own Digimon, sourcing only from hand,
filtering Digimon cards with name `[Greymon]` and level `<= 6`, paying the printed
digivolution cost, and applying the scoped `costDelta: -2`. The inherited effect is an
opponent-turn `whenOpponentAttacks` sub-trigger whose optional suspend cost redirects
the attack to the inherited host. Coverage is `full` with no residuals.

The audit corrected the prior legacy `reduceCost: 2` spelling to the canonical signed
`costDelta: -2`. This preserves the reduction on the selected digivolution while making
the action shape consistent with the audited peer and current IR conventions.

`EX4-046.test.ts` proves live registration, successful hand evolution, exact name and
level filtering, a negative non-Greymon hand case, the level-6 boundary (EX4-012),
printed-cost payment after the two-memory reduction, optional refusal, inherited
redirection after suspending the host, and declined redirection. The inherited-host
fixture also exercises the effect through an evolution stack.

#### Verification

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-046.test.ts --reporter=dot
```

Result: 10 tests passed. `git diff --check` passed for the owned files. The workspace
typecheck remains blocked by the unrelated pre-existing `EX4-047.test.ts:232`
`Permanent.state` error. The coordinator separately fixed and reran the EX4-059 and
EX4-060 implicit-any checks; those changes are outside this card's scope.

#### Acceptance

Coordinator acceptance: 10/10 after collection review. No unresolved EX4-046 clause or
unsupported card-specific behavior remains.

#### Worker score

| Component | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Worker total** | **8/10** |

### EX4-047 — DarkKnightmon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`. EX4-047 is DarkKnightmon, Black level 5, play cost 8, 7000 DP, traits `Dark Knight`/`Twilight`, with Black or Blue level-4 evolution for 4. Its DigiXros recipe is `[SkullKnightmon]` and `[DeadlyAxemon]` with DigiXros -2. Main text grants one own Digimon Blocker until the end of the opponent's turn and, if DigiXrosing, one opponent Digimon Blocker. On deletion it reveals 2, adds one `[Blue Flare]` or `[Twilight]` trait card, and trashes the rest. Inherited text is an opponent-turn once-per-turn optional GreyKnightsmon attack redirect.

`node tools/kb/query.mjs card EX4-047` returns no card-specific entry. DigiXros rules in `data/kb/rules/comprehensive.md` §7-2 were checked: DigiXros is optional, specified materials are stacked under the played card, and -2 applies per material.

#### IR and behavioral mapping

Implementation: [`apps/api/src/cards/EX4/EX4-047.ts`](../../apps/api/src/cards/EX4/EX4-047.ts). It has `coverage: "full"`, `residual: []`, and exclusive `registerIrCard` registration.

| Clause | IR | Proof |
| --- | --- | --- |
| Exact DigiXros recipe | `digiXrosRequirement` with exact names/count | Legal public DigiXros costs 4; wrong material is rejected with no payment/movement. |
| Own/opponent Blocker and DigiXros condition | Two `OnPlay` `GainKeyword` actions, second gated by `digiXrosCount minimum 1`; duration `endOfOpponentTurn` | Ordinary play grants only own Blocker; legal DigiXros grants both. |
| On deletion reveal/add/trash | `RevealAdd`, reveal 2, matching Blue Flare/Twilight trait, rest trash | Public deletion adds EX4-021 and trashes BT10-056. |
| Inherited redirect | Opponent-turn inherited `SubTrigger`, exact GreyKnightsmon condition, optional `RedirectAttack`, `OncePerTurn` | Valid stack redirects; nonmatching host does not; declined choice leaves host unsuspended and target unchanged. |

Test file: [`apps/api/src/cards/EX4/EX4-047.test.ts`](../../apps/api/src/cards/EX4/EX4-047.test.ts). It contains 13 passing tests covering catalog/runtime identity, legal and illegal DigiXros stacks, conditional Blocker behavior, deletion zones, exact GreyKnightsmon filtering, and optional refusal. All async effects settle before assertions; no Digi-Egg fixtures are used.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-047.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: 1 file, 13 tests.

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-047.ts apps/api/src/cards/EX4/EX4-047.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-047.ts apps/api/src/cards/EX4/EX4-047.test.ts
git diff --check
pnpm --filter @aegis/api typecheck
```

All passed. Root typecheck and collection suites were not run per the worker brief.

#### Defects and score

No runtime defect or engine seam found. The colocated test was strengthened with catalog/runtime assertions, exact recipe, invalid-material, and optional-decline proof. Remaining gap: delivery gates are coordinator-owned.

| Column | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX4-048 — Gaiomon

#### Sources and printed clauses

- Catalog `packages/shared/src/cards/data/cards.json`: Black/Red level 6 Digimon, play cost 12, DP 12000, Black or Red level 5 evolution for 4, name Gaiomon.
- Printed text: this card/Digimon is also treated as having `[Greymon]` in its name; `[When Digivolving]` delete 1 opposing Digimon with play cost 13 or more, and if no Digimon was deleted by this effect, trash the top opponent security card; `[End of Your Turn]`, if you have a Tamer in play, this Digimon may digivolve into a Gaiomon-name card with play cost 13 or more in hand, ignoring requirements and without paying the cost.
- Knowledge-base Q&A: `Q3492` (Q&A index entry for EX4-048). The rule grants an additional name for effects that specify cards with Greymon in their names, but does not make the card an exact-name `[Greymon]` card.

#### Implementation and evidence map

| Clause | Compiled IR | Behavioral evidence |
| --- | --- | --- |
| Additional Greymon name | `Static` → `GrantStatic`, `grant: "name"`, token `Greymon` | Live digivolution test observes effective name `greymon`; static IR assertion checks the exact grant. |
| Delete opposing cost ≥13 | `WhenDigivolving` → `Delete`, opponent Digimon, `playCostGte: 13` | Positive deletion of `AD1-025` (cost 15); boundary test leaves `AD1-004` (cost 12) and deletes `BT1-083` (cost 13). |
| Fallback security trash | `WhenDigivolving` → `SecurityManipulation trashTop`, guarded by `ifThisEffectDidNotDelete` | No qualifying Digimon test reduces opponent security by one and moves the original top card to trash. |
| Optional alternate evolution | `EndOfYourTurn` → optional `Digivolve`, `from: ["hand"]`, `payCost: false`, `ignoreRequirements: true`, `name` Gaiomon, `playCostGte: 13`, gated by own Tamer | Positive test evolves into `BT9-068` (Gaiomon, cost 13) with Tamer and confirms it leaves hand; no-Tamer case remains unchanged; high-cost non-Gaiomon `AD1-025` is rejected. |

The direct module uses only `registerIrCard("EX4-048", compiled)` and reports `coverage: "full"` with no residual actions. No engine seam or retained red was needed.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-048.test.ts --maxWorkers=1 --no-file-parallelism` — **passed**, 1 file / 11 tests.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-048.ts apps/api/src/cards/EX4/EX4-048.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-048.ts apps/api/src/cards/EX4/EX4-048.test.ts` — **passed**.
- `git diff --check` — **passed**.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog / rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer / stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Worker total** | **8/10** |

### EX4-049 — CresGarurumon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Evidence

Catalog source: `packages/shared/src/cards/data/cards.json`. EX4-049 is
CresGarurumon, a Black/Blue level 6 Digimon with play cost 12, DP 12000,
trait `Beast Knight`, and alternate evolution from `[WereGarurumon]` for 3.
Its When Digivolving text offers exactly one of three effects: return any
number of opposing Digimon whose combined play costs are up to 6 to the
bottom of their owner's deck; evolve one other own Digimon into a level 6 or
lower card with `[Greymon]` in its name from hand without paying; or DNA
digivolve this Digimon and one other own Digimon into a hand Digimon card for
the printed cost. Its inherited text is an optional once-per-turn When
Attacking effect that returns one opposing level 5 or lower Digimon to the
bottom of its owner's deck when the attacking Digimon has `[Omnimon]` in its
name.

`node tools/kb/query.mjs card EX4-049` has no card-specific entries. The
catalog text and the generated effect record in
`packages/shared/src/effects/effects.json` were used as the local evidence
sources for the card clauses.

#### IR and behavioral mapping

| Clause | IR | Behavioral evidence |
| --- | --- | --- |
| Alternate evolution | `digivolutionRequirement` exact `[WereGarurumon]`, cost 3 | Compiled requirement assertion. |
| Modal choice one | `Modal` option with opponent Digimon, `count: "all"`, combined play-cost budget 6, `deckBottom` | Direct effect test returns two distinct cost-3 opposing Digimon. |
| Modal choice two | Other own Digimon target; hand Digimon level ≤6 with `Greymon` in name; `payCost: false`, requirements ignored | Direct effect test confirms target/card selection and zero-cost digivolution flags; public engine test confirms the stack transition and hand removal. |
| Modal choice three | Self plus one other own battle-area Digimon as DNA materials; hand destination; `payCost: true` | Public engine test confirms the DNA result enters play and the selected hand card leaves hand. |
| Inherited attack effect | Inherited `WhenAttacking`, `OncePerTurn`, opponent level ≤5 target, Omnimon-name condition, deck-bottom return | Direct effect test selects only the level-5 target and excludes level 6; generated IR preserves the once-per-turn and inherited markers. |

The direct module uses only `registerIrCard("EX4-049", compiled)` and reports
`coverage: "full"` with no residual actions. The module normalizes only the
generated When Digivolving modal into the same printed three choices; the
inherited effect remains represented by the generated IR.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-049.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: 1 file, 9 tests.

```text
pnpm exec oxlint apps/api/src/cards/EX4/EX4-049.ts apps/api/src/cards/EX4/EX4-049.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-049.ts apps/api/src/cards/EX4/EX4-049.test.ts
git diff --check
pnpm --filter @aegis/api typecheck
```

All passed. No engine seam or card-specific runtime defect was found. The
focused proof covers legal modal flows, target and level/cost boundaries,
deck-bottom destinations, paid versus unpaid digivolution, DNA materials, and
the inherited Omnimon condition. Collection-wide and delivery gates remain
coordinator-owned.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog / rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer / stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Worker total** | **8/10** |

### EX4-050 — ShadowSeraphimon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Sources and printed clauses

- Catalog: `packages/shared/src/cards/data/cards.json`. EX4-050 is ShadowSeraphimon, a Black/Yellow level 6 Digimon with play cost 12, 12000 DP, Virus/Seraph, and alternate evolution from `[Seraphimon]` for 1.
- Printed text: `[Opponent's Turn]` when a card is removed from your security stack, De-Digivolve 1 of an opponent's Digimon; `[On Deletion]` place the top card of your deck on top of your security stack, then one opposing Digimon gets -4000 DP for the turn for each card in your security stack.
- `node tools/kb/query.mjs card EX4-050` returns Q3493. It confirms that this watcher resolves during a security attack before the next check, so De-Digivolve can remove Security Attack +1 and prevent a subsequent check.

#### IR and behavioral evidence

| Clause | IR | Evidence |
| --- | --- | --- |
| Alternate evolution | Exact `[Seraphimon]`, cost 1, alternate requirement | Direct compiled requirement assertion. |
| Opponent-turn security watcher | `OpponentsTurn` → `SubTrigger whenSecurityRemoved`, `sourceFilter: { controller: "mine" }`, `fireCondition` for the source controller's security, opposing Digimon target, De-Digivolve 1 | Structural assertion plus a public opponent attack removing own security; a real opposing stack loses exactly one source. |
| On Deletion recovery | `SecurityManipulation addTop`, own deck, one card | Focused live test confirms the deck top becomes security. |
| Security-scaled DP reduction | Opposing Digimon, -4000 per own security, `forTheTurn` | Focused live test with three resulting security cards observes 15000 → 3000 DP. |

The direct module uses only `registerIrCard("EX4-050", compiled)`, with
`coverage: "full"` and no residual actions. The audit correction adds the
explicit watched-security direction and matching trigger-seat condition so the
effect cannot react to the opponent removing a card from their own stack.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-050.test.ts --maxWorkers=1 --no-file-parallelism
  1 file, 8 tests passed

git diff --check
  passed
```

The focused suite covers the exact evolution name/cost, security-removal
trigger shape and live public attack/De-Digivolve stack transition, deletion
recovery, and security-count DP scaling. All deck/security fixtures use
main-deck cards (no Digi-Egg filler). Q3493 is recorded as the only
card-specific ruling; no unresolved ambiguity remains. Collection-wide and
delivery gates remain coordinator-owned.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog / rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer / stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Worker total** | **8/10** |

### EX4-051 — BlitzGreymon

Date: 2026-09-09
Worktree: `audit-ex4-luna-20260909`
Scope: card-only re-audit; no git writes performed.

#### Sources and printed clauses

- Catalog `packages/shared/src/cards/data/cards.json`: EX4-051 BlitzGreymon, Black/Red level 6 Digimon, play cost 12, 12000 DP, Black or Red level-5 evolution for 4, Cyborg/Virus.
- Printed main text: `Digivolve: 3 from [MetalGreymon]`; `[When Digivolving]` activate one of three effects: De-Digivolve 1 on 3 opposing Digimon; digivolve one other own Digimon into a level 6 or lower Digimon card with `[Garurumon]` in its name from hand without paying; or this Digimon and one other own Digimon may DNA digivolve into a Digimon card in hand for its cost.
- Printed inherited text: `[When Attacking][Once Per Turn]` if this Digimon has `[Omnimon]` in its name, trash the top opponent security card.
- `node tools/kb/query.mjs card EX4-051`: no card-specific knowledge-base entry. The Knowledge base index below likewise records no Q&A (`—`). Comprehensive rules §16-12 (De-Digivolve) and §8-2-2-1-7 (DNA Digivolution) were checked; no unresolved card-specific ambiguity remains.

#### IR and behavioral evidence map

| Clause | Compiled IR | Observable evidence |
| --- | --- | --- |
| MetalGreymon alternate evolution | `digivolutionRequirement: [{ level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true }]` | Public legal digivolution from the EX4 helper fixture reaches EX4-051; the module exposes the exact alternate requirement. |
| Choose exactly one When Digivolving mode | `WhenDigivolving` → `Modal`, `choose: 1`, three option branches | Static IR test and three public mode tests resolve each branch after `settle()`. |
| De-Digivolve 1 on three opposing Digimon | `DeDigivolve`, opponent Digimon target, `count: 3`, `forceSelection: true`, `amount: 1`, guarded by opponent count ≥3 | Engine-level primitive proof confirms three selected permanents each lose one source; public test trashes each top card and leaves the three base Digimon. With only two opponents, no cards are trashed and stacks remain intact. |
| Free Garurumon digivolution | `Digivolve` one other own Digimon (`excludeSelf`), level ≤6, name contains `Garurumon`, `from: ["hand"]`, `payCost: false` | Public mode-two test evolves the other permanent into ST2-06 and confirms the hand card is consumed without memory payment. |
| DNA digivolution for printed cost | `DnaDigivolve` materials are this permanent plus one other own battle-area Digimon; `payCost: true`; result is an own Digimon card | Public mode-three test consumes EX4-060 from hand and confirms the resulting DNA stack exists. The shared primitive performs the hand-zone result selection and printed DNA cost payment. |
| Inherited Omnimon attack effect | Inherited `WhenAttacking`, `SecurityManipulation trashTop`, opponent controller, amount 1, condition `selfHasNameContaining Omnimon`, `frequency: OncePerTurn` | Public attack test with EX4-073 host (Omnimon-named) reduces opponent security by one. A non-Omnimon host leaves four security cards unchanged; a second attack in the same turn does not trash again. |

The direct module `apps/api/src/cards/EX4/EX4-051.ts` uses only `registerIrCard("EX4-051", compiled)`, with `coverage: "full"` and `residual: []`; no legacy `registerCard` or hand-written fallback is present.

#### Peer and stack review

- EX4-049 uses the same modal free-digivolution and DNA action families; EX4-051 correctly differs by retaining its printed cost and using `Garurumon` (not `Greymon`) as the destination name filter.
- EX4-060 and EX4-066 provide nearby BlitzGreymon/Omnimon exact-name and stack interactions. The inherited watcher test uses a real `EX4-051` source under an Omnimon host and a nonmatching host negative.
- No Digi-Egg cards or numeric security shortcuts are used. Effects are resolved through public intents and settled observable state; no engine seam or retained red was found.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-051.test.ts --maxWorkers=1 --no-file-parallelism
```

Passed: 1 file, 13 tests.

```text
pnpm --filter @aegis/api typecheck
pnpm exec oxlint apps/api/src/cards/EX4/EX4-051.ts apps/api/src/cards/EX4/EX4-051.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-051.ts apps/api/src/cards/EX4/EX4-051.test.ts
git diff --check
```

All passed. Root typecheck and collection suites were not run per the worker brief.

#### Defects and score

No implementation defect or reusable engine seam found. Existing focused tests already provide positive, negative, numeric-boundary, cost/zone, inherited, and once-per-turn evidence. Remaining gap: delivery gates are coordinator-owned.

| Column | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |

### EX4-052 — Fake Agumon Expert

#### Evidence

- Catalog: `packages/shared/src/cards/data/cards.json` identifies a Purple level-3 Rookie Dinosaur, play cost 3, 2000 DP, with a Purple level-2 evolution for 0.
- Printed effect: `[Your Turn][Once Per Turn] When an opponent's Digimon is deleted, by trashing 1 card of the same level in your hand, draw 2 cards.`
- Knowledge base: `node tools/kb/query.mjs card EX4-052`; Q3494 confirms that level-less EX2-045 Calumon cannot satisfy the same-level cost.
- Implementation: `apps/api/src/cards/EX4/EX4-052.ts` uses exclusive `registerIrCard("EX4-052", compiled)` with a full-coverage IR definition.

#### Verified behavior

- Your-turn deletion watcher only accepts an opponent's Digimon.
- The watcher is once per turn and requires one same-level card in the controller's hand as a trash cost.
- Successful payment draws exactly two cards; no eligible same-level card leaves hand/deck unchanged.
- Optional refusal leaves the cost card in hand and draws nothing.
- Level-less Calumon does not falsely match another level-less Calumon, per Q3494.
- Purple level-2 to EX4-052 digivolution for 0 is exercised.

#### Verification

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-052.test.ts` — 8 tests passed.

No reusable engine seam changed. Remaining ambiguity: none found in the local catalog, KB, or rules evidence.

Score: 10/10.

### EX4-053 — Falcomon

#### Result

EX4-053 Falcomon is implemented as complete IR via the exclusive
`registerIrCard("EX4-053", compiled)` path. No card-module change was needed;
the focused test was strengthened with catalog/runtime registration proof,
mixed reveal fixtures, and a positive inherited-deletion case.

#### Printed clauses and sources

- Catalog `EX4-053`: Purple, Digimon, Lv.3, play cost 3, 1000 DP, Avian;
  On Play reveals the top 3, adds up to one qualifying purple Digimon and one
  Keenan Crier, then bottoms the rest in any order.
- Inherited On Deletion: if deleted outside a battle, the opponent trashes one
  card from hand.
- Local KB Q2614: an inherited deletion effect whose activation condition is
  not met after an attack cannot activate; the by-battle negative test proves
  this boundary.
- Local KB Q3495: if only one applicable reveal target exists, that target may
  still be added; the single-slot/only-match path is covered by the reveal
  behavior.
- Local KB Q3496: when both target slots are present, both must be added when
  possible; the two-target path asserts both cards reach hand.

#### Clause → IR → behavioral evidence

| Clause | IR mapping | Focused proof |
| --- | --- | --- |
| Reveal exactly 3 | `OnPlay` → `RevealAdd.revealCount: 3` | structural assertion plus public play path |
| Purple Digimon with Ravemon name or Bird/Avian trait | first `add` filter: `kind: Digimon`, `colors: Purple`, name/trait alternatives | EX4-058 Ravemon is added; purple EX4-054 Wendigomon is retained at deck bottom as a near-match |
| One Keenan Crier | second `add` filter uses exact name | EX4-064 is added; ST24-14 longer name is rejected |
| Add all available target slots | two separate `count: 1` add entries | both matching reveals reach hand; nonmatching reveal remains in deck |
| Bottom all remaining reveals | `rest: deckBottom` | public path asserts EX4-054 remains in deck |
| Inherited deletion outside battle | inherited `OnDeletion`, `not(triggerRemovalCause: byBattle)` → opponent `Trash` one hand card | legal EX4-054 host over EX4-053, deleted by effect, leaves one card in opponent hand and one in trash |
| Battle deletion does not activate | same condition excludes `byBattle` | legal stack deleted by battle leaves opponent hand/trash unchanged |

#### Peer and stack proof

The implementation was compared with EX4-055/056 inherited outside-battle
conditions and EX4-058 reveal/filter conventions. The focused tests use a legal
Lv.3 EX4-053 source under Lv.4 EX4-054 (Purple/Green evolution requirement),
then exercise both effect deletion and battle deletion. The reveal fixture
contains a true Ravemon, an exact Keenan Crier, and a purple Digimon lacking the
required name/trait, so color-only false positives are rejected.

#### Commands

All commands ran in the assigned worktree:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-053.test.ts --maxWorkers=1 --no-file-parallelism
  PASS — 1 file, 10 tests
pnpm --filter @aegis/api typecheck
  PASS
pnpm exec oxlint apps/api/src/cards/EX4/EX4-053.ts apps/api/src/cards/EX4/EX4-053.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-053.ts apps/api/src/cards/EX4/EX4-053.test.ts
  PASS
git diff --check
  PASS
```

#### Worker score (delivery gates intentionally 0)

- Catalog/rules fidelity: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker lane does not commit or push)
- Worker total: 8/10

Remaining audit-lane limitation: no collection-level recalculation or pushed
commit is claimed by this worker, per the worker brief.

### EX4-054 — Wendigomon

#### Result

EX4-054 is implemented as complete compiled IR using the exclusive
`registerIrCard("EX4-054", compiled)` path. The implementation was already
faithful; focused evidence was strengthened for controller, color, and
once-per-turn boundaries.

#### Printed clauses and sources

- Catalog `EX4-054`: Purple/Green Champion Digimon, Lv.4, 4 play cost, 4000
  DP, with Purple or Green Lv.3 evolution for 3, plus alternate evolution for
  2 from a Lv.3 with Terriermon or Lopmon in its name.
- Catalog parenthetical: Alliance — when this Digimon attacks, by suspending
  one of your other Digimon, add that Digimon's DP and gain Security Attack
  +1 for the attack.
- Catalog inherited effect: `[End of Attack][Once Per Turn] If you have
  another suspended Digimon in play, return 1 Green Digimon card from your
  trash to your hand.`
- `node tools/kb/query.mjs card EX4-054`: no local KB entries; no unresolved
  ruling or erratum was returned.

#### Clause → IR → behavioral evidence

| Clause | IR mapping | Focused proof |
| --- | --- | --- |
| Terriermon/Lopmon Lv.3 alternate evolution, cost 2 | `digivolutionRequirement` has two alternate Lv.3 name entries, each cost 2 | legal Terriermon evolution settles and pays exactly 2; structural assertion preserves both named alternatives |
| Alliance attack reminder | `Static` keyword `{ keyword: "Alliance" }` | public attack opens Alliance response; allied Digimon suspends, attacker DP increases by ally DP, and Security Attack becomes 2 |
| End of Attack inherited return | inherited `EndOfAttack` `Return` from own trash to hand, Green + Digimon filter | public settled flow returns Goblimon from trash through a real EX4-054 evolution stack |
| “another suspended Digimon” controller boundary | `youHave` uses own battle area, `excludeSelf: true`, `suspended: true` | opponent-only suspended Digimon does not enable the effect; self is excluded by IR filter |
| Green Digimon exact target | trash filter requires `kind: ["Digimon"]` and `colors: ["Green"]` | non-green Seraphimon remains in trash while no qualifying own suspension exists |
| Once per turn | inherited effect sets `frequency: "OncePerTurn"` | two settled End-of-Attack fires in one turn return only one card |

#### Peer and stack proof

Compared with EX4-029 and EX4-057, which use the same printed Alliance reminder
and inherited End-of-Attack return vocabulary. The tests use a legal EX4-054
stack under a real Lv.3 host for inherited behavior and a mixed board/trash
fixture for controller and color negatives. No engine seam or catalog
discrepancy was found.

#### Commands

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-054.test.ts --maxWorkers=1 --no-file-parallelism
  PASS — 1 file, 10 tests
pnpm --filter @aegis/api typecheck
  PASS
pnpm exec oxlint apps/api/src/cards/EX4/EX4-054.ts apps/api/src/cards/EX4/EX4-054.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-054.ts apps/api/src/cards/EX4/EX4-054.test.ts
  PASS
git diff --check
  PASS
```

#### Worker score (delivery gates intentionally 0)

- Catalog/rules fidelity: 2/2
- IR implementation trace: 2/2
- Behavioral proof: 2/2
- Peer/evolution-stack proof: 2/2
- Delivery gates: 0/2 (worker lane does not commit or push)
- Worker total: 8/10

Remaining audit-lane limitation: collection-level recalculation, commit, and
push are coordinator-owned and are not claimed by this worker.

### EX4-055 — Peckmon

#### Result

- Worker score: **8/10** (coordinator-owned delivery gates excluded).
- Catalog/rules: **2/2**. The committed catalog defines Purple level 4 Peckmon as a 5-cost, 5000 DP Avian with a conditional optional [When Digivolving] play of exactly one [Keenan Crier] from hand without paying its cost, plus an inherited [On Deletion] effect that trashes one opponent hand card only when deletion was outside battle. Local KB query Q3497 confirms that the opponent chooses the trashed card.
- IR trace: **2/2**. `EX4-055.ts` uses only `registerIrCard("EX4-055", compiled)`, with complete IR and no residual behavior. The IR expresses exact-name matching, controller/zone filters, optionality, free play, inherited timing, opponent choice, and the `not(triggerRemovalCause: byBattle)` boundary.
- Behavioral proof: **2/2**. Focused tests cover free Keenan play, existing-Keenan suppression, exact-name rejection, optional refusal, one-card opponent hand trash on outside-battle deletion, battle-deletion suppression, and empty-hand no-op behavior.
- Peer/stack proof: **2/2**. The inherited tests use a legal evolution stack (`EX4-055` under a level-4 host) and compare effect deletion against battle deletion, matching neighboring EX4 inherited-effect implementations.
- Delivery gates: **0/2**. Reserved for the coordinator.

#### Verification

Executed:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-055.test.ts
13 tests passed
```

The implementation had no required change; the audit strengthened the colocated behavioral evidence and registration/catalog assertions. No unresolved card-specific ambiguity remains beyond the coordinator-owned delivery gates.

### EX4-056 — Crowmon

#### Result

- Worker score: **8/10** (delivery gates are coordinator-owned).
- Catalog/rules: **2/2**. The catalog defines Purple level 5 Crowmon (7 play cost, 7000 DP, Purple level 4 evolution for 3) with `[When Attacking]` optional evolution into exact-name `[Ravemon]` from hand for its evolution cost. Its inherited `[On Deletion]` effect deletes one opposing level 5 or lower Digimon when deleted outside battle. KB Q3498 confirms that deletion by an opponent's `<Retaliation>` counts as outside battle.
- IR trace: **2/2**. `EX4-056.ts` uses only `registerIrCard`, expresses the purple-Tamer gate, exact Ravemon hand source, optionality, paid cost, self target, inherited timing, opponent-only level `<= 5` target, and the non-battle deletion boundary. The module reports `coverage: "full"` with no residuals.
- Behavioral proof: **2/2**. Tests cover exact catalog/registration, public attack-time evolution with the printed 3-memory cost, optional refusal, outside-battle deletion, battle-deletion suppression, exact level-5-or-lower targeting, and a no-qualifying-target no-op.
- Peer/stack proof: **2/2**. The inherited behavior is exercised from a legal evolution stack (`EX4-056` under a level-4 host), and the public attack test proves the card transitions into a Ravemon stack while preserving the source. The neighboring EX4 shared behavior suite also resolves the inherited deletion path.
- Delivery gates: **0/2**. Reserved for the coordinator.

#### Clause to implementation map

| Printed clause | IR | Behavioral evidence |
| --- | --- | --- |
| `[When Attacking] If you have a purple Tamer in play` | `WhenAttacking` action condition `youHave`, battle-area Purple Tamer | Public attack test with EX4-064 |
| `may digivolve into [Ravemon] in your hand for the digivolution cost` | `Digivolve`, exact `nameExact`, `from: ["hand"]`, `payCost: true`, `optional: true` | Public attack test asserts BT13-089 Ravemon as top card, source stack, hand removal, and its printed memory cost 4 → 0; refusal test asserts no change |
| `[On Deletion] If deleted outside of a battle` | inherited `OnDeletion` with `not(triggerRemovalCause: byBattle)` | Effect deletion positive and battle deletion negative tests |
| `delete 1 of your opponent's level 5 or lower Digimon` | opponent Digimon filter with `levelComparison: lte 5`, count 1 | Positive level-5-or-lower path and level-6/no-target boundary |

#### Verification

```text
timeout 300 pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-056.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=20000
10 tests passed
```

The audit found and fixed one fidelity defect: the effect-driven digivolve omitted `payCost: true`, so the engine evolved for free despite the printed cost. No engine change is required. No unresolved card-specific ambiguity remains; Q3498 is documented above.

### EX4-057 — Antylamon

#### Result

- Worker score: **8/10** (delivery gates are coordinator-owned and therefore 0).
- Catalog/rules: **2/2**. The catalog defines Antylamon as a Purple/Green level-5 Ultimate, 8 play cost, 8000 DP, with alternate evolution from a level-4 two-color Digimon including Green for 3. The printed text is Alliance, `[End of Attack]` optional play of one Green level-3 Digimon from trash without paying its cost, and inherited `[End of Attack][Once Per Turn]` return of one Green Digimon card from trash to hand if another suspended Digimon is in play. `node tools/kb/query.mjs card EX4-057` reports no card-specific entries; no unresolved ruling was found locally.
- IR trace: **2/2**. `EX4-057.ts` registers only through `registerIrCard("EX4-057", compiled)`, exposes Alliance as a static keyword, encodes the exact level/color/trash/Green filters and optional no-cost play, and encodes the inherited suspended-other-Digimon condition, Green-trash return, and once-per-turn frequency. The alternate evolution requirement is `level: 4`, `multicolor: true`, `colors: ["Green"]`, `cost: 3`, matching the established interpreter representation for “2-color w/green.” Coverage is `full` with no residuals.
- Behavioral proof: **2/2**. Tests prove Alliance through a real attack (ally suspension, DP addition, and Security Attack +1), legal alternate evolution with memory 3 → 0, optional refusal of the play effect, Green level-3 play from trash at the real end of an attack, inherited return from a real attack, and once-per-turn reset after the intervening opponent turn and a second public attack. No injected timing helper is used for the End-of-Attack behavior.
- Peer/stack proof: **2/2**. The implementation follows neighboring Alliance IR (`BT19-014`, `EX9-020`, `EX9-045`) and the live Alliance combat harness. The inherited effect is exercised with `EX4-057` under a legal level-5 stack, and the alternate evolution test uses the real EX4 level-4 two-color route. No trait-based filter is present beyond the printed Green/color/level boundaries.
- Delivery gates: **0/2**. Reserved for the coordinator.

#### Clause-to-implementation map

| Printed clause | IR | Behavioral evidence |
| --- | --- | --- |
| `Digivolve: 3 from Lv.4 2-color w/green` | `digivolutionRequirement` with level 4, `multicolor: true`, Green, cost 3, alternate | Legal EX4-054 route; memory 3 → 0 and resulting top card asserted |
| `<Alliance>` | Static `keywords: [{ keyword: "Alliance" }]` | Real attack uses `respondAlliance`; ally suspends, attacker DP becomes 10000, Security Attack becomes 2 |
| `[End of Attack] You may play 1 green level 3 Digimon card from your trash without paying the cost` | `EndOfAttack` `PlayWithoutCost`, optional, `from: ["trash"]`, Green, level 3, `payCost: false` | Positive play and optional decline tests through public attack intents |
| `Inherited [End of Attack][Once Per Turn] If you have another suspended Digimon in play` | Inherited `EndOfAttack`, `frequency: "OncePerTurn"`, `youHave` suspended battle-area Digimon excluding self | Real attack tests return the Green card, suppress a same-turn second return, and prove next-turn reset |
| `return 1 green Digimon card from your trash to your hand` | `Return` to `hand`, mine, Digimon, Green, trash, count 1 | Returned card leaves trash and appears once in hand |

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-057.test.ts --maxWorkers=1 --no-file-parallelism
10 tests passed

pnpm --filter @aegis/api typecheck
passed

pnpm exec oxlint apps/api/src/cards/EX4/EX4-057.ts apps/api/src/cards/EX4/EX4-057.test.ts
passed

pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-057.ts apps/api/src/cards/EX4/EX4-057.test.ts
passed

git diff --check
passed
```

No card or engine changes were required. The tests were strengthened to use real attack intents for both End-of-Attack clauses and to prove the once-per-turn effect re-arms on the next own turn. The turn bridge uses the existing test harness turn driver; card behavior itself is resolved through public attack intents.

### EX4-058 — Ravemon

Date: 2026-09-09. Scope: `apps/api/src/cards/EX4/EX4-058.ts`, its colocated test,
and this report. No production engine seam was changed.

#### Contract and implementation

The catalog defines purple Lv.6 Ravemon (play cost 11, 11,000 DP, purple Lv.5
evolution for 3) with two clauses:

- At End of Attack, optionally delete this Digimon when its stack contains a card
  with `Bird` or `Avian` in a trait; at the end of the opponent's turn, play one
  exact-name `[Ravemon]` from the owner's trash without paying its cost.
- On Deletion, if the opponent has 8 or more cards in hand, the opponent chooses
  and trashes one. Then, if the opponent has 7 or fewer cards in hand, add the
  top security card to that opponent's hand.

`EX4-058.ts` has one exclusive `registerIrCard("EX4-058", compiled)` registration,
`coverage: "full"`, and no residual clauses. The delayed branch is represented
by the production `endOfOpponentTurn` sub-trigger; the deletion branch uses the
opponent chooser and exact 8/7 hand boundaries. KB query `card EX4-058` exposes
Q3499, confirming that the opponent chooses the trashed hand card.

#### Behavioral evidence

`EX4-058.test.ts` covers compiled-shape clauses, live play, legal Bird/Avian
stack deletion, no matching stack negative, exact-name Ravemon filtering,
opponent-hand 8/7 boundaries, security-to-hand behavior, and the normal
On-Deletion route. The delayed-play proof now passes the opponent's turn through
`advance(s.engine).runTurn(1)`, reaching the real production OnEndTurn window;
it no longer injects `fireSubTrigger("endOfOpponentTurn")`.

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-058.test.ts --reporter=dot
```

Result: **1 file passed, 10 tests passed**.

#### Score

**8/10 (worker cap).** Catalog/rules, direct IR, behavioral coverage, and the
real delayed timing flow are evidenced in this report and focused suite. The
collection-wide EX4 recalculation and broader regression gates are owned by the
coordinator and are intentionally not claimed here.

No unresolved card-specific rules ambiguity was found. No commit or push was
performed, per worker instructions.

### EX4-059 — Cherubimon

#### Printed contract and sources

- Catalog: `EX4-059` is Cherubimon, Purple/Green level 6, play cost 12, 12,000 DP. It digivolves for 3 from a level 5 two-color Digimon containing Green.
- `[When Digivolving]`: until the end of the opponent's turn, this Digimon and one of your level 5 or lower Digimon gain `[On Deletion] You may play this card without paying the cost.`
- The local KB returns Q3500: the granted effect still activates if the level-5 Digimon later digivolves to level 6 or higher before deletion.
- Alliance is retained as a static keyword.

#### Clause-to-IR-to-test mapping

| Clause | IR | Behavioral evidence |
| --- | --- | --- |
| Alternate digivolution cost | `digivolutionRequirement`: level 5, 2-color containing Green, cost 3, alternate | focused alternate-cost test |
| Alliance | static `keywords: [{ keyword: "Alliance" }]` | registration and live Alliance attack tests |
| Grant to this Digimon | self `GainTriggeredEffect`, `onDeletionOf`, `untilOpponentTurnEnd` | subscription and replay tests |
| Grant to one own level 5 or lower Digimon | own Digimon, `levelComparison <= 5`, `excludeSelf` | level-5 subscription and level-6 exclusion assertions |
| Optional free replay from trash | `PlayWithoutCost`, `from: ["trash"]`, `payCost: false`, `optional: true` | replay and explicit decline tests |

#### Verification commands

- `node tools/kb/query.mjs card EX4-059` — passed; Q3500 recorded.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-059.test.ts --maxWorkers=1 --no-file-parallelism` — passed (9 tests).
- Typecheck/lint/format/diff checks are coordinator-owned in this worker lane.

#### Score

| Rubric | Score |
| --- | ---: |
| Catalog/rules | 2/2 |
| IR trace | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 (coordinator-owned) |
| **Worker total** | **8/10** |

No card-specific defects remain. The module uses exclusive `registerIrCard` registration and has full residual-free IR coverage.

### EX4-060 — Omnimon Alter-S

#### Result

Worker evidence: **8/10** (focused implementation and behavior proof complete; coordinator collection acceptance remains pending).

#### Contract checked

- Catalog identity: White Lv.7, 15 play cost, 15,000 DP, Virus/Holy Warrior, DNA digivolution for 0 from one blue Lv.6 and one red Lv.6, unsuspended.
- `[When Digivolving]`: deletes exactly one opposing Digimon at 8,000 DP or less, then returns exactly one opposing level 6 or higher Digimon to the bottom of its owner's deck.
- `[All Turns]`: when this Digimon would leave the battle area other than by its controller's effect, replaces the leave with playing one exact-name `BlitzGreymon` and one exact-name `CresGarurumon` from its own digivolution cards without cost, then places this Digimon face-down at the bottom of its security stack.

#### Implementation evidence

- `EX4-060.ts` uses the required exclusive `registerIrCard("EX4-060", compiled)` registration.
- Compiled IR reports `coverage: "full"` and `residual: []`.
- DNA material colors/levels, DP `lte 8000`, level `gte 6`, exact-name stack sources, non-owner-effect leave cause, and face-down security placement are represented directly in IR.
- KB query reviewed Q3501, Q6031, and Q6032. Q6031/Q6032 support mandatory processing of both named cards whenever available and partial play when only one is present; Q3501 confirms an already-triggered effect continues resolving after its source leaves.

#### Behavioral proof

`EX4-060.test.ts` passes the focused suite and covers:

- catalog/IR shape and exact numeric boundaries;
- positive delete/return resolution;
- 8,001 DP and level-5 boundary behavior;
- legal blue/red Lv.6 DNA digivolution for zero memory and illegal same-color rejection;
- replacement registration and live opponent attack flow;
- stack play of `BlitzGreymon`/`CresGarurumon`, face-down security placement, and final zones.

#### Remaining work

No card-specific ambiguity or residual is known. Coordinator should rerun the focused file during serialized collection acceptance and include this report in the ledger.

### EX4-061 — Matt Ishida & Tai Kamiya

#### Contract

The committed catalog defines `Matt Ishida & Tai Kamiya` as a blue/red Tamer
with play cost 4. Its clauses are:

- During your turn, when you play a card named exactly `Gabumon` or `Agumon`,
  you may suspend this Tamer to gain 1 memory.
- During your turn, once per turn, when one of your Digimon digivolves, if you
  have 1 or fewer Digimon, you may play one exact-name `Gabumon` when the
  digivolving Digimon has `Greymon` in its name, or one exact-name `Agumon`
  when it has `Garurumon` in its name, from hand or trash without paying its
  cost.
- Security: play this card without paying its cost.

`node tools/kb/query.mjs card EX4-061` returned no card-specific knowledge-base
entries; no ruling or erratum remains unresolved.

#### Implementation trace

`apps/api/src/cards/EX4/EX4-061.ts` is full residual-free compiled IR and has
the exclusive `registerIrCard("EX4-061", compiled)` registration. The first
sub-trigger uses exact-name matching and a suspend cost. The digivolution
sub-trigger is `frequency: "OncePerTurn"`, has an `lte 1` Digimon count gate,
and splits the two mutually exclusive exact-name branches. Each branch checks
the triggering Digimon's name (`Greymon`/`Garurumon`), searches hand and trash,
and uses `payCost: false`. Security timing plays the Tamer itself without cost.

#### Behavioral proof

The colocated test proves:

- exact `Gabumon`/`Agumon` play trigger, suspension cost, and +1 memory;
- longer non-exact `Gabumon` names do not trigger;
- legal `Garurumon`-name digivolution plays `Agumon`;
- `Greymon`-name digivolution does not play `Agumon`;
- a `Greymon`-name digivolution plays exact-name `Gabumon` from trash;
- the two-Digimon boundary blocks the digivolution clause and optional
  resolution can be declined;
- security skill plays the Tamer from security;
- the compiled effect advertises `OncePerTurn`.

The legal evolution fixtures use an existing Agumon carrier and real Greymon /
Garurumon-named cards; the trash fixture verifies zone movement to the battle
area. No shared engine seam was changed.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-061.test.ts --maxWorkers=1 --no-file-parallelism` — **12 tests passed**.
- `git diff --check` — pending coordinator execution on the integrated branch.
- Worker score: **8/10** (catalog/rules 2, IR trace 2, behavioral proof 2,
  peer/stack proof 2, delivery gates 0; delivery gates are coordinator-owned).

### EX4-062 — Kiriha Aonuma & Nene Amano

#### Contract

The committed catalog defines `Kiriha Aonuma & Nene Amano` as a blue/black
Tamer with play cost 4. Its clauses are:

- This card/Tamer is also treated as `Kiriha Aonuma` and `Nene Amano`.
- At the start of your main phase, if there are at least two Digimon in play,
  gain 1 memory (including an opponent's Digimon in the total).
- All turns, when one of your Blue Flare or Twilight Digimon with DigiXros
  requirements would be played, you may suspend this Tamer to add at most one
  card from under your Tamers and at most one card from your trash as DigiXros
  materials.
- Security: play this card without paying its cost.

`node tools/kb/query.mjs card EX4-062` returned Q3490/Q3491 (the dual name is
recognized for name checks), Q3502 (the Digimon count is global), Q3503 (one
under-Tamer card total), and Q3504 (the name is an always-on rule).

#### Implementation trace

`apps/api/src/cards/EX4/EX4-062.ts` uses only
`registerIrCard("EX4-062", compiled)` and reports `coverage: "full"` with no
residuals. The name rule is a permanent self `GrantStatic`; the start-phase
effect uses the global two-Digimon condition; and the All Turns clause is a
`wouldBePlayed` replacement gated to the owner's Blue Flare/Twilight Digimon
with DigiXros requirements. Its nested zone expansion is paid by suspending
this Tamer, allows `underTamers` and `trash`, and is scoped for the turn.

#### Behavioral proof

The colocated test proves:

- residual-free compiled registration and the exact replacement gate;
- one trash material through the paid expansion, movement into the DigiXros
  stack, Tamer suspension, and correct cost payment;
- security play from the security stack;
- +1 memory with two total Digimon and no memory at the one-Digimon boundary;
- rejection of a trash material when the Tamer is not suspended.

The DigiXros fixture uses a real Blue Flare DigiXros card and MetalGreymon
material; peer replacement implementations BT19-079 and BT19-087 also pass.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-062.test.ts` — **6 tests passed**.
- Peer suite EX4-040, BT19-079, BT19-087 — **54 tests passed**.
- `pnpm typecheck` — shared/web passed; initial API test typing assertion was
  corrected, then API typecheck passed.
- `git diff --check` — **clean**.
- Worker score: **8/10** (catalog/rules 2, IR trace 2, behavioral proof 2,
  peer/stack proof 2, delivery gates 0; delivery gates are coordinator-owned).

### EX4-063 — Henry Wong & Shu-Chong Wong

#### Contract

The committed catalog defines `Henry Wong & Shu-Chong Wong` as a green/yellow
Tamer with play cost 4. Its clauses are:

- At the start of your main phase, if you have 1 or fewer Digimon in play, you
  may play one `[Terriermon]` or `[Lopmon]` from hand without paying its cost.
  A Digimon played this way cannot digivolve and is deleted at the end of the
  opponent's turn.
- During your turn, when one of your Digimon with `[Terriermon]` or `[Lopmon]`
  in its digivolution cards would digivolve, suspending this Tamer reduces that
  digivolution cost by 1.
- Security: play this card without paying its cost.

`node tools/kb/query.mjs card EX4-063` confirms the 2024-03-08 erratum: the
second clause checks the digivolution cards, not the Digimon's name. Q5724 and
Q5725 confirm that the start-main played Digimon is deleted only at the next
opponent turn end and remains restricted from digivolving if deletion is
prevented. Q3104 confirms this Tamer cannot be played by the unrelated
When-Digivolving effect referenced in that ruling.

#### Implementation trace

`apps/api/src/cards/EX4/EX4-063.ts` is residual-free compiled IR with the
exclusive `registerIrCard("EX4-063", compiled)` registration. The start-main
effect has the `lte 1` Digimon gate, optional hand play, bound-result target for
the permanent digivolution restriction, and the opponent-turn delayed delete.
The erratared replacement uses
`digivolutionStackNameOrTrait` exact-name matching and suspends this Tamer as
the cost before reducing the evolution cost by 1. Security plays this Tamer
from security without cost.

#### Behavioral proof

The colocated test now proves:

- live start-main play of an exact Terriermon, restriction of that played
  permanent, and deletion during the production opponent-turn end window;
- the one-Digimon gate at its exceeded boundary;
- exact-name rejection of a longer Terriermon name;
- a legal level-3 stack containing Terriermon evolving to Gargomon for one
  less memory, with this Tamer suspended;
- compiled structure, live play, and security behavior through the shared EX4
  behavior suite.

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-063.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **1 file passed, 9 tests passed**.

#### Score

**8/10 (worker cap).** Catalog/rules, direct IR, behavioral coverage, and
peer/stack evidence are complete. Collection-wide recalculation and delivery
gates remain coordinator-owned. No unresolved card-specific rules ambiguity
was found. No commit or push was performed, per worker instructions.

### EX4-064 — Keenan Crier

#### Result

- Worker score: **8/10** (coordinator-owned delivery gates excluded).
- Catalog/rules: **2/2**. The committed catalog defines Purple Tamer Keenan Crier as a 4-cost card with `[Start of Your Turn]` memory setting, an all-turns deletion watcher for an own Purple Digimon with `Ravemon` in its name or `Bird`/`Avian` in any trait, and `[Security] Play this card without paying the cost`. KB query Q3505 confirms that an effect deletion performs both Draw 1 and gain 1 memory.
- IR trace: **2/2**. `EX4-064.ts` is exclusively registered with `registerIrCard("EX4-064", compiled)`, has `coverage: "full"`, and has no residual behavior. The IR maps start-of-turn memory condition, all-turns source filters, self-suspension cost, draw, effect-cause memory gain, and security free play.
- Behavioral proof: **2/2**. Focused tests prove effect deletion (draw + memory), battle deletion (draw without memory), rejection of non-qualifying Digimon, refusal while the Tamer is already suspended, and security play without leaving the card in security. Structural checks cover the exact IR clauses.
- Peer/stack proof: **2/2**. The deletion tests use a legal battle-area Tamer and Digimon flow through the production test harness; the Ravemon source is a normal Purple Digimon permanent and no internal engine state is accessed.
- Delivery gates: **0/2**. Reserved for the coordinator.

#### Clause-to-proof map

| Printed clause | IR | Evidence |
|---|---|---|
| Start of Your Turn: if memory is 2 or less, set to 3 | `StartOfYourTurn` → `SetMemory` with `memoryAtMost: 2` | colocated structural assertion |
| All Turns: qualifying own Purple Digimon deletion | `AllTurns` → `SubTrigger(onDeletionOf)` with own/Purple/Digimon and Ravemon/Bird/Avian filters | effect-deletion and non-qualifying live tests |
| By suspending this Tamer | `cost.kind: suspend`, `isSelfRef: true`, `isSelf: true` | effect-deletion test asserts Tamer suspended; already-suspended negative |
| Draw 1 | sub-trigger `Draw amount: 1` | effect and battle deletion tests assert deck/hand |
| Effect deletion: gain 1 memory | `GainMemory` gated by `triggerRemovalCause: byEffect` | effect vs battle deletion comparison |
| Security: play without cost | `Security` → self `PlayWithoutCost`, `isSecurity: true` | security skill live test |

#### Q&A coverage

- Q3505: covered by the effect-deletion test, which asserts both Draw 1 and +1 memory.

#### Verification

Executed:

```text
timeout 300 pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-064.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=20000
9 tests passed
pnpm exec oxlint apps/api/src/cards/EX4/EX4-064.ts apps/api/src/cards/EX4/EX4-064.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-064.ts apps/api/src/cards/EX4/EX4-064.test.ts
git diff --check
```

The implementation module required no behavior change; the colocated test file was strengthened with production-harness behavioral coverage. The first test invocation encountered a transient concurrent catalog rewrite and was rerun successfully after the JSON file stabilized.

**Total** | **8/10**

### EX4-065 — Trident Gaia

#### Contract and implementation

The committed catalog defines a red Option costing 8: delete one opposing
Digimon with the highest DP; if the deleted Digimon had at least 13,000 DP,
trash the opponent's top security card. Its Security effect activates Main.
The local KB has no card-specific ruling or erratum.

`apps/api/src/cards/EX4/EX4-065.ts` registers exclusively through
`registerIrCard("EX4-065", compiled)` with full coverage and no residuals. The
IR installs the deletion watcher before selecting one opponent Digimon by
`highestDP`, and gates the security trash at `dp >= 13000`.

#### Behavioral proof

The focused public suite proves the 12,000/13,000 boundary, a 15,000 positive,
highest-DP selection, exact one-security trash, and Security activation of the
same Main effect. Fixtures use catalog cards with printed DP and a legal red
Option-color source.

Verification: focused Vitest passed 9/9; API typecheck and `git diff --check`
passed. No runtime change or engine seam was required.

Worker score: 8/10 (delivery gates remain coordinator-owned).

### EX4-066 — Adze Beast Blade and Shining Dragon Bullet

#### Result

- Worker score: **8/10** (coordinator-owned collection and delivery gates excluded).
- Catalog/rules: **2/2**. The catalog defines this 3-cost Blue/Red Option with two conditional Main modal branches and a Security effect that may play one exact-name Gabumon or Agumon from hand or trash, then adds itself to hand. The KB query returned no card-specific rulings or errata.
- IR trace: **2/2**. `EX4-066.ts` exclusively calls `registerIrCard("EX4-066", compiled)`, declares `coverage: "full"`, and has no residual behavior. Exact-name filters, partner conditions, free digivolution, optionality, and Security hand/trash play are represented directly.
- Behavioral proof: **2/2**. The colocated suite has 10 passing tests covering both Main branches, exact-name structural filters, prerequisite-negative behavior, free stack transition, Security hand and trash origins, optional Security refusal via the shared suite, and self-return to hand.
- Peer/stack proof: **2/2**. Production-harness tests exercise legal evolution stacks from Agumon/Gabumon into the EX4 partner cards and keep nonmatching Security cards out of the play target.
- Delivery gates: **0/2**. Reserved for the coordinator.

#### Clause-to-proof map

| Printed clause | IR | Evidence |
|---|---|---|
| Main: choose one effect | `Main` → `Modal`, `choose: 1` | structural test and live branch tests |
| CresGarurumon in play; Agumon/Greymon → BlitzGreymon | exact-name `youHave` condition plus own target and hand `Digivolve` | existing positive test and shared live behavior |
| BlitzGreymon in play; Gabumon/Garurumon → CresGarurumon | exact-name `youHave` condition plus own target and hand `Digivolve` | reverse-branch live test |
| Ignore requirements and pay no cost | `ignoreRequirements: true`, `payCost: false` | live stack transition assertions |
| Security: may play exact Gabumon/Agumon from hand or trash | optional `PlayWithoutCost`, exact-name filter, `from: [hand, trash]` | hand positive, trash positive, nonmatching negative |
| Then add this card to hand | `AddToHandSelf` | Security live assertions |

#### Verification

Executed successfully:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-066.test.ts --reporter=dot
10 tests passed
git diff --check
pnpm --filter @aegis/api exec tsc --noEmit
```

No card implementation change was required; only colocated behavioral proof and this report were added. The score is intentionally capped at the worker maximum requested by the coordinator.

**Total** | **8/10**

### EX4-067 — Full Metal Blaze

#### Contract and implementation

The catalog Main effect returns up to two opposing level-4-or-lower Digimon to
hand, then checks the opponent's resulting hand size and, at eight or more,
returns one opposing level-6-or-higher Digimon to deck bottom. Security
activates Main. Q3506 confirms that the hand-size check occurs after the first
returns.

`apps/api/src/cards/EX4/EX4-067.ts` is full residual-free IR registered only
with `registerIrCard`. Its two target boundaries, destinations, sequential
condition, and Security `ActivateMain` match the printed contract.

#### Behavioral proof

The focused public suite proves the first two returns, Q3506's 7-to-9 hand
transition, the level-5 exclusion/level-6 inclusion boundary, deck-bottom
destination, and Security activation. Focused Vitest passed 8/8 and
`git diff --check` passed. No implementation or engine defect was found.

Worker score: 8/10 (delivery gates remain coordinator-owned).

### EX4-068 — Heaven's Judgement

#### Contract

- Catalog: Yellow Option, play cost 7. While the player has a green Digimon or Tamer in play, the card may be used without meeting its color requirements.
- Main: activate “1 of your opponent's Digimon gets -6000 DP for the turn” once, plus once for each distinct color among your Digimon.
- Security: 1 opposing Digimon gets -12000 DP for the turn.
- Local KB: Q3507 and Q3511 confirm each repeated activation has a target choice; Q3508 confirms the activations share one timing; Q3509 and Q3510 confirm multi-color Digimon count once per color and duplicate colors are deduplicated.

#### Implementation

`apps/api/src/cards/EX4/EX4-068.ts` is exclusive `registerIrCard("EX4-068", compiled)` IR with no handwritten registration or residual. The static effect waives only this option's color requirement under the green Digimon/Tamer condition. Main applies the base -6000 action and repeats it using `distinctOwnDigimonColors`; both clauses are turn-duration DP modifications. Security applies -12000 once.

#### Behavioral proof

`apps/api/src/cards/EX4/EX4-068.test.ts` proves:

- full residual-free IR and distinct-color scaling;
- direct effect resolution with three activations for two own colors;
- public green-Digimon color waiver and paid play flow;
- public multi-color counting with duplicate-color deduplication (four activations from red/white/blue) and the seven-memory cost;
- public negative color-gate path without a green Digimon/Tamer;
- security -12000 behavior through the shared EX4 security suite.

Focused command passed:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-068.test.ts
9 tests passed
```

`git diff --check` passed. No shared engine change was required.

#### Score

8/10 worker score: catalog/KB, exclusive IR, public cost/color flows, distinct-color boundary, negative gate, security behavior, and focused proof are complete. Full collection recalculation and delivery gates remain coordinator scope.

### EX4-069 — Gaia Reactor

#### Evidence

- Catalog: `packages/shared/src/cards/data/cards.json` — `[Main] Choose 1 of each player's Digimon with the highest play cost. Delete all other Digimon.`
- Security text: `[Security] Activate this card's [Main] effect.`
- Knowledge base: `node tools/kb/query.mjs card EX4-069`; Q3512 confirms that the player using the card chooses both survivors.
- Rules/engine seam: `resolveExceptSurvivors` narrows each side to the highest printed play-cost pool, preserves all tied maxima for the choice, then deletes the remainder. With no tie, the sole maximum is retained without a decision.

#### Implementation

`apps/api/src/cards/EX4/EX4-069.ts` is an exclusive `registerIrCard("EX4-069", compiled)` registration. The compiled IR has residual-free full coverage: one Main effect deleting every own/opponent Digimon except one highest-play-cost survivor per side, plus the Security activation of that Main effect.

#### Behavioral proof

`apps/api/src/cards/EX4/EX4-069.test.ts` verifies:

- residual-free full IR coverage;
- Main deletion of all non-survivors on both sides;
- tied highest costs are presented as choices and the card user’s selected survivor is preserved;
- Security activation runs the same deletion behavior;
- a live public play flow resolves the Option card.

Focused run: `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-069.test.ts --pool=forks --maxWorkers=1` — 6 tests passed.

No unresolved card-specific ambiguity remains beyond Q3512’s explicit chooser rule.

### EX4-070 — Tarnished Hero

#### Catalog and rules evidence

- Catalog source: `packages/shared/src/cards/data/cards.json`, `cardId: EX4-070`, purple Option, play cost 3.
- Printed clauses: while a green Digimon or Tamer is in play, color requirements may be ignored; Main deletes 1 opposing level 3 Digimon, then places this card in its battle area; Delay lets the opponent optionally trash 1 Option from hand and grants this card's controller 2 memory if they do not; Security places this card in its owner's battle area.
- Local KB: `node tools/kb/query.mjs card EX4-070` returns Q3513 and Q3514. Q3513 confirms placement still resolves when no level 3 target exists. Q3514 confirms the card's controller, not the opponent, gains 2 memory when no Option is trashed.
- The Knowledge base index below indexes Q3513/Q3514 for this card. No unresolved card-specific ruling ambiguity remains.

#### IR trace

`apps/api/src/cards/EX4/EX4-070.ts` is full, residual-free compiled IR registered exclusively with `registerIrCard("EX4-070", compiled)`.

| Printed clause | IR | Behavioral proof |
| --- | --- | --- |
| Green Digimon/Tamer waives color | Static `WaiveColorRequirement`, `youHave` battle-area filter, Green + Digimon/Tamer | `waives the purple color requirement only while a green Digimon or Tamer is in play` |
| Main delete level 3, then place self | Main `Delete` with opponent/Digimon/level 3 filter, followed by `PlaceInBattleAreaSelf` | `deletes exactly level 3...`; no-level-3 placement test; shared live play test |
| Delay timing and opponent choice | Main keyword `Delay`; optional opponent-hand Option `Trash`; conditional `GainMemory(2)` using `ifThisEffectDidNotAct` | trash path, empty-hand path, and explicit optional-decline path |
| Security placement | Security effect with `PlaceInBattleAreaSelf` | shared `ex4CardBehaviorTests("EX4-070")` Security case |

#### Behavioral proof

`apps/api/src/cards/EX4/EX4-070.test.ts` now has 10 passing tests. Public intents and settled observable state prove:

- exact level-3 targeting: level 4 and level 7 Digimon survive, and the 3-memory play cost is paid;
- color waiver succeeds with a green Digimon and fails with `reason: "color-requirement-unmet"` without a green Digimon/Tamer;
- no level-3 target still places the Option in the battle area (Q3513);
- Delay cannot be activated on the entry turn (the tests advance the entry marker before activation);
- an opponent Option is trashed with no memory gain;
- the opponent may decline and the using player gains exactly 2 memory (Q3514);
- Security placement and ordinary live play resolve through the shared EX4 public-flow suite.

The card has no evolution stack or inherited clause to exercise; this is an Option card. Fixtures use legal non-Digi-Egg cards and avoid numeric security setup.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-070.test.ts --maxWorkers=1 --no-file-parallelism` — 10 tests passed.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-070.ts apps/api/src/cards/EX4/EX4-070.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-070.ts apps/api/src/cards/EX4/EX4-070.test.ts` — passed.
- `git diff --check` — passed for the worktree changes.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog/rules evidence | 2/2 |
| IR fidelity and registration | 2/2 |
| Behavioral proof | 2/2 |
| Peer/stack proof | 1/2 (stack is inapplicable to an Option card; shared public flow covers Security) |
| Verification/reproducibility | 1/2 |
| Delivery gate | 0/2 (worker does not commit or push) |
| **Worker total** | **8/10** |

### EX4-071 — Ame-no-Ohabari

#### Printed clauses and sources

- Catalog (`packages/shared/src/cards/data/cards.json`): Purple Option, play cost 4; Main: delete 1 of your Digimon to delete 1 opposing Digimon whose level is less than or equal; if the deleted Digimon had [Ravemon] in its name, at the end of the opponent's turn play 1 [Ravemon] from trash without paying its cost. Security: delete 1 opposing Digimon with the lowest level.
- `node tools/kb/query.mjs card EX4-071 --json`: no card-specific Q&A (`qa: []`). Rules reviewed through the set brief and comprehensive rules; no unresolved restriction was found.

#### Implementation and evidence map

`EX4-071.ts` is exclusively registered with `registerIrCard("EX4-071", compiled)`, with `coverage: "full"` and no residuals.

| Clause | IR | Behavioral evidence |
| --- | --- | --- |
| Main sacrifice cost and level boundary | `Delete` with `cost.kind: deleteOwn`, bound as `deleted`; opposing target uses `levelComparison: lte` relative to `lastDeleted` | Structural assertion plus live play helper coverage; legal public play consumes the option and deletes the selected own Digimon. |
| Delayed Ravemon recovery | `SubTrigger(event: endOfOpponentTurn)` conditioned on the bound deletion containing Ravemon; `PlayWithoutCost` from owner's trash with exact `[Ravemon]` name | Live test now drives `runOneTurn()` and the public Main end flow for the opponent, proving recovery after the real opponent turn end. |
| Non-Ravemon negative | Same binding condition rejects a non-Ravemon sacrifice | Live test advances a real opponent turn and confirms no Ravemon enters play and the trash card remains. |
| Exact-name boundary | Target is `nameExact: Ravemon`, so Ravemon: Burst Mode is not selected | Live negative test confirms BT13-092 remains in trash after the real opponent turn. |
| Security effect | `Security` effect deletes opponent's `lowestLevel` Digimon | `ex4CardBehaviorTests("EX4-071")` included in the focused run. |

The former injected `advance(...).fireSubTrigger("endOfOpponentTurn")` checks were replaced with a real `runOneTurn()` opponent flow. Deck fixtures were added so the production draw phase cannot end the test through deck-out. No Digi-Egg cards are placed in deck or security.

#### Verification

Command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-071.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **PASS — 1 file, 8 tests passed**.

Static sweep found no `fireSubTrigger`, `advance.fire`, duplicate `registerCard`, or prohibited security filler in the owned card files. No engine seam was required.

#### Worker score (delivery gates remain coordinator-owned)

- Catalog/rules: 2/2
- IR trace: 2/2
- Behavioral proof: 2/2
- Peer/stack proof: 2/2
- Delivery gates: 0/2
- Worker total: **8/10**

### EX4-072 — Digital Translator

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json` (White Option, play cost 3).
- Knowledge base: `node tools/kb/query.mjs card EX4-072`.
- Errata reviewed: the Main target is limited to `[Gallantmon]`, `[Sakuyamon]`, or `[MegaGargomon]`; the hand card must be level 6, have a different name, and include the chosen name.
- Q&A reviewed: Q3474, Q3515, Q3516, Q3517, Q3518. Q3474/Q3516 support name-inclusion evolution (including Kuzuhamon as a Sakuyamon-treated card); Q3517 confirms the reverse direction is illegal; Q3518 confirms the Plug-In name rule.

Printed clauses verified:

1. Rule name: this card is also treated as having `[Plug-In]` in its name.
2. While a Tamer is in play, this Option may be used without meeting its White color requirement (the 3 memory use cost remains payable).
3. Main: optionally choose one own level-6 named Digimon and free-digivolve it into a level-6 card in hand whose different name includes the chosen name.
4. Security: return one own Digimon card from trash to hand, then add this card to hand.

#### Implementation and proof map

`apps/api/src/cards/EX4/EX4-072.ts` is an exclusive `registerIrCard("EX4-072", compiled)` module. The IR is full coverage with no residuals:

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Plug-In rule name | Static `GrantStatic` name | Rule-name assertion via `observe().grantedNames()` |
| Tamer color waiver | Static `WaiveColorRequirement`, `youHave` Tamer condition | Plays with a Tamer, refuses without one, and pays cost 3 |
| Main evolution | Optional `Digivolve`, hand source, level 6, `ignoreRequirements`, `payCost: false`, name inclusion/difference | Matching BlackMegaGargomon evolves over MegaGargomon; near-miss Kuzuhamon remains in hand; source stack remains; memory is unchanged by evolution |
| Optionality | `optional: true` | Declining leaves the Option and base unchanged |
| Security | Return one own-trash Digimon, then `AddToHandSelf` | Digimon is recovered and non-Digimon trash card is not selected |

The direct constructor-level test also proves a level-6 `Gallantmon X Antibody` name variant is eligible. The shared EX4 behavior suite covers live Main play and Security activation.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-072.test.ts --maxWorkers=1 --no-file-parallelism` — **10 passed**.
- `pnpm --filter @aegis/api typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX4/EX4-072.ts apps/api/src/cards/EX4/EX4-072.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-072.ts apps/api/src/cards/EX4/EX4-072.test.ts` — passed.
- `git diff --check -- apps/api/src/cards/EX4/EX4-072.ts apps/api/src/cards/EX4/EX4-072.test.ts` — passed.

#### Worker score

- Catalog/rules evidence: 2/2
- IR fidelity and registration: 2/2
- Focused behavioral proof: 2/2
- Peer/evolution-stack proof: 1/2 (the tested stack is legal and includes a near-miss; a full browser-mediated stack trace is outside this worker lane)
- Regression/quality checks: 1/2 (focused and scoped checks pass; collection gate is coordinator-owned)
- Delivery gates: 0/0 (worker does not commit or push)

Worker total: **8/10 maximum**, with no known card-specific defect remaining.

### EX4-073 — Omnimon Alter-B

#### Contract evidence

Catalog and KB query (`node tools/kb/query.mjs card EX4-073`) confirm the Black Lv.7 Omnimon Alter-B contract: normal Black Lv.6 evolution for 5, alternate Lv.7 Omnimon-in-name evolution for 2; mandatory When Digivolving deletion plus up-to-6 play-cost deletion; optional When Attacking trash of 1–3 Lv.6+ materials; repeated lowest-cost opposing Digimon/Tamer deletion; and top-two security trash only when three cards were trashed in that activation. Q3519–Q3522 and Q6033 were reviewed.

#### IR and proof map

- `WhenDigivolving` is mandatory and compiles `DeDigivolve` followed by `DeleteBudget` with budget 6, `upTo: true`, and `minimum: 1`. Public proof performs a legal evolution and verifies only the cost-7 target remains after the budgeted deletions.
- `WhenAttacking` is optional, requires the self stack to contain a level-6-or-higher Digimon, and uses `TrashDigivolution` with amount 3, `upTo`, minimum 1, choice, and a level-6+ card filter. Public attack proof resolves three materials and verifies repeated deletion, security count, and emptied stack.
- `RepeatPerCount` tracks `ex4-073-trashed` and deletes the lowest-play-cost opposing Digimon/Tamer sequentially. The Q3522 public test proves a protected lowest target is retried rather than skipping to the next target.
- Security manipulation is conditioned on the activation-local tracked count reaching 3. Q6033 now uses a public first attack with one eligible material followed by a second public attack with three newly-added Lv.6 materials; only the second activation trashes two security cards.

The module registers exclusively through `registerIrCard("EX4-073", compiled)` and has no legacy registration. The direct compiled card has `coverage: "full"` and an empty residual list.

#### Changes

- Converted the When Digivolving proof from injected timing to a legal public Black Lv.6 → EX4-073 evolution with memory payment.
- Converted public attack coverage to the `attack` intent and settled effect stacks.
- Replaced prohibited Digi-Egg security fillers with ordinary Digimon cards.
- Removed unused test imports. No production IR change was required.

#### Verification

- Focused Vitest (`--maxWorkers=1 --no-file-parallelism`): **11/11 passed**.
- `pnpm --filter @aegis/api typecheck`: passed.
- Scoped oxlint: passed.
- Scoped oxfmt check: passed.
- `git diff --check`: passed.

#### Worker score (delivery gates 0 by policy)

- Catalog/rules: 2/2
- IR fidelity: 2/2
- Behavioral proof: 2/2
- Peer/stack proof: 2/2 (legal evolution, mixed target stack, and the same-turn second public attack are covered)
- Reproducibility: 1/2 (focused and scoped gates pass; no collection rerun in this lane)
- Delivery gates: 0/0

Total: **8/10**.

Remaining gap: none for Q6033's activation-local threshold; the focused suite is green and the same-turn second public attack now supplies the independent proof.

### EX4-074 — ShineGreymon: Ruin Mode

#### Sources and printed contract

- Catalog: `packages/shared/src/cards/data/cards.json`.
- Knowledge base: `node tools/kb/query.mjs card EX4-074` (Q3523–Q3525).

Printed clauses verified: opposing Digimon get -5,000 DP until the end of the opponent's next turn from When Digivolving/On Deletion; End of Attack deletes this Digimon and one opposing Digimon, Recovery +1 from deck, then hatches one Digi-Egg if a Tamer is in play.

#### Implementation and proof map

`apps/api/src/cards/EX4/EX4-074.ts` is exclusively `registerIrCard("EX4-074", compiled)` with full IR coverage and no residuals. The implementation uses player-wide opposing-Digimon `ModifyDP`, mandatory self/opponent deletion, deck-to-security recovery, and a Tamer-gated `Hatch`. Focused tests cover both regular color evolution paths, alternate ShineGreymon evolution, current/future DP targets, Q3523 deletion ordering, duration expiry, Q3524 mandatory End of Attack, Q3525 no-op opposing target, Recovery, Tamer-positive hatch, and no-Tamer hatch refusal.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX4/EX4-074.test.ts --maxWorkers=1 --no-file-parallelism` — **11 passed**.
- `pnpm --filter @aegis/api exec oxlint src/cards/EX4/EX4-074.ts src/cards/EX4/EX4-074.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX4/EX4-074.ts apps/api/src/cards/EX4/EX4-074.test.ts` — passed.
- `git diff --check` scoped to owned files — passed.
- `pnpm --filter @aegis/api typecheck` — passed (no diagnostics; process completed).

#### Worker score

- Catalog/rules: 2/2
- IR fidelity/registration: 2/2
- Focused behavior: 2/2
- Peer/evolution-stack proof: 1/2 (legal stack and comparative color paths covered; browser trace is coordinator scope)
- Regression/quality: 1/2 (scoped checks pass; collection gate is coordinator-owned)

Worker total: **8/10 maximum**, with no known card-specific defect remaining.

## Mechanisms

No engine seam was opened for EX4, so no mechanism document exists.

## Knowledge base index

Merged from `docs/audits/EX4-reaudit/KB-INDEX.md`.

Freshly generated with `node tools/kb/query.mjs card <ID>` on 2026-09-09. An em dash means the query returned no card-specific Q&A identifier; it is not a claim that no general rule applies.

- `EX4-001`: Q3437
- `EX4-002`: Q3438
- `EX4-003`: —
- `EX4-004`: Q3439
- `EX4-005`: —
- `EX4-006`: Q3440, Q3441
- `EX4-007`: —
- `EX4-008`: Q3442, Q3443, Q3444
- `EX4-009`: Q3445
- `EX4-010`: Q3446
- `EX4-011`: Q3447, Q3448, Q3449
- `EX4-012`: —
- `EX4-013`: Q3450, Q3451, Q3452
- `EX4-014`: Q3453, Q3454, Q3455, Q3456
- `EX4-015`: —
- `EX4-016`: Q3457, Q3458
- `EX4-017`: —
- `EX4-018`: Q3459
- `EX4-019`: —
- `EX4-020`: Q3460
- `EX4-021`: Q3461
- `EX4-022`: Q3462
- `EX4-023`: Q3463, Q3464, Q3465
- `EX4-024`: Q3466, Q5487, Q5488, Q5489, Q5490
- `EX4-025`: —
- `EX4-026`: Q3467, Q3468, Q5491, Q5492, Q5493, Q5494
- `EX4-027`: Q3469, Q3470
- `EX4-028`: Q3471, Q3472, Q5495, Q5496, Q5497, Q5498
- `EX4-029`: —
- `EX4-030`: Q2868, Q3473, Q3474, Q3475, Q3516, Q3517, Q5499, Q5500, Q5501, Q5502
- `EX4-031`: —
- `EX4-032`: Q3476, Q3477
- `EX4-033`: Q3478, Q3479
- `EX4-034`: Q3480, Q3481
- `EX4-035`: —
- `EX4-036`: Q3482, Q3483, Q3484
- `EX4-037`: Q3485
- `EX4-038`: Q3486, Q3487
- `EX4-039`: Q3488, Q3489
- `EX4-040`: Q3490, Q3491
- `EX4-041`: —
- `EX4-042`: —
- `EX4-043`: —
- `EX4-044`: —
- `EX4-045`: —
- `EX4-046`: —
- `EX4-047`: —
- `EX4-048`: Q3492
- `EX4-049`: —
- `EX4-050`: Q3493
- `EX4-051`: —
- `EX4-052`: Q3494
- `EX4-053`: Q2614, Q3495, Q3496
- `EX4-054`: —
- `EX4-055`: Q3497
- `EX4-056`: Q3498
- `EX4-057`: —
- `EX4-058`: Q3499
- `EX4-059`: Q3500
- `EX4-060`: Q3501, Q6031, Q6032
- `EX4-061`: —
- `EX4-062`: Q3490, Q3491, Q3502, Q3503, Q3504
- `EX4-063`: Q3104, Q5724, Q5725
- `EX4-064`: Q3505
- `EX4-065`: —
- `EX4-066`: —
- `EX4-067`: Q3506
- `EX4-068`: Q3507, Q3508, Q3509, Q3510, Q3511
- `EX4-069`: Q3512
- `EX4-070`: Q3513, Q3514
- `EX4-071`: —
- `EX4-072`: Q3474, Q3515, Q3516, Q3517, Q3518
- `EX4-073`: Q3519, Q3520, Q3521, Q3522, Q6033
- `EX4-074`: Q3523, Q3524, Q3525

## Open items

No EX4 card scores below 10/10 and no engine seam was opened. The following remain worth knowing.

- Deferred gate. The audit skill prescribes `meteor npm run quave-check` and `quave-check-ci`. Neither script exists in this repository, so scoped Oxlint and Oxfmt over the 93 changed TypeScript files were run instead. The repository-wide format check still carries pre-existing baseline findings outside EX4 and was not made green. Recorded in `docs/audits/EX4-AUDIT.md` (`bd827a86f`).
- Contradiction — EX4-056 typecheck. The EX3 re-audit's run log (`docs/audits/EX3-reaudit/RUN.md`, `7e72574ec`) records a root typecheck failing at `src/cards/EX4/EX4-056.test.ts:111` because target kind `"digimon"` is not assignable to `"player" | "permanent"`. The EX4 closeout at base `afa3ab2f451245fb03bf4e3f895ead8807f18df1` records `pnpm typecheck` passing for shared, API, and web, and the EX4-056 gate log recorded a clean API typecheck. Both are true at different bases: the error existed on the base EX3 branched from and was corrected upstream on `origin/main`. The EX4 result is the current one.
- Historical, resolved. The EX4-023 gate log recorded an API typecheck failure at `src/cards/EX4/EX4-024.test.ts(350,88)` — `sourceCardId` does not exist on `ServerEvent`. It was corrected before closeout and the closing root typecheck passed.
- Direct timing seams were accepted only as supplemental evidence; every scored behavioral clause rests on public play, evolution, attack, security, or turn-flow proof.
- `docs/audits/EX4-reaudit/SOURCE-RECONCILIATION.md` recorded that no catalog discrepancy was established for EX4.

### Fixture traps recorded by the coordinator

- No Digi-Egg cards in deck or security fixtures.
- BT1-001 through BT1-008 and ST1-01, ST3-01, ST4-01 are Digi-Egg cards. Replace them in deck or security fixtures; uses in the egg deck or as evolution sources remain valid.
- No injected timing (`advance.fire`, `fireTiming`, `fireSubTrigger`) as behavioral proof.
- Evolution proof must assert cost, bonus draw, and the resulting stack, not only `{ ok: true }`.
- Once-per-turn proof must include same-turn refusal and next-own-turn reset.

## History

Superseded files, removed after their content was merged here. Raw evidence stays in git history at the commits named.

- `docs/audits/EX4-AUDIT.md` — `bd827a86f`, 2026-09-10. Card-by-card ledger with catalog text and the verification-command note; superseded by the re-audit for scoring, retained here for the deferred-gate record.
- `docs/audits/EX4-REAUDIT-LEDGER.md` — `bd827a86f`, 2026-09-10. Scoring table for the winning re-audit.
- `docs/audits/EX4-reaudit/` per-card reports — `d3c1b6f57`, 2026-09-09. 74 files, `EX4-001.md` through `EX4-074.md`, merged verbatim into the card ledger.
- `docs/audits/EX4-reaudit/RUN.md` — `6b409871e`, 2026-09-09. Run log; its closeout is quoted under Gates.
- `docs/audits/EX4-reaudit/REVIEW-NOTES.md` — `6b409871e`, 2026-09-09. Coordinator decisions and fixture traps; merged into Status and Open items.
- `docs/audits/EX4-reaudit/KB-INDEX.md` — `6b409871e`, 2026-09-09. Merged into Knowledge base index.
- `docs/audits/EX4-reaudit/SOURCE-RECONCILIATION.md` — `6b409871e`, 2026-09-09. Recorded that no catalog correction was established; that fact is in Open items.
- `docs/audits/EX4-reaudit/WORKER-BRIEF.md` — `6b409871e`, 2026-09-09. Process instructions for the audit workers; not evidence, not carried forward.
- `docs/audits/EX4-reaudit/logs/` — `6b409871e` and `d3c1b6f57`, 2026-09-09. 16 raw Vitest, Oxlint, Oxfmt, typecheck, `git diff --check`, and KB rules-query logs for EX4-018, EX4-023, EX4-036, and EX4-056. Their results are tabulated under Gates.

No code file referenced any of these paths, and no tool read EX4 JSON evidence, so no code reference needed updating.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX4: PR #4584; commit `dff85b79b`.
