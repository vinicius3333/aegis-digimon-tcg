# EX10 re-audit worker brief (card-only lane)

Repository worktree: /Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/audit-ex10-reaudit
(branch audit-ex10-reaudit, base 46810fe1e271215d173854b82513f4ce30508b01). Run every
command from that directory. English only. Plain language in reports.

## Goal

Independently re-audit ONE assigned card and produce evidence for the ledger rubric:
catalog/rules, IR trace, behavioural proof, peer/stack proof (0–2 each) and delivery
gates (always 0 for workers). Score honestly; a worker report claims at most 8/10.
The previous audit (apps/api/src/cards/EX10/AUDIT.md) claimed 10/10 for every card;
treat that claim as unverified. Your job is to find what it missed.

## Sources of truth

- Catalog: packages/shared/src/cards/data/cards.json (fields: cardId, nameEn, colors,
  kinds, level, playCost, dp, evoCosts, forms, attributes, types, effectText,
  inheritedEffectText, securityEffectText, rarity, maxCountInDeck, isAce,
  overflowMemory, ...). Official text wins; if the catalog disagrees with the official
  list, report it, do not edit.
- Rulings: `node tools/kb/query.mjs card <ID>` and `node tools/kb/query.mjs rules
  "<phrase>"`; data/kb/rules/comprehensive.md is authoritative.
  docs/audits/EX10-reaudit/KB-INDEX.md lists the Q&A ids you must cover.
- Module and test: apps/api/src/cards/EX10/<ID>.ts and <ID>.test.ts. Modules register
  with registerIrCard only; never add registerCard.
- Context: docs/audits/EX10-reaudit/REVIEW-NOTES.md and RUN.md sections that mention
  your card; docs/audits/EX10-reaudit/*-MECHANISM.md for any engine seam named there.
- Exemplar tests in the accepted style (read at least two before writing):
  apps/api/src/cards/BT23/BT23-031.test.ts (exact-name gate, public play, security
  endpoints), BT23-036.test.ts (turn loop, once-per-turn reset), BT23-029.test.ts
  (evolution routes, inherited effects), BT23-001.test.ts (Digi-Egg, breeding).
  Accepted EX10 lanes in this run: EX10-002.test.ts (Blocker path, breeding-to-battle
  stack, OPT reset via turn loop), EX10-006.test.ts, EX10-007.test.ts.
  Reuse their helpers: setupEngine with a Board Spec, s.engine.applyIntent(seat, intent),
  s.engine.startTurnLoop(), settle(predicate), s.perm(alias) / s.inst(alias),
  observe(s.engine), decision automation flags (autoAcceptOptional,
  autoDeclineOptional, autoSelectCards, autoChooseOption). The seam is
  apps/api/src/engine/testkit/ (harness.ts, observe.ts, advance.ts); read harness.ts
  BoardSpec/EngineSetup/SetupEngineOptions before writing fixtures.
- Injected timing (advance.fire, fireSubTrigger, fireTiming) is structural only and earns
  no behavioural credit. A clause proved only that way scores 0 in the Behavior column.
  Coordinator decision: a `[Once Per Turn]` gate on a `whenMovedFromBreeding` watcher
  cannot fire twice through public intents (the single legal move empties breeding);
  keep structural proof for that gate only and say so in the report.

## Evidence standards

- Every printed clause: a behavioural test with exact endpoints (instance ids in zones,
  memory, DP, security order and faces, hand size, no pending or rejected action),
  asserted after all asynchronous effects settle.
- Every listed Q&A id: a test or a documented reason it is untestable.
- Evolution: public legal routes (normal, alternate, DNA, DigiXros, App Fusion) with
  source-stack identity, cost and bonus draw, plus an illegal-source negative.
  `useAlternateCost: true` selects a reduced route; `{ok:true}` alone proves nothing.
- Once per turn: same-turn refusal and next-own-turn reset through the real turn loop,
  intermediate state asserted.
- Fixtures: no Digi-Egg in security or deck and no numeric `security: <n>` form; use
  inert main-deck Digimon. Truly inert (no effect text at all): BT1-009, BT1-013,
  BT1-014. BT1-012 has only an inherited DP clause (fine in deck/security/trash, not as a
  stack card under a host you assert DP on). BT1-010 and BT1-011 carry `[On Play]`
  effects: never play them from hand in a fixture. No inert Digimon exists below 3000 DP,
  so a Lv3 host that must survive a check needs `dp: 20_000`. Keep a spare playable card
  in hand or Main auto-passes.
- Names and traits: `[Name]` is exact (`nameExact` / `namesExact`); only "w/[Name] in
  name" is substring. "with the [X] trait" is exact (`match: "trait"`); "with [X] in any
  of its traits" is substring (`traitContains`). Trait substring is case-insensitive.
- Zones: `youHave`/`opponentHas` counting filters scan the battle area by default and
  count breeding only when `zone` is an array containing `"breeding"`
  (`interpreter/scaling.ts countMatching`); write `zone: "battleArea"` for clarity.
  Permanent targeting already defaults to the battle area. "This
  Digimon would leave" replacements need `isSelfRef: true`. "By opponent effects"
  restrictions need `byOpponentEffectsOnly`. Costs that place own digivolution cards
  need `shedOwnCards: true`.
- Durations: every `duration:` string must be a real `EffectDurationRef`; unknown strings
  silently expire at each turn end.
- Decisions: effect-driven digivolves with two matching routes and two-option costs
  raise `chooseOption`; use `autoChooseOption` or `preferOptionIndex`.
- `Permanent.stack` holds only the cards beneath the top card.
- Stay inside the test seam (apps/api/src/engine/testkit/). A cast that reaches
  `engine.continuous`, `engine.ledger`, `engine.primitives` or any other internal earns no
  Peer/stack credit; duration expiry is proved through the turn loop, not `ledger.sweep`.
  A missing affordance is reported as a seam (it.skip with the seam named), never worked
  around at the call site.
- DigiXros: prove material sources (hand, battle area, trash when text allows), the
  reduced cost per material, and that a non-matching card is refused as material.
- ACE: prove ＜Blast Digivolve＞ from hand in the counter window and Overflow memory
  when the card leaves the battle area.
- A multi-link board: BT21-101 Gaiamon prints ＜Link +1＞ and BT26-086 prints ＜Link +6＞; use it instead of reaching for
  `continuous.addLinkMaxGrant`. The public `appFusion` intent exists; use it instead of
  `verb.appFuseInto`.
- ＜De-Digivolve＞: `deDigivolve` never demotes a Lv.3 top (`levelFloor = 3`); prove it on a
  Lv.4+ top. An over-cap seeded link is trashed by the rule sweep at the next attack.
- ＜Save＞: the compiled `PlaceUnder` must carry `position: "bottom"`; without it the saved
  card lands directly beneath the Tamer (engine reads `action.position !== "bottom"`).
  Prove the position with two cards already under the Tamer and assert exact order.
- Attack intents target `{ kind: "permanent" }` or `{ kind: "player" }`; `"digimon"` is not a
  member of the union and fails typecheck. Inert [Mineral]/[Rock] cost-pool fixtures:
  BT10-062, BT10-064, BT4-065, BT2-064 (EX10-025/028/032 carry inherited deletion clauses).
- A block window opens only when the defending side has an eligible ＜Blocker＞; with none,
  the attack resolves on its own and `declineBlock` returns `wrong-phase`.
- Turn loop: the first turn player does not draw; a breeding permanent parks the loop in
  the Breeding phase, so settle on `Phase.Breeding` and send `endPhase` before
  `waitForMainPhase`.
- Digi-Egg peer/stack 2/2 needs the egg proved through the real route: hatch, digivolve
  in breeding, move to the battle area, then the inherited clause on that carrier.

## Allowed edits

Only apps/api/src/cards/EX10/<ID>.ts, apps/api/src/cards/EX10/<ID>.test.ts and
docs/audits/EX10-reaudit/<ID>.md. Never: engine, shared, catalog, other cards,
effects.json, ledger, RUN.md, REVIEW-NOTES.md, KB-INDEX.md, this brief, scratch test
files inside apps/api. Never any git write (stash, checkout, restore, reset, commit,
worktree); to see the committed version use `git show HEAD:<path>` into
docs/audits/EX10-reaudit/logs/.
Other lanes are editing sibling cards concurrently; a failure or typecheck error in
another card's file is not yours to fix, report it. Only errors in your own files count.

An engine gap: keep the test as `it.fails` (or `it.skip`) with a comment naming the
seam, describe file, function, expected versus actual in the report. Do not weaken the
assertion or bless a wrong result with a ruling that does not say so.

If you change the module's compiled IR, the persisted record in
packages/shared/src/effects/effects.json will drift; that is expected. The coordinator
runs the sync. Do not edit effects.json.

## Commands

```bash
timeout 300 pnpm --filter @aegis/api exec vitest run src/cards/EX10/<ID>.test.ts --maxWorkers=1 --no-file-parallelism --testTimeout=20000
pnpm --filter @aegis/api typecheck
pnpm exec oxlint <files>; pnpm exec oxfmt --check <files>; git diff --check
```

Test run limits (mandatory):

- Run only your own focused file. Never run `src/cards`, `src/cards/EX10`, `src/engine`
  or the whole suite; the coordinator owns regression runs.
- Wrap every vitest run in `timeout 300` and pass `--testTimeout=20000`. A run that hits
  the timeout is a hang: do not retry it blindly, find the unanswered decision or the
  missing `settle` predicate, and report it if you cannot.
- At most one extra vitest invocation per peer file you need for a comparison, each
  under the same limits.
- Run typecheck at most twice per lane (once after the module change, once at the end).

Logs go to docs/audits/EX10-reaudit/logs/<ID>-<what>.log.

## Report (docs/audits/EX10-reaudit/<ID>.md)

Card summary with printed clauses; Q&A ids covered; clause -> test -> IR mapping; exact
commands and results; defects fixed locally or retained red with the seam; remaining
gaps; score per rubric column with 0 for gates, ending with a `**Total** | **N/10**` row.

## Final message

Score breakdown (four columns); files changed; test result line; retained reds with
seam names; catalog discrepancies; engine seams for the coordinator; anything else the
coordinator must do.
