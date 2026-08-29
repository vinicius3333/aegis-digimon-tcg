# BT24 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT24-001` through `BT24-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT24/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT24/`. BT24 work may be prepared in parallel, while
accepted ranges are integrated in strict ascending order.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT24-001–010 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-001-010.md` | Yes |
| BT24-011–020 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-011-020.md` | Yes |
| BT24-021–030 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-021-030.md` | Yes |
| BT24-031–040 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-031-040.md` | Yes |
| BT24-041–050 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-041-050.md` | Yes |
| BT24-051–060 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-051-060.md` | Yes |
| BT24-061–070 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-061-070.md` | Yes |
| BT24-071–080 | Luna assigned | `internal-docs/audits/BT24/BT24-071-080.md` | No |
| BT24-081–090 | Luna assigned | `internal-docs/audits/BT24/BT24-081-090.md` | No |
| BT24-091–100 | Luna assigned | `internal-docs/audits/BT24/BT24-091-100.md` | No |
| BT24-101–102 | Luna assigned | `internal-docs/audits/BT24/BT24-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT24-001 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Opponent-security gate, 3000/4000 DP boundary, decline, and once-per-turn behavior use a manually fired security event. |
| BT24-002 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self-bound blue/TS unsuspend, memory payment, decline, and once-per-turn behavior use direct end-turn timing. |
| BT24-003 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Own-security gate and reduced Shaman evolution are covered through a manually fired security-removal watcher. |
| BT24-004 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Own Iliad, trait/controller negatives, and once-per-turn draw are covered through manually supplied play events. |
| BT24-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Tamer-only stack addition and three-card top/bottom restack are traced through manual stack placement. |
| BT24-006 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self-linked draw-then-trash, wrong-host rejection, and once-per-turn identity use direct link-event injection. |
| BT24-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trigger-bound hand trash, level/trait boundary, and paid reduced play use the hand-trash primitive. |
| BT24-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional On Play trash/Draw 2 and opponent-security memory are covered through direct timing events. |
| BT24-009 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional On Play payment and inherited reduced Titan evolution use direct play and hand-trash origins. |
| BT24-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Blocker, one-target De-Digivolve, Raid, and alternate TS evolution are covered; deletion uses a primitive. |
| BT24-011 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural TS digivolution and Rush/Raid behavior are covered; representative mixed-stack/peer evidence remains partial. |
| BT24-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Blocker, simultaneous protection, cause rejection, and inherited security trigger use harness primitives. |
| BT24-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand-size draw, shared delete frequency, and inherited trash evolution rely partly on primitive event helpers. |
| BT24-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both Decode actions now bind to the leaving Digimon's own stack; DP/delete and security boundaries remain harness-driven. |
| BT24-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security play, Blocker, target-switch lowest-DP deletion, and inherited Blocker deletion use manual event origins. |
| BT24-016 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Owen/Elizamon stack construction, security ordering, and inherited hand play are covered through harness timing. |
| BT24-017 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Token branch, exact two-card payment, DP scaling, and token deletion are direct; natural origins and peer proof remain partial. |
| BT24-018 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Keywords, security sequence, removal watcher, and simultaneous replacement are covered through manually fired timings. |
| BT24-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public digivolution intent proves the blue-TS reduction and breeding-area exclusion with legal host/stack peers. |
| BT24-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Independent reveal categories, bottom-deck remainder, and inherited unsuspend draw use direct On Play/unsuspend timing. |
| BT24-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Search categories, zero-cost alternatives, and inherited trash evolution are covered, but the timing origins remain harness-driven. |
| BT24-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry trash/restriction ordering and inherited unsuspend draw use manually fired timing and source-count fixtures. |
| BT24-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry bottom-deck/restriction, Decode, effect-play, and battle-deletion boundaries rely on direct event origins. |
| BT24-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional reduced-cost TS Tamer play, refusal, Armor Purge, and both evolution routes are covered through harness timing. |
| BT24-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5603–Q5605 color, trait, cost, and timing limits plus inherited Jamming are asserted without a natural unsuspend origin. |
| BT24-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5606–Q5607, shared frequency, hand-trash cost, targeting, and inherited trash evolution remain partly primitive-driven. |
| BT24-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Mandatory stack placement, protection, Decode boundaries, and inherited draw are covered through direct timing fixtures. |
| BT24-028 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Placement, temporary protection/Blocker, Q5608 evolution, and own-stack play are asserted without full natural origins. |
| BT24-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5609 placement branches, restriction, end-of-attack play, and inherited own-stack play rely on harness timing. |
| BT24-030 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Cost reduction, tied-source bottom-deck, suspend-to-unsuspend, and Q5610 group protection use direct timing origins. |
| BT24-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Distinct reveal pools and the Q5611 zero-security decline case are observable, but On Play and attack timings are manually fired. |
| BT24-032 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural link/evolution paths and reveal categories are covered; the central On Play reveal remains manually originated. |
| BT24-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle-area and breeding-area digivolutions prove the Iliad cost reduction scope and inherited Barrier. |
| BT24-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5613/Q6713 payment and exact-name behavior are covered, while the three entry timings remain manually fired. |
| BT24-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5614 DNA/0-DP ordering, turn boundary, and inherited Barrier are observable, but entry timing is injected. |
| BT24-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Security now defers through `whenSecurityBattleEnded` and plays self from trash; a natural security attack proves the path. |
| BT24-037 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural DNA and leave-replacement paths cover stacks and causes, but the positive entry timing remains manually fired. |
| BT24-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link, Fortitude, own-stack, and App Fusion behavior are covered; free-link entry is still manually originated. |
| BT24-039 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security level boundary, inherited Recovery, keywords, and evolution are covered; Security timing is manually fired. |
| BT24-040 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both trash-all clauses now use the runtime-supported `amount: "all"`; the entry stack-clearing origin remains manual. |
| BT24-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Cost reduction and Q5627–Q5629 outcomes are covered, while the central entry sequence is manually fired. |
| BT24-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | The inherited evolution now requires its own Demon/Titan host, with natural positive and nonmatching-host negative paths. |
| BT24-043 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Search union/exclusion, remainder, evolution, and inherited suspension are covered with manual play/attack timings. |
| BT24-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5632/Q5633 any-side suspension and battle-deletion boundary are covered, but On Play remains manually fired. |
| BT24-045 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand-size timing and inherited Titan evolution are natural; the central suspend/restrict timing remains manual. |
| BT24-046 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry, Jamming, and evolution routes are natural, while inherited once-per-turn attack timing is injected. |
| BT24-047 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Any-side suspension and Q5637 battle boundary are covered; the full entry sequence still uses manual timing. |
| BT24-048 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hatch, breeding evolution, Blocker, and inherited battle behavior are covered without a natural When Digivolving origin. |
| BT24-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A real BT24-098 Delay activation naturally effect-plays Parrotmon and proves the lowest-DP suspended return. |
| BT24-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, attack, Evade, exact trait union/exclusion, and alternate stacks cover the printed behavior. |
| BT24-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play now proves Q5641 reduced cost, suspension, buff, and mandatory attack through observable state. |
| BT24-052 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q5642 applies to the host text condition; the payment remains exact Diaboromon, while leave replacement uses a direct deletion verb. |
| BT24-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and Appmon linking prove cost, DP, host rejection, and both printed Blocker faces. |
| BT24-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Shuu play/evolution routes are covered; inherited suspension remains driven by a direct suspend primitive. |
| BT24-055 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry proves Shuu placement/protection; inherited suspension and decline evidence remain primitive-driven. |
| BT24-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, evolution, and link intents prove protection, revival, link DP, and the deletion boundary. |
| BT24-057 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security, play, evolution, link, and Q5643 ordering are covered; standalone On Deletion uses a direct deletion verb. |
| BT24-058 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution covers the main reveal path, while the under-host destination is manually timed. |
| BT24-059 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution/attack paths cover stack behavior; the On Deletion reveal uses a direct deletion verb. |
| BT24-060 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural attack proves reveal evolution; Tamer placement and Q5782 simultaneous protection use direct primitives. |
| BT24-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, return, inherited attack, and alternate-stack paths cover all printed clauses. |
| BT24-062 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public End of Attack is covered; the shared End of Opponent's Turn branch remains manually fired. |
| BT24-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/digivolution proves reveal, free play, restack, Collision, and inherited stack behavior. |
| BT24-064 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution covers reveal and keywords; the any-side suspension watcher uses a direct suspend primitive. |
| BT24-065 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Diaboromon/source-stack semantics and Q5644–Q5646 are traced, while replacement leave uses direct deletion. |
| BT24-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, evolution, reveal slots, hand trash, and inherited attack prove the card-specific behavior. |
| BT24-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public link operation proves the Rei gate, exact name, Tamer count, link cost, DP, and host scope. |
| BT24-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution/attack proves dual reveal categories, hand trash, remainder, and both-deck mill. |
| BT24-069 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural digivolution/attack covers discard branches and aura threshold; When Moving remains manually fired. |
| BT24-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, hand gate, trash Tamer play, and inherited attack cover the printed clauses. |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 70
- Corrected: 4
- Provisional: 70
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 55
- Remaining unassigned: 0

BT24 static auditing is prepared across five parallel Luna/xhigh lanes.
Accepted ranges will be integrated in strict ascending BT24 order.
