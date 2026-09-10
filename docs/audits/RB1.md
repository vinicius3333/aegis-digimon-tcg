---
set: RB1
cards: 33
status: verified
verified_at: 2026-09-10
catalog_commit: 52da0b5bb
evidence_commit: a8136a499
---

# RB1 audit

## Status

All 33 committed RB1 cards hold accepted clause-level evidence at 10/10, recalculated on 2026-09-05
on branch `audit-promo-lm-rb-20260905` from base `7209adb89` and verified again after that branch
was integrated with main `18156ecee`. The winning source is the recalculated ledger `RB1-AUDIT.md`
with its coordinator report `PROMO-LM-RB-AUDIT-20260905.md` and the shared LM/RB1 clause review. No
source disagreed about RB1. Re-running the collection on 2026-09-10 at `eabe99351` confirms it:
35 files and 82 tests pass.

## Gates

Re-run for this document on 2026-09-10 at `eabe99351`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/RB1 --maxWorkers=1
```

35 test files and 82 tests passed in 2.54 s.

Gates carried from the winning report (`PROMO-LM-RB-AUDIT-20260905.md`, `RB1-AUDIT.md`), run with
`--maxWorkers=1 --no-file-parallelism` after integration with main `18156ecee`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/P src/cards/LM src/cards/RB1 src/cards/promo-lm-rb.catalog-parity.test.ts --maxWorkers=1 --no-file-parallelism
pnpm typecheck
git diff --check
```

- Combined P/LM/RB1 and persisted parity: 362 files, 1,988 tests passed, in ten serial batches of
  at most 40 files. The slow monolithic run was stopped and is not counted as passing evidence.
- RB1 checkpoint: 35 files, 82 tests passed.
- Related and incoming shared-engine mechanisms: 19 files, 525 tests passed.
- Rendered Promo and EX10 evolution-stack scenarios: 2 files, 2 tests passed.
- Full workspace typecheck, changed-file lint and format, and clean full diff checks passed.
- Persisted-effect parity: 15 stale RB1 records synchronized in `ab92324cf` via
  `tools/sync-effects-from-card-modules.mjs`, preserving other sets' bytes. The 338-card parity
  guard reads the persisted JSON independently, reproduced the stale RB1 records before
  synchronization, and passed all 339 assertions.

## Card ledger

### RB1-001 — Gurimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-001.ts) · [test](../../apps/api/src/cards/RB1/RB1-001.test.ts) · clause review (source removed; see History)<br>“draws when an effect places a digivolution card under its host”

### RB1-002 — Puyoyomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-002.ts) · [test](../../apps/api/src/cards/RB1/RB1-002.test.ts) · clause review (source removed; see History)<br>“trashes the bottom card under an opponent Digimon by paying a blue hand card”; “does not activate when no blue payment card is in hand”

### RB1-003 — Bosamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-003.ts) · [test](../../apps/api/src/cards/RB1/RB1-003.test.ts) · clause review (source removed; see History)<br>“gives its host +1000 DP while the opponent has no unsuspended Digimon”; “does not give the inherited bonus while an opponent Digimon is unsuspended”

### RB1-005 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-005.ts) · [test](../../apps/api/src/cards/RB1/RB1-005.test.ts) · clause review (source removed; see History)<br>“adds Hiro from the revealed cards”; “grants inherited DP only when the top card has Gammamon in its text”

### RB1-008 — BetelGammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-008.ts) · [test](../../apps/api/src/cards/RB1/RB1-008.test.ts) · clause review (source removed; see History)<br>“plays Hiro Amanokawa from hand when none is in play”; “does not play a second Hiro when one is already in play”

### RB1-009 — Canoweissmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-009.ts) · [test](../../apps/api/src/cards/RB1/RB1-009.test.ts) · clause review (source removed; see History)<br>“digivolves from hand onto a Gammamon carrying a Gammamon-named card”; “rejects the special path when the Gammamon stack card is absent”

### RB1-010 — Siriusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-010.ts) · [test](../../apps/api/src/cards/RB1/RB1-010.test.ts) · clause review (source removed; see History)<br>“places a Gammamon-text card as cost before deleting a qualifying opponent”; “does not pay the placement cost or delete when the player declines”

### RB1-011 — Jellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-011.ts) · [test](../../apps/api/src/cards/RB1/RB1-011.test.ts) · clause review (source removed; see History)<br>“adds Kiyoshiro when it is the matching Jellymon-text reveal”; “returns all unmatched reveals to the bottom without adding cards”

### RB1-012 — KausGammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-012.ts) · [test](../../apps/api/src/cards/RB1/RB1-012.test.ts) · clause review (source removed; see History)<br>“has Evade while in the battle area”; “does not grant Evade to a different Digimon”

### RB1-013 — TeslaJellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-013.ts) · [test](../../apps/api/src/cards/RB1/RB1-013.test.ts) · clause review (source removed; see History)<br>“gains memory once when a card is trashed from hand through an inherited stack”; “does not play a second Kiyoshiro when one is already present”

### RB1-014 — Thetismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-014.ts) · [test](../../apps/api/src/cards/RB1/RB1-014.test.ts) · clause review (source removed; see History)<br>“pays blue cards and trashes cards under an opponent stack”; “leaves cards untouched when no blue payment cards are available”

### RB1-015 — Fumamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-015.ts) · [test](../../apps/api/src/cards/RB1/RB1-015.test.ts) · clause review (source removed; see History)<br>“trashes up to three cards under a low-DP opponent and restricts attack”; “does not affect an opponent Digimon above Fumamon's DP”

### RB1-016 — Amphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-016.ts) · [test](../../apps/api/src/cards/RB1/RB1-016.test.ts) · clause review (source removed; see History)<br>“prevents one blue Digimon deletion by returning three Jellymon-text cards”; “does not prevent deletion when fewer than three Jellymon-text cards are available”

### RB1-017 — Numemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-017.ts) · [test](../../apps/api/src/cards/RB1/RB1-017.test.ts) · clause review (source removed; see History)<br>“reveals and adds Monzaemon or Numemon cards when deleted”; “grants Blocker to an inherited Numemon or Monzaemon-named host on the opponent's turn”

### RB1-018 — Monzaemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-018.ts) · [test](../../apps/api/src/cards/RB1/RB1-018.test.ts) · clause review (source removed; see History)<br>“places Numemon from trash, gains memory, and debuffs one opponent Digimon”; “does not pay the memory reward when no Numemon card is available to place”

### RB1-019 — ShinMonzaemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-019.ts) · [test](../../apps/api/src/cards/RB1/RB1-019.test.ts) · clause review (source removed; see History)<br>“moves every level 3 to its owner's security and weakens only opposing level 4 or higher Digimon”; “places the attacked opponent Digimon face down at security bottom after trashing Numemon”

### RB1-020 — Angoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-020.ts) · [test](../../apps/api/src/cards/RB1/RB1-020.test.ts) · clause review (source removed; see History)<br>“reveals three cards and adds the Angoramon-text card plus Ruli”; “adds no cards when the revealed cards have no matching text or Ruli name”

### RB1-021 — WezenGammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-021.ts) · [test](../../apps/api/src/cards/RB1/RB1-021.test.ts) · clause review (source removed; see History)<br>“has Blocker while in the battle area”; “does not grant Blocker to a different Digimon”

### RB1-022 — SymbareAngoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-022.ts) · [test](../../apps/api/src/cards/RB1/RB1-022.test.ts) · clause review (source removed; see History)<br>“may play Ruli Tsukiyono from hand when none is already in play”; “does not play a second Ruli when one is already in play”

### RB1-023 — Ghilliedhumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-023.ts) · [test](../../apps/api/src/cards/RB1/RB1-023.test.ts) · clause review (source removed; see History)<br>“suspends one opponent Digimon at or below its DP and prevents unsuspension”; “does not suspend an opponent Digimon above its DP limit”

### RB1-024 — Lamortmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-024.ts) · [test](../../apps/api/src/cards/RB1/RB1-024.test.ts) · clause review (source removed; see History)<br>“suspends an opponent Digimon when an Angoramon card is in its evolution stack”; “does not suspend when the evolution stack lacks Angoramon”; “trashes the opponent security top when this inherited Digimon deletes in battle”

### RB1-025 — Diarbbitmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-025.ts) · [test](../../apps/api/src/cards/RB1/RB1-025.test.ts) · clause review (source removed; see History)<br>“suspends one opponent Digimon and gains memory only after none remain unsuspended”; “may force an Angoramon Digimon to attack an opponent Digimon at end of turn”; “does not open the attack effect when every Angoramon-text Digimon is suspended”

### RB1-026 — Espimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-026.ts) · [test](../../apps/api/src/cards/RB1/RB1-026.test.ts) · clause review (source removed; see History)<br>“gets +2000 DP during the opponent's turn while a Tamer is in play”; “does not gain the bonus when no Tamer is in play”

### RB1-027 — HoverEspimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-027.ts) · [test](../../apps/api/src/cards/RB1/RB1-027.test.ts) · clause review (source removed; see History)<br>“gains memory when the revealed security card is a Digimon”; “draws when the revealed security card is not a Digimon”

### RB1-028 — BlackGatomon Uver.

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-028.ts) · [test](../../apps/api/src/cards/RB1/RB1-028.test.ts) · clause review (source removed; see History)<br>“plays the exact security instance at battle end and draws after returning an opponent Digimon”

### RB1-029 — GulusGammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-029.ts) · [test](../../apps/api/src/cards/RB1/RB1-029.test.ts) · clause review (source removed; see History)<br>“deletes itself, accepts the equal-DP boundary, rejects a higher-DP target, and revives Gammamon”

### RB1-030 — Regulusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-030.ts) · [test](../../apps/api/src/cards/RB1/RB1-030.test.ts) · clause review (source removed; see History)<br>“uses the Lv.4 Gammamon evolution requirement and copies an All Turns effect from a Gammamon-name stack card”; “copies Gammamon-name effects through RB1-030's inherited text on a higher host”; “does not copy an effect from a non-Gammamon-name source card”; “POSITIVE: granted Digimon's deletion deletes the opponent's LOWEST-level Digimon”; “NEGATIVE (cost): no Gammamon-text card in hand => no grant => deletion deletes nothing”; “EXPIRY: the grant lapses at the end of the opponent's turn (UntilOpponentTurnEnd)”

### RB1-031 — Arcturusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-031.ts) · [test](../../apps/api/src/cards/RB1/RB1-031.test.ts) · clause review (source removed; see History)<br>“places an exact Gammamon from trash and deletes only within its stack-count level cap”

### RB1-032 — Hiro Amanokawa

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-032.ts) · [test](../../apps/api/src/cards/RB1/RB1-032.test.ts) · clause review (source removed; see History)<br>“places the exact Gammamon from hand under a Digimon, gains memory, and draws”

### RB1-033 — Kiyoshiro Higashimitarai

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-033.ts) · [test](../../apps/api/src/cards/RB1/RB1-033.test.ts) · clause review (source removed; see History)<br>“suspends RB1-033 and draws 1 when own Jellymon-text Digimon attacks and hand ≤ 7”; “does NOT suspend when hand size > 7”; “suspends RB1-033 and draws 1 when an opponent Lv.5 Digimon attacks and hand ≤ 7”; “fires at the exact 7-card boundary and only once while the Tamer is suspended”; “allows declining the optional draw at the exact 7-card boundary”; “does not trigger for an opposing level 4 Digimon even with 7 cards in hand”; “gains 1 memory when this Tamer becomes unsuspended”; “does not gain memory when the Tamer becomes unsuspended during the opponent's turn”; “plays itself from Security without paying its play cost”

### RB1-034 — Ruli Tsukiyono

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-034.ts) · [test](../../apps/api/src/cards/RB1/RB1-034.test.ts) · clause review (source removed; see History)<br>“suspends to reduce a qualifying green Beast digivolution cost by exactly 1”; “excludes Sea Animal from the Beast, Animal, or Sovereign reduction filter”; “unsuspends one suspended Digimon with Angoramon in its name at end of turn”

### RB1-035 — Hokuto Amanokawa

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-035.ts) · [test](../../apps/api/src/cards/RB1/RB1-035.test.ts) · clause review (source removed; see History)<br>“plays itself from Security without paying its cost”; “gains 1 memory at the start of its turn when the opponent has 3 Tamers”; “suspends to draw once when the opponent plays one or more level 3 Digimon”; “applies both rewards once when level 3 and level 4 Digimon are played simultaneously”; “may suspend for a level-less Digimon but receives neither reward”

### RB1-036 — Proximamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Evidence: [module](../../apps/api/src/cards/RB1/RB1-036.ts) · [test](../../apps/api/src/cards/RB1/RB1-036.test.ts) · clause review (source removed; see History)<br>“rejects the alternate cost when Siriusmon lacks an Arcturusmon digivolution card”; “uses the exact alternate cost 3 when Siriusmon has an Arcturusmon source”; “places the exact Gammamon-text card and deletes an opposing Digimon within its DP”

## Mechanisms

### stack-name alternate evolution requirement

RB1-036's cost-3 alternate evolution requires an Arcturusmon in the Proximamon stack. Commit
`ab92324cf` adds the existing shared stack-name requirement and distinguishes the alternate path
from printed evolution. The same checkpoint strengthens RB1-030 inherited copying and exclusion,
RB1-033 hand/level/turn/refusal boundaries, and RB1-035 Security behavior.

## Knowledge base index

No RB1 ruling ID is cited by the recalculated ledger or the shared LM/RB1 clause review: every Q&A
reference in that review belongs to an LM card. No RB1 erratum or restriction is recorded. Cards in
this set were scored against catalog text, direct IR and observable behavior, with general rules
reviewed where no card-specific Q&A exists.

## Open items

- No card scores below 10/10 and no ambiguity is recorded.
- No source contradicted another about RB1.
- The set has 33 committed catalog cards while IDs run to RB1-036; the gaps (including RB1-004,
  RB1-006 and RB1-007) are absent from the catalog and carry no module or score.
- No KB ruling is cited for any RB1 card. The scores rest on catalog, IR and behavioral evidence
  alone, so a later ruling could reopen a row without any recorded citation to check it against.
- Post-audit drift not covered by the 2026-09-05 evidence: `969ed488f` (2026-09-10) removed
  `ts-nocheck` from 32 RB1 modules and `d90434a3f` (2026-09-08) repaired settle predicates in 2 RB1
  test files. The collection re-run above is green at `eabe99351`, but the shared gates (combined
  parity run, rendered scenarios, workspace typecheck, lint) were not re-run after that drift.

## History

- `docs/audits/RB1-AUDIT.md` — last in `a8136a499`, 2026-09-05. Recalculated 33-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/PROMO-LM-RB-AUDIT-20260905.md` — last in `a8136a499`, 2026-09-05. Coordinator
  evidence for the shared P/LM/RB1 audit: corrections, artifact parity, verification and
  integration. Also recorded in `docs/audits/LM.md` and `docs/audits/P.md`.
- `docs/audits/LM-RB1-20260905.md` — last in `6e582b119`, 2026-09-05. Shared LM and RB1 clause
  review supplying exact test titles. Also recorded in `docs/audits/LM.md`.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for RB1: PR #4594; commit `87099c55a`.
