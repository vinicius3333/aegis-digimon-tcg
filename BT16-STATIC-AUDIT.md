# BT16 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT16-001` through `BT16-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT16/` and integrated here only
after coordinator review. Every card must be reread independently against the
immutable catalog, current KB, direct module, compiled IR and shared runtime,
useful peers, and behavior-driving source proof.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT16-001–010 | Coordinator reviewed | `internal-docs/audits/BT16/BT16-001-010.md` | Yes |
| BT16-011–020 | Coordinator reviewed | `internal-docs/audits/BT16/BT16-011-020.md` | Yes |
| BT16-021–030 | Coordinator reviewed | `internal-docs/audits/BT16/BT16-021-030.md` | Yes |
| BT16-031–040 | Coordinator reviewed | `internal-docs/audits/BT16/BT16-031-040.md` | Yes |
| BT16-041–050 | Coordinator accepted; awaiting BT16-031–040 | `internal-docs/audits/BT16/BT16-041-050.md` | No |
| BT16-051–060 | Luna assigned | `internal-docs/audits/BT16/BT16-051-060.md` | No |
| BT16-061–070 | Coordinator accepted; awaiting earlier ranges | `internal-docs/audits/BT16/BT16-061-070.md` | No |
| BT16-071–080 | Coordinator accepted; awaiting earlier ranges | `internal-docs/audits/BT16/BT16-071-080.md` | No |
| BT16-081–090 | Luna assigned | `internal-docs/audits/BT16/BT16-081-090.md` | No |
| BT16-091–100 | Luna assigned | `internal-docs/audits/BT16/BT16-091-100.md` | No |
| BT16-101–102 | Luna assigned | `internal-docs/audits/BT16/BT16-101-102.md` | No |

Process note: during BT16-011 inspection, the worker accidentally invoked one
scoped `git diff --check -- <files>` command. It returned no output, was
disclosed in the range report, and earns no executed-gate credit. No other
prohibited execution command was reported for BT16-011–020.

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
other component and is never rounded up. Structural-only assertions do not
receive full behavioral credit unless they drive the relevant production
behavior. Manual event-bus or timing injection does not substitute for a
feasible natural originating event.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT16-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Catalog/KB and inherited IR matched; natural multicolor attacks prove DP boundary and once-per-turn suppression (`be4922698`). |
| BT16-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live-color inherited aura traced; legal evolution from a multicolor host to a single-color top proves recomputation (`7185afbe1`). |
| BT16-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Conditional inherited Blocker traced through the keyword ledger and proved by a natural opponent attack/block battle (`012bdb92e`). |
| BT16-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletions prove the two-color gate and shared once-per-turn frequency without event injection (`1aa0a1e7a`, `0307ceae7`). |
| BT16-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2601–Q2603 and deletion snapshots matched; registered Blocker peers prove natural, repeated, and simultaneous-deletion boundaries (`7d1972035`). |
| BT16-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mandatory inherited hand-trash cost traced transactionally and proved through natural deletion with and without a payable card (`9b2a6cd9f`). |
| BT16-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2604, alternate Poromon evolution, post-event identity, cross-event frequency, and inherited attack suspension have natural public-intent proof (`c4579240c`). |
| BT16-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate Hawkmon evolution, exact deletion boundary, inherited suspension, and Jamming Security survival are naturally sourced (`2d6d16b2c`). |
| BT16-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate Gatomon evolution and DP duration matched; real battles prove Raid redirection and Armor Purge promotion (`2de96671d`). |
| BT16-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2605, SoC evolution, natural turn boundary, Retaliation, no-target cost, and optional trash-play refusal are covered (`40ebe7d16`). |
| BT16-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Garudamon-name/X Antibody-trait matching and mandatory follow-up deletion; natural play/evolution, DP boundary, decline, and Rush proof (`594a36a67`, `937070722`). |
| BT16-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | DNA materials, Partition, DNA-only DP reduction, normal-evolution negative, and natural attack boundary match the compiled IR (`a8e0bfdc4`). |
| BT16-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2606–Q2611 and the once-per-turn security-removal branch are proved through natural play, evolution, removal, and attack flows (`20082a895`). |
| BT16-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2612–Q2613, Raid, no-cost Option use, alternate evolution, and Goldramon source inheritance are traced through legal stacks (`14fce640d`). |
| BT16-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected Phoenixmon-name/X Antibody-trait source conditions; natural Blitz, projection, source-lapse, deletion, and played-card DP proof cover Q2614–Q2615 (`da00a4c2a`). |
| BT16-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Tokomon evolution, reduced-cost Angel/Free evolution, and inherited top-source trash are naturally sourced and match Q2816 (`cffa500c9`). |
| BT16-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2616 post-evolution subject binding, shared once-per-turn play/evolution frequency, negative matching, and inherited DP have realistic peer/stack proof (`1b1c9080f`). |
| BT16-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2617 battle-only protection is proved by natural play/evolution selection and a losing Security battle, with inherited DP stack coverage (`ff4b1bb3e`). |
| BT16-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Blocker, level-bounded unsuspend, and inherited top-source trash are exercised through natural play, evolution, and attack intents (`664023dae`). |
| BT16-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2775 draw/condition ordering, off-color alternate evolution, both memory branches, matcher negatives, and natural inherited Jamming are covered (`b5be60b9b`). |
| BT16-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected loose-card Trash to top-source TrashDigivolution with a source gate; natural opposing attack proves suspension, trashing, and restriction (`7fce2b6d7`). |
| BT16-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural inherited attack proves arbitrary evolution-card trash, no-source targeting, duration, and Armor Purge/alternate metadata (`8342f21eb`). |
| BT16-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2618 exact-three overlap and optional End-of-Attack cost are proved through natural On Play, attack, security trash, and legal source stack (`0c13ed5b8`). |
| BT16-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected full-security Search to `to: "revealed"` with typed/runtime support; Q2619–Q2621/Q3747, reduced evolution, remainder, and inherited Blocker have natural proof (`c8fcb07b9`). |
| BT16-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2622/Q2887–Q2889, DNA/Partition, stack-count boundary, DNA-only lock, natural attack suspension, and fallback unsuspend are covered (`ab2b6caef`). |
| BT16-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | ACE/overflow, alternate routes, natural De-Digivolve/restriction/deletion, and real Counter-Timing Blast Digivolve match shared runtime (`7ab98bae9`). |
| BT16-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inclusive source-stack comparison, natural play/evolution, Dragon Mode stack branch, End-of-Attack unsuspend/bottom-deck, and frequency boundary are proved (`728814e62`). |
| BT16-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected cross-permanent effect provenance to `triggerPlayedOrDigivolvedByEffect`; Q2623–Q2624, legal evolution, Tamer gate, and natural opponent effect-entry Blast routes are covered (`c1df3709e`). |
| BT16-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2625 one-card union selection, exact reveal remainder, off-color Light Fang evolution, and inherited Security DP are naturally proved (`7fa5608fe`). |
| BT16-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2626 requirement enforcement, natural On Play/Main Phase trash evolution, Nyaromon route, rejection boundary, and inherited Security DP are covered (`3b6f7932d`). |
| BT16-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected both recovery filters to require exactly two colors; natural play/evolution, payment, invalid color-count and level boundaries, and inherited Security DP are covered (`73dbd49f9`). |
| BT16-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Collision target switching, optional end-attack acceptance/decline, once-per-turn frequency, Armor Purge, and Armadillomon evolution match the compiled IR (`2bcddd88f`). |
| BT16-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2629 and natural Security checks prove both security-count branches, source-lapse behavior, Armor Purge, and Hawkmon evolution (`0225e1d38`). |
| BT16-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2630 exact-three overlap, low-security boundary, natural inherited security trash/unsuspend, top-card text negative, and Runnermon evolution are covered (`b3585b7d4`). |
| BT16-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the missing Yellow and Black level-5 cost-3 evolution routes; natural security removal, opponent negative, Barrier, Reboot, and both routes are proved (`e0040cba8`). |
| BT16-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Yellow/Black DNA, invalid material rejection, De-Digivolve/-8000, Blocker, Partition, and both-player end-turn security trash match the IR (`19990f7a5`). |
| BT16-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact reveal selection/remainder, no-match bottoming, Minomon evolution, and suspension-gated inherited DP are naturally covered (`7813634a0`). |
| BT16-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Zero-cost Terriermon evolution, matching/nonmatching evolution-cost replacement, and positive/negative inherited Piercing hosts have natural proof (`bb59f6bee`). |
| BT16-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2632–Q2633 category overlap, no duplicate take, exact remainder, Bibimon evolution, and live inherited top-card text gates are covered (`5087d1210`). |
| BT16-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2634 requirement enforcement, both natural trash-evolution timings, Minomon route, and inherited attack suspension/reset are covered (`f8940de55`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 40
- Corrected: 7
- Provisional: 40
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT16 static re-audit is in progress.
