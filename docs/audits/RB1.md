---
set: RB1
cards: 33
status: verified
verified_at: 2026-09-12
catalog_commit: de4dda717d8c9e0c2420796cb387f68b1379b863
evidence_commit: 2ccf8e6a24c9ab02daf923e15c1c101beafde3f2
---

# RB1 audit

## Status

Full collection re-audit on branch `rb1-full-reaudit`, based on
`de4dda717d8c9e0c2420796cb387f68b1379b863`. Historical scores were reopened and all 33 cards were independently
recalculated at **10/10** after corrections, reproducible proof and closing gates. Three Luna lanes
reviewed the 33 catalog cards against the committed catalog and local KB.
Builds and test suites use bounded heaps; tests use one worker.
All 33 production modules exclusively register compiled IR with `registerIrCard`.
No RB1 module contains `ts-nocheck`; it had already been removed before this branch.
IDs 004, 006 and 007 are absent from the catalog and are not missing audit rows.

The rubric is catalog/rules, executable IR, behavioral proof, peer/stack proof,
and delivery gates, each scored 0–2. Shared mechanism evidence supplements
card-specific public intents and actual primitive events; injected timings are
not accepted as behavioral proof. Test titles below identify reproducible
assertions, including pre-existing proof retained where sufficient.

## Verification

- Collection, conformance, combat, effects, card mechanisms, audit layout and persisted catalog parity: **176 files / 2,574 tests passed** with the command below.
- Client evolution projection: `src/game/boardModel.test.ts`, **1 file / 106 tests passed**.
- Changed TypeScript: Oxlint and Oxfmt checks passed for 61 files; `git diff --check` passed.
- Workspace typecheck passed with a 4 GB heap.
- Effect synchronization/parity passed: all 33 records synchronized; 21 semantic corrections against the base, zero semantic or byte changes outside RB1.
- Generated audit index and canonical layout passed.
- Code evidence is committed at `2ccf8e6a24c9ab02daf923e15c1c101beafde3f2`; the branch is pushed and [draft PR #4736](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4736) supplies review delivery.

```sh
TEST_MAX_WORKERS=1 TEST_HEAP_MB=2048 pnpm --filter @aegis/api exec vitest run src/cards/RB1 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards src/cards/audit-docs.test.ts src/cards/promo-lm-rb.catalog-parity.test.ts --maxWorkers=1 --no-file-parallelism
TEST_MAX_WORKERS=1 TEST_HEAP_MB=2048 pnpm --filter @aegis/web exec vitest run src/game/boardModel.test.ts --maxWorkers=1 --no-file-parallelism
NODE_OPTIONS=--max-old-space-size=4096 pnpm typecheck
pnpm effects:check:set -- --set RB1 --base de4dda717
pnpm audit:index -- --check
```

## Corrections and mechanism evidence

- Gurimon: restrict inherited placement events to this host and the owner's
  effects. Hiro comparisons separate Hiro's mandatory draw from Gurimon's draw.
- Canoweissmon, Fumamon, Ghilliedhumon and Regulusmon: copy Gammamon main
  effects without copying inherited effects a second time (`excludeInherited`).
  Comparative DP assertions distinguish 10,000/9,000 from the erroneous
  12,000/11,000 produced by double-counting RB1-005.
- Siriusmon: preserve its once-per-turn use after declining optional unsuspend
  (`preserveOncePerTurnOnDecline`, Q4086). Refusal then acceptance at another
  deletion timing is asserted in the same turn.
- Jellymon and TeslaJellymon: inherited hand-trash memory watchers require
  owner-effect provenance. Opponent-effect trash is a negative case; paired
  inherited sources prove separate uses and real turn reset.
- Diarbbitmon: drain remaining simultaneous end-turn effects during the attack
  through existing `drainTimingWindowDuringAttack`. Two-copy combat proves
  only the first end-turn attack occurs (Q4100); Ruli-first unsuspend is retained.
- Birdramon and Garudamon: unqualified Tamer presence includes the opponent's
  Tamers; mine/opponent zone counts are joined with `anyOf`.
- Hiro: mandatory Draw follows successfully paid placement/GainMemory.
  `abortOnDecline` stops the sequence on absent or declined payment; the removed
  `ifThisEffectActed` receipt was not produced by GainMemory.
- Revealed security restoration: preserve the exact checked instance, apply the
  chosen top/bottom position and flip only that card face down. The reusable
  `flipSecurityFaceDown` primitive emits the exact same-zone movement and
  preserves unrelated face-up security, without add/remove-security triggers.
  See `interpreter.test.ts` and `primitives.test.ts` exact-instance assertions.
- ShinMonzaemon: simultaneous field-to-top-security placement asks the activating
  player for order and compensates for `addSecurity`'s per-card unshift order
  (Q4095). Public evolution and interpreter ordering assertions cover this seam.

- Arcturusmon: the explicit bottom-source assertion reproduced a wrong source
  position before the fix (1 failing / 3 passing focused assertions). Printed
  placement requires `position: "bottom"`; unqualified deletion targets also
  include the owner’s Digimon (Q4107), not just the opponent’s. Exact ordered
  instance IDs, the level-4 cap and a level-5 exclusion are the acceptance proof.
- Existing evolution proofs were strengthened with paid-memory and exact source
  retention assertions. Normal and special variants are selected explicitly where
  both apply; no lower-cost result is inferred from a matching normal evolution.
- The retained GulusGammamon security fixture was corrected to legal Digimon
  cards; Digi-Eggs occur only underneath inherited hosts in RB1 proof fixtures.

- Exact named-card references: BetelGammamon, KausGammamon, WezenGammamon and
  GulusGammamon alternate evolution requires exact Gammamon, not another name
  containing the token. GulusGammamon revival also requires exact Gammamon.
  Invalid BetelGammamon bases and unrevivable KausGammamon are public negatives.
  Hiro, Kiyoshiro, Ruli, Siriusmon and Proximamon named searches/play/cost gates
  likewise use the existing exact-name matcher; text/trait filters remain broad.
- Canoweissmon ordinary evolution: retain the separate level-4 Gammamon-name
  requirement alongside the special route. A black WezenGammamon reproduced
  `invalid-evolution` before correction, then paid exactly 3 and retained its
  exact source instance while granting Blocker.
- Canoweissmon Q4080: exact Gammamon is the base, while an under-card may have
  Gammamon anywhere in its name. The shared alternate requirement opts into
  `minNameStackMatch: "contains"`; named-card stack gates default to exact.
  Server actions, paid/free evolution primitives and client projections agree.
  The BetelGammamon-source public fixture reproduced invalid evolution before
  the fix. Primitive tests prove both paid/free acceptance and nonmatching
  source rejection while preserving payment, hand and source state.

## Card ledger

### RB1-001 — Gurimon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level 2; DP 0; play cost -1; evolution `[]`.
- Contract: Inherited: [Your Turn][Once Per Turn] When one of your effects places a digivolution card under this Digimon, ＜Draw 1＞.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-001`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-001.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-001.test.ts): “draws when an effect places a digivolution card under its host”; “does not add Gurimon's draw when the host has no Gurimon”; “limits Gurimon to one draw per turn across two Hiro placements and resets next turn”.

### RB1-002 — Puyoyomon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 2; DP 0; play cost -1; evolution `[]`.
- Contract: Inherited: [When Attacking][Once Per Turn] By trashing 1 blue card in your hand, trash the bottom digivolution card of 1 of your opponent's Digimon.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-002`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-002.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-002.test.ts): “trashes the bottom card under an opponent Digimon by paying a blue hand card”; “does not activate when the player declines the optional payment”.

### RB1-003 — Bosamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 2; DP 0; play cost -1; evolution `[]`.
- Contract: Inherited: [Your Turn] While your opponent has no unsuspended Digimon, this Digimon gets +1000 DP.
- KB: Q6047. Fresh query: `node tools/kb/query.mjs card RB1-003`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-003.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-003.test.ts): “gives its host +1000 DP while the opponent has no unsuspended Digimon”; “does not give the inherited bonus while an opponent Digimon is unsuspended”.

### RB1-005 — Gammamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level 3; DP 1000; play cost 3; evolution `[{"color":"Red","level":2,"memoryCost":0}]`.
- Contract: Main: [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Gammamon] in its text and 1 [Hiro Amanokawa] among them to the hand. Place the rest at the bottom of the deck in any order. · Inherited: [Your Turn] While this Digimon has [Gammamon] in its text, it gets +2000 DP.
- KB: Q4076, Q4077. Fresh query: `node tools/kb/query.mjs card RB1-005`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-005.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-005.test.ts): “adds Hiro from the revealed cards”; “fills both search slots and returns the exact remainder to the deck bottom”; “grants inherited DP only when the top card has Gammamon in its text”.

### RB1-008 — BetelGammamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level 4; DP 6000; play cost 6; evolution `[{"color":"Red","level":3,"memoryCost":2}]`.
- Contract: Main: Digivolve: 2 from [Gammamon]＜Raid＞ (When this Digimon attacks, you may switch the target of attack to 1 of your opponent's unsuspended Digimon with the highest DP.)[When Digivolving] If you don't have [Hiro Amanokawa], you may play 1 [Hiro Amanokawa] from your hand without paying the cost.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-008`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-008.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-008.test.ts): “plays Hiro Amanokawa from hand when none is in play”; “does not play a second Hiro when one is already in play”; “rejects BetelGammamon as a base for the exact Gammamon alternate requirement”.

### RB1-009 — Canoweissmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level 5; DP 8000; play cost 8; evolution `[{"color":"Red","level":4,"memoryCost":3}]`.
- Contract: Main: Digivolve: 3 from Lv.4 w/[Gammamon] in nameOne of your [Gammamon] that has a digivolution card with [Gammamon] in its name may digivolve into this card in your hand for a digivolution cost of 3, ignoring digivolution requirements.[All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards. · Inherited: [All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards.
- KB: Q4080, Q4081, Q4082, Q4083, Q4084. Fresh query: `node tools/kb/query.mjs card RB1-009`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-009.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-009.test.ts): “digivolves from hand onto a Gammamon carrying a Gammamon-named card”; “uses the special cost-3 path from Lv.3 Gammamon when its stack has Gammamon in its name”; “can use the printed Lv.4 Gammamon-name evolution without the special stack condition”; “copies effects from a Gammamon-named source but not inherited effects”.

### RB1-010 — Siriusmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level 6; DP 11000; play cost 11; evolution `[{"color":"Red","level":5,"memoryCost":3}]`.
- Contract: Main: Digivolve: 3 from Lv.5 w/[Gammamon] in text[When Digivolving] By placing 1 Digimon card with [Gammamon] in its text from your hand as this Digimon's bottom digivolution card, delete 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP.[Your Turn][Once Per Turn] When an opponent’s Digimon is deleted, you may unsuspend this Digimon.
- KB: Q4085, Q4086. Fresh query: `node tools/kb/query.mjs card RB1-010`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-010.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-010.test.ts): “places a Gammamon-text card as cost before deleting a qualifying opponent”; “does not pay the placement cost or delete when the player declines”; “unsuspends once when an opponent Digimon is deleted during your turn”; “does not consume the once-per-turn watcher when its optional unsuspend is declined”; “resets the once-per-turn unsuspend after a real opponent turn”.

### RB1-011 — Jellymon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 3; DP 1000; play cost 3; evolution `[{"color":"Blue","level":2,"memoryCost":0}]`.
- Contract: Main: [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Jellymon] in its text and 1 [Kiyoshiro Higashimitarai] among them to the hand. Place the rest at the bottom of the deck in any order. · Inherited: [Your Turn][Once Per Turn] When one of your effects trashes a card in your hand, gain 1 memory.
- KB: Q4087. Fresh query: `node tools/kb/query.mjs card RB1-011`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-011.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-011.test.ts): “adds Kiyoshiro when it is the matching Jellymon-text reveal”; “returns all unmatched reveals to the bottom without adding cards”; “gains memory once when a Jellymon is trashed from hand by a real effect”; “combines two inherited hand-trash watchers once per turn on real Amphimon attacks”.

### RB1-012 — KausGammamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 4; DP 6000; play cost 5; evolution `[{"color":"Blue","level":3,"memoryCost":2}]`.
- Contract: Main: Digivolve: 2 from [Gammamon]＜Evade＞ (When this Digimon would be deleted, you may suspend it to prevent that deletion.)
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-012`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-012.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-012.test.ts): “has Evade while in the battle area”; “does not grant Evade to a different Digimon”; “rejects the alternate Gammamon evolution from a BetelGammamon-named base”.

### RB1-013 — TeslaJellymon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 4; DP 5000; play cost 5; evolution `[{"color":"Blue","level":3,"memoryCost":2}]`.
- Contract: Main: [When Digivolving] If you don't have [Kiyoshiro Higashimitarai], you may play 1 [Kiyoshiro Higashimitarai] from your hand without paying the cost. · Inherited: [Your Turn][Once Per Turn] When one of your effects trashes a card in your hand, gain 1 memory.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-013`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-013.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-013.test.ts): “does not gain memory when an opponent effect trashes your hand card”; “plays Kiyoshiro on a legal digivolution when none is present”; “does not play another Kiyoshiro when one is already present”.

### RB1-014 — Thetismon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 5; DP 7000; play cost 7; evolution `[{"color":"Blue","level":4,"memoryCost":3}]`.
- Contract: Main: [When Digivolving] You may trash up to 2 blue cards in your hand. For each one, you may trash any 1 card under your opponent's Digimon or Tamers. Then, until the end of your opponent's turn, 1 of their Digimon or Tamers without cards under it can't suspend. · Inherited: [End of Attack][Once Per Turn] By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck in any order, unsuspend this Digimon.
- KB: Q4088, Q4089. Fresh query: `node tools/kb/query.mjs card RB1-014`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-014.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-014.test.ts): “pays blue cards and trashes cards under an opponent stack”; “leaves cards untouched when no blue payment cards are available”; “returns three Jellymon-text cards from trash and unsuspends after its attack”; “does not unsuspend after its attack when fewer than three Jellymon-text cards are in trash”; “uses the inherited once-per-turn return cost once, then resets on the next turn”.

### RB1-015 — Fumamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 5; DP 7000; play cost 7; evolution `[{"color":"Blue","level":4,"memoryCost":3}]`.
- Contract: Main: Digivolve: 3 from Lv.4 w/[Gammamon] in name[When Digivolving] Trash the top 3 digivolution cards of 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP. Then, 1 of your opponent's Digimon with no digivolution cards can't attack until the end of their turn.[All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards. · Inherited: [All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards.
- KB: Q4090, Q4091, Q4092. Fresh query: `node tools/kb/query.mjs card RB1-015`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-015.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-015.test.ts): “trashes up to three cards under a low-DP opponent and restricts attack”; “does not affect an opponent Digimon above Fumamon's DP”; “does not copy inherited effects from a Gammamon source card”.

### RB1-016 — Amphimon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level 6; DP 12000; play cost 12; evolution `[{"color":"Blue","level":5,"memoryCost":4}]`.
- Contract: Main: [When Digivolving][When Attacking] You may trash up to 2 blue cards in your hand. For each one, trash any 1 card under your opponent’s Digimon or Tamers. Then, you may return 1 of your opponent’s Digimon with no digivolution cards to the bottom of the deck.[All Turns][Once Per Turn] When one of your blue Digimon would be deleted, by returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck in any order, prevent its deletion.
- KB: Q4093, Q4094. Fresh query: `node tools/kb/query.mjs card RB1-016`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-016.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-016.test.ts): “prevents one blue Digimon deletion by returning three Jellymon-text cards”; “does not prevent deletion when fewer than three Jellymon-text cards are available”; “trashes up to two paid blue cards into separate opponent stacks when digivolving”; “uses the once-per-turn deletion replacement only once”; “resets the same Amphimon replacement on its next owner turn”.

### RB1-017 — Numemon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Yellow, Black; level 4; DP 1000; play cost 3; evolution `[{"color":"Yellow","level":3,"memoryCost":2},{"color":"Black","level":3,"memoryCost":2}]`.
- Contract: Main: [On Deletion] Reveal the top 3 cards of your deck. Add 1 card with [Monzaemon] in its name and 1 card with [Numemon] in its name among them to the hand. Place the rest at the bottom of the deck in any order. · Inherited: [Opponent's Turn] While this Digimon has [Monzaemon] or [Numemon] in its name, it gains ＜Blocker＞.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-017`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-017.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-017.test.ts): “reveals and adds Monzaemon or Numemon cards when deleted”; “grants Blocker to an inherited Numemon or Monzaemon-named host on the opponent's turn”; “puts all three revealed cards back when none match”.

### RB1-018 — Monzaemon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Yellow; level 5; DP 7000; play cost 7; evolution `[{"color":"Yellow","level":4,"memoryCost":4}]`.
- Contract: Main: Digivolve: 3 from Lv.4 w/[Numemon] in name[On Play] By placing 1 Digimon card with [Numemon] in its name from your trash as this Digimon's bottom digivolution card, gain 2 memory.[On Play][When Digivolving] on] 1 of your opponent’s Digimon gets -3000 DP and gains ＜Security Attack -1＞ until the end of their turn. · Inherited: [Your Turn] While this Digimon has [Monzaemon] or [Numemon] in its name, it gains ＜Security Attack +1＞.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-018`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-018.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-018.test.ts): “places Numemon from trash, gains memory, and debuffs one opponent Digimon”; “does not pay the memory reward when no Numemon card is available to place”; “triggers the debuff on real digivolution and retains the Numemon source”; “grants inherited Security Attack +1 only on your turn”; “expires the play debuff after the opponent's turn ends”.

### RB1-019 — ShinMonzaemon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Yellow; level 6; DP 13000; play cost 13; evolution `[{"color":"Yellow","level":5,"memoryCost":5}]`.
- Contract: Main: Digivolve: 4 from Lv.5 w/[Monzaemon] or [Numemon] in name[When Digivolving] Place all level 3 Digimon face down on top of their owners' security stacks in any order. Then, all of your opponent’s level 4 or higher Digimon get -3000 DP and gain ＜Security Attack -1＞ until the end of their turn. [When Attacking] By trashing 1 card with [Numemon] in its name in this Digimon's digivolution cards, place 1 of your opponent’s Digimon face down at the bottom of their security stack.
- KB: Q4095. Fresh query: `node tools/kb/query.mjs card RB1-019`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-019.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-019.test.ts): “moves every level 3 to its owner's security and weakens only opposing level 4 or higher Digimon”; “places the attacked opponent Digimon face down at security bottom after trashing Numemon”; “lets the activating player choose the order of multiple opponent level 3 cards”.

### RB1-020 — Angoramon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 3; DP 1000; play cost 3; evolution `[{"color":"Green","level":2,"memoryCost":0}]`.
- Contract: Main: [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Angoramon] in its text and 1 [Ruli Tsukiyono] among them to the hand. Place the rest at the bottom of the deck in any order. · Inherited: [All Turns] While your opponent has no unsuspended Digimon, this Digimon gets +1000 DP.
- KB: Q4096, Q6048. Fresh query: `node tools/kb/query.mjs card RB1-020`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-020.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-020.test.ts): “reveals three cards and adds the Angoramon-text card plus Ruli”; “adds no cards when the revealed cards have no matching text or Ruli name”; “gains inherited DP only while the opponent has no unsuspended Digimon”; “treats an empty opponent battle area as having no unsuspended Digimon”.

### RB1-021 — WezenGammamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 4; DP 6000; play cost 5; evolution `[{"color":"Green","level":3,"memoryCost":2}]`.
- Contract: Main: Digivolve: 2 from [Gammamon]＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-021`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-021.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-021.test.ts): “has Blocker while in the battle area”; “does not grant Blocker to a different Digimon”; “uses the alternate Gammamon evolution requirement for 2 memory”; “rejects BetelGammamon as a base for the exact Gammamon alternate requirement”.

### RB1-022 — SymbareAngoramon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 4; DP 5000; play cost 5; evolution `[{"color":"Green","level":3,"memoryCost":2}]`.
- Contract: Main: [When Digivolving] If you don't have [Ruli Tsukiyono], you may play 1 [Ruli Tsukiyono] from your hand without paying the cost. · Inherited: [All Turns] While your opponent has no unsuspended Digimon, this Digimon gets +1000 DP.
- KB: Q6049. Fresh query: `node tools/kb/query.mjs card RB1-022`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-022.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-022.test.ts): “may play Ruli Tsukiyono from hand when none is already in play”; “does not play a second Ruli when one is already in play”; “gets +1000 DP while the opponent has no unsuspended Digimon”.

### RB1-023 — Ghilliedhumon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 5; DP 7000; play cost 7; evolution `[{"color":"Green","level":4,"memoryCost":3}]`.
- Contract: Main: Digivolve: 3 from Lv.4 w/[Gammamon] in name[When Digivolving] Suspend 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP. Digimon suspended by this effect don’t unsuspend until the end of your opponent’s turn.[All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards. · Inherited: [All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards.
- KB: Q4097, Q4098, Q4099. Fresh query: `node tools/kb/query.mjs card RB1-023`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-023.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-023.test.ts): “suspends one opponent Digimon at or below its DP and prevents unsuspension”; “does not suspend an opponent Digimon above its DP limit”.

### RB1-024 — Lamortmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 5; DP 8000; play cost 8; evolution `[{"color":"Green","level":4,"memoryCost":3}]`.
- Contract: Main: [When Digivolving] This Digimon gains ＜Piercing＞ for the turn. Then, if a Digimon card with [Angoramon] in its name is in this Digimon's digivolution cards, suspend 1 of your opponent’s Digimon. · Inherited: [Your Turn][Once Per Turn] When this Digimon deletes an opponent's Digimon in battle, trash the top card of your opponent's security stack.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-024`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-024.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-024.test.ts): “suspends an opponent Digimon when an Angoramon card is in its evolution stack”; “does not suspend when the evolution stack lacks Angoramon”; “trashes the opponent security top when this inherited Digimon deletes in battle”; “uses the inherited security trash once per turn and resets on the next owner turn”.

### RB1-025 — Diarbbitmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level 6; DP 12000; play cost 12; evolution `[{"color":"Green","level":5,"memoryCost":4}]`.
- Contract: Main: ＜Blocker＞[When Digivolving][When Attacking] Suspend 1 of your opponent’s Digimon. Then, if your opponent has no unsuspended Digimon, gain 1 memory.[End of Your Turn] 1 of your Digimon with [Angoramon] in its text may attack an opponent's Digimon.
- KB: Q4100, Q4101, Q4108. Fresh query: `node tools/kb/query.mjs card RB1-025`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-025.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-025.test.ts): “suspends one opponent Digimon and gains memory only after none remain unsuspended”; “may force an Angoramon Digimon to attack an opponent Digimon at end of turn”; “does not open the attack effect when every Angoramon-text Digimon is suspended”; “allows Ruli to unsuspend a suspended Diarbbitmon before its end-turn attack”; “resolves only one end-turn attack when two Diarbbitmon effects trigger together”.

### RB1-026 — Espimon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Black; level 3; DP 2000; play cost 3; evolution `[{"color":"Black","level":2,"memoryCost":0}]`.
- Contract: Inherited: [Opponent's Turn] While there's a Tamer, this Digimon gets +2000 DP.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-026`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-026.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-026.test.ts): “gets +2000 DP during the opponent's turn while a Tamer is in play”; “does not gain the bonus when no Tamer is in play”; “gets the bonus when only the opponent controls a Tamer”.

### RB1-027 — HoverEspimon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Black; level 4; DP 5000; play cost 5; evolution `[{"color":"Black","level":3,"memoryCost":2}]`.
- Contract: Main: [On Play][When Digivolving] Reveal the top card of your opponent's security stack. If that card is a Digimon card, gain 1 memory. If it's a non-Digimon card, ＜Draw 1＞. Place the revealed card at the top or bottom of your opponent’s security stack face down.[All Turns] While there's a Tamer, this Digimon gains ＜Blocker＞ and can't be deleted by your opponent's effects.
- KB: Q4102. Fresh query: `node tools/kb/query.mjs card RB1-027`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-027.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-027.test.ts): “gains memory when the revealed security card is a Digimon”; “draws when the revealed security card is not a Digimon”; “lets the activating player place the revealed card at the bottom and grants Blocker while a Tamer exists”; “loses Blocker when the Tamer condition is absent”; “gains Blocker when only the opponent controls a Tamer”; “cannot be deleted by an opponent effect while a Tamer is present”; “cannot be deleted by an opponent's real Gaia Force option while a Tamer is present”.

### RB1-028 — BlackGatomon Uver.

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Purple; level 4; DP 4000; play cost 5; evolution `[{"color":"Purple","level":3,"memoryCost":2}]`.
- Contract: Main: [Security] At the end of the battle, play this card without paying the cost.[On Play] By returning 1 Digimon card from your opponent’s trash to the bottom of the deck, ＜Draw 1＞.
- KB: Q4103. Fresh query: `node tools/kb/query.mjs card RB1-028`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-028.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-028.test.ts): “plays the exact security instance at battle end and draws after returning an opponent Digimon”; “allows declining the optional return-and-draw cost”; “lets the activating player choose which opponent Digimon card to return”.

### RB1-029 — GulusGammamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Purple; level 4; DP 6000; play cost 6; evolution `[{"color":"Purple","level":3,"memoryCost":3}]`.
- Contract: Main: Digivolve: 2 from [Gammamon][End of Attack] By deleting this Digimon, delete 1 of your opponent’s Digimon with DP less than or equal to the deleted Digimon’s DP.[On Deletion] Play 1 [Gammamon] from your trash suspended without paying the cost.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-029`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-029.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-029.test.ts): “deletes itself, accepts the equal-DP boundary, rejects a higher-DP target, and revives Gammamon”; “does not revive a different Gammamon-name Digimon such as KausGammamon”; “rejects BetelGammamon as a base for the exact Gammamon alternate requirement”.

### RB1-030 — Regulusmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Purple; level 5; DP 9000; play cost 9; evolution `[{"color":"Purple","level":4,"memoryCost":4}]`.
- Contract: Main: Digivolve: 3 from Lv.4 w/[Gammamon] in name[When Digivolving][When Attacking][Once Per Turn] By trashing 1 card with [Gammamon] in its text in your hand, 1 of your Digimon gains ”[On Deletion] Delete 1 of your opponent’s Digimon with the lowest level” until the end of your opponent’s turn.[All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards. · Inherited: [All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards.
- KB: Q4104, Q4105, Q4106. Fresh query: `node tools/kb/query.mjs card RB1-030`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-030.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-030.test.ts): “uses the Lv.4 Gammamon evolution requirement and copies an All Turns effect from a Gammamon-name stack card”; “copies Gammamon-name effects through RB1-030's inherited text on a higher host”; “does not copy an effect from a non-Gammamon-name source card”; “POSITIVE: granted Digimon's deletion deletes the opponent's LOWEST-level Digimon”; “NEGATIVE (cost): no Gammamon-text card in hand => no grant => deletion deletes nothing”; “EXPIRY: the grant lapses at the end of the opponent's turn (UntilOpponentTurnEnd)”; “pays the When Attacking grant cost once per turn and resets next owner turn”.

### RB1-031 — Arcturusmon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Purple; level 6; DP 13000; play cost 13; evolution `[{"color":"Purple","level":5,"memoryCost":5}]`.
- Contract: Main: Digivolve: 4 from Lv.5 w/[Gammamon] in text[When Digivolving] You may place 1 Digimon card with [Gammamon] in its text from your trash as this Digimon's bottom digivolution card. Then, you may delete 1 Digimon with a level less than or equal to the number of this Digimon's digivolution cards.[On Deletion] You may return 1 Digimon card from your trash to the hand. Then, by trashing 1 [Siriusmon] in your hand, you may play 1 [Proximamon] from your hand without paying the cost. · Inherited: [Your Turn][Once Per Turn] When an opponent's Digimon is deleted, if this Digimon has [Gammamon] in its text, trash the top card of your opponent’s security stack.
- KB: Q4107. Fresh query: `node tools/kb/query.mjs card RB1-031`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-031.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-031.test.ts): “places an exact Gammamon from trash and deletes only within its stack-count level cap”; “chooses among own and opponent Digimon within the stack-count level cap”; “returns a trash Digimon, then trashes Siriusmon to play Proximamon on deletion”; “trashes the opponent's security on an opponent deletion during your turn through its inherited effect”; “limits inherited security trash to once per turn and resets after the opponent turn”.

### RB1-032 — Hiro Amanokawa

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red; level none; DP 0; play cost 3; evolution `[]`.
- Contract: Main: [Start of Your Main Phase] By placing 1 Digimon card with [Gammamon] in its name from your hand as 1 of your Digimon's bottom digivolution card, gain 1 memory and ＜Draw 1＞.[Your Turn] When one of your Digimon digivolves into a Digimon with [Gammamon] in its text, by suspending this Tamer, that Digimon gets +2000 DP for the turn. · Security: [Security] Play this card without paying the cost.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-032`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-032.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-032.test.ts): “places the exact Gammamon from hand under a Digimon, gains memory, and draws”; “suspends and buffs the Digimon that actually digivolved into a Gammamon-text card”; “does not gain memory or draw when no Gammamon-name card can be placed”; “does not gain memory or draw when the player declines a payable placement”; “plays itself from Security through an actual opponent attack”.

### RB1-033 — Kiyoshiro Higashimitarai

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Blue; level none; DP 0; play cost 3; evolution `[]`.
- Contract: Main: [All Turns] When one of your Digimon with [Jellymon] in its text or an opponent's level 5 or higher Digimon attacks, if you have 7 or fewer cards in your hand, by suspending this Tamer, ＜Draw 1＞.[Your Turn] When this Tamer becomes unsuspended, gain 1 memory. · Security: [Security] Play this card without paying the cost.
- KB: no entries returned. Fresh query: `node tools/kb/query.mjs card RB1-033`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-033.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-033.test.ts): “suspends RB1-033 and draws 1 when own Jellymon-text Digimon attacks and hand ≤ 7”; “does NOT suspend when hand size > 7”; “suspends RB1-033 and draws 1 when an opponent Lv.5 Digimon attacks and hand ≤ 7”; “fires at the exact 7-card boundary and only once while the Tamer is suspended”; “allows declining the optional draw at the exact 7-card boundary”; “does not trigger for an opposing level 4 Digimon even with 7 cards in hand”; “gains 1 memory when this Tamer becomes unsuspended”; “does not gain memory when the Tamer becomes unsuspended during the opponent's turn”; “plays itself from Security without paying its play cost”.

### RB1-034 — Ruli Tsukiyono

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Green; level none; DP 0; play cost 3; evolution `[]`.
- Contract: Main: [Your Turn] When one of your Digimon digivolves into a green card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in one of its traits, by suspending this Tamer, reduce the digivolution cost by 1.[End of Your Turn][Once Per Turn] You may unsuspend 1 of your Digimon with [Angoramon] in its text. · Security: [Security] Play this card without paying the cost.
- KB: Q4101, Q4108. Fresh query: `node tools/kb/query.mjs card RB1-034`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-034.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-034.test.ts): “suspends to reduce a qualifying green Beast digivolution cost by exactly 1”; “excludes Sea Animal from the Beast, Animal, or Sovereign reduction filter”; “unsuspends one suspended Digimon with Angoramon in its name at end of turn”.

### RB1-035 — Hokuto Amanokawa

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors White; level none; DP 0; play cost 2; evolution `[]`.
- Contract: Main: [Start of Your Turn] If your opponent has 3 or more Tamers, gain 1 memory.[All Turns] When an opponent plays a Digimon, by suspending this Tamer, gain 1 memory if that Digimon is level 4 or higher, and ＜Draw 1＞ if it is level 3. · Security: [Security] Play this card without paying the cost.
- KB: Q4109, Q4110, Q4111. Fresh query: `node tools/kb/query.mjs card RB1-035`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-035.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-035.test.ts): “plays itself from Security without paying its cost”; “gains 1 memory at the start of its turn when the opponent has 3 Tamers”; “does not gain memory when the opponent has fewer than 3 Tamers”; “suspends to draw once when the opponent plays one or more level 3 Digimon”; “applies both rewards once when level 3 and level 4 Digimon are played simultaneously”; “may suspend for a level-less Digimon but receives neither reward”.

### RB1-036 — Proximamon

- Score: **10/10** (catalog/rules 2/2 · IR 2/2 · behavior 2/2 · peer/stack 2/2 · delivery 2/2).
- Catalog: colors Red, Purple; level 7; DP 15000; play cost 15; evolution `[{"color":"Red","level":6,"memoryCost":6},{"color":"Purple","level":6,"memoryCost":6}]`.
- Contract: Main: Digivolve: 3 from [Siriusmon] w/[Arcturusmon] digivolution card[All Turns][Once Per Turn] When another Digimon is deleted, you may play 1 level 4 or lower Digimon card with [Gammamon] in its name from your trash without paying the cost.[End of Your Turn][Once Per Turn] By placing 1 Digimon card with [Gammamon] in its text from your hand or trash as this Digimon's bottom digivolution card, delete 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP.
- KB: Q4112. Fresh query: `node tools/kb/query.mjs card RB1-036`.
- Executable trace: [compiled module](../../apps/api/src/cards/RB1/RB1-036.ts); each printed timing/filter/cost/duration is represented by its compiled actions and resolved by `engine/effects/interpreter` and production primitives.
- Reproducible card and stack assertions: [suite](../../apps/api/src/cards/RB1/RB1-036.test.ts): “rejects the alternate cost when Siriusmon lacks an Arcturusmon digivolution card”; “uses the exact alternate cost 3 when Siriusmon has an Arcturusmon source”; “places the exact Gammamon-text card and deletes an opposing Digimon within its DP”; “may revive a level 4 or lower Gammamon from trash when another Digimon is deleted”; “accepts a Gammamon-text card from trash and declines the once-per-turn end-turn effect”; “uses the post-placement DP and accepts equality while rejecting a higher target”; “revives at most one Gammamon per turn, then permits another revival on the next turn”.

## Open items

None. All 33 cards have accepted 10/10 evidence; no handwritten registration
or unresolved card limitation remains in RB1.

## History

The previous audit reported 33 cards at 10/10 and 82 passing tests. That
historical score is superseded by this independent re-audit, which discovered
card IR omissions and missing refusal, provenance, ordering and reset proof.
The canonical evidence is this document; no removed per-card or batch report
is required to reproduce the current audit.

- `docs/audits/RB1-AUDIT.md` — last in `a8136a499`, 2026-09-05; previous recalculated ledger.
- `docs/audits/PROMO-LM-RB-AUDIT-20260905.md` — last in `a8136a499`, 2026-09-05; previous coordinator evidence, also recorded in LM and P ledgers.
- `docs/audits/LM-RB1-20260905.md` — last in `6e582b119`, 2026-09-05; previous shared clause review.
- `docs/audits/collections-summary.md` — never committed; untracked index generated 2026-08-22 and replaced by the generated README. Historical delivery: PR #4594, commit `87099c55a`.
