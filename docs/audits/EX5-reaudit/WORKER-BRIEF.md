# Card-lane brief template

Copy to the session scratchpad, replace `EX5`, `afa3ab2f451245fb03bf4e3f895ead8807f18df1` and the
exemplar list, and point every lane at it.

---

# EX5 re-audit worker brief (card-only lane)

Repository: `/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex5-luna-20260909`; work only there. English only.

## Goal

Independently re-audit ONE assigned card and produce evidence for the
ledger rubric: catalog/rules, IR trace, behavioural proof, peer/stack proof
(0–2 each) and delivery gates (always 0 for workers). Score honestly; a
worker report claims at most 8/10.

## Sources of truth

- Catalog: `packages/shared/src/cards/data/cards.json`. Official text wins;
  if the catalog disagrees with the official list, report it, do not edit.
- Rulings: `node tools/kb/query.mjs card <ID>` and
  `node tools/kb/query.mjs rules "<phrase>"`; `data/kb/rules/comprehensive.md`
  is authoritative. `docs/audits/EX5-reaudit/KB-INDEX.md` lists the Q&A ids
  you must cover.
- Module and test: `apps/api/src/cards/EX5/<ID>.ts` and `<ID>.test.ts`.
- Context: `docs/audits/EX5-reaudit/REVIEW-NOTES.md` and `RUN.md` sections
  that mention your card; the mechanism docs for any engine seam named there.
- Exemplar tests in the accepted style: `EX9/EX9-065.test.ts`, `EX9/EX9-070.test.ts`, `EX9/EX9-073.test.ts`, `EX9/EX9-074.test.ts`. Reuse their
  helpers: public intents, `ready()`, `startTurnLoop()`, `endPhase`,
  `observe(...)`, decision automation flags. Injected timing
  (`advance.fire`, `fireSubTrigger`, `fireTiming`) is structural only and
  earns no behavioural credit.

## Evidence standards

- Every printed clause: a behavioural test with exact endpoints (instance ids
  in zones, memory, DP, security order and faces, hand size, no pending or
  rejected action), asserted after all asynchronous effects settle.
- Every listed Q&A id: a test or a documented reason it is untestable.
- Evolution: public legal routes (normal, alternate, DNA, App Fusion) with
  source-stack identity, cost and bonus draw, plus an illegal-source negative.
  `useAlternateCost: true` selects a reduced route; `{ok:true}` alone proves
  nothing.
- Once per turn: same-turn refusal and next-own-turn reset through the real
  turn loop, intermediate state asserted.
- Fixtures: no Digi-Egg in security or deck and no numeric `security: <n>`
  form; use inert main-deck Digimon (BT1-009..BT1-014). No inert Digimon
  exists below 3000 DP, so a Lv3 host that must survive a check needs
  `dp: 20_000`. Keep a spare playable card in hand or Main auto-passes.
- Names and traits: `[Name]` is exact (`nameExact` / `namesExact`); only
  "w/[Name] in name" is substring. "with the [X] trait" is exact
  (`match: "trait"`); "with [X] in any of its traits" is substring
  (`traitContains`). Trait substring is case-insensitive ("cs" matches
  "Abadin Electronics").
- Zones: `youHave`/`opponentHas` counting filters need `zone: "battleArea"`
  (they also count breeding); permanent targeting already defaults to the
  battle area. "This Digimon would leave" replacements need
  `isSelfRef: true`. "By opponent effects" restrictions need
  `byOpponentEffectsOnly`. Costs that place own digivolution cards need
  `shedOwnCards: true`.
- Durations: every `duration:` string must be a real `EffectDurationRef`;
  unknown strings silently expire at each turn end. Remove `// @ts-nocheck`
  when the module typechecks without it.
- Decisions: effect-driven digivolves with two matching routes and two-option
  costs raise `chooseOption`; use `autoChooseOption` or `preferOptionIndex`.
- `Permanent.stack` holds only the cards beneath the top card.

## Allowed edits

Only `<ID>.ts`, `<ID>.test.ts` and `docs/audits/EX5-reaudit/<ID>.md`.
Never: engine, shared, catalog, other cards, ledger, RUN.md, REVIEW-NOTES.md,
scratch test files inside `apps/api`. Never any git write, including
`git stash` in any form; use `git show HEAD:<path>` into the scratchpad.

An engine gap: keep the test as `it.fails` (or `it.skip`) with a comment
naming the seam, describe file, function, expected versus actual in the
report. Do not weaken the assertion or bless a wrong result with a ruling
that does not say so.

## Commands

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX5/<ID>.test.ts --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api typecheck
pnpm exec oxlint <files>; pnpm exec oxfmt --check <files>; git diff --check
```

Logs go to `docs/audits/EX5-reaudit/logs/<ID>-<what>.log`.

## Report (`<ID>.md`)

Card summary with printed clauses; Q&A ids covered; clause -> test -> IR
mapping; exact commands and results; defects fixed locally or retained red
with the seam; remaining gaps; score per rubric column with 0 for gates.

## Final message

Score breakdown; files changed; test result line; retained reds with seam
names; catalog discrepancies; anything the coordinator must do.
