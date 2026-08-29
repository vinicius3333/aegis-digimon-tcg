# BT21 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT20 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT21-001` through `BT21-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT20 static coverage is now recorded,
so accepted BT21 ranges may be integrated in strict ascending order while
Luna lanes continue preparing later ranges. Detailed English reports belong
under `internal-docs/audits/BT21/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT21-001–010 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-001-010.md` | Yes |
| BT21-011–020 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-011-020.md` | Yes |
| BT21-021–030 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-021-030.md` | Yes |
| BT21-031–040 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-031-040.md` | Yes |
| BT21-041–050 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-041-050.md` | Yes |
| BT21-051–060 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-051-060.md` | Yes |
| BT21-061–070 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-061-070.md` | Yes |
| BT21-071–080 | Coordinator reviewed | `internal-docs/audits/BT21/BT21-071-080.md` | Yes |
| BT21-081–090 | Luna assigned | `internal-docs/audits/BT21/BT21-081-090.md` | No |
| BT21-091–100 | Luna assigned | `internal-docs/audits/BT21/BT21-091-100.md` | No |
| BT21-101–102 | Luna assigned | `internal-docs/audits/BT21/BT21-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT21-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent-security attack origin and reduced-cost evolution source; explicit opponent seat/filter trace. |
| BT21-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural legal Hero-host attack proof plus structured Gammamon-text/Hero OR trace. |
| BT21-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Wind Guardian play origin, own-controller filter, and legal stack peers. |
| BT21-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural link-driven Tamer suspension and red/yellow own-Tamer boundaries. |
| BT21-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public link origin with self-linked and once-per-turn boundaries. |
| BT21-006 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Exact Vemmon correction; available four-Vemmon fixture lacks the required natural legal Snatchmon stage. |
| BT21-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural optional trash return and legal inherited-DP evolution stack source. |
| BT21-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal/play and opponent-security attack origins with separate add buckets. |
| BT21-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Haru Shinkai correction and natural Appmon link/Raid proof. |
| BT21-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Siriusmon/Gurimon corrections and natural selectable-Main evolution branches. |
| BT21-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reducer, deletion/Save, and inherited Rush paths with legal Xros Heart/Hero peers. |
| BT21-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Same-effect `lastPlayed` Tamer binding correction with natural Main activation proof. |
| BT21-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact BurningGreymon correction; qualifying-Tamer destination remains primitive-driven. |
| BT21-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Agunimon correction; opponent-security evolution branch remains manually fired. |
| BT21-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | End-of-battle Security timing correction; natural security-check origin remains absent. |
| BT21-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DigiXros, attack/Piercing, deletion placement/Save, decline, and inherited-DP paths. |
| BT21-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Owen correction; inherited opponent-security trigger remains manually injected. |
| BT21-018 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Both load-bearing linked attack clauses lack natural positive producer proof. |
| BT21-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Hiro/Gammamon corrections with natural evolution, Tamer-count, decline, and DP proof. |
| BT21-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Agunimon/BurningGreymon stack correction; Security Attack remains structural-only. |
| BT21-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Shoutmon route plus Digimon/non-token Save boundaries; End of Attack remains manual. |
| BT21-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional By-cost acceptance/refusal, 7000-DP deletion, and natural leave-prevention proof. |
| BT21-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Own-stack Link-source correction; linked watcher origin remains manually fired. |
| BT21-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural five/six-security boundaries, ordered security movement, and inherited DP proof. |
| BT21-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Attack-target and security-removal watchers remain manual despite exact source filters. |
| BT21-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural scaled play-cost, keyword, and opponent-deletion unsuspend paths. |
| BT21-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Own-stack/non-token/exact-name and DigiXros -3 corrections with natural leave proof. |
| BT21-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional By-cost correction with natural digivolution acceptance and refusal boundaries. |
| BT21-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Shared deletion/token IR traced; independent security and End of Attack origins remain manual. |
| BT21-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Shoutmon source and natural play/evolution stack-processing boundaries. |
| BT21-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural digivolution reducer proof; End of Attack memory origin remains manual. |
| BT21-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact DemiVeemon correction with natural alternate routes, reducers, and DP proof. |
| BT21-033 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Avian/Bird `traitContains` correction; On Play and Jamming evidence remain partial. |
| BT21-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self-suspension scope correction; suspension origin and Jamming remain non-natural/structural. |
| BT21-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self target-switch and exact Veemon corrections; watcher origin remains manual. |
| BT21-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Veemon correction with natural alternate evolution and Armor Purge proof. |
| BT21-037 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Veemon correction; attack-target watcher proof remains manually injected. |
| BT21-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution/play paths present; keyword and secondary timing evidence remain partial. |
| BT21-039 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Load-bearing behavior is supported only by manual timing/structural observations. |
| BT21-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected OR gate and exact ShineGreymon/Koromon boundaries with natural source proof. |
| BT21-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security, Link, host-DP, and opposing Security Digimon modifier paths. |
| BT21-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus correction with natural alternate and free RizeGreymon evolution proof. |
| BT21-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, security, Appmon Link, and normal digivolution DP-modifier paths. |
| BT21-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Marcus/GeoGreymon and single-selection binding corrections; full bundle remains manual. |
| BT21-045 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Raid proof, but deletion and Tamer-cost bonus origins remain manually fired. |
| BT21-046 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Coredramon/Dracomon corrections; Start Main and End Turn origins remain manual. |
| BT21-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural RevealAdd, alternate evolution, Link DP, and Piercing combat paths. |
| BT21-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural either-side suspension and inherited Piercing with legal WG peers. |
| BT21-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry, opponent-play watcher, unsuspended negative, and evolution proof. |
| BT21-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural redirect/inherited watcher; entry suspension positive remains manually injected. |
| BT21-051 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Legal evolution and keyword proof; principal De-Digivolve/return sequence remains manual. |
| BT21-052 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Examon alternate/stack correction; main suspend/delete watcher origins remain manual. |
| BT21-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Link, attack restriction, and Appmon alternate-evolution paths. |
| BT21-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public Link/evolution proof; On Play stack cost and refusal remain directly fired. |
| BT21-055 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution/breeding boundary; inherited effect-discard watcher remains injected. |
| BT21-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution with text matching, Digi-Egg exclusion, decline, and frequency proof. |
| BT21-057 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Tai Kamiya correction; granted Start Main attack remains manually advanced. |
| BT21-058 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Exact Vemmon corrections; entry and return watcher behavior remain primitive-driven. |
| BT21-059 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public Link behavior exists; App Fusion recipe remains structural-only. |
| BT21-060 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Vemmon, own-stack, and deck-bottom corrections; digivolution origin remains manual. |
| BT21-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural De-Digivolve scaling, optional attack, Alliance, and inherited Alliance paths. |
| BT21-062 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact-four Vemmon and leave-replacement boundaries; Start Main and evolution timings remain directly fired. |
| BT21-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate routes, hand cost, deletion Save, and inherited-DP stack proof. |
| BT21-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate routes, family/Hero hand cost, and inherited deletion-memory proof. |
| BT21-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public digivolution reducer and legal inherited deletion-memory stack paths. |
| BT21-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional-placement sequencing corrected so decline preserves the following Save, with natural deletion proof. |
| BT21-067 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | ADVENTURE recovery is natural; Security and inherited attack timings remain directly fired. |
| BT21-068 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Mandatory deletion/mill boundaries traced; the principal entry trigger remains directly fired. |
| BT21-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural placement-cost, deletion, Security free-play, and inherited Retaliation paths. |
| BT21-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Linking, evolution, Security, and Appmon-filter boundaries. |
| BT21-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, selectable-host placement, Link, and alternate-evolution paths. |
| BT21-072 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Stack scaling and keyword paths are natural; the evolution attack timing remains directly fired. |
| BT21-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Own-stack, self-recipient, and self-link watcher corrections with natural Link boundaries. |
| BT21-074 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Placement-host protection binding corrected; shared De-Digivolve timing remains manual. |
| BT21-075 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion and evolution paths; Raid/Retaliation grant remains manually fired. |
| BT21-076 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play and inherited deletion paths; attack-evolution timing remains manual. |
| BT21-077 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Canoweissmon correction and natural deletion paths; gained-effect timing remains manual. |
| BT21-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletion, subject-watcher, optional attack, alternate, and inherited Alliance paths. |
| BT21-079 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural recurrence and dynamic ceiling proof; End of Attack wipe remains manually fired. |
| BT21-080 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Gammamon/Hero filter and payload traced; principal timing origins remain manual. |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 80
- Corrected: 33
- Provisional: 80
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 40
- Remaining unassigned: 0

BT21 static auditing is in progress; accepted ranges are eligible for strict
chronological integration.
