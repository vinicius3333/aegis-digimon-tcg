# BT25 independent collection audit

Scope: all 104 catalog cards BT25-001–104 on branch `audit-bt25-astra-luna`.
Baseline: `a924de971`. Historical BT25 reports are inspection leads, not accepted
scores. The inventory at `docs/audits/BT25/inventory.json` persists every complete
catalog record and card-specific KB query. The new revalidation ledger is the
current campaign source of truth; historical reports remain identifiable.

## Design and ownership

Use small disjoint batches with one-card-at-a-time clause audits. This permits
parallel card work while retaining one owner for shared semantics. A monolithic
rewrite risks unnecessary changes; accepting the old passing suite would miss
tests that exercise ordinary evolution instead of the printed trigger. Retain
correct IR and add only missing causal proof or minimal fixes.

Astra owns planning, assignments, all shared engine changes and mechanism tests,
catalog synchronization, integration review, scoring, commits, push, and PR.
Three explicitly authorized `gpt-5.6-luna` agents, with `fork_turns: none`, own
only their assigned modules, colocated tests, and individual evidence Markdown.
Agents never edit shared engine files, shared fixtures, generated catalogs,
collection ledgers, other cards, or git history. Report engine gaps with a failing
card regression and proposed seam; Astra serializes the fix before work resumes.

Initial assignments: worker A 001–004; worker B 005–008; worker C 009–012.
Subsequent queue: 013–016, 017–020, 021–024, 025–028, 029–032, 033–036,
037–040, 041–044, 045–048, 049–052, 053–056, 057–060, 061–064, 065–068,
069–072, 073–076, 077–080, 081–084, 085–088, 089–092, 093–096, 097–100,
101–104. Astra may shrink complex batches; ownership changes are explicit.

## Per-card acceptance

Read the full committed catalog contract, KB response and applicable rules,
direct IR, and every relevant shared primitive. Map every printed clause to
named persistent tests and observable state. Prove triggers, timing, costs,
optional refusal and later use, boundaries and illegal targets, controller and
zone restrictions, exact traits versus similar traits, durations, inherited and
security effects, once-per-turn, legal evolution stacks, and negative paths as
applicable. Public intents must cause the printed effect; a normal evolution or
structural IR assertion alone is insufficient. Use neutral catalog fixtures.
Keep mutation-sensitive proof in the repository. No unresolved ambiguity earns
10/10. Every production module has one exclusive registerIrCard registration.

Persist `docs/audits/BT25/evidence/<CARD-ID>.md`: source clauses/rulings, mapping
to test names, exact commands and actual counts/results, implementation changes,
mechanism dependencies, outstanding gaps, and proposed score. Astra independently
reviews evidence before assigning the five 0–2 dimensions and total. Pending
cards are unscored, never implicitly perfect. Recalculate all 104 at closeout.

## Resource and integration gates

All Vitest commands use `--maxWorkers=1 --no-file-parallelism`; each agent runs
at most one focused process. Astra runs broad suites only when agents are not
running tests. No unrestricted suite command or overlapping shared build.

1. Capture baseline BT25 suite and workspace typecheck before integration.
2. Run focused tests per card, then affected mechanism regressions per seam.
3. Serialize `pnpm effects:sync:set -- --set BT25`, followed by
   `pnpm effects:check:set -- --set BT25` and catalog synchronization tests.
4. Run all BT25 tests, `src/engine/deckInteractionsBT25.test.ts`, all affected
   mechanism suites, `pnpm typecheck`, applicable Oxlint/Oxfmt, and
   `git diff --check`. Record failures with reproducible commands and fix gates.
5. Review each logical change and create atomic commits. Push only this branch
   with ordinary git push and open an English review PR; never merge it.
6. Recalculate ledger totals from accepted per-card evidence. Update historical
   report status so obsolete claims cannot masquerade as current closeout.
7. Only after 104/104 independently proven 10/10, green gates, commits, pushed
   branch and review PR, execute the user-specified Orca completed command and
   mark the persistent goal complete. Meaningful partial checkpoints update
   comments while collection stays incomplete.
