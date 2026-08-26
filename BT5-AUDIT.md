# BT5 Card Implementation Audit

This ledger records the evidence gathered for the BT5 cards audited in this
worktree. A card is marked 10/10 only when every catalog clause maps to
compiled IR and the relevant shared primitives have reproducible behavioral
proof.

## BT5-001 — Koromon — 10/10

- Catalog evidence: Red DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no
  digivolution costs, [Lesser] trait, rarity U, and max 4 copies. It has no
  main or Security text. Its sole inherited clause is
  "[When Attacking][Once Per Turn] If this Digimon has [Omnimon] or [Greymon]
  (other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon]) in its
  name, trigger ＜Draw 1＞."
- Knowledge base: `node tools/kb/query.mjs card BT5-001 --json` returns the
  card identity with no QA, errata, or ruling entries, so the catalog text is
  the governing contract. The applicable local rules are glossary `When
Attacking` (the timing occurs when an attack is declared with the Digimon),
  glossary `Once Per Turn` (one use per copy per turn), comprehensive §15-3-1
  (an inherited effect is gained from a digivolution card), and comprehensive
  §15-14-1 (per-turn use counting and reset rules). The local manual's card
  text rules also define "with [X] in its name" as a substring match, covering
  names such as MetalGreymon and WarGreymon.
- Implementation: `apps/api/src/cards/BT5/BT5-001.ts` contains one inherited
  `WhenAttacking` effect with `frequency: "OncePerTurn"`. Its only action is
  `{ kind: "Draw", controller: "mine", amount: 1 }`, gated by
  `selfHasNameContaining` with OR names `Omnimon` and `Greymon` and exclusions
  `DoruGreymon`, `BurningGreymon`, and `DexDoruGreymon`. It is registered only
  through `registerIrCard("BT5-001", compiled)`, with `coverage: "full"` and
  `residual: []`.
- Primitive trace: `conditions.ts` resolves `selfHasNameContaining` against
  the current top card of the source permanent, compares case-insensitively,
  matches any requested name, and rejects any excluded name. Thus the gate
  follows the live top card of an evolution stack and does not inspect a
  buried source as the host identity. Registration's
  `withSubTriggerFrequency` carries `OncePerTurn` to the attack watcher;
  `subTrigger.ts` scopes the resulting budget by source instance, so separate
  copies are independent while repeat attacks by one copy are capped.
  `WhenAttacking` is the ordinary attack-declaration window, and Draw consumes
  one card from the controller's deck into that controller's hand.
- Behavioral proof: 9 focused cases. The existing positive case proves a
  qualifying Greymon host with Koromon in its stack draws on attack. The
  boundary matrix proves positive Omnimon (`BT5-086`) and Greymon (`BT5-010`),
  rejects all three named exclusions (`BT7-064`, `BT4-013`, `BT9-078`), and
  rejects an unrelated Digimon (`BT1-009`). The existing excluded-name case
  independently covers a realistic DoruGreymon evolution stack. The final
  case unsuspends the same host and attacks a second time in the same turn;
  exactly one card is drawn, proving the once-per-turn budget on the inherited
  effect.
- Defect corrected: none. The source implementation was already faithful; the
  audit added only missing boundary and once-per-turn assertions to
  `BT5-001.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT5/BT5-001.test.ts` — 1 file, 9 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` was attempted and is blocked by pre-existing unrelated
  errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-001 errors. `git diff --check` and
  changed-file `oxfmt --check` both pass.
