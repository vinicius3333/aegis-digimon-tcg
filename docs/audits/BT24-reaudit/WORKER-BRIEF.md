# BT24 resumed audit worker brief

Armor Purge refusal, like Raid refusal, is a `selectCards` decision with minimum zero, not an `optional` decision. `autoDeclineOptional` combined with `autoSelectCards` still ACCEPTS purge. Answer the public zero-card selection explicitly; see combat/controller.ts and primitives.ts. A missing `autoChooseOption` can also leave effect-driven evolution pending despite a silent `settle` timeout; inspect unresolved decisions before claiming source-stack corruption.

Latest acceptance traps: `it.fails` accepts ANY assertion failure, including an illegal first evolution or missing deck causing deck-out. Report the literal first failing assertion before naming an engine seam. A public sequence must assert its first successful endpoint before testing frequency. In a battle-based negative for optional Decode, accept optional decisions so refusal cannot mask an incorrectly offered effect. To prove Jamming, security DP must exceed host DP and assertions must follow combat resolution, not initial security extraction. Harness `under` arrays are bottom-to-top, like the resulting `Permanent.stack`.

Read `.agents/skills/verify-card-implementation/SKILL.md` and the full template `.agents/skills/audit-card-set/references/worker-brief.md` first. Work in this shared worktree. English reports. User explicitly requests Luna workers, overriding the default model in the audit skill.

Audit one assigned card at a time against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, applicable local comprehensive rules, its direct module, tests and existing report. Existing report claims are unverified. Exemplars: BT24-015.test.ts, BT24-016.test.ts, BT24-017.test.ts; inspect critically rather than copying gaps. Base: a924de971e0b43ad9ebd8f82a454d495ff880a60. Main merged at da5c7733c.

Use public intents and natural timing, exact zone identities, costs, stack, refusal, boundary, same-turn OPT and real next-turn reset proofs. No eggs in deck/security. Injected timing earns no behavioral credit. Executable registration exclusively registerIrCard, never a second registerCard. Follow all template evidence standards.

Only edit the assigned card module, colocated test and report. Never edit engine/shared/catalog/ledger/coordinator notes or another card. No git writes. Engine gaps: retain explicit named failing proof and report the smallest seam to coordinator. No implementation mirroring or weakening assertions. Report honest rubric 0–2 each, delivery always 0; maximum 8/10.

## Acceptance traps found in this restart

- Reread every requested correction in the actual final file before reporting it fixed. Reports must describe actual code, not intentions.
- `settle(predicate)` can time out without failing. Assert the expected endpoint explicitly afterward; do not use predicates already true at initial state.
- Public security attack by seat 0 removes seat 1 security. Capture checked instance IDs; assert the correct owner's exact trash endpoint.
- Pre-Active suspension is undone by Active automatically. For End-of-Turn unsuspend proof, attack publicly in Main, await completed combat, then end Main and assert suspension/payment.
- Reaching Main with a fresh turn does not prove OPT. Trigger the same source twice through public actions in one turn, then again after an intervening turn. Never call an injected subtrigger a public play.
- To repeat a public attack with the same host, BT24-050 public play can unsuspend it. See the updated BT24-095 OPT test; preserve the same inherited/linked source instance throughout.
- Capture IDs before cards leave; do not call `s.perm(alias)` after a bounce/deletion to recover a removed permanent.
- Check all Digi-Egg IDs throughout multiline fixtures, including hand and nested deck entries. Same-line regex is insufficient.
- Public evolution must assert costs, exact stack transitions and known bonus-draw identities. Passing a later end turn erases the memory evidence for evolution cost.
- Q5575 Bukamon unsuspends BEFORE Dan's attack; the final attacker is suspended again. A final unsuspended expectation is wrong.
- Do not retain expected failures caused by invalid fixtures. Diagnose complete state and actual ruling before declaring an engine seam.
- `autoAcceptOptional` does not answer an explicit Alliance prompt. Observe `alliancePrompt` and respond with the public `respondAlliance` intent; BT24-086 contributes inherited Alliance after Mind Link.
- Runtime correction to the original template: current `countMatching` defaults ordinary `youHave`/`opponentHas` filters to battle area; breeding requires explicit inclusion. Read the active primitive before proposing zone changes.
- Isolate inherited watchers: BT24-013 supplies its own discard-triggered evolution after it becomes a source. Use BT24-010 as a neutral level-4 host when isolating009's watcher.
- Ordinary `Filter` does NOT support `namesExact`; use `nameOrTrait: [{ tokens: [name], match: "nameExact" }]`. The `namesExact` spelling is valid inside digivolution requirements, not ordinary source/target/cost filters. Do not hide invalid fields with `as never` or ts-nocheck.
- BT24-086 is The Crossroad Witch, also named Shuu Yulin by its printed Rule (catalog restored in this restart). Q5674 permits it to play itself, but does not limit the inherited Shuu target to self. Never rewrite a generic name-target effect to self-only to compensate for missing catalog identity.
- BT1-010 is NOT inert when publicly played: its On Play reveal can contaminate generic cardRevealed counts. Use two distinct BT1-009 instances for neutral repeated plays; inspect printed effects for every fixture origin.

Run focused vitest with --maxWorkers=1 --no-file-parallelism; lint and format assigned files. Report clauses/Q&A mapping, exact results, remaining gaps and next useful card. Coordinator independently runs acceptance and full gates. Do not claim collection completion.
