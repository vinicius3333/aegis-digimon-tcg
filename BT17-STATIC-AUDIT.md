# BT17 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT17-001` through `BT17-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. BT16 has complete static
card-by-card coverage but remains open for its deferred execution gates and
recorded limitations; BT17 integration begins only after that static coverage
was recorded. Detailed clause traces are written in English under
`internal-docs/audits/BT17/` and integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT17-001–010 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-001-010.md` | Yes |
| BT17-011–020 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-011-020.md` | Yes |
| BT17-021–030 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-021-030.md` | Yes |
| BT17-031–040 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-031-040.md` | Yes |
| BT17-041–050 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-041-050.md` | Yes |
| BT17-051–060 | Luna assigned | `internal-docs/audits/BT17/BT17-051-060.md` | No |
| BT17-061–070 | Luna assigned | `internal-docs/audits/BT17/BT17-061-070.md` | No |
| BT17-071–080 | Luna assigned | `internal-docs/audits/BT17/BT17-071-080.md` | No |
| BT17-081–090 | Unassigned | `internal-docs/audits/BT17/BT17-081-090.md` | No |
| BT17-091–100 | Unassigned | `internal-docs/audits/BT17/BT17-091-100.md` | No |
| BT17-101–102 | Unassigned | `internal-docs/audits/BT17/BT17-101-102.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn source cases as
   applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color
   cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests,
   typecheck, repository quality gate, and `git diff --check` have passed on
   the delivered commit.

This static pass can award at most provisional 8/10 because component 5 is
deliberately unexecuted. Unsupported or ambiguous behavior may reduce any
other component and is never rounded up. Structural-only assertions do not
receive full behavioral credit unless they drive the relevant production
behavior. Manual event-bus or timing injection does not substitute for a
feasible natural originating event.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT17-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal Agumon stack naturally attacks, pays one memory, deletes the exact 3000-DP boundary, and preserves a higher-DP target/no-target payment negative (`04068ae99`). |
| BT17-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2702 simultaneous and separate stack plays prove source-zone/controller filters and once-per-turn draw frequency with normal/opponent-play negatives (`9af7d1343`). |
| BT17-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2703 Tamer placement, kind/host/turn negatives, and repeated-placement frequency trace through the inherited self-bound watcher (`4883e66d0`). |
| BT17-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal Argomon and non-Argomon green stacks prove the opponent-turn inherited Blocker name condition (`dd9b9c89d`). |
| BT17-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal black Unidentified and non-Unidentified stacks prove the deletion snapshot trait gate and inherited memory gain (`84d4b8f9e`). |
| BT17-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2704–Q2705, natural Tamer placement, legal SoC trash evolution, and wrong-kind/wrong-host negatives prove the inherited watcher and requirement enforcement (`a90918c50`). |
| BT17-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2706–Q2709, natural main-phase recovery, legal end-turn DNA, exact partner/result selectors, and non-DNA rejection are covered (`c528b2e29`). |
| BT17-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2710–Q2714, natural Calumon/Takato trigger, delete/no-delete branches, and inherited numeric DP-ceiling increase at nonpositive memory are covered (`f1093d57c`). |
| BT17-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2715–Q2717 exact dual reveal filters/remainder and a natural inherited battle-deletion Tamer play are proved with legal Hybrid fixtures (`615804154`). |
| BT17-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2718–Q2722, natural delete/fallback branches, legal evolution, and inherited numeric deletion-ceiling increase match the direct IR (`024ea314d`). |
| BT17-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2723–Q2731 and Q4657/Q6554–Q6555 are proved through natural Tamer and BurningGreymon evolution stacks, AncientGreymon follow-up, end-turn deletion, and inherited DP behavior (`4cfa303c4`). |
| BT17-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural attack proves Raid publication and the reduced-cost Hybrid evolution while preserving the legal attacking source stack (`346570295`). |
| BT17-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution covers the 6000-DP boundary and no-delete Security Attack branch, while a Gallantmon host proves the inherited effect-deletion unsuspend (`6cd6d9881`). |
| BT17-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the effect-driven Tamer evolution to use runtime-consumed `virtualBase`; a natural Main effect proves material placement, exact cost, legal stack, and deletion (`fd1473221`). |
| BT17-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Q2743's legal empty Gabumon branch with scoped `allowNoTarget` preflight; natural play/evolution/security flows prove both modal outcomes and inherited behavior (`bbc9669ad`). |
| BT17-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and attack paths prove deletion and no-delete DP/Blocker behavior on a legal red level-5 stack without manual timing injection (`60422e7ce`). |
| BT17-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion, On Play/evolution deletion, trash returns, free Tamer play, and public DigiXros with both named materials prove the full IR (`4ecc9ec1c`). |
| BT17-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural attack counter window proves Blast Digivolution on a Gallantmon stack; aggregate-DP deletion and 20-card trash scaling prove both remaining clauses (`e9b8ecb7f`). |
| BT17-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A complete turn proves the Matt-conditioned draw and a legal two-material end-turn DNA stack proves the inherited evolution requirement (`d30c454c0`). |
| BT17-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal and inherited attack flows prove dual-category selection, bottom-deck remainder, reduced-cost Tamer play, and the Security-only negative boundary (`955a83bc5`). |
| BT17-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the named Seasarmon placement filter so the legal level-4 card is eligible; natural play/stack proof covers placement, draw, and inherited Jamming memory (`fe17fed19`). |
| BT17-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Tamer-onto legality to preserve the printed yellow base color; legal/illegal Tamer cases, AncientGarurumon evolution, and delayed deletion use real stacks (`2d86c351b`). |
| BT17-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural yellow-Tamer and Lobomon evolution paths plus a real attack prove the reduced Hybrid evolution and inherited draw boundaries (`4097dfe16`). |
| BT17-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play and legal evolution flows prove level-3 blue placement, draw sequencing, and observable Jamming grant (`2963d8f60`). |
| BT17-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected delayed return binding to the effect-played Digimon; natural evolution/play and a complete opponent turn prove the return, inherited bounce, and Dark Animal trait (`4b37e1b8a`, `0bb898bab`). |
| BT17-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the hand effect with a bound Koji host, routed Hybrid placements, and runtime virtual base; public activation proves one legal stack and exact cost (`d8d38b784`). |
| BT17-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution covers both modal branches and a public attack proves the Omnimon-stack inherited unsuspend (`fb910f079`). |
| BT17-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play bounce triggers the hand-add watcher and security move; legal evolution and deletion/Tamer flows cover the remaining clauses (`1d6b620ba`). |
| BT17-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A public attack proves Tamer-suspension draw and a natural security battle observes the inherited opponent-security DP reduction (`b1bef3155`). |
| BT17-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turn runners prove both start-of-main security branches with Leon placement; legal Bibimon and Pulsemon-text stacks cover the static identity (`e9c1076e0`). |
| BT17-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural cost-2 Option use supplements reveal/add and legal Renamon-family stack proof for the inherited Security Attack reduction (`9fb154581`). |
| BT17-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal and blocked Rika flows plus natural inherited Option use prove the conditional play and watcher boundaries (`fa3c5f4ce`). |
| BT17-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A yellow-Tamer attack and natural security battle prove the +3000 DP cost and inherited security-Digimon -3000 DP (`c6eadd4b2`). |
| BT17-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the watcher to actual card trash from own security; normal-check and security-to-hand cases distinguish true trash from relocation (`5875b1a80`). |
| BT17-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Option OR filtering, uncapped Plug-In cost, and multi-color eligibility while preserving color requirements; natural evolution proves reduced payment (`f66e6d0ce`). |
| BT17-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added and typed the effect-only security-trash event; a natural End of Attack cost drives the Leon-stack free evolution (`824d64441`, `da9026c33`). |
| BT17-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A real Option deletes a red/yellow Tamer and naturally drives Marcus placement from trash to security on a legal stack (`b8834c559`). |
| BT17-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected consumable Option OR filters, uncapped Plug-In and yellow cost-5 branches; legal and color-illegal natural uses cover the boundary (`349b9204b`). |
| BT17-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural opponent Option return proves the leave-play replacement, Tamer cost, and persistence on a legal evolution stack (`f4736e59c`). |
| BT17-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turns prove both exact-three end-turn branches and attack tail; a real opponent attack proves inherited security-removal -8000 DP (`c5042eb3f`). |
| BT17-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and attack flows prove free Tamer play, per-Tamer DP loss, and suspended-Tamer Security Attack scaling (`b54492bfb`). |
| BT17-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal selects Argomon and Rhythm independently, bottoms the remainder, and a deletion flow proves inherited memory (`9f2ea540a`). |
| BT17-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | BT17-049 naturally effect-plays Terriermon to trigger the watcher; a real suspended host proves the inherited +1000 DP aura (`a8fef5d1e`). |
| BT17-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural Eosmon play drives the inherited legal evolution on a Morphomon stack while preserving printed requirements (`bc87bcba7`). |
| BT17-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Argomon evolution proves the no-Rhythm conditional free play and inherited deletion memory (`44b36d999`). |
| BT17-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle deletion naturally plays Terriermon from trash and a legal host attack proves inherited suspended +1000 DP (`233635ac8`). |
| BT17-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security play/suspension and a real inherited battle deletion prove the once-per-turn unsuspend (`c2e578a63`). |
| BT17-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the inert Tamer reducer and missing Argomon requirement; natural reduced evolution, deletion count, free play, and Rhythm unsuspend cover the shared path (`19f31685f`). |
| BT17-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate evolution/free Terriermon play and an inherited attack delete-and-replay flow prove Alliance-family stack behavior (`97fb0d676`). |
| BT17-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand activation proves four-memory payment, placement, linked host attack, and inherited +3000 DP on a legal host (`b9485a9a8`). |

## Aggregate

- Catalog cards: 102
- Assigned: 80
- Integrated card audits: 50
- Corrected: 11
- Provisional: 50
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 22

BT17 static re-audit is in progress.
