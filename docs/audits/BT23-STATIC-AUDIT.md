# BT23 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT23-001` through `BT23-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT23/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT23/`. BT23 work may be prepared in parallel, while
accepted ranges are integrated in strict ascending order.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT23-001–010 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-001-010.md` | Yes |
| BT23-011–020 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-011-020.md` | Yes |
| BT23-021–030 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-021-030.md` | Yes |
| BT23-031–040 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-031-040.md` | Yes |
| BT23-041–050 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-041-050.md` | Yes |
| BT23-051–060 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-051-060.md` | Yes |
| BT23-061–070 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-061-070.md` | Yes |
| BT23-071–080 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-071-080.md` | Yes |
| BT23-081–090 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-081-090.md` | Yes |
| BT23-091–100 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-091-100.md` | Yes |
| BT23-101–102 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-101-102.md` | Yes |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT23-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited Appmon attack draw, trait negative, independent source keys, and legal hosts are covered. |
| BT23-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited CS attack draw, trait negative, once-per-turn identity, and legal hosts are covered. |
| BT23-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural CS Option play now proves the inherited optional attack and once-per-turn boundary. |
| BT23-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion proves same-bound Ghost grants and opponent-turn-end expiry. |
| BT23-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Trait evolution reduction, breeding exclusion, ruled override, and inherited DP scope are covered. |
| BT23-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reveal buckets, CS Digi-Egg evolution, white-play memory, negatives, and source identity are covered. |
| BT23-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security-battle self-play, Appmon link boundary, linked DP, and Piercing are covered. |
| BT23-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional restack processing and independent play choices, ruled stack edges, alternates, Raid, and inherited DP are covered. |
| BT23-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn end now proves the optional linked player attack and decline, with link boundaries. |
| BT23-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security-battle self-play, alternate evolution, Raid, and both Blocker scopes are covered. |
| BT23-011 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution cover deletion boundaries; inherited deletion play remains primitive-driven. |
| BT23-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Raid and evolution routes are natural; both deletion faces remain explicitly timed. |
| BT23-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance/play watcher and evolution routes are traced; modal branches retain explicit timing seams. |
| BT23-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dynamic deletion scaling now excludes breeding; timing and restriction behavior remain seam-driven. |
| BT23-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play-cost reduction is proved; deletion, return, and Security origins remain explicit. |
| BT23-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural linking proves cost, DP, draw, Eri boundary, refusal, and invalid-host negative. |
| BT23-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional hand-trash processing and independent return plus Hudie/delayed restrictions are traced; attack origins remain explicit. |
| BT23-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main covers optional restack processing, independent reduced play, stack edges, and inherited DP scope. |
| BT23-019 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Digivolution trash now pools across opposing Digimon; cross-host and evolution paths remain unexecuted. |
| BT23-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance and self-only suspension watcher are traced; suspension origin remains injected. |
| BT23-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link/App Fusion, shared use key, and linked protection are traced; delivery remains unexecuted. |
| BT23-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Raid, linked Security Attack, free linking, and unsuspend watcher have natural source proof only. |
| BT23-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Replacement play now searches only this Digimon's stack; eligible neighboring-stack negative corrected. |
| BT23-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dynamic highest-play-cost linked restriction and App Fusion peers are traced but unexecuted. |
| BT23-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand activation now preserves optional By-payment decline; Security placement/play and delayed deletion remain unexecuted. |
| BT23-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Makiko-gated Antylamon evolution and inherited suspension watcher have natural source proof only. |
| BT23-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Effect-driven DNA now rejects digivolve-restricted materials in preflight and mutation paths. |
| BT23-028 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security origin, debuff, link DP, and When Digivolving restriction are traced but unexecuted. |
| BT23-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Qualifying-play restriction and inherited suspension debuff have source proof without delivery execution. |
| BT23-030 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional By payment, independent play decline, mandatory keyword continuation, and Alliance are traced through source proof only. |
| BT23-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reduced play covers the zero-security ruling; other boundaries use direct timing helpers. |
| BT23-032 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | DNA/forced-attack behavior is structural and leave replacements use direct deletion despite feasible origins. |
| BT23-033 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural linking proves cost, DP, and protection; entry and recovery branches are directly timed. |
| BT23-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reducer play and CS evolution are covered; deletion/shared timings remain direct. |
| BT23-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/decline preserve optional security processing and player-wide DP; removal paths remain direct. |
| BT23-036 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reducer threshold and Raid refusal are covered; free evolution remains directly timed. |
| BT23-037 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural battle/breeding reducer boundary is covered; inherited attack origin remains direct. |
| BT23-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Face-up Security aura and inherited DP have natural state proof; reveal remains directly timed. |
| BT23-039 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural linking proves cost, DP, suspend, and refusal; reveal remains directly timed. |
| BT23-040 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional Erika processing and independent evolution are observable, but start-main timing is manually fired. |
| BT23-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance, suspension watcher, trait boundaries, and legal evolution are covered; the natural suspension origin remains unexecuted. |
| BT23-042 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security Royal Base aura, optional Tamer play, inherited DP, and evolution are traced without full natural settlement. |
| BT23-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural leave replacement, Security Blocker, ownership boundaries, and legal evolution are covered. |
| BT23-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Inherited trigger now requires an actual opposing Digimon deletion in battle and excludes Security Digimon wins. |
| BT23-045 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Ordinary By conditions retain optional decline semantics; natural suspension and Counter timing remain unexecuted. |
| BT23-046 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | By-suspension acceptance/decline, Fortitude, redirect, and evolution are traced; full natural restriction cleanup remains unexecuted. |
| BT23-047 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Core Examon actions are traced, but natural Security removal and complete attack/stack proof remain absent. |
| BT23-048 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Reveal and bound inherited play/lock/delete are traced; natural attack and simultaneous Alliance ordering remain absent. |
| BT23-049 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact trash payment, payload order, inherited DP, and evolution are covered; the phase origin is directly fired. |
| BT23-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry sequencing, deferred 0-DP deletion, DNA stack, Blocker, and evolution are covered; the derived Hudiemon/Erika origin remains absent. |
| BT23-051 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance, Blocker, suspension deletion, attack restriction, evolution, and stack peers are traced; suspension remains primitive-driven. |
| BT23-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security self-play and Appmon linking prove the restriction, Link DP, Reboot, and Blocker paths. |
| BT23-053 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Option-placement evolution and inherited DP are covered, but the trigger origin remains primitive-driven. |
| BT23-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Ordered draw/protection, Armor Purge, Blocker, cause scope, duration, and evolution are traced through direct timing. |
| BT23-055 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry deletion and effect-placed Option replacements are traced; replacement removal remains primitive-driven. |
| BT23-056 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Delayed attack and inherited target-switch De-Digivolve are traced, with natural timing origins still absent. |
| BT23-057 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural exact-three reducer proof is present; token and scaled deletion use direct On Play timing. |
| BT23-058 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Leave replacement, suspension cost, tied lowest-cost deletion, Reboot, and Blocker are traced; suspension is injected. |
| BT23-059 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | All three By clauses are optional and require an effect-placed battle-area Option; positive and decline timings are direct. |
| BT23-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q5331 is scoped per borrowed BT23-045 On Play item, forcing its cost and trash-first/hand fallback without changing ordinary lenders. |
| BT23-061 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Ghost-only Blocker grants and inherited memory are traced through direct timing and deletion primitives. |
| BT23-062 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural inherited attack evolution is covered; start-main payment and negative use direct timing. |
| BT23-063 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Undead/CS attack evolution and stack peers are traced, but the attack origin is directly fired. |
| BT23-064 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both By deletions retain optional decline and abort behavior; entry timing remains direct. |
| BT23-065 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural hand Main setup is covered; deletion and inherited play depend on direct timing or primitives. |
| BT23-066 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trash-origin entry/play and Scapegoat are traced through direct timing and deletion primitives. |
| BT23-067 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reducer play, Blocker, Scapegoat, deletion boundaries, and CS evolution are covered; deletion timing is direct. |
| BT23-068 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trash-origin gating now uses the supported fireCondition and excludes natural hand evolution; positive origins remain primitive-driven. |
| BT23-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove accepted deletion, no-target end, and decline-before-self-delete while preserving the attack. |
| BT23-070 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Highest-level deletion, suspended attack, Sleep Mode evolution, and exact alternate route are traced from direct When Digivolving timing. |
| BT23-071 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Highest-level deletion, prevention fallback, deletion play, keywords, and alternate evolution are traced; primary timings remain direct or primitive-driven. |
| BT23-072 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | The hand Main action is natural; the play watcher and breeding start-main paths use direct event firing. |
| BT23-073 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Deletion, both prevention costs, and breeding reduction are traced; On Play and leave origins are direct or primitive-driven. |
| BT23-074 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Mother Eater gates, aggregate play ceiling, Alliance, Reboot, and alternate evolution are covered through directly fired entry timings. |
| BT23-075 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dynamic ceiling, leave replacement, refusal, and lowest-cost deletion rely on direct entry/end-turn timings or deletion primitives. |
| BT23-076 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security order and suspension evolution are traced, but On Play and suspension origins are directly fired. |
| BT23-077 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Blocker, bounded deletion, and self-suspension de-digivolution are traced through direct entry and suspension events. |
| BT23-078 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | The CS branch now survives Sea Animal exclusion and has a natural play proof; remaining watcher and start-main paths are direct. |
| BT23-079 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | The watcher now requires an own Digimon and has a natural link positive; opponent/start-main paths are direct and App Fusion is structural. |
| BT23-080 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | CS replacement scope and exact security subject are traced through deletion primitives; start-main is directly fired. |
| BT23-081 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Start-main, free Hudie play, optional decline, and suspension watcher boundaries are covered in unexecuted source scenarios. |
| BT23-082 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Qualifying evolution, target alternatives, and decline are traced; explicit hand return preserves the runtime default. |
| BT23-083 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security-placement boundaries and decline gating are covered; explicit abort preserves existing `ifThisEffectActed` behavior. |
| BT23-084 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Compound payment, breeding placement, and Alliance stacks are covered; Security/hand fields make existing defaults explicit. |
| BT23-085 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | DP protection, Option use, and inherited blocker boundaries are traced through unexecuted source scenarios. |
| BT23-086 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Face-up Security placement, start-main checks, suspension cost, and attack selection are traced. |
| BT23-087 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Return cost, Violet/Ghostmon play sequence, Rush grant, and Phantomon alternate evolution are covered. |
| BT23-088 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand-trash memory, self-delete trash evolution, and decline boundaries are covered without executed gates. |
| BT23-089 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Same-host/same-level compound prevention is covered; explicit prevent mode preserves cost-based inference. |
| BT23-090 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Memory boundary, compound Hudie return, free CS Tamer play, and Hudie DP aura are traced. |
| BT23-091 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Lowest-DP deletion, Option placement, Delay structure, and Security ordering are traced; attack timing is directly fired. |
| BT23-092 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Digimon/Tamer suspension restrictions and duration are observable through a directly fired attack watcher. |
| BT23-093 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | DP grant, Link play, Delay, and Option lifecycle are traced through source assertions with direct origins. |
| BT23-094 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | De-Digivolve, unsuspend restriction, target boundaries, Delay, and Security order are traced without natural full-flow execution. |
| BT23-095 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Suspension, DP reduction, tied targets, Option placement, and Delay are covered through direct event paths. |
| BT23-096 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | DP deletion, prevention fallback, placement, and Delay are traced; feasible natural origins remain uncovered. |
| BT23-097 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trash activation, deck-bottom payment, Main activation, and decline-before-payment are covered through direct subtrigger firing. |
| BT23-098 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Delay evolution now requires both Ghost and LIBERATOR; negative proof uses a directly fired suspension watcher. |
| BT23-099 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Huckmon waiver, Option placement, and Sistermon play are traced; evolution watcher remains manually fired. |
| BT23-100 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Separate Main/Delay bodies and Security level-3 CS play are covered through direct structural and timing helpers. |
| BT23-101 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Mandatory scaled DP tail, exact Erika route, On Play reactivation, Alliance, and representative Hudie stacks are traced through direct timing. |
| BT23-102 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Free play now excludes non-Digimon level cards; stack-pair security trim and either-side security placement use direct timing/subtriggers. |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 20
- Provisional: 102
- Provisional points: 727/1020 (16 cards at 8/10, 83 at 7/10, and 3 at 6/10)
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 86
- Remaining unassigned: 0

BT23 static coverage is 102/102 and every accepted range is integrated in
strict ascending order. Execution/delivery evidence remains incomplete by
instruction, so this is not a collection-completion or 10/10 claim.
