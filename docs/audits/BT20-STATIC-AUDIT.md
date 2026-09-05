# BT20 Static Card Implementation Re-audit

> Historical pre-execution report. Its provisional scores, deferred-gate statements, and
> catalog-drift notes are preserved as an audit trail and are superseded by
> `docs/audits/BT20-AUDIT.md` and `apps/api/src/cards/BT20/AUDIT.md`. Final result: 102/102 cards
> at 10/10, 564/564 collection tests, 916/916 affected mechanism tests, and a synchronized
> 102-card persisted catalog.

Status: historical pre-execution report; superseded by the completed BT20 audit

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT20-001` through `BT20-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT20 workers may prepare static range
Evidence in five parallel Luna lanes. BT19 static coverage is now recorded,
so accepted BT20 ranges may be integrated in strict ascending order. Detailed
English reports belong under `internal-docs/audits/BT20/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT20-001–010 | Reviewed | `internal-docs/audits/BT20/BT20-001-010.md` | Yes |
| BT20-011–020 | Reviewed | `internal-docs/audits/BT20/BT20-011-020.md` | Yes |
| BT20-021–030 | Reviewed | `internal-docs/audits/BT20/BT20-021-030.md` | Yes |
| BT20-031–040 | Reviewed | `internal-docs/audits/BT20/BT20-031-040.md` | Yes |
| BT20-041–050 | Reviewed | `internal-docs/audits/BT20/BT20-041-050.md` | Yes |
| BT20-051–060 | Reviewed | `internal-docs/audits/BT20/BT20-051-060.md` | Yes |
| BT20-061–070 | Reviewed | `internal-docs/audits/BT20/BT20-061-070.md` | Yes |
| BT20-071–080 | Reviewed | `internal-docs/audits/BT20/BT20-071-080.md` | Yes |
| BT20-081–090 | Reviewed | `internal-docs/audits/BT20/BT20-081-090.md` | Yes |
| BT20-091–100 | Reviewed | `internal-docs/audits/BT20/BT20-091-100.md` | Yes |
| BT20-101–102 | Reviewed | `internal-docs/audits/BT20/BT20-101-102.md` | Yes |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT20-001 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural continuous boundaries prove the four-source and turn-scope clauses; the fixture stack is not fully catalog-legal (`cc3e0f987`). |
| BT20-002 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural attacks prove draw and trigger boundaries, but the negative cross-color stack is not catalog-legal (`cc3e0f987`). |
| BT20-003 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | End-turn behavior is manually fired and current host fixtures are synthetic despite correct placement/gating structure (`cc3e0f987`). |
| BT20-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural ACCEL play drives a legal reduced-cost Pinamon-to-Liamon evolution and negative boundary (`cc3e0f987`). |
| BT20-005 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural attacks distinguish pre-existing face-up security for Jamming, but the behavior stack is cross-color (`cc3e0f987`). |
| BT20-006 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural battle deletion proves Ghost recovery and exclusion, while the inherited host stack is not fully legal (`cc3e0f987`). |
| BT20-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Start-main payment/decline uses direct timing; the legal inherited stack and DP scope remain observable (`cc3e0f987`). |
| BT20-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Start-main name/trait payment uses direct timing; the legal inherited aura scope is observable (`cc3e0f987`). |
| BT20-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural purple play drives a legal reduced-cost Free evolution and inherited turn boundary (`cc3e0f987`). |
| BT20-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolutions prove battle-area-only Ginryumon reduction and inherited DP on a legal stack (`cc3e0f987`). |
| BT20-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves deletion, paid DNA evolution, source continuity, and inherited DP on a legal Free route (`175a52725`). |
| BT20-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack evolves a legal Ryudamon/Ginryumon stack into Hisyaryumon with paid alternate cost (`175a52725`). |
| BT20-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main activation proves reduced Sistermon play, matching, frequency, and inherited allied aura (`175a52725`). |
| BT20-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry deletion and inherited Alliance are natural, but feasible end-turn evolution remains manually timed (`175a52725`). |
| BT20-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural in-attack evolution proves breeding placement, Chronicle path, modifiers, and inherited security suppression (`175a52725`). |
| BT20-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and deletion paths prove bound buffs, optional attack, paid DNA replacement, and inherited Security Attack (`175a52725`). |
| BT20-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and allied play prove the canonical token, 8000-DP boundary, once-per-turn watcher, and optional attack (`175a52725`). |
| BT20-018 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected either-stack Security removal direction; the central security/inherited clauses still use explicit subtrigger timing (`36a33e645`). |
| BT20-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Jesmon evolution proves independent immunity/attack branches, auras, exact peers, and legal inherited stack (`175a52725`). |
| BT20-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected opponent-stack Security removal direction; restriction and watcher proof retain explicit timing seams (`dc63d9aa3`). |
| BT20-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Royal Knight stack scaling to include Option cards; entry/attack behavior remains manually timed (`c62d1538a`). |
| BT20-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Battle protection and inherited draw state are observable after manually fired entry/attack timings (`b910cfb4f`). |
| BT20-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural green Dracomon-text play drives reduced Wingdramon evolution; Jamming and inherited DP boundaries are observable (`b910cfb4f`). |
| BT20-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Return, stack-gated Tamer lock, and inherited draw are observed through manually fired entry/attack timings (`b910cfb4f`). |
| BT20-025 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 7/10 provisional | Entry deletion is manually fired and no natural Examon DNA path proves the field-only alias/level treatment (`b910cfb4f`). |
| BT20-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry return/restriction is manually fired; the inherited attack-target restriction uses a natural attack (`b910cfb4f`). |
| BT20-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion/prevention behavior is covered, but the feasible Security-removal watcher remains injected (`b910cfb4f`). |
| BT20-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural digivolution and stack-source play prove the watcher, condition boundary, De-Digivolve, and keywords (`b910cfb4f`). |
| BT20-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Pulsemon name-only matching with legal SEEKERS positive/text-only negative; inherited timing remains injected (`adb60c364`). |
| BT20-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves independent reveal selectors and bottoming; live stack state proves inherited-only Barrier (`b910cfb4f`). |
| BT20-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry paths prove -3000 DP, but inherited Barrier remains observational rather than behavior-driving (`1fdfbef5a`). |
| BT20-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves ordered Security take/recovery boundaries and natural battle proves inherited memory (`1fdfbef5a`). |
| BT20-033 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the second debuff to reuse the selected LoaderLeomon target; suppression boundaries remain unexecuted (`209ee634a`). |
| BT20-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Inherited Security trash is natural, but Tamer placement and Fortitude remain injected or observational (`1fdfbef5a`). |
| BT20-035 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Tamer-placement and Security-removal paths are injected while Fortitude is structural despite feasible natural origins (`1fdfbef5a`). |
| BT20-036 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the follow-up attack to bind the actual DNA result; the feasible end-turn origin remains manually fired (`cf95fc6e1`). |
| BT20-037 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution proves scaling and locks, but Partition still uses a manually driven deletion seam (`1fdfbef5a`). |
| BT20-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle/breeding evolutions prove zone-scoped reduction; natural combat proves inherited Piercing (`1fdfbef5a`). |
| BT20-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove one-target suspension and natural combat proves inherited Piercing (`1fdfbef5a`). |
| BT20-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural qualifying play drives reduced Groundramon evolution; Raid and inherited DP are behavior-driven (`1fdfbef5a`). |
| BT20-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play and inherited attack prove the main effects, but the When Digivolving origin remains structural (`da5e3f48a`). |
| BT20-042 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play and inherited battle deletion prove the main effects; When Digivolving and DNA eligibility remain observational (`da5e3f48a`). |
| BT20-043 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reduced play proves the entry sequence, but the end-turn DNA origin is manually fired (`da5e3f48a`). |
| BT20-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play and resident/inherited battle watchers are covered, while When Digivolving remains unproved naturally (`da5e3f48a`). |
| BT20-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Blast DNA and either-player suspension prove the tied-highest return and once-per-turn unsuspend (`da5e3f48a`). |
| BT20-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle/breeding evolution attempts prove the zone-scoped reduction; a legal inherited host proves all-turn DP (`da5e3f48a`). |
| BT20-047 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural combat proves Blocker, but Reboot relies on direct active-phase seam invocation (`da5e3f48a`). |
| BT20-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal/evolution paths prove both selectors, alternate evolution, and opponent-turn inherited DP (`da5e3f48a`). |
| BT20-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and an opponent attack prove exact targeting and the player-attack restriction (`da5e3f48a`). |
| BT20-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution proves next-face-down security handling, but End of Attack is manually fired (`da5e3f48a`). |
| BT20-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution paths prove both alternate routes, Tamer-count boundaries, decline, and inherited turn scope (`4eedb125b`). |
| BT20-052 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural face-up security checks and inherited scope are covered, but Security entry timing is manually fired (`4eedb125b`). |
| BT20-053 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected both entry branches to bind immunity to the DP-selected Digimon; the during-attack entry origin remains manually fired (`d6dbed6a9`). |
| BT20-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected replacement candidates to Bulbmon's own stack; the opponent-origin leave path remains direct (`ce96ba68e`). |
| BT20-055 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry effects and face-up checks are covered, but Security entry timing is manually fired (`4eedb125b`). |
| BT20-056 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Recovery and turn gates are natural; attack evolution, security removal, and leave prevention use manual helpers (`4eedb125b`). |
| BT20-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution paths prove reduction boundaries, both free-evolution sources, decline, and keywords (`4eedb125b`). |
| BT20-058 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected replacement candidates to Raidenmon's own stack; the leave replacement still originates from a direct delete (`5a9cf609f`). |
| BT20-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution proves De-Digivolve, stack-gated immunity, resident turn scope, and inherited Jesmon GX boundaries (`4eedb125b`). |
| BT20-060 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution/Blast DNA prove entry ordering, while either-stack security removal remains manually fired (`4eedb125b`). |
| BT20-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate evolution and reveal flow prove both selectors; a legal host proves inherited turn-scoped DP (`ff6ff22b1`). |
| BT20-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural combat proves Retaliation and both paid inherited-deletion branches with exact level boundaries (`ff6ff22b1`). |
| BT20-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves both reveal selectors; natural combat distinguishes inherited memory gain from standalone (`ff6ff22b1`). |
| BT20-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate evolutions and reveal flow prove both selectors; a legal host proves inherited turn-scoped DP (`ff6ff22b1`). |
| BT20-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and combat prove the paid granted On Deletion memory effect and unavailable-cost boundary (`ff6ff22b1`). |
| BT20-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove level-3 deletion, turn-gated paid DNA, legal material stacks, and inherited Retaliation (`ff6ff22b1`). |
| BT20-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry paths prove Retaliation grants; natural combat proves inherited paid deletion and level boundary (`ff6ff22b1`). |
| BT20-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution proves the 0/1/2-Tamer and decline boundaries; natural combat proves inherited memory (`ff6ff22b1`). |
| BT20-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove Trash-then-grant processing and empty-hand continuation; a legal host proves inherited DP (`ff6ff22b1`). |
| BT20-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate routes and entry paths prove paid recovery and decline; a legal host proves inherited turn-scoped DP (`ff6ff22b1`). |
| BT20-071 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the optional hand-trash gate for Raid/DP; the Tamer placement watcher still uses a direct placement verb (`fdf25ed1d`). |
| BT20-072 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Execute and replay boundaries are covered, but both deletion origins use a direct deletion verb (`ba25e0fc5`). |
| BT20-073 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution prove the paid deletion branches; inherited De-Digivolve starts from direct host deletion (`ba25e0fc5`). |
| BT20-074 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected deck-return replacement binding after DNA; the distinctive watcher still starts from direct return verbs (`465cf72bb`). |
| BT20-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove Trash-then-grant continuation and exact inherited trait/hand-size boundaries (`ba25e0fc5`). |
| BT20-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution/Blast DNA prove deletion boundaries, exact materials, Fighter Mode sources, and invalid routes (`ba25e0fc5`). |
| BT20-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry paths prove tracked hand trash, scaled free play, both trait arms, and continuous keyword/DP scope (`ba25e0fc5`). |
| BT20-078 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural battle proves one On Deletion target, but the effect-Digivolution watcher remains structural and one boundary is manually timed (`ba25e0fc5`). |
| BT20-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and losing battle prove lowest-level deletion and both Ghost replay origins (`38c801cfe`). |
| BT20-080 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the name-only Soloogarmon route; natural evolution and legal inherited security proof leave Tamer reactivation structural (`7fc681d01`). |
| BT20-081 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Exact Blast DNA, two-target DP, stack-Tamer deletion, and paid reactivation are structural only (`4672ec314`). |
| BT20-082 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Exact three-card leave replacement and tied-lowest end-turn deletion have only structural source proof (`4672ec314`). |
| BT20-083 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected inherited Omekamon play to the source's own stack; all printed behaviors remain structural (`2ee8c5f84`). |
| BT20-084 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Trash-origin evolution, suspension lock, and end-turn security movement have only structural proof (`4672ec314`). |
| BT20-085 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Main-phase self replacement and end-turn suspension/DP effects have only structural proof (`4672ec314`). |
| BT20-086 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Memory setting, paid bottom placement, and next-face-down security flip have only structural proof (`4672ec314`). |
| BT20-087 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Chronicle attack watcher and battle-or-breeding evolution remain unproved by natural source behavior (`4672ec314`). |
| BT20-088 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Main-phase memory and Ghost-deletion evolution watcher have only structural proof (`4672ec314`). |
| BT20-089 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Mind Link to the regular Tamer and inherited play to its own stack; only the memory gate is natural (`948d9d2cd`). |
| BT20-090 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural memory/end-turn evidence reaches suspension, but attack results and serialization boundaries remain unproved (`4672ec314`). |
| BT20-091 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Tightened exact Omekamon matching; play, evolution, and leave origins remain structural or manually fired (`0fc44d09a`). |
| BT20-092 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Start-turn, On Play, under-Tamer play, and Security paths have structural source proof only (`6497f3fd9`). |
| BT20-093 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Tightened the exact Examon DNA destination while preserving in-name filters; all behavior remains structural (`97b349785`). |
| BT20-094 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected Dragon Mode targeting to an exact own Fighter Mode evolution stack; the security-removal origin is unexecuted (`4a3b95020`). |
| BT20-095 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Reveal, Chronicle deletion, breeding movement, free evolution, and Security clauses have structural proof only (`6497f3fd9`). |
| BT20-096 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Trash activation, payment/abort, deletion, and Security resolution remain unexecuted (`6497f3fd9`). |
| BT20-097 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected paid digivolution, natural leave-bound Delay, own-stack cost, and exact named cards; source assertions were not executed (`c4b265556`). |
| BT20-098 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Exact-total trash return, per-level Ghost multiplicity, grants, and Security play have structural proof only (`6497f3fd9`). |
| BT20-099 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected the field-resident end-turn Chaosmon clause to inherited despite the catalog-field anomaly; no natural host flow was run (`0b1fe0f64`). |
| BT20-100 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected source-bound leave prevention and exact standalone names while preserving Omnimon in-name matching; behavior remains structural (`b795529e0`). |
| BT20-101 | 2/2 | 2/2 | 0/2 | 1/2 | 0/2 | 5/10 provisional | Vortex runtime and legal route peers exist, but this card's distinctive entry/watcher behavior and a complete legal stack remain unproved (`f64df082d`). |
| BT20-102 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Corrected the name-or-trait condition and exact Omnimon gates; natural proof remains partial and does not cover the X-only or end-turn branches (`b88b2acf0`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 21
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 64 (`BT20-001`–`BT20-003`, `BT20-005`–`BT20-008`, `BT20-014`, `BT20-018`, `BT20-020`–`BT20-022`, `BT20-024`–`BT20-027`, `BT20-029`, `BT20-031`, `BT20-033`–`BT20-037`, `BT20-041`–`BT20-044`, `BT20-047`, `BT20-050`, `BT20-052`–`BT20-056`, `BT20-058`, `BT20-060`, `BT20-071`–`BT20-074`, `BT20-078`, `BT20-080`, and `BT20-081`–`BT20-102` source/stack-proof gaps)
- Remaining unassigned: 0

BT20 static coverage is recorded for all 102 cards. Scores remain provisional and
collection completion is withheld because the required execution gates were not run.
