# BT7 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT7-001` through `BT7-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT7/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT7-001–010 | Static audit delivered | `internal-docs/audits/BT7/BT7-001-010.md` | Yes |
| BT7-011–020 | Static audit delivered | `internal-docs/audits/BT7/BT7-011-020.md` | Yes |
| BT7-021–030 | Static audit delivered | `internal-docs/audits/BT7/BT7-021-030.md` | Yes |
| BT7-031–040 | Static audit delivered | `internal-docs/audits/BT7/BT7-031-040.md` | Yes |
| BT7-041–050 | Static audit delivered | `internal-docs/audits/BT7/BT7-041-050.md` | Yes |
| BT7-051–060 | Static audit delivered | `internal-docs/audits/BT7/BT7-051-060.md` | Yes |
| BT7-061–070 | Luna in progress | `internal-docs/audits/BT7/BT7-061-070.md` | No |
| BT7-071–080 | Static audit delivered | `internal-docs/audits/BT7/BT7-071-080.md` | Yes |
| BT7-081–090 | Luna in progress | `internal-docs/audits/BT7/BT7-081-090.md` | No |
| BT7-091–100 | Queued | `internal-docs/audits/BT7/BT7-091-100.md` | No |
| BT7-101–110 | Luna in progress | `internal-docs/audits/BT7/BT7-101-110.md` | No |
| BT7-111–112 | Queued | `internal-docs/audits/BT7/BT7-111-112.md` | No |

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
| BT7-001 Kapurimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own-Tamer battle-area gate, any Tamer color, owner-turn duration, and legal red inherited stack |
| BT7-002 Bukamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Source-stack-only Digimon play watcher with owner-turn and once-per-turn boundaries |
| BT7-003 Pusurimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Self-source Digi-Burst discard watcher, one opposing target, and for-the-turn DP reduction |
| BT7-004 Koromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected host-only attack scope plus top-or-bottom single-card reveal placement |
| BT7-005 Dorimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected own-effect placement provenance with self host and once-per-turn draw boundaries |
| BT7-006 Kokomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional three-card reveal, mandatory one-Tamer trash after acceptance, and bottom remainder |
| BT7-007 ToyAgumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effectless full-coverage registration and ordinary red level-two evolution evidence |
| BT7-008 Flamemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected exact Susanoomon/Takuya names, Hybrid trait branch, and inherited optional Takuya play |
| BT7-009 Huckmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Sistermon substring-name reveal-all effect with bottom remainder and inherited once-per-turn scope |
| BT7-010 Tuskmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | One-own-Digimon +2000 DP When Digivolving target and for-the-turn duration |
| BT7-011 BurningGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Red-Tamer alternate evolution and Hybrid-or-Takuya-conditioned 4000-DP deletion |
| BT7-012 Brachiomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effectless full-coverage registration and ordinary red level-four evolution evidence |
| BT7-013 MetalGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exclusive Tamer/no-Tamer On Play branches and inherited once-per-turn opponent-deletion watcher |
| BT7-014 Aldamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Tamer-source hand reducer, Hybrid-stack DP gain, and Option-only Security-effect suppression |
| BT7-015 AvengeKidmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected hand-resident BeforePayCost reducer plus both-trash return count and threshold deletion |
| BT7-016 EmperorGreymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blitz and self-only blocked watcher with per-Hybrid memory scaling before battle |
| BT7-017 Chaosdramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Machinedramon alternate evolution and optional Cyborg placement with scaled deletion boundaries |
| BT7-018 Gomamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digivolution-card-source-only On Play Draw 2 with ordinary-play and De-Digivolve negatives |
| BT7-019 Strabimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact Hybrid/Susanoomon/Koji reveal union and inherited optional Koji free play |
| BT7-020 Shellmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effectless full-coverage registration and ordinary blue level-three evolution evidence |
| BT7-021 Kumamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer alternate evolution, cost-two stack transition, and bottom-source trash boundary |
| BT7-022 KendoGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer alternate evolution plus Hybrid-or-Koji stack-conditioned Jamming duration |
| BT7-023 Korikakumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Tamer evolution metadata and one shared source-less target for attack-or-block restriction |
| BT7-024 DaiPenmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Source-less-opponent draw scaling and live Hybrid-stack level-three attack restriction |
| BT7-025 Beowolfmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected verified self-reducer registration plus Tamer-source cost reduction and bound Hybrid bounce |
| BT7-026 WereGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exclusive Tamer/no-Tamer On Play branches and inherited main-phase once-per-turn unsuspend watcher |
| BT7-027 Whamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional level-three source-stack free play followed by gated blue-hand bottom placement |
| BT7-028 KingWhamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-three-or-Whamon source-stack free play and opponent level-four return/source teardown watcher |
| BT7-029 MagnaGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected decline-aborts-dependent-bounce behavior with shared dual-trigger once-per-turn identity |
| BT7-030 AncientMegatheriummon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Per-Hybrid bottom-source trash scaling, post-action source-less draw, and bounded On Deletion free play |
| BT7-031 Herissmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Self-source Digi-Burst discard watcher, owner-hand return, and legal inherited evolution stack |
| BT7-032 Pulsemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact-three-security inherited attack memory gain with four-security negative boundary |
| BT7-033 Bulkmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn inherited Blocker aura with live three-security threshold boundary |
| BT7-034 Filmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected payload-attached Digi-Burst 2 cost and one opponent Security Attack -2 target |
| BT7-035 Kazemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Yellow-Tamer alternate evolution metadata, cost-two stack transition, and QA boundaries |
| BT7-036 Zephyrmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected exact Zoe name plus Hybrid-stack Security Digimon +3000 DP duration |
| BT7-037 Boutmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Player-attack-only inherited unsuspend with security threshold and pre-block timing |
| BT7-038 JetSilphymon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected exact self destination for Tamer-stack reducer plus Hybrid-stack Recovery branch |
| BT7-039 Stefilmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact-one-source optional placement/draw scaling and self Digi-Burst inherited watcher |
| BT7-040 Rasenmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Hand-resident security-count evolution cost and up-to-four Digi-Burst single-target scaling |
| BT7-041 Kazuchimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected optional Recovery +1-until-three branch plus exclusive memory threshold and Security Attack aura |
| BT7-042 AncientKazemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent-turn Hybrid-stack Security Digimon DP bonus and bounded yellow Hybrid On Deletion play |
| BT7-043 Gotsumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional green-Digimon hand reveal and deck-top placement through loose-card targeting |
| BT7-044 Betamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Green level-four-Digimon-or-Tamer reveal union with one add and ordered bottom remainder |
| BT7-045 Tortomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional green hand-to-deck-top cost, decline abort, and gated inherited DP gain |
| BT7-046 Beetlemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Green-Tamer alternate evolution and independent Hybrid/J.P. reveal slots |
| BT7-047 MetalKabuterimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Green-Tamer alternate evolution plus Hybrid-or-J.P.-conditioned 6000-DP suspension |
| BT7-048 Monochromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effectless full-coverage registration and ordinary green level-three evolution evidence |
| BT7-049 MameTyramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected self-only free reveal-digivolution target with optional green level-six selection |
| BT7-050 Triceramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effectless full-coverage registration and ordinary green level-four evolution evidence |
| BT7-051 RhinoKabuterimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected verified self-reducer, Tamer-source cost reduction, and optional self-only attack evolution |
| BT7-052 SaberLeomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Self +5000 DP When Digivolving duration and On Deletion memory gain |
| BT7-053 Dinorexmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected same-target suspension/unsuspend restriction and live suspended-opponent DP scaling |
| BT7-054 AncientBeetlemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Trait-qualified surviving battle deletion watcher and bounded green Hybrid On Deletion free play |
| BT7-055 Ebonwumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected opponent-turn all-Digimon unsuspend cost plus suspension-memory scaling sequence |
| BT7-056 Dorumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Independent X Antibody/Kota reveal slots and self-stack effect-placement memory watcher |
| BT7-057 Monitamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Knightmon-or-DeadlyAxemon reveal union with one add and bottom remainder |
| BT7-058 SkullKnightmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected self/name inherited Security Attack aura and structured DeadlyAxemon placement evolution cost |
| BT7-059 DeadlyAxemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Up-to-two Knightmon reveal and self/name-conditioned inherited DP aura |
| BT7-060 Grumblemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Black-Tamer alternate evolution with derived cost and ordinary stack transition boundaries |
| BT7-071 Loweemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Purple-Tamer alternate evolution with cost-two stack transition and color boundary |
| BT7-072 Eyesmon: Scatter Mode | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exact-name trash condition, own-effect hand-trash self play, and owner-trash DP scaling |
| BT7-073 KaiserLeomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Purple-Tamer alternate evolution and Hybrid-or-Koichi Retaliation through opponent next turn |
| BT7-074 Antylamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional purple play-cost-three-or-lower Tamer free play from trash on evolution |
| BT7-075 Rhihimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Destination-bound Tamer-source hand reducer and Hybrid-stack On Deletion Tamer play |
| BT7-076 Orochimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own-effect hand-trash draw and inherited optional hand-trash memory cost with once-per-turn scope |
| BT7-077 Nidhoggmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Own-effect hand-trash memory watcher and optional hand-trash cost for level-four deletion |
| BT7-078 AncientSphinxmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Dynamic last-deleted-level target bound and bounded purple Hybrid On Deletion play |
| BT7-079 Cherubimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected mandatory Then deletion after optional Tamer play plus per-Tamer On Deletion free plays |
| BT7-080 Neemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited-effect Tamer On Play boundary and Tamer-stack deletion watcher with once-per-turn play |

## Aggregate

- Catalog cards: 112
- Assigned: 100
- Integrated card audits: 70
- Corrected: 18
- Provisional: 70
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 12

BT7 static re-audit remains open.
