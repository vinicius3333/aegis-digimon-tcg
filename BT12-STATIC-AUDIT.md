# BT12 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT12-001` through `BT12-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT12/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT12-001–010 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-001-010.md` | Yes |
| BT12-011–020 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-011-020.md` | Yes |
| BT12-021–030 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-021-030.md` | Yes |
| BT12-031–040 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-031-040.md` | Yes |
| BT12-041–050 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-041-050.md` | Yes |
| BT12-051–060 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-051-060.md` | Yes |
| BT12-061–070 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-061-070.md` | Yes |
| BT12-071–080 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-071-080.md` | Yes |
| BT12-081–090 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-081-090.md` | Yes |
| BT12-091–100 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-091-100.md` | Yes |
| BT12-101–110 | Coordinator reviewed | `internal-docs/audits/BT12/BT12-101-110.md` | Yes |
| BT12-111–112 | Luna in progress | `internal-docs/audits/BT12/BT12-111-112.md` | No |

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
other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT12-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; snapshot drift documented |
| BT12-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; snapshot drift documented |
| BT12-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; snapshot drift documented |
| BT12-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; snapshot drift documented |
| BT12-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-001-010.md`; no new correction |
| BT12-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; Save sequencing override documented |
| BT12-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; suspended play and Tamer cost override documented |
| BT12-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; no new correction |
| BT12-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; deletion budget override documented |
| BT12-015 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-011-020.md`; handwritten `effectsForTiming` limitation |
| BT12-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; Q2147 proof strengthened in `68e448949` |
| BT12-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; mutually exclusive deletion branches documented |
| BT12-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; structured fallback documented |
| BT12-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; no new correction |
| BT12-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-011-020.md`; exact no-effect record |
| BT12-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; no new correction |
| BT12-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; corrected IR history `fcb09798b`, `1e3097730` |
| BT12-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; no new correction |
| BT12-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; no new correction |
| BT12-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-021-030.md`; snapshot override documented |
| BT12-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; action-order/stack-color drift documented |
| BT12-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; trait-union drift documented |
| BT12-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; exact no-effect record |
| BT12-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; Koromon requirement drift documented |
| BT12-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; inherited Save gate drift documented |
| BT12-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; no new correction |
| BT12-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; Save ordering/errata drift documented |
| BT12-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; no new correction |
| BT12-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; conditional pay-cost drift documented |
| BT12-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-031-040.md`; conditional pay-cost drift documented |
| BT12-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; repeat/DP-zero/Save drift documented |
| BT12-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; no new correction |
| BT12-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; Security DP drift documented |
| BT12-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; scaling-unit drift documented |
| BT12-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; reveal filter drift documented |
| BT12-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; exact no-effect record |
| BT12-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; no new correction |
| BT12-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; atomic return/draw drift documented |
| BT12-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; no new correction |
| BT12-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-041-050.md`; DNA replacement drift documented |
| BT12-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; Save sequencing drift documented |
| BT12-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; exact no-effect record |
| BT12-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; normalized battle trigger documented |
| BT12-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; generated count override documented |
| BT12-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; DNA/source-filter drift documented |
| BT12-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; no new correction |
| BT12-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; all-target/restriction drift documented |
| BT12-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; no new correction |
| BT12-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; no new correction |
| BT12-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-051-060.md`; inherited Save gate drift documented |
| BT12-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; no new correction |
| BT12-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; no new correction |
| BT12-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; filter/Save/residual drift documented |
| BT12-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; De-Digivolve/Then drift documented |
| BT12-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; delayed attack-grant drift documented |
| BT12-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; no new correction |
| BT12-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; no new correction |
| BT12-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; inherited name-gate drift documented |
| BT12-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; exact no-effect record |
| BT12-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-061-070.md`; no new correction |
| BT12-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; atomic reveal drift documented |
| BT12-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; self/bottom placement drift documented |
| BT12-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; no new correction |
| BT12-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; inherited Save gate drift documented |
| BT12-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; under-Tamer/Save drift documented |
| BT12-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; no new correction |
| BT12-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; source/Then/Save drift documented |
| BT12-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; no new correction |
| BT12-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; exact no-effect record |
| BT12-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-071-080.md`; reveal near-match proof `e871250a4` |
| BT12-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-081-090.md`; exclusive instead branch corrected in `2bd4c4c21` |
| BT12-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-081-090.md`; structured stack and inherited gates documented |
| BT12-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-081-090.md`; permanent placement, color ceiling, Save gate, and source shedding corrected |
| BT12-084 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; mandatory follow-up corrected in `8c0734ef9`; handwritten timing override retained |
| BT12-085 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; empty IR plus handwritten runtime limitation |
| BT12-086 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; empty IR plus handwritten reveal/Save runtime limitation |
| BT12-087 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; Your Turn reducer and Security proof remain source-uncovered |
| BT12-088 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; handwritten inherited Security trigger retained |
| BT12-089 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-081-090.md`; empty IR plus handwritten placement/evolution runtime limitation |
| BT12-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-081-090.md`; trigger-subject normalization documented |
| BT12-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-091-100.md`; direct compiled Save reducer corrected in `3f7b38d48` |
| BT12-092 | 2/2 | 1/2 | 1/2 | 2/2 | 0/2 | 6/10 provisional | `BT12-091-100.md`; handwritten runtime override; Your Turn and Security source cases absent |
| BT12-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-091-100.md`; direct compiled Save reducer corrected in `3f7b38d48` |
| BT12-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-091-100.md`; direct compiled Save reducer corrected in `3f7b38d48` |
| BT12-095 | 2/2 | 1/2 | 1/2 | 2/2 | 0/2 | 6/10 provisional | `BT12-091-100.md`; handwritten runtime override; Your Turn digivolution proof absent |
| BT12-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-091-100.md`; direct compiled Save reducer corrected in `3f7b38d48` |
| BT12-097 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-091-100.md`; handwritten placement and evolution reducer retained |
| BT12-098 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-091-100.md`; Q2231/Q2232 partial-category source cases absent |
| BT12-099 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-091-100.md`; handwritten effect-driven attack retained |
| BT12-100 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-091-100.md`; target ID and exact-name selection corrected in `3f7b38d48`, `8d3e58f7a` |
| BT12-101 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-101-110.md`; handwritten timing fallback retained |
| BT12-102 | 2/2 | 1/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-101-110.md`; source-stack shedding corrected in `3e5928ec5` |
| BT12-103 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-101-110.md`; direct threshold repair documented |
| BT12-104 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-101-110.md`; no new correction |
| BT12-105 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-101-110.md`; no new correction |
| BT12-106 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | `BT12-101-110.md`; dynamic restriction corrected in `8a70cd6e3`; later-entrant proof remains structural |
| BT12-107 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-101-110.md`; no new correction |
| BT12-108 | 2/2 | 0/2 | 2/2 | 2/2 | 0/2 | 6/10 provisional | `BT12-101-110.md`; empty IR plus handwritten relational runtime limitation |
| BT12-109 | 2/2 | 0/2 | 2/2 | 2/2 | 0/2 | 6/10 provisional | `BT12-101-110.md`; raw generated digivolution relation and handwritten runtime limitation |
| BT12-110 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | `BT12-101-110.md`; ported to compiled IR in `0c607dc7e` |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 110
- Corrected: 13
- Provisional: 110
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 15
- Remaining unassigned: 0

BT12 static re-audit is in progress.
