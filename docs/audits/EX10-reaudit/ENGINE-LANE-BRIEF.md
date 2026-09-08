# EX10 engine lane brief (serialized, one lane at a time)

Worktree: /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex10-reaudit. English only.
Read docs/audits/EX10-reaudit/REVIEW-NOTES.md "Engine seam queue" first; the numbered seams
below reference it. No card lanes are running while you work, but do not edit card modules
or tests except to flip a retained `it.fails` to a passing test once its seam lands.

## Allowed edits

apps/api/src/engine/** (including testkit), packages/shared/src/effects/ir/** only when a
seam needs a new IR field, and the specific EX10 test files named per seam (flip reds only).
Never: catalog, ledger, RUN.md, REVIEW-NOTES.md, other cards. No git writes of any kind.

## Seams in priority order

1. Seam 16 `save-placeunder-position-default`: default the ＜Save＞ keyword's `PlaceUnder` to
   `position: "bottom"` in the compiler/interpreter so positionless Save cards land at the
   stack bottom. Affected out-of-set: BT10-020/021/075, BT11-015/077, BT12-008/086,
   BT14-057/059, EX4-016/018. In-set EX10-015 still lacks the field; the default must cover it.
2. Seam 19 `any-digimon-digivolution-trash-cost-ignores-upTo` (`interpreter/costs.ts payCost`):
   honour `upTo`/`minimum` on the "trash N from any of your Digimon's digivolution cards"
   branch. Flip EX10-033's `it.fails`.
3. Seam 23 `reduce-cost-deletion-triggers-not-batched` (`interpreter/actions/replacement.ts`,
   `reduceCost` → `payCost` `deleteOwn`): the cost deletion must join the play's trigger batch
   so the deleted Digimon's `[On Deletion]` is raised together with the card's `[On Play]`
   (Q5131). Flip EX10-048's `it.fails`.
4. Seam 1 `immunity-grant-not-installed` (`interpreter/actions/grantStatic.ts`,
   `immuneToOpponentDigimonEffects`): install the `beAffected` restriction. Flip EX10-003's
   `it.fails`. Also verify EX8-029, BT15-047, BT25-042 (whose security-trash cost is never paid).
5. Seam 9 `simultaneous-when-attacking-ordering` and its When Digivolving face
   (`effects/subtriggers.ts`, `EffectContext.ts fireTiming`/`fireSubTriggers`): raise
   `orderTriggers` for simultaneous same-timing effects and drop a queued entry whose source is
   no longer the top card. Flip EX10-009 and EX10-023 reds.
6. Seam 15 `unaffectable-still-choosable` (`interpreter/targeting/permanents.ts:138`, `:507`):
   an unaffectable permanent stays a legal choice (CR 15-15-5-3). Flip EX10-021's red.
7. Seam 12 `save-keyword-substring-overmatch` (`engine/cards/cardData.ts:499`,
   `engine/actions/digiXros.ts:465`): delimiter-anchored keyword tokens for `texts:` filters.
   Then re-check EX10-015 and the BT12 list in the notes. Fold seam 30 (reminder text).
8. Seam 7 `testkit-link-grant-affordance`: add `advance(engine).verb.grantLinkMax(...)` (or
   document BT21-101/BT26-086 as the fixture route), make `harness.ts buildPermanent` run
   `recomputeDP` after seeding links, and make an over-cap seeded board answerable.
9. Seam 25 `whole-clause-cost-gate`, seam 21 `pending-activation-lapses-when-source-leaves`,
   seam 29 `digixros-expander-table-vs-compiled-ir`: design notes only unless small; write a
   mechanism doc with the proposed IR/engine shape.
Remaining seams (2, 3, 4, 5, 8, 10, 11, 13, 14, 17, 18, 20, 22, 26, 27, 28, 31): triage in the
mechanism doc; fix only when the change is under ~30 lines and has a red-then-green test.

## Protocol per seam

- Red first: a focused engine test (or the card red) reproduces the defect on the current tree.
- Fix, then green. Record before/after commands in docs/audits/EX10-reaudit/<SEAM>-MECHANISM.md
  (one doc per seam, or one ENGINE-LANE-1.md with a section per seam).
- Pre-existing failures: reproduce them on a pristine copy made with
  `git archive HEAD | tar -x -C <dir under docs/audits/EX10-reaudit/logs/>` (never a checkout).
- Rules judgements you cannot settle come back to the coordinator; do not guess.

## Gate (run at the end, log to docs/audits/EX10-reaudit/logs/engine-lane-1-*.log)

```bash
timeout 1800 pnpm --filter @aegis/api exec vitest run src/cards/EX10 src/engine/conformance src/engine/combat src/engine/effects src/engine/cards --maxWorkers=1 --no-file-parallelism
pnpm typecheck
pnpm exec oxlint <changed files>; pnpm exec oxfmt --check <changed files>; git diff --check
```

## Final message

Per seam: fixed / design-only / not reached, with the mechanism doc path, the reds flipped, the
regression line, pre-existing failures reproduced on the pristine archive, and anything that
changes production behaviour.
