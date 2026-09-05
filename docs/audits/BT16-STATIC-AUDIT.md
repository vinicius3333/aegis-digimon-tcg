# BT16 Static Card Implementation Re-audit

Status: static card-by-card coverage complete; execution gates deferred; collection remains open

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT16-001` through `BT16-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT16/` and integrated here only
after review. Every card must be reread independently against the
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
| BT16-001–010 | Reviewed | `internal-docs/audits/BT16/BT16-001-010.md` | Yes |
| BT16-011–020 | Reviewed | `internal-docs/audits/BT16/BT16-011-020.md` | Yes |
| BT16-021–030 | Reviewed | `internal-docs/audits/BT16/BT16-021-030.md` | Yes |
| BT16-031–040 | Reviewed | `internal-docs/audits/BT16/BT16-031-040.md` | Yes |
| BT16-041–050 | Reviewed | `internal-docs/audits/BT16/BT16-041-050.md` | Yes |
| BT16-051–060 | Reviewed | `internal-docs/audits/BT16/BT16-051-060.md` | Yes |
| BT16-061–070 | Reviewed | `internal-docs/audits/BT16/BT16-061-070.md` | Yes |
| BT16-071–080 | Reviewed | `internal-docs/audits/BT16/BT16-071-080.md` | Yes |
| BT16-081–090 | Reviewed | `internal-docs/audits/BT16/BT16-081-090.md` | Yes |
| BT16-091–100 | Reviewed | `internal-docs/audits/BT16/BT16-091-100.md` | Yes |
| BT16-101–102 | Reviewed | `internal-docs/audits/BT16/BT16-101-102.md` | Yes |

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
| BT16-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural alternate Wormmon evolution, Retaliation, play/evolution suspension, and inherited once-per-turn attack suspension match the direct IR (`022ae9689`). |
| BT16-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Rule trait, natural play/evolution +3000 DP scope and duration, and suspension-gated inherited +1000 DP are covered (`a10f72102`). |
| BT16-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2635 exact-three overlap, both natural play branches, Pulsemon evolution, and positive/negative inherited top-card text cases are proved (`1bcc82712`). |
| BT16-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2636 exact-three overlap, bound suspension restriction, natural evolution, and inherited security-trash/unsuspend behavior match the IR (`661c5c4dd`). |
| BT16-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the printed mandatory +3000 DP follow-up after optional suspension; natural play/evolution decline and inherited attack redirection are covered (`3dc01dc32`). |
| BT16-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the suspension watcher to this Digimon; Q2638 target union, delayed restriction, Tamer deletion, natural attack bonus, and unrelated-source negative are covered (`69776d073`). |
| BT16-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the battle-deletion watcher to this Digimon; Q2639 exact-three branches, evolution suspension/restriction, and another-attacker negative are proved (`e3cab077c`). |
| BT16-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2640 suspended immunity, natural end-turn DP boundary/bottom-deck, reduced-cost play, and alternate Insectoid route match the direct module (`50ac370d6`). |
| BT16-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2641 post-evolution identity, shared play/evolution frequency, qualifier negatives, Upamon route, and inherited DP are naturally covered (`283b43cb0`). |
| BT16-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | D-Brigade/DigiPolice OR matching, source/opponent/nontrait exclusions, and inherited aura have catalog-backed stack proof (`87cb4de6f`). |
| BT16-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2642–Q2643 leave protection, Kosuke bottom-stack placement, duration, Dorimon route, and inherited DP match the compiled implementation (`5e2c5e02d`). |
| BT16-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected KoHagurumon Token to 1000 DP with executable Blocker, Decoy Black, and Your Turn attack restriction; natural token play and inherited Blocker are covered (`26a5552cb`). |
| BT16-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and Armadillomon evolution prove attack-player restriction scope/duration, Barrier, and inherited DP (`f20c10f9e`). |
| BT16-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play pays the exact three-card D-Brigade/DigiPolice cost and proves Rush, unblockable duration, deck-top return, and inherited peer shape (`8a69d7dd1`). |
| BT16-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2644 exact-three overlap naturally proves both protection and Blocker/Reboot branches, duration, Pulsemon route, and inherited DP (`582f069c6`). |
| BT16-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2645 completion-time threshold, natural field-top security placement with stack shedding, once-per-turn trash, and no-source fallback match the IR (`7a1e8048e`). |
| BT16-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected placement to a live other DigiPolice permanent with source shedding; natural On Play relocation/De-Digivolve and no-source attack restriction are covered (`31d4e0622`). |
| BT16-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Dorumon/SoC evolution proves hand-trash payment, draw, stack-gated forced-attack grant, Collision, and inherited DP (`b50731a05`). |
| BT16-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2646 exact-three overlap and a natural Pulsemon-text attack prove both entry branches and inherited security-cost unsuspend (`9c95cd5a3`). |
| BT16-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected both entry effects to scale a live opponent-permanent play-cost modifier; Q2647–Q2648, reveal restoration, effective-cost deletion, and inherited De-Digivolve are covered (`718aa34b4`). |
| BT16-061 | 2/2 | 0/2 | 2/2 | 2/2 | 0/2 | 6/10 provisional | Collision and natural target-switch evolution are proved, but the inherited printed trigger includes effect deletion while the available IR/runtime identifies only battle deletion by the host; the seam remains explicit (`9b7fbc6b1`). |
| BT16-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play covers DP-relative De-Digivolve/delete, and a legal Gammamon stack naturally proves copied inherited Retaliation (`94668da67`). |
| BT16-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2651–Q2653, legal black/yellow DNA, opponent-effect immunity, Partition, and DNA-only security placement/count boundary match the IR (`982fd7da8`). |
| BT16-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the deletion watcher to either controller; natural opposing battle deletion proves the once-per-turn self-unsuspend with Collision/SoC stack coverage (`2d4ff322c`). |
| BT16-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2654–Q2655 opposing Boss plus exact six-card D-Brigade reductions, reveal/delete budget, and optional Chaosmon DNA match shared cost/runtime behavior (`1509586ca`). |
| BT16-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2656 opponent-controlled choice, natural declined alternate evolution/memory branch, and inherited attack draw-trash are covered (`3c3b7d19b`). |
| BT16-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves hand-trash/+3000 DP sequencing, and a legal effect-play origin proves the inherited once-per-turn draw watcher (`ce5690601`). |
| BT16-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves Blocker duration and a legal effect-play origin proves inherited once-per-turn draw behavior (`8bab33177`). |
| BT16-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q4708–Q4709, natural Gesomon evolution, three-source trash, unconditional post-Then restriction, and inherited attack draw-trash are covered (`42f314e31`). |
| BT16-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2657 selection binding, natural Veemon evolution and attack timings, own selected deletion, DP comparison, and Armor Purge match the direct IR (`2a7ffbd95`). |
| BT16-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2658 requirement enforcement, natural attack-driven Leomon evolution, and inherited self-delete/trash-play sequencing match the compiled IR (`d9b4a9426`). |
| BT16-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2659 simultaneous deletion and same-name exclusion, reveal selection/remainder, Blocker, and natural deletion-batch behavior are covered (`9a213a6a6`). |
| BT16-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the missing same-name Tamer exclusion; Q2660, natural effect deletion, Retaliation, draw/trash, and existing-name negatives are covered (`91058baa8`). |
| BT16-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2661/Q5532–Q5533, natural alternate evolution at exactly three security, bound delayed deletion, and inherited security-cost unsuspend are covered (`0e3380c22`). |
| BT16-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the inherited Rush watcher to effect-play provenance; trait-union recovery and shared played-by-effect runtime mapping are traced (`311199eb5`). |
| BT16-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2662 evolution requirements, natural 6000-DP deletion and 6001-DP fallback branches, SoC stack condition, and inherited unsuspend are covered (`024f3e6f9`). |
| BT16-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Errata/Q2663–Q2664/Q4288/Q4298/Q4710, legal purple/red DNA, Free trash play, selected Rush, and player attack are naturally proved (`dd981d505`). |
| BT16-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the reaction to effect-deletion provenance; Q2665 unrestricted own/opponent low-level deletion and natural trash play match the runtime (`b83d10df2`). |
| BT16-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Shared-use timing, hand/trash play, source-stack gate, scaled level cap, Alliance, and natural end-turn deletion are covered (`a33d6b508`). |
| BT16-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2666–Q2667 exact-three overlap, natural attack, opponent-effect leave prevention/security cost, and battle-deletion recovery-to-three are covered (`08c037da9`). |
| BT16-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the All Turns watcher to effect deletions; natural evolution pays its own deletion cost, deletes the opponent target, and trashes security (`bca8751be`). |
| BT16-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2668–Q2671, a natural breeding move, exact reveal selection/remainder, once-per-turn timing, and optional hatch match the direct IR (`c0b437098`). |
| BT16-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the mandatory return/delete processing condition to abort the later breeding play when unpaid; Q2672–Q2674 and natural turn progression cover the full sequence (`421c2f7ae`). |
| BT16-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected optional play binding and one-shot delayed return to the played Hawkmon/Salamon; Q2675–Q2676 and natural opponent-turn progression are covered (`ab818f866`). |
| BT16-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected optional play binding and one-shot delayed return to the played Veemon/Wormmon; Q2677–Q2678/Q4254 and DNA-dependent behavior are covered (`da81d1150`). |
| BT16-086 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed redundant post-Mind-Link placement and scoped inherited self-play to the host stack; Q2679, natural Mind Link, keywords, and end-turn self-play are proved (`fd753287d`). |
| BT16-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Removed redundant post-Mind-Link placement and scoped inherited self-play to the host stack; Q2680, natural SoC/X Antibody link, keywords, and self-play are covered (`46a040c4f`). |
| BT16-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected optional play binding and one-shot delayed return to the played Armadillomon/Patamon; Q2681–Q2682 and DNA gating are covered (`00047e6eb`). |
| BT16-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2683/Q5534–Q5535, natural play-cost replacement, effect-deletion revival, and one-shot opponent-turn delayed deletion match the IR (`d6497aa4d`). |
| BT16-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2684–Q2688, natural start-turn memory, exact compound costs, optional breeding play for three, and Overflow boundaries are covered (`6e0e85f97`). |
| BT16-091 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Errata/Q2664/Q2689–Q2691 and the paired DNA-result follow-up map to compiled IR, but the colocated proof remains structural-only (`539f06364`). |
| BT16-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2692–Q2693, optional ExVeemon/Stingmon play, DNA-result protection/Blocker, and Security return have a natural public-play path (`e433f60e6`). |
| BT16-093 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected the inert raw DP restriction to opponent-effect-only `dpImmune`; color waiver/evolution/security clauses trace cleanly, but behavior proof is structural-only (`205f81364`). |
| BT16-094 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Corrected union reveal count, Trial battle-area placement, and modal availability; Main/Delay/Security IR is traced, but behavior proof is structural-only (`2c91668a0`). |
| BT16-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public Option use proves two-target suspension, all lowest-DP ties to deck bottom, and own +3000 duration (`571e4a337`). |
| BT16-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public Option use proves D-Brigade/DigiPolice reveal/add, deck-top remainder, self-placement, and Delay peer semantics (`5c54552ea`). |
| BT16-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected shared DNA result binding for the ordered Recovery condition; Q2694–Q2695 and natural play/DNA/Recovery behavior are covered (`46906e0c6`). |
| BT16-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2696 conditional first deletion and unconditional lowest-play-cost tied deletion are proved through natural public Option use (`02548f20a`). |
| BT16-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal/add/trash/self-placement proves the SoC Main path; Delay reduction maps to the direct scoped runtime despite generated-snapshot drift (`d72450b11`). |
| BT16-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2697, Pulsemon color waiver, optional security payment/cost reduction, level deletion, and security-bottom placement have natural public-play proof (`687a390fe`). |
| BT16-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected true DP-zero identification and natural battle-deletion cause publication; Q2698/Q5452, Rapidmon stack aura, both deletion causes, negatives, and shared frequency are naturally covered (`dc624ca23`). |
| BT16-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the security watcher to either stack; Q2699–Q2701, both security directions, optional activation, frequency, conditional boost/immunity, and unconditional unsuspend are naturally covered (`c9aefb196`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 29
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 1
- Provisional 8/10: 98
- Provisional 6/10: 4 (`BT16-061`, `BT16-091`, `BT16-093`, `BT16-094`)
- Remaining unassigned: 0

BT16 has complete static card-by-card coverage, but the collection remains open:
all execution gates are deferred, BT16-061 retains an unresolved deletion-origin
runtime seam, and BT16-091, BT16-093, and BT16-094 retain source-level behavioral
proof gaps.
