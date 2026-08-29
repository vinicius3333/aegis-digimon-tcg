# BT25 Static Card Implementation Re-audit

Status: static card-by-card audit active; coordinator integration complete through BT25-070

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 104 cards, `BT25-001` through `BT25-104`, derived from
the immutable committed card-catalog blob and reconciled with the 104 direct
card modules in `apps/api/src/cards/BT25/`.

This ledger follows the repository's `verify-card-implementation` protocol.
Detailed English reports belong under `internal-docs/audits/BT25/`. BT24 static
integration is closed; BT25 ranges are now reviewed and integrated in ascending
order by the coordinator.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, and the focused,
mechanism, and collection gates remain unexecuted. One accidental read-only
`git diff --check` invocation occurred in the BT25-061–070 child before its
semantic commit and returned no output; it is disclosed in that range report
and does not constitute the full delivery-gate component. Every score remains
provisional and capped at 8/10.

All 104 direct BT25 modules currently contain `registerIrCard`; none contains
`registerCard`. Each audited module must retain exclusive executable
registration through `registerIrCard(cardId, compiled)`.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT25-001–010 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-001-010.md` | Yes |
| BT25-011–020 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-011-020.md` | Yes |
| BT25-021–030 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-021-030.md` | Yes |
| BT25-031–040 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-031-040.md` | Yes |
| BT25-041–050 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-041-050.md` | Yes |
| BT25-051–060 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-051-060.md` | Yes |
| BT25-061–070 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-061-070.md` | Yes |
| BT25-071–080 | Unassigned | `internal-docs/audits/BT25/BT25-071-080.md` | No |
| BT25-081–090 | Unassigned | `internal-docs/audits/BT25/BT25-081-090.md` | No |
| BT25-091–100 | Unassigned | `internal-docs/audits/BT25/BT25-091-100.md` | No |
| BT25-101–104 | Unassigned | `internal-docs/audits/BT25/BT25-101-104.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT25-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove TS-host Draw 1, non-TS rejection, and the inherited once-per-turn limit. |
| BT25-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DATA SQUAD Tamer play proves both-player draw, controller/turn scope, and once-per-turn behavior. |
| BT25-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A public attack proves the top-security cost, reduced Glowing Dawn evolution, stack change, and decline path. |
| BT25-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A public Link declaration on a legal stack proves recipient scope, eligible trait, cost reduction, and placement. |
| BT25-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Watcher and destination behavior are covered, but the positive stack-placement origin uses a direct primitive. |
| BT25-006 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A public opponent attack proves the positive branch; no-target and frequency/decline paths use injected subtriggers. |
| BT25-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Link/evolution proves stack and deletion boundaries, while the central reveal timing is manually fired. |
| BT25-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public play and breeding movement prove paid-count scaling; decline and inherited-turn edges remain manually driven. |
| BT25-009 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Memory, trait/exclusion, evolution, and inherited DP boundaries are covered through manual Start of Main timing. |
| BT25-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural eligible digivolution proves the cost reduction; exclusion, breeding, and inherited-turn edges remain structural. |
| BT25-011 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play proves suspension and DNA digivolution; generic Raid runtime remains unresolved. |
| BT25-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and digivolution origins cover the exact target union, Raid, DP gain, target reuse, and stack binding. |
| BT25-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Cost/decline, recovery, blue-gated evolution, and inherited DP behavior align with Q6255–Q6257. |
| BT25-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural behavior covers the optional hand cost, deletion boundary, no-deletion draw branch, and inherited attack deletion. |
| BT25-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and battle prove deletion and inherited security trash; Q6261 source-survival gating was corrected. |
| BT25-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural threshold, DP modification, attack origin, optional decisions, and evolution-stack behavior are represented. |
| BT25-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural positive, negative, and boundary behavior covers the attack, trash cost, deletion, and gated evolution. |
| BT25-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, digivolution, DNA acceptance/decline, post-DNA attack, and inherited deletion behavior are represented. |
| BT25-019 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/deletion and evolution are covered, but immunity assertions manually fire end-of-turn timing. |
| BT25-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural cost thresholds, direct battles, trigger windows, decline, stack evolution, and security trash are represented. |
| BT25-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play behavior proves both reveal search pools and bottom-deck handling for unmatched cards. |
| BT25-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play behavior proves distinct Iliad/TS search pools, uniqueness, and bottom-deck handling. |
| BT25-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, the two-Tamer boundary, inherited attack draw, target binding, and stack behavior are covered. |
| BT25-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and red/non-red events cover Draw, fire-time color gating, decline, and post-evolution binding. |
| BT25-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Decode and security behavior are covered, but deletion and security removal originate through named test seams. |
| BT25-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry and watcher behavior are covered, but color-gated cases use named subtrigger/timing seams. |
| BT25-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural digivolution plus sequenced decisions prove accepted payment/unsuspend and declined non-payment. |
| BT25-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, entry/release, effect-play, digivolution, DNA, and inherited restriction behavior are covered. |
| BT25-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural digivolution plus sequenced decisions prove the first return and optional paid follow-up boundaries. |
| BT25-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn progression and attack origins prove the security cost, memory gain, and zero-security Recovery. |
| BT25-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact reveal pools, distinct-card consumption, remainder handling, evolution, and Barrier are structurally covered; no natural reveal execution was added. |
| BT25-032 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact Glowing Dawn and yellow BEATBREAK reveal filters plus evolution and Barrier are structural-only in the focused source. |
| BT25-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry/evolution, accepted and declined security payment, target boundaries, and duration are represented. |
| BT25-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q6298 direct security-trash timing, filters, Ascension, Barrier, and evolution remain source-structural without a natural origin. |
| BT25-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both entry sequences and the exact multi-Tamer bottom-card cost are structural; natural processing remains unproved in this pass. |
| BT25-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected omitted Appmon Link cost/effect; natural Link assertions cover payment, refusal, host, cost-card, and Draw 2 boundaries. |
| BT25-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution covers security movement, top/bottom placement, refusal, zero-security behavior, Armor Purge, and both routes. |
| BT25-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Placement and DNA behavior are represented, but the positive security watchers rely on named timing/subtrigger injection. |
| BT25-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security play, departure replacement, deletion placement, redirect scope, decline, and once-per-turn paths are represented. |
| BT25-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural accepted/declined security costs, direct effect-trash play, duration, stack behavior, and inherited scope are represented. |
| BT25-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A natural attack covers one play branch; nested cost modes and inherited End of Attack remain source-level or manually driven. |
| BT25-042 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural On Play payment drives the security watcher, while shared immunity variants and same-target keyword behavior retain direct timing coverage. |
| BT25-043 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Recovery/most-security and leave-replacement behavior rely on direct trigger invocation rather than complete natural origins. |
| BT25-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Placement and bilateral trash sequencing are represented; reducer and watcher boundaries remain structural or primitive-origin. |
| BT25-045 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Live Link paths cover placement and suspension, but the exact cost delta and decline comparison use an isolated runtime harness. |
| BT25-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural On Play proves both distinct reveal pools and bottom-deck remainder; evolution and inherited Piercing have peer/stack evidence. |
| BT25-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural On Play proves Vegetation/Shaman and TS selection plus remainder handling; evolution and inherited aura have peer/stack evidence. |
| BT25-048 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural digivolution and battle-win draw are represented, but the complete negative timing/frequency boundary remains incomplete. |
| BT25-049 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry suspension is covered; the Glowing Dawn Option payment/reduction lacks a natural Option-use origin. |
| BT25-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural On Play covers threshold and decline; When Digivolving and turn-expiry boundaries remain incomplete. |
| BT25-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves the exact eligible/near-match DP filter, and a realistic inherited stack proves battle-win Draw 1. |
| BT25-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Link and linked-reaction paths cover cost, source, target, and Kazuki & Itsuki Tamer-count boundaries. |
| BT25-053 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry/evolution covers binding and threshold grants; the inherited security-removal watcher uses named event injection. |
| BT25-054 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural battle proves free evolution, while forced-main timing and inherited battle-deletion behavior rely on timing/subtrigger seams. |
| BT25-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural suspension proves the self-only once-per-turn free play; entry, redirect, trait, threshold, and stack boundaries are represented. |
| BT25-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution/Link scenarios cover legal sources, payment, linked timing, target scope, and physical-card identity. |
| BT25-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and Option play prove the mandatory accepted cost, refusal, De-Digivolve, battle, same-target grants, and duration. |
| BT25-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected mandatory Then restriction after declined suspension; natural entry/attack and effect-play/digivolve paths cover the remaining sequence. |
| BT25-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed stale keywords; natural behavior covers reducer threshold, either-side suspension, protection, and per-suspended-Digimon scaling. |
| BT25-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Link/evolution covers accepted and declined processing, legal candidates, no-op unsuspend, grants, immunity, and cross-card isolation. |
| BT25-061 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Restored the compiled Appmon Link cost-1 requirement; natural Link is covered, while the principal start-main effect uses the named timing seam. |
| BT25-062 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Q6364 memory, refusal, trait, evolution, and stack boundaries are represented, but free evolution starts from direct start-main timing. |
| BT25-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and breeding movement prove both reveal origins, name/trait filters, remainder choice, evolution, and inherited DP. |
| BT25-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves distinct Option/TS reveal selection and remainder handling; evolution and inherited Reboot have stack proof. |
| BT25-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural suspend and player-attack paths cover Draw 1, memory loss, turn/target gates, evolution, and inherited DP. |
| BT25-066 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link-card replacement costs, refusal, wrong-host rejection, evolution, and stack DP are represented through a production deletion primitive. |
| BT25-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural self-play and matching peer plays prove Q6365, reduction/payment, refusal, turn/trait gates, evolution, and inherited DP. |
| BT25-068 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Collision, self-only once-per-turn budgets, De-Digivolve, evolution, and stack DP are covered with primitive-origin suspension. |
| BT25-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves free TS Link, legal-Link-card filtering, recipient and zone movement, Jamming, and inherited DP. |
| BT25-070 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Restored the compiled Appmon Link cost-2 requirement; natural linked-face behavior is covered, while the Main Link uses a declaration seam. |

## Aggregate

- Catalog cards: 104
- Assigned: 70
- Integrated card audits: 70
- Corrected: 6
- Provisional: 70
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 30
- Remaining unassigned: 34

BT25 static integration is complete through BT25-070. BT25-071 through
BT25-104 remain in the coordinator-managed queue.
