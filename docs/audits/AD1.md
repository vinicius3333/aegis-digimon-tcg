---
set: AD1
cards: 25
status: verified
verified_at: 2026-09-12
catalog_commit: 3657953ac
evidence_commit: 5b8ad19ea
---

# AD1 audit

## Status

The 2026-09-12 re-audit on `ad1-full-reaudit`, based on `de4dda717`, verifies
all **25/25 cards at 10/10 (250/250)**. The current catalog, 85 local KB Q&A entries,
module-owned compiled IR, legal gameplay proofs and final gates supersede the historical
reports listed below. Three Luna audit lanes and final read-only reviews found no
remaining critical or important AD1 defects. Code and tests are committed and pushed;
[PR #4740](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4740) holds the reviewable change.

AD1-003 now restricts its inherited leave reaction to its holder. AD1-006 and AD1-013
honor their printed DigiXros exclusions through the shared replacement seam. The synced
aggregate changes exactly these three AD1 records and no outside-set bytes. All 25
production modules already had no `@ts-nocheck` on the base; this audit confirms zero
TypeScript suppressions and one exclusive `registerIrCard` registration per module.
Existing adequate proofs were retained. Fixture and proof changes replace illegal
Digi-Egg deck/security cards, injected timing, and incomplete turn/evolution assertions.

## Gates

Final gates ran serially in this worktree on 2026-09-12. API forks use an explicit
2 GB heap and one worker; builds and types use an isolated 4 GB cap. Evidence source:
`5b8ad19ea` (cards/tests), `3d038a4bd` (three card corrections and synced records),
`c9f99542c` (engine seam), `2b865249a` (index formatting).

```sh
pnpm install --frozen-lockfile --offline
NODE_OPTIONS=--max-old-space-size=4096 pnpm effects:sync:set -- --set AD1 --base de4dda717
NODE_OPTIONS=--max-old-space-size=4096 pnpm effects:check:set -- --set AD1 --base de4dda717
NODE_OPTIONS=--max-old-space-size=4096 pnpm -r --workspace-concurrency=1 typecheck
TEST_HEAP_MB=2048 TEST_MAX_WORKERS=1 NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/api exec vitest run src/cards/AD1 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism
NODE_OPTIONS=--max-old-space-size=2048 TEST_MAX_THREADS=1 pnpm --filter @aegis/web exec vitest run test/ad1EvolutionStack.scenario.test.tsx --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint --quiet .
pnpm audit:index
pnpm audit:index --check
git diff --check
```

- Frozen offline install passed; both parity commands rebuilt shared and API successfully.
- Effects sync/check passed: 25 records; three semantic changes against `de4dda717`;
  **zero semantic or byte changes outside AD1**.
- Serial shared/API/web typechecks passed without TypeScript suppressions.
- Closing API gate: **166 files, 2,299 tests passed (6.60 s)**. This includes all
  **26 AD1 files / 215 tests** (213 direct card test titles below and two collection
  registration tests), the 23 focused leave-replacement/EX7 mechanism tests and four
  audit-layout tests. The synthetic AD1-002 combat rejection deliberately logs
  `UnsupportedEffectError`; its cleanup regression passes and restores production IR.
- UI scenario: **1 file, 1 test passed (10.21 s)**, asserting paid evolution cost and
  the displayed Agumon source.
- All 36 changed code files passed `oxlint --quiet`; those files plus the aggregate
  passed `oxfmt --check` (37 files). Final Markdown formatting, generated index/layout
  and `git diff --check` passed after score recalculation.
- Repository-wide lint exits 1 on **ten pre-existing** `no-unused-expressions` errors
  in unchanged `apps/web/src/game/GameScreen.tsx`, lines 2166, 2170, 2182, 2186, 2205,
  2209, 2220, 2224, 2235 and 2239. Its bytes match the base; no new lint error remains
  in this change. This limitation is disclosed in the PR and Open items.
- Resource checkpoints: API build/typecheck exceeded a 2 GB cap (`SIGABRT`/V8 OOM),
  then passed with 4 GB. One formatter subprocess timed out at 30 seconds; isolated
  probes and the subsequent complete sync/check passed without changing that tool.
  An intermediate AD1-021 private-state test access was replaced with the public
  harness state reference; its seven focused tests and final types passed.
- Final Luna reviews covered AD1-001–009, AD1-010–025 and the engine/tool/three-record
  diff; none reported a critical or important remaining issue. Temporary flag/guard
  removals produced intended red regressions and were restored before the final gates.

Changed-file style commands are reproducible without including unrelated baseline errors:

```sh
node --input-type=module <<'NODE'
import { spawnSync } from 'node:child_process';
const files = spawnSync('git', ['diff', '--name-only', 'de4dda717'], { encoding: 'utf8' })
  .stdout.trim().split('\n').filter(f => /\.(ts|tsx|mjs)$/.test(f));
for (const [tool, args] of [
  ['oxlint', ['--quiet', ...files]],
  ['oxfmt', ['--check', ...files, 'packages/shared/src/effects/effects.json', '--threads=1']],
]) {
  const result = spawnSync('pnpm', ['exec', tool, ...args], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
NODE
```

## Card ledger

Five rubric columns are scored independently from 0 to 2. Catalog/rules credit uses
printed contracts and the per-card KB entries; IR credit uses the direct module trace;
behavioral credit uses the named gameplay tests; peer/stack credit uses relevant targeting,
optional/negative, inherited/evolution and real-turn boundary proofs plus established
mechanism conformance. Metadata/structural checks alone do not earn behavioral credit.
Delivery credit uses the final gates, committed/pushed evidence and updated PR. No card
has an unresolved clause or residual handwritten behavior.

| Card    | Catalog/rules | IR trace | Behavioral | Peer/stack | Delivery | Total     |
| ------- | ------------- | -------- | ---------- | ---------- | -------- | --------- |
| AD1-001 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-002 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-003 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-004 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-005 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-006 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-007 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-008 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-009 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-010 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-011 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-012 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-013 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-014 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-015 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-016 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-017 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-018 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-019 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-020 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-021 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-022 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-023 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-024 | 2             | 2        | 2          | 2          | 2        | **10/10** |
| AD1-025 | 2             | 2        | 2          | 2          | 2        | **10/10** |

### AD1-001 — Greymon

- Catalog: Red; Digimon; play 5; Lv.4; 5000 DP; traits Champion, Vaccine, Dinosaur, ADVENTURE; normal evolution Red Lv.3 cost 2.

- Main/alternate contract: [Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 [On Play] [When Digivolving] You may return 1 card with [Greymon], [Garurumon] or [Omnimon] in its name from your trash to the hand. [All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Garurumon] or [Tai Kamiya] in their names, this Digimon may digivolve into a Digimon card with [Greymon] in its name in the hand without paying the cost.

- Inherited contract: ＜Raid＞

- KB: Q6050, Q6051

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-001.ts); triggers OnPlay, WhenDigivolving, AllTurns, Static; operations/predicates Return, SubTrigger, Digivolve. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-001.test.ts), 10 test titles:

  - `returns a matching Greymon-family card from trash on play`

  - `returns a matching Greymon-family card from trash when digivolving`

  - `allows the printed level-3 ADVENTURE and Omnimon-in-text digivolution routes for cost 2`

  - `may free-digivolve itself into a Greymon when a Garurumon is played`

  - `may free-digivolve itself when a Tai Kamiya Tamer is played`

  - `does not retrigger after it digivolves into Garurumon, per Q6050`

  - `allows the optional trash return to be declined`

  - `grants Raid from the evolution stack and redirects to the highest-DP unsuspended Digimon`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-002 — Aldamon

- Catalog: Red; Digimon; play 8; Lv.5; 8000 DP; traits Hybrid, Variable, Wizard; normal evolution Red Lv.4 cost 3.

- Main/alternate contract: [Digivolve] [Takuya Kanbara] w/2 or more [Hybrid] trait cards under: Cost 3 ＜Rush＞ [When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon. [End of Attack] [On Deletion] You may trash 1 [Hybrid] or [Ten Warriors] trait card from your hand. If this effect trashed, ＜Draw 2＞ Then, you may play 1 red, blue or green Tamer card with inherited effects from your hand or trash without paying the cost.

- Inherited contract: [Your Turn] This Digimon gets +4000 DP.

- KB: Q6052, Q6903, Q6904, Q6905, Q6906, Q6907, Q6908

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-002.ts); triggers Static, WhenDigivolving, EndOfAttack, OnDeletion, YourTurn; operations/predicates Delete, Trash, Draw, ifThisEffectActed, PlayWithoutCost, ModifyDP. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-002.test.ts), 9 test titles:

  - `deletes an opposing Digimon within its DP ceiling when digivolving`

  - `digivolves from Takuya with 2 Hybrid cards under it and can attack immediately with Rush`

  - `rejects the Takuya route when fewer than 2 Hybrid cards are underneath`

  - `at end of attack trashes a Hybrid, draws 2, and plays an inherited-effect Tamer for free`

  - `still plays the Tamer after an attack when no card was trashed, per Q6052`

  - `resolves the same trash, draw, and free-play sequence on deletion`

  - `grants the inherited +4000 DP only during its controller's turn`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-003 — WarGrowlmon

- Catalog: Red; Digimon; play 7; Lv.5; 7000 DP; traits Ultimate, Virus, Cyborg, Hero; normal evolution Red Lv.4 cost 3.

- Main/alternate contract: [Digivolve] Lv.4 w/[Growlmon] in name or w/[Hero] trait: Cost 3 ＜Raid＞ [On Play] [When Digivolving] You may play 1 [Takato Matsuki] from your hand or trash without paying the cost. Then, you may delete 1 of your opponent's Digimon with 6000 DP or less.

- Inherited contract: [All Turns] When this Digimon with [Gallantmon] in its name would leave the battle area other than by your effects, you may play 1 each of [Takato Matsuki] and [Guilmon] from its digivolution cards without paying the cost.

- KB: Q6053, Q6054

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-003.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns; operations/predicates PlayWithoutCost, Delete, Replacement. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-003.test.ts), 10 test titles:

  - `plays Takato and deletes an opposing Digimon at the printed DP limit when digivolving`

  - `allows both printed level-4 Growlmon-name and Hero digivolution routes for cost 3`

  - `plays Takato from trash and deletes only an eligible Digimon on play`

  - `uses Raid to redirect a player attack to the highest-DP unsuspended Digimon`

  - `plays both Takato and Guilmon when an inherited holder leaves in battle, per Q6053`

  - `plays the sole available Takato when no Guilmon is in the stack, per Q6054`

  - `does not play inherited cards when Gallantmon leaves by its controller's effect`

  - `does not use another Gallantmon's inherited replacement when an unrelated host leaves`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-004 — WarGreymon

- Catalog: Red/Black; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Vaccine, Dragonkin, ADVENTURE, Hero; normal evolution Red Lv.5 cost 4, Black Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[Greymon] in name: Cost 3 [Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 ＜Raid＞ ＜Piercing＞ [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon. [All Turns] This Digimon gets +1000 DP for each of your Tamers' colors, and gains ＜Security A. +1＞ for every 3 of their colors. [End of Your Turn] 1 of your Digimon may attack.

- Inherited contract: [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon with [Greymon] or [Omnimon] in its name in its name.

- KB: Q6055

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-004.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns, EndOfYourTurn, WhenAttacking; operations/predicates Delete, ModifyDP, GainKeyword, Attack, selfHasNameContaining. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-004.test.ts), 11 test titles:

  - `deletes an opposing Digimon within its DP ceiling when played`

  - `allows Greymon-name, ADVENTURE, and Hero level-5 digivolution routes for cost 3`

  - `gets +1000 DP per distinct Tamer color and Security Attack +1 per three colors`

  - `has no Security Attack bonus with only two distinct Tamer colors`

  - `may make one of its Digimon attack at the end of the turn`

  - `uses Raid and Piercing to redirect, win battle, and continue security checks`

  - `inherits one DP-relative deletion for a Greymon-name attacker`

  - `activates but cannot delete when inherited by a non-Greymon or Omnimon attacker, per Q6055`

  - `shares the inherited Once Per Turn use across reattacks and resets next turn`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-005 — Gaiamon

- Catalog: Red/White; Digimon; play 7; Lv.6; 12000 DP; traits God, Appmon, God, Creation; normal evolution Red Lv.5 cost 4; ACE, Overflow 4.

- Main/alternate contract: [App Fusion] [Globemon] & [Charismon]: Cost 0 [Hand] [Counter] ＜Blast Digivolve＞ ＜Security A. +1＞ ＜Blocker＞ ＜Link +1＞ [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost. Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.

- KB: Q6056, Q6057, Q6058

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-005.ts); triggers Counter, Static, OnPlay, WhenDigivolving, WhenAttacking; operations/predicates Link, Delete. Exclusive `registerIrCard`, full coverage, zero residual.

- Existing mechanism proof: [card-information conformance](../../apps/api/src/engine/conformance/ch02-card-information.test.ts), `2-10-1: an Overflow ACE card costs its controller its printed overflow memory on leave`, exercises AD1-005 and its catalog amount. The collection gate includes App Fusion, Link capacity, Blast Digivolve, Security Attack +1 and Blocker conformance. These established proofs are retained without duplicate tests.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-005.test.ts), 6 test titles:

  - `publishes the exact zero-cost Globemon and Charismon App Fusion requirement`

  - `deletes an opposing Digimon within its DP ceiling when played`

  - `links legal cards from hand and its stack, shares the once-per-turn window, and resets next turn`

  - `can Blast Digivolve from hand for zero memory when its red level-5 route is legal`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-006 — Shoutmon X7

- Catalog: Red/Black/Blue; Digimon; play 13; Lv.6; 13000 DP; traits Mega, Data, Composite, Xros Heart, Blue Flare; normal evolution Red Lv.5 cost 5, Black Lv.5 cost 5, Blue Lv.5 cost 5.

- Main/alternate contract: [Digivolve] Lv.6 w/[Xros Heart]/[Blue Flare] trait: Cost 2 [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's Digimon with as much or less DP as this Digimon to the bottom of the deck. Then, this Digimon may unsuspend. [All Turns] When this Digimon would leave the battle area other than by DigiXros, from this Digimon's digivolution cards, you may place up to 4 [Xros Heart] or [Blue Flare] trait Digimon cards under 1 of your Tamers and play 1 such card without paying the cost. [DigiXros -2] [OmniShoutmon] x [ZeigGreymon] x [Ballistamon] x [Dorulumon] x [Starmons] x [Sparrowmon]

- KB: Q6059, Q6060, Q6061, Q6062, Q6063

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-006.ts); triggers OnPlay, WhenDigivolving, WhenAttacking, AllTurns; operations/predicates Return, Unsuspend, Replacement, PlaceUnder, PlayFromZone. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-006.test.ts), 12 test titles:

  - `bottom-decks an opposing Digimon within its DP ceiling when played`

  - `publishes and uses all six exact DigiXros slots at reduction 2 each`

  - `allows level-6 Xros Heart and Blue Flare digivolution routes for cost 2`

  - `bottom-decks at the DP boundary and unsuspends itself on its first attack only`

  - `shares its attack use same turn and resets on the next real turn`

  - `does not invoke the leave replacement when X7 is consumed as DigiXros material`

  - `with no Tamer, may play a qualifying source card and rejects non-matching sources, per Q6059/Q6063`

  - `with one source and a Tamer, must place it and then cannot play it, per Q6062`

  - `uses newly placed cards and itself as DigiXros materials for the played card, per Q6060/Q6061`

  - `may decline the leave effect and lets the whole stack go to trash`

  - `rejects play when memory is below the printed cost`

  - `matches committed metadata and publishes fully covered compiled IR`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-007 — Siriusmon

- Catalog: Red; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Vaccine, Light Dragon; normal evolution Red Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[Gammamon] in text: Cost 3 ＜Raid＞ ＜Security A. +1＞ ＜Blocker＞ [When Digivolving] [When Attacking] [Once Per Turn] By placing 3 Digimon cards with [Gammamon] in their texts from your hand or trash as this Digimon's top or bottom digivolution cards, delete 1 of your opponent's Digimon with as much or less DP as this Digimon. [End of Your Turn] [Once Per Turn] This Digimon with 5 or more digivolution cards may attack without suspending.

- KB: Q6064, Q6065

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-007.ts); triggers Static, WhenDigivolving, WhenAttacking, EndOfYourTurn; operations/predicates Delete, place, Attack, selfDigivolutionCountAtLeast. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-007.test.ts), 9 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `places three qualifying Gammamon-text Digimon and deletes only within its DP ceiling`

  - `uses the alternate level-5 Gammamon-text evolution requirement for cost 3`

  - `accepts qualifying cards from trash and places exactly three`

  - `does nothing when fewer than three qualifying cards remain, including decline`

  - `can place all three Gammamon-text cards at the bottom of its stack`

  - `records an independent top-or-bottom choice for each of the three cards`

  - `shares one use between its when-digivolving and when-attacking timings`

  - `attacks without suspending at end of turn only with five digivolution cards`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-008 — Gallantmon

- Catalog: Red; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Virus, Holy Warrior, Royal Knight, Hero; normal evolution Red Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[WarGrowlmon] in name or w/[Hero] trait: Cost 3 ＜Rush＞ ＜Raid＞ ＜Piercing＞ [When Digivolving] Delete up to 10000 DP total worth of your opponent's Digimon. Then, this Digimon may attack. [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's lowest DP Digimon. [Your Turn] Your opponent's effects don't affect this Digimon with [Takato Matsuki] in its digivolution cards and it gets +5000 DP.

- KB: Q6066, Q6067, Q6068, Q6069, Q6070, Q6071, Q6072

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-008.ts); triggers Static, WhenDigivolving, WhenAttacking, YourTurn; operations/predicates Delete, Attack, Aura, modifyDP, selfDigivolutionStackHasTrait, GrantStatic. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-008.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `deletes multiple Digimon totaling 10000 DP, then deletes the remaining lowest-DP Digimon`

  - `uses either printed alternate level-5 route for cost 3`

  - `gets +5000 DP on its turn only while Takato Matsuki is in its digivolution cards`

  - `is unaffected by opponent effects only during its controller's turn`

  - `uses Rush, Raid, and Piercing together after being played`

  - `consumes lowest-DP Once Per Turn deletion on evolution attack and resets next turn`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-009 — BlitzGreymon

- Catalog: Red/Black; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Virus, Cyborg, ADVENTURE; normal evolution Red Lv.5 cost 4, Black Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[Greymon] in name or w/[ADVENTURE] trait: Cost 3 ＜Alliance＞ ＜Piercing＞ ＜Blocker＞ [On Play] [When Digivolving] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, until your opponent's turn ends, their Digimon's effects don't affect this Digimon and 1 of your Digimon with [Garurumon] in its name. [End of Your Turn] 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, 1 of your Digimon may attack.

- Inherited contract: ＜Security A. +1＞

- KB: Q6073, Q6074, Q6075, Q6076

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-009.ts); triggers Static, OnPlay, WhenDigivolving, EndOfYourTurn; operations/predicates DeDigivolve, GrantStatic, DnaDigivolve, Attack. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-009.test.ts), 9 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `de-digivolves three sources on play and grants the same-turn Garurumon protection`

  - `protects only itself and one friendly Garurumon from opponent Digimon effects`

  - `expires both protections when the opponent's turn ends`

  - `uses either printed alternate level-5 route for cost 3`

  - `may attack at end of turn even when DNA digivolution is unavailable (Q6075)`

  - `may attack with the unsuspended Omnimon Alter-S after DNA digivolving (Q6074)`

  - `uses Alliance and Piercing in the same battle`

  - `provides inherited Security Attack +1 to its host`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-010 — Garurumon

- Catalog: Blue; Digimon; play 5; Lv.4; 5000 DP; traits Champion, Vaccine, Beast, ADVENTURE; normal evolution Blue Lv.3 cost 2.

- Main/alternate contract: [Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2 [On Play] [When Digivolving] ＜Draw 1＞ [All Turns] When your Digimon or Tamers are played or digivolve, if any of them have [Greymon] or [Matt Ishida] in their names, this Digimon may digivolve into a Digimon card with [Garurumon] in its name in the hand without paying the cost.

- Inherited contract: ＜Jamming＞

- KB: Q6077, Q6078

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-010.ts); triggers OnPlay, WhenDigivolving, AllTurns, Static; operations/predicates Draw, SubTrigger, Digivolve, anyOf, triggerSubjectMatchesFilter. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-010.test.ts), 8 test titles:

  - `free-digivolves a chosen Digimon into Garurumon when a Greymon is played`

  - `draws on play and when digivolving`

  - `uses both alternate level-3 routes for cost 2`

  - `free-digivolves after Matt Ishida is played`

  - `does not retrigger after this Garurumon itself digivolves into Greymon (Q6077)`

  - `models both play/digivolve watchers and alternate digivolution requirements`

  - `a low-DP top card stacked over AD1-010 is NOT deleted by a higher-DP Security Digimon (Jamming)`

  - `negative control: AD1-010 as the TOP card (not stacked) does NOT grant itself Jamming — it is an Inherited Effect`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-011 — Paildramon

- Catalog: Blue/Green; Digimon; play 8; Lv.5; 8000 DP; traits Ultimate, Free, Dragonkin, Hero; normal evolution Blue Lv.4 cost 4, Green Lv.4 cost 4.

- Main/alternate contract: ＜Partition (Blue Lv.4 & Green Lv.4)＞ [When Digivolving] Until your opponent's turn ends, this Digimon can't be deleted in battle. Then, if DNA digivolving, this Digimon's attack target can't change for the turn. [When Attacking] This Digimon may digivolve into a Digimon card with [Imperialdramon] in its name in the hand with the digivolution cost reduced by 2.

- Inherited contract: ＜Partition (Blue Lv.4 & Green Lv.4)＞

- KB: No card-specific Q&A; general rules reviewed

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-011.ts); triggers Static, WhenDigivolving, WhenAttacking; operations/predicates Restrict, isDnaDigivolving, Digivolve. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-011.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `protects the digivolved Paildramon from battle deletion until the opponent's turn ends`

  - `digivolves into Imperialdramon while attacking with the cost reduced by 2`

  - `may decline the optional Imperialdramon digivolution while attacking`

  - `applies the attack-target lock only to DNA digivolution while battle protection is unconditional`

  - `partitions into its specified Blue Lv.4 and Green Lv.4 cards after opponent-effect deletion`

  - `publishes Partition both directly and as an inherited keyword`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-012 — CresGarurumon

- Catalog: Blue/Black; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Data, Beast Knight, ADVENTURE; normal evolution Blue Lv.5 cost 4, Black Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[Garurumon] in name or w/[ADVENTURE] trait: Cost 3 ＜Alliance＞ ＜Evade＞ [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's lowest level Digimon to the hand. Then, this Digimon and 1 of your Digimon with [Greymon] in its name may unsuspend. [Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, 2 of your Digimon may DNA digivolve into [Omnimon Alter-S] in the hand. Then, you may change the attack target to 1 of your Digimon.

- Inherited contract: [Your Turn] This Digimon's attack target can't change.

- KB: Q6079, Q6080, Q6081

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-012.ts); triggers Static, OnPlay, WhenDigivolving, WhenAttacking, OpponentsTurn, YourTurn; operations/predicates Return, Unsuspend, SubTrigger, DnaDigivolve, RedirectAttack, Restrict. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-012.test.ts), 8 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `returns exactly one opposing lowest-level Digimon to its owner's hand on play`

  - `returns the lowest-level Digimon and unsuspends itself plus Greymon when attacking`

  - `shares the once-per-turn return and unsuspend effect across play and attack`

  - `redirects an opposing attack even when the optional DNA digivolution is unavailable`

  - `DNA digivolves into Omnimon Alter-S before resolving its optional attack redirection`

  - `uses either printed alternate level-5 route for cost 3`

  - `publishes Alliance, Evade, and inherited attack-target protection`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-013 — ZeigGreymon

- Catalog: Blue/Black; Digimon; play 11; Lv.6; 11000 DP; traits Mega, Virus, Cyborg, Blue Flare, Xros Heart; normal evolution Blue Lv.5 cost 3, Black Lv.5 cost 3.

- Main/alternate contract: [Digivolve] Lv.5 w/[Blue Flare]/[Xros Heart] trait: Cost 3 ＜Reboot＞ ＜Blocker＞ [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with the fewest digivolution cards. [All Turns] When this Digimon would leave the battle area other than by DigiXros, you may play 1 level 5 or lower [Blue Flare] or [Xros Heart] trait Digimon card from its digivolution cards without paying the cost.

- Inherited contract: [All Turns] For each color in this [Blue Flare] or [Xros Heart] trait Digimon's digivolution cards, it gets +1000 DP.

- KB: Q6082

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-013.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns; operations/predicates Delete, Replacement, PlayFromZone, ModifyDP, selfHasTrait. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-013.test.ts), 9 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `deletes the opponent's Digimon with the fewest digivolution cards on play`

  - `uses the Blue Flare alternate level-5 evolution route for cost 3 and deletes on evolution`

  - `plays an eligible Blue Flare source when it would leave, then still leaves`

  - `scopes the replacement play to this ZeigGreymon's own stack and does not add DigiXros materials`

  - `does not play an eligible Blue Flare card from another permanent's stack`

  - `does not trigger its leave replacement when ZeigGreymon is consumed as DigiXros material`

  - `gives a qualifying host +1000 DP per distinct color in its digivolution cards`

  - `publishes Reboot and Blocker on itself`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-014 — MetalGarurumon

- Catalog: Blue/Purple; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Data, Cyborg, ADVENTURE, Hero; normal evolution Blue Lv.5 cost 4, Purple Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[Garurumon] in name: Cost 3 [Digivolve] Lv.5 w/[ADVENTURE]/[Hero] trait: Cost 3 ＜Blocker＞ ＜Evade＞ [On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's level 5 or lower Digimon. Then, for every 2 of your Tamers' colors, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends. [All Turns] [Once Per Turn] When any of your Digimon suspend, this Digimon may unsuspend.

- Inherited contract: [When Attacking] [Once Per Turn] If this Digimon has [Garurumon] or [Omnimon] in its name, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.

- KB: No card-specific Q&A; general rules reviewed

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-014.ts); triggers Static, OnPlay, WhenDigivolving, WhenAttacking, AllTurns; operations/predicates Delete, Restrict, SubTrigger, Unsuspend, selfHasNameContaining. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-014.test.ts), 9 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `deletes one opposing level-five-or-lower Digimon on play and leaves a higher level intact`

  - `restricts one opposing permanent for every two distinct Tamer colors`

  - `does not create a suspension restriction with fewer than two Tamer colors`

  - `unsuspends once when one of its Digimon suspends`

  - `uses all three printed alternate level-5 routes for cost 3`

  - `publishes Blocker and Evade`

  - `applies its inherited restriction only when the host name contains Garurumon or Omnimon`

  - `resets the suspend watcher on the next own turn`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-015 — Beowolfmon

- Catalog: Yellow; Digimon; play 8; Lv.5; 8000 DP; traits Hybrid, Variable, Warrior; normal evolution Yellow Lv.4 cost 3.

- Main/alternate contract: [Digivolve] [Koji Minamoto] w/2 or more [Hybrid] trait cards under: Cost 3 ＜Jamming＞ [When Digivolving] [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn. [End of Attack] [On Deletion] You may play 1 yellow, black or purple Tamer card with inherited effects from your hand or trash without paying the cost. Then, by placing 1 [Hybrid] or [Ten Warriors] trait card from your hand under this under this Digimon or your Tamers, ＜Draw 2＞.

- Inherited contract: [When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.

- KB: Q6083, Q6909, Q6910, Q6911, Q6912, Q6913, Q6914

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-015.ts); triggers Static, WhenDigivolving, WhenAttacking, EndOfAttack, OnDeletion; operations/predicates ModifyDP, PlayWithoutCost, Draw, place. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-015.test.ts), 8 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `reduces an opposing Digimon by exactly 4000 DP when digivolving`

  - `digivolves from Koji with two Hybrid cards underneath for cost 3`

  - `continues when no Tamer is played, places a Hybrid under a Tamer, and draws two (Q6083)`

  - `places a Ten Warriors card under itself and draws two after the attack`

  - `does not draw when the hand has neither a Hybrid nor a Ten Warriors card`

  - `inherits the when-attacking -4000 DP effect`

  - `publishes Jamming only as its direct keyword`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-016 — ShineGreymon

- Catalog: Yellow/Red; Digimon; play 12; Lv.6; 12000 DP; traits Mega, Vaccine, Light Dragon, DATA SQUAD; normal evolution Yellow Lv.5 cost 4, Red Lv.5 cost 4.

- Main/alternate contract: [Digivolve] Lv.5 w/[RizeGreymon] in name or w/[DATA SQUAD] trait: Cost 3 ＜Alliance＞ ＜Blocker＞ [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 [Marcus Damon] from your hand or trash without paying the cost. Then, to 1 of your opponent's Digimon, give -3000 DP for each of your Digimon and Tamers until their turn ends. [All Turns] [Once Per Turn] When any of your [Marcus Damon]s are played or suspend, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.

- KB: No card-specific Q&A; general rules reviewed

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-016.ts); triggers Static, WhenDigivolving, WhenAttacking, AllTurns; operations/predicates PlayWithoutCost, ModifyDP, SubTrigger, Delete. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-016.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `plays Marcus Damon for free and applies -3000 DP per own Digimon or Tamer`

  - `does not delete above ShineGreymon's DP when Marcus is played`

  - `shares one use between its when-digivolving and when-attacking timings`

  - `deletes at most one opposing Digimon when Marcus is played or suspended each turn`

  - `uses either printed alternate level-5 route for cost 3`

  - `publishes Alliance and Blocker`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-017 — Dynasmon

- Catalog: Yellow/Red; Digimon; play 11; Lv.6; 11000 DP; traits Mega, Data, Holy Warrior, Royal Knight; normal evolution Yellow Lv.5 cost 3, Red Lv.5 cost 3.

- Main/alternate contract: When this card would be played, if you have 4 or more cards with [Lucemon] or [Witchelny] in its text in your trash, reduce the play cost by 5. [On Play] [When Digivolving] By trashing your top or bottom security card, all of your opponent's Digimon get -6000 DP for the turn. [All Turns] [Once Per Turn] When your security stack is removed from, you may delete 1 of your opponent's lowest DP Digimon.

- Security contract: [Security] Give 1 of your opponent's Digimon ＜Security A. -1＞ for the turn. Then, 1 of their Digimon gets -3000 DP until your turn ends.

- KB: Q6084, Q6085, Q6086, Q6087

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-017.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns, Security; operations/predicates Replacement, youHave, ModifyDP, trash, SubTrigger, Delete, SelectBind, GainKeyword. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-017.test.ts), 8 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `trashes one security card and gives every opposing Digimon -6000 DP on play`

  - `reduces its play cost by 5 with four Lucemon-text cards in trash`

  - `finishes the -6000 DP effect before the security-removal deletion resolves (Q6084)`

  - `reacts only when its own security is removed`

  - `deletes only once per turn for own security removal and ignores the opponent's stack`

  - `applies Security Attack -1 and -3000 DP to selected opposing Digimon`

  - `resolves its Security effect before battling the attacking Digimon (Q6086)`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-018 — LordKnightmon

- Catalog: Purple/Black; Digimon; play 11; Lv.6; 11000 DP; traits Mega, Virus, Holy Warrior, Royal Knight; normal evolution Purple Lv.5 cost 3, Black Lv.5 cost 3.

- Main/alternate contract: When this card would be played, if you have 4 or more cards with [Knightmon] or [Lucemon] in its text in your trash, reduce the play cost by 5. [On Play] [When Digivolving] Until your opponent's turn ends, their Digimon's effects don't affect 1 of your Digimon. [All Turns] [Once Per Turn] When any of your Digimon with [Knightmon] or [Lucemon] in its text are played, ＜De-Digivolve 2＞ 1 of your opponent's Digimon.

- Security contract: [Security] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, delete 1 of your opponent's Digimon with a play cost of 3 or less.

- KB: Q6088, Q6089, Q6090, Q6091, Q6092, Q6093, Q6094, Q6095, Q6096, Q6915

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-018.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns, Security; operations/predicates Replacement, youHave, GrantStatic, SubTrigger, DeDigivolve, Delete. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-018.test.ts), 8 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `de-digivolves an opposing Digimon by two when a Knightmon is played`

  - `resets the Knightmon watcher on the next real turn`

  - `triggers its own Knightmon-text watcher when LordKnightmon is played (Q6094)`

  - `reduces its play cost by 5 with four Knightmon/Lucemon-text cards in trash`

  - `grants one chosen Digimon opponent-Digimon-effect immunity through their turn`

  - `de-digivolves before deleting the promoted low-cost attacker from security (Q6095)`

  - `security de-digivolves first, then deletes only a resulting play-cost 3 or less Digimon`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-019 — Matt Ishida & T.K. Takaishi

- Catalog: Blue/Yellow; Tamer; play 3; traits -, -, ADVENTURE, Hero.

- Main/alternate contract: [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. [Your Turn] When any of your Digimon digivolve into an [ADVENTURE] trait Digimon, by suspending this Tamer, you may play 1 [ADVENTURE] trait card from your hand. For every 2 of your Tamers' colors, reduce this effect's play cost by 1.

- KB: Q6097, Q6098

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-019.ts); triggers StartOfYourMainPhase, YourTurn; operations/predicates GainMemory, opponentHas, SubTrigger, PlayFromZone, suspend. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-019.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `suspends itself and plays an ADVENTURE card after an ADVENTURE digivolution`

  - `reduces the effect's paid play cost by 2 with four distinct Tamer colors`

  - `can play an ADVENTURE Tamer rather than only a Digimon`

  - `gains 1 memory at start of main only while the opponent has a Digimon`

  - `does not gain memory at start of main when the opponent has no Digimon`

  - `can decline the optional ADVENTURE play after a qualifying evolution`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-020 — Tommy, Takuya, & Zoe

- Catalog: Blue/Red/Green; Tamer; play 5; traits -.

- Main/alternate contract: [Security] Play this card without paying the cost. [Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory.

- Inherited contract: [End of Your Turn] [Once Per Turn] By attacking with this Digimon with the [Hybrid] or [Ten Warriors] trait, it gains ＜Security A. +1＞ for the attack.

- KB: Q6099, Q6100

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-020.ts); triggers Security, StartOfYourMainPhase, OnPlay, EndOfYourTurn; operations/predicates PlayWithoutCost, PlaceUnder, Draw, ifThisEffectActed, GainMemory, selfDigivolutionStackCountAtLeast, GainKeyword, attack, selfHasTrait. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-020.test.ts), 10 test titles:

  - `documents and encodes the four-Hybrid threshold for gaining 2 memory`

  - `places two differently colored Hybrid cards under itself and draws`

  - `can assign different colors to two identical multicolor Hybrid cards (Q6099)`

  - `gains 2 memory at four Hybrid sources even when it places nothing (Q6100)`

  - `makes its qualifying Hybrid host attack with Security Attack +1 at end of turn`

  - `makes its qualifying Ten Warriors host attack with Security Attack +1 at end of turn`

  - `does not grant the inherited attack effect to a non-Hybrid host`

  - `does not leave Security Attack +1 active when a qualifying host cannot attack`

  - `allows declining the optional attack without granting the attack-only keyword`

  - `plays itself from security without paying the cost`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-021 — Marcus Damon & Agumon

- Catalog: Yellow/Red; Tamer; play 5; traits -, -, DATA SQUAD.

- Main/alternate contract: [Your Turn] When this Tamer suspends, ＜Draw 1＞ Then, 1 of your Digimon may digivolve into a yellow Digimon card with [Greymon] in its name in the hand with the digivolution cost reduced by 3. [End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as a 6000 DP Digimon, gains ＜Rush＞ and can't digivolve. Then, 1 of your Digimon may attack.

- Security contract: [Security] Play this card without paying the cost.

- KB: Q6101, Q6102, Q6103, Q6104, Q6105, Q6106, Q6107, Q6108, Q6109, Q6110, Q6111

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-021.ts); triggers YourTurn, EndOfYourTurn, Security; operations/predicates youHave, SubTrigger, Draw, Digivolve, SelectBind, GrantStatic, SetBaseDP, GainKeyword, Restrict, Attack, PlayWithoutCost. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-021.test.ts), 7 test titles:

  - `plays from security without paying its cost`

  - `is registered as fully covered compiled IR`

  - `draws and may digivolve for 3 less only when this Tamer suspends`

  - `turns only the chosen Marcus into a restricted 6000 DP Rush Digimon, then attacks once`

  - `does not offer the trailing attack without the yellow Agumon/Greymon gate`

  - `binds every Marcus grant to one selection and declares exactly one optional attack`

  - `still draws on suspension but rejects a hand Digimon without Greymon in its name`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-022 — Izzy Izumi & Tai Kamiya

- Catalog: Green/Red; Tamer; play 3; traits -, -, ADVENTURE, Hero.

- Main/alternate contract: [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. [Your Turn] When any of your other [ADVENTURE] trait Digimon or Tamers are played, by suspending this Tamer, 1 of your Digimon may digivolve into an [ADVENTURE] trait Digimon card in the hand. For every 2 of your Tamers' colors, reduce this effect's digivolution cost by 1.

- KB: Q6112

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-022.ts); triggers StartOfYourMainPhase, YourTurn; operations/predicates GainMemory, opponentHas, SubTrigger, Digivolve, suspend. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-022.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `suspends itself and digivolves a Digimon when another ADVENTURE card is played`

  - `reduces only this effect's digivolution cost by 2 with four Tamer colors`

  - `does not reduce an unrelated manual digivolution`

  - `gains 1 memory at start of main only if the opponent has a Digimon`

  - `does not gain memory at start of main when the opponent has no Digimon`

  - `does not react when an unrelated non-ADVENTURE card is played`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-023 — J.P., Koji, & Koichi

- Catalog: Black/Yellow/Purple; Tamer; play 5; traits -, -, -.

- Main/alternate contract: [Security] Play this card without paying the cost. [Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards with different colors from your hand or trash under this Tamer. If this effect placed, ＜Draw 1＞ Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory.

- Inherited contract: [All Turns] [Once Per Turn] When this Digimon with the [Hybrid] or [Ten Warriors] trait would leave the battle area, by adding your top security card to the hand, it doesn't leave.

- KB: Q6113, Q6114

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-023.ts); triggers Security, StartOfYourMainPhase, OnPlay, AllTurns; operations/predicates PlaceUnder, Draw, namedCountAtLeast, GainMemory, selfDigivolutionStackCountAtLeast, PlayWithoutCost, Replacement, securityToHand. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-023.test.ts), 12 test titles:

  - `maps the catalog, KB color assignment, threshold, security, and inherited replacement`

  - `places two differently colored Hybrid cards under itself and draws`

  - `gains 2 memory from four existing Hybrid cards without placing another`

  - `assigns different colors to two identical multicolor Hybrid cards (Q6113)`

  - `prevents a Hybrid Digimon from leaving by adding the top security card to hand`

  - `prevents a Ten Warriors Digimon from leaving by adding the top security card to hand`

  - `allows declining the inherited replacement without paying security`

  - `does not replace a matching host's leave when its security is empty`

  - `does not protect a non-Hybrid, non-Ten Warriors host`

  - `uses the inherited replacement only once per turn`

  - `resets the inherited replacement on the next real turn`

  - `plays itself from security without paying the cost`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-024 — Imperialdramon: Fighter Mode

- Catalog: Blue/Green; Digimon; play 13; Lv.6; 13000 DP; traits Mega, Free, Ancient Dragonkin, Hero; normal evolution Blue Lv.5 cost 5, Green Lv.5 cost 5.

- Main/alternate contract: [Digivolve] [Imperialdramon: Dragon Mode]: Cost 1 [Digivolve] Lv.5 w/[Hero] trait: Cost 5 ＜Security A. +1＞ ＜Blocker＞ [When Digivolving] [When Attacking] [Once Per Turn] Return 1 of your opponent's lowest DP Digimon to the bottom of the deck. [All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon. Then, if played or digivolved by effects, you may return 1 of your opponent's suspended Digimon to the bottom of the deck.

- KB: Q6115, Q6518, Q6519, Q6916

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-024.ts); triggers Static, WhenDigivolving, WhenAttacking, AllTurns; operations/predicates Return, SubTrigger, Suspend, Unsuspend, triggerPlayedOrDigivolvedByEffect. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-024.test.ts), 8 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `suspends an opposing Digimon and unsuspends itself when a Digimon is played`

  - `unsuspends even when there is no opposing Digimon to suspend (Q6916)`

  - `self-triggers after effect-driven evolution and returns the suspended Digimon (Q6115)`

  - `reacts when the opponent plays a Digimon as well as when I play one`

  - `shares one use between when-digivolving and when-attacking lowest-DP returns`

  - `resets the shared lowest-DP return on the next own turn`

  - `uses both alternate evolution routes and publishes its two keywords`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

### AD1-025 — Omnimon

- Catalog: Red/White/Blue; Digimon; play 15; Lv.7; 15000 DP; traits Mega, Vaccine, Holy Warrior, Royal Knight, ADVENTURE, Hero; normal evolution Red Lv.6 cost 5, Blue Lv.6 cost 5.

- Main/alternate contract: ＜Raid＞ ＜Blocker＞ ＜Partition ([WarGreymon] & [MetalGarurumon])＞ [On Play] [When Digivolving] Return all of your opponent's Digimon with as many or fewer digivolution cards as this Digimon to the bottom of the deck. Then, delete 1 of your opponent's Digimon. [All Turns] [Once Per Turn] When any of your opponent's Digimon leave the battle area, trash 1 of their Option cards in the battle area and trash their top security card.

- KB: Q6116, Q6117, Q6118

- IR trace: [direct module](../../apps/api/src/cards/AD1/AD1-025.ts); triggers Static, OnPlay, WhenDigivolving, AllTurns; operations/predicates Return, Delete, SubTrigger, Trash. Exclusive `registerIrCard`, full coverage, zero residual.

- Proof: [focused suite](../../apps/api/src/cards/AD1/AD1-025.test.ts), 7 test titles:

  - `matches committed metadata and publishes fully covered compiled IR`

  - `bottom-decks opponent Digimon with no more sources than itself, then deletes one`

  - `returns every opposing Digimon within its source-count ceiling before deleting one survivor`

  - `publishes Raid, Blocker, and Partition`

  - `replays its WarGreymon and MetalGarurumon materials through Partition`

  - `trashes one opposing Option and top security card on the first opposing Digimon leave only`

  - `resets the opposing-leave watcher on the next real turn`

- Score: **10/10** — catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2. The printed clauses are covered by the traces and named proofs above and the final mechanism/collection gates. No unresolved interpretation or behavioral limitation; evidence `5b8ad19ea`.

## Mechanisms

### DigiXros leave-reaction exclusion

`ReplacementAction.exceptDigiXros` is carried through both interpreter replacement
modes into the subscription registry. `GameEngine` marks only its DigiXros material
relocation consult with `isDigiXros`; the leave-prevention helper then excludes only
subscriptions bearing that flag. Ordinary leave reactions and other DigiXros
replacements continue to operate. AD1-006 and AD1-013's printed exclusions use this seam.

Focused command on 2026-09-12:

```sh
TEST_HEAP_MB=2048 TEST_MAX_WORKERS=1 NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/api exec vitest run src/engine/effects/leavePrevent.test.ts src/engine/cards/ex7VolcanicdramonMechanism.test.ts --maxWorkers=1 --no-file-parallelism
```

2 files, 23 tests passed. Removing only the new helper skip guard using `apply_patch`
made `leavePrevent.test.ts` fail its intended DigiXros exclusion assertion (received
`{p1}` instead of an empty set): 1 failed, 19 passed. Restoring it and rerunning passed
all 20 tests. No git history mutation was used. AD1-013's actual DigiXros negative
regression failed when its flag was removed: the eligible BT10-024 source was replayed,
leaving two permanents instead of one. Restoring the flag passed all nine AD1-013 tests.
AD1-006's real Superior-mode material-consumption regression also failed with its flag
removed: the eligible source was incorrectly moved under the Tamer. Restoring the flag
passed all 12 AD1-006 tests. Both regressions are green in the closing combined gate.

### Inherited leave self-subject

AD1-003's inherited `wouldLeavePlay` replacement now combines its Gallantmon name and
controller filters with `isSelfRef: true`. The positive tests resolve an actual battle
leave and play the eligible stack cards; the unrelated-host negative uses the real
delete primitive. Removing only this self filter made
`does not use another Gallantmon's inherited replacement when an unrelated host leaves`
fail at its no-Takato-play assertion (line 247 received `true`, expected `false`).
Restoring the filter passed all ten AD1-003 tests. This is a card scoping correction;
no second registration or custom handwritten executable path was introduced.

### Shared turn-budget fixture isolation

Applicable shared-budget proofs retain the host and exercise multiple legal actions
in one actual turn, followed by a production turn-loop transition and reset. AD1-005
also proves the normal red Lv.5 evolution cost of 4, one bonus draw, exact stack/link
movement and capacity overflow. AD1-016 required no production change: tracing showed
that setting memory after entering initial Main had queued two turn advances after the
first Marcus play. Setting the initial memory before starting the loop and asserting
turn identity proves same-turn denial and next-own-turn reuse against the existing IR.

### attack-cost callback

The `GainKeyword` attack cost adds a callback after attack declaration and before suspension and
When Attacking effects, inside the combat controller's cleanup boundary, reusing the existing
attack legality checks. Controller tests assert callback order and cleanup on rejection. This is a
narrowly supported path, not a claim that every action supports an attack cost. Used by AD1-020.

### all-turns play and digivolve watcher

AD1-024's All Turns watcher observes either player's Digimon play and digivolution through
`whenPlayed`/`whenAnyDigivolves` with `controllerDefault: "any"`, rather than own-controller events
only.

### combat registration cleanup

The combat failure-path test registered a synthetic AD1-002 that leaked into the combined run. It
now restores the production compiled card in a `finally` block. Its deliberate
`UnsupportedEffectError` log is expected; the regression asserts turn closure after the rejected
attack.

## Knowledge base index

Coordinator re-queried all 25 IDs on 2026-09-12 using
`node tools/kb/query.mjs card <ID>`: 85 card-specific Q&A entries, no returned
erratum/restriction alerts. AD1-011/014/016 return zero card-specific Q&A.
The local comprehensive rules and shared mechanism tests supply their general rules.

Ruling IDs cited by the per-card entries above (85): Q6050, Q6051, Q6052, Q6053, Q6054, Q6055, Q6056, Q6057, Q6058, Q6059, Q6060, Q6061, Q6062, Q6063, Q6064, Q6065, Q6066, Q6067, Q6068, Q6069, Q6070, Q6071, Q6072, Q6073, Q6074, Q6075, Q6076, Q6077, Q6078, Q6079, Q6080, Q6081, Q6082, Q6083, Q6084, Q6085, Q6086, Q6087, Q6088, Q6089, Q6090, Q6091, Q6092, Q6093, Q6094, Q6095, Q6096, Q6097, Q6098, Q6099, Q6100, Q6101, Q6102, Q6103, Q6104, Q6105, Q6106, Q6107, Q6108, Q6109, Q6110, Q6111, Q6112, Q6113, Q6114, Q6115, Q6116, Q6117, Q6118, Q6518, Q6519, Q6903, Q6904, Q6905, Q6906, Q6907, Q6908, Q6909, Q6910, Q6911, Q6912, Q6913, Q6914, Q6915, Q6916.

## Open items

- No AD1 card remains below 10/10, and no AD1 rule, engine seam or behavioral proof
  remains unresolved. The collection is committed, branch pushed and PR updated.
- Repository-wide lint remains red only on the ten baseline `GameScreen.tsx` errors
  listed under Gates. This unrelated file is unchanged; changed-code lint is green.
- Historical contradiction: the 2026-09-05 baseline reported AD1-011, AD1-021 and
  AD1-024 failures. Subsequent changes repaired AD1-024's watcher and the two
  route-choice fixtures. The current 2026-09-12 closing gate reproduces green
  behavior and supersedes those historical failures and intermediate re-audit
  fixture checkpoints; its source is `5b8ad19ea`.

## History

- `docs/audits/AD1-AUDIT.md` — last in `9bb623a88`, 2026-09-06. Recalculated 25-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/AD1-FINAL-EVIDENCE-AUDIT.md` — last in `f221ae2cf`, 2026-09-05. Verification
  evidence: behavioral corrections, revert proof, reproducible gates and peer-review scope.
- `docs/audits/AD1-BASELINE-AUDIT.md` — last in `c79d0f68b`, 2026-09-05. Baseline run recording the
  three initial failures and the diagnosis lead.
- `docs/audits/AD1-001-009-LUNA-AUDIT.md`, `docs/audits/AD1-010-017-LUNA-AUDIT.md`,
  `docs/audits/AD1-018-025-LUNA-AUDIT.md` — 3 files, last in `f221ae2cf`, 2026-09-05. Luna
  clause-level range reports supplying printed clauses, exact test titles and KB tracing.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for AD1: PR #4596; commit `929e245f0`.
