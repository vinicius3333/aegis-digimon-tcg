# EX13 card-authoring worker brief (card-only lane)

Repository: the git worktree at
`/Users/viniciusluiz/aegis-digimon-tcg/.claude/worktrees/ex13-promo-collection`.
Run every command from there. English only, for all code, comments, tests, and
your report — this repo's convention regardless of the request language.

## Context

EX13 (EXTRA BOOSTER CHIVALROUS XIII) is a real Digimon Card Game product,
announced but not yet released (official street date 2026-10-02). Its catalog
data (60 of 77 numbers revealed so far) was just imported into
`packages/shared/src/cards/data/cards.json` from the community card database.
No card module exists yet for this set — you are **authoring the first
implementation** of your assigned card, not correcting an existing one. Treat
this exactly like `.agents/skills/verify-card-implementation` describes,
adapted for creation: the printed catalog text is the contract, and only
observable behavior in a test counts as proof.

Because the set is unreleased, the local rules knowledge base has **no**
entries for it yet (`node tools/kb/query.mjs card <ID>` will say so). That is
expected — do not treat it as a gap you caused. Record "no KB rulings
available; set is pre-release" in your report instead of inventing rulings.
Still check `data/kb/rules/comprehensive.md` for any *general* rule your
card's mechanic touches (e.g. general Security, digivolution, or DNA rules)
even when there is no card-specific Q&A yet.

## Goal

Independently author ONE assigned card end to end and produce evidence for
the audit ledger rubric: catalog/rules, IR trace, behavioural proof,
peer/stack proof (0–2 each) and delivery gates (always 0 for workers — the
coordinator awards that). Score honestly; a worker report claims at most 8/10.

## Sources of truth

- Catalog: `packages/shared/src/cards/data/cards.json` — find your card by
  `cardId`. Read every field: name, colors, kinds, level, playCost, dp,
  evoCosts, forms/attributes/types, effectText, inheritedEffectText,
  securityEffectText, rarity, and any dual/link/ace fields.
- Rulings: `node tools/kb/query.mjs card <ID>` and
  `node tools/kb/query.mjs rules "<phrase>"`;
  `data/kb/rules/comprehensive.md` is authoritative for general rules.
- Peer implementations: browse `apps/api/src/cards/EX12/` and the most
  recently authored sets (`BT26`, `EX11`) for the current accepted style —
  compiled IR shape, `registerIrCard`, shared effect primitives, and test
  structure. Prefer reusing an existing primitive over inventing a new
  effect kind; if the engine truly cannot express your card, say so in your
  report instead of approximating.
- Exemplar tests: `apps/api/src/cards/EX12/EX12-001.test.ts`,
  `EX12-003.test.ts`, and any EX12/BT26 test whose card shares your card's
  kind (Digimon/Tamer/Option/Digi-Egg), trigger vocabulary, or evolution
  shape. Reuse their helpers: public intents, `setupEngine`, `settle()`,
  `advance(...)`, `observe(...)`, decision automation flags
  (`autoAcceptOptional`, `autoSelectCards`, `autoOrderTriggers`).

## Evidence standards

- Every printed clause: a behavioural test with exact endpoints (instance
  ids in zones, memory, DP, security order and faces, hand size, no pending
  or rejected action), asserted after all asynchronous effects settle.
- Evolution: public legal routes (normal, alternate, DNA, App Fusion as
  applicable) with source-stack identity, cost and bonus draw, plus an
  illegal-source negative. `useAlternateCost: true` selects a reduced route;
  `{ok:true}` alone proves nothing.
- Once per turn: same-turn refusal and next-own-turn reset through the real
  turn loop, intermediate state asserted.
- Fixtures: no Digi-Egg in security or deck and no numeric `security: <n>`
  form; use inert main-deck Digimon (BT1-009..BT1-014) as neutral fixtures.
  No inert Digimon exists below 3000 DP, so a Lv3 host that must survive a
  check needs `dp: 20_000`. Keep a spare playable card in hand or Main
  auto-passes.
- Names and traits: `[Name]` is exact (`nameExact` / `namesExact`); only
  "w/[Name] in name" is substring. "with the [X] trait" is exact
  (`match: "trait"`); "with [X] in any of its traits" is substring
  (`traitContains`).
- Zones: `youHave`/`opponentHas` counting filters need
  `zone: "battleArea"` (they also count breeding); permanent targeting
  already defaults to the battle area. "This Digimon would leave"
  replacements need `isSelfRef: true`. "By opponent effects" restrictions
  need `byOpponentEffectsOnly`.
- Durations: every `duration:` string must be a real `EffectDurationRef`;
  unknown strings silently expire at each turn end.
- Decisions: effect-driven digivolves with two matching routes and
  two-option costs raise `chooseOption`; use `autoChooseOption` or
  `preferOptionIndex`.
- `Permanent.stack` holds only the cards beneath the top card.
- No `// @ts-nocheck` in the finished module.

## Cross-card and evolution-stack verification

Check your card against nearby EX12/BT26 implementations sharing its
traits, colors, evolution requirements, or effect vocabulary, to keep
targeting, timing, cost handling, and trait filters consistent with the
rest of the codebase. When your card uses a trait or trait-based filter,
build a focused test with a matching card, a near-matching (but non-
matching) trait card, and a non-matching card, so the filter is proven to
discriminate rather than merely fire once. Build the smallest legal
evolution stack that reaches your card when it digivolves from something,
and assert inherited effects and source identity survive the transition.

## Allowed edits

Only these three files:

- `apps/api/src/cards/EX13/<ID>.ts`
- `apps/api/src/cards/EX13/<ID>.test.ts`
- `docs/audits/EX13-authoring/<ID>.md`

Never touch: `apps/api/src/cards/EX13/index.ts`, `apps/api/src/cards/index.ts`,
the engine, shared package, catalog (`cards.json`), any other card, or
`docs/audits/EX13.md`. If the engine is missing a primitive you need, do not
build it yourself — keep the test as `it.fails` (or `it.skip`) with a
comment naming the exact seam (file, function, expected vs. actual) and
describe it in your report; the coordinator will route it to an engine lane.

Never run any git write command (`stash`, `checkout --`, `restore`,
`reset`, `worktree`, `commit`, `add`). Leave your files unstaged; the
coordinator commits.

## Commands

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX13/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api typecheck
pnpm exec oxlint apps/api/src/cards/EX13/<ID>.ts apps/api/src/cards/EX13/<ID>.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX13/<ID>.ts apps/api/src/cards/EX13/<ID>.test.ts
git diff --check
```

If `pnpm exec oxfmt --check` reports formatting issues, run
`pnpm exec oxfmt apps/api/src/cards/EX13/<ID>.ts apps/api/src/cards/EX13/<ID>.test.ts`
to fix them before your final report.

## Report (`docs/audits/EX13-authoring/<ID>.md`)

Card summary with printed clauses; KB check result (rulings found, or "none
— pre-release"); clause → test → IR mapping; exact commands and results;
any engine gap retained red with the seam named; remaining ambiguity;
score per rubric column with 0 for gates.

## Final message

Score breakdown; files changed; exact test result line (files/tests
passed); typecheck result; any retained reds with seam names; anything the
coordinator must do.
