# TCG simulator verification pipeline

Date: 2026-09-22. Background: [implementation and testing research](../research-tcg-simulator-testing.md).

## Goal and limit

Make engine defects reproducible and rules coverage auditable by obligation. No finite number of matches proves every possible card combination. A defensible completion claim needs an inventory of known obligations, executable evidence, explicit gaps, and additional generated exploration.

## Design decision

Three approaches were considered: only hand-written scenarios, only randomized matches, and a layered system of deterministic proofs plus generated sequences. The layered system gives known behavior an independent oracle and searches for unexpected states. The generator must not copy the engine's effect semantics and then compare the engine with itself.

## Execution plan

| Phase                    | Deliverable                                                                                          | Acceptance criterion                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Source of truth       | Compare the local rules KB with current official manual, errata, and Q&A; record changed obligations | Source updates are reviewed explicitly; changed chunks and citations are reconciled                                                  |
| 1. Inventory             | Matrix of rules, mechanisms, cards, and interactions linked to the KB, tests, and existing audits    | Each obligation has `proven`, `gap`, or `not-testable` status and a reason; a citation alone never proves all obligations in a chunk |
| 2. Scenario harness      | Initial state, actions, decisions, resulting state, and observable event order                       | Cases verify legality, costs, zones, timing, and order through the real `GameEngine`                                                 |
| 3. State invariants      | One reusable state checker across physical zones and identities                                      | Duplicate cards and permanents, applicable bounds, and invalid references are detected; focused tests inject defects                 |
| 4. Generated exploration | One seed for setup, engine, decisions, and several actions in one game, with a replay trace          | The same seed reproduces setup and failure; each confirmed bug becomes a fixed regression                                            |
| 5. Integration           | Bot matches, both seat orders, public events, and per-player state projections                       | Defined samples have no engine errors, stalls, or information leaks; failures include seed, decks, and trace                         |
| 6. Gates                 | Fast PR suite, larger scheduled sample, and gap reports                                              | Focused suites, types, style, and source integrity run; a gap prevents any claim of complete coverage                                |

## Boundaries and sequence

Phases 2–4 use the current harness in `apps/api/src/engine/testkit/`; phase 5 uses `apps/api/src/bot/battleFuzzer.ts`. Phase 1 connects conformance documentation to the KB index without creating a second card-set ledger. Per-card evidence stays exclusively in `docs/audits/<SET>.md`; cross-set engine audits stay in `docs/audits/engine/`.

Start with observed risks: `fuzzer.test.ts` uses `Math.random()` and one action per state; its ID checks miss some duplicates; the local KB v4.2 predates the official 2026-09-18 update. Then expand the matrix and gates from actual failures. Line coverage, test counts, and citation counts are diagnostics, not claims of full fidelity.

## Coverage matrix contract

The inventory is keyed by an individual **obligation**, rather than a source chunk or file. A record needs: source URL and version, rule section or Q&A ID, observable precondition and result, branch (`applies`, `does not apply`, choice, boundary, or ordering), mechanism and card IDs, executable test path, and status. `proven` requires a running behavioral assertion; `gap` requires a reason and an owner; `not-testable` requires a specific non-normative reason. Every changed source invalidates the affected records until reviewed.

Initial mechanism families to inventory are setup and turn flow; play, use, and digivolution costs; attack, blocking, battle, and security; zones and information visibility; trigger and replacement ordering; continuous effects and duration; decisions and simultaneous effects; win conditions and rule checks. Card-set rows keep their detailed evidence in the existing set ledger. Cross-mechanism rows prioritize order-sensitive pairs and known regressions, rather than attempting a Cartesian product of all cards.

The existing KB meta-test currently reports chunk citation coverage as a **proxy**. It must not be promoted to `proven` in this matrix based solely on a `cite()` call. Its eventual enforcement gate may require classified source coverage, but behavioral proof remains a separate condition.

## Execution cadence

- Pull request: source freshness status, focused deterministic scenarios, state invariant tests, seeded short sequences, bot-fuzzer unit tests, typecheck, and style checks.
- Scheduled: larger seed ranges, ordered deck matchups, conformance suite in one worker, and projection or transport integration tests.
- After any discovered defect: preserve seed and trace, minimize the failure, cite the controlling rule or ruling, add a deterministic regression, fix the engine or card IR, and update the relevant existing audit ledger.

## Verification and completion

Run each changed test file and typecheck while implementing. Integration runs the engine suites, match fuzzer, conformance, KB tools, style checks, and `git diff --check`. Record baseline failures or limitations precisely. A generated error must include a seed and actions, be reduced when feasible, and become a deterministic regression before closing it.

## Implementation checkpoint

| Phase | Delivered and remaining boundary                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | The official September 18 comprehensive v4.3 text and index are reconciled; the live freshness check passes. Card Q&A Q5331 and its reversed borrowed-cost answer are updated. [Source review](../audits/engine/rules-v4-3-source-drift.md) records the illustrated manual's grammatical difference and the unverified freshness of the wider Q&A and errata corpora.                                                                                                        |
| 1     | `data/kb/rule-obligations.json` records 7,837 numbered-rule, interaction, local Card Q&A, and errata obligations. Six reviewed clauses have passing behavioral evidence; 7,831 remain explicit gaps. `node tools/kb/rule-obligations.mjs --check` invalidates reviews when the source changes. Citations alone never change a record to `proven`.                                                                                                                            |
| 2     | The existing Board Spec and testkit provide the real-engine scenario harness, including actions, decisions, state, and events.                                                                                                                                                                                                                                                                                                                                               |
| 3     | The shared invariant checker detects duplicate modeled identities, invalid references and bounds, with injected-defect tests.                                                                                                                                                                                                                                                                                                                                                |
| 4     | The seeded fuzzer runs several actions per board, records decision outcomes, replays exact actions, and minimizes a failing sequence while preserving its error. `FUZZ_CASES`, `FUZZ_STEPS`, `FUZZ_SEED`, and `FUZZ_ACTIONS_BASE64` control larger runs and replay. Each discovered rule defect still needs its own deterministic regression.                                                                                                                                |
| 5     | Ordered bot matches capture public events and decode both seat views after actions. The checks found and fixed a face-down security identity leak; the [engine audit](../audits/engine/security-projection-identity.md) records the regression and mulligan identity fix. Real transport behavior beyond the Colyseus encoder/decoder remains a separate gap.                                                                                                                |
| 6     | `pnpm verify:simulator` runs the fast checks. `pnpm verify:simulator:deep` adds live source status, tools, conformance, the full API suite, 1,000 seeded 16-action cases, and ordered bot matches. [The workflow](../../.github/workflows/simulator-verification.yml) runs the fast gate for pull requests and the deep gate weekly or on request. Repository-wide formatting currently reports unrelated baseline files; changed verification files are checked separately. |

No finite suite proves all possible card combinations. The gap count is part of the result, not an estimate of complete coverage.

The deep gate passed at this checkpoint: 688 conformance tests; 44,657 full API tests with one expected failure recording the §15-1-2 decision-ordering gap; 1,000 seeded cases of 16 actions; and eight ordered bot matches with 1,834 public events, zero failures, and zero presentation risks. The cited source checker pinned 454 calls across 89 files with no drift warning.
