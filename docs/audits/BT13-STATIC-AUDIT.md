# BT13 Static Card Implementation Re-audit

Status: static card-by-card pass exhausted; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT13-001` through `BT13-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT13/` and integrated here only
after review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT13-001–010 | Reviewed | `internal-docs/audits/BT13/BT13-001-010.md` | Yes |
| BT13-011–020 | Reviewed | `internal-docs/audits/BT13/BT13-011-020.md` | Yes |
| BT13-021–030 | Reviewed | `internal-docs/audits/BT13/BT13-021-030.md` | Yes |
| BT13-031–040 | Reviewed | `internal-docs/audits/BT13/BT13-031-040.md` | Yes |
| BT13-041–050 | Reviewed | `internal-docs/audits/BT13/BT13-041-050.md` | Yes |
| BT13-051–060 | Reviewed | `internal-docs/audits/BT13/BT13-051-060.md` | Yes |
| BT13-061–070 | Reviewed | `internal-docs/audits/BT13/BT13-061-070.md` | Yes |
| BT13-071–080 | Reviewed | `internal-docs/audits/BT13/BT13-071-080.md` | Yes |
| BT13-081–090 | Reviewed | `internal-docs/audits/BT13/BT13-081-090.md` | Yes |
| BT13-091–100 | Reviewed | `internal-docs/audits/BT13/BT13-091-100.md` | Yes |
| BT13-101–110 | Reviewed | `internal-docs/audits/BT13/BT13-101-110.md` | Yes |
| BT13-111–112 | Reviewed | `internal-docs/audits/BT13/BT13-111-112.md` | Yes |

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
| BT13-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; inherited deletion boundary source |
| BT13-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; battle-area and inherited aura source |
| BT13-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; owner-security trigger source |
| BT13-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area scope correction `b41af7a87` |
| BT13-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; stack-count boundary source |
| BT13-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2258 cost-without-target source |
| BT13-007 | 1/2 | 2/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | Three stale KB references remain catalog/KB drift |
| BT13-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus correction `62cd9d1e2` |
| BT13-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact BaoHuckmon correction `b257f200c` |
| BT13-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Garudamon/Kristy correction `078d484d4` |
| BT13-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; On Play/evolution/deletion boundaries |
| BT13-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2270–Q2271 security source |
| BT13-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2272–Q2273 trigger ordering |
| BT13-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Tamer cost and inherited deletion boundaries |
| BT13-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact-name correction; GeoGreymon route lacks runtime near-name proof |
| BT13-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Sistermon-triggered route and inherited source |
| BT13-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area scaling correction `d41228ab5` |
| BT13-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus/same-target correction `86c9c3ad5` |
| BT13-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2277 breeding-stack source |
| BT13-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Structured Burst correction `895661cb9`; host boundary `e9f306259` |
| BT13-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Thomas correction `70cad3ec0` |
| BT13-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Kiyoshiro and ordered-return correction `0587a6001` |
| BT13-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Manual hand-add event source; behavioral proof remains partial |
| BT13-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2281–Q2283 source trace |
| BT13-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Evade, Tamer return, and effect-hand-add source |
| BT13-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; own-stack play and Blocker source |
| BT13-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Burst host correction `90991c9dd`; payable-Thomas boundary `aa5a5f89c` |
| BT13-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; reveal groups and combined-security boundary |
| BT13-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon threshold and Reboot source |
| BT13-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; owner-security watcher and inherited boundary |
| BT13-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; top-security cost and combined-security source |
| BT13-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Security Attack modifier and combined-security source |
| BT13-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon-name route and inherited Reboot source |
| BT13-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Veemon correction `684739265`; ExVeemon leave-play boundary `5f995a9cd` |
| BT13-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Kudamon correction `101a0ecbf`; no genuine near-name runtime fixture |
| BT13-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon-name play and inherited Reboot source |
| BT13-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; printed and inherited Barrier source |
| BT13-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; security cost and owner-security watcher source |
| BT13-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon threshold, deletion cost, and free-play source |
| BT13-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; combined-security reveal and attack-cost source |
| BT13-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area condition correction and breeding boundary `fedcb3f94` |
| BT13-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; reveal groups, trait exclusions, and inherited aura source |
| BT13-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Yoshino correction and ST24-14 boundary `026b6cda1` |
| BT13-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; suspend cost, Fairy evolution, and inherited reduction source |
| BT13-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Piercing and inherited trait/exception source |
| BT13-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area opponent condition and breeding boundary `0b4a35396` |
| BT13-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; independent lock target and inherited reduction source |
| BT13-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Yoshino correction and ST24-14 boundary `61ed79948` |
| BT13-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact bracket selectors and inherited source correction `d0b846b79` |
| BT13-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Green/Royal Knight OR routes and shared Once Per Turn source `1aa50198b` |
| BT13-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent source gate `7a75bfbd0`; optional processing correction `b71402198` |
| BT13-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Leopardmon correction `8c71d2a04`; three timing windows `e32990ae4` |
| BT13-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact DNA matcher `e38fc7521`; duration and natural OPT boundaries |
| BT13-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Real Burst correction `71fd59eb7`; battle-area scaling boundaries `f90c611fc` |
| BT13-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; opponent-turn reveal/add/bottom boundaries |
| BT13-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Chuumon correction `83115fa53`; optional instance proof `b9f60027d` |
| BT13-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; live X Antibody inherited DP boundary |
| BT13-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2306 deleted-source threshold source `a508ef088` |
| BT13-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2307 cross-controller replacement and De-Digivolve stack |
| BT13-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; live X Antibody inherited DP boundary |
| BT13-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct Jamming and inherited Reboot phase source |
| BT13-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon play and alternate evolution boundaries |
| BT13-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Sukamon play, replacement, and evolution boundaries |
| BT13-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon play and alternate evolution boundaries |
| BT13-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opposing suspension events, same-turn OPT, and live Blocker proof |
| BT13-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; reveal/place-under, immunity, and inherited stack proof |
| BT13-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Real Chessmon alternate evolution, non-Chessmon rejection, and Blocker proof |
| BT13-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; reveal/play and dynamic Jamming/Reboot proof |
| BT13-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Dynamic restriction, optional cost, and by-effect replacement corrections |
| BT13-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | All-target return-protection correction and controller/turn boundaries |
| BT13-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Forced Attack correction, accept/decline, immunity, and Blocker proof |
| BT13-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Empty-hand draw/trash ordering and same-turn inherited OPT proof |
| BT13-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Retaliation grant and outside-battle deletion boundaries |
| BT13-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Breeding kind, CostGatedBlock, exact target, and independent decline corrections |
| BT13-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play, On Deletion, and inherited end-of-turn proof |
| BT13-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Outside-battle versus by-battle deletion boundary proof |
| BT13-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact identities, CostGatedBlock, ordered bottom-deck return, and independent decline corrections |
| BT13-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Real On Play processing and inherited hand-trash proof |
| BT13-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Ravemon correction and natural attack/deletion proof |
| BT13-086 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact identity and mandatory Akihiro corrections; reducer/restriction execution remains structural |
| BT13-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Royal Knight play and four-card reveal/add/trash proof |
| BT13-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Rage Mode, CR 15-7 optional processing, restriction, immunity, and attack proof |
| BT13-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact identities, natural delayed play, deletion play, and Burst boundary proof |
| BT13-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area scaling, source-inclusive count, breeding exclusion, and Once Per Turn proof |
| BT13-091 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural main-phase deletion; hand-size, attack-end, and inherited stack branches remain partial |
| BT13-092 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Burst host and rule-owned pending-trash corrections; effect bodies remain partial |
| BT13-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact King Drasil destination and natural deletion-to-breeding placement proof |
| BT13-094 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Biyomon granted-effect correction and natural recipient deletion/play proof |
| BT13-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area condition, natural suspension, Q2341 no-target, and breeding-negative proof |
| BT13-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Correct hand/host placement, CR 15-7 CostGatedBlock, and independent decline proof |
| BT13-097 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Accept/decline and both-player draw source; originating attack remains a direct timing seam |
| BT13-098 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Kudamon/Kentaurosmon correction and live security/Main proof; threshold boundary partial |
| BT13-099 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Live treated-as-Digimon positive case; suspension and high-security negatives remain partial |
| BT13-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional suspend cost correction and natural qualifying evolution accept/decline proof |
| BT13-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Both-color watcher, optional suspend processing, and natural decline proof |
| BT13-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent hand-trash decline receipt and effect-play versus ordinary-play boundary |
| BT13-103 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Belphemon cost replacement and end-of-opponent-turn branch proof |
| BT13-104 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus target and real near-name negative proof |
| BT13-105 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Main post-return hand scaling and independent Security return proof |
| BT13-106 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Direct security-trash provenance and combined-security threshold proof |
| BT13-107 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Leopard Mode top-card detachment, Q2359/Q2360, DP-bearing egg, and decline proof `baa281c39` |
| BT13-108 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural granted-aura host, opponent-turn suspension, cost boundary, and Option immunity proof |
| BT13-109 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Sleep Mode target with legal and illegal evolution-stack boundaries |
| BT13-110 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact King Drasil host and mandatory post-Delay Royal Knight play proof |
| BT13-111 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area reducer gate, combined-trash calculation, and breeding-only boundary `6a44faefb` |
| BT13-112 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Distinct playable Royal Knights, restriction boundary, ordered breeding cleanup, and Rush proof `9a67b9602` |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Corrected: 47
- Provisional: 112
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 1
- Remaining unassigned: 0

BT13's static card-by-card source pass is exhausted. Execution gates remain
deferred, so every score is provisional and no collection-complete or 10/10
claim is made.
