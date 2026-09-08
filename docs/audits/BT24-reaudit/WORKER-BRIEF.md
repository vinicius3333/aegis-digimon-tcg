# BT24 resumed audit worker brief

Armor Purge refusal, like Raid refusal, is a `selectCards` decision with minimum zero, not an `optional` decision. `autoDeclineOptional` combined with `autoSelectCards` still ACCEPTS purge. Answer the public zero-card selection explicitly; see combat/controller.ts and primitives.ts. A missing `autoChooseOption` can also leave effect-driven evolution pending despite a silent `settle` timeout; inspect unresolved decisions before claiming source-stack corruption.

Latest acceptance traps: `it.fails` accepts ANY assertion failure, including an illegal first evolution or missing deck causing deck-out. Report the literal first failing assertion before naming an engine seam. A public sequence must assert its first successful endpoint before testing frequency. In a battle-based negative for optional Decode, accept optional decisions so refusal cannot mask an incorrectly offered effect. To prove Jamming, security DP must exceed host DP and assertions must follow combat resolution, not initial security extraction. Harness `under` arrays are bottom-to-top, like the resulting `Permanent.stack`.

Read `.agents/skills/verify-card-implementation/SKILL.md` and the full template `.agents/skills/audit-card-set/references/worker-brief.md` first. Work in this shared worktree. English reports. User explicitly requests Luna workers, overriding the default model in the audit skill.

Audit one assigned card at a time against `packages/shared/src/cards/data/cards.json`, `node tools/kb/query.mjs card <ID>`, applicable local comprehensive rules, its direct module, tests and existing report. Existing report claims are unverified. Exemplars: BT24-015.test.ts, BT24-016.test.ts, BT24-017.test.ts; inspect critically rather than copying gaps. Base: a924de971e0b43ad9ebd8f82a454d495ff880a60. Main merged at da5c7733c.

Use public intents and natural timing, exact zone identities, costs, stack, refusal, boundary, same-turn OPT and real next-turn reset proofs. No eggs in deck/security. Injected timing earns no behavioral credit. Executable registration exclusively registerIrCard, never a second registerCard. Follow all template evidence standards.

Only edit the assigned card module, colocated test and report. Never edit engine/shared/catalog/ledger/coordinator notes or another card. No git writes. Engine gaps: retain explicit named failing proof and report the smallest seam to coordinator. No implementation mirroring or weakening assertions. Report honest rubric 0–2 each, delivery always 0; maximum 8/10.

## Acceptance traps found in this restart

- Digi-Egg evolution fixtures belong in `breeding`, never `battleArea`; normal and alternate proofs must retain that legal zone. Put named bonus draws in the initial Board Spec `deck`; `s.give` does not accept `"deck"` as a CardZone.
- Security top is index 0, not the last array entry. Use named main-deck Digimon for inert checks; Option security text can change the scenario.
- `runOneTurn` owns phase transitions. For separately driven turns, set the next `turnSeat` and a positive memory value only between completed turns. Do not force a phase or cast `"Start"` into the Phase type. End and await the first real turn before starting the next.
- New entrant currentDP now includes active player-wide modifiers (a7fe32568); Minervamon Q5629 proves public effect ordering and deferred zero-DP deletion. Do not reintroduce the old printed-DP expectation. Separate DNA entry remains outside this mechanism's proof.
- `preferInstanceIds` is a membership set, not an ordered ranking (harness.ts selection comparator). To select a different target later, replace the list contents; unshifting a second target while retaining the first leaves both equally preferred. Already-suspended Digimon may remain legal Suspend targets. Do not infer an OPT failure from selection of the first target again.
- Fortitude is mandatory (CR16-27-3); do not invent a refusal prompt. A top card's own Barrier is not inherited unless its inherited text grants it.
- Ordinary security attacks finish with `securityChecked` plus `!observe(engine).isAttacking()`; `combatResolved` is supplied by Digimon battle resolution. Assert the relevant completion event and final state explicitly. Do not wait for two combatResolved events when only one attack was a Digimon battle.
- A public play with no eligible placement-cost card proves an unavailable-cost boundary, not that On Play only works for effect-play. Keep test comments faithful to the printed trigger.
- Barrier has its own `barrierPrompt` / `respondBarrier` decision. Generic optional automation does not answer it. Use a neutral higher-level host to isolate an inherited keyword.
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

- Evolution bonus draw precedes When Digivolving reveals. Put a separate named draw card before the reveal pool and assert both the draw and the played/revealed destinations.
- Playing a digivolution source creates a new permanent; it does not promote that source to the original host's top card. Assert the original host and neighboring stacks remain correct.
- Public battle-area attack targets use `kind: "permanent"`, not `kind: "digimon"`; runtime acceptance alone does not prove a typed legal intent.
- A real turn with a playable hand may stay in Main. Await Main and explicitly end it before awaiting End of Turn effects or the turn promise.
- Calling From the Darkness returns up to two Purple Digimon. In Q5648, both the Hackmon host and Raidramon link qualify: manually return only the host to prove cancellation while the link remains in trash. Auto-selecting both does not isolate the ruling.
- Thresholds based on trash count must include battle-deleted Digimon and checked security, not only cards milled by the audited effect. SkullSatamon's repeated-attack fixture starts at six, reaches nine after mill plus one battle deletion, then ten after the second battle deletion before next-turn reset.
- The first owner turn in these fixtures skips its normal draw; the next owner turn does not. Name mill and natural-draw cards according to their actual deck positions. Never alter expected IDs to mirror the observed array without explaining the sequence.
- `settle` can time out silently. Assert its intended endpoint, and do not use a pre-existing event or unchanged deck length as proof that a new effect has completed.
- When one printed cost pays for multiple independent actions, do not make the first action's target a prerequisite for every action.075's original cost-bearing level-3 Delete suppressed the independent level-4 Delete. The existing typed `CostGatedBlock` expresses the single payment without weakening global no-target preflights. Require red/green public proof before making such a representation change.
- A `securityChecked` event has `revealedCardId`, not a nested `card` object or instance ID. Assert the event count separately, and use independently named security/trash instances for exact zone proof.

Run focused vitest with --maxWorkers=1 --no-file-parallelism; lint and format assigned files. Report clauses/Q&A mapping, exact results, remaining gaps and next useful card. Coordinator independently runs acceptance and full gates. Do not claim collection completion.
