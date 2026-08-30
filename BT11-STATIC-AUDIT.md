# BT11 Static Card Implementation Re-audit

Status: static card-by-card pass complete; execution gates deferred and collection verification remains open

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT11-001` through `BT11-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing
`BT11-AUDIT.md` is retained intact as historical verification evidence; this
pass independently revalidates the current direct implementations. Detailed
clause traces are written in English under `internal-docs/audits/BT11/` and
integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT11-001–010 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-001-010.md` | Yes |
| BT11-011–020 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-011-020.md` | Yes |
| BT11-021–030 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-021-030.md` | Yes |
| BT11-031–040 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-031-040.md` | Yes |
| BT11-041–050 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-041-050.md` | Yes |
| BT11-051–060 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-051-060.md` | Yes |
| BT11-061–070 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-061-070.md` | Yes |
| BT11-071–080 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-071-080.md` | Yes |
| BT11-081–090 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-081-090.md` | Yes |
| BT11-091–100 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-091-100.md` | Yes |
| BT11-101–110 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-101-110.md` | Yes |
| BT11-111–112 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-111-112.md` | Yes |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color
   cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests,
   typecheck, repository quality gate, and `git diff --check` have passed on
   the delivered commit.

This static pass can award at most provisional 8/10 because component 5 is
deliberately unexecuted. Unsupported or ambiguous behavior may reduce any
other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT11-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected effect-provenance gate |
| BT11-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal Rule aliases |
| BT11-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal Rule aliases |
| BT11-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected bottom source placement |
| BT11-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal aliases and bottom placement |
| BT11-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; non-material snapshot normalization drift |
| BT11-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed vanilla card |
| BT11-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed vanilla card |
| BT11-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed vanilla card |
| BT11-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal Leomon Rule alias |
| BT11-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected inherited self-deletion gate |
| BT11-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Strengthened under-budget reveal proof |
| BT11-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected executable if-you-do gate |
| BT11-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected X Antibody trait match |
| BT11-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected exact card-number destination gate |
| BT11-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected optional reveal-add choice |
| BT11-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed universal Numemon alias |
| BT11-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed restricted card |
| BT11-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected bottom placement and mandatory return |
| BT11-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed any-controller unsuspend scope |
| BT11-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed same-host redirection cost |
| BT11-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Analogman continuation gate |
| BT11-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; metadata drift documented |
| BT11-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; metadata drift documented |
| BT11-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed vanilla card |
| BT11-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; semantic snapshot drift documented |
| BT11-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; metadata drift documented |
| BT11-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected source-stack trash cost binding |
| BT11-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Strengthened discarded-card return proof |
| BT11-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Strengthened both cross-color stack paths |
| BT11-086 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected moved-Digimon trigger binding; strengthened negative proof |
| BT11-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed whole-permanent placement semantics |
| BT11-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Sea Animal exclusion; strengthened effect-play negative |
| BT11-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed Taiga reducer and opponent-turn negative |
| BT11-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed mandatory draw and player-attack redirect |
| BT11-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed same-level Option immunity and duration |
| BT11-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed opposite-name counterpart play |
| BT11-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed under-Tamer DigiXros material scope |
| BT11-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed lowest-DP deletion and cost reducer |
| BT11-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected mandatory borrowed On Deletion activation |
| BT11-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed mandatory return after optional stack play |
| BT11-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed sequential stack trash and return |
| BT11-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed opponent-turn DP duration |
| BT11-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed same-target duration semantics |
| BT11-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed Insect substring and mandatory target count |
| BT11-103 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed suspension-triggered aura payload |
| BT11-104 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed independent boost and attacker selections |
| BT11-105 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected successful-placement continuation gate |
| BT11-106 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed same-target unblockability grant |
| BT11-107 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed X Antibody stack gate and budget deletion |
| BT11-108 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected De-Digivolve level floor encoding |
| BT11-109 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected bottom relocation and source-stack shedding |
| BT11-110 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-111 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected alternate evolution, self-bottom placement, mandatory deletion, and prevention cost |
| BT11-112 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected self-suspension continuation gate; strengthened Q2142 proof |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Corrected: 22
- Provisional: 112
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT11 static inspection is complete. Collection verification remains open
because every execution score is 0/2 and no delivery gate was run.
