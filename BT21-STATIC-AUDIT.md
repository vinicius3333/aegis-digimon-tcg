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
| BT21-021–030 | Luna ready; pushed | `internal-docs/audits/BT21/BT21-021-030.md` | No |
| BT21-031–040 | Luna ready; pushed | `internal-docs/audits/BT21/BT21-031-040.md` | No |
| BT21-041–050 | Luna assigned | `internal-docs/audits/BT21/BT21-041-050.md` | No |
| BT21-051–060 | Luna assigned | `internal-docs/audits/BT21/BT21-051-060.md` | No |
| BT21-061–070 | Luna assigned | `internal-docs/audits/BT21/BT21-061-070.md` | No |
| BT21-071–080 | Luna assigned | `internal-docs/audits/BT21/BT21-071-080.md` | No |
| BT21-081–090 | Luna assigned | `internal-docs/audits/BT21/BT21-081-090.md` | No |
| BT21-091–100 | Unassigned | `internal-docs/audits/BT21/BT21-091-100.md` | No |
| BT21-101–102 | Unassigned | `internal-docs/audits/BT21/BT21-101-102.md` | No |

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

## Aggregate

- Catalog cards: 102
- Assigned: 90
- Integrated card audits: 20
- Corrected: 10
- Provisional: 20
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 7
- Remaining unassigned: 12

BT21 static auditing is in progress; accepted ranges are eligible for strict
chronological integration.
