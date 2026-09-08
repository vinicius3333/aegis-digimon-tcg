# BT24 resumed audit worker brief

Read `.agents/skills/verify-card-implementation/SKILL.md` and the full template `.agents/skills/audit-card-set/references/worker-brief.md` first. Work in this shared worktree. English reports. User explicitly requests Luna workers, overriding the default model in the audit skill.

Audit one assigned card at a time against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, applicable local comprehensive rules, its direct module, tests and existing report. Existing report claims are unverified. Exemplars: BT24-015.test.ts, BT24-016.test.ts, BT24-017.test.ts; inspect critically rather than copying gaps. Base: a924de971e0b43ad9ebd8f82a454d495ff880a60. Main merged at da5c7733c.

Use public intents and natural timing, exact zone identities, costs, stack, refusal, boundary, same-turn OPT and real next-turn reset proofs. No eggs in deck/security. Injected timing earns no behavioral credit. Executable registration exclusively registerIrCard, never a second registerCard. Follow all template evidence standards.

Only edit the assigned card module, colocated test and report. Never edit engine/shared/catalog/ledger/coordinator notes or another card. No git writes. Engine gaps: retain explicit named failing proof and report the smallest seam to coordinator. No implementation mirroring or weakening assertions. Report honest rubric 0–2 each, delivery always 0; maximum 8/10.

Run focused vitest with --maxWorkers=1 --no-file-parallelism; lint and format assigned files. Report clauses/Q&A mapping, exact results, remaining gaps and next useful card. Coordinator independently runs acceptance and full gates. Do not claim collection completion.
