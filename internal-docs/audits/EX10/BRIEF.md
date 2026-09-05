# EX10 card audit brief (shared by all batch agents)

Working directory (absolute, always use it, never the main repo root):
`/Users/viniciusluiz/aegis-digimon-tcg/.claude/worktrees/audit-ex10`

Follow `.agents/skills/verify-card-implementation/SKILL.md` step by step for every card in
your batch, in ascending order. Read the skill file first.

## Known defect classes from the EX12 audit (check every card for them)

- Decode plays are now scoped by the engine to the host's own stack; explicit
  `hostFilter: { isSelfRef: true }` is still the preferred IR shape.
- Scaling or costs over "digivolution cards" or "cards" with `kind: ["Digimon"]` exclude
  Digi-Eggs (catalog kind `DigiEgg`).
- `UseOptionWithoutCost` defaults to a play-cost ceiling of 5 and rejects multicolor Options
  unless `playCostLte` and `allowMultiColor` are set.
- ＜Use Req.＞ `youHave` conditions must carry `kind: ["Digimon", "Tamer"]` (CR 16-42-3).
- "By ..." processing conditions are declinable (CR 15-7-4): the cost needs `optional: true`
  and the action `abortOnDecline: true`; a printed mandatory clause must not be `optional`.
- Persisted `condition.kind: "raw"` strings match nothing and evaluate to unmet.
- Suites that digivolve into a card with printed and alternate requirements must pass
  `autoChooseOption: true` or answer the route prompt.

## What you must not trust

`apps/api/src/cards/EX10/AUDIT.md` already scores every EX10 card 10/10. Treat that as a claim
to falsify. The audit established two gaps the ledger missed:

- the probed persisted records in `packages/shared/src/effects/effects.json` differ from the
  direct module. Your batch's drift list is in your task prompt. For each drifted card, read
  both forms and decide which one is right against the printed text and rulings. Fix the
  module if the module is wrong. Never edit `effects.json`; report which side won.
- `// @ts-nocheck` was removed from all 74 modules. Your batch's type errors are in your task
  prompt. A type error usually means the IR shape is not what the interpreter reads, so treat
  each one as a possible semantic defect, not a typing chore. Fix the module so it typechecks
  against `CompiledCard` without casts or `any`.

## Evidence sources

- Catalog: `packages/shared/src/cards/data/cards.json` (field `cardId`, set `EX10`).
- Knowledge base: run `node tools/kb/query.mjs card <CARD-ID>` for every card; read the rules
  under `data/kb` when a ruling points there.
- Interpreter: `apps/api/src/engine/effects/interpreter/**`. Follow every primitive your card
  uses until you can state its real semantics.
- Peers: neighboring EX10 cards and other sets sharing the trait, keyword, or effect vocabulary.

## Per-card work

1. Contract: list every printed clause (main, inherited, Security, evolution requirements
   including alternates, Rule text, keywords, DP, level, colors, costs). Attach the KB rulings.
2. IR trace: map each clause to IR nodes and to interpreter code. Name the gap when a clause is
   approximated, missing, or over-broad (targets, controller, count, boundaries, timing,
   optionality, once-per-turn identity, zones, face state, duration, turn ownership).
3. Behavioral proof: strengthen `<CARD-ID>.test.ts` following current neighboring EX10 tests
   (public intents, `settle()`, assertions on `GameState`). Cover positive path, exact
   boundaries, negative path, optional refusal, paid costs and final zones, duration, inherited
   and Security behavior, once-per-turn. For every clause you fixed, add the test that would
   have failed before the fix.
4. Peer and stack: add the trait-mix and realistic evolution-stack cases the skill's step 4
   requires.
5. Do a reasoning mutation check: for each card-specific field, name the existing or new
   assertion that would fail if the field were wrong. If you cannot name one, the suite is
   insufficient. Write it down in the report.

## Hard rules

- Edit only `EX10-<ID>.ts` and `EX10-<ID>.test.ts` for cards in your batch. Never edit `index.ts`, `AUDIT.md`,
  `EX10.audit.test.ts`, `EX10-catalog-sync.test.ts`, `effects.json`, other sets, or anything
  under `apps/api/src/engine` or `packages/shared`.
- If a card needs an engine or shared change, do not make it. Write the minimal proposed diff
  and the test that proves the need into your report, score the card below 10/10, and move on.
- Never add `registerCard`. Keep exactly one `registerIrCard("<ID>", compiled)` call.
- Keep `coverage: "full"` and `residual: []` honest. If a clause is not executable, say so.
- Do not run vitest, typecheck, lint, or formatters. Verification executes every gate once at
  the end. Keep test code compilable by reading neighboring tests and the harness types.
- No git commands of any kind. No pushes. Nothing outside the worktree.

## Deliverable

Write `internal-docs/audits/EX10/EX10-<FIRST>-<LAST>.md` following the structure of
`internal-docs/audits/EX12/EX12-001-010.md`:

1. Scope and authority (catalog commit, files inspected, execution constraints).
2. KB table: one row per card with the ruling ids applied or "No dedicated entry returned."
3. Registration and runtime findings, including the effects.json verdict per drifted card.
4. Per-card findings: clauses, IR trace, defects corrected (before and after), tests added,
   type errors resolved and what they meant, mutation-check assertions, open ambiguity.
5. Score table with the five columns (Catalog/rules, IR trace, Behavioral proof, Peer and
   stack proof, Executed delivery gates) and total. Delivery gates are `0/2` for every card
   because no gate ran; mark totals as provisional maxima of 8/10.
6. Seam requests: proposed engine diffs with the failing test each one needs.

Return a short summary: cards changed, defects found per card, effects.json verdicts, seam
requests, cards you could not bring to 8/10 and why.
