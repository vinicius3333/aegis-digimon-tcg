# BT23 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT22 integration remains ahead in chronological order; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT23-001` through `BT23-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT23/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT23/`. BT23 work may be prepared in parallel, but it
will not be integrated before the BT22 ledger is complete.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT23-001–010 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-001-010.md` | Yes |
| BT23-011–020 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-011-020.md` | Yes |
| BT23-021–030 | Coordinator reviewed | `internal-docs/audits/BT23/BT23-021-030.md` | Yes |
| BT23-031–040 | Luna assigned | `internal-docs/audits/BT23/BT23-031-040.md` | No |
| BT23-041–050 | Luna assigned | `internal-docs/audits/BT23/BT23-041-050.md` | No |
| BT23-051–060 | Luna assigned | `internal-docs/audits/BT23/BT23-051-060.md` | No |
| BT23-061–070 | Luna assigned | `internal-docs/audits/BT23/BT23-061-070.md` | No |
| BT23-071–080 | Luna assigned | `internal-docs/audits/BT23/BT23-071-080.md` | No |
| BT23-081–090 | Luna assigned | `internal-docs/audits/BT23/BT23-081-090.md` | No |
| BT23-091–100 | Unassigned | `internal-docs/audits/BT23/BT23-091-100.md` | No |
| BT23-101–102 | Unassigned | `internal-docs/audits/BT23/BT23-101-102.md` | No |

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
| BT23-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Ruled restack/reduced play, refusal, exposed-stack edges, alternates, Raid, and inherited DP are covered. |
| BT23-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn end now proves the optional linked player attack and decline, with link boundaries. |
| BT23-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security-battle self-play, alternate evolution, Raid, and both Blocker scopes are covered. |
| BT23-011 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution cover deletion boundaries; inherited deletion play remains primitive-driven. |
| BT23-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Raid and evolution routes are natural; both deletion faces remain explicitly timed. |
| BT23-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance/play watcher and evolution routes are traced; modal branches retain explicit timing seams. |
| BT23-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dynamic deletion scaling now excludes breeding; timing and restriction behavior remain seam-driven. |
| BT23-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play-cost reduction is proved; deletion, return, and Security origins remain explicit. |
| BT23-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural linking proves cost, DP, draw, Eri boundary, refusal, and invalid-host negative. |
| BT23-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand cost and Hudie/delayed restrictions are traced; attack and delayed origins remain explicit. |
| BT23-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main restack/reduced play covers stack edges, refusal, and inherited DP scope. |
| BT23-019 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Digivolution trash now pools across opposing Digimon; cross-host and evolution paths remain unexecuted. |
| BT23-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Alliance and self-only suspension watcher are traced; suspension origin remains injected. |
| BT23-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link/App Fusion, shared use key, and linked protection are traced; delivery remains unexecuted. |
| BT23-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Raid, linked Security Attack, free linking, and unsuspend watcher have natural source proof only. |
| BT23-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Replacement play now searches only this Digimon's stack; eligible neighboring-stack negative corrected. |
| BT23-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dynamic highest-play-cost linked restriction and App Fusion peers are traced but unexecuted. |
| BT23-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand activation, cost gate, Security placement/play, and delayed deletion are present but unexecuted. |
| BT23-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Makiko-gated Antylamon evolution and inherited suspension watcher have natural source proof only. |
| BT23-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Effect-driven DNA now rejects digivolve-restricted materials in preflight and mutation paths. |
| BT23-028 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security origin, debuff, link DP, and When Digivolving restriction are traced but unexecuted. |
| BT23-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Qualifying-play restriction and inherited suspension debuff have source proof without delivery execution. |
| BT23-030 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Main paid play, Alliance, and linked Blocker are traced through source proof only. |

## Aggregate

- Catalog cards: 102
- Assigned: 90
- Integrated card audits: 30
- Corrected: 4
- Provisional: 30
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 18
- Remaining unassigned: 12

BT23 static auditing is prepared in parallel. Accepted ranges will be
integrated only after BT22, then in strict ascending BT23 order.
