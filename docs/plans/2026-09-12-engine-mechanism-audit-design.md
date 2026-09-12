# Engine mechanism and keyword audit plan

Date: 2026-09-12
Status: planned; no behavioral verification is claimed by this document.

## Objective

Establish reproducible proof for shared Digimon rules and keywords, then verify
that real card modules supply the correct parameters to those mechanisms. A
passing mechanism audit does not certify every consuming card or collection.

Use existing TypeScript engine modules, Vitest suites, compiled card IR, local
KB queries, and pnpm scripts. Fix the smallest reusable engine seam exposed by
a failing behavioral test. Avoid a second keyword implementation or test runner.

## Structure and ownership

- This file contains future work only. Record audit evidence exclusively in
  `docs/audits/engine/<mechanism>.md`, with kebab-case names. Update an existing
  mechanism document when it already owns the subject, such as `vortex-timing.md`.
- Keep collection evidence in the existing `docs/audits/<SET>.md`. Link to engine
  sections instead of copying a second collection ledger into an engine report.
- Extend `apps/api/src/engine/conformance/` chapter tests for normative rules;
  put engine integration proofs beside the mechanism in combat, effects, state,
  or cards. Keep card-specific parameter proofs in colocated card tests.
- Preserve exclusive `registerIrCard(cardId, compiled)` card registration.
  Do not introduce `registerCard` into audited card modules.
- Execute one bounded mechanism at a time. Any later delegation must respect
  shared-file ownership and serialize engine changes.

## Audit record

Each mechanism report should contain Status, Contract and sources,
Implementation trace, Obligation ledger, Consumer coverage, Gates, Open items,
and History. Record the baseline and delivery commits, KB version or content
fingerprint, exact commands, results, and any unresolved source ambiguity.

Use this obligation table inside the report:

| Obligation                        | KB chunk / ruling | Engine path  | Public action and observable result | Test                        | Consumers         | Status |
| --------------------------------- | ----------------- | ------------ | ----------------------------------- | --------------------------- | ----------------- | ------ |
| To be established from the source | To be read        | To be traced | To be specified                     | To be written or reproduced | To be inventoried | queued |

Statuses: queued, verified, blocked, or not-applicable with a concrete reason.
The denominator is all normative obligations found for the mechanism, including
exceptions. Citations and test counts are supporting metadata, not proof of
complete behavior. An expected failure, skipped proof, unsupported behavior, or
unresolved normative ambiguity prevents mechanism certification.

## Phase 0 — Inventory and baseline

1. Enumerate printed and runtime-granted keywords from the committed catalog,
   compiled IR, keyword registration, and combat keyword reader. Reconcile the
   union so unsupported catalog keywords do not disappear from the inventory.
2. Group shared operations: costs, triggers, duration, identity, replacement,
   targeting, zones, evolution, combat, security, and keyword synthesis.
3. Map existing tests and consumers to each mechanism. Include direct IR and
   persisted effect records where both participate in execution.
4. Reproduce focused and conformance baselines before making changes. Inventory
   actual `it.fails`, skips, todos, and residuals; reconcile stale document claims.
5. Select a smallest pilot: optional activation costs and refusal behavior.
   Query sources with `node tools/kb/query.mjs rules "optional cost" --limit 10`
   and query representative cards with `node tools/kb/query.mjs card <CARD-ID>`.
   Search results are discovery aids; read full applicable KB chunks and rulings.

Exit: each inventoried mechanism has an owner document, source obligations,
consumer list, baseline commands, and explicit unknowns. Do not award inherited
verification credit from historical collection scores.

## Phase 1 — Make source references trustworthy

Inspect `conformance/_kb.ts`, `_kb.meta.test.ts`, and the current rules index.
Existing chunk IDs are positional and the residual coverage output is only a
report. The conformance README also contains historical statements that must be
reconciled against current code and package scripts.

Add an opt-in content fingerprint to reviewed citations using the current loader
and existing Node facilities. Preserve `cite(id, note?)` compatibility. New or
re-audited obligations must pin their reviewed content; migrate older citations
when their mechanisms are reviewed. A mismatch must require source review rather
than silently replacing the expected fingerprint.

Prove unchanged content passes, changed content under an existing ID fails,
unknown IDs fail, and legacy calls continue to work. Report unpinned references
honestly. Do not turn the entire KB residual into a zero-tolerance gate before
obligations are classified and execution across chapter files is demonstrable.

Exit: the pilot's citations detect source drift, with compatibility tests green.

## Phase 2 — Costs, timing, and effect resolution

Deliver separate bounded audits in this order:

1. `activation-costs.md`: optional refusal, mandatory payloads, payment failure,
   compound costs, partial payment rules, and conditional "if you do" outcomes.
2. `trigger-ordering.md`: simultaneous triggers, player ordering, trigger versus
   resolution legality, pending decisions, and source departure.
3. `effect-duration-and-identity.md`: once-per-turn source identity, next-turn
   reset, inherited-source changes, granted-effect removal, battle versus attack
   cleanup, and future entrants under continuous effects.
4. `replacement-effects.md`: eligibility, player choice, competing replacements,
   prevention, and whether the original operation actually happened.

For each slice, derive expected outcomes from sources before writing tests.
Keep the failing reproduction, implement the smallest repair, prove it green,
and run the affected consumers before moving to another mechanism.

## Phase 3 — Combat and keywords

Inventory determines the exhaustive keyword list; do not certify only the names
already recognized by the engine. Begin with existing keyword tests and
`ch16a`, `ch16b`, `ch16c` conformance files.

Order the work by lifecycle: attack legality and Rush; Blocker and redirection;
battle outcomes and Piercing; Security Attack values and security resolution;
then deletion-related and advanced keywords. Read the actual sources before
assigning a keyword to a group. Re-audit Vortex through its existing document.

For every keyword, cover the applicable dimensions:

- Printed, inherited, and runtime-granted forms; grant removal and duration.
- Legal positive and negative actions, exact numerical boundaries, optional
  acceptance/refusal, costs, and correct controller.
- Multiple holders, duplicate grants, accumulation or non-accumulation rules.
- Evolution stacks, source changes, removal, immunity, and replacement effects.
- Interactions with other keywords and simultaneous effects.

Use at least two real consumers from different sets where available, plus a
neutral runtime recipient for granted keywords. If only one consumer exists,
state that limit. Exhaustively inspect consumer parameter shapes and group them
into equivalence classes; integration proofs must cover every distinct shape.
Record which individual modules were inspected and which were executed.

## Phase 4 — Other generic rules

Audit targeting and selection (exact names, traits, OR filters, numeric and total
cost budgets); zones and visibility (including Digi-Egg destinations and tokens);
evolution requirements and reductions; then DNA, Blast, DigiXros, and Link in
separate slices. Reuse existing DNA/evolution audit documents when their scope
matches. Split large mechanisms instead of creating a catch-all certification.

## Proof requirements

Drive public intents and resolve the full effect stack with existing testkit
helpers. Assert final memory, zones, stack, DP, controller, decisions, and turn
state as applicable. `{ ok: true }` alone does not prove payment or resolution.
Injected timing is supplemental proof and must be identified as such.

Use legal, neutral fixtures; never seed Digi-Eggs into the main deck or security.
Test duration at its expiration boundary and once-per-turn behavior before and
after the real reset. Check individual and combined execution where shared
registration can change fixtures (`isolate: false`).

For every repair, reverting the relevant behavior must fail a focused assertion
for the intended reason. Perform this in an isolated temporary copy or targeted
test seam, preserving unrelated workspace changes. Do not commit a deliberately
broken engine or bless a wrong outcome with a synthetic fixture.

## Verification and delivery

Run concrete paths, replacing placeholders with the files recorded in the report.
Use current Vitest 5 serial flags; avoid old `poolOptions.forks` flags.

```sh
pnpm --filter @aegis/api exec vitest run <focused-test-paths> --pool=forks --maxWorkers=1 --no-file-parallelism
pnpm --filter @aegis/api exec vitest run src/engine/conformance src/engine/combat src/engine/effects src/engine/cards <affected-collection-paths> --pool=forks --maxWorkers=1 --no-file-parallelism
pnpm typecheck
pnpm exec oxlint <changed-typescript-files>
pnpm exec oxfmt --check <changed-files>
pnpm --filter @aegis/api exec vitest run src/cards/audit-docs.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
pnpm audit:index --check
git diff --check
```

When card IR or catalog semantics change, run effects sync and check separately
for each affected set against the recorded baseline, inspect generated changes,
and rerun consumer suites:

```sh
pnpm effects:sync:set -- --set <SET> --base <BASE-SHA>
pnpm effects:check:set -- --set <SET> --base <BASE-SHA>
```

Pure engine changes still require examining whether persisted effects contain
old forms affected by the repair. Broaden to the full API suite when the consumer
inventory shows changes to global resolution, targeting, or state semantics.
Use actual pnpm/Oxlint/Oxfmt scripts; this project has no Meteor quality gate.

Document unrelated failures only after reproducing them on the same baseline in
an isolated copy. They remain explicit gate limitations. Do not call the closing
regression green when affected tests fail. Delivery uses atomic commits following
repository git conventions; publication follows the authorized task scope.

## Completion criteria

A mechanism is verified only when every normative obligation is proved, all
distinct consumer shapes are covered, source references are reviewed, required
gates pass, no applicable expected failure or residual remains, and delivered
evidence identifies the final implementation revision. Keep progress denominators
for obligations and consumer shapes separate.

Update affected collection ledgers only for newly reproduced card evidence.
An engine audit does not mark an Orca collection worktree complete; the separate
whole-collection 10/10 and pushed-branch requirements still apply.

## First implementation batch

- [ ] Establish inventory, baseline, and the optional-cost pilot's source matrix.
- [ ] Add compatible citation fingerprints and meaningful drift tests.
- [ ] Reproduce refusal/payment bugs through real public actions.
- [ ] Repair only demonstrated engine gaps and verify representative consumers.
- [ ] Write `activation-costs.md` with actual evidence and open items.
- [ ] Run closing gates and deliver the bounded change before starting timing.
