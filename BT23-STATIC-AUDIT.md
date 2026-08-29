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
| BT23-051–060 | Luna assigned | `internal-docs/audits/BT23/BT23-051-060.md` | No |
| BT23-061–070 | Luna assigned | `internal-docs/audits/BT23/BT23-061-070.md` | No |
| BT23-071–080 | Luna assigned | `internal-docs/audits/BT23/BT23-071-080.md` | No |
| BT23-081–090 | Luna assigned | `internal-docs/audits/BT23/BT23-081-090.md` | No |
| BT23-091–100 | Luna assigned | `internal-docs/audits/BT23/BT23-091-100.md` | No |
| BT23-101–102 | Luna assigned | `internal-docs/audits/BT23/BT23-101-102.md` | No |

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

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 50
- Corrected: 12
- Provisional: 50
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 37
- Remaining unassigned: 0

BT23 static auditing is prepared in parallel. Accepted ranges are integrated
in strict ascending BT23 order.
