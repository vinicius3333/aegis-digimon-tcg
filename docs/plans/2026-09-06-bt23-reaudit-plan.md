# BT23 independent collection audit

Baseline: a924de971e0b43ad9ebd8f82a454d495ff880a60; branch audit-bt23-astra-luna. Scope: all 102 committed catalog cards, BT23-001 through BT23-102. Work stays in this checkout.

## Evidence and architecture

The printed catalog and committed data/kb are the contract. Historical reports in docs/audits/BT23-AUDIT.md, docs/audits/BT23-STATIC-AUDIT.md and internal-docs/audits/BT23 are claims to independently revalidate. Static inspection alone cannot prove behavior. A fully serial pass sacrifices the requested delegation; use three small disjoint Luna batches and serial coordinator integration. The user has authorized this design and implementation scope.

Astra owns planning, decomposition, review, the ledger, shared engine and testkit changes, generated catalogs, builds, collection checks, commits, pushes and PR. Luna agents own only assigned direct modules, colocated tests, and per-card evidence files under docs/audits/BT23-reaudit. Each agent audits one card at a time. No agent modifies shared engine files or generated catalogs; report an exact reproducer and proposed reusable seam to Astra. Astra can delegate a serialized mechanism task after transferring explicit ownership.

## Work queue

Initial batches: Luna A BT23-001–003; Luna B BT23-004–006; Luna C BT23-007–009. After review, dispatch successive disjoint three-card batches through BT23-102. Blocked cards retain exact gaps and are revisited after shared fixes; other cards continue. Each report records full catalog/KB contract, executable mapping, named behavior assertions, exact commands/results, peer and legal evolution-stack evidence, score components, and remaining gaps.

## Scoring

Use the existing five components, each 0–2: catalog/rules, IR trace, behavioral proof, peer/stack proof, executed delivery gates. A zero for an unreviewed row means no current audit credit, not a known defective implementation. Worker-ready cards are capped at 8/10 until coordinator review and final required gates. Unsupported or ambiguous cards cannot receive 10/10. Final aggregate is the sum across all 102 cards, denominator 1020; separately count cards at 10/10. Recalculate at meaningful checkpoints and collection closeout.

## Acceptance per card

Read all catalog fields and query node tools/kb/query.mjs card CARD-ID; read relevant rules and peers. Trace real primitives. Prove printed timing, costs, choices/refusal, exact targets and trait comparisons, ownership, zones, duration, inherited/security/link effects, once-per-turn identity/reset, legal evolution transitions and negative paths through public intents and observable settled GameState. Static assertions and injected timing are supplemental. Only registerIrCard(cardId, compiled) may register audited production cards. Ensure at least one focused behavioral assertion detects a card-specific implementation regression.

## Resource and integration gates

All Vitest commands use --maxWorkers=1 --no-file-parallelism; each worker runs only one focused process. Astra pauses worker test activity before a collection/build/typecheck lane. Shared changes and effects sync are serialized. Use pnpm effects:sync:set -- --set BT23 and pnpm effects:check:set -- --set BT23 --base a924de971e0b43ad9ebd8f82a454d495ff880a60; never broad regeneration. Preserve logs and per-card commands in evidence. Run focused files, every affected mechanism suite, full src/cards/BT23 and deckCardAuditBT23, serial workspace typecheck, applicable lint/format, and git diff --check. Review implementation and evidence before focused atomic commits. Push only this branch, open an English review PR, never merge/rebase/force-push.

## Closeout

All 102 rows must independently satisfy 10/10 and all current gates must pass. Update historical top-level reports to point to the current recalculated evidence. Update Orca comments at checkpoints. Only after all gates, atomic commits, pushed branch and review PR: orca worktree set --worktree active --workspace-status completed --comment "COLLECTION COMPLETE: BT23; 100% 10/10; branch pushed" --json. Then complete the persistent goal. Partial batches never constitute completion.
