# BT24 independent behavioral reaudit — 2026-09-06

Status: in progress. Historical 10/10 claims are not current proof.

## Contract and approach

Audit all 102 catalog cards, BT24-001 through BT24-102. Use the committed catalog, local KB and direct compiled IR as the evidence chain. Preserve the existing five-component score: catalog/rules, IR trace, behavioral proof, peer/evolution-stack proof, executed delivery gates (0–2 each). Unreviewed cards start at zero pending independent validation; this is an evidence status, not a claim that runtime behavior is absent.

A static-only rerun cannot establish timing. Rewriting every test would discard useful evidence. Retain valid existing cases, add missing public-intent scenarios and negative boundaries, and correct minimal reusable engine gaps with focused mechanism regressions. No ambiguous or unsupported clause earns 10/10.

## Ownership and queue

Astra owns this plan, consolidated ledger, engine files, shared testkit, generated effects catalog, synchronization, commits, pushes, PR and final review. Three gpt-5.6-luna agents own disjoint card modules/tests and individual card evidence files. Initial batches: A 001–003; B 004–006; C 007–009. Continue ascending in batches of three from 010–102 as workers finish. Each worker audits one card at a time and reports engine gaps before changing shared code. No agent commits, changes generated files, or edits another worker's card.

## Per-card acceptance

Read all catalog fields and `node tools/kb/query.mjs card CARD-ID`, relevant local rules and historical range report. Trace every clause into runtime. Prove timing, costs, refusal, candidate limits, zones, ordering, duration, inherited/security effects, once-per-turn, comparative traits, and legal/illegal evolution stacks when applicable. Use public intents and settled observable state; injected timings alone do not establish naturally available paths. Each evidence file lists clause-to-test mappings, commands, results and outstanding gaps. Only exclusive registerIrCard(cardId, compiled) is allowed for the audited card.

## Execution limits and integration

One active Vitest process across this worktree, with --maxWorkers=1 --no-file-parallelism. Workers request a test slot from Astra; other workers continue reading/editing. Baseline and final collection: pnpm --filter @aegis/api exec vitest run src/cards/BT24 src/engine/deckInteractionsBT24.test.ts --maxWorkers=1 --no-file-parallelism. Focused tests run before affected mechanism suites. Synchronize/check only BT24 with pnpm effects:sync:set -- --set BT24 and pnpm effects:check:set -- --set BT24; Astra serializes these with shared changes.

## Delivery gates

Recalculate every row after independent review; run full BT24, affected mechanisms, pnpm typecheck, applicable oxlint/oxfmt, git diff --check. Commit atomic logical changes and push only this branch. Open an English review PR, never merge it. Update Orca at meaningful checkpoints. Only after all 102 cards have complete evidence and all gates pass, branch is pushed and PR exists, mark the persistent goal and Orca worktree complete using the exact user command. A partial checkpoint remains incomplete.
