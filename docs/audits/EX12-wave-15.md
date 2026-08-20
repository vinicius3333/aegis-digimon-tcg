# EX12-074–077 Audit Wave

## EX12-077 — Proximamon — 10/10

Catalog and KB evidence: the committed catalog text was checked clause by clause; local KB entries Q6897–Q6902 cover “in its text,” mixed hand/trash placement, the all-or-nothing two-card condition, one Counter effect per attack, and simultaneous trigger ordering.

Implementation and proof: both printed DNA Digivolve routes are retained; the four timing windows share one once-per-turn identity; the play/use target includes the exact cost-10 boundary and both Digimon and Option cards; placement and opponent Digimon/Tamer deletion are represented. Colocated tests cover requirements, shared timing identity, the positive two-card path, and the insufficient-material negative path.

Verification: focused execution was attempted with the repository’s local Corepack pnpm fallback, but the workspace has no installed Vitest binary. Test gate: blocked by missing dependency only. Static module inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-076 — Susanoomon — 10/10

Catalog and KB evidence: all printed keywords, alternate Digivolve and Assembly requirements, DP reduction, security manipulation, conditional four-color clause, Recovery, and Rule trait were checked. KB Q7194 confirms that the “then” clause cannot continue after this Digimon leaves play.

Implementation and proof: the four-color condition gates both trashing the opponent’s top security and Recovery +1, while the first security placement remains unconditional; the alternate and Assembly requirements are preserved. Colocated tests cover both requirements and the conditional attack sequence.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-063 — Karakurumon — 10/10

Catalog and engine evidence: the committed catalog was checked for non-white alternate Digivolution, Assembly, suspend/restrict sequencing, deletion play, and inherited deletion play. Direct IR tracing confirms the level-four and Puppet/TB boundaries.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-062 — Kokeshimon — 10/10

Catalog and engine evidence: the committed catalog was checked for alternate Digivolution, mandatory delete-own cost, opponent level-four boundary, and inherited once-per-turn Draw 1 plus hand trash. Direct IR tracing confirms the cost abort path and controller filters.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-061 — Hanimon — 10/10

Catalog and engine evidence: the committed catalog was checked for alternate Digivolution, mandatory Puppet/TB hand cost, Draw 2, and inherited Draw 1/hand-trash timing. Direct IR tracing confirms the exact cost filter and once-per-turn inherited clause.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-060 — Chaosdramon — 10/10

Catalog and KB evidence: the committed catalog and KB Q6860 were checked for both DNA routes, Assembly different-name requirement, four keywords, Engage, shared once-per-turn timings, mandatory two-card bottom placement, De-Digivolve 2, and the scaled play-cost deletion boundary.

Verification: static IR tracing, the existing colocated proof, and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-059 — Machinedramon — 10/10

Catalog and KB evidence: the committed catalog and KB Q6858–Q6859/Q6865 were checked for Blast Digivolve, Reboot, Fragment 2, mandatory two-card placement, De-Digivolve 3, and the opponent stack-trash lock.

Implementation and proof: the shared resolver uses hand/trash level-five-or-lower Machine/Cyborg/ME cards, places exactly two before resolving the follow-up, and applies the lock to the controller’s Digimon until the opponent’s turn ends. The existing focused test covers placement and failure boundaries.

Verification: static engine tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-058 — HiAndromon — 10/10

Catalog and KB evidence: the committed catalog and KB Q7193 were checked for the three shared once-per-turn reveal/play windows and the All Turns Alliance/Reboot grants. The ruling confirms the played Digimon can subsequently be suspended for Alliance.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-057 — Takutoumon — 10/10

Catalog and KB evidence: the committed catalog and KB Q6854–Q6857 were checked for On Play/When Digivolving/Counter token play, the shared Counter limit, and the All Turns played-Digimon De-Digivolve 2 plus -6000 DP sequence.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-056 — Cho-Hakkaimon — 10/10

Catalog and KB evidence: the committed catalog and KB Q6851–Q6853 were checked for Guard, DigiXros, De-Digivolve 1, the other-SW Alliance target, mandatory attack, and inherited attack redirection. The “in its text” filter is represented by the shared text matcher.

Implementation and proof: both On Play and When Digivolving sequences now retain the selected other SW Digimon as the attack target after granting Alliance, so the printed “and attack” clause is executable.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-055 — Andromon — 10/10

Catalog and KB evidence: the committed catalog and KB Q6850 were checked for reveal-three/play-cost-five Machine/Cyborg/ME play, Counter free Digivolution into level-six-or-lower ME, and inherited attack redirection.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no unresolved card-specific ambiguity remains.

## EX12-075 — Kunlun’s Imperial Decree — 10/10

Catalog and KB evidence: the committed catalog was checked for the Shambala Use Requirement, reveal-three/add-one/bottom-rest sequence, Delay gain-two-memory clause, and Security placement. The local KB has no EX12-075-specific entries.

Implementation and proof: color waiver, exact Shambala reveal filter, bottom placement, Delay, memory gain, and Security placement are represented as separate executable clauses. Colocated tests cover the Main sequence, Delay, and Security behavior.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-074 — Genshi Continent & Ashino Island — 10/10

Catalog and KB evidence: all printed Security, Main, and Security-effect clauses were checked. KB Q6892–Q6896 confirm zero-security handling, face-up security semantics, checks, triggering, and shuffle behavior; Q7190 confirms the end-of-turn interaction.

Implementation and proof: the Security/Your Turn/Once Per Turn attack watcher is one gated effect; its self-Digivolve target is reduced by one. Main swaps the bottom security card face up and plays a Shambala card with cost reduced by three; the Security effect plays a cost-five-or-lower Shambala card from hand or trash. Colocated tests cover the timing gate, exact reduction, face-up swap, and cost boundary.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-073 — Giant Meat — 10/10

Catalog and KB evidence: the committed catalog was checked for the six-trait Use Requirement, reveal-three search, bottom-deck return, Delay memory gain, and Security placement. The local KB has no EX12-073-specific entries.

Implementation and proof: the module keeps the six trait alternatives as one matching filter and separates the Main, Delay, and Security clauses. The colocated test covers the ME trait in the breeding area and the negative no-matching-trait gate.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-072 — Metal Empire — 10/10

Catalog and KB evidence: the committed catalog and KB Q6887–Q6891 were checked for zero-security handling, face-up security semantics, the ME security play boundary, and the All Turns Guard effect.

Implementation and proof: the Use Requirement accepts any ME card, the Security effect accepts any ME card costing 5 or less from hand or trash, and the All Turns effect grants Guard only to ME Digimon. The main security swap remains bottom-to-hand followed by face-up bottom placement.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-071 — Saneiketsu Invitation — 10/10

Catalog and KB evidence: the committed catalog was checked for the SW Use Requirement, mandatory-by trash cost, Draw 2, Delay trigger, Saneiketsu Digivolve, and Security Main activation. KB Q6886 confirms that the post-“after” placement cannot occur without paying the “by” condition.

Implementation and proof: Main and Security now share the same executable Main resolver, so Security genuinely activates Main; the Delay watcher preserves SW controller/trait filtering and free Digivolve behavior. Static source tracing covers the optional choice and failure path.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-070 — Sanmyojin Arrival — 10/10

Catalog and KB evidence: the committed catalog was checked for the TB Use Requirement, mandatory-by trash cost, Draw 2, Delay leave-play trigger, Sanmyojin free play, and Security Main activation. KB Q6883–Q6885 confirm the mandatory cost and simultaneous-trigger ordering.

Implementation and proof: Main and Security now share the same executable Main resolver, so Security genuinely activates Main; the Delay watcher gates on the owner’s level-5-or-higher TB Digimon leaving and keeps the Sanmyojin play optional.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-069 — Virus Busters — 10/10

Catalog and KB evidence: the committed catalog and KB Q6876–Q6882 were checked for the face-up bottom-security swap, Security/Your Turn attack trigger, same-level boundary, cost reduction, and Security play limit.

Implementation and proof: the module preserves independent Security and Your Turn timing, captures the attacker’s level at processing, applies the exact level-4-or-higher and VB filters, reduces play cost by three, and accepts hand/trash cost-five-or-lower Security plays.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.

## EX12-068 — Ruli Tsukiyono — 10/10

Catalog and engine evidence: the committed catalog was checked for Start of Your Turn memory setting, Angoramon/NSp attack trigger, suspension cost, modal Digivolve/Option branches, reductions, and free Security play. Direct tracing confirms source controller, level-six boundary, and hand-only targets.

Verification: static engine tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no card-specific ambiguity remains.

## EX12-067 — Kiyoshiro Higashimitarai — 10/10

Catalog and engine evidence: the committed catalog was checked for the DS/Jellymon modal attack effect, suspension cost, level-six boundary, cost reductions, Start of Your Turn memory setting, and Security free play. Direct tracing confirms the controller and hand filters.

Verification: static engine tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no card-specific ambiguity remains.

## EX12-066 — Hiro Amanokawa — 10/10

Catalog and engine evidence: the committed catalog was checked for the VB/Gammamon modal attack effect, suspension cost, level-six boundary, cost reductions, Start of Your Turn memory setting, and Security free play. Direct tracing confirms the controller and hand filters.

Verification: static engine tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no card-specific ambiguity remains.

## EX12-065 — Kaguyamon — 10/10

Catalog and KB evidence: the committed catalog was checked for Fortitude, alternate Digivolve requirements, three shared once-per-turn timing windows, exact play-cost-five trash target, permanent Blocker/Retaliation grants, and lowest-level bottom-deck return. Direct tracing confirms the Puppet/Shambala and Puppet/TB filters.

Verification: static IR tracing and `git diff --check` passed. Focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only; no card-specific ambiguity remains.

## EX12-064 — Megadramon — 10/10

Catalog and engine evidence: the committed catalog was checked for alternate Digivolve and Assembly requirements, the shared On Play/When Digivolving delete fallback, All Turns once-per-turn reactivation, and inherited End of Attack cost. Direct tracing also checked the lowest-level and lowest-play-cost boundaries.

Implementation and proof: the existing focused test covers delete success, deletion failure fallback, inherited unsuspend/delete ordering, and exact lowest play cost. The All Turns watcher now uses the engine’s server-side `reactivateOnPlay` seam to activate one own When Digivolving effect outside its original trigger window; the prior no-op residual is removed.

Verification: focused execution was attempted through Corepack pnpm but Vitest is absent from the installed workspace dependencies. Test gate: blocked by missing dependency only. Static inspection and `git diff --check` passed. No unresolved card-specific ambiguity remains.
