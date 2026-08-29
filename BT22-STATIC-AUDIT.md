# BT22 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT21 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT22-001` through `BT22-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT22/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT22/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT22-001–010 | Coordinator reviewed | `internal-docs/audits/BT22/BT22-001-010.md` | Yes |
| BT22-011–020 | Coordinator reviewed | `internal-docs/audits/BT22/BT22-011-020.md` | Yes |
| BT22-021–030 | Coordinator reviewed | `internal-docs/audits/BT22/BT22-021-030.md` | Yes |
| BT22-031–040 | Luna assigned | `internal-docs/audits/BT22/BT22-031-040.md` | No |
| BT22-041–050 | Luna assigned | `internal-docs/audits/BT22/BT22-041-050.md` | No |
| BT22-051–060 | Luna assigned | `internal-docs/audits/BT22/BT22-051-060.md` | No |
| BT22-061–070 | Luna assigned | `internal-docs/audits/BT22/BT22-061-070.md` | No |
| BT22-071–080 | Luna assigned | `internal-docs/audits/BT22/BT22-071-080.md` | No |
| BT22-081–090 | Unassigned | `internal-docs/audits/BT22/BT22-081-090.md` | No |
| BT22-091–100 | Unassigned | `internal-docs/audits/BT22/BT22-091-100.md` | No |
| BT22-101–102 | Unassigned | `internal-docs/audits/BT22/BT22-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT22-001 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Effect provenance corrected; positive path remains primitive-driven and fixture stack is not legal. |
| BT22-002 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Puppet/Token deletion union traced; direct deletion primitive and illegal host stack limit proof. |
| BT22-003 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Self-link DP watcher traced; Link timing is manual and the focused host stack is not legal. |
| BT22-004 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Effect provenance corrected; event is injected and focused CS evolution stack is not legal. |
| BT22-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | CS/Unidentified play watcher has a legal peer stack, but play events remain manually fired. |
| BT22-006 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Effect provenance corrected with a natural top-to-bottom rotation; lower evolution edge is illegal. |
| BT22-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Mother Eater rules, replacement, DP, and peers traced; principal timing remains manually entered. |
| BT22-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural card identities and legal DNA stack; End Turn DNA timing remains manually fired. |
| BT22-009 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Entry/link/Security IR traced; behavior is manual or structural without a legal proving stack. |
| BT22-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main activation, exact payment, keywords, attack sequence, and legal inherited stack. |
| BT22-011 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Main play/payment and inherited Alliance; optional follow-up attack remains structural. |
| BT22-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Tamer-count and free-play boundaries traced; When Digivolving timing remains direct. |
| BT22-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural paid Agumon evolution; modal evolution and inherited attack timing remain direct. |
| BT22-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Ordered unsuspend/attack and keywords traced; target-switch reaction remains manually injected. |
| BT22-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both Decode replacements corrected; leave reaction remains direct and bodies structural. |
| BT22-016 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reveal buckets; When Linking source remains directly entered. |
| BT22-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reveal and legal DNA peers; End Turn DNA timing remains direct. |
| BT22-018 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Host binding and grants traced on a valid peer; On Play timing remains directly fired. |
| BT22-019 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural reducer/breeding boundary; inherited leave prevention uses direct primitives. |
| BT22-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Placement, draw, no-entry timing, and legal stack traced; attack timing remains direct. |
| BT22-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Executable own-stack Decode corrected; leave behavior remains direct and unexecuted. |
| BT22-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Text-wide Veedramon match and legal CS stack traced; protection uses direct effect deletion. |
| BT22-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry, end-turn, and inherited host clauses traced; several timings remain manually fired. |
| BT22-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Sangomon host binding, own-stack inherited play, and Decode corrected; leave proof remains direct. |
| BT22-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both modal branches and peers traced; entry timings remain directly supplied. |
| BT22-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Agumon/WarGreymon Digimon-kind constraints corrected; same-name non-Digimon negative remains structural. |
| BT22-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Executable Decode corrected and source-add watcher stays self-scoped; producer path uses a placement helper. |
| BT22-028 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Decode and all three own-stack play buckets corrected; timing and leave paths use direct helpers. |
| BT22-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both entry/deletion timings and inherited debuff traced; timing remains directly supplied. |
| BT22-030 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural link and legal linked host traced; linked attack timing remains directly supplied. |

## Aggregate

- Catalog cards: 102
- Assigned: 80
- Integrated card audits: 30
- Corrected: 9
- Provisional: 30
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 29
- Remaining unassigned: 22

BT22 static auditing is in progress. Accepted ranges will be integrated in
strict ascending order while later Luna lanes prepare in parallel.
