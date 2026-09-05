# BT17 Static Card Implementation Re-audit

Status: superseded by the completed runtime audit in `BT17-AUDIT.md`

This file and the range reports under `internal-docs/audits/BT17/` are retained
as historical notes from the provisional static pass. The final scores,
executed gates, and resolved limitations are recorded in `BT17-AUDIT.md`.

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT17-001` through `BT17-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. BT16 has complete static
card-by-card coverage but remains open for its deferred execution gates and
recorded limitations; BT17 integration begins only after that static coverage
was recorded. Detailed clause traces are written in English under
`internal-docs/audits/BT17/` and integrated here only after review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT17-001–010 | Reviewed | `internal-docs/audits/BT17/BT17-001-010.md` | Yes |
| BT17-011–020 | Reviewed | `internal-docs/audits/BT17/BT17-011-020.md` | Yes |
| BT17-021–030 | Reviewed | `internal-docs/audits/BT17/BT17-021-030.md` | Yes |
| BT17-031–040 | Reviewed | `internal-docs/audits/BT17/BT17-031-040.md` | Yes |
| BT17-041–050 | Reviewed | `internal-docs/audits/BT17/BT17-041-050.md` | Yes |
| BT17-051–060 | Reviewed | `internal-docs/audits/BT17/BT17-051-060.md` | Yes |
| BT17-061–070 | Reviewed | `internal-docs/audits/BT17/BT17-061-070.md` | Yes |
| BT17-071–080 | Reviewed | `internal-docs/audits/BT17/BT17-071-080.md` | Yes |
| BT17-081–090 | Reviewed | `internal-docs/audits/BT17/BT17-081-090.md` | Yes |
| BT17-091–100 | Reviewed | `internal-docs/audits/BT17/BT17-091-100.md` | Yes |
| BT17-101–102 | Reviewed | `internal-docs/audits/BT17/BT17-101-102.md` | Yes |

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
| BT17-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the opposing-Tamer unsuspend restriction into a live standing lock; natural Argomon placement, DP scaling, and level-budget deletion prove the remaining clauses (`4f5f82528`). |
| BT17-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Two natural Kosuke plays prove the once-per-turn memory/draw watcher and a legal Machine host proves inherited Reboot (`15b6bf2bd`). |
| BT17-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent level-5 play, level-4 negative, and legal-host battle deletion prove free Infermon evolution and inherited token creation (`7999db3e1`). |
| BT17-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal proves the Machine alternative and trash remainder; a legal Machine attack opens the forced Collision block path (`2ba3c2f68`). |
| BT17-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution proves De-Digivolve and the live attack restriction through later evolution; a real Diaboromon play drives the inherited watcher (`0fb20f41e`). |
| BT17-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Diaboromon redirection emits the target-switch event, drives reveal/placement/free evolution, and proves the redirect once-per-turn boundary (`3a9ae0aa6`). |
| BT17-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry proves stack placement and seven-cost deletion budget; a real opponent effect proves the two-source leave replacement on a legal stack (`f0d927fe0`, `e769bbff9`). |
| BT17-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal/placement and attack End of Attack prove own-stack Machine play while preserving the GroundLocomon host (`9d964d1e9`). |
| BT17-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution places Doomsday Clock and creates two tokens; two opponent attacks prove redirect and its once-per-turn boundary (`351041b9f`). |
| BT17-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural hand play proves trash-based cost reduction/bottom-deck movement, exact 15-cost deletion budget, keywords, and unsuspended-target attack permission (`672038d4d`). |
| BT17-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves own-Digimon cost and level-4 deletion boundary; a losing battle on a real stack proves inherited Retaliation (`504420d75`). |
| BT17-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks independently prove Kosuke and opposing level-6 conditions, exact-cost Dorugoramon evolution, negatives, and inherited Reboot (`8ea1ac5e9`). |
| BT17-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal Hippo and non-Hippo evolutions prove draw/trash ordering and the Murmukusmon branch; a battle proves inherited Retaliation (`117d70013`). |
| BT17-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the no-source attack condition and exact defender binding; natural positive and sourced-target negative attacks prove Q2816 behavior (`23aa9a436`). |
| BT17-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected trash replacement to prevent only after successful free evolution and normalized Reboot; natural accept/no-source cases prove the deletion boundary (`bddc1acb7`). |
| BT17-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Darcmon evolution proves free level-3 Purple/Yellow play and decline/ineligible boundaries; legal stacks prove both Blocker clauses (`489fdf241`). |
| BT17-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural replacement accept/decline and a real inherited attack prove source evolution, chosen-own deletion, and opposing level boundary (`f85bbada3`). |
| BT17-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effect deletion and battle negative prove cause gating; a real attack proves Dark Masters placement/DP gain and natural reveal proves treated levels (`a4ff71e97`). |
| BT17-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the inherited turn threshold to the shared minimum-memory primitive; natural plays, complete turns, deletion boundary, and delayed return prove all clauses (`4d755b0c2`). |
| BT17-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove Dark Masters placement and level deletion; a public attack returns seven trash cards, routes the Digi-Egg, and unsuspends (`fa14c9126`). |
| BT17-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the stack-name gate to require both Darcmon and HippoGryphonmon; legal positive and missing-name negative stacks prove the boundary (`4e0bb4f1a`). |
| BT17-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and companion/no-companion cases prove deletion and the level-6 aura (`05553d7b2`). |
| BT17-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion and Dorugoramon attack flows prove the inherited unsuspend and trash replacement (`f1a5220cc`). |
| BT17-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected redirect targeting to require an unsuspended Eosmon; natural evolution, play branches, opponent response, and attack redirection prove the clauses (`2353534c8`). |
| BT17-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution covers both Tamer branches and cross-player De-Digivolve scaling; a real attack proves inherited redirection (`13fdcf96d`). |
| BT17-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and attack prove Eosmon play, relative-DP deletion, the shared once-per-turn key, and the Tamer aura (`a47d8a4f4`). |
| BT17-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and attack flows prove digivolution-card trashing, the non-DNA branch, bare-target return, and unsuspend (`5aca71335`). |
| BT17-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural normal play and legal WarGreymon/MetalGarurumon DNA prove unconditional deletion and the same-level return branch (`cf13ff397`). |
| BT17-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security, full-turn memory-event, and legal inherited-host cases replace manual timing evidence (`94efe3124`). |
| BT17-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security, start-main, end-turn placement/evolution, and decline flows prove all branches (`261b934a3`). |
| BT17-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected both play and digivolution watchers with independent Greymon/Garurumon provenance gates; natural play/evolution cases prove each branch and their combined memory result (`3d5f6b09f`). |
| BT17-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the suspension cost to this exact Minami; natural play, start-main, and response-window flows prove the self-bound cost and memory threshold (`652c5454b`). |
| BT17-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed the unsupported Main action and added Digimon-effect provenance; a natural draw source and production turn runner prove the inherited watcher and start-turn threshold (`794fd67fd`, `14358650c`). |
| BT17-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected recovery to the battle-deleted subject's own stack; natural battle deletion and alternate-stack negatives prove stable host binding (`a01764c99`). |
| BT17-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Bound all materials and grants to one selected Renamon and gated the optional Sakuyamon evolution behind the shared cost; natural activation proves the complete sequence (`8df645212`). |
| BT17-086 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Restricted inherited Leon recovery to the hosting Digimon's own stack; natural evolution and leave-play flows prove stack locality (`e3a875c64`). |
| BT17-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Bound every temporary grant to one selected Marcus while retaining Tamer/Digimon dual-kind behavior; natural play and attack paths prove the binding (`237c58a83`). |
| BT17-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Restricted the suspension cost to this exact Willis; natural play, start-main, and Terriermon-triggered evolution prove the independent legal evolution target (`f3c2bb542`). |
| BT17-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A real effect-driven suspension proves Rhythm's optional self-suspension, memory, Argomon draw, and combat-driven negative without production changes (`2232d5664`). |
| BT17-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added effect-driven own-Digimon provenance and corrected the suspended end-of-opponent-turn condition; natural Mind Link and legal trash evolution prove both watchers (`9ac1c059a`). |
| BT17-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Replaced generic placement with Mind Link; natural activation, stack guard, inherited keywords, end-turn stack play, and Security prove the full contract (`d2f3a6ecf`). |
| BT17-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Replaced inert restriction with a live Eosmon-gated Aura and excluded the leaving subject from its own replacement cost; natural play and deletion flows prove both (`0776174fe`). |
| BT17-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural hatch and production turn-end flows prove suspension/memory, self return, draw, replacement Tamer play, and Security (`60dfe7aa8`). |
| BT17-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected both OR filters and the inherited-effect Security predicate; natural waiver, return/play, and Security flows prove the branches (`4c45f0a4a`). |
| BT17-095 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Natural Main, Delay arming, and Security origins are proved, but later Delay DNA activation cannot retain the exact leaving Digimon through a durable source reference (`bd85514b3`, `69f414891`). |
| BT17-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main, opponent level-5 play, public Delay activation, legal Gallantmon evolution, and Security activation prove all clauses (`96172698f`). |
| BT17-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reduced Free evolution, source-bound opponent-effect replacement into Imperialdramon, and Security Davis/Ken play prove the existing hand-fixed IR (`50d352f63`). |
| BT17-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal, public Delay activation, exact host-top-card security placement, and Security repeat prove the full Option flow (`52371181d`). |
| BT17-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main, Tamer deletion and return origins, public Delay evolution into ShineGreymon, and Security prove both watcher branches (`1f7e49a3b`, `467f6f68e`). |
| BT17-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected stack-aware Clock exclusion; natural Security, opponent-effect replacement, opponent-turn end, and four-clock start-turn win prove all clauses (`6eaebaf3c`, `d8c65a86c`). |
| BT17-101 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Trash-origin DNA targeting and added opponent-seat memory semantics; natural attack/security behavior exists, but the corrected DNA and seat-aware paths lack natural behavior-driving source proof (`42521bb18`). |
| BT17-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the Agumon alternate route and effective dynamic stack names; legal evolution, Koromon boost, independent deletion, Tamer play, and hatch fallback have natural proof (`1babf1d33`, `baf11410f`, `c53c801f5`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 32
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 2 (`BT17-095` durable Delay DNA source binding; `BT17-101` natural source-proof gap for corrected DNA/opponent-seat memory paths)
- Remaining unassigned: 0

BT17 static card-by-card coverage is recorded. The collection remains open for
the two scored limitations above and all deliberately deferred execution gates;
no collection-complete or 10/10 claim is made.
