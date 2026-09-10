# BT18 re-audit worker brief

Repository: this worktree. English only.

Independently verify each assigned card against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <CARD-ID>`, its direct module, and its colocated test. Existing audit reports are context only, not evidence.

For every printed clause, trace concrete executable IR and observable behavioral proof. Check trigger timing, optionality, costs, targets and boundaries, zones, duration, inherited/security behavior, once-per-turn reset, realistic evolution stacks, and relevant peers. Reject proof that relies only on injected timing, illegal Digi-Egg deck/security fixtures, or `{ ok: true }` without cost and final-stack assertions.

Production modules must register only with `registerIrCard(cardId, compiled)`. Flag `@ts-nocheck`, `registerCard`, `RawUnparsed`, residual clauses, casts that conceal invalid IR, and catalog/persisted IR mismatches.

Write one report per card in `docs/audits/BT18-reaudit/<CARD-ID>.md`, scoring catalog/rules, IR trace, behavior, and peer/stack from 0-2 each; workers award no delivery-gate credit. Run only focused tests, one file at a time, with `--maxWorkers=1 --no-file-parallelism`. Do not run Git writes, collection tests, or typecheck. Do not edit outside assigned modules, tests, and reports.

