---
set: EX7
cards: 74
status: verified
verified_at: 2026-09-09
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX7 audit

## Status

All 74 EX7 cards are verified at 10/10 (aggregate 740/740). The winning source is the re-audit of 2026-09-09 (`docs/audits/EX7-REAUDIT-LEDGER.md`, `43e6f893d`, with the run log, review notes, mechanism reports and per-card reports under `docs/audits/EX7-reaudit/`, `7430b511f`), run from base `014a6a2fb79e1ad5dbca320d70cf02a3943d3fa8` without inheriting prior scores. It supersedes `docs/audits/EX7-AUDIT.md` (2026-09-05, `03b7cc52a`). This set is the one of the four with real engine changes: seven serialized mechanism lanes changed shared behaviour (EX7-011 payable placement condition, EX7-014 breeding move restriction and DigiXros replacement identity, EX7-015 DigiXros cost reduction, EX7-023 source-relative restriction, EX7-030 deferred token deletion, EX7-049 future-entrant restriction, EX7-058 token printed keywords), each with a mechanism report reproduced under Mechanisms below. A further eight investigations closed as fixture or rules errors with no production change. One `it.fails` marker is disputed between two lines of the same review file; see Open items.

## Gates

Copied from `docs/audits/EX7-reaudit/RUN.md` (`7430b511f`), sections "Baseline measured before worker acceptance" and the closeout entries.

Baseline:

- Inventory: 74 catalog cards, 74 modules, 74 direct test files, 74 unique `registerIrCard` registrations, zero legacy `registerCard` registrations.
- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- `pnpm effects:check:set -- --set EX7 --base 014a6a2fb79e1ad5dbca320d70cf02a3943d3fa8`: 74 records synchronized; zero semantic changes and zero changes outside EX7.
- Serial EX7 collection: 74 files / 398 tests passed.
- Baseline engine mechanisms: 129 files / 2052 tests passed.
- Workspace typecheck with a 4096 MB heap: exit 0 for shared, API, and web.

Collection closeout:

- Effects sync/check: 74 synchronized records, 5 EX7 semantic changes against base, zero changes outside EX7.
- Workspace typecheck passed.
- Required EX7/conformance/combat/effects/cards regression: 209 files and 2,632 tests passed.
- Changed-file Oxlint/Oxfmt and `git diff --check`: passed.
- The gate script awarded 2 delivery points per card: 740/740, 74/74 at 10/10.

Post-closeout corrections, both re-gated:

- An independent closeout review found a DigiXros failure-path mismatch: a prevented field-material relocation was still counted and discounted. After the fix the focused public regression and the chapter 7 DigiXros suite pass 23/23 and workspace typecheck remains green.
- A type-safety cleanup removed `@ts-nocheck` from all 73 EX7 modules that still carried it and removed EX7-019's broad `unknown` assertion. EX7 focused/mechanism tests pass 577/577, the required collection regression passes 209 files and 2,633 tests, and workspace typecheck is green with zero EX7 suppressions remaining.

One known-green diagnostic: the AD1-002 unsupported-effect log is asserted behaviour inside a green suite and does not fail the run.

## Card ledger

Scores are the final ones from `docs/audits/EX7-REAUDIT-LEDGER.md`; the per-card sections merge the reports in `docs/audits/EX7-reaudit/`. Card reports were written by worker lanes that could not award delivery gates, so many of them still read "8/10", "provisional", or "pending final coordinator gate". Those notes are superseded by the table below and by the Gates section: the coordinator awarded the delivery points after the closing gates passed, and every card is 10/10.

| Card    | Name                     | Catalog/rules | IR trace | Behavioral proof | Peer/stack | Gates | Total | Status                                                                                                                                                                                                                                           |
| ------- | ------------------------ | ------------- | -------- | ---------------- | ---------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX7-001 | DemiMeramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public hatch/digivolve/raise route, illegal-source negative, exact opponent count and turn-boundary proof; no card-specific Q&A or engine seam |
| EX7-002 | Hiyarimon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; real attack, stack-condition negative, same-turn refusal and next-own-turn reset; no card-specific Q&A or engine seam |
| EX7-003 | Kyaromon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; live security battles, non-Digimon and opponent-turn boundaries, legal hatch/evolution/raise stack and illegal-source negative; no Q&A or engine seam |
| EX7-004 | Fluffymon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public battle and hatch/evolution proof plus same-turn suppression and next-turn re-arm; former retained red was a faulty memory-baseline assertion, engine regression green |
| EX7-005 | Kapurimon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Option placement/provenance/filtering and continuous real-turn loop prove first activation, same-turn suppression, opponent-turn gate and next-own-turn reset; 8 pass |
| EX7-006 | Yaamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public attack/evolution/payment/decline/negative and next-turn recollection green; former retained red was a hand-count and post-evolution stack fixture error, engine regression green |
| EX7-007 | Vorvomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3828, reveal/add exact boundaries, inherited DP turn scope, legal evolution with exact standard draw/stack and illegal-source negative |
| EX7-008 | ToyAgumon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3829, RevealAdd partial/no-match boundaries, exact cost-6 Option filter, legal/illegal alternate evolution and owner-turn inherited DP proof |
| EX7-009 | Lavorvomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/evolution/turn-loop proof, both printed color routes, exact cost/draw/stack, optional and Tamer-count boundaries; no card-specific Q&A or engine seam |
| EX7-010 | Deputymon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3830 public own/opponent stack choices, optional refusal, legal evolution cost/draw/stack and illegal source green; Q3831 breeding negative green after correcting the false red fixture from same-color EX7-066 to purple EX7-071 |
| EX7-011 | Megadramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public play/evolution/payment/draw/stack/Piercing and §15-7-5 payable `by` condition with no legal delete target green after narrow shared resolver fix; 65 mechanism and 6,775 engine tests passed |
| EX7-012 | Lavogaritamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/evolution/real-loop/attack proof, exact 6000 boundary, both color routes, cost/draw/stack and two security checks green; no card-specific Q&A or engine seam |
| EX7-013 | MagnaKidmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3832 fixture corrected: BT10-077 pays its own stack cost to seat 1 trash and makes seat 0 trash five cards from its hand; 8 focused tests plus a real-watcher mechanism regression green |
| EX7-014 | Volcanicdramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; all 10 Q&A green after generic move-to-breeding restriction and DigiXros leave-replacement fixes; 11 card tests, 2 mechanisms and 7,303 full-engine tests pass |
| EX7-015 | Otamamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3837-Q3840 green after routing the all-player play-cost restriction into DigiXros reduction; 8 focused/mechanism tests, 56 interaction tests and 7,301 full-engine tests pass |
| EX7-016 | Bulucomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3841 RevealAdd, rule trait, legal evolution exact cost/draw/stack, illegal source, inherited top-source trash and real next-turn once-per-turn reset all public green |
| EX7-017 | SnowAgumon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Ice Clad count-over-DP combat, Security carve-out, Rule trait, legal evolution cost/draw/stack, illegal source, inherited top-source trash and real next-turn once-per-turn reset public green |
| EX7-018 | Gekomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/two-step evolution prove exact costs/draw/stacks, inherited Jamming correctly absent while top and present once EX7-018 becomes a source, plus illegal route; 6 pass |
| EX7-019 | Sorcermon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; conditional public On Play positive/negative, live Blocker interception/Rule trait, legal evolution cost/draw/stack, illegal source, inherited top-source trash and real next-turn reset green |
| EX7-020 | Paledramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; bottom-source trash, conditional Jamming/Blocker, Rule trait, legal and illegal evolution boundaries, inherited top-source trash and real-turn once-per-turn reset public green; 5 focused tests pass |
| EX7-021 | CrysPaledramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3842/Q6041, exact cross-stack two-source trash, conditional unsuspend, Ice Clad Digimon/Security distinction, Rule trait, legal and illegal evolution boundaries public green; 10 focused tests pass |
| EX7-022 | ShogunGekomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3843, exact Tamer and all-own-NSp restrictions, target-change prevention, real duration expiry, legal alternate evolution cost/draw/stack and illegal source public green; 4 focused tests pass |
| EX7-023 | Hexeblaumon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3844 dynamic source-relative restriction reopening green after live all-target predicate fix; 9 focused/mechanism, 87 proportional and 7,304 full-engine tests pass |
| EX7-024 | Shoemon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3845/Q4882, battle-area-only Puppet evolution reduction, breeding negative, exact cost/draw/stack and inherited Security-Digimon DP through real battle green; 7 focused tests pass |
| EX7-025 | ShoeShoemon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Tamer-count boundary, optional refusal, name/count negatives, exact legal/illegal evolution, inherited owner-turn Security DP and real Security battle proof green; 6 focused tests pass |
| EX7-026 | Starmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/When Digivolving -3000 DP with turn expiry, standard/alternate evolution cost/draw/stack, illegal source and inherited Barrier payment through real combat green; 5 focused tests pass |
| EX7-027 | Chaperomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; errata Overclock, public evolution/free Puppet play/refusal, first inherited leave prevention, same-turn refusal and next-real-turn reset green; former red consumed the reset budget in a Security battle; 7 pass |
| EX7-028 | Piximon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3846 Yellow-or-NSp union, public battle deletion/free play/refusal, exact legal/illegal evolution, funded two-attack same-turn persistence, expiry and re-arm green; 8 pass |
| EX7-029 | SaberLeomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public NSp/Leomon alternate routes, exact payment/draw/stack, Blast Digivolve, On Play/evolution DP duration, suspend/unsuspend/shared OPT, invalid route and Overflow 4 green; 9 pass |
| EX7-030 | Cendrillmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; errata Overclock, public Main/evolution Familiar play/refusal, exact evolution, attack -6000, Q3847 combined 3000 DP and invalid route green; 7 pass |
| EX7-031 | Pteromon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3848 breeding exclusion, Q5838 peer interaction, battle-area Bird reduction, non-Bird full cost, exact payment/draw/stack and real inherited battle ownership/deletion boundaries green; 15 focused/peer tests pass |
| EX7-032 | Galemon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public exact-cost evolution/free Shoto play/refusal, zero/one/two-Tamer boundaries, legal/illegal stack proof, real battle ownership/deletion boundaries and real-turn inherited OPT reset green; 7 focused tests pass |
| EX7-033 | Monochromon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; exact rule trait/inherited Piercing, live security check, non-green NSp alternate evolution with exact payment/draw/stack and wrong-trait rejection green; 5 focused tests pass |
| EX7-034 | GrandGalemon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public exact evolution/stack, own/opponent suspension branches, live opposing-Digimon-effect protection, real end-turn Vortex, inherited Digimon-target OPT and wrong-color rejection green; 6 focused tests pass |
| EX7-035 | Triceramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3849, public play/evolution same-target lock and two-turn duration, non-green NSp exact evolution, invalid route, live Dinosaur trait, exact Security trash and real-turn inherited OPT reset green; 7 focused tests pass |
| EX7-036 | Zephagamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public exact evolution, causal own/opponent/already-suspended branches, exact deck-bottom identity, real Vortex, Security Attack +1 two-check proof, live Bird Dragon trait and invalid route green; 8 focused tests pass |
| EX7-037 | Tlalocmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3850 DNA matrix, public zero-cost DNA/two different-color NSp plays, invalid pair, exact ordinary evolution/one play, per-Digimon scaling, shared evolution/attack OPT and wrong-color route green; 6 focused tests pass |
| EX7-038 | Gotsumon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Blocker redirection/combat, blue NSp zero-cost evolution with exact draw/stack, red non-NSp rejection and inherited Reboot through public host evolution/attack into the real opponent turn green; 5 focused tests pass |
| EX7-039 | Jazamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Rock/Earth Start-of-Main cost/draw/memory, refusal/no-eligible/single-prompt boundaries, exact red-route evolution, blue rejection, live Machine Dragon trait and real opponent-turn inherited DP transitions green; 8 pass |
| EX7-040 | ToyAgumon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play exact trait-cost/draw, refusal/no-eligible/no-prompt boundaries, exact alternate evolution stack, invalid off-color route and inherited Reboot through public evolution/attack into the opponent turn green; 7 pass |
| EX7-041 | Tortomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Blocker combat, actual opponent-effect protection, Q3851 rule deletion, off-color NSp exact evolution, non-NSp rejection and inherited Reboot through public evolution/attack/turn green; 7 pass |
| EX7-042 | Jazardmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; fixed unreachable Hina zoneCount IR; public Rock/Earth On Play, refusal, zero/one/two-Tamer and Hina-refusal boundaries, exact red evolution/off-color rejection and inherited turn DP green; 10 pass |
| EX7-043 | Tankmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; Q3852 mixed hand/trash cost, public On Play/evolution De-Digivolve, refusal/insufficient boundary, Q4558 Shotmon link disposal, exact alternate stack, invalid route and inherited Reboot green; 7 pass |
| EX7-044 | Gigadramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public reveal/place/delete, exact rest destination/order, alternate stack, invalid route, Q4578 Shotmon link disposal and inherited Collision green; former red used illegal Digi-Eggs in the main deck; 8 pass |
| EX7-045 | Jagamon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public play-cost/De-Digivolve, blue NSp exact alternate evolution, red non-NSp rejection, real owner/opponent turn aura and NSp-only Blocker combat green; 5 pass |
| EX7-046 | Jazarichmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play De-Digivolve, Red/Black exact evolution and level-5 condition boundary, inherited first/second opponent attacks and next-opponent-turn reset green; 3 focused scenarios |
| EX7-047 | Eldradimon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/alternate-evolution cost-7 reveal budget/rest order, exact evolution, invalid route, live Blocker and real End-of-Turn Blue+Black DNA/no-target boundary green; 7 pass |
| EX7-048 | Gundramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public reveal/free EX7-066 use/rest order, exact alternate evolution, no-match, global Three Musketeers replacement/non-trait exclusion, Q4585 Shotmon and live Blocker green; 8 pass |
| EX7-049 | Metallicdramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public De-Digivolve/evolution/replacement, Q3853-Q3856/Q6719, live future-entrant restriction, immunity/breeding exclusions and expiry green; 9 pass |
| EX7-050 | Impmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Dark Dragon/Evil Dragon/negative evolutions, explicit zero-cost Yaamon route, exact payment/draw/stack, Q3857 breeding boundary and inherited DP across a real opponent turn green; 7 pass |
| EX7-051 | Sparrowmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; real Start-of-Main hand/trash bottom placement and draw, refusal, exact text-based evolution/invalid route, and inherited Retaliation through public unequal-DP combat green; 6 pass |
| EX7-052 | Tsukaimon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public reveal split/rest order, exact legal/illegal evolution, Q3858 Armor Purge, Q3859 EndAttack, Q3860 immune attacker, same-turn suppression and next-opponent-turn re-arm green; 7 pass |
| EX7-053 | Eyesmon: Scatter Mode | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public mandatory trash plus Evil/Dark Dragon/Evil Dragon returns, refusal, newly discarded eligible return, exact neutral evolution and inherited Retaliation through unequal-DP combat green; 8 pass |
| EX7-054 | BlackGatomon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public evolution/deletion paid paired keywords and duration, exact stack, Q3861 Armor Purge, Q3862 EndAttack, Q3863 immunity, same-turn suppression and next-opponent-turn inherited re-arm green; 6 pass |
| EX7-055 | Punkmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public zero/one/two-Tamer evolution thresholds, Yuuki refusal, exact Evil alternate route, off-color rejection, payment/draw/stack and inherited owner-turn DP across a real opponent turn green; 7 pass |
| EX7-056 | Orochimon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public battle On Deletion exact cost/level targets, Tortomon protection with declined block, exact evolution payment/draw/stack, live Blocker and inherited Retaliation unequal-DP combat green; 7 pass |
| EX7-057 | Loudmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/evolution exact trash and 7000-DP ceiling, Rule trait, Dark/Evil Dragon alternate and red standard stacks, plus inherited matching/nonmatching and four/five-hand real Security checks green; 7 pass |
| EX7-058 | LadyDevimon (X Antibody) | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public evolution/play/attacks, Q3864/Q3865, inherited OPT and canonical token stats/Blocker/Retaliation green after live printed-keyword reader fix; 7 focused, 145 mechanism pass |
| EX7-059 | BeelStarmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public On Play/evolution/attack Option flows, refusal/own-stack scope, real Blast over Digimon and Q6391 text-qualified Tamer, plus Overflow 4 green; 11 pass |
| EX7-060 | Nidhoggmon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; client-visible trash Main at exact four/five-card boundary, 7-memory paid play/refusal, exact evolution stack, live Blocker, real battle-deletion Dark Dragon/Evil Dragon plays, and level-6/nonmatching exclusions green; 9 pass |
| EX7-061 | Lilithmon (X Antibody) | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; corrected both turn branches under one deletion subscription; public standard/named evolution, battle/Retaliation replacement, Q3866/Q3867/Q5169, Security/free play, refusal, same-turn suppression and real-turn re-arm green; 14 focused + 19 peer pass |
| EX7-062 | HeavyMetaldramon | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; restored missing Dark Dragon/Evil Dragon alternate route; public dual-standard/dual-trait evolution, exact trash/DP boundaries, three scaled end-turn trait branches, refusal/near misses and real-turn re-arm green; 13 pass |
| EX7-063 | Arisa Kinosaki | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; real Start-of-Main and hand play, public Puppet/non-Puppet/token combat deletion, suspension/free-play/refusal, level/trait boundaries and real Security self-play green; 11 pass |
| EX7-064 | Shoto Kazama | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; real Start-of-Main/hand play, Q3868/Q3869 both trigger orders, paired-keyword opponent-turn duration/expiry, refusal and real Security play green; EX2-007 banned pair recorded; 9 pass |
| EX7-065 | Yuuki | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; real Start-of-Main/hand play, client-visible Main activation, Dark Dragon/Evil Dragon trash evolutions, exact costs/draw/stack, four/five-card boundary, refusal/trait miss and Security play green; 10 pass |
| EX7-066 | Chaos Triangular | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public color waiver/Main use, distinct-name scaling/repeat exclusion, real EX7-059 attack-cost trash, +3000 opponent-turn duration/expiry and real Security 12000/12001 checks green; 11 pass |
| EX7-067 | Summon Frost | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main/Security flows, all-stack top-two trash, conditional Ice-Snow play, level/trait negatives, refusal, Q3870 final restriction and real-turn duration/expiry green; 10 pass |
| EX7-068 | Wonder Stomp | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main and real Security flows, exact draw/free-play/payment/zones, optional refusal, level-4 Puppet and level-3 non-Puppet negatives green; 8 pass |
| EX7-069 | Wind Slicer | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main and real Security flows, own/opponent suspension, conditional own unsuspension, refusal and exact level-6/7 boundary green; 8 pass |
| EX7-070 | Der Blitz | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main/real Security, Three Musketeers waiver/rejection, lowest-cost delete, placement and real EX7-059 attack-cost De-Digivolve green; 8 pass |
| EX7-071 | Hurricane Screw Shot | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main/real Security, Three Musketeers waiver/rejection, level 3/4/5 deletes, level 6/7 preservation, placement and real EX7-059 attack-cost +1 memory green; 6 pass |
| EX7-072 | Seventh Fascination | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main/evolution/Security and real turns prove Trash cost/refusal, global grants, Q3871 immunity, Q3872 Partition, Q5728/Q5729, exact-name and Security unsuspended filter; 9 pass |
| EX7-073 | BeelStarmon (X Antibody) | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public standard/alternate evolution and attack, X-Antibody exclusion, free Option, exact source cost, highest-level delete, Security trash, refusal/insufficient cost and continuation green; 12 pass |
| EX7-074 | Vortex Resonance | 2 | 2 | 2 | 2 | 2 | 10/10 | Re-reviewed; public Main/evolution/real Security prove Digimon/Tamer waiver, Q3873 breeding exclusion, reveal destinations, exact reduction, refusal, hand/trash Security play and self-return; 14 pass |

### EX7-001 — DemiMeramon

#### Audit result

Score: 8/10 (maximum permitted by the EX7 re-audit brief; both gates are 0 by policy).

The committed implementation is faithful to the catalog. No card-module defect or reusable engine seam was found. The card remains exclusively registered through `registerIrCard("EX7-001", compiled)`.

#### Printed contract and sources

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-001:

- Red Digi-Egg, level 2, In-Training, Flame, DP 0, play cost -1, no evolution requirements.
- Inherited effect: `[Your Turn] While your opponent has 1 or fewer Digimon, this Digimon gets +2000 DP.`

Knowledge-base command: `node tools/kb/query.mjs card EX7-001`

Result: `EX7-001 DemiMeramon (no knowledge-base entries)`. There are no card-specific Q&A, errata, restriction, or ruling IDs to cover.

Applicable comprehensive-rules evidence:

- §2-3-11-2-1 and §15-3-1: the text is an inherited effect and cannot activate from the Digi-Egg alone.
- §4-3-1 through §4-3-3: a card stacked under a Digimon is a digivolution card and grants its inherited effect to the top Digimon.
- §15-16-8-1: `[Your Turn]` applies during the controller’s turn only.
- §2-5-3: DP is not added to a card without DP; the actual host in proof is BT1-009 with 3000 DP.

#### Clause → test → IR mapping

| Contract clause | Observable proof | IR mapping |
| --- | --- | --- |
| Inherited-only effect | `matches the catalog and compiles the complete inherited clause`; public hatch/breeding proof | `isInherited: true` |
| `[Your Turn]` | `is live only during the host controller's turn through the real turn loop` | `trigger: "YourTurn"` |
| Opponent has 1 or fewer Digimon | `applies the exact 1-or-fewer boundary` covers 0 → 3000, 1 → 5000, 2 → 3000 | `while.kind: "opponentHas"`, `filter.kind: ["Digimon"]`, `countMax: 1` |
| This Digimon gets +2000 DP | positive host DP and unchanged own peer/opponent Tamer | self-only `Aura` with `modifyDP.amount: 2000` |

#### Q&A coverage

Q&A IDs: none. The local card query explicitly returned no knowledge-base entries, so there are no Q&A-specific scenarios to reproduce.

#### Evolution and zone proof

The focused suite uses no Digi-Egg in a main deck or security stack. The public route hatches EX7-001 from the egg deck, digivolves BT1-009 onto it in breeding for the catalogued cost 0 (memory remains 0), asserts the exact under-stack instance identity, raises the stack through the real turn loop, and observes the inherited +2000 DP in the battle area. A companion negative rejects BT1-009 from a non-red level-2 source without moving the card or paying memory.

There is no bonus-draw clause, optional choice, security effect, duration, or once-per-turn limit on EX7-001; those rubric dimensions are not applicable.

#### Gaps and seams

- Card-specific implementation gap: none found.
- Shared engine seam: none required or changed.
- Retained red: none for this card.
- Gate scores: 0/2 and 0/2 as required by the worker brief, so the score is capped at 8/10 despite complete card-specific evidence.

#### Verification

Command:

`pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-001.test.ts --maxWorkers=1 --no-file-parallelism`

Result after the audit changes: 8 tests passed in 1 file.

No git write was performed. `git diff --check` is intentionally reported separately by the coordinator workflow; this card lane did not alter any other path.

### EX7-002 — Hiyarimon

Status: fully card-audited; provisional **8/10**. The executed-gates column is intentionally **0/2**, as required by the EX7 worker brief, so this report cannot exceed 8/10.

#### Contract and sources

- Catalog source: `packages/shared/src/cards/data/cards.json`, record `EX7-002`.
- Identity verified: Hiyarimon, Blue Digi-Egg, level 2, play cost `-1`, 0 DP, In-Training, attribute `-`, Lesser, no main effect, no Security effect, and no evolution requirement.
- Printed clause: inherited `[When Attacking] [Once Per Turn] If your opponent has no Digimon with digivolution cards, ＜Draw 1＞.`
- Local query: `node tools/kb/query.mjs card EX7-002` returned `(no knowledge-base entries)`.
- Q&A/errata/restriction coverage: no EX7-002 entry or Q&A ID was found in the local Q&A, errata, banlist, or re-audit KB index. Q&A IDs covered: **none applicable**.
- General rules checked in `data/kb/rules/glossary.md` and `data/kb/rules/manual.md`: `When Attacking` triggers on attack declaration; `Once Per Turn` allows one activation despite multiple qualifying events and resets on the next turn; digivolution cards are cards beneath a Digimon.

#### Clause-to-IR-to-test mapping

| Printed clause | IR mapping in `EX7-002.ts` | Behavioral proof in `EX7-002.test.ts` |
| --- | --- | --- |
| Inherited `[When Attacking]` | One effect with `trigger: "WhenAttacking"` and `isInherited: true`; the registration module routes it through the production attack timing. | `draws through a real attack only when the opponent has no digivolution cards`; the legal blue level-3 host stack is asserted as top `BT1-028` plus `EX7-002`. |
| `[Once Per Turn]` | The same effect has `frequency: "OncePerTurn"`; registration threads the stable once-per-turn watcher key. | `draws only once across two legal attacks by the same inherited host` proves same-turn refusal; `resets the inherited draw on the next own turn through the real turn loop` proves reset. |
| Opponent has no Digimon with digivolution cards | `condition.kind: "opponentHasNone"`, filter `controllerDefault: "opponent"`, `kind: ["Digimon"]`, `digivolutionCards: "hasAny"`; live matching rejects any opponent permanent whose `Permanent.stack.length > 0`. | Positive unstacked opponent draw and stacked `BT1-014` opponent no-draw cases. |
| `＜Draw 1＞` | `kind: "Draw"`, `controller: "mine"`, `amount: 1`. | Positive cases assert hand/deck movement after the full effect stack settles. |

The module is already complete compiled IR with `coverage: "full"`, an empty `residual`, and exactly one executable registration: `registerIrCard("EX7-002", compiled)`.

#### Behavioral proof

- Catalog and exact IR shape are asserted in `matches the catalog identity and complete inherited IR contract`.
- The positive path uses a real public attack from an inert blue level-3 `BT1-028` host legally carrying blue Digi-Egg `EX7-002`; the opponent has an unstacked neutral Digimon, and exactly one card is drawn.
- The negative path gives the opposing Digimon one inert `BT1-014` card beneath its top card; no draw occurs.
- Same-turn frequency is checked over two legal attacks by the same inherited host, with the second attack leaving hand/deck unchanged.
- The next-turn reset is exercised through `advance.runTurn(1)`, then `engine.runOneTurn()` plus `waitForMainPhase(0)`; the host is automatically unsuspended by the real turn loop and the inherited draw fires again.
- No optional choice, payment, target choice, duration, Security effect, numeric boundary, trait filter, or evolution requirement exists on this card; those cases are explicitly non-applicable.
- Fixtures contain no Digi-Egg in deck or Security. `Permanent.stack` assertions contain only cards beneath the top card.

#### Peer, stack, gaps, and seams

- Comparative implementation review checked the shared `opponentHasNone` vocabulary, including EX8-023’s matching inherited condition, and the production interpreter’s live permanent matching and once-per-turn subtrigger paths.
- Evolution-route proof is not applicable to EX7-002 itself because it has no catalog evolution requirement. Its realistic inherited-stack route is proven by placing EX7-002 beneath a legal blue level-3 host and asserting stack identity before attacking.
- No card-specific defect or unresolved engine gap remains.
- The same-turn negative uses the named production test seam `advance(...).verb.unsuspend` because the ordinary public rules flow suspends a Digimon when it attacks and exposes no second-attack intent without an additional card effect. The attack itself remains a public `attack` intent; the next-turn reset uses the real turn loop rather than injected timing.
- Retained reds: none. Q&A IDs: none.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-002.test.ts --maxWorkers=1 --no-file-parallelism` — **1 file, 6 tests passed**.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts --maxWorkers=1 --no-file-parallelism -t 'opponentHasNone'` — **1 passed, 213 skipped**.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism -t 'oncePerTurnKey'` — **9 passed, 21 skipped**.
- `pnpm typecheck` — **passed** for shared, API, and web.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-002.ts apps/api/src/cards/EX7/EX7-002.test.ts docs/audits/EX7-reaudit/EX7-002.md` — **passed after formatting**.
- `git diff --check` — **passed**.
- No git write was performed; no commit or push is claimed.

#### Score

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Catalog fields, printed clause, local KB query, general rules, and no-Q&A result recorded. |
| IR trace | 2/2 | Exact persisted IR shape, full coverage, empty residual, live condition, draw action, and exclusive registration verified. |
| Behavioral proof | 2/2 | Positive, exact stack-condition negative, same-turn refusal, and real next-turn reset pass. |
| Peer and stack proof | 2/2 | Shared condition/once-per-turn paths reviewed; realistic inherited stack asserted; evolution requirement correctly marked N/A. |
| Executed gates | 0/2 | Intentionally held at zero by the worker brief. |
| **Total** | **8/10** | Maximum permitted for this audit lane. |

### EX7-003 — Kyaromon

Worker lane, session 1 (2026-09-09). No git write was performed. Files touched:
`apps/api/src/cards/EX7/EX7-003.ts`, `apps/api/src/cards/EX7/EX7-003.test.ts`, and this report.

#### Card summary

The committed catalog entry (`packages/shared/src/cards/data/cards.json:85072-85087`) is:

| Field | Catalog value |
| --- | --- |
| Name | Kyaromon |
| Color | Yellow |
| Kind / Level / Form | Digi-Egg / 2 / In-Training |
| Play cost / DP | -1 / 0 |
| Digivolution costs | None printed on EX7-003 |
| Attribute / Traits | `-` / Lesser, LIBERATOR |
| Rarity / Max in deck | U / 4 |

Printed clauses:

- **C1 (inherited)** `[Your Turn] All of your opponent's security Digimon get -2000 DP.`
- No main effect, ordinary effect, Security effect, or once-per-turn limit.

#### Rules and Q&A evidence

`node tools/kb/query.mjs card EX7-003` and `node tools/kb/query.mjs card EX7-003 --json`
both report no banlist, errata, or Q&A entries: `qa: []`. Therefore there are no Q&A
ids to cover or skip.

Applicable local rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`):
  a Digi-Egg on the field is treated as a Digimon, and a Digimon gains inherited effects
  from cards underneath it.
- Comprehensive Rules §4-5-1 (`.../comprehensive.md:679-682`): a Digimon flipped from
  security is treated as a Security Digimon.
- Comprehensive Rules §13-1-6, §13-1-7, and §13-1-8-3 (`.../comprehensive.md:1832-1856`):
  the checked card becomes a Security Digimon when applicable, battles the attacker, and
  skips that battle step when it is not a Security Digimon.
- The manual's timing summary (`data/kb/rules/manual.md:1694-1705`) says Your Turn effects
  can activate during the specified player's turn. Its security procedure
  (`.../manual.md:594-607`) distinguishes Security Digimon from other checked cards.

#### Clause → test → IR

| Contract | IR mapping | Observable proof |
| --- | --- | --- |
| C1 is inherited and runs on Your Turn | `trigger: "YourTurn"`, `isInherited: true` | IR assertion in `EX7-003.test.ts:9-14`; own-turn and opponent-turn live checks in `:16-105` |
| Affect the opponent's security Digimon by exactly -2000 DP | `ModifySecurityDP`, `controller: "opponent"`, `amount: -2000` | `:16-72` makes a 2000 attacker beat a 3000 Security Digimon only after reduction; `observe.securityDp(1) === -2000` |
| Do not affect ordinary battle-area Digimon | Security-DP action, not `ModifyDP` | `:16-72` keeps the opposing 3000-DP battle-area Digimon at exactly 3000 |
| Do not affect a non-Digimon security card | Security check consumer applies the ledger only to Security Digimon | `:56-72` checks a Tamer, expects `resolution: "trashed"`, and keeps the second attacker alive |
| Opponent-turn boundary | YourTurn timing guard from the compiled trigger | `:75-105` observes zero and proves the 2000 attacker loses to the unmodified 3000 Security Digimon |
| Inherited source survives a legal stack route | `duration: "permanent"` plus inherited source under the host | `:107-172` uses public `hatchEgg`, `digivolve`, `moveFromBreeding`, and `attack` intents; it asserts stack identity, zero memory cost, exact bonus-draw instance, and the resulting Security battle |
| Wrong source is rejected | No EX7-003 evolution clause is invented; normal host requirements are enforced by the engine | `:174-214` hatches green EX7-004, rejects yellow BT1-045 with `invalid-evolution`, and proves no memory/draw/stack mutation |

The module remains exclusively IR-registered at `apps/api/src/cards/EX7/EX7-003.ts:8-27`:
one compiled effect, `coverage: "full"`, `residual: []`, and
`registerIrCard("EX7-003", compiled)`. No `registerCard` duplicate exists and no module
change was required.

#### Implementation and seam trace

The shared interpreter routes `YourTurn` continuous effects through the continuous pass.
`ModifySecurityDP` writes the owner-keyed `SecurityDpLedger`; the security-check consumer
adds that delta only when the revealed card is a Digimon. `GameEngine.runSecurityCheck`
recomputes the continuous tier before reading the Security Digimon's DP. The mixed
security stack and live battle assertions above exercise this path without modifying the
shared engine.

Peer comparison: `BT5-038` uses the same inherited `YourTurn` → `ModifySecurityDP` shape,
and its focused tests cover the same owner-turn and security-battle semantics. EX7-003
matches that established pattern with the catalog's -2000 amount.

The prior EX7-003 fixture put EX7-004, a Digi-Egg, directly in the battle area. That was
replaced with legal yellow Lv.3 BT1-045 hosts. All deck/security fixtures now use inert
main-deck cards; no Digi-Egg is placed in deck or security.

#### Mutation and retained gaps

The temporary mutation `EX7-003.ts:15 amount -2000 → -1000` was run against the focused
suite and restored immediately. It produced 3 failures: the IR amount assertion, the
own-turn mixed-security boundary, and the real hatch/evolution/security-battle route.
The restored implementation passes all 5 tests.

No card-specific unsupported behavior or unresolved ambiguity remains, so no `it.fails`
seam is retained. Two observability notes remain:

- `observe(s.engine).securityDp(seat)` is an aggregate per-security-owner ledger read;
  the mixed live security battle is the proof that the delta is consumed only for a
  Security Digimon, while the Tamer control proves the non-Digimon boundary.
- `duration: "permanent"` is structural metadata for this continuous `YourTurn` effect;
  the active turn boundary comes from the trigger guard and continuous recomputation.

The requested quality-gate script is not defined in this checkout: `meteor npm run
quave-check-ci` returned `npm ERR! missing script: quave-check-ci`. This is a repository
configuration gap, not a card implementation red.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-003                         PASS: no knowledge-base entries
node tools/kb/query.mjs card EX7-003 --json                  PASS: banlist null, errata null, qa []
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-003.test.ts \
  --maxWorkers=1 --no-file-parallelism                       PASS: 1 file, 5 tests
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-003.test.ts \
  --maxWorkers=1 --no-file-parallelism --testTimeout=20000    PASS: 1 file, 5 tests
pnpm typecheck                                                PASS: shared, web, api
pnpm exec oxlint apps/api/src/cards/EX7/EX7-003.ts \
  apps/api/src/cards/EX7/EX7-003.test.ts                      PASS
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-003.ts \
  apps/api/src/cards/EX7/EX7-003.test.ts \
  docs/audits/EX7-reaudit/EX7-003.md                          PASS
git diff --check                                              PASS
meteor npm run quave-check-ci                                 UNAVAILABLE: missing script
```

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields and the sole inherited clause are recorded; applicable comprehensive/manual rules are identified; Q&A/errata/restrictions are explicitly empty. |
| Direct IR | 2 / 2 | The exact inherited Your Turn, opponent controller, -2000 amount, permanent metadata, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Five focused tests use public intents and settled observable state for positive, exact-boundary, non-Digimon, opponent-turn, and live Security battle behavior. |
| Peer / stack | 2 / 2 | BT5-038 peer semantics were compared; the real EX7-003 Digi-Egg route proves legal hatching, zero-cost evolution, bonus draw, source identity, move, and wrong-source rejection. |
| Delivery gates | 0 | Worker-lane gate is forced to 0 by the brief; no git write or delivery action was performed. |

**Total: 8 / 10** (maximum requested; no card-specific red retained).

### EX7-004 — Fluffymon

#### Audit result

Score: 8/10 (the worker brief caps the lane at 8/10; gates are 0 by policy).

The committed IR matches the catalog and all directly reachable behavior is proven, including re-arming the inherited once-per-turn watcher after a real turn transition. The former retained red was a false test-fixture failure caused by comparing against a pre-transition memory baseline after manually normalizing the gauge between hand-laid turns. The existing engine reset path is correct; no production engine correction was required.

#### Printed contract and sources

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-004:

- Green Digi-Egg, level 2, In-Training, Mini Bird/LIBERATOR, DP 0, play cost -1, no evolution requirements.
- Inherited effect: `[Your Turn] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory.`

Knowledge-base command: `node tools/kb/query.mjs card EX7-004`

Result: `EX7-004 Fluffymon (no knowledge-base entries)`. Q&A IDs: none. No card-specific errata, restrictions, or rulings were returned.

Applicable comprehensive-rules sources:

- §2-3-11-2-1 and §15-3-1: the text is inherited and cannot activate from the Digi-Egg by itself.
- §4-3-1 through §4-3-3: the stacked Digi-Egg is a digivolution card and grants its inherited effect to the top Digimon.
- §15-16-8-1: `[Your Turn]` is limited to the source controller’s turn.
- §14-2-1: battle compares the two Digimon, so the positive proof uses a surviving host that deletes the opposing Digimon.

#### Clause → test → IR mapping

| Clause | Observable proof | IR mapping |
| --- | --- | --- |
| Inherited effect | `matches the catalog and compiles the complete inherited clause`; public stack route | `isInherited: true` |
| `[Your Turn]` | Real-turn positive attack and real-turn transition in the once-per-turn test | `trigger: "YourTurn"`; interpreter derives owner-turn scope |
| `[Once Per Turn]` | Same-turn second deletion produces no additional memory; after a real turn the ledger is clear and the next deletion gains exactly 1 memory | `frequency: "OncePerTurn"` carried to the watcher key |
| This Digimon deletes an opponent’s Digimon in battle | Real public attacks; a different host’s deletion does not trigger this host, while the stacked host’s deletion does | `event: "whenDeletesInBattle"`, `sourceFilter: { isSelfRef: true }` |
| Gain 1 memory | Positive battle assertions increase memory by exactly 1; failed battle leaves it unchanged | nested `GainMemory` with `amount: 1` |

#### Behavioral and evolution evidence

The focused tests use inert main-deck Digimon and place no Digi-Egg in a main deck or security stack.

- A real attack by a non-source Digimon that deletes an opposing Digimon leaves memory unchanged; the inherited host then deletes another opposing Digimon and gains exactly 1 memory.
- A battle where the host does not delete the opponent leaves memory unchanged.
- The public route hatches EX7-004 from the Digi-Egg deck, digivolves BT1-064 (green level 3) in breeding for cost 0, asserts the standard digivolution bonus draw, preserves the exact EX7-004 instance in `Permanent.stack`, raises the stack, and proves the inherited battle deletion gains 1 memory.
- The negative public route hatches a red BT1-001 Digi-Egg and rejects the green BT1-064 evolution without moving the card, paying memory, or drawing.

No optional choice, security effect, duration, or alternate evolution requirement is printed on EX7-004.

#### Reset mechanism resolution and named seam

The former `[retained red: inherited once-per-turn watcher does not re-arm after a real turn]` was reproduced, then disproven as an engine defect. The watcher was reinstalled after the real turn, its `oncePerTurnKey` ledger count was `0`, and the next public deletion emitted `effectTriggered` and gained memory. The old assertion incorrectly expected the original baseline plus two after the fixture’s manual memory sign changes had normalized the gauge during turn passing.

The focused proof now asserts the production seam directly: `TurnStateMachine.activePhase()` reaches `clearDurations("ownerTurnStart")`, `GameEngine` calls `UseTracker.resetForNewTurn()`, continuous recomputation reinstalls the stable watcher key, and the next real battle deletion consumes that fresh per-turn budget once.

No shared-engine edit was necessary, preserving compatibility for `UseTracker`, `SubTriggerRegistry`, continuous recomputation, and other once-per-turn effects.

The same-turn repeat needs a production test-seam unsuspend bridge because no public main-phase intent unsuspends an arbitrary host. The deletion events themselves are public attacks.

#### Rubric

- Catalog/rules evidence: 2/2.
- IR implementation fidelity: 2/2.
- Behavioral proof: 2/2, including same-turn suppression and next-turn re-arm.
- Stack/evolution proof: 2/2.
- Gates: 0 by the worker brief.
- Total: 8/10.

#### Verification

- `node tools/kb/query.mjs card EX7-004` — passed; no knowledge-base entries.
- Red reproduction: the pre-fix focused test reported 6 passed, 1 expected fail, 7 total; trace evidence showed the watcher had already re-armed and gained memory.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-004.test.ts --maxWorkers=1 --no-file-parallelism` — 7 passed, 0 expected failures.
- `pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism` — 225 files, 6,774 tests passed.
- `pnpm typecheck` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX7/EX7-004.ts apps/api/src/cards/EX7/EX7-004.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-004.ts apps/api/src/cards/EX7/EX7-004.test.ts` — passed.
- `git diff --check` — passed.

No git write, commit, or push was performed. No card module, shared/catalog data, ledger, or RUN file was edited. The EX7-004 module remains unchanged because its existing exclusive `registerIrCard("EX7-004", compiled)` implementation is correct. The reset-lane evidence is recorded in `EX7-004-OPT-RESET-MECHANISM.md`.

### EX7-005 — Kapurimon

#### Result

Score: **8/10 provisional**. All eight focused tests pass; collection delivery gates remain coordinator-owned.

The implementation is compiled IR only and registers exclusively through
`registerIrCard("EX7-005", compiled)`. No change was required in
`apps/api/src/cards/EX7/EX7-005.ts`.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | The catalog assertion checks the exact EX7-005 identity and printed inherited clause. `node tools/kb/query.mjs card EX7-005` reports no card-specific KB entries/Q&A. |
| Compiled IR | 2/2 | The test asserts the complete persisted IR: `YourTurn`, inherited, `OncePerTurn`, effect provenance, self-host binding, Option kind, exact `Three Musketeers` trait, and `GainMemory 1`; coverage is `full` and residual is empty. |
| Observable behavior | 2/2 | Focused behavior proves legal public placement, payment, +1 memory, same-turn refusal, effect provenance, own-host binding, Option-only/exact-trait matching, opponent-turn rejection, and next-own-turn reset through a real continuous turn loop. |
| Stack/evolution | 2/2 | The host is `EX7-048` Gundramon with EX7-005 beneath it. Public EX7-066 placement leaves the expected source stack beneath the host top card and the tests assert the exact card identity/order. EX7-005 is a Digi-Egg with no evolution cost, so a public evolution route for EX7-005 itself is N/A; Digi-Eggs are not placed in deck/security fixtures. |
| Audit gates | 0/2 | This bounded worker lane does not claim collection-wide recalculation, mechanism-wide 10/10, or git commit/push completion. |

#### Clause-to-proof ledger

Printed clause:

`[Your Turn] [Once Per Turn] When an effect places an Option card with the [Three Musketeers] trait in this Digimon's digivolution cards, gain 1 memory.`

- `matches the catalog printing and complete inherited IR` proves the catalog text and every IR discriminator.
- `publicly gains memory when an effect places a Three Musketeers Option under its host` uses a public `playCard` intent for EX7-066. It pays the Option's 6 memory cost (10 to 5), places EX7-066 under the EX7-048 host, and gains exactly 1 memory.
- `does not gain memory for placement without effect provenance` proves a structural placement is not mistaken for an effect-owned placement.
- `ignores another stack and non-matching cards without consuming its once-per-turn use` covers another host, a non-Three-Musketeers Option, a Three Musketeers Digimon (wrong kind), then two matching Options. The first matching event gains memory; the second same-turn event does not.
- `does not gain memory when a real Option effect places itself under another Digimon` proves the watcher is bound to its own host, not merely any stack.
- `does not gain memory during the opponent's turn` proves the `YourTurn` gate on an effect-provenance placement.
- `resets its once-per-turn memory gain after a completed opponent turn` uses the production turn loop from the first own Main phase through the opponent's turn and back to the next own Main phase, proving the once-per-turn budget resets without manually assigning phase or turn seat.

#### Q&A coverage

The card KB query returned:

`EX7-005 Kapurimon` / `(no knowledge-base entries)`

Therefore there are no EX7-005 Q&A IDs to test. The exact catalog printing and the comprehensive rules interpretation are covered by the catalog assertion, inherited timing/frequency IR, public placement behavior, and turn/stack boundary tests.

#### Gaps and named seams

1. **Effect-provenance placement seam:** no public card intent in this lane opens the exact opponent-turn event “an effect places an Option under this host.” The negative test uses the named production seam `advance.verb.enterEffectResolution(...)` followed by production `placeUnder(...)`; it does not inject timing with `fire(...)`. The test explicitly retains this limitation.
2. **Turn-handoff harness seam: resolved.** A continuous production turn loop now proves same-turn suppression and next-own-turn re-arming entirely through public `endPhase` intents and observable Main-phase milestones.

No `it.fails` red is retained: the production placement/provenance path and all card-specific assertions pass. The turn-handoff limitation is explicitly reflected in the 1/2 Behavioral proof score rather than counted as full real-loop reset evidence.

#### Verification commands

- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-005.test.ts --maxWorkers=1 --no-file-parallelism` — **8 passed**.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism --testNamePattern='oncePerTurnKey'` — **9 passed, 21 skipped**.
- `pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts --maxWorkers=1 --no-file-parallelism --testNamePattern='onAddDigivolutionCards SubTrigger'` — **3 passed, 293 skipped**.
- `pnpm typecheck` — **passed** for shared, API, and web.
- `pnpm exec oxlint apps/api/src/cards/EX7/EX7-005.ts apps/api/src/cards/EX7/EX7-005.test.ts` — **passed**.
- `pnpm exec oxfmt apps/api/src/cards/EX7/EX7-005.test.ts` — applied the permitted test-file formatting fix.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-005.ts apps/api/src/cards/EX7/EX7-005.test.ts` — **passed after formatting**.
- `git diff --check -- apps/api/src/cards/EX7/EX7-005.ts apps/api/src/cards/EX7/EX7-005.test.ts` — **passed**.

No git write, commit, push, or unrelated-file edit was performed.

### EX7-006 — Yaamon

Worker lane, 2026-09-09. Scope is exactly EX7-006. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json`) identifies EX7-006 as
Yaamon, Purple, Digi-Egg, Level 2, In-Training, with no play cost, no printed evolution cost,
and traits `Lesser, LIBERATOR`. The card has no ordinary effect, main effect, or Security effect.

The sole printed clause is:

- **C1 (inherited):** `[When Attacking] [Once Per Turn] If you have 4 or fewer cards in your hand,
  this Digimon may digivolve into a Digimon card with the [Dark Dragon]/[Evil Dragon] trait in
  the trash.`

#### Rules and Q&A evidence

`node tools/kb/query.mjs card EX7-006` reports no knowledge-base entries. The JSON query reports
`banlist: null`, `errata: null`, and `qa: []`; therefore there are no Q&A IDs to cover.

Applicable rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`): a
  Digi-Egg/Digimon on the field is treated as a Digimon, and a Digimon gains inherited effects
  from cards underneath it.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): reveal/select the evolution card and host, pay
  the chosen evolution cost, place the card on top, and draw 1.
- Comprehensive Rules §8-1-2-6 (`data/kb/rules/comprehensive.md:1423-1428`): an evolution
  that cannot be completed because its cost cannot be paid returns the revealed card and does
  not move memory.
- Comprehensive Rules §11-2-3 (`data/kb/rules/comprehensive.md:1707-1717`): one attack is
  performed for an attack declaration; the test-only unsuspend verb is therefore named below
  as the structural affordance used to create a second same-turn public attack intent.

#### Clause → IR → behavioral proof

| Contract | Direct IR evidence | Focused proof |
| --- | --- | --- |
| C1 is inherited and triggers when attacking | `EX7-006.ts` compiled effect has `trigger: "WhenAttacking"`, `isInherited: true` | Structural assertion in `EX7-006.test.ts` and live `attack` intents in the behavior tests |
| Once Per Turn | `frequency: "OncePerTurn"` | Same-turn second attack leaves the first evolved top card, memory, and both remaining candidates unchanged; after the real turn the effect recollects when the hand is exactly four |
| Hand condition is ≤4 | `condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 4 }` | Four-card hand activates; five-card hand leaves host, trash, and memory unchanged |
| Candidate is a Digimon with Dark Dragon or Evil Dragon trait from trash | `into.controllerDefault: "mine"`, `into.kind: ["Digimon"]`, `nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }]`, `from: ["trash"]` | BT11-079 DarkLizardmon evolves; BT3-083 Meramon (wrong trait) and BT2-013 Growlmon (matching trait but red-only evolution route) are rejected |
| Evolution pays the printed cost | `payCost: true` | BT11-079 cost 2 changes memory 5 → 3; the hatch route’s BT11-075 zero-cost evolution leaves memory at 5 |
| Inherited source remains on the stack | The module is exclusively `registerIrCard("EX7-006", compiled)` | Public `hatchEgg`, `digivolve`, `moveFromBreeding`, and `attack` intents preserve the EX7-006 instance beneath BT11-075 and then beneath BT11-079 |
| Optional wording | `optional: true` | `autoDeclineOptional` attack leaves BT11-079 in trash, leaves BT11-075 on top, and does not pay memory |

The module has `coverage: "full"`, `residual: []`, and no duplicate `registerCard` registration.
The test fixtures keep Digi-Eggs out of deck/security and use inert main-deck cards BT1-009 through
BT1-014 for those zones.

#### Stack/evolution and recollection mechanism

The strongest legal route is covered end-to-end: hatch EX7-006, digivolve it into the Purple
Lv.3 BT11-075 in breeding at cost 0, assert the exact bonus draw instance and preserved egg
instance, move the permanent to the battle area, then attack and evolve into Purple Lv.4
BT11-079 from trash for cost 2. The resulting stack is asserted as
`[EX7-006, BT11-075]` beneath the new top card, with no pending decision or loud gap.

The same-turn refusal uses `advance(s.engine).verb.unsuspend(...)` only to provide the extra
attack that Comprehensive Rules §11-2-3 makes unavailable through ordinary attack intents. The
attack itself remains a public `applyIntent(..., { type: "attack" })` call. This is a named,
test-only structural seam, not a card implementation change.

The former retained red was reproduced and traced to the fixture's hand count, not recollection.
The red fixture seeded four cards; the first effect-driven evolution drew the mandatory
digivolution bonus card, and the next real turn drew one more, so the hand had five cards and the
printed `4 or fewer` condition correctly blocked the next attack's evolution. The corrected fixture
seeds two cards, observes two before the first attack and four after the two legitimate draws, and
the next public attack recollects EX7-006 and evolves into BT21-077.

The resulting stack is asserted as `[EX7-006, BT11-075, BT11-079]` beneath BT21-077. No engine
recollection gap remains. No shared-engine edit was necessary, preserving the existing scoped
attack collection, effect-driven digivolution, bonus draw, and Once Per Turn mechanisms.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-006
  PASS: no knowledge-base entries
node tools/kb/query.mjs card EX7-006 --json
  PASS: banlist null, errata null, qa []
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-006.test.ts \
  --maxWorkers=1 --no-file-parallelism
  RED REPRODUCTION: 1 file, 6 passed, 1 expected fail (7 tests); the five-card hand correctly
  failed EX7-006's `4 or fewer` gate.
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-006.test.ts \
  --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 7 passed, 0 expected failures
```

The type/style/diff checks are recorded after this report is written. No engine, shared, catalog,
ledger, or other-card file was edited.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | Catalog fields, the sole clause, no-Q&A result, and applicable evolution/attack rules are recorded. |
| Direct IR | 2 / 2 | Trigger, inherited flag, frequency, hand gate, trait/kind/source filters, optional flag, payment, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public attack/evolution behavior, payment, refusal, negatives, same-turn suppression, and next-turn recollection pass. |
| Peer / stack | 2 / 2 | Real hatch → zero-cost evolution → move → attack route proves bonus draw and source-stack identity; fixture boundaries are legal. |
| Delivery gates | 0 | Forced to 0 by the worker brief; no git write was performed. |

**Total: 8 / 10.**

### EX7-007 — Vorvomon

#### Result

Score: **8/10** (audit cap applied; gates are 0/2).

`apps/api/src/cards/EX7/EX7-007.ts` is complete compiled IR and registers executable behavior exclusively with `registerIrCard("EX7-007", compiled)`. No module or engine change was required.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | The test checks the exact catalog identity, two normal evolution requirements, On Play text, inherited text, colors, level, cost, DP, form, attribute, and trait. Local rules evidence is §15-15-3 for reveal processing, the Official Rule Manual reveal/bottom handling, §8-1-2-8 for evolution cards, and the glossary/Manual evolution procedure. |
| Compiled IR | 2/2 | The test asserts the complete persisted IR: On Play `RevealAdd` of 3, one listed Dragon trait, one exact Hina Kurihara name, remaining cards to deck bottom, plus inherited Your Turn self `ModifyDP` +2000; coverage is `full` and residual is empty. |
| Observable behavior | 2/2 | Public `playCard` proves the 3-memory play payment, both additions, deck-bottom result, Q3828 “as many as possible,” alternate Dragon-trait matching, exact Hina name matching, and non-matching exclusions. Inherited DP is +2000 only on the controller's turn. |
| Stack/evolution | 2/2 | A public digivolve from a red level-2 Digi-Egg succeeds at cost 0, draws the exact inert main-deck instance, leaves EX7-007 on top of the source stack, and preserves the source in `Permanent.stack`; a level-3 source is rejected without payment or movement. Digi-Eggs appear only in breeding, never deck/security. |
| Audit gates | 0/2 | This is one bounded card lane; no collection-wide recalculation, commit, or push is claimed. |

#### Printed clauses and Q&A

Catalog On Play:

`[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Rock Dragon]/[Earth Dragon]/[Machine Dragon]/[Sky Dragon] trait and 1 [Hina Kurihara] among them to the hand. Return the rest to the bottom of the deck.`

Catalog inherited:

`[Your Turn] This Digimon gets +2000 DP.`

KB-INDEX exposes one Q&A:

- **Q3828** — If cards that are targets of this effect are revealed from the deck, must as many as possible be added? **Yes.**

The Q3828 test uses a public EX7-007 play, reveals one matching Dragon trait and one exact Hina Kurihara, and asserts both are added while the remaining revealed card is bottomed. A second public case uses the alternate `Machine Dragon` trait and an exact Hina name, while a near-miss Tamer is bottomed.

#### Clause-to-test-to-IR ledger

- `matches the catalog printing and complete IR` proves all catalog fields and the exact persisted `RevealAdd`/inherited IR shape.
- `Q3828: publicly pays 3, adds one Dragon and Hina, and bottoms the remaining reveal` maps `On Play`, `revealCount: 3`, one count for each category, `to: hand`, and `rest: deckBottom` to a public play, memory 6 to 3 payment, exact hand contents, and exact remaining deck.
- `uses the exact Dragon-trait/name boundaries and adds as many as possible` proves the OR trait list accepts `Machine Dragon`, exact `nameExact` accepts Hina Kurihara, and rejects a near-miss Tamer.
- `inherits permanent +2000 DP during its controller's turn` proves inherited `YourTurn` self targeting and +2000; changing to the opponent turn removes the modifier.
- `legally evolves from a red level 2, pays 0, draws the exact main-deck instance, and preserves the source stack` proves a public legal evolution route, zero cost, standard evolution bonus draw (exact hand instance and deck decrement), top-card transition, and source identity in `Permanent.stack`.
- `rejects an illegal level 3 source for the level 2 evolution requirement` proves the level boundary and no movement/payment on rejection.

#### Gaps and seams

No card-specific engine gap or retained red exists. All card-specific behavior is reached through public intents; no injected timing is used. The legal evolution test uses the breeding-area Digi-Egg route because EX7-007's printed sources are level 2 and Digi-Eggs are not valid deck/security fixtures. The test separately proves the standard evolution bonus draw with an inert BT1-009 main-deck card; this is a game procedure, not a printed EX7-007 effect.

`Permanent.stack` is asserted as the cards beneath the top card, per the worker brief. The battle-area inherited test separately confirms the modifier is visible on a realistic stacked host and absent during the opponent's turn.

#### Verification commands

- `node tools/kb/query.mjs card EX7-007` — **Q3828 returned; no other Q&A**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-007.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- `pnpm typecheck` — **passed** for shared, API, and web.
- `pnpm exec oxlint apps/api/src/cards/EX7/EX7-007.ts apps/api/src/cards/EX7/EX7-007.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-007.ts apps/api/src/cards/EX7/EX7-007.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX7/EX7-007.ts apps/api/src/cards/EX7/EX7-007.test.ts` — **passed**.

No git write, commit, push, or edit outside the permitted EX7-007 test/report scope was performed.

### EX7-008 — ToyAgumon

Worker lane, 2026-09-09. Scope is exactly EX7-008. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json:85174-85192`) identifies
EX7-008 as ToyAgumon: Red Digimon, Level 3, Rookie, Vaccine, Puppet, play cost 3, DP 1000,
with a normal Red Lv.2 evolution for cost 0.

Printed clauses:

- **C1 (alternate evolution):** `[Digivolve] Lv.2 w/[Three Musketeers] in its text: Cost 0.`
- **C2 (On Play):** `Reveal the top 3 cards of your deck. Add 1 card with [Three Musketeers] in
  its text and 1 Option card with a cost of 6 among them to the hand. Return the rest to the
  bottom of the deck.`
- **C3 (inherited):** `[Your Turn] This Digimon gets +2000 DP.`

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-008` reports Q&A **Q3829** (2024-05-24): if cards that are
targets of this effect are revealed, as many as possible must be added to hand. The JSON query
reports `banlist: null`, `errata: null`, and `qa: [{ qno: "Q3829", ... }]`; no restriction or
erratum is present.

Applicable local rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`): a
  Digi-Egg/Digimon on the field is treated as a Digimon, and a Digimon gains inherited effects
  from cards underneath it.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3 (`data/kb/rules/comprehensive.md:1434-1446`):
  a legal evolution selects a requirement and host, pays the selected cost, places the card on
  top, and draws 1.
- Comprehensive Rules §15-15-3-4 through §15-15-3-6
  (`data/kb/rules/comprehensive.md:2578-2608`): revealing is one process until all revealed
  cards are placed, and the effect owner's player controls the order of cards returned to the
  bottom when no order is specified.
- The manual's evolution summary (`data/kb/rules/manual.md:381-391`) confirms that the evolution
  cost is paid before the revealed card is placed on top.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| C1 alternate evolution | `EX7-008.ts:63-71`: `digivolutionRequirement: [{ level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true }]` | `EX7-008.test.ts:112-145` publicly digivolves from Level-2 BT1-001 and asserts cost 0, bonus draw, and source stack; `:148-183` rejects Level-3 BT1-009 without mutation |
| C2 reveal exactly three | `EX7-008.ts:12-42`: `RevealAdd`, `revealCount: 3`, two one-card hand destinations | `EX7-008.test.ts:42-74` uses public `playCard` and verifies both selected cards, the nonmatching remainder, play payment, and no pending decision; `:91-110` verifies three near-misses all return to the bottom |
| C2 Three Musketeers-text target | `nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }]` | Q3829 positive pool uses EX7-071 and EX7-070; the partial pool uses EX7-059, whose card text contains Three Musketeers even though it is a Digimon rather than an Option |
| C2 cost-6 Option target | `kind: ["Option"]`, `costComparison: { op: "eq", value: 6 }` | EX7-070 is added from the mixed top-three pool; EX7-069 cost 2 is retained at deck bottom |
| C2 return rest to deck bottom | `rest: "deckBottom"` | Exact deck identity/order is asserted after full resolution in `EX7-008.test.ts:62-74`, `:101-107`; the mutation check also changed reveal count 3 → 2 and produced the expected structural and bottom-order failures |
| C3 inherited owner-turn DP | `EX7-008.ts:45-60`: `trigger: "YourTurn"`, `isInherited: true`, `ModifyDP amount: 2000`, `duration: "permanent"` | `EX7-008.test.ts:185-195` observes 5000 DP on the owner's turn, 3000 on the opponent's turn, and 5000 again when ownership returns |

The module uses `coverage: "full"`, `residual: []`, and registers executable behavior only with
`registerIrCard("EX7-008", compiled)`. No duplicate `registerCard` registration exists.

#### Q&A coverage and evolution stack

Q3829 is covered by the mixed-target public On Play test: when both matching target classes are
present among the three revealed cards, both required cards are added. The partial-target test
proves the “as many as possible” rule by adding EX7-059 and EX7-070 while returning EX7-069.
The all-near-miss test proves the no-match boundary.

The legal evolution proof uses a Level-2 red BT1-001 Digi-Egg already on the field, evolves the
hand ToyAgumon through the alternate text route for cost 0, draws the exact next deck instance,
and asserts the source card remains beneath the new top. The real turn-loop test additionally
reaches the same route through public `hatchEgg` and `digivolve` intents and asserts the egg
instance remains in the breeding stack. The illegal route uses a Level-3, non-text BT1-009 and
asserts `invalid-evolution`, unchanged memory/hand/deck, unchanged top card, and an empty stack.
No Digi-Egg is placed in deck or security fixtures; deck/security fixtures use main-deck cards.

#### Peer and seam trace

EX7-007 is the adjacent Red Rookie peer with the same RevealAdd plus inherited +2000 pattern;
EX7-008 follows the same interpreter shape but correctly adds the separate exact-cost-6 Option
filter and its alternate Three Musketeers-text evolution requirement. The tests use the shared
public `playCard`, `digivolve`, `hatchEgg`, and `surrender` intents; `advance` is used only to
wait for real turn-loop phases and never to inject On Play or evolution timing.

No card-specific engine gap or named retained red remains for EX7-008.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-008
  PASS: Q3829 returned; no banlist/errata
node tools/kb/query.mjs card EX7-008 --json
  PASS: qa [{ qno: "Q3829" }], banlist null, errata null
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-008.test.ts \
  --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 8 passed
```

Reversible mutation: `EX7-008.ts` `revealCount: 3 → 2` was run against the focused suite and
produced 2 failures (the exact IR assertion and the all-near-miss deck-bottom assertion), then
was restored immediately.

Final static checks:

```text
pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS
pnpm typecheck
  PASS: shared, web, and API typecheck completed
pnpm exec oxlint apps/api/src/cards/EX7/EX7-008.ts \
  apps/api/src/cards/EX7/EX7-008.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-008.ts \
  apps/api/src/cards/EX7/EX7-008.test.ts \
  docs/audits/EX7-reaudit/EX7-008.md
  PASS
git diff --check
  PASS
```

No engine, shared, catalog, ledger, or other-card file was edited.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All printed fields/clauses, Q3829, and applicable evolution/reveal rules are recorded. |
| Direct IR | 2 / 2 | Alternate requirement, RevealAdd filters/count/bottom return, inherited timing/DP/duration, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public play/evolution/turn-loop tests prove positive, partial, no-match, illegal-source, exact cost/draw, and owner-turn boundaries, including Q3829. |
| Peer / stack | 2 / 2 | EX7-007 is compared; legal alternate evolution, exact source stack, bonus draw, and real hatch/evolution path pass. |
| Delivery gates | 0 | Forced to 0 by the worker brief; no git write was performed. |

**Total: 8 / 10.**

### EX7-009 — Lavorvomon

Worker lane, 2026-09-09. Scope is exactly EX7-009. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json:85199-85226`)
identifies EX7-009 as Lavorvomon: Red Digimon, Level 4, Champion, Virus, Rock Dragon,
play cost 5, DP 4000, with Red Lv.3 cost 2 and Black Lv.3 cost 2 evolution routes.

Printed clauses:

- **C1 (On Play):** Return 1 card with the `[Machine Dragon]`/`[Sky Dragon]` trait or 1
  `[Hina Kurihara]` from your trash to your hand.
- **C2 (When Digivolving):** If you have 1 or less Tamers, you may play 1 `[Hina Kurihara]`
  from your hand without paying the cost.
- **C3 (inherited):** `[Your Turn] This Digimon gets +2000 DP.`

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-009` reports **no knowledge-base entries**. The JSON query
reports `banlist: null`, `errata: null`, and `qa: []`; therefore there are no direct EX7-009
Q&A IDs to cover. Hina Kurihara's related Q&A entries Q3430 and Q3431 concern the separate
behavior of multiple Hina copies activating another Digimon's On Play effects, not a clause
printed on EX7-009, so they are recorded as non-applicable rather than claimed as card proof.

Applicable local rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`): a
  Digimon on the field gains inherited effects from cards underneath it.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects a requirement,
  pays its cost, places the card on top, and draws 1.
- The manual's evolution summary (`data/kb/rules/manual.md:381-391`) confirms that the
  evolution cost is paid before the new card is placed on top.
- Comprehensive Rules §15-15-3-4 through §15-15-3-6
  (`data/kb/rules/comprehensive.md:2578-2608`) supplies the engine's ordered reveal/placement
  model; EX7-009 itself uses a single-card trash return rather than a reveal sequence.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution routes | `EX7-009.test.ts:9-75` asserts `getCardDefinition` fields, Red/Black Lv.3 cost-2 routes, full coverage, and empty residuals | The same static test pins the committed card definition and every compiled effect shape |
| C1 trait-or-name return | `EX7-009.ts:11-33`: `Return` to hand, `zone: "trash"`, own controller, one target, trait OR exact-name filters | `EX7-009.test.ts:78-104` publicly plays Lavorvomon and returns EX7-042 Machine Dragon; `:106-130` proves exact Hina matching while EX7-065 remains in trash |
| C2 conditional free Hina play | `EX7-009.ts:37-65`: `WhenDigivolving`, hand source, exact Hina name, one target, `PlayWithoutCost`, `payCost: false`, optional, own battle-area Tamer count `lte 1` | `EX7-009.test.ts:132-166` publicly evolves, pays 2, draws 1, preserves the source stack, and plays Hina; `:168-197` proves optional refusal; `:199-228` proves two existing Tamers prevent the play |
| Legal/illegal evolution and stack | Catalog costs are asserted at `EX7-009.test.ts:11-24`; normal compiled registration is `EX7-009.ts:91` | `EX7-009.test.ts:230-279` proves the Black Lv.3 route and rejects a Level-4 source with unchanged memory/hand/deck/top/stack; `:293-349` proves public hatch, intermediate evolution, move, final EX7-009 evolution, exact stack identity/order, and bonus draw through the real turn loop |
| C3 inherited owner-turn DP | `EX7-009.ts:68-85`: inherited `YourTurn` `ModifyDP`, self target, permanent +2000 | `EX7-009.test.ts:281-291` observes 5000 DP on the owner's turn, 3000 on the opponent's turn, and 5000 after returning to the owner's turn |

The module registers executable behavior only with `registerIrCard("EX7-009", compiled)` and
has `coverage: "full"`, `residual: []` (`EX7-009.ts:87-91`). No duplicate `registerCard`
registration exists.

#### Q&A coverage, evolution, and stack

There is no direct EX7-009 Q&A in KB-INDEX, so Q&A coverage is explicitly **N/A — no IDs
returned**, rather than inferred from unrelated rulings. The public behavior tests cover both
target branches of C1, including a near-miss Tamer; both optional outcomes of C2; and the
`1 or less` boundary versus two Tamers.

The legal proofs use ordinary public `digivolve` intents from Red BT1-009 and Black BT14-055
Level-3 sources. They assert the printed cost (memory 5 → 3), the mandatory evolution bonus
draw, and preservation of source instance IDs beneath EX7-009. The illegal Level-4 BT1-014
source returns `invalid-evolution` without paying, drawing, moving the card, or changing its
stack. The real loop uses `eggDeck` only for BT1-001; no Digi-Egg is placed in a normal deck or
security fixture.

#### Peer and seam trace

EX7-008 and EX7-010 are adjacent compiled peers with the same inherited +2000 pattern and
normal public evolution cost/draw mechanics. EX7-042 is the closest effect peer for the
one-or-less-Tamers exact Hina play. EX7-009's tests use public `playCard`, `digivolve`,
`hatchEgg`, `moveFromBreeding`, and `surrender` intents; timing helpers only wait for real
turn-loop phases and never inject On Play or When Digivolving events.

No card-specific engine gap or retained red was observed. Named repository seam: the generated
module retains its existing `@ts-nocheck` header (`EX7-009.ts:1`) and relies on the shared
interpreter/registry; this is a static typing seam, not an observed behavioral failure, and was
not broadened or hidden by this audit.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-009
  PASS: no knowledge-base entries
node tools/kb/query.mjs card EX7-009 --json
  PASS: qa [], banlist null, errata null
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-009.test.ts
  PASS: 1 file, 9 passed
```

Reversible mutation: `EX7-009.ts` Tamer threshold `value: 1 → 0` was run against the focused
suite and produced 1 failure (the compiled condition assertion; 8 other tests remained green),
then was restored immediately. This demonstrates that the threshold proof is sensitive to the
printed boundary.

Final static checks:

```text
pnpm --filter @aegis/api typecheck
  PASS: tsc --noEmit -p tsconfig.json
pnpm exec oxlint apps/api/src/cards/EX7/EX7-009.ts apps/api/src/cards/EX7/EX7-009.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-009.ts apps/api/src/cards/EX7/EX7-009.test.ts
  PASS
git diff --check
  PASS (run after report creation)
```

Only the permitted EX7-009 test/report lane was changed by this audit; pre-existing worktree
changes for other cards were preserved. No commit, branch, push, reset, or other git write was
performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All printed identity, evolution, clauses, applicable local rules, and the empty direct KB Q&A result are recorded. |
| Direct IR | 2 / 2 | Return OR filter, exact Hina hand play, ≤1-Tamer condition, inherited timing/DP/duration, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public positive/negative On Play and evolution tests cover target boundaries, optional refusal, legal/illegal sources, cost/draw, stack, real loop, and owner-turn DP. |
| Peer / stack | 2 / 2 | Adjacent/effect peers are identified; both printed color routes and exact source-stack identity/order are proven. |
| Delivery gates | 0 | Forced to 0 by the worker brief and task cap; no git write was performed. |

**Total: 8 / 10.**

### EX7-010 — Deputymon

#### Result

Score: **8/10**. The audit cap leaves gates at 0/2; the card and mechanism evidence are green, including the corrected Q3831 breeding-area negative.

`apps/api/src/cards/EX7/EX7-010.ts` is compiled IR and registers executable behavior exclusively through `registerIrCard("EX7-010", compiled)`. The serialized mechanism lane made no shared engine change: it proved the existing battle-area guard and corrected an invalid red-Option fixture.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | The test checks the catalog identity, red level 4, play cost 6, DP 6000, normal red level-3 evolution cost 2, alternate level-3/Three Musketeers-in-text evolution cost 2, Vaccine/Mutant properties, both effect clauses, and inherited text. Local rules evidence covers evolution procedure, stacked-card source identity, and optional reveal/choice processing. |
| Compiled IR | 2/2 | The test checks both optional `Trash` triggers, `controller: any` stack targeting, battle-area `GrantStatic` for Three Musketeers, inherited +2000 DP, the alternate evolution requirement, `coverage: full`, and empty residual. |
| Observable behavior | 2/2 | Public digivolve and attack prove opponent-stack and own-stack selection, optional refusal, cost, standard draw, and stack movement. Q3831’s battle-area positive places EX7-066 under Deputymon; the breeding-area negative uses the purple EX7-071 Three Musketeers Option and is rejected with `color-requirement-unmet`. |
| Stack/evolution | 2/2 | Public alternate digivolution from EX7-008 succeeds for cost 2, draws the exact inert BT1-009 instance, empties the deck, preserves EX7-008 in `Permanent.stack`, and trashes an opponent Option. A blue level-3 source is rejected without payment, draw, or stack movement. There is no printed evolution bonus-draw clause, but standard game evolution draw is explicitly asserted. Digi-Eggs are not used in deck/security. |
| Audit gates | 0/2 | This is a single bounded card lane with no collection-wide recalculation or git delivery claim. |

#### Printed clauses and Q&A coverage

Catalog clauses:

- `[Digivolve] Lv.3 w/[Three Musketeers] in its text: Cost 2`
- `[When Digivolving] [When Attacking] You may trash any 1 Option card from 1 Digimon's digivolution cards.`
- `[Your Turn] This Digimon gains the [Three Musketeers] trait.`
- inherited: `[Your Turn] This Digimon gets +2000 DP.`

KB-INDEX query `node tools/kb/query.mjs card EX7-010` returned:

- **Q3830**: the card may choose either its own Digimon or an opponent's Digimon for the trash effect. Public digivolve proves the opponent stack; public attack proves its own stack as well.
- **Q3831**: the Your Turn trait grant does not activate outside the battle area. The battle-area public Option play passes; the breeding-area mechanism probe confirms zero granted traits and rejects the purple Option whose color waiver would otherwise require Three Musketeers.

#### Clause-to-test-to-IR ledger

- `matches the catalog printing, alternate evolution, and complete IR` maps all catalog fields and the complete persisted IR shape.
- `Q3830: publicly digivolves for 2, draws, and trashes an opponent's Option stack` maps the alternate requirement, `WhenDigivolving`, optional any-controller Option trash, standard evolution draw, payment, and source stack identity to a public digivolve.
- `can trash an opponent's stacked Option when attacking` maps the `When Attacking` opponent-stack route to a public attack.
- `Q3830: can also trash an Option from its own Digimon stack when attacking` proves the own-stack side of “either.”
- `declines the optional attack trash through a public attack` proves the `You may` refusal and leaves the Option in the stack.
- `Q3831: grants Three Musketeers in the battle area during Your Turn` proves the trait grant enables a public Three Musketeers Option play and placement under Deputymon.
- `Q3831: a breeding-area Deputy cannot supply Three Musketeers for a color waiver` proves the outside-battle-area static boundary through a public play and exact rejection reason.
- `applies inherited +2000 DP to its host` proves the inherited stack effect on a host.
- `rejects an illegal alternate evolution source without payment, draw, or stack movement` proves the non-red level-3 source cannot satisfy either normal or alternate route.

#### Gaps, fixture correction, and retained red

No card-specific red remains. The original breeding probe used EX7-066, a red Three Musketeers Option. The engine correctly permits that Option's printed red color requirement from a breeding-area Digimon under the official color rule, so its `ok: true` result did not demonstrate a leaked trait grant; the continuous ledger was empty. The corrected probe uses EX7-071, a purple Three Musketeers Option, and now rejects it because EX7-010 in breeding cannot satisfy EX7-071's conditional color waiver.

The mechanism regression `apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` couples the public rejection to the ledger result (`grantedTraits(deputy.permanentId) === []`). No generic engine fix was justified or applied. `Permanent.stack` assertions follow the brief: only cards beneath the top card are present.

#### Verification commands and results

- `node tools/kb/query.mjs card EX7-010` — **Q3830 and Q3831 returned**.
- `node tools/kb/query.mjs rules "digivolution card level color requirement" --limit 5` — returned the evolution procedure/glossary and §8-1-2-8 stacked-card rule references.
- `node tools/kb/query.mjs rules "RevealAdd return rest to bottom of deck" --limit 5` — returned the reveal-processing and Official Rule Manual references used for standard draw/stack processing.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-010.test.ts --maxWorkers=1 --no-file-parallelism` — **11 passed** after the fixture correction.
- `pnpm --filter @aegis/api exec vitest run src/engine/cards/ex7BreedingStaticGrant.test.ts --maxWorkers=1 --no-file-parallelism` — **1 passed**.
- `pnpm typecheck` — **passed** for shared, API, and web.
- `pnpm exec oxlint apps/api/src/cards/EX7/EX7-010.ts apps/api/src/cards/EX7/EX7-010.test.ts apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-010.ts apps/api/src/cards/EX7/EX7-010.test.ts apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX7/EX7-010.ts apps/api/src/cards/EX7/EX7-010.test.ts apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` — **passed**.

No git write, commit, push, or edit outside the permitted EX7-010 test/report scope was performed.

### EX7-011 — Megadramon

Worker lane, 2026-09-09. Scope is exactly EX7-011. No git write was performed.

#### Audit result

Score: **8/10**. The worker brief caps this bounded lane at 8/10 and assigns delivery gates 0
by policy.

The committed implementation is a complete compiled IR card registered only through
`registerIrCard("EX7-011", compiled)`. The catalog contract, alternate evolution requirement,
On Play/When Digivolving replacement, 6000-DP boundary, inherited Piercing, legal/illegal
evolution, exact costs, bonus draw, and stack identity/order are covered by public behavior.
The serialized §15-7-5 resolver lane also proves the no-target payable placement behavior.

#### Printed contract and source evidence

The committed catalog entry in `packages/shared/src/cards/data/cards.json` identifies EX7-011 as
Megadramon: Red Digimon, Level 5, Ultimate, Virus, Cyborg, play cost 7, DP 7000, with the
standard Red Level 4 cost-3 route and the printed alternate route:

`[Digivolve] Lv.4 w/[Three Musketeers] in its text: Cost 3`

Its effect text is:

`[On Play] [When Digivolving] By placing 1 Option card with the [Three Musketeers] trait from your hand or trash as this Digimon's bottom digivolution card, delete 1 of your opponent's Digimon with 6000 DP or less.`

Its inherited text is `＜Piercing＞.`

The EX7 knowledge-base index (`docs/audits/EX7-reaudit/KB-INDEX.md`) lists EX7-011 as
`none | none | none` for Q&A IDs, errata, and banlist. Direct commands agree:

```text
node tools/kb/query.mjs card EX7-011
  EX7-011 Megadramon (no knowledge-base entries)
node tools/kb/query.mjs card EX7-011 --json
  {"cardId":"EX7-011","name":"Megadramon","banlist":null,"errata":null,"qa":[]}
```

Therefore Q&A coverage is explicitly **N/A — no EX7-011 IDs returned**, not an inference from
unrelated cards.

Applicable indexed rules evidence from `data/kb/rules-index.json`:

- §2-3-3 (`rules-index.json:312-318`) defines effect text; §2-3-5 (`:320-328`) includes text
  after `[Digivolve]` in a card's evolution requirements, supporting the literal “Three
  Musketeers in its text” source test.
- §8-1 and §8-1-2 (`:1016-1038`) define standard evolution, requirement selection, legality,
  stacking, and the no-draw exception; §8-1-3 (`:1040-1048`) specifies paying the chosen cost,
  placing the new card on top, and drawing 1.
- §15-7 (`:1376-1398`) defines `by` optional processing and states in §15-7-5 that the player
  may execute the condition even when later processing has no legal target.
- §15-8-3 (`:1408-1414`) defines trigger-type effects, including that they trigger when their
  conditions are met and do not trigger when they are not.
- The keyword glossary entry (`rules-index.json:2898-2904`) defines Piercing as performing the
  normal security check after deleting an opposing Digimon in battle and surviving.

#### Clause → IR → public proof

| Printed contract | Direct implementation | Public behavioral evidence |
| --- | --- | --- |
| Level 5 Red Megadramon, play cost 7, DP 7000, Red Level 4 cost 3 | `EX7-011.test.ts:8-25` pins the catalog definition and compiled alternate requirement | Play and evolution assertions also verify memory deltas of 7 and 3 respectively |
| Alternate evolution from Level 4 with `[Three Musketeers]` in its text for cost 3 | `EX7-011.ts:108-115` uses `{ level: 4, texts: ["Three Musketeers"], cost: 3, isAlternate: true }` | `EX7-011.test.ts:83-119` publicly evolves from EX7-010 with `alternateRequirementIndex: 0`; `:121-141` rejects Level-4 BT1-014, leaving source/top/hand/memory unchanged |
| On Play and When Digivolving | `EX7-011.ts:11-91` has one compiled `Delete` action for each trigger | `EX7-011.test.ts:53-81` uses public `playCard`; `:83-119` uses public `digivolve`, with no injected timing fire |
| Place one Three Musketeers Option from hand or trash as this Digimon's bottom card | Each action has a `place` cost, Option + Three Musketeers trait filter, `from: ["hand", "trash"]`, destination `digivolutionStack`, position `bottom`, host `self` | Hand source is placed exactly once at `:76-79`; trash source is removed from trash and is first/bottom in `[option, source]` at `:110-117` |
| Delete one opposing Digimon at 6000 DP or less | Both actions use opponent Digimon, count 1, DP `lte 6000` | Exact 6000 target is deleted at `:63-80`; the no-target payable proof leaves a 7000 target alive at `:143-170` |
| Optional `by` condition | Both actions carry `optional: true` and `abortOnDecline: true` | Declining publicly leaves the Option in hand and target alive at `:173-197` |
| Inherited Piercing | `EX7-011.ts:95-104` marks the keyword block `isInherited: true` | Public attack from a Digimon carrying EX7-011 under it deletes a suspended defender and checks security at `:199-217` |
| Complete implementation registration | `EX7-011.ts:106-118` has `coverage: "full"`, `residual: []`, and the sole `registerIrCard` call | Structural assertion at `:47` plus focused registration import prove the compiled path is exercised |

#### Evolution, cost, draw, stack, and negative coverage

The legal public evolution starts with EX7-010 Deputymon, a Red Level 4 whose effect text
contains `[Three Musketeers]`, and explicitly selects EX7-011's alternate requirement. Memory
moves **5 → 2** for the exact cost 3. The standard evolution bonus draws exactly the named deck
card. The resulting stack is asserted by instance identity and bottom-first order:

```text
Permanent.stack = [EX7-071 Option, original EX7-010 source]
topCard = EX7-011
```

The When Digivolving clause then places the trash Option at the bottom and deletes the 5000-DP
opponent. The illegal public route uses Level-4 Red BT1-014, which does not contain Three
Musketeers in its card text, with `alternateRequirementIndex: 0`; the engine returns
`invalid-evolution` without moving EX7-011, paying memory, or changing the source.

The play proof starts at memory 10, pays the printed **7** (10 → 3), places the hand Option,
deletes the exact 6000-DP target, and confirms the deck is unchanged (play does not draw).
The negative optional proof declines the replacement condition, leaving the Option in hand and
the 6000-DP target alive after only the card's printed play cost is paid.

The fixtures use only inert main-deck Digimon/Options and do not place Digi-Egg cards in a main
deck or security stack.

#### Resolved mechanism seam

The serialized mechanism lane reproduced the former red with the `it.fails` probe: the focused
run reported **7 passed | 1 expected failure**, with the first unmet assertion being the missing
`EX7-071` in Megadramon's stack. The cause was shared resolver preflight: the Delete action's
no-target guard returned `abortOnDecline` before the optional processing condition could pay its
placement cost. Declaration-time board gating had the same blind spot for this unflagged shape.

The generic fix is deliberately narrow. A shared predicate recognizes an optional,
`abortOnDecline` Delete whose independent cost places a loose hand/trash card under its own host;
it preserves the explicit `allowCostWithoutTarget` opt-in and does not broaden suspend, deleteOwn,
or other activation-cost semantics. The predicate is used by the Delete action preflight and the
declaration-time board-target gate. EX2-051's existing no-target activation negative control
remains green.

The former probe is now an ordinary `it` with the original assertions unchanged. Green evidence
is exact: memory **10 → 3**, EX7-071 leaves hand and is the bottom stack card, and the 7000-DP
opposing Digimon remains in play at 7000 DP. Full mechanism details and root-cause evidence are in
[`EX7-011-BY-CONDITION-MECHANISM.md`](./EX7-011-BY-CONDITION-MECHANISM.md).

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-011.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 8 passed (8 total)

pnpm --filter @aegis/api exec vitest run \
  src/cards/EX7/EX7-011.test.ts \
  src/engine/effects/interpreter/processingCondition.test.ts \
  src/engine/conformance/ch15-02-timing-and-resolution.test.ts \
  src/engine/interactionAudit.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 4 files, 65 passed

pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism
  PASS: 226 files, 6,775 passed (serial)

pnpm --filter @aegis/api run typecheck
  BLOCKED outside this lane: pre-existing duplicate `keywords` property in
  `src/cards/EX7/EX7-014.test.ts:102` (TS1117); no EX7-014 file was edited.

pnpm exec oxlint [five changed TypeScript files]
  PASS

pnpm exec oxfmt --check [five changed TypeScript files]
  PASS

git diff --check -- apps/api/src/cards/EX7/EX7-011.ts apps/api/src/cards/EX7/EX7-011.test.ts docs/audits/EX7-reaudit/EX7-011.md
  PASS
```

No commit, branch, push, reset, or other git write was performed. Only the permitted test and
report paths changed; `EX7-011.ts` remains unchanged.

#### Score

| Category | Score | Reason |
| --- | ---: | --- |
| Catalog / rules / KB-INDEX | 2 / 2 | Catalog fields, all clauses, indexed rules, and the empty Q&A result are recorded. |
| Direct IR | 2 / 2 | Both triggers, exact target/cost filters, optional sequencing, alternate requirement, inherited keyword, full coverage, residual, and exclusive registration are traced. |
| Public behavior | 2 / 2 | Public play, digivolve, exact boundaries, decline, illegal source, draw/cost/stack, Piercing, and the §15-7-5 no-target placement are green. |
| Evolution / peer / stack | 2 / 2 | Legal and illegal alternate routes plus exact source identity and bottom-first placement are proven; EX7-010 is the adjacent text-route peer. |
| Delivery gates | 0 | Forced to 0 by the worker brief and task cap. |

**Total: 8 / 10.**

### EX7-012 — Lavogaritamon

Worker lane, 2026-09-09. Scope is exactly EX7-012. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json:85279-85306`)
identifies EX7-012 as Lavogaritamon: Red Digimon, Level 5, Ultimate, Virus, Rock Dragon,
play cost 7, DP 7000, with Red Lv.4 cost 3 and Black Lv.4 cost 3 evolution routes.

Printed clauses:

- **C1 (On Play):** Delete 1 of your opponent's Digimon with 6000 DP or less.
- **C2 (When Digivolving):** If your opponent doesn't have a Digimon with 6000 DP or less,
  gain 1 memory.
- **C3 (inherited):** `<Security Attack +1>`.

There is no printed Security effect and no once-per-turn clause.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-012` reports **no knowledge-base entries**. The JSON query
reports `banlist: null`, `errata: null`, and `qa: []`; consequently there are no direct
EX7-012 Q&A IDs to cover, and no ruling/erratum is being inferred.

Applicable local rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`): a
  Digimon on the field gains inherited effects from cards underneath it.
- Comprehensive Rules §4-15-1 (`data/kb/rules/comprehensive.md:814-815`): a card deleted by
  a rule or effect is trashed.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects a requirement,
  pays its cost, places the card on top, and draws 1.
- Comprehensive Rules §11-5-1-1 and §13-1-2 through §13-1-8-5
  (`data/kb/rules/comprehensive.md:1768-1774`, `1820-1861`): a successful player attack
  performs one security check whose card count is modified by Security Attack, and a modified
  count is checked in one security check.
- The manual's evolution summary (`data/kb/rules/manual.md:381-391`) confirms that the
  evolution cost is paid before the new card is placed on top.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution routes | `EX7-012.test.ts:9-28` asserts all relevant catalog fields, Red/Black Lv.4 cost-3 routes, and printed text | The committed catalog entry is pinned directly; no alternate evolution is present or claimed |
| C1 On Play deletion | `EX7-012.ts:11-27`: `Delete`, opponent controller, Digimon kind, DP `lte 6000`, count 1 | `EX7-012.test.ts:74-104` publicly plays the card, deletes the 6000-DP target, leaves the 7000-DP near-match, pays play cost 7, and clears pending decisions; `:106-130` proves a 6001-DP target is not deleted |
| C2 When Digivolving memory condition | `EX7-012.ts:29-48`: `GainMemory` amount 1 guarded by opponent-none over opponent Digimon at DP `lte 6000` | `EX7-012.test.ts:132-163` publicly evolves, pays 3, draws 1, preserves the source stack, and gains memory when only a 7000-DP opponent exists; `:165-192` proves exact 6000 DP blocks the gain |
| C3 inherited Security Attack +1 | `EX7-012.ts:50-61`: inherited Static keyword `SecurityAttack` amount 1 | `EX7-012.test.ts:245-267` observes `securityAttack === 2` on a stacked host and uses a public attack to consume exactly two security cards |
| Legal/illegal evolution and stack | Catalog routes are asserted at `EX7-012.test.ts:18-21`; executable registration is `EX7-012.ts:67` | `EX7-012.test.ts:194-243` proves both Red and Black Lv.4 routes; the Level-3 negative returns `invalid-evolution` with unchanged memory/hand/deck/top/stack; `:269-300` repeats a legal cost/draw/stack path through the real turn loop |

The module reports `coverage: "full"`, `residual: []` and registers executable behavior only
with `registerIrCard("EX7-012", compiled)` (`EX7-012.ts:63-67`). No duplicate `registerCard`
registration exists.

#### Q&A coverage, evolution, and stack

KB-INDEX returned no direct Q&A IDs, so Q&A coverage is explicitly **N/A — no IDs returned**.
The behavioral suite instead proves the complete printed contract and the exact numeric
boundary. The fixtures use inert main-deck Digimon (`BT1-009`, `BT1-013`, `BT1-014`, and
`BT10-062`); no Digi-Egg appears in a normal deck or security fixture.

The legal evolution tests use ordinary public `digivolve` intents from Red BT1-014 and Black
BT10-062 Level-4 sources, assert memory 5 → 2 plus the conditional gain to 3, draw the exact
deck instance, and preserve the source instance beneath EX7-012. The illegal Level-3 BT1-009
source returns `invalid-evolution` without paying, drawing, moving, or changing its stack.
The real turn-loop test reaches the same legal evolution through `waitForMainPhase` and a
public intent, then asserts cost, draw, and stack state. `advance` is used only for real phase
waiting; no `advance.fire` or `fireTiming` injection is used.

The inherited keyword is exercised in a realistic source stack: a 9000-DP BT1-014 host has
EX7-012 beneath it, then attacks through two inert BT1-014 security Digimon. The public security
resolution produces two `securityChecked` events and leaves the attacker in the battle area.

#### Peer and seam trace

EX7-011 is the adjacent Red/Black Ultimate peer with the same 6000-DP deletion vocabulary;
EX7-014 supplies a nearby lowest-DP deletion comparison. EX7-036 and the engine security
projection/conformance tests are the relevant inherited Security Attack peers. These comparisons
support the chosen opponent-Digimon filter, `lte` boundary, inherited keyword shape, and public
security-check assertion.

No card-specific engine gap or retained red was observed, so no `it.fails` test was added. Named
repository seam: the generated card module retains its existing `@ts-nocheck` header
(`EX7-012.ts:1`) and delegates behavior to the shared IR interpreter; this is a static typing
seam, not an observed behavioral failure, and no engine/shared file was changed.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-012
  PASS: no knowledge-base entries
node tools/kb/query.mjs card EX7-012 --json
  PASS: qa [], banlist null, errata null
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-012.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 8 passed
```

Reversible mutation: `EX7-012.ts` On Play DP ceiling `6000 → 6001` was run against the
focused suite and produced 2 failures: the exact IR assertion and the above-ceiling negative.
The module was restored immediately; the final focused suite returned 8/8.

Final static and lane checks:

```text
pnpm typecheck
  PASS: shared build, shared/API/web typechecks
pnpm exec oxlint apps/api/src/cards/EX7/EX7-012.ts apps/api/src/cards/EX7/EX7-012.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-012.ts apps/api/src/cards/EX7/EX7-012.test.ts
  PASS
rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-012.test.ts
  PASS: no matches
git diff --check
  PASS
```

Only the permitted EX7-012 test/report lane was changed by this audit; pre-existing worktree
changes for other cards were preserved. No commit, branch, push, reset, ledger, RUN, or other
git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All printed identity, evolution routes, clauses, applicable rules, and the empty direct KB Q&A result are recorded. |
| Direct IR | 2 / 2 | Delete target/count/boundary, conditional memory gain, inherited Security Attack keyword, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public On Play, When Digivolving, attack, legal/illegal evolution, exact boundaries, cost/draw, stack, and real timing all pass. |
| Peer / stack | 2 / 2 | Nearby deletion/security peers are identified; both color routes, source identity/order, and actual two-card security resolution are proven. |
| Delivery gates | 0 | Forced to 0 by the worker brief and task cap; no git write was performed. |

**Total: 8 / 10.**

### EX7-013 — MagnaKidmon

#### Result

Score: **8/10**. Gates remain 0/2 for this bounded card lane. Q3832 is green: the public flow proves the BT10-077 watcher trashes exactly five cards from the opponent's hand.

`apps/api/src/cards/EX7/EX7-013.ts` is compiled IR and registers executable behavior exclusively with `registerIrCard("EX7-013", compiled)`. No production engine source change was made. The mechanism lane adds only a named testkit `drawByEffect` affordance and a focused engine regression.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | The catalog assertion checks the exact MagnaKidmon identity, red level 6, play cost 12, DP 12000, red level-5 evolution cost 4, Dragonkin/Three Musketeers traits, all printed effect text, and the inherited text. Local rules queries cover draw processing, turn procedures, optional effects, and stacked-card/evolution handling. |
| Compiled IR | 2/2 | The test asserts the complete persisted IR: On Play and When Digivolving optional free use of a mine-hand Three Musketeers Option followed by draw-to-six, End of Your Turn `OncePerTurn` SelectBind/trash cost, Security Attack +1 duration, and the forced attack; coverage is `full` and residual is empty. |
| Observable behavior | 2/2 | Public play, digivolve, end-phase, and attack flows prove the card’s costs, optional branches, draw-to-six, target stack restriction, Security Attack +1 attack, real-turn reset, and Q3832: BT10-077 observes the five-card add and causes seat 0 to trash exactly five cards while its BT1-104 cost card goes to seat 1’s trash. |
| Peer/stack proof | 2/2 | EX7-066 supplies the matching Option peer fixture; EX7-011 is the legal level-5 source with Three Musketeers in its text; BT1-038 is an invalid blue level-5 source. Tests assert the exact drawn instance, cost, top card, and `Permanent.stack` source/Option identities. |
| Audit gates | 0/2 | No collection-wide recalculation, ledger/RUN edit, commit, or push is claimed. |

#### Printed clauses and Q&A coverage

Catalog clauses:

- `[Digivolve] Lv.5 w/[Three Musketeers] in its text: Cost 4.`
- `[On Play] [When Digivolving] You may use 1 Option card with the [Three Musketeers] trait from your hand without paying the cost. Then, draw cards until there are 6 cards in your hand.`
- `[End of Your Turn] [Once Per Turn] By trashing 1 Option card in this Digimon's digivolution card, 1 of your Digimon gains ＜Security Attack +1＞ for the turn and that Digimon attacks.`

The direct KB query returned one Q&A:

- **Q3832** — When BT10-077 reacts to MagnaKidmon adding five cards to the opponent's hand, BT10-077 trashes **5 cards** from that hand.

#### Clause-to-test-to-IR ledger

- `matches the catalog printing and complete IR` proves the catalog fields, alternate evolution requirement, both trigger copies, exact filters/controllers, free-payment flag, draw-to-six, end-of-turn frequency, self-stack Option cost, selected Digimon, temporary Security Attack +1, and forced attack.
- `publicly uses a Three Musketeers Option for free on play and draws to six` uses a public EX7-013 play. It pays only the printed 12 (memory 20 to 8), uses EX7-066 without paying its cost, places it under MagnaKidmon, and ends with exactly six expected hand cards and an empty deck.
- `Q3832: BT10-077 trashes exactly five cards from the opponent's hand` uses the public On Play flow with one starting hand card, so MagnaKidmon adds exactly five cards. With the optional watcher accepted, seat 0 retains `BT1-014`, seat 0's trash receives `BT1-009` through `BT1-013` (five cards), and seat 1's trash receives the watcher cost `BT1-104`.
- `publicly digivolves from a legal Three Musketeers-text level 5` uses EX7-011 as the legal source, pays exactly 4, performs the standard evolution draw of the exact BT1-014 instance, uses EX7-066 through When Digivolving without cost, draws to six, and asserts top/under-stack identity.
- `rejects an illegal non-Three-Musketeers level 5 source` uses blue BT1-038 and proves no payment, draw, or stack movement.
- `publicly declines the optional End of Your Turn cost` proves the `may` refusal leaves BT1-104 in MagnaKidmon's own stack and does not attack.
- `does not pay the End of Your Turn cost from another Digimon's stack` proves the self-host stack filter through a real end-phase flow.
- `runs the End of Your Turn attack once on each of two real own turns` proves the trash cost, Security Attack +1 attack, security movement from 5 to 3 then 1, and once-per-turn reset across the opponent's intervening real turn.

#### Gaps and retained red

**Q3832 fixture correction:** the earlier retained red was not an engine gap. The fixture both declined BT10-077's optional activation and expected cards selected from seat 0's hand to appear in seat 1's trash. The rules result is that BT10-077's Option payment is trashed by seat 1, while its opponent (seat 0) trashes five cards from seat 0's own hand. The corrected public assertion is ordinary green, and the focused mechanism test independently proves the same direction through the real watcher and effect-draw primitive.

The exact same-source same-turn duplicate End of Your Turn timing is not separately reachable through public intents: a public `endPhase` advances the turn after the one End of Your Turn window. The suite proves the once-per-turn IR identity and the required next-own-turn reset through the real turn loop, while the unreachable duplicate is not represented as fabricated behavioral evidence.

No Digi-Egg appears in deck or security. All draw fixtures use inert BT1-009 through BT1-014 main-deck Digimon. `Permanent.stack` assertions contain only cards beneath the top card.

#### Verification commands and results

- `node tools/kb/query.mjs card EX7-013` — **Q3832 returned**.
- `node tools/kb/query.mjs rules "draw until there are 6 cards in your hand" --limit 5` — returned comprehensive draw and turn-procedure references.
- `node tools/kb/query.mjs rules "End of Your Turn Once Per Turn attack security attack" --limit 5` — returned turn/attack/security and once-per-turn references.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-013.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose` — **8 passed**.
- `pnpm --filter @aegis/api exec vitest run src/engine/cards/ex7HandAddWatcher.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose` — **1 passed**.
- `pnpm typecheck` — **passed** for shared, API, and web.
- `pnpm exec oxlint apps/api/src/cards/EX7/EX7-013.test.ts apps/api/src/engine/testkit/advance.ts apps/api/src/engine/cards/ex7HandAddWatcher.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-013.test.ts apps/api/src/engine/testkit/advance.ts apps/api/src/engine/cards/ex7HandAddWatcher.test.ts` — **passed**.
- `git diff --check -- apps/api/src/engine/testkit/advance.ts apps/api/src/engine/cards/ex7HandAddWatcher.test.ts apps/api/src/cards/EX7/EX7-013.test.ts` — **passed**.

No git write, commit, push, or edit outside the permitted EX7-013 lane scope was performed.

### EX7-014 — Volcanicdramon

Worker lane, 2026-09-09. Scope is exactly EX7-014. No git write was performed.

#### Conclusion

**Score: 8/10. No retained red.** The two original retained reds were genuine generic
engine seams. Each was reproduced independently, fixed narrowly in shared engine code,
covered by a mechanism regression, and converted to an ordinary green public test.

#### Card, catalog, and rules evidence

The committed catalog entry (`packages/shared/src/cards/data/cards.json:85333-85359`)
identifies EX7-014 as Volcanicdramon: Red, Level 6, Mega, Virus, Earth Dragon, play cost
13, DP 13000, with Red Lv.5 cost 5 and Black Lv.5 cost 5 evolution routes. It has no
inherited or Security text.

Printed clauses traced to `apps/api/src/cards/EX7/EX7-014.ts`:

- On Play: delete one opposing Digimon with the lowest DP.
- When Attacking: delete one opposing Digimon with the lowest DP.
- When Digivolving: the opponent cannot play or move Digimon with 6000 DP or less until
  the end of their turn.
- All Turns, once per turn: when this Digimon would leave the battle area other than by
  one of its controller's effects, optionally play one Machine Dragon or Sky Dragon from
  hand without paying its cost.

`node tools/kb/query.mjs card EX7-014` returned the ten direct entries Q3833, Q3834,
Q3835, Q3836, Q4673, Q4674, Q4675, Q4676, Q6509, and Q6718. They cover opponent play and
move restriction (including breeding), effect-owner distinctions, reveal-without-play,
and the DigiXros identity ruling.

Relevant rules evidence is Comprehensive Rules §3-4-7-2 through §3-4-7-8 (breeding),
§4-15-1 (deleted cards are trashed), §7-2 (DigiXros), and §8-1-3-1 through §8-1-3-3
(evolution selection, payment, stacking, and draw).

#### Public behavior and Q&A coverage

`EX7-014.test.ts` has **11/11 ordinary tests passing** in the final focused run.

| Q&A / clause | Public evidence | Result |
| --- | --- | --- |
| C1 On Play | Lowest-DP opposing target is deleted exactly once; higher-DP card remains | Green |
| C2 When Attacking | Public attack deletes the opposing lowest-DP Digimon | Green |
| C3, Q3833, Q4673 | Opponent low-DP play is rejected, high-DP play is allowed, restriction expires at opponent turn end | Green |
| Q3834, Q4675 | Volcanicdramon owner's effect may play a low-DP Digimon into the opponent area | Green |
| Q4674 | Restricted revealed low-DP card is revealed but not played | Green |
| Q4676 | Opponent-effect ownership distinction is preserved | Green |
| Q3835, Q6509 | P-143's end-turn move into breeding is rejected; P-143 remains in battle and breeding is empty | Green |
| Q3836, Q6718 | EX7-014 selected as DigiXros material activates its replacement; ST5-07 is a separate play and is not added to the Xros stack | Green |

The legal Red Lv.5 and Black Lv.5 routes each charge exactly 5, draw once, and preserve
the source beneath EX7-014. The illegal Lv.4 source is rejected without changing hand,
deck, memory, or board. No injected timing was used; `advance` only waits for real turn
loop phases.

#### Root causes and narrow fixes

##### Q3835/Q6509: effect-driven move to breeding

The `MovePermanent` `toBreeding` primitive extracted the permanent after checking only
leave-battle-area restrictions. It did not consult the active seat-level `RestrictPlay`
with `playOrMove`, so P-143's effect could move despite EX7-014. The primitive now checks
`continuous.isPlayBlocked(effectSeat, card, "move", true)` before extraction, retaining the
existing leave restriction check and using the resolving effect seat (owner fallback).

##### Q3836/Q6718: DigiXros replacement identity

The field-material branch of `applyDigiXros` called the synchronous relocation primitive
directly, bypassing leave-play replacement consultation. The engine now provides an
optional async relocation dependency that consults leave replacements before consuming a
field material, with `playerAction: true` so an `otherThanYourEffect` replacement is
eligible for the player's DigiXros declaration. The canonical relocation remains the
existing primitive and the old dependency remains compatible for direct consumers.

Mechanism proof and red-to-green details are recorded in:

- [EX7-014 breeding move restriction mechanism](EX7-014-BREEDING-MOVE-RESTRICTION-MECHANISM.md)
- [EX7-014 DigiXros replacement mechanism](EX7-014-DIGIXROS-REPLACEMENT-MECHANISM.md)

#### Verification evidence

Before the fixes, the public focused lane was **1 file, 9 passing, 2 expected-fail reds**.
Running each red independently produced one expected failure and ten skipped tests:
Q3835/Q6509 failed at `EX7-014.test.ts:476` because P-143 entered breeding; Q3836/Q6718
failed at `:514` because ST5-07 was not played as the replacement.

After the fixes:

```text
EX7-014 + mechanism focused suite: 2 files, 13/13 tests passed
Affected engine/conformance/effect suites: 6 files, 420/420 tests passed
Full src/engine regression: 261 files, 7303/7303 tests passed
Oxlint (scoped owned files): PASS
Oxfmt --check (scoped owned files): PASS
git diff --check (scoped owned files/reports): PASS
```

The required workspace `pnpm typecheck` passes for shared, web, and API with no diagnostics.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | Catalog identity, all four clauses, ten direct Q&A entries, and applicable rules are recorded. |
| Direct IR | 2 / 2 | Triggers, lowest-DP targeting, restriction boundary/duration, replacement scope/cause/frequency, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | All printed clauses and all ten Q&A behaviors are green through public flows. |
| Peer / stack | 2 / 2 | Red/Black evolution cost, draw, stack, illegal source, and DigiXros replacement identity are proven. |
| Delivery gates | 0 / 0 | Per the worker rubric, delivery gates are reported separately; scoped static, diff, and workspace typecheck gates pass. |

**Total: 8 / 10.** No other card, catalog, ledger, RUN, or review file was edited. No
commit, branch, push, reset, or other git write was performed.

### EX7-015 — Otamamon

#### Result

Score: **8/10**

The card is an IR-only registration with complete static-card coverage,
verified Q&A behavior, and a verified alternate evolution route. The former
Q3840 engine seam is fixed and no retained red remains for this card.

#### Source evidence

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX7-015`:

- Otamamon; Blue Digimon; Rookie; Virus; Amphibian/NSp.
- Level 3, play cost 3, DP 3000.
- Printed evolution costs: Blue Lv.2 for 0 and Green Lv.2 for 0.
- Alternate printed route: `[Digivolve] Lv.2 w/[NSp] trait: Cost 0`.
- Printed effect: `[All Turns] Players can't reduce play costs.`
- No inherited effect and no Security effect.

Direct KB query: `node tools/kb/query.mjs card EX7-015` returned Q3837,
Q3838, Q3839, and Q3840. Relevant rules queries returned comprehensive
§2-6 (play cost), §7-2-3-3 (DigiXros reduction and payment), §8-1-2-8
(digivolution cards remain part of the stack), and §16-8 (draw).

#### Implementation mapping

| Contract | IR/test evidence |
| --- | --- |
| All Turns, both players, play-cost reductions blocked permanently | `EX7-015.ts:9-20`; catalog/IR assertion in `EX7-015.test.ts:14-53`; Q3837/Q3839 real-turn test at `:55-94` |
| Players affected, not only Otamamon's controller | `RestrictCostReduction` uses `seat: "any"`; the test plays BT2-112 once for seat 0 and once for seat 1 through `startTurnLoop()` |
| Alternate Lv.2 NSp evolution for cost 0 | `EX7-015.ts:24-31`; `digivolutionRequirementsFor` assertion at `EX7-015.test.ts:32-37`; legal public `digivolve` at `:156-191` |
| Standard evolution draw and stack transition | Legal evolution asserts the exact BT1-009 instance enters hand, deck shrinks to BT1-011, source P-148 is the only `Permanent.stack` card, and the top card is EX7-015 |
| Illegal source refusal | BT1-009 Lv.3 source is rejected with unchanged source, empty stack, unchanged memory, hand, and deck at `EX7-015.test.ts:193-223` |

The module exports `compiled`, declares `coverage: "full"`, has an empty
`residual`, and registers behavior exclusively with
`registerIrCard("EX7-015", compiled)`.

#### Q&A and behavior coverage

- **Q3837 — both players:** Otamamon is seeded in seat 0's Battle Area.
  BT2-112's printed reduction is made ineligible for seat 0 and then seat 1
  on two real Main phases. With 20 memory, each play ends at 7, proving the
  full printed cost 13 was paid rather than 13 - 6.
- **Q3838 — free play is not reduction:** ST13-16 publicly plays ST13-04
  without paying the Digimon's cost while Otamamon is active. The Option's
  cost alone moves memory 10 to 6; ST13-04 is in the Battle Area and the hand
  is empty.
- **Q3839 — reduction effect cannot be activated:** The BT2-112 public play
  path is tested at the full cost for each controller. The exact memory delta
  proves the reduction effect did not take effect.
- **Q3840 — DigiXros:** An actual public BT12-074 DigiXros with BT10-008
  succeeds under Otamamon, pays the printed cost 4 (memory 10 to 6), preserves
  the material under the played card, and leaves no pending decision.

#### Focused proof and gates

Red baseline before the mechanism fix:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-015.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose
```

Result: **1 file passed; 5 tests passed, 1 expected fail** (Q3840; observed
memory 8 instead of 6).

After the fix, the card plus mechanism proof:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-015.test.ts src/engine/cards/ex7DigiXrosRestriction.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose
```

Result: **2 files passed; 8 tests passed**.

Relevant interaction/conformance checks:

```text
pnpm --filter @aegis/api exec vitest run src/engine/cards/ex7DigiXrosRestriction.test.ts src/engine/conformance/ch07-playing-a-card.test.ts src/engine/interactionAudit.test.ts --maxWorkers=1 --no-file-parallelism --reporter=dot
```

Result: **3 files passed; 56 tests passed**.

Full engine regression:

```text
pnpm --filter @aegis/api exec vitest run src/engine --maxWorkers=1 --no-file-parallelism --reporter=dot
```

Result: **260 files passed; 7,301 tests passed**.

Static gates:

```text
pnpm typecheck
pnpm exec oxlint apps/api/src/engine/actions/digiXros.ts apps/api/src/engine/GameEngine.ts apps/api/src/engine/cards/ex7DigiXrosRestriction.test.ts apps/api/src/cards/EX7/EX7-015.test.ts
pnpm exec oxfmt --check apps/api/src/engine/actions/digiXros.ts apps/api/src/engine/GameEngine.ts apps/api/src/engine/cards/ex7DigiXrosRestriction.test.ts apps/api/src/cards/EX7/EX7-015.test.ts
git diff --check -- apps/api/src/engine/actions/digiXros.ts apps/api/src/engine/GameEngine.ts apps/api/src/engine/cards/ex7DigiXrosRestriction.test.ts apps/api/src/cards/EX7/EX7-015.test.ts docs/audits/EX7-reaudit/EX7-015.md docs/audits/EX7-reaudit/EX7-015-DIGIXROS-RESTRICTION-MECHANISM.md
```

All four final gates passed. No git write was performed. No ledger, RUN,
REVIEW-NOTES, catalog, shared, or other-card file was edited.

#### Rubric

| Area | Score | Basis |
| --- | ---: | --- |
| Catalog/rules evidence | 2/2 | Exact catalog fields, direct KB Q&A query, and relevant comprehensive-rule queries recorded |
| IR fidelity | 2/2 | Static all-player permanent restriction and alternate evolution are represented without residuals or duplicate registration |
| Behavioral/Q&A proof | 2/2 | Q3837, Q3838, Q3839, and Q3840 all pass through public intents with exact cost/state assertions |
| Evolution/stack proof | 2/2 | Legal NSp Lv.2 route, cost 0, standard draw, exact source stack identity, and illegal source all pass |
| Focused/static gates | 0/0 | Required gate column is scored zero by the brief; all required commands passed |

#### Gaps and seams

There is no retained EX7-015 behavior red. The generic DigiXros dependency
seam is documented in `EX7-015-DIGIXROS-RESTRICTION-MECHANISM.md` and covered
by both restricted and unrestricted regression cases.

### EX7-016 — Bulucomon

#### Result

Score: **8/10** provisional (the delivery-gates column remains coordinator-owned
and is scored 0/2 by the worker brief).

No card-specific engine seam was found. The direct module already carries a
complete IR implementation; the colocated test was strengthened to exercise
all printed behavior through public intents and real turn timing.

#### Source evidence

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX7-016`:

- Bulucomon; Blue Digimon; Rookie; Data; Mini Dragon/Ice-Snow.
- Level 3, play cost 3, DP 1000.
- Standard evolution: Blue Lv.2 for 0.
- `[On Play]` Reveal the top 3 cards. Add 1 card with `[Paledramon]` or
  `[Hexeblaumon]` in its name and 1 card with the `[Ice-Snow]` trait. Return
  the rest to the bottom of the deck.
- `[Rule] Trait: Has [Ice-Snow].`
- Inherited `[When Attacking] [Once Per Turn]` effect: trash the top
  digivolution card of 1 opponent Digimon.
- No Security effect.

Direct query:

```text
node tools/kb/query.mjs card EX7-016
```

returned Q3841. Its ruling requires adding as many eligible revealed cards as
possible. Relevant rules queries returned comprehensive §15-10-2 (card target
counts), §15-15-3 (revealed cards), §15-3 (inherited effects), and §16-8
(draw); the evolution/stack contract is also covered by the standard
digivolution procedure and stacked-card rules.

#### Implementation mapping

| Contract | IR/test evidence |
| --- | --- |
| Reveal exactly 3, add one name match and one Ice-Snow match, bottom the rest | `EX7-016.ts:9-47`; exact IR assertion in `EX7-016.test.ts:35-94`; public On Play proof at `:96-136` |
| Rule trait grant is self-scoped | `EX7-016.ts:48-64`; `GrantStatic` assertion at `EX7-016.test.ts:64-73`; `observe(...).hasEffectiveTrait(..., "Ice-Snow")` after public play at `:131` |
| Inherited top-source trash, opponent-only, once per turn | `EX7-016.ts:65-84`; exact target/filter/frequency assertion at `EX7-016.test.ts:75-90`; real attack/turn-loop proof at `:206-268` |
| Standard Blue Lv.2 evolution | Catalog assertion at `EX7-016.test.ts:17-33`; public evolution from Blue P-148 at `:138-171` |

The module declares `coverage: "full"`, `residual: []`, and registers
exclusively through `registerIrCard("EX7-016", compiled)` at line 90. There is
no alternate evolution override; `digivolutionRequirementsFor("EX7-016")` is
therefore correctly undefined while the standard catalog `evoCosts` are
enforced by the public evolution intent.

#### Q&A and behavioral proof

- **Q3841:** A real `playCard` intent plays EX7-016 from hand during seat 0's
  Main phase. The top three are BT5-025 (Paledramon name), EX7-017 (Ice-Snow),
  and BT1-009 (near miss). The exact Paledramon and Ice-Snow instances enter
  hand; the non-match is bottomed after the pre-existing BT1-011. Memory moves
  from 10 to 7 for Bulucomon's paid play cost, and no decision remains.
- **Rule trait:** The same public play leaves Bulucomon with observable
  effective Ice-Snow, proving the Rule `GrantStatic` is installed on itself.
- **Inherited effect:** A Cerberusmon host carrying EX7-016 attacks through a
  real public attack intent. The exact opposing top source moves to the
  opponent's trash, while the bottom source remains. Cerberusmon's public
  attack effect unsuspends it so a second same-turn attack can occur; the
  second attack leaves the source stack unchanged, proving the Once Per Turn
  budget. After the real loop advances through the opponent's turn and back to
  seat 0, the next attack trashes the remaining source, proving reset timing.

#### Evolution proof

The legal case uses P-148 Wanyamon, a Blue Lv.2 Digi-Egg in the breeding area
(never in deck or security), and publicly digivolves into EX7-016 for cost 0.
It asserts the exact EX7-016 top instance, the exact P-148 source in
`Permanent.stack`, memory unchanged at 0, the exact BT1-009 standard evolution
draw in hand, and the exact remaining BT1-011 deck instance.

The negative case uses a Red Lv.3 BT1-009 source. The public digivolve intent
returns false and leaves the source, empty stack, hand, deck, and memory 5
unchanged. This proves the Blue Lv.2 boundary and that an illegal source cannot
cause payment or the standard draw.

#### Focused proof and gates

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-016.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **1 file passed; 5 tests passed**.

Static commands:

```text
pnpm typecheck
pnpm exec oxlint apps/api/src/cards/EX7/EX7-016.ts apps/api/src/cards/EX7/EX7-016.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-016.ts apps/api/src/cards/EX7/EX7-016.test.ts
git diff --check -- apps/api/src/cards/EX7/EX7-016.ts apps/api/src/cards/EX7/EX7-016.test.ts docs/audits/EX7-reaudit/EX7-016.md
```

All four checks passed. No `advance.fire`, temporary diagnostics, engine/shared
files, catalog, ledger, RUN, or other-card files were edited. No git write was
performed.

#### Rubric

| Area | Score | Basis |
| --- | ---: | --- |
| Catalog/rules evidence | 2/2 | Exact catalog fields, direct Q3841 query, and relevant rules queries recorded |
| IR trace | 2/2 | On Play RevealAdd, self Rule trait grant, inherited target/frequency, full coverage, and exclusive registration all match |
| Behavioral/Q&A proof | 2/2 | Q3841 and every printed clause pass through public intents and observable state |
| Peer/stack proof | 2/2 | Legal cost-0 evolution, exact draw and source stack, illegal source, and real-turn inherited reset all pass |
| Delivery gates | 0/2 | Coordinator-owned per the brief; focused/static gates themselves are green |

### EX7-017 — SnowAgumon

Worker lane, 2026-09-09. Scope is exactly EX7-017. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json` at the EX7-017
record) identifies EX7-017 as SnowAgumon: Blue Digimon, Level 3, Rookie, Vaccine, Dinosaur
and Ice-Snow, play cost 3, DP 2000, with one Blue Lv.2 evolution route costing 0.

Printed clauses:

- **C1 (Ice Clad):** This Digimon compares its number of digivolution cards instead of DP
  in battles other than with Security Digimon.
- **C2 (Rule):** This card has the Ice-Snow type.
- **C3 (Inherited, When Attacking, Once Per Turn):** Trash the top digivolution card of 1
  of your opponent's Digimon.

There is no printed On Play, When Digivolving, Security, or separate inherited keyword clause.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-017 --json` returned:

- `qa: []` — no direct Q&A IDs;
- `banlist: null`;
- `errata: null`.

Therefore Q&A coverage is explicitly **N/A — the KB returned no direct EX7-017 questions**;
no ruling is inferred or silently omitted.

Applicable local rules evidence:

- Comprehensive Rules §16-35-1 through §16-35-4-3
  (`data/kb/rules/comprehensive.md:3227-3243`): Ice Clad compares digivolution-card
  counts instead of DP except against Security Digimon; higher count wins, lower count
  loses, and equal counts delete both.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): an evolution selects a legal requirement,
  pays its cost, places the card on top, and draws 1.
- Comprehensive Rules §4-14-1 through §4-15-1
  (`data/kb/rules/comprehensive.md:808-817`): drawing moves cards from deck to hand and
  deletion trashes the deleted card.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution route | `EX7-017.test.ts:14-31` asserts all relevant catalog fields, including Blue Lv.2 cost 0 and both printed text fields | The committed catalog is pinned directly; no unprinted Security or non-inherited behavior is introduced |
| C1 Ice Clad | `EX7-017.ts:9-19` publishes the `IceClad` static keyword | `EX7-017.test.ts:69-85` uses a public Digimon-vs-Digimon attack where SnowAgumon has 2 sources and DP 2000 against a 10000-DP source-less defender; SnowAgumon wins by source count |
| C1 Security exception | Shared combat security path remains DP-based; module adds no Security override | `EX7-017.test.ts:88-105` attacks through two inert 4000-DP Security Digimon with a 2000-DP SnowAgumon carrying two sources; SnowAgumon loses the Security battle and is deleted |
| C2 Rule Ice-Snow trait | `EX7-017.ts:20-35` uses self-scoped `GrantStatic` trait `Ice-Snow` | `EX7-017.test.ts:61-67` observes both the live Ice Clad keyword and effective Ice-Snow trait |
| C3 inherited top-source trash | `EX7-017.ts:37-56` uses inherited `WhenAttacking`, opponent Digimon with `hasAny` sources, count 1, `fromTop: true`, frequency `OncePerTurn` | `EX7-017.test.ts:168-225` performs public attacks; the exact top source is trashed, the same-turn second attack leaves the remaining source intact, and a next-turn attack trashes it |
| Exclusive executable registration | `EX7-017.ts:58-62` reports `coverage: "full"`, `residual: []`, and calls only `registerIrCard("EX7-017", compiled)` | No duplicate `registerCard` registration exists |

#### Evolution, stack, and timing

`EX7-017.test.ts:107-141` uses a real turn loop: it hatches Blue Digi-Egg BT1-003 from
`eggDeck`, publicly digivolves SnowAgumon from the resulting Blue Lv.2 source, asserts the
zero-memory cost, draws the exact top deck instance, and preserves the egg instance beneath
SnowAgumon. The Digi-Egg is confined to `eggDeck`; no Digi-Egg is placed in a normal deck or
Security fixture.

`EX7-017.test.ts:143-166` rejects a Red Lv.2 Digi-Egg source (`BT1-001`) as
`invalid-evolution`, with memory, deck, hand, top card, and stack unchanged. This proves the
Blue color requirement rather than merely accepting any Level 2.

The inherited behavior is proven on a realistic stack: a host carries EX7-017 beneath its
top card and the opponent target carries two inert evolution cards. The exact top target
source is removed, `Permanent.stack` is inspected only for cards beneath the top, and the
once-per-turn tracker is tested across the same Main phase and a real next turn.

The second same-turn public attack uses `advance(s.engine).verb.unsuspend` only as a named
structural test seam because the fixture has no card effect that can unsuspend the host. No
effect timing is injected: there is no `advance.fire` or `fireTiming` call.

#### Peer and seam trace

The module follows the neighboring EX7-018/EX7-019/EX7-021 Ice-Snow implementations for
live Rule trait projection and inherited top-source trash. The shared combat resolver carries
the Ice Clad rule boundary: it switches only permanent-vs-permanent combat to source-count
comparison and leaves Security battle resolution on DP.

No card-specific engine gap or retained red was observed. The only named test seam is the
structural unsuspend verb described above; the actual trigger, attack, source trash, same-turn
refusal, and next-turn reset all use public intents and real timing.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-017 --json
  PASS: qa [], banlist null, errata null

pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-017.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 7 passed

pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS: no diagnostics

pnpm exec oxlint apps/api/src/cards/EX7/EX7-017.ts apps/api/src/cards/EX7/EX7-017.test.ts
  PASS

pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-017.ts apps/api/src/cards/EX7/EX7-017.test.ts
  PASS

rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-017.test.ts
  PASS: no forbidden timing injection or Digi-Egg Security fixture

git diff --check -- apps/api/src/cards/EX7/EX7-017.ts apps/api/src/cards/EX7/EX7-017.test.ts docs/audits/EX7-reaudit/EX7-017.md
  PASS
```

Only the permitted EX7-017 test/report lane was changed; the module already matched the
catalog and remained unchanged. No commit, branch, push, reset, ledger, RUN, or other git
write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields, printed clauses, applicable Ice Clad/evolution rules, and the empty KB result are recorded. |
| Direct IR | 2 / 2 | Ice Clad, Rule trait grant, inherited target/top/count/frequency, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public live keyword/trait, count-over-DP battle, Security DP exception, inherited trash, same-turn refusal, and next-turn reset pass. |
| Peer / stack | 2 / 2 | Legal hatch evolution, exact cost/draw/source stack, illegal color negative, and realistic inherited stack behavior pass against inert fixtures and peer patterns. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-018 — Gekomon

#### Result

Score: **8/10 provisional**.

The compiled IR matches the catalog and the public tests prove On Play,
When Digivolving, the standard evolution draw, alternate evolution cost,
source stacking, illegal-source rejection, and inherited Jamming after a second
public evolution places EX7-018 in the resulting Digimon's stack.

#### Source evidence

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX7-018`:

- Gekomon; Blue Digimon; Champion; Virus; Amphibian/NSp.
- Level 4, play cost 4, DP 4000.
- Standard evolution: Blue Lv.3 for 2.
- Alternate evolution: Lv.3 with the [NSp] trait for cost 2.
- `[On Play] [When Digivolving] ＜Draw 1＞.`
- Inherited `＜Jamming＞.`
- No Security effect.

Direct query:

```text
node tools/kb/query.mjs card EX7-018
```

returned no Q&A entries. Relevant direct rules queries returned comprehensive
§8-1-2-8 (digivolution source remains stacked), §15-3 (inherited effects),
§15-16-3 (When Digivolving), §16-8 (Draw), and §16-9 (Jamming). The standard
digivolution procedure also requires its separate evolution bonus draw.

#### Implementation mapping

| Contract | IR/test evidence |
| --- | --- |
| On Play Draw 1 | `EX7-018.ts:9-19`; exact IR assertion in `EX7-018.test.ts:31-33`; public `playCard` proof at `:45-77` |
| When Digivolving Draw 1 | `EX7-018.ts:20-29`; exact IR assertion at `EX7-018.test.ts:33`; legal public digivolution proof at `:79-120` |
| Inherited Jamming | Inherited Static keyword at `EX7-018.ts:30-40`; a hand-laid host and a two-step public evolution both prove it appears only while EX7-018 is a digivolution card |
| Alternate Lv.3 [NSp] evolution for cost 2 | `EX7-018.ts:44-50`; catalog/requirement assertion at `EX7-018.test.ts:15-30`; public legal route at `:79-120` |

The module declares `coverage: "full"`, `residual: []`, and registers
exclusively through `registerIrCard("EX7-018", compiled)` at line 54. No
second `registerCard` registration exists.

#### Q&A and behavioral proof

No KB Q&A IDs were returned for EX7-018, so there is no card-specific Q&A
claim to reproduce.

- The public On Play test starts the real turn loop, reaches seat 0 Main
  phase, plays the exact EX7-018 instance, and proves the exact BT1-009 draw,
  remaining deck instance, memory 10 -> 6, and no pending decision.
- The public legal alternate evolution starts from an EX7-015 NSp Lv.3,
  pays exactly 2 memory (4 -> 2), and proves both the standard evolution draw
  and the printed When Digivolving draw by exact instance IDs. The deck
  changes from three cards to the exact remaining one card, and the new
  EX7-018 is the exact top card.
- The inherited clause is proven on a real host with EX7-018 in
  `Permanent.stack`; `observe(...).hasKeyword(..., "Jamming")` is true.
- A two-step public evolution first makes EX7-018 the top card, where its
  inherited Jamming correctly does not apply, then evolves into EX7-022 and
  proves Jamming becomes observable with EX7-018 in the exact source stack.

#### Evolution proof

The legal case uses EX7-015 as an NSp Lv.3 source and EX7-018 as the exact
hand instance. It invokes the public `digivolve` intent with the alternate
cost, asserts success, exact cost 2, exact EX7-018 top identity, and exact
source identity in `Permanent.stack`. The deck contains no Digi-Egg and the
two exact drawn main-deck instances prove both standard evolution draw and
the printed draw clause.

The negative case uses Red Lv.3 BT1-009 as the source. The public alternate
`digivolve` intent returns false and leaves the source top card, empty source
stack, hand, deck, and memory unchanged. This proves the [NSp] source boundary
without paying, stacking, or drawing.

#### Resolved seam

The former inherited-static red expected Jamming while EX7-018 itself was the
top card. That interpretation was incorrect: inherited effects apply from the
digivolution cards. The corrected public scenario evolves once more into
EX7-022, preserves EX7-015 and EX7-018 in order, and observes Jamming without
an engine change.

#### Focused proof and gates

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-018.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **1 file passed; 6 tests passed**.

Static commands:

```text
pnpm typecheck
pnpm exec oxlint apps/api/src/cards/EX7/EX7-018.ts apps/api/src/cards/EX7/EX7-018.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-018.ts apps/api/src/cards/EX7/EX7-018.test.ts
git diff --check -- apps/api/src/cards/EX7/EX7-018.ts apps/api/src/cards/EX7/EX7-018.test.ts docs/audits/EX7-reaudit/EX7-018.md
```

All four checks passed. No `advance.fire`, temporary diagnostics, engine/shared
files, catalog, ledger, RUN, or other-card files were edited. No git write was
performed.

#### Rubric

| Area | Score | Basis |
| --- | ---: | --- |
| Catalog/rules evidence | 2/2 | Exact catalog fields, direct no-Q&A query, and relevant rules sections recorded |
| IR trace | 2/2 | Both printed Draw triggers, inherited Jamming, alternate requirement, full coverage, and exclusive registration match |
| Behavioral/Q&A proof | 2/2 | Every printed clause is exercised through public timing/intents or observable inherited-stack behavior; no Q&A entries applied |
| Peer/stack proof | 2/2 | Legal two-step evolution, exact cost/draw/stack identity, inherited-keyword transition, seeded peer stack and illegal source all pass |
| Delivery gates | 0/2 | Coordinator-owned per the worker brief; focused/static commands themselves are green |

### EX7-019 — Sorcermon

Worker lane, 2026-09-09. Scope is exactly EX7-019. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json` at the EX7-019
record) identifies EX7-019 as Sorcermon: Blue Digimon, Level 4, Champion, Vaccine, Wizard,
Witchelny, and Ice-Snow, play cost 5, DP 5000, with a Blue Lv.3 evolution route costing 2.

Printed clauses:

- **C1 (Blocker):** Sorcermon has Blocker.
- **C2 (On Play):** If the opponent has no Digimon with digivolution cards, unsuspend 1 of
  your Digimon.
- **C3 (Rule):** This card has the Ice-Snow type.
- **C4 (Inherited, When Attacking, Once Per Turn):** Trash the top digivolution card of 1
  of the opponent's Digimon.

There is no printed Security effect.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-019 --json` returned `qa: []`, `banlist: null`, and
`errata: null`. Q&A coverage is therefore explicitly **N/A — no direct EX7-019 Q&A IDs are
indexed**; no ruling is inferred.

Applicable local rules evidence:

- Comprehensive Rules §4-3-1 and §4-3-3 (`data/kb/rules/comprehensive.md:655-663`): cards
  placed on the field gain inherited effects from cards beneath them.
- Comprehensive Rules §4-3-7 (`data/kb/rules/comprehensive.md:668-670`) and §16-4
  (`data/kb/rules/comprehensive.md:1761-1764`): a Digimon with Blocker in the battle area
  can block an opponent's attack.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects its requirement,
  pays its cost, places the new card on top, and draws 1.
- Comprehensive Rules §4-14-1 through §4-15-1 (`data/kb/rules/comprehensive.md:808-817`):
  drawing moves cards from deck to hand and deletion sends cards to trash; the same
  stack-zone principle applies to the inherited source-trash primitive.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution route | `EX7-019.test.ts:14-31` pins the catalog fields, Blue Lv.3 cost-2 route, and both printed text fields | The committed catalog is asserted directly; no Security or extra inherited behavior is introduced |
| C1 Blocker | `EX7-019.ts:17-27` publishes the static Blocker keyword | `EX7-019.test.ts:110-138` runs a real opponent attack, accepts a public `declareBlock`, deletes the weaker attacker, and preserves Sorcermon and Security |
| C2 conditional On Play unsuspend | `EX7-019.ts:28-50` targets one of the owner's Digimon only when the opponent has none with `digivolutionCards: "hasAny"` | `EX7-019.test.ts:66-88` publicly plays Sorcermon into a source-less opponent state and unsuspends the preferred ally; `:90-108` publicly plays against an opponent stacked Digimon and leaves the ally suspended |
| C3 Rule Ice-Snow trait | `EX7-019.ts:51-65` self-scoped `GrantStatic` trait `Ice-Snow` | `EX7-019.test.ts:86-87` observes the live effective trait after public play |
| C4 inherited top-source trash | `EX7-019.ts:67-85` uses inherited `WhenAttacking`, opponent Digimon with sources, count 1, `fromTop`, and `OncePerTurn` | `EX7-019.test.ts:193-253` publicly attacks, trashes exactly the top source, refuses same-turn reuse, and resets on the next real turn |
| Exclusive executable registration | `EX7-019.ts:87-91` reports full coverage, zero residual, and only `registerIrCard("EX7-019", compiled)` | No duplicate legacy `registerCard` registration exists |

#### Evolution, stack, and timing

`EX7-019.test.ts:140-166` evolves publicly from inert Blue Lv.3 BT1-028 through a real Main
phase, charges exactly 2 memory, draws the exact top deck instance, and preserves the source
instance beneath Sorcermon. `:168-191` rejects the wrong-color Red Lv.3 BT1-009 source as
`invalid-evolution` with memory, hand, deck, top card, and stack unchanged.

The inherited proof uses a realistic stack: EX7-019 is beneath a host top card and the
opponent has both a stacked Digimon and a bare nonmatching Digimon. Only the stacked target's
top source is trashed. The same-turn refusal and next-turn reset are driven through the real
turn loop. The second same-turn attack uses `advance(...).verb.unsuspend` only as a named
structural board seam because the fixture intentionally has no unsuspend card effect; attack,
trigger resolution, source trash, and turn transitions remain public/production paths.

No Digi-Egg appears in a normal deck or Security fixture. The fixtures use inert main-deck
Digimon where possible, and no `advance.fire` or `fireTiming` injection is used.

#### Peer and seam trace

The implementation is consistent with adjacent EX7 Ice-Snow peers: static keyword projection,
Rule trait projection, and inherited top-source trash use the same shared IR vocabulary. The
Blocker proof follows the public block-window path used by neighboring EX7 Blocker cards.

The module’s hand-fixed comments document two generator defects corrected in this owned module:
the On Play “no opponent stack” predicate was inverted and under-specified, and the inherited
source removal was previously compiled as a field trash instead of `TrashDigivolution`. Both
corrections are now covered by public positive/negative tests. No engine seam or retained red
was observed.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-019 --json
  PASS: qa [], banlist null, errata null

pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-019.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 7 passed

pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS: no diagnostics

pnpm exec oxlint apps/api/src/cards/EX7/EX7-019.ts apps/api/src/cards/EX7/EX7-019.test.ts
  PASS

pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-019.ts apps/api/src/cards/EX7/EX7-019.test.ts
  PASS

rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-019.test.ts
  PASS: no forbidden timing injection or Digi-Egg Security fixture

git diff --check -- apps/api/src/cards/EX7/EX7-019.ts apps/api/src/cards/EX7/EX7-019.test.ts docs/audits/EX7-reaudit/EX7-019.md
  PASS
```

Only the permitted EX7-019 test/report lane was changed; the existing hand-fixed module
already matched the catalog and was not modified. No commit, branch, push, reset, ledger, RUN,
or other git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields, four printed clauses, applicable rules, and the empty direct KB result are recorded. |
| Direct IR | 2 / 2 | Blocker, exact conditional unsuspend predicate/target, Rule trait grant, inherited top-source/frequency, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public play positive/negative, Blocker interception, legal/illegal evolution, inherited targeting, same-turn refusal, and next-turn reset pass. |
| Peer / stack | 2 / 2 | Evolution cost/draw/source stack and inert mixed target stack proof pass against adjacent Ice-Snow/Blocker patterns. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-020 — Paledramon

#### Result

Score: **8/10 provisional**.

The direct compiled IR already matches the catalog. The focused proof now
exercises every printed clause through public intents and real timing,
including the standard evolution draw, exact cost and stack identity, the
bottom-two boundary, conditional Jamming/Blocker and expiry, the Ice-Snow
Rule trait, and the inherited once-per-turn reset. No card-specific engine
seam remains for EX7-020.

#### Source evidence

Catalog source: `packages/shared/src/cards/data/cards.json`, `EX7-020`:

- Paledramon; Blue Digimon; Champion; Data; Dragon/Ice-Snow.
- Level 4, play cost 5, DP 5000.
- Standard evolution: Blue Lv.3 for 2.
- `[When Digivolving] Trash the bottom 2 digivolution card of 1 of your opponent's Digimon. Then, if your opponent has no Digimon with digivolution cards, this Digimon gains ＜Jamming＞and ＜Blocker＞until the end of your opponent's turn.`
- `[Rule] Trait: Has the [Ice-Snow] type.`
- Inherited `[When Attacking] [Once Per Turn] Trash the top digivolution card of 1 of your opponent's Digimon.`
- No Security effect.

Direct query:

```text
node tools/kb/query.mjs card EX7-020
```

returned no card-specific Q&A entries. Relevant direct rules queries covered
§2-3-2-2/§2-3-2-3 traits, §15-3 inherited effects, §16-8 Draw,
§16-9 Jamming, §15-16-3 When Digivolving, and the digivolution source/stack
procedure.

#### Implementation mapping

| Contract | IR/test evidence |
| --- | --- |
| Trash the bottom 2 cards from one opposing stacked Digimon | `EX7-020.ts:9-25`; exact IR assertion at `EX7-020.test.ts:40-52`; public bottom-boundary proof at `:179-233` leaves the exact top source and trashes exact bottom/middle instances |
| Conditional Jamming and Blocker until opponent turn end | `EX7-020.ts:26-73`; exact condition/duration assertions at `EX7-020.test.ts:53-73`; public true/false and expiry proof at `:107-177`; public Blocker declaration at `:158-170` |
| Rule trait grants self Ice-Snow | `EX7-020.ts:76-92`; exact IR assertion at `EX7-020.test.ts:77-86`; public `hasEffectiveTrait` proof at `:148` |
| Inherited top-source trash once per turn | `EX7-020.ts:93-112`; exact inherited/frequency assertion at `EX7-020.test.ts:88-103`; public attack proof at `:267-344` |
| Blue Lv.3 evolution for cost 2 | Catalog/evolution assertion at `EX7-020.test.ts:21-38`; public legal evolution at `:107-151`; no alternate requirement is present |

The module declares `coverage: "full"`, `residual: []`, and registers
exclusively through `registerIrCard("EX7-020", compiled)` at line 118. No
second `registerCard` registration exists.

#### Q&A and behavioral proof

No Q&A IDs were returned by the direct KB query, so no card-specific ruling
claim applies.

- The legal public evolution starts from a Blue Lv.3 BT1-028, pays exactly 2
  memory (5 -> 3), places the exact EX7-020 instance on top, preserves the
  exact source in `Permanent.stack`, and draws the exact main-deck card
  required by the standard evolution procedure. The deck and hand identities
  are asserted, with no Digi-Egg in deck or security.
- With an opponent that has no stacked Digimon, the When Digivolving effect
  grants both Jamming and Blocker to itself. The test reaches the opponent's
  real Main phase, verifies both keywords remain, uses a public attack and
  `declareBlock` intent, then verifies both expire after the opponent's
  real turn ends.
- With an opposing stack of three cards, the effect trashes exactly the
  bottom and middle instances, leaves the original top instance in
  `Permanent.stack`, and correctly withholds both temporary keywords because
  one opposing Digimon still has an evolution card.
- The Rule trait is visible on the evolved Paledramon through the public
  observation API.
- The inherited effect is exercised through a real public attack on a
  BT1-039 Cerberusmon host. Cerberusmon's own public unsuspend effect reopens
  a second attack in the same Main phase; EX7-020 trashes the target's top
  source only once that turn. After public phase handoffs through the
  opponent's turn and back to seat 0, the next attack trashes the remaining
  source, proving reset timing.

#### Evolution proof

The legal route uses Blue Lv.3 BT1-028 as the source and EX7-020 from hand.
The test asserts public `digivolve` success, cost 2, exact top-card identity,
exact source stack identity, memory 5 -> 3, exact standard evolution draw,
and the exact remaining deck instance.

The illegal route uses Red Lv.3 BT1-009. Public `digivolve` returns
`{ ok: false, reason: "invalid-evolution" }`; memory, hand, deck, source
top, and source stack remain unchanged. This proves the color/level boundary
without payment, stacking, or drawing.

All fixtures use inert main-deck cards only; no Digi-Egg is placed in deck or
security.

#### Focused proof and gates

Focused command:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-020.test.ts --maxWorkers=1 --no-file-parallelism
```

Result: **1 file passed; 5 tests passed**.

Static commands:

```text
pnpm typecheck
pnpm exec oxlint apps/api/src/cards/EX7/EX7-020.ts apps/api/src/cards/EX7/EX7-020.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-020.ts apps/api/src/cards/EX7/EX7-020.test.ts
git diff --check -- apps/api/src/cards/EX7/EX7-020.ts apps/api/src/cards/EX7/EX7-020.test.ts docs/audits/EX7-reaudit/EX7-020.md
```

All four checks passed. No `advance.fire`, temporary diagnostics, engine/shared
files, catalog, ledger, RUN, or other-card files were edited. No git write was
performed.

#### Rubric

| Area | Score | Basis |
| --- | ---: | --- |
| Catalog/rules evidence | 2/2 | Exact catalog fields, direct no-Q&A query, and relevant rules sections recorded |
| IR trace | 2/2 | Bottom-trash target, conditional keyword grants/duration, Rule trait, inherited frequency, full coverage, and exclusive registration match |
| Behavioral/Q&A proof | 2/2 | Every printed clause passes through public intents, observable state, and real timing; no Q&A entries apply |
| Peer/stack proof | 2/2 | Legal cost/draw/stack identity, illegal source, exact bottom/top boundaries, inherited same-turn refusal, and next-turn reset all pass |
| Delivery gates | 0/2 | Coordinator-owned per the worker brief; focused/static commands themselves are green |

### EX7-021 — CrysPaledramon

Worker lane, 2026-09-09. Scope is exactly EX7-021. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json` at the EX7-021
record) identifies EX7-021 as CrysPaledramon: Blue Digimon, Level 5, Ultimate, Data,
Dragonkin and Ice-Snow, play cost 7, DP 7000, with a Blue Lv.4 evolution route costing 3.

Printed clauses:

- **C1 (Ice Clad):** This Digimon compares its number of digivolution cards instead of DP
  in battles other than with Security Digimon.
- **C2 (When Digivolving):** Trash any 2 digivolution cards of the opponent's Digimon.
- **C3 (When Digivolving continuation):** If the opponent has no Digimon with digivolution
  cards, unsuspend this Digimon.
- **C4 (Rule):** This card has the Ice-Snow type.
- **C5 (Inherited, Your Turn):** While the opponent has no Digimon with digivolution cards,
  this Digimon with the Ice-Snow trait gains Piercing and Security Attack +1.

There is no printed Security effect.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-021 --json` returned two direct Q&As, with
`banlist: null` and `errata: null`:

- **Q3842:** When an opponent's source-bearing Digimon is deleted in battle and the
  opponent consequently has no source-bearing Digimon, the inherited condition becomes
  true at that timing and Piercing triggers simultaneously. Covered by the live post-battle
  security-check count at `EX7-021.test.ts:287-317`.
- **Q6041:** “Your opponent has no Digimon with XX” is also true when the opponent has no
  Digimon. Covered by the empty-opponent public digivolution case at
  `EX7-021.test.ts:132-152`.

Applicable local rules evidence:

- Comprehensive Rules §16-35-1 through §16-35-4-3
  (`data/kb/rules/comprehensive.md:3227-3243`): Ice Clad uses digivolution-card counts
  for non-Security battles, while Security battles remain DP-based.
- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects a requirement,
  pays its cost, places the card on top, and draws 1.
- Comprehensive Rules §4-3-1 and §4-3-3
  (`data/kb/rules/comprehensive.md:655-663`): inherited effects are supplied by cards
  beneath the top card of a Digimon stack.
- Comprehensive Rules §4-14-1 through §4-15-1
  (`data/kb/rules/comprehensive.md:808-817`): drawing moves the top deck card to hand
  and trashed/deleted cards leave the stack for the trash zone.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution route | `EX7-021.test.ts:15-32` pins catalog identity, all fields, Blue Lv.4 cost 3 route, and exact printed text | The committed catalog and absence of Security text are asserted directly |
| C1 Ice Clad | `EX7-021.ts:15-23` publishes `IceClad` | `EX7-021.test.ts:161-197` publicly proves source-count combat against a 10000-DP Digimon despite a 1000-DP attacker, then proves the Security exception by deleting that same low-DP attacker against a 3000-DP Security Digimon |
| C2/C3 When Digivolving | `EX7-021.ts:25-61` pools exactly two opponent source cards with `acrossDigimon`, leaves `fromTop: false`, and self-unsuspends only under `opponentHasNone` | `EX7-021.test.ts:73-104` trashes one source from each of two opposing stacks and unsuspends; `:106-130` leaves one source and keeps CrysPaledramon suspended; `:132-152` proves the empty-opponent Q6041 case |
| C4 Rule Ice-Snow | `EX7-021.ts:63-78` grants the self-scoped `Ice-Snow` trait | `EX7-021.test.ts:154-159` observes the live effective trait |
| C5 inherited conditional keywords | `EX7-021.ts:80-147` uses an inherited Your Turn pair of self-scoped Auras, requiring Ice-Snow and no opposing source-bearing Digimon, granting Piercing and Security Attack +1 | `EX7-021.test.ts:253-285` observes both keywords and proves two Security checks when active, while a stacked opponent removes both grants |
| Exclusive executable registration | `EX7-021.ts:148-153` reports `coverage: "full"`, `residual: []`, and calls only `registerIrCard("EX7-021", compiled)` | No duplicate legacy `registerCard` registration exists in the owned module |

#### Evolution, stack, and timing

`EX7-021.test.ts:199-226` uses a real turn loop and public `digivolve` intent from Blue
Lv.4 BT1-037. It asserts the exact cost of 3 memory, the exact top deck instance drawn,
the reduced deck length, and preservation of the source instance beneath EX7-021.

`EX7-021.test.ts:228-251` rejects the wrong-color/wrong-level Red Lv.3 BT1-009 source as
`invalid-evolution`, with memory, deck, hand, top card, and source stack unchanged.

The When Digivolving proof uses two real opposing stacks and verifies both source cards are
trashed from `Permanent.stack` while the new card remains on top. The inherited proof uses
EX7-021 beneath a host top card and contrasts a bare opponent with a source-bearing opponent.
The Q3842 case uses the real attack/battle/deletion/security timing path; its event count
shows the ordinary security check plus the simultaneous Piercing check after source deletion.

All tests use public intents and real turn-loop phase progression. No `advance.fire` or
`fireTiming` injection is used. No Digi-Egg is placed in a normal deck or Security fixture.

#### Peer and seam trace

The module follows adjacent EX7 Ice-Snow implementations for static keyword projection,
Rule trait projection, inherited conditional Auras, and `registerIrCard`-only executable
registration. The shared combat resolver supplies the Ice Clad boundary tested here: source
count for Digimon-vs-Digimon combat and DP for Security combat.

No card-specific engine gap or retained red was observed. No test uses a dynamic
`it.fails`, conditional early return, injected timing, or direct internal effect firing.
The only harness helper is `stopLoop`, which surrenders after each real public scenario to
close the turn-loop promise.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-021 --json
  PASS: Q3842 and Q6041; banlist null; errata null

pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-021.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 10 passed

pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS: no diagnostics

pnpm exec oxlint apps/api/src/cards/EX7/EX7-021.ts apps/api/src/cards/EX7/EX7-021.test.ts
  PASS

pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-021.ts apps/api/src/cards/EX7/EX7-021.test.ts
  PASS

rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-021.test.ts
  PASS: no forbidden timing injection or Digi-Egg Security fixture

git diff --check -- apps/api/src/cards/EX7/EX7-021.ts apps/api/src/cards/EX7/EX7-021.test.ts docs/audits/EX7-reaudit/EX7-021.md
  PASS
```

Only the permitted EX7-021 test/report lane was changed; the existing module already
matched the catalog and was not modified. No commit, branch, push, reset, ledger, RUN, or
other git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields, five printed clauses, both direct KB Q&As, and applicable Ice Clad/evolution/stack rules are recorded. |
| Direct IR | 2 / 2 | Ice Clad, exact two-card cross-stack trash, conditional self-unsuspend, Rule trait, inherited keyword predicates, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Every printed clause has public behavioral proof, including positive/negative source states, empty-opponent Q6041, Ice Clad's Security exception, and Q3842 timing. |
| Peer / stack | 2 / 2 | Legal cost/draw/source-stack preservation, illegal source rejection, realistic inherited stack behavior, and source-count battle evidence pass. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-022 — ShogunGekomon

#### Result

Score: **8/10 provisional**.

The existing compiled module matches the catalog and registers exclusively
through the IR interpreter. The focused proof uses public playCard, digivolve,
attack, and phase intents with settled observable state. It covers Q3843, both
printed restrictions, exact Tamer selection and duration, all-own-NSp
boundaries, legal evolution with cost, standard draw and source stack, and
illegal-source rejection. No card-specific seam or retained red remains.

#### Source evidence

Catalog source: packages/shared/src/cards/data/cards.json, EX7-022:

- ShogunGekomon; Blue Digimon; Ultimate; Virus; Amphibian/NSp.
- Level 5, play cost 7, DP 7000.
- Standard evolution: Blue Lv.4 for 3.
- Alternate evolution: Lv.4 with the [NSp] trait for cost 3.
- [On Play] 1 of your opponent's Digimon or Tamers can't suspend until the end of their turn.
- [Your Turn] All of your Digimon with the [NSp] trait can't have their attack targets switched.
- No inherited or Security effect.

Direct query:

    node tools/kb/query.mjs card EX7-022

returned Q3843. Q3843 confirms that the [Your Turn] restriction affects all
of the controller's NSp Digimon, rather than the opponent's Digimon, including
when the opponent's blocker is unaffected by Digimon effects.

Relevant direct rules queries covered §4-23 (Digimon/Tamer target alternatives),
§11-2-7 (attack targets and target changes), §12-1 (blocking is an attack
target switch), §15-15-5 (cards unaffected by effects), §6-1-4/§6-6 (turn-end
processing), and §6-2 (real unsuspend/turn-start timing).

#### Implementation mapping

| Contract | IR/test evidence |
| --- | --- |
| On Play: one opposing Digimon or Tamer cannot suspend until end of their turn | EX7-022.ts:9-24; exact IR assertion at EX7-022.test.ts:36-46; public play and exact Tamer selection at :70-135 |
| Your Turn: all own NSp Digimon cannot have attack targets switched | EX7-022.ts:26-48; exact IR assertion at EX7-022.test.ts:48-64; public NSp/non-NSp boundary and attack proof at :112-125 and :131-133 |
| Alternate Lv.4 [NSp] evolution for cost 3 | EX7-022.ts:52-59; catalog/requirement assertion at EX7-022.test.ts:20-35; legal public evolution at :137-174 |
| Exclusive executable registration | registerIrCard("EX7-022", compiled) at EX7-022.ts:62; no second registerCard registration |

The module declares coverage: full and residual: [].

#### Q&A and behavioral proof

- Q3843: The public play case has two own Digimon (one NSp and one
  non-NSp), two opposing Digimon plus a Blocker, and an opposing Tamer. The
  public On Play selection is biased to the exact Tamer instance. The Tamer
  alone receives the suspend restriction; the opposing Digimon and Blocker do
  not. A production suspension attempt leaves the Tamer unsuspended.
- The public attack from the own EX7-018 NSp Digimon reaches the real attack
  flow while ShogunGekomon's Your Turn restriction is active. The opposing
  Blocker cannot create a block/target-switch window, and remains unsuspended.
  This demonstrates the restriction on the attacking NSp Digimon, consistent
  with Q3843's controller-side ruling.
- ShogunGekomon itself and the separate EX7-018 NSp Digimon both receive
  attackTargetChange; the non-NSp BT1-009 does not.
- The On Play suspend restriction remains during the opponent's real Main
  phase and expires after the opponent's turn ends. The Your Turn restriction
  remains active for the next own Main phase while ShogunGekomon remains in
  play.
- No optional printed clause, inherited effect, or Security effect applies.

#### Evolution proof

The legal case starts from EX7-020, a Blue Lv.4 with the [NSp] trait, and
publicly digivolves into the exact EX7-022 hand instance with
useAlternateCost: true. It asserts success, cost 3 (memory 6 -> 3), the exact
EX7-022 top instance, the exact EX7-020 source in Permanent.stack, the exact
standard evolution draw, and the exact remaining deck card.

The negative case uses Red Lv.4 BT1-014. The public digivolve intent returns
{ ok: false, reason: "invalid-evolution" }; memory, hand, deck, source top, and
source stack remain unchanged. This proves the [NSp] source boundary without
payment, stacking, or drawing.

All deck/security fixtures use main-deck Digimon only; no Digi-Egg is placed
in deck or security.

#### Gaps and retained reds

None. The initial weak test used injected advance.fire; it was replaced with
public intents and real phase/attack timing. No it.fails test is needed because
the public proof passes.

#### Focused proof and gates

Focused command:

    pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-022.test.ts --maxWorkers=1 --no-file-parallelism

Result: **1 file passed; 4 tests passed**.

Static and hygiene commands:

    pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
    pnpm exec oxlint apps/api/src/cards/EX7/EX7-022.ts apps/api/src/cards/EX7/EX7-022.test.ts
    pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-022.ts apps/api/src/cards/EX7/EX7-022.test.ts
    rg -n 'security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|advance\.fire' apps/api/src/cards/EX7/EX7-022.test.ts
    git diff --check -- apps/api/src/cards/EX7/EX7-022.ts apps/api/src/cards/EX7/EX7-022.test.ts docs/audits/EX7-reaudit/EX7-022.md

API typecheck, Oxlint, Oxfmt, forbidden-fixture scan, and diff check all
passed; the forbidden-fixture scan returned no matches. No engine/shared
files, catalog, ledger, RUN, REVIEW-NOTES, or other-card files were edited.
No git write was performed.

#### Rubric

| Area | Score | Basis |
| --- | ---: | --- |
| Catalog/rules evidence | 2/2 | Exact catalog fields, Q3843, and relevant rules sections recorded |
| IR trace | 2/2 | Both restrictions, exact targets/durations, alternate requirement, full coverage, and exclusive registration match |
| Behavioral/Q&A proof | 2/2 | Q3843 and every printed clause pass through public intents, observable state, and real timing |
| Peer/stack proof | 2/2 | Legal cost/draw/stack identity, illegal source, NSp/non-NSp boundaries, Tamer target, and phase-boundary expiry pass |
| Delivery gates | 0/2 | Coordinator-owned per the worker brief; scoped gates themselves are green |

### EX7-023 — Hexeblaumon

Serialized engine lane, 2026-09-09. Scope is exactly EX7-023. No git write was performed.

#### Conclusion

**Score: 8/10. Q3844 is closed; no retained red remains.** The original expected failure
was reproduced independently, classified as a generic continuous-restriction seam, fixed
narrowly, covered by a mechanism regression, and converted to an ordinary green test.

#### Card, catalog, rules, and implementation

The catalog entry identifies EX7-023 as Hexeblaumon: Blue, Level 6, Mega, Data, with
Magic Knight, Witchelny, and Ice-Snow traits, play cost 12, DP 12000, and a Blue Lv.5
evolution route costing 4. It has no inherited text and no Security effect beyond Security
Attack +1. `apps/api/src/cards/EX7/EX7-023.ts` is compiled IR with `coverage: "full"`,
`residual: []`, and exclusive `registerIrCard("EX7-023", compiled)` registration.

Printed clauses mapped to IR and public proof:

| Clause | Implementation and observable proof | Result |
| --- | --- | --- |
| Security Attack +1 | Static `SecurityAttack: 1`; public attack checks two security cards | Green |
| Ice Clad | Static `IceClad`; Digimon battles use source count while Security battles use DP | Green |
| When Digivolving: trash any four opponent sources | `TrashDigivolution`, across opponent Digimon, exact four source instances leave stacks | Green |
| Then, if no opponent Digimon has sources, bottom one opponent Tamer | `opponentHasNone` condition and `deckBottom` return are publicly observed | Green |
| Opponent's Turn: opponent Digimon with as many or fewer sources cannot suspend | Source-relative continuous restriction; Q3844 now reopens after target gains a source | Green |
| Rule: Ice-Snow type | Self-scoped Rule `GrantStatic` trait | Green |

Applicable rules evidence: Comprehensive Rules §16-35-1 through §16-35-4-3 for Ice Clad,
§8-1-3-1 through §8-1-3-3 for evolution payment/stack/draw, §4-3-1 and §4-3-3 for
digivolution-card stacks, and §4-14-1 through §4-15-1 for deck movement and trash.

#### KB-INDEX and Q&A coverage

`node tools/kb/query.mjs card EX7-023 --json` returned Q3844, with no banlist or errata.
Q3844 states that an opponent's Digimon initially at the same source count is restricted,
but can suspend after later gaining a greater source count during that opponent's turn.
The public proof is `EX7-023.test.ts:263-296`; the generic mechanism proof is in
`ex7HexeblaumonMechanism.test.ts`.

#### Evolution, stack, and negative proof

The legal Blue Lv.5 route publicly pays exactly 4 memory, draws exactly one top-deck card,
places EX7-023 over the source, and preserves the source stack. The When Digivolving path
trashes four exact source instances across two opposing stacks and bottoms the Tamer only
when no source-bearing opponent Digimon remains. A wrong-color/wrong-level Red Lv.3 source
is rejected without payment, draw, or stack mutation. Ice Clad is proven with a mixed
source-count boundary and the Security-DP exception. Fixtures contain no Digi-Egg in deck
or Security, and no injected timing (`advance.fire`/`fireTiming`) is used.

#### Q3844 root cause and fix

Before the fix, `runRestrictionAction` resolved the permanent `Restrict` target once and
recorded individual target IDs. That snapshot could not notice a target's later evolution.
The continuous interpreter now routes only the narrow generic shape—continuous pass,
`count: "all"`, and `digivolutionCardsCompareToSource`—through the existing player-scoped
restriction predicate. The predicate evaluates the live target and live source stacks on
each read/recompute. The ledger also applies its existing `suspend`/`beSuspended` equivalence
to player-scoped entries, preserving both combat and effect consumers.

The mechanism report documents the red-to-green proof:
[EX7-023 source-relative restriction mechanism](EX7-023-SOURCE-RELATIVE-RESTRICTION-MECHANISM.md).

#### Verification evidence

```text
Pre-fix focused lane: 1 file, 7 passed, 1 expected-fail retained red
Final focused + mechanism: 2 files, 9/9 tests passed
Relevant conformance/effect suite: 6 files, 87/87 tests passed
Full src/engine regression: 262 files, 7304/7304 tests passed
Workspace typecheck: PASS (shared, web, API)
Oxlint: PASS with no warnings
Oxfmt --check: PASS
git diff --check: PASS
```

Only EX7-023 lane files, the new mechanism regression, and the two necessary shared engine
files were changed. No other card, catalog, ledger, RUN, REVIEW-NOTES, commit, branch,
push, reset, or other git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | Catalog identity, six printed clauses, Q3844, and applicable rules are recorded. |
| Direct IR | 2 / 2 | Security Attack, Ice Clad, cross-stack trash, conditional Tamer return, source comparison, Rule trait, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | All clauses, source-count boundaries, Security exception, evolution behavior, and Q3844 dynamic reopening pass publicly. |
| Peer / stack | 2 / 2 | Legal cost/draw/stack, exact source transitions, illegal source rejection, and mixed-stack boundary are proven. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-024 — Shoemon

Status: DONE; provisional lane score 8/10. Delivery gates remain 0/2 by coordinator policy.

#### Sources and contract

- Catalog source: packages/shared/src/cards/data/cards.json, EX7-024.
- Catalog facts: Yellow Digimon, level 3, play cost 3, 1000 DP, Rookie, Virus, Puppet/LIBERATOR; standard evolution from Yellow level 2 for 0.
- Printed effect: [Your Turn] When this Digimon would digivolve into a Digimon card with the [Puppet] trait, reduce the digivolution cost by 1.
- Printed inherited effect: [Your Turn] All of your opponent's Security Digimon get -3000 DP.
- Direct KB Q&A: Q3845 says the Your Turn effect does not trigger while Shoemon is in the breeding area. Q4882 says that when the BT22-036 Chaperomon Hand/Main effect digivolves EX7-024 while ignoring requirements, Shoemon's reduction makes that fixed cost 3 become 2. The local Q&A index lists both IDs for EX7-024.
- Rules evidence queried: breeding-area effects require an explicit Breeding icon; ordinary effects do not trigger from breeding, and a digivolution places the new card on top, draws 1, and preserves the prior cards underneath in order.

#### Implementation and IR trace

The only executable registration is registerIrCard("EX7-024", compiled) at EX7-024.ts:58. There is no duplicate registerCard path.

- EX7-024.ts:10-40: YourTurn replacement for a self source in the battle area only (explicit sourceFilter zone), whose destination is a controller-owned Digimon with the Puppet trait; nested replacement reduces wouldDigivolve cost by exactly 1.
- EX7-024.ts:42-52: inherited YourTurn ModifySecurityDP applies -3000 to the opponent's Security Digimon and is permanent while the inherited source is active.
- EX7-024.ts:54-55: coverage is full and residual is empty.

The explicit battle-area source gate is important for Q3845 and uses the existing interpreter source-zone seam; no engine or shared files were changed.

#### Behavioral evidence

All seven focused tests use public digivolve, activateEffect, attack, hatchEgg, end-phase, and surrender intents plus settle and observable state. No advance.fire or fireTiming is used.

1. EX7-024.test.ts:17-66 verifies the catalog fields, exact NBSP effect text, standard evolution metadata, both Q&A IDs in the audit mapping, full/empty IR coverage, exact target filter, exact cost reduction, inherited timing/controller/amount, and explicit battle-area source gate.
2. EX7-024.test.ts:69-99 publicly digivolves Shoemon into Puppet EX7-025 during a real own Main phase. Memory 5 becomes 4, proving printed cost 2 minus Shoemon's 1 reduction; the exact first main-deck instance is drawn, the remaining deck is exact, EX7-024 is the only card in Permanent.stack, and EX7-025 is the exact top instance.
3. EX7-024.test.ts:101-142 imports the real BT22-036 peer and activates its public Hand/Main effect. With Arisa and ShoeShoemon in the appropriate observable zones, memory 5 becomes 3, proving Q4882's exact cost 2; the standard draw is exact, ShoeShoemon and EX7-024 occupy the exact under-stack order, the placed card leaves trash, and the top is the exact BT22-036 instance.
4. EX7-024.test.ts:144-172 publicly evolves into non-Puppet Yellow BT1-051. Memory 5 becomes 3, so no reduction is applied; the standard draw and source stack identity are also asserted.
5. EX7-024.test.ts:174-225 uses the real turn loop to hatch EX7-003, evolve to Shoemon, then attempt Puppet evolution from the breeding area. Both evolution draws are exact, the second payment is the full cost 2 (memory 5 to 3), and the egg plus Shoemon are preserved under the exact ShoeShoemon top. This is the Q3845 negative path.
6. EX7-024.test.ts:227-266 establishes the inherited effect on a real stack, observes -3000 only on the opponent's Security Digimon, and confirms a 3000-DP attacker defeats a 4000-DP Security Digimon after the modifier (attackerDeleted false). Passing to the opponent clears the modifier; the next real own Main phase restores it.
7. EX7-024.test.ts:268-296 uses a wrong-color/wrong-level BT1-014 source. The public digivolve returns invalid-evolution; memory, hand, deck, source top, and stack remain unchanged and no draw occurs.

Fixtures use main-deck Digimon for deck/security cards. The only Digi-Egg is the public EX7-003 hatch source; no Digi-Egg is placed in deck or security.

No once-per-turn clause is printed on EX7-024, so no once-per-turn reset proof is applicable. No reproducible engine seam or retained red remains for this card.

#### Rubric

| Category | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog fields, printed clauses, direct Q3845/Q4882, and breeding/security/digivolution rule sources. |
| IR trace | 2/2 | Complete two-clause IR, explicit Puppet and battle-area gates, full coverage, empty residual, exclusive registerIrCard. |
| Behavioral proof | 2/2 | Seven focused tests cover both clauses, both Q&A paths, real timing, exact costs, draws, zones, and negative behavior. |
| Peer/stack proof | 2/2 | BT22-036 Hand/Main peer boundary, non-Puppet peer, exact top/under identity, breeding stack, and Security Digimon battle. |
| Delivery gates | 0/2 | Reserved for coordinator set-level gates. |
| Total | 8/10 | Maximum lane score. |

#### Commands and results

- pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-024.test.ts --maxWorkers=1 --no-file-parallelism — PASS, 1 file and 7 tests.
- pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json — PASS, exit 0.
- pnpm exec oxlint apps/api/src/cards/EX7/EX7-024.ts apps/api/src/cards/EX7/EX7-024.test.ts — PASS, exit 0 with no warnings.
- pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-024.ts apps/api/src/cards/EX7/EX7-024.test.ts — PASS; all matched files use the correct format.
- Forbidden-fixture scan for advance.fire, fireTiming, diagnostics, and Digi-Egg security/deck patterns — PASS, no matches.
- git diff --check -- apps/api/src/cards/EX7/EX7-024.ts apps/api/src/cards/EX7/EX7-024.test.ts — PASS.

No git write was performed. Only EX7-024.ts, EX7-024.test.ts, and this report were owned; no engine, shared, catalog, ledger, RUN, or other-card files were edited.

### EX7-025 — ShoeShoemon

Worker lane, 2026-09-09. Scope is exactly EX7-025. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json` at the EX7-025
record) identifies EX7-025 as ShoeShoemon: Yellow Digimon, Level 4, Champion, Virus,
Puppet and LIBERATOR, play cost 4, DP 4000, with a Yellow Lv.3 evolution route costing 2.

Printed clauses:

- **C1 (When Digivolving):** If you have 1 or fewer Tamers, you may play 1 Arisa Kinosaki
  from your hand without paying the cost.
- **C2 (Inherited, Your Turn):** All of the opponent's Security Digimon get -3000 DP.

There is no separate Security effect and no once-per-turn clause.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-025 --json` returned `qa: []`, `banlist: null`, and
`errata: null`. Q&A coverage is therefore explicitly **N/A — no direct EX7-025 Q&A IDs are
indexed**; no ruling is inferred.

Applicable local rules evidence:

- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects a requirement,
  pays its cost, places the new card on top, and draws 1.
- Comprehensive Rules §4-3-1 and §4-3-3
  (`data/kb/rules/comprehensive.md:655-663`): inherited effects come from cards beneath
  the top card of a Digimon stack.
- Comprehensive Rules §16-35-1 through §16-35-4-3
  (`data/kb/rules/comprehensive.md:3227-3243`): the inherited Security Digimon modifier
  is applied in Security battles; it does not change the general Digimon battle comparison.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution route | `EX7-025.test.ts:15-33` pins all catalog fields, exact main/inherited text, and Yellow Lv.3 cost-2 route | The committed catalog is asserted directly; no extra Security or once-per-turn behavior is present |
| C1 conditional optional Arisa play | `EX7-025.ts:11-41` uses `PlayWithoutCost`, exact `nameExact` Arisa target from hand, count 1, and a pre-play Tamer count `lte 1` condition with `optional: true` | `EX7-025.test.ts:64-108` evolves through the public path at exactly one existing Tamer and plays Arisa for free; `:110-141` declines the optional play; `:143-208` proves two Tamers block it and a non-Arisa Tamer is not substituted |
| C2 inherited Security DP modifier | `EX7-025.ts:43-53` uses inherited `YourTurn`, opponent controller, `ModifySecurityDP -3000`, permanent duration | `EX7-025.test.ts:210-237` observes -3000 on the owner's turn, publicly wins a Security battle against a 10000-DP card with a 9000-DP host, and observes no modifier during the opponent's turn |
| Exclusive executable registration | `EX7-025.ts:55-59` reports `coverage: "full"`, `residual: []`, and calls only `registerIrCard("EX7-025", compiled)` | No duplicate legacy `registerCard` registration exists in the owned module |

#### Evolution, stack, timing, and peer boundaries

`EX7-025.test.ts:64-108` uses a real turn loop and public `digivolve` intent from the real
Yellow Lv.3 BT1-049. It asserts the exact 2-memory payment, exact top-deck draw instance,
one-card deck reduction, the new EX7-025 top card, and the original source instance beneath
it. It also exercises the `1 or fewer` boundary with one existing Tamer and verifies that
Arisa enters from hand without consuming additional memory.

`EX7-025.test.ts:239-262` rejects the Red Lv.3 BT1-009 source as `invalid-evolution`, with
memory, deck, hand, top card, and source stack unchanged.

The conditional target boundary is tested with the inert BT10-090 Tamer peer: two existing
Tamers block the effect, while a non-Arisa Tamer in hand is not accepted as a name substitute.
The inherited stack uses a realistic Yellow Lv.5 BT1-059 host with EX7-025 beneath it and a
real BT2-037 Security Digimon; its -3000 modifier is observable both through `securityDp`
and through a public attack/security resolution. No Digi-Egg appears in a normal deck or
Security fixture.

All behavioral timing uses public intents, `settle()`, and real turn-loop phase progression.
There is no `advance.fire`, `fireTiming`, dynamic `it.fails`, or direct internal effect firing.
No once-per-turn or engine seam applies to this card.

#### Peer trace and retained gaps

The implementation follows neighboring EX7 card patterns for exact named Tamer targeting,
optional free play, inherited `YourTurn` security modifiers, and exclusive IR registration.
The Yellow Lv.3 → Yellow Lv.4 evolution and Yellow Lv.5 host stack provide realistic color,
level, and source transitions rather than isolated card placement.

No card-specific engine gap, ambiguity, or retained red was observed. The module already
matched the catalog and was not changed; only the owned test and report were updated.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-025 --json
  PASS: qa []; banlist null; errata null

pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-025.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 6 passed

pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS: no diagnostics

pnpm exec oxlint apps/api/src/cards/EX7/EX7-025.ts apps/api/src/cards/EX7/EX7-025.test.ts
  PASS

pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-025.ts apps/api/src/cards/EX7/EX7-025.test.ts
  PASS

rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-025.test.ts
  PASS: no forbidden timing injection or Digi-Egg Security fixture

git diff --check -- apps/api/src/cards/EX7/EX7-025.ts apps/api/src/cards/EX7/EX7-025.test.ts docs/audits/EX7-reaudit/EX7-025.md
  PASS
```

Only the permitted EX7-025 test/report lane was changed. No commit, branch, push, reset,
ledger, RUN, or other git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields, both printed clauses, empty KB result, and applicable evolution/stack/Security rules are recorded. |
| Direct IR | 2 / 2 | Exact optional target, hand source, Tamer count boundary, free cost, inherited timing/controller/DP modifier, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public positive, optional refusal, count and name negatives, inherited owner-turn timing, and actual Security battle behavior pass. |
| Peer / stack | 2 / 2 | Legal cost/draw/top-under identity, illegal source rejection, realistic Yellow peer stacks, and Security boundary evidence pass. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-026 — Starmon

Worker lane, 2026-09-09. Scope is exactly EX7-026. No git write was performed.

#### Card and printed clauses

The committed catalog entry (`packages/shared/src/cards/data/cards.json` at the EX7-026
record) identifies EX7-026 as Starmon: Yellow Digimon, Level 4, Champion, Data, Mutant and
NSp, play cost 4, DP 4000, with a Yellow Lv.3 evolution route costing 2.

Printed clauses:

- **C1 (Alternate Digivolve):** Lv.3 with the NSp trait: cost 2.
- **C2 (On Play):** 1 of the opponent's Digimon gets -3000 DP for the turn.
- **C3 (When Digivolving):** 1 of the opponent's Digimon gets -3000 DP for the turn.
- **C4 (Inherited):** Barrier.

There is no Security effect and no once-per-turn clause.

#### KB-INDEX Q&A and rules evidence

`node tools/kb/query.mjs card EX7-026 --json` returned `qa: []`, `banlist: null`, and
`errata: null`. Q&A coverage is therefore explicitly **N/A — no direct EX7-026 Q&A IDs are
indexed**; no ruling is inferred.

Applicable local rules evidence:

- Comprehensive Rules §8-1-3-1 through §8-1-3-3
  (`data/kb/rules/comprehensive.md:1434-1446`): a legal evolution selects a requirement,
  pays its cost, places the new card on top, and draws 1.
- Comprehensive Rules §4-3-1 and §4-3-3
  (`data/kb/rules/comprehensive.md:655-663`): inherited effects come from cards beneath
  the top card of a Digimon stack.
- Comprehensive Rules §4-15-1 (`data/kb/rules/comprehensive.md:814-815`): a card deleted
  by battle is trashed; Barrier's public combat window can replace that deletion by paying
  its Security cost.

#### Clause → IR → behavioral proof

| Contract | Direct implementation | Observable proof |
| --- | --- | --- |
| Catalog identity and evolution routes | `EX7-026.test.ts:15-33` pins all catalog fields, exact text, and the Yellow Lv.3 cost-2 route; `EX7-026.ts:58-65` carries the alternate NSp Lv.3 cost-2 route | `EX7-026.test.ts:89-123` exercises both the standard Yellow route and alternate NSp route through public digivolution |
| C1 alternate NSp evolution | `EX7-026.ts:58-65` uses level 3, `traits: ["NSp"]`, cost 2, `isAlternate: true` | `EX7-026.test.ts:89-123` publicly evolves from NSp Blue Lv.3 EX7-015 with `useAlternateCost: true`, paying exactly 2 and preserving the source stack |
| C2 On Play DP reduction | `EX7-026.ts:11-26` targets exactly one opponent Digimon for -3000 with `forTheTurn` duration | `EX7-026.test.ts:70-87` publicly plays Starmon, observes 4000 → 1000 DP, pays play cost 4, and observes restoration at the next real turn |
| C3 When Digivolving DP reduction | `EX7-026.ts:27-43` repeats the same exact target, amount, and duration under `WhenDigivolving` | `EX7-026.test.ts:89-123` publicly resolves both legal evolution routes and observes the opponent target at 1000 DP |
| C4 inherited Barrier | `EX7-026.ts:45-54` publishes inherited static `Barrier` | `EX7-026.test.ts:151-184` observes Barrier on a realistic host stack and accepts the public `respondBarrier` window, paying one Security card to preserve the host |
| Exclusive executable registration | `EX7-026.ts:55-68` reports `coverage: "full"`, `residual: []`, and calls only `registerIrCard("EX7-026", compiled)` | No duplicate legacy `registerCard` registration exists in the owned module |

#### Evolution, stack, timing, and boundaries

`EX7-026.test.ts:89-123` uses a real turn loop and public `digivolve` intent twice: once from
Yellow Lv.3 BT1-049 through the catalog route and once from Blue Lv.3 NSp EX7-015 through
the alternate route. Both cases assert the exact 2-memory payment, exact top-deck draw
instance, one-card deck reduction, EX7-026 on top, and the original source instance beneath
it. The source is tested as a real NSp peer rather than a synthetic trait-only fixture.

`EX7-026.test.ts:125-149` rejects the Red non-NSp Lv.3 BT1-009 source through the alternate
route as `invalid-evolution`, with memory, deck, hand, top card, and source stack unchanged.

`EX7-026.test.ts:70-87` uses public `playCard` and a real turn transition to prove the On
Play -3000 DP modifier lasts only for the turn. `:151-184` uses EX7-026 beneath Yellow Lv.5
BT1-057, a real opponent attack, and the public Barrier response to prove inherited stack
behavior and its Security payment destination.

The On Play/When Digivolving target boundary is the exact opposing Digimon-only count-1
filter. The test fixtures use inert main-deck Digimon and contain no Digi-Egg in normal deck
or Security. No `advance.fire`, `fireTiming`, dynamic `it.fails`, or direct internal effect
firing is used.

#### Peer trace and retained gaps

The implementation follows neighboring EX7 NSp cards for alternate trait-based evolution,
the shared `ModifyDP` for-turn primitive, and inherited Barrier projection. BT1-049 and
EX7-015 provide contrasting legal Yellow and NSp evolution peers; BT1-009 is the nonmatching
color/trait negative; BT1-057 provides a valid Yellow Lv.5 host for the inherited stack.

No card-specific engine gap, ambiguity, or reproducible seam was observed. The module already
matched the catalog and was not changed; only the owned test and report were updated.

#### Commands and results

```text
node tools/kb/query.mjs card EX7-026 --json
  PASS: qa []; banlist null; errata null

pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-026.test.ts --maxWorkers=1 --no-file-parallelism
  PASS: 1 file, 5 passed

pnpm --filter @aegis/api exec tsc --noEmit -p tsconfig.json
  PASS: no diagnostics

pnpm exec oxlint apps/api/src/cards/EX7/EX7-026.ts apps/api/src/cards/EX7/EX7-026.test.ts
  PASS

pnpm exec oxfmt --check apps/api/src/cards/EX7/EX7-026.ts apps/api/src/cards/EX7/EX7-026.test.ts
  PASS

rg -n 'advance\.fire|fireTiming|security:.*(BT1-00[1-8]|ST[134]-01|EX7-00[1-4])|eggDeck:.*security' apps/api/src/cards/EX7/EX7-026.test.ts
  PASS: no forbidden timing injection or Digi-Egg Security fixture

git diff --check -- apps/api/src/cards/EX7/EX7-026.ts apps/api/src/cards/EX7/EX7-026.test.ts docs/audits/EX7-reaudit/EX7-026.md
  PASS
```

Only the permitted EX7-026 test/report lane was changed. No commit, branch, push, reset,
ledger, RUN, or other git write was performed.

#### Score

| Column | Score | Reason |
| --- | ---: | --- |
| Catalog / rules | 2 / 2 | All catalog fields, four printed clauses, empty KB result, and applicable evolution/stack/Barrier rules are recorded. |
| Direct IR | 2 / 2 | Both DP triggers, exact target/amount/duration, alternate evolution requirement, inherited Barrier, full coverage, residual, and exclusive registration are traced. |
| Behaviour | 2 / 2 | Public On Play and When Digivolving effects, duration restoration, legal/illegal routes, and Barrier combat all pass. |
| Peer / stack | 2 / 2 | Standard and alternate legal routes, exact cost/draw/top-under identity, nonmatching source, and realistic inherited host stack pass. |
| Delivery gates | 0 / 2 | Worker lanes do not receive coordinator-owned set-level delivery credit. |

**Total: 8 / 10.**

### EX7-027 — Chaperomon

#### Result

Score: **8/10 provisional**. The card remains compiled IR registered exclusively through `registerIrCard`; all seven public tests pass.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Catalog identity, printed effects and the 2024-09-13 mandatory-Overclock erratum are asserted. |
| Compiled IR | 2/2 | Overclock, optional When Digivolving Puppet play, inherited leave replacement, cause filter, cost, and `OncePerTurn` frequency are asserted with full coverage and empty residual. |
| Observable behavior | 2/2 | Public evolution, optional acceptance/refusal, mandatory end-turn Overclock, first-use prevention, same-turn refusal, and next-real-turn reset pass. |
| Peer/stack proof | 2/2 | Tests prove exact evolution payment/draw/top-under identity, legal Puppet selection, illegal source rejection, and realistic inherited host/fodder stacks. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public Yellow Lv.4 evolution pays 3, draws the exact top-deck instance, preserves the source under EX7-027, and optionally plays exactly one level-3 Puppet for free.
- The refusal branch leaves the Puppet in hand while evolution payment, draw, and stack transition still occur.
- The errata-mandated Overclock deletes another Puppet and attacks a player without suspending at the real end-of-turn timing.
- Two real opposing attacks prove the inherited replacement prevents the first departure by deleting another Puppet, then refuses a second use in the same turn.
- A separate real-turn-loop test re-suspends the host through its own public attack into inert Option security; the next opponent-turn departure consumes the second Puppet and is prevented.
- No `advance.fire`, direct effect injection, Digi-Egg deck/security fixture, diagnostic logging, or legacy `registerCard` registration remains.

#### Verification

- `node tools/kb/query.mjs card EX7-027` — erratum returned; no direct Q&A.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-027.test.ts src/engine/effects/leavePrevent.test.ts src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism` — **56/56 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

The former red attacked a 1000-DP host into a 5000-DP Security Digimon during the intervening turn, legitimately consuming the reset prevention and its second Puppet. Neutral Option security isolates suspension from departure; the unchanged per-turn ledger resets correctly. No engine change was required.

### EX7-028 — Piximon

#### Result

Score: **8/10 provisional**. All eight public tests pass; the former same-turn red did not fund Cerberusmon's second When Attacking cost.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact catalog identity, text, Q3846, and evolution/turn-duration rules are recorded. |
| Compiled IR | 2/2 | The Yellow-or-NSp On Deletion union filter, cost ceiling, optional free play, inherited DP modifier, duration, frequency, alternate evolution, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public battle deletion, both Q3846 branches, refusal, two funded same-turn attacks, turn expiry, and next-own-turn re-arm pass. |
| Peer/stack proof | 2/2 | Non-yellow NSp and Yellow peers, exact legal evolution payment/draw/stack, illegal source, and realistic inherited hosts are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A real opponent attack deletes Piximon and publicly triggers its optional On Deletion effect. Separate cases play a qualifying Yellow card and a non-Yellow NSp card, matching Q3846.
- The refusal case leaves eligible and ineligible candidates in hand.
- Public alternate evolution from a non-Yellow NSp level 4 pays 3, draws the exact top card, and preserves exact top/under identity; a nonmatching source is rejected without mutation.
- The inherited effect applies -4000 DP on attack, expires at the real turn boundary, and rearms after the intervening opponent turn.
- BT1-039 publicly pays its three-card unsuspend cost on each of two attacks. The first -4000 DP modifier remains throughout the same turn, expires at the real boundary, and rearms next turn.
- No injected timing, diagnostic output, Digi-Egg deck/security fixture, legacy `registerCard`, or out-of-scope production edit remains.

#### Verification

- `node tools/kb/query.mjs card EX7-028 --json` — Q3846 returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-028.test.ts src/engine/effects/modifiers.test.ts src/engine/effects/subtriggers.test.ts --maxWorkers=1 --no-file-parallelism` — **73/73 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

The former fixture supplied only the first of BT1-039's two three-card When Attacking costs. Its second resolution therefore did not establish the intended same-turn state and the loop reached the turn boundary, correctly expiring `forTheTurn`. Funding both printed costs proves the unchanged modifier lifecycle. No engine change was required.

### EX7-029 — SaberLeomon

#### Result

Score: **8/10 provisional**. All nine focused tests pass; the former On Play red auto-passed an actionless Main phase.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, ACE/Overflow metadata, printed/alternate routes, text, and absence of card-specific Q&A/errata are recorded. |
| Compiled IR | 2/2 | Blast Digivolve, both DP triggers, exact two-target suspension filter, shared evolution/attack OPT, conditional suspend/unsuspend, both alternate routes, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public Blast, On Play/evolution DP reductions and duration, suspend/unsuspend, shared once-per-turn, and Overflow pass. |
| Peer/stack proof | 2/2 | NSp and non-NSp Leomon routes, exact payments/draws/stacks, wrong-route rejection, two distinct DP targets, and ACE battle removal are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public alternate evolution from suspended EX7-022 pays 3, preserves exact top/under identity, draws exactly, reduces two suspended targets, suspends the remaining chosen opponent, and unsuspends SaberLeomon.
- The following public attack proves that the When Digivolving and When Attacking clauses share the same once-per-turn identity.
- A distinct public route evolves from non-NSp BT1-042 LoaderLeomon for 3; AD1-002 is rejected as neither NSp nor Leomon and leaves all state unchanged.
- A real counter window Blast Digivolves from hand without changing memory.
- A real losing battle moves the ACE stack to trash and changes memory 3 to -1, proving Overflow 4.
- Public play reduces two distinct suspended Digimon by 8000 DP while a legal follow-up card keeps Main open; both persist until the explicit end-phase intent and then expire.
- No injected timing, post-ready board insertion, hardcoded instance identity, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-029 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-029.test.ts --maxWorkers=1 --no-file-parallelism` — **9/9 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

The former fixture left the active player with no legal Main action after playing SaberLeomon. The production controller auto-passed, so `untilYourTurnEnd` correctly expired after its brief resolving-state observation. A legal follow-up card holds Main open and proves the unchanged duration lifecycle. No engine change was required.

### EX7-030 — Cendrillmon

#### Result

Score: **8/10 provisional**. All seven focused tests pass, including Q3847's Familiar/When Attacking combination.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, text, errata-mandated Overclock attack, Q3847, and Familiar Token definition are recorded. |
| Compiled IR | 2/2 | Exact mandatory Overclock cost/attack, token creation at both timings, attack DP modifier, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public Main/evolution token creation/refusal, attack modifier, mandatory Overclock, and Q3847 pass. |
| Peer/stack proof | 2/2 | Exact standard evolution payment/draw/stack, wrong-color rejection, synthetic Familiar peer, security target, and opposing DP target are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real turn starts prove accepting and declining the optional Familiar at Start of Main.
- Public evolution from EX7-028 pays exactly 4, draws the exact card, preserves top/under identity, and creates the Familiar.
- A public attack applies Cendrillmon's -6000 DP modifier to an independent opponent.
- The errata path publicly ends the turn, consumes the publicly created Familiar, declares the player attack without suspending Cendrillmon, and applies Cendrillmon's -6000 DP.
- In the Q3847 flow, Familiar's registered On Deletion -3000 combines with Cendrillmon's -6000, producing the observable 3000-DP state.
- A non-yellow level 5 route is rejected without memory, draw, hand, or stack mutation.
- No injected timing, legacy `registerCard`, or diagnostic output remains. The focused test explicitly loads the existing synthetic Familiar registration; no duplicate registration was added.

#### Verification

- `node tools/kb/query.mjs card EX7-030 --json` — errata and Q3847 returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-030.test.ts src/cards/ST19/ST19-12.test.ts src/engine/effects/overclock.test.ts src/engine/effects/leavePrevent.test.ts --maxWorkers=1 --no-file-parallelism` — **38/38 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

Nested deletion timing is deferred behind the causing effect, but deleted Tokens leave the match and cannot be recollected later. The engine now snapshots those Token instances into the deferred window, matching its existing rule-deletion pool. No card-specific registration was added.

### EX7-031 — Pteromon

#### Result

Score: **8/10 provisional**. Six focused tests and all nine EX11-032 peer tests pass.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, text, Q3848, and Q5838 are recorded and reconciled. |
| Compiled IR | 2/2 | Exact battle-area source gate, Bird/Avian trait-contains filter, cost reduction, self-scoped inherited battle-deletion watcher, all-turn timing, once-per-turn frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public breeding/battle-area evolutions, qualifying/nonqualifying targets, host-owned battle deletion, wrong-host exclusion, and losing-battle boundary are green; the identical inherited lifecycle also has real-turn proof on EX7-032. |
| Peer/stack proof | 2/2 | Exact payments, draws, top/under identity, EX7-032 Bird peer, BT1-069 non-Bird peer, and EX11-032's public Q5838 hand-Main route are green. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Q3848 is proved by a real breeding-area evolution into EX7-032: it pays the full 2 memory while preserving exact draw and stack identity.
- The same public evolution from a battle-area Pteromon pays 1, proving the printed reduction and its zone boundary.
- A non-Bird/non-Avian evolution pays its full catalog cost.
- EX11-032's public hand-Main test starts at 2 memory and completes its cost-3 ignored-requirements evolution, directly proving Q5838's combined reduction.
- Real Digimon battles prove the inherited gain only when the stack carrying EX7-031 deletes the opponent; another attacker and a losing host do not gain memory.
- No injected timing, legacy `registerCard`, diagnostic output, or out-of-scope production edit remains.

#### Verification

- `node tools/kb/query.mjs card EX7-031 --json` — Q3848 and Q5838 returned.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-031.test.ts src/cards/EX11/EX11-032.test.ts --maxWorkers=1 --no-file-parallelism` — **15 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-032 — Galemon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public evolution, selection, combat, and real-turn flows.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, printed evolution route, effect text, inherited text, and absence of card-specific Q&A/errata are recorded. |
| Compiled IR | 2/2 | Exact Shoto name filter, one-or-fewer-Tamers condition, optional free play, self-scoped battle-deletion watcher, all-turn timing, once-per-turn frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public evolution/free play/refusal, zero/one/two-Tamer boundaries, winning/losing combat, unrelated-host exclusion, same-turn refusal, and next-own-turn re-arm are green. |
| Peer/stack proof | 2/2 | Exact 2-memory payment, bonus-draw identity, top/under identity, invalid-color rejection, and realistic inherited host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A public standard evolution from a plain green level 3 pays exactly 2 memory, draws the exact deck card, keeps exact top/under identity, and plays Shoto for free with one existing Tamer.
- Optional refusal at zero Tamers and rejection at two Tamers both leave Shoto in hand.
- An invalid non-green level 3 source is rejected without memory, draw, hand, or stack mutation.
- Real Digimon battles prove that only the host carrying EX7-032 gains memory, and only when that host deletes the opposing Digimon.
- Three public battles across a real intervening opponent turn prove same-turn once-per-turn suppression and next-own-turn re-arming without injected timing or phase state.
- No legacy `registerCard`, diagnostic output, or out-of-scope production edit is present.

#### Verification

- `node tools/kb/query.mjs card EX7-032 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-032.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-033 — Monochromon

#### Result

Score: **8/10 provisional**. All five focused tests pass with public evolution and combat evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, printed/alternate evolution, rule trait, inherited keyword, and absence of card-specific Q&A/errata are recorded. |
| Compiled IR | 2/2 | Exact self-scoped Dinosaur grant, inherited Piercing keyword, NSp alternate route, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | The effective rule trait and inherited Piercing are observed on live stacks, and Piercing performs a real security check after battle deletion. |
| Peer/stack proof | 2/2 | Non-green NSp evolution pays exactly 1 with exact draw/top/under identity; a non-green non-NSp source is rejected without mutation. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- The live-card observer sees both the granted Dinosaur trait and inherited Piercing on their appropriate stacks.
- A public Digimon battle deletes the defender and performs the Piercing security check.
- A public alternate evolution from EX7-015 proves the NSp route independently of color, exact payment, exact draw, and stack identity.
- The non-NSp wrong-color boundary is rejected without memory, draw, hand, or stack mutation.
- No injected timing, legacy `registerCard`, diagnostic output, or out-of-scope production edit is present.

#### Verification

- `node tools/kb/query.mjs card EX7-033 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-033.test.ts --maxWorkers=1 --no-file-parallelism` — **5 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-034 — GrandGalemon

#### Result

Score: **8/10 provisional**. All six focused tests pass with public evolution, opponent-effect, attack, and end-of-turn flows.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, Vortex reminder, effect text, inherited text, and absence of card-specific Q&A/errata are recorded. |
| Compiled IR | 2/2 | Exact Vortex keyword, any-Digimon suspension, conditional self-protection source/owner/duration gates, inherited target condition, once-per-turn frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public Vortex, own/opponent suspension branches, live opposing-Digimon-effect immunity, and inherited first/second-attack boundaries are green. |
| Peer/stack proof | 2/2 | Exact standard evolution payment/draw/top/under identity, wrong-color rejection, public BT1-070 adversarial peer, and realistic inherited host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public evolution from EX7-033 pays exactly 3, draws the exact deck card, preserves top/under identity, and suspends an own ally.
- Suspending that ally grants the evolved stack protection; a publicly played opposing BT1-070 resolves its Digimon suspension effect while GrandGalemon remains unsuspended.
- Selecting the opponent's Digimon instead suspends it but does not grant protection, proving the conditional branch.
- A real end-of-turn Vortex declaration attacks and deletes an initially unsuspended opponent Digimon.
- A host carrying EX7-034 unsuspends after its first Digimon-target attack but remains suspended after its second same-turn attack, proving the shared condition and frequency.
- A wrong-color level 4 source is rejected without payment, draw, hand, or stack mutation.
- No injected timing, legacy `registerCard`, diagnostic output, or out-of-scope production edit remains.

#### Verification

- `node tools/kb/query.mjs card EX7-034 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-034.test.ts --maxWorkers=1 --no-file-parallelism` — **6 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-035 — Triceramon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, combat, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, text, Q3849, rule trait, alternate route, and absence of errata/banlist entry are recorded. |
| Compiled IR | 2/2 | Exact suspend/same-target lock at both timings, duration, Dinosaur grant, inherited self-scoped security trash, once-per-turn frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public play/evolution, Q3849, two-turn lock expiry, live trait, exact security trash, same-turn suppression, and next-own-turn re-arm are green. |
| Peer/stack proof | 2/2 | Non-green NSp evolution pays exactly 3 with exact draw/stack; wrong-trait rejection, distinct battle targets, and exact Security identities are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play pays 7, suspends and locks the same target through its controller's next unsuspend phase, then expires before the following unsuspend phase.
- Q3849 is proved with an already-suspended target: suspension cannot change its state, but the same target still receives the unsuspend restriction.
- Public alternate evolution from non-green NSp EX7-018 pays 3, draws exactly, preserves top/under identity, and locks the selected opponent.
- A wrong-color non-NSp level 4 is rejected without memory, draw, hand, or stack mutation.
- The live observer sees the granted Dinosaur trait.
- Three public battles across a real intervening opponent turn trash the exact top Security once in the first turn, refuse the second same-turn trigger, then trash the next exact Security after re-arming.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-035 --json` — Q3849 returned; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-035.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-036 — Zephagamon

#### Result

Score: **8/10 provisional**. All eight focused tests pass with public evolution, attack, Vortex, and Security evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, text, keywords, rule trait, and absence of card-specific Q&A/errata are recorded. |
| Compiled IR | 2/2 | Security Attack +1, Vortex, both suspend/conditional-return timings, exact filters/destination, Bird Dragon grant, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public evolution and attack branches, causal own/opponent/already-suspended boundaries, Vortex, two Security checks, and live trait are green. |
| Peer/stack proof | 2/2 | Exact evolution payment/draw/top/under identity, exact deck-bottom order/identity, wrong-color rejection, and distinct own/opponent peers are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public evolution from EX7-035 pays exactly 4, draws the exact card, preserves top/under identity, suspends an own ally, and moves the exact suspended opponent to the bottom behind the existing deck card.
- Choosing the opponent for suspension does not bottom-deck it because no own Digimon was suspended.
- Choosing an already-suspended own Digimon likewise does not satisfy the causal clause, so the opponent remains.
- A real end-of-turn Vortex attack legally targets and deletes an initially unsuspended opponent.
- A public player attack performs exactly two Security checks through Security Attack +1.
- The live observer sees Bird Dragon as an effective trait.
- A non-green level 5 evolution is rejected without memory, draw, hand, or stack mutation.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-036 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-036.test.ts --maxWorkers=1 --no-file-parallelism` — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-037 — Tlalocmon

#### Result

Score: **8/10 provisional**. All six focused tests pass with public DNA, ordinary evolution, free-play, and attack evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, text, Q3850, four DNA combinations, and absence of errata/banlist entry are recorded. |
| Compiled IR | 2/2 | Exact normal/DNA free-play branches, NSp/cost/color filters, scaled DP modifier, shared OPT, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public DNA and normal evolution branches, two/one free plays, color distinction, scaling, and evolution-to-attack shared frequency are green. |
| Peer/stack proof | 2/2 | Exact DNA/ordinary costs, draws, combined stacks, invalid combinations/routes, and multiple NSp/color/count peers are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Q3850's Green level 6 + Black level 6 combination DNA evolves for 0, combines exact material identities, unsuspends the result, draws exactly, and plays Blue and Yellow NSp cards with distinct colors.
- The resulting three own Digimon scale the When Digivolving modifier to -21000 DP.
- Green + Yellow is rejected as two first-group materials without memory, hand, board, or stack mutation.
- Ordinary evolution pays exactly 6, plays only one eligible NSp, scales from exactly two own Digimon, and consumes the shared once-per-turn identity so the following attack does not reduce again.
- A standalone public attack with three own Digimon applies exactly -21000 DP.
- A Purple level 6 ordinary source is rejected without payment, draw, hand, or stack mutation.
- No injected timing, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-037 --json` — Q3850 returned; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-037.test.ts --maxWorkers=1 --no-file-parallelism` — **6 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-038 — Gotsumon

#### Result

Score: **8/10 provisional**. All five focused tests pass with public evolution, blocking, attack, and real-turn Reboot evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, two printed routes, NSp alternate route, keywords, and absence of Q&A/errata are recorded. |
| Compiled IR | 2/2 | Exact Blocker and inherited Reboot keywords, alternate route, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public Blocker redirection/combat and inherited Reboot during the opponent's turn are green. |
| Peer/stack proof | 2/2 | Blue NSp Digi-Egg evolution pays 0 with exact draw/stack; red non-NSp rejection and public level-4 host evolution are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A real opponent player attack opens the block window; Gotsumon redirects it, wins combat, remains suspended, and preserves Security.
- A blue P-148 NSp Digi-Egg proves the trait route independently of printed Black/Green colors, with exact zero payment, draw, top, and under identity.
- Red non-NSp EX7-001 is rejected without memory, draw, hand, or stack mutation.
- Public evolution into EX7-041 carries Gotsumon's inherited Reboot, a public attack suspends that stack, and the real opponent turn unsuspends it.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-038 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-038.test.ts --maxWorkers=1 --no-file-parallelism` — **5 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-039 — Jazamon

#### Result

Score: **8/10 provisional**. All eight focused tests pass with public Main-start, evolution, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, Black/Red routes, text, rule trait, inherited timing, and absence of Q&A/errata are recorded. |
| Compiled IR | 2/2 | Exact Rock/Earth cost filter, optional abort, mandatory draw/memory continuation, trait grant, opponent-turn modifier, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Both trait arms, refusal, no-eligible boundary, single-prompt behavior, live trait, and owner/opponent/owner DP transitions are green. |
| Peer/stack proof | 2/2 | Exact red-route zero payment/draw/stack, blue rejection, Rock/Earth/nonqualifying peers, and realistic inherited host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real Start-of-Main flows independently trash Rock Dragon and Earth Dragon cards, draw the exact deck card, gain exactly 1 memory, and create exactly one optional prompt.
- Declining leaves cost/deck/memory untouched; having no eligible cost creates no prompt and also leaves state untouched.
- Public evolution from the printed Red Digi-Egg route costs 0 and preserves exact draw/top/under identity; a Blue Digi-Egg is rejected without mutation.
- The live observer sees Machine Dragon as an effective trait.
- A real owner/opponent/owner turn sequence proves the inherited host changes 5000→7000→5000 DP only during the opponent's turn.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-039 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-039.test.ts --maxWorkers=1 --no-file-parallelism` — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-040 — ToyAgumon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, and real-turn inherited-keyword evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, printed evolution route, alternate text route, On Play cost, and inherited keyword are recorded; there is no card-specific Q&A, errata, or banlist entry. |
| Compiled IR | 2/2 | Exact trait cost filter, optional abort, Draw 2, inherited Reboot, full coverage, empty residual, and text-based evolution requirement are asserted. |
| Observable behavior | 2/2 | Public play proves exact payment/draw, decline, no-eligible/no-prompt, and inherited Reboot through a real attack and opponent turn. |
| Peer/stack proof | 2/2 | Exact successful level-2 evolution draw/stack and a nonmatching level-2 rejection without mutation are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play trashes exactly one Three Musketeers-trait card, draws the two exact deck instances, pays exactly 3 memory, and raises one optional prompt.
- Declining preserves the eligible card and deck; a hand without an eligible cost card produces no prompt and no draw.
- Public alternate evolution from EX7-005 costs 0 and preserves exact top/under/draw identity; P-148 is rejected without payment, draw, or stack mutation.
- The catalog currently has no off-color level 2 whose text contains `Three Musketeers`: EX7-005 is also Black. Therefore the positive behavioral route overlaps the printed color route; the exact alternate requirement assertion plus the off-color negative make that limitation reproducible rather than claiming an isolated positive peer.
- Public evolution onto EX7-041 exposes inherited Reboot, and a real attack/turn transition proves the host unsuspends during the opponent's unsuspend phase.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-040 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-040.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in executable card behavior. The positive alternate-evolution catalog peer overlaps the normal Black route as documented above. The score remains provisional until collection-wide delivery gates pass.

### EX7-041 — Tortomon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public combat, card-effect, evolution, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, routes, text, inherited keyword, and Q3851 are recorded. |
| Compiled IR | 2/2 | Exact Blocker, opponent-turn effect-deletion protection, inherited Reboot, full coverage, empty residual, and NSp route are asserted. |
| Observable behavior | 2/2 | Real Blocker combat, actual opponent-effect deletion prevention, Q3851 rule deletion, and inherited Reboot across a real turn are green. |
| Peer/stack proof | 2/2 | Off-color NSp evolution has exact cost/draw/stack evidence; an off-color non-NSp peer is rejected without mutation. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Tortomon redirects an opponent's player attack with Blocker, survives the battle, and preserves Security.
- During the opponent's turn, a publicly played EX7-012 cannot delete Tortomon with its On Play effect.
- Q3851 is reproduced publicly: two EX7-026 On Play effects reduce Tortomon from 4000 to 0 DP, and rule processing deletes it despite effect-deletion protection.
- Public alternate evolution from blue NSp EX7-015 pays exactly 2 memory and preserves exact top/under/draw identity; red non-NSp BT1-009 is rejected without mutation.
- Public evolution onto BT10-064 exposes inherited Reboot, and a real attack/turn transition proves the host unsuspends during the opponent's unsuspend phase.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-041 --json` — Q3851 present; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-041.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-042 — Jazardmon

#### Result

Score: **8/10 provisional**. All ten focused tests pass after correcting an unreachable `zoneCount` condition in the compiled IR.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, Black/Red routes, both effects, inherited timing, and absence of card-specific rulings are recorded. |
| Compiled IR | 2/2 | Exact trait-cost Draw 2, Hina name/zone/count condition, optionality, inherited modifier, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Both cost traits, refusal, Hina at zero/one Tamers, two-Tamer exclusion, Hina refusal, and owner/opponent/owner DP transitions are public and green. |
| Peer/stack proof | 2/2 | Exact red evolution cost/draw/stack, off-color rejection, Rock/Earth peers, Hina identity, and realistic inherited host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play flows independently trash Rock Dragon and Earth Dragon peers, draw the exact two deck instances, and pay exactly 5 memory; decline preserves hand and deck.
- Public evolution pays exactly 2 memory, preserves exact top/under/draw identity, and plays exact Hina Kurihara with zero or one existing Tamer.
- With two Tamers the effect creates no optional decision and leaves Hina in hand; declining at the legal boundary also preserves Hina while the evolution and standard draw complete.
- The printed Red route is green and an off-color Blue level-3 route is rejected without memory, deck, or stack mutation.
- A real owner/opponent/owner turn sequence proves the inherited host changes 5000→7000→5000 DP only during the opponent's turn.
- The former IR placed `zone` and `controller` inside the `zoneCount.filter`; the interpreter requires top-level `seat` and `zone`. The card now follows the proven EX7-009 peer shape, making its When Digivolving clause executable.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-042 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-042.test.ts --maxWorkers=1 --no-file-parallelism` — **10 passed**.
- `pnpm effects:sync:set -- --set EX7 --base 014a6a2fb79e1ad5dbca320d70cf02a3943d3fa8` and matching check — 74 records synchronized; zero changes outside EX7.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-043 — Tankmon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, link-rule, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, both timings, inherited keyword, Q3852, and Q4558 are recorded. |
| Compiled IR | 2/2 | Exact mixed-zone Three Musketeers cost, optional abort, De-Digivolve boundary, inherited Reboot, full coverage, empty residual, and text route are asserted. |
| Observable behavior | 2/2 | Public On Play/When Digivolving, mixed-zone payment, refusal, insufficient-cost boundary, Q4558 link disposal, and inherited Reboot are green. |
| Peer/stack proof | 2/2 | Exact evolution cost/draw/stack, linked Shotmon peer, off-color rejection, three cost peers, and realistic inherited host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Q3852 is exercised publicly with one Three Musketeers card from hand and two from trash; all three exact instances move above the pre-existing deck top before the opponent stack loses exactly one top card.
- Declining preserves hand, trash, deck, and the opponent stack; with only two qualifying cards no optional prompt is created.
- Public alternate evolution pays exactly 2 memory, preserves exact top/under/draw identity, pays the same mixed-zone effect cost, and de-digivolves the opponent.
- Q4558 is reproduced in that evolution: Shotmon starts linked to an Appmon host and is moved to trash when Tankmon makes the host fail Shotmon's link requirement.
- An off-color level 3 without Three Musketeers text is rejected without payment, draw, or stack mutation.
- Public evolution onto BT10-064 exposes inherited Reboot; a real attack and turn transition proves the host unsuspends during the opponent's unsuspend phase.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-043 --json` — Q3852 and Q4558 mapped; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-043.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-044 — Gigadramon

#### Result

Score: **8/10 provisional**. All eight focused tests pass; the former reveal-rest red was an illegal Digi-Egg fixture.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, both timings, inherited Collision, and Q4578 are recorded. |
| Compiled IR | 2/2 | Exact RevealAdd/place-under, conditional deletion, destination choice, inherited keyword, full coverage, empty residual, and text route are asserted. |
| Observable behavior | 2/2 | Public placement/deletion, exact reveal-rest destination/order, no-match boundary, Q4578, and Collision are green. |
| Peer/stack proof | 2/2 | Off-color alternate evolution, exact cost/draw/stack, invalid route, Shotmon link peer, Digimon/Tamer targets, and inherited combat host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play reveals four, places the exact Three Musketeers Option beneath Gigadramon, pays exactly 7 memory, and conditionally deletes a play-cost-3 Digimon.
- Public alternate evolution from red EX7-010 pays exactly 3 memory, preserves exact top/under/draw identity, places the Option at the bottom of the stack, and deletes a qualifying Tamer.
- A no-match reveal leaves the opponent untouched and creates no optional prompt; an off-color level 4 without Three Musketeers text is rejected without mutation.
- Q4578 is reproduced: public evolution from Appmon BT21-059 into Gigadramon trashes linked BT21-054 Shotmon when the new host no longer satisfies its link requirement.
- Inherited Collision makes an ordinary opposing Digimon eligible and mandatory to block, rejects decline, and resolves the declared block without a Security check.
- The destination/order scenario uses legal main-deck Digimon and proves all three nonselected cards return to the selected deck bottom in the chosen order.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-044 --json` — Q4578 mapped; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-044.test.ts src/engine/mechanic.test.ts --maxWorkers=1 --no-file-parallelism` — **126/126 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

- BT1-001 through BT1-004 are Digi-Eggs and cannot legally occupy the main deck. Rule processing removed them, which the former expected failure misidentified as RevealAdd loss.
- Replacing them with neutral BT1 Digimon makes the unchanged RevealAdd/place-under lifecycle fully observable and green. No engine change was required.
- The score remains provisional until collection-wide delivery gates pass.

### EX7-045 — Jagamon

#### Result

Score: **8/10 provisional**. All five focused tests pass with public play, evolution, combat, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, On Play, opponent-turn aura, and absence of card-specific rulings are recorded. |
| Compiled IR | 2/2 | Exact De-Digivolve boundary, all-own-NSp Blocker grant, timing, full coverage, empty residual, and NSp route are asserted. |
| Observable behavior | 2/2 | Public De-Digivolve and real opponent-turn attack/block behavior prove both printed clauses and owner-turn exclusion. |
| Peer/stack proof | 2/2 | Off-color NSp evolution has exact cost/draw/stack evidence; off-color non-NSp rejection and NSp/non-NSp combat peers are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play pays exactly 7 memory and trashes exactly the top card of an opposing two-card stack, stopping at the exposed level 4.
- Public alternate evolution from blue NSp EX7-018 pays exactly 3 memory and preserves exact top/under/draw identity.
- Red level-4 non-NSp BT1-015 is rejected without payment, draw, or stack mutation.
- A real owner-to-opponent turn transition proves EX7-028 gains Blocker only during the opponent's turn while non-NSp EX7-011 does not.
- During the opponent's public player attack, the NSp peer appears in the eligible blocker set, redirects the attack, wins combat, and preserves Security.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-045 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-045.test.ts --maxWorkers=1 --no-file-parallelism` — **5 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-046 — Jazarichmon

#### Result

Score: **8/10 provisional**. All three focused scenarios pass with public play, evolution, attack, and multi-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, Black/Red routes, On Play, conditional evolution effect, inherited trigger, and absence of card-specific rulings are recorded. |
| Compiled IR | 2/2 | Exact De-Digivolve, level-5 absence predicate, memory gain, opponent-attack subtrigger, optional redirect, shared frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public De-Digivolve, both condition branches, first/second attack behavior, and next-opponent-turn reset are green. |
| Peer/stack proof | 2/2 | Red and Black evolution peers, exact payment/draw/stack, level-4/level-5 opponent boundaries, and realistic inherited combat host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play pays exactly 7 memory and removes exactly one top card from an opposing evolution stack.
- Public Red-route evolution from EX7-010 pays 3, draws the exact deck card, preserves the exact source stack, and nets 1 memory when the opponent has no level 5 or higher Digimon.
- The equivalent Black-route evolution with an opposing level 5 pays the full 3 and gains no memory.
- In a real turn loop, the inherited host redirects the first opponent player attack and defeats that attacker; the second same-turn attack reaches Security.
- After a complete opponent/owner/opponent cycle, the inherited once-per-turn effect rearms and redirects a third attack without losing another Security card.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-046 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-046.test.ts --maxWorkers=1 --no-file-parallelism` — **3 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-047 — Eldradimon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, Blocker combat, and real end-of-turn DNA evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, Blocker, both reveal timings, DNA clause, and absence of card-specific rulings are recorded. |
| Compiled IR | 2/2 | Exact cost-7 reveal budget, NSp filters, free play/rest destination, hand-only two-material DNA, optionality/frequency, full coverage, and empty residual are asserted. |
| Observable behavior | 2/2 | Public On Play/When Digivolving reveal budgets, real Blocker combat, real End of Turn DNA, and no-target DNA boundary are green. |
| Peer/stack proof | 2/2 | Off-color NSp evolution, exact cost/draw/stack, non-NSp rejection, mixed reveal peers, and legal Blue+Black DNA materials are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play pays the full 12, plays exact NSp cost-3 and cost-4 peers for a total of 7, rejects a cost-7 third selection that would exceed the budget, and bottoms the nonselected/miss cards in exact order.
- Public alternate evolution from yellow NSp EX7-028 pays exactly 3, preserves exact top/under/draw identity, and runs the same cost-7 reveal branch.
- A red level-5 non-NSp source is rejected without payment, draw, or stack mutation.
- Eldradimon publicly blocks an opponent's player attack, survives combat, and preserves Security.
- A real End of Turn trigger DNA digivolves Blue and Black level-5 materials into NSp BT18-041 from hand, preserves both material identities in the resulting stack, and leaves Eldradimon as the other permanent.
- Without an NSp Digimon in hand, the real End of Turn creates no optional prompt and leaves all three permanents unchanged.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-047 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-047.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-048 — Gundramon

#### Result

Score: **8/10 provisional**. All eight focused tests pass with public reveal/use, evolution, replacement, link-rule, and combat evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, Blocker, both reveal timings, global replacement, and Q4585 are recorded. |
| Compiled IR | 2/2 | Exact reveal/useOption filter, free use/rest choice, replacement source/cause/cost scopes, full coverage, empty residual, and text route are asserted. |
| Observable behavior | 2/2 | Public On Play/When Digivolving Option use, no-match, global protection, non-trait exclusion, Q4585, and Blocker combat are green. |
| Peer/stack proof | 2/2 | Off-color text evolution, exact cost/draw/stack, EX7-066 execution/rest order, protected/nonprotected peers, Shotmon, and combat peers are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play pays 12, reveals six, uses EX7-066 without paying its cost, deletes the exact 9000-DP target, places the used Option under Gundramon, and returns all five misses to the chosen deck top in exact order.
- Public alternate evolution from red EX7-011 pays exactly 4, preserves the exact source/draw identities, then runs the same free Option use after the standard evolution draw.
- A six-card reveal without a Three Musketeers Option leaves the opponent untouched and returns every revealed card.
- An opponent's publicly played EX7-012 attempts to delete EX7-059; Gundramon's global replacement trashes its exact under-stack Option and preserves the other Three Musketeers Digimon.
- The same public deletion removes a non-Three-Musketeers peer and leaves Gundramon's Option unspent.
- Q4585 is reproduced with BT21-073: evolution into Gundramon trashes linked Shotmon after the link requirement becomes invalid.
- Gundramon publicly blocks an opponent's player attack, survives combat, and preserves Security.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-048 --json` — Q4585 mapped; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-048.test.ts --maxWorkers=1 --no-file-parallelism` — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. Successful `useOption` returns its reveal remainder correctly, narrowing EX7-044's retained defect to the `placeUnder` branch. The score remains provisional until collection-wide delivery gates pass.

### EX7-049 — Metallicdramon

#### Result

Score: **8/10 provisional**. All nine focused tests pass, including Q3855's future entrant and Q3853's immunity exception.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, both evolution routes, De-Digivolve 4, evolution restriction, leave replacement, and Q3853-Q3856/Q6719 are recorded. |
| Compiled IR | 2/2 | Both De-Digivolve timings, battle-area level filter, opponent-turn duration, leave cause, replacement play filter, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public play, evolution, attack, replacement, immunity, breeding, future entrant, and expiry flows are green. |
| Peer/stack proof | 2/2 | Exact red-route payment/draw/stack, level-3 stop, immune and breeding peers, Rock Dragon replacement, and DigiXros interaction are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play pays 13 and De-Digivolves an opposing four-card stack to its exposed level 3.
- Public red evolution pays exactly 5, preserves the source, performs the standard draw, and restricts only the opposing battle-area target.
- A public attack also De-Digivolves exactly four and stops at level 3.
- Q3853 is reproduced: an effect-immune level 4 can evolve despite the restriction.
- Q3854 and duration are reproduced through a real turn loop: breeding evolution remains legal, an existing battle-area level 4 is restricted, and that restriction expires at the end of the opponent's turn.
- Q3855 is reproduced: a level 4 played after resolution immediately receives the live restriction and cannot evolve; the same legal evolution pair succeeds after expiry.
- An opposing card effect deletes Metallicdramon and its optional replacement publicly plays a Rock Dragon from trash without paying the cost.
- Q3856/Q6719 are reproduced through a public EX3-014 DigiXros declaration: Metallicdramon's departure replacement plays the Rock Dragon, but the newly played card is not added to the already-declared materials.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-049 --json` — Q3853-Q3856 and Q6719 mapped; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-049.test.ts src/engine/effects/interpreter/processingCondition.test.ts --maxWorkers=1 --no-file-parallelism` — **10/10 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

Metallicdramon now marks its all-target restriction as live. The interpreter records a duration-scoped player predicate that evaluates current and future permanents and excludes recipients immune to the source Digimon effect. Collection delivery gates remain pending.

### EX7-050 — Impmon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public evolution and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, two standard routes, Yaamon route, both trait branches, inherited DP, and Q3857 are recorded. |
| Compiled IR | 2/2 | Battle-area self scope, trait union, cost reduction, inherited modifier, alternate requirement, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public Dark Dragon/Evil Dragon/negative evolutions, Yaamon evolution, Q3857, and inherited owner-turn DP are green. |
| Peer/stack proof | 2/2 | Both printed colors and traits, nonmatching Greymon, Yaamon, exact costs/draw/source identities, breeding boundary, and a real opponent turn are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public evolutions into BT11-079 and BT12-010 prove the Evil Dragon/Dark Dragon union and each pay 1 instead of the printed 2.
- A public evolution into nonmatching BT1-015 pays the full printed 2.
- The explicit alternate-cost choice evolves EX7-050 from Yaamon for 0, preserves the exact source, and performs the standard draw.
- A public evolution builds BT11-079 over EX7-050; the inherited +2000 DP is present on the owner's turn and absent during the opponent's real Main phase.
- Q3857 is reproduced: evolution from breeding pays the full cost because the Your Turn effect cannot activate there.
- No injected timing, manual recompute, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-050 --json` — Q3857 mapped; no errata or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-050.test.ts --reporter=verbose` from `apps/api` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-051 — Sparrowmon

#### Result

Score: **8/10 provisional**. All six focused tests pass with public Start-of-Main, evolution, and battle evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, standard and text-based routes, Start-of-Main cost/draw, and inherited Retaliation are recorded. |
| Compiled IR | 2/2 | Hand/trash Option filter, own-Digimon host, bottom placement, optional abort, draw, alternate requirement, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Real Start-of-Main hand/trash payments, refusal, alternate evolution, invalid route, and Retaliation combat are green. |
| Peer/stack proof | 2/2 | Qualifying EX7-005, nonqualifying EX7-001, exact evolution draw/source, pre-existing host source, EX7-066, and stronger combat peer are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real Start-of-Main flows place EX7-066 from either hand or trash under one owned Digimon, preserve its position below an existing source, and draw the exact top card.
- Declining the optional cost leaves the Option in hand, leaves the deck top untouched, and adds no source.
- The explicit alternate route evolves from black EX7-005 because its inherited text contains Three Musketeers, costs 0, preserves the exact source, and performs the standard draw.
- The same alternate request from red EX7-001 is rejected because its text does not contain Three Musketeers.
- A public attack with EX7-051 inherited beneath a weaker host deletes that host in battle, then Retaliation deletes the stronger opposing Digimon.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-051 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-051.test.ts --reporter=verbose` from `apps/api` — **6 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-052 — Tsukaimon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, attacks, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, reveal split, inherited cost/attack ending, once-per-turn, and Q3858-Q3860 are recorded. |
| Compiled IR | 2/2 | Reveal filters/destinations/rest, opponent-attack subtrigger, other-Digimon deletion cost, EndAttack, frequency, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public On Play, evolution, Q3858-Q3860, same-turn suppression, and next-opponent-turn reset are green. |
| Peer/stack proof | 2/2 | Exact reveal identities/order, legal purple and illegal red level-2 stacks, Armor Purge, immune attacker, multiple attackers, and deletion fodder are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play pays 3, reveals three, adds the exact Lilithmon-text card, trashes the exact purple card, and bottoms the remaining reveal behind the unrevealed deck card.
- Public zero-cost evolution from purple EX7-006 preserves the exact source and performs the standard draw; red EX7-001 is rejected.
- The inherited effect publicly deletes another owned Digimon and ends an opponent's player attack before Security changes.
- Q3858 is reproduced with Armor Purge: because deletion is prevented, the cost is not paid and the attack succeeds.
- Q3859 is observed through unchanged Security when the attack ends before counter/block/success.
- Q3860 is reproduced with BT15-047: the attack ends after it becomes effect-immune because EndAttack changes timing rather than affecting the Digimon.
- A real multi-turn flow ends only the first attack of one opponent turn, allows the second through, and rearms for the next opponent turn.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-052 --json` — Q3858-Q3860 mapped; no errata or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-052.test.ts --reporter=verbose` from `apps/api` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-053 — Eyesmon: Scatter Mode

#### Result

Score: **8/10 provisional**. All eight focused tests pass with public play, evolution, and battle evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, On Play sequence, three-trait union, optional return, and inherited Retaliation are recorded. |
| Compiled IR | 2/2 | Mandatory hand trash, owned-trash Digimon trait filter, optional hand return, inherited keyword, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public play for all trait branches, refusal, newly discarded return, evolution, and Retaliation combat are green. |
| Peer/stack proof | 2/2 | Evil/Dark Dragon/Evil Dragon peers, neutral discard, exact payment/draw/source, neutral purple base, and stronger combat peer are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Three public play scenarios pay 4, trash the exact hand card, and return an Evil, Dark Dragon, or Evil Dragon Digimon respectively.
- Declining the optional return still pays the mandatory hand-trash cost and leaves the eligible card in trash.
- The return selection is evaluated after the mandatory trash, allowing an eligible Digimon just discarded by the same effect to return to hand.
- Public evolution from neutral purple BT10-071 pays exactly 2, preserves the source, and performs the standard draw.
- A public attack with EX7-053 beneath a weaker host deletes the host in battle, then Retaliation deletes the stronger opponent.
- No injected timing, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-053 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-053.test.ts --reporter=verbose` from `apps/api` — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-054 — BlackGatomon

#### Result

Score: **8/10 provisional**. All six focused tests pass with public evolution, deletion, attacks, and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, both main timings, paid paired keywords/duration, inherited attack ending, and Q3861-Q3863 are recorded. |
| Compiled IR | 2/2 | Same-target conditional keywords, hand cost, duration, inherited other-Digimon delete cost, EndAttack, frequency, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public evolution/deletion grants, duration expiry, Q3861-Q3863, same-turn suppression, and next-opponent-turn reset are green. |
| Peer/stack proof | 2/2 | Exact neutral-purple evolution stack, battle deletion, Armor Purge, immune attacker, multiple attackers/fodder, and real turns are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public evolution from neutral purple BT10-071 pays exactly 2, preserves the source, performs the standard draw, pays the exact hand cost, and grants Blocker plus Retaliation to the same target.
- Both granted keywords remain during the opponent's turn and expire after that opponent turn ends.
- Public battle deletion of BlackGatomon pays the hand cost and grants both keywords to another owned Digimon.
- Q3861 is reproduced with Armor Purge: prevented deletion does not pay the inherited cost, so the attack proceeds and checks Security.
- Q3862 is observed through an ended attack that leaves Security unchanged.
- Q3863 is reproduced with BT15-047: its immune attack still ends because the effect changes timing.
- A real multi-turn flow consumes the inherited effect on the first attack, allows the second attack through, and rearms on the next opponent turn.
- No injected timing, manual deletion verb, legacy `registerCard`, diagnostic output, or Digi-Egg Security fixture remains.

#### Verification

- `node tools/kb/query.mjs card EX7-054 --json` — Q3861-Q3863 mapped; no errata or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-054.test.ts --reporter=verbose` from `apps/api` — **6 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-055 — Punkmon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public evolution and real-turn evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, standard/alternate routes, Tamer threshold, optional Yuuki play, and inherited DP are recorded. |
| Compiled IR | 2/2 | Exact-name hand filter, free play, zero/one-Tamer condition, Evil route, inherited modifier, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public zero/one/two-Tamer evolutions, refusal, alternate route, invalid route, and inherited turn transition are green. |
| Peer/stack proof | 2/2 | Neutral purple base, Evil base, off-color non-Evil base, exact source/draw/payment, Tamer peers, Yuuki, and level-5 host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public standard evolutions with zero and one Tamer pay exactly 3, preserve the source, perform the standard draw, and play exact-name EX7-065 Yuuki free.
- The same evolution with two Tamers leaves Yuuki in hand.
- Declining the optional free play leaves Yuuki in hand even when the threshold is met.
- The explicit Evil alternate route from BT2-067 pays exactly 2 with exact draw/stack; a non-Evil off-color level 3 is rejected.
- Public evolution into BT1-020 carries EX7-055 beneath the host: it has +2000 DP on the controller's turn and loses the bonus in the opponent's real Main phase.
- No injected timing, manual recompute, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-055 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-055.test.ts --reporter=verbose` from `apps/api` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-056 — Orochimon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public evolution, battle, blocking, and protection evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, Blocker, mandatory On Deletion sequence, level targets, and inherited Retaliation are recorded. |
| Compiled IR | 2/2 | Static/inherited keywords, hand trash, separate level-3/4 deletes, opponent filters, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public battle deletion, protected target, evolution, Blocker redirection, and inherited Retaliation combat are green. |
| Peer/stack proof | 2/2 | Exact neutral-purple evolution stack, level 3/4/5 peers, Tortomon, block combat, stronger Retaliation peer, and multi-source host are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Orochimon publicly attacks a stronger suspended Digimon, is deleted in battle, trashes the exact hand card, and deletes exactly one opposing level 3 and level 4 while leaving level 5 untouched.
- The same causal flow with Tortomon opens and publicly declines its block window; Orochimon dies, the level 3 is deleted, and Tortomon survives its opponent-effect deletion protection.
- Public evolution from purple EX7-053 pays exactly 3, preserves the source, and performs the standard draw.
- Orochimon publicly blocks a player attack and wins the redirected battle.
- EX7-056 inherited beneath a weaker host exposes Retaliation; a public attack deletes both the host and stronger opponent.
- No injected timing, manual deletion verb, legacy `registerCard`, diagnostic output, or Digi-Egg hand fixture remains.

#### Verification

- `node tools/kb/query.mjs card EX7-056 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-056.test.ts --reporter=verbose` from `apps/api` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-057 — Loudmon

#### Result

Score: **8/10 provisional**. All seven focused tests pass with public play, evolution, and Security battle evidence.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, standard/alternate routes, both main timings, rule trait, and inherited aura are recorded. |
| Compiled IR | 2/2 | Two-card trash, 7000-DP delete, rule grant, trait-union alternate route/aura, hand threshold, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public play/evolution, exact DP boundary, trait grant, route matrix, and real one/two Security checks are green. |
| Peer/stack proof | 2/2 | Dark Dragon/Evil Dragon/red-standard bases, exact costs/draw/sources, 7000/8000 peers, matching/nonmatching aura targets, and four/five-card hands are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public play pays 7, trashes exactly two hand cards, deletes the 7000-DP opponent, and leaves the 8000-DP peer.
- Loudmon exposes Dark Dragon through its Rule trait.
- Public alternate evolution from Dark Dragon EX7-053 pays exactly 3, preserves the source, draws, trashes two, and deletes the exact target.
- The same cost-3 route is independently green from Evil Dragon BT11-079; standard red evolution from BT1-015 pays exactly 4.
- With four hand cards, EX7-057 inherited beneath a Dark Dragon host grants Security Attack +1 and the public attack performs two checks; a nonmatching peer gets no bonus.
- With five hand cards, the same public attack performs only one check.
- No injected timing, manual zone mutation/recompute, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-057 --json` — no card-specific Q&A, errata, or banlist entry.
- `pnpm exec vitest run src/cards/EX7/EX7-057.test.ts --reporter=verbose` from `apps/api` — **7 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Retained seams

None found in the audited behavior. The score remains provisional until collection-wide delivery gates pass.

### EX7-058 — LadyDevimon (X Antibody)

#### Result

Score: **8/10 provisional**. All seven focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, alternate route, both entry effects, token, inherited watcher, and Q3864-Q3865 are recorded. |
| Compiled IR | 2/2 | Grant/duration, token source condition, exact token identity, LadyDevimon route, inherited filter/play/frequency, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public evolution/play/attacks, Q3864-Q3865, inherited play, and both printed token keywords are green. |
| Peer/stack proof | 2/2 | LadyDevimon source, exact stack/draw, ordinary/immune/Partition attackers, token stats, and two-deletion inherited boundary are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public alternate evolution from EX6-053 LadyDevimon costs 0, preserves the exact source, performs the standard draw, and plays the exact Volée & Zerdrücken token with level 4, purple color, and 5000 DP.
- The created token exposes its printed Blocker and Retaliation through the live keyword reader.
- Public On Play pays 8, grants one opponent, and a real opponent turn deletes only that recipient at the end of its attack.
- Q3864 is reproduced: BT15-047 receives the grant, becomes immune when attacking, performs the Security check, and survives because the gained effect does not trigger while immune.
- Q3865 is reproduced: AD1-011 deletes itself through the granted effect after attacking; Partition does not replay its materials and the entire stack enters trash.
- EX7-058 inherited beneath a public host sees two opponent Digimon deleted in battle during one real opponent turn, plays exactly one purple level-4 card free, and leaves the second eligible card in trash due to once-per-turn.
- No injected timing, internal continuous inspection, manual phase/turn mutation, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-058 --json` — Q3864-Q3865 mapped; no errata or banlist entry.
- Focused EX7-058 plus interaction/keyword mechanism suites — **145 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolved seam

The engine now binds `ContinuousEffectLedger` to the existing printed-keyword parser for each live top card and inherited stack. The canonical token definition was already correct; its Blocker and Retaliation are now visible through the same live keyword API used by synchronized observers. See `TOKEN-PRINTED-KEYWORD-MECHANISM.md`.

### EX7-059 — BeelStarmon

#### Result

Score: **8/10 provisional**. All eleven focused tests pass, including Q6391's text-qualified Tamer Blast base.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, ACE stats, routes, three timings, costs, optionality, Overflow, and Q6391 are recorded. |
| Compiled IR | 2/2 | Blast, return/use sequencing, trait filters, own-stack Option cost, frequency, alternate route, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public play/evolution/attack/Blast/Overflow flows and Q6391 are green. |
| Peer/stack proof | 2/2 | Exact EX7-044 stack, recovered/used EX7-066, other-stack negative, public Counter, Tamer peer, and ACE battle departure are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public On Play pays 6, returns EX7-066 from trash, uses it free, deletes its target, and places the used Option beneath BeelStarmon; refusal keeps the recovered Option in hand.
- Public text-based evolution from EX7-044 pays exactly 3, preserves the source, performs the standard draw, returns and uses EX7-066, and resolves its target deletion.
- Public attack trashes an Option from BeelStarmon's own stack, uses a hand EX7-066 free, and preserves memory; an Option beneath another Digimon cannot pay the cost.
- A real opponent attack opens Counter and Blast Digivolves EX7-059 from hand over eligible EX7-044 without changing memory.
- Q6391 is reproduced through the same public Counter flow over BT18-093, whose Tamer text contains Three Musketeers.
- Public battle deletion of the ACE charges Overflow 4, moving memory from 3 to -1.
- No injected timing, manual phase/turn mutation, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-059 --json` — Q6391 mapped; no errata or banlist entry.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-059.test.ts src/engine/blastDnaCounter.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts --maxWorkers=1 --no-file-parallelism` — **54/54 passed**.
- Scoped Oxlint, Oxfmt, forbidden-fixture scan, and `git diff --check` pass.

#### Resolution

Blast validation now ignores the level portion of an alternate requirement only when the base is a Tamer, while retaining its identity gates. BT18-093 must still contain Three Musketeers in its text; unrelated Tamers do not qualify. Collection delivery gates remain pending.

### EX7-060 — Nidhoggmon

#### Result

Score: **8/10 provisional**. All nine focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, stats, evolution route, trash hand-count condition, cost reduction, Blocker, deletion level/trait union, and optionality are recorded; the local KB maps no card-specific Q&A, errata, or restriction. |
| Compiled IR | 2/2 | Trash-resident Main activation, self target, paid play with reduction 4, hand boundary, Blocker, free deletion play, level ceiling, trait union, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public activation, evolution, blocking, and battle deletion flows prove every printed clause, exact costs, the boundary, refusal, zones, and free play. |
| Peer/stack proof | 2/2 | EX7-056 supplies a legal Purple level-5 stack and Dark Dragon target; BT11-079 proves Evil Dragon; EX7-062 and BT10-022 prove the level and trait exclusions. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- The client-visible trash activation appears with exactly four hand cards, plays Nidhoggmon for 7 memory, removes the same instance from trash, and can be declined without payment or movement; it is absent at five cards.
- Public evolution over EX7-056 pays exactly 3, performs the standard draw, and preserves the source stack.
- A real opposing attack opens the Blocker window; declaring Nidhoggmon redirects battle and deletes the attacker.
- Real battle deletion separately plays level-5-or-lower Dark Dragon and Evil Dragon candidates from trash without changing memory.
- Matching level-6 EX7-062 and nonmatching level-5 BT10-022 remain in trash, proving both filter boundaries.
- No injected timing, manual deletion verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-060 --json` — no Q&A, errata, or banlist mapping.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-060.test.ts --maxWorkers=1 --no-file-parallelism` — **9 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-060.

### EX7-061 — Lilithmon (X Antibody)

#### Result

Score: **8/10 provisional**. All 14 focused cases and 19 EX10-059 peer cases pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact identity, standard/named evolution routes, both All Turns once-per-turn effects, costs, turn branches, and Q3866/Q3867/Q5169 are recorded. |
| Compiled IR | 2/2 | Non-battle leave replacement, stack predicate union, other-Digimon deletion cost, single deletion subscription with both turn branches, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Public evolution, combat, Retaliation, Armor Purge, Option, Security, refusal, same-turn suppression, and real-turn reset flows prove every printed clause and ruling. |
| Peer/stack proof | 2/2 | Named Lilithmon and X Antibody sources, standard Purple level 5, illegal off-color source, EX7-056 Retaliation, EX7-066 mutual-replacement chain, and EX10-059 Q5169 interrupt all pass. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Exact alternate evolution over BT3-091 costs 1; standard Purple level-5 evolution costs 4. Both preserve the source and perform the standard draw, while an off-color non-Lilithmon source is rejected.
- Real battle deletion is not prevented. Retaliation deletion is prevented by deleting another Digimon when either a named Lilithmon or X Antibody trait source is present; missing-source and optional-refusal paths leave play.
- Q3866 is public: Armor Purge prevents the accepted deletion cost, so Lilithmon X still leaves.
- Q3867 is public: two Lilithmon X replacements target one another through an EX7-066 deletion chain; the already-used first replacement does not trigger again.
- On its controller's turn, another Digimon's battle deletion plays a Purple level 4 from trash free. On the opponent's turn, exactly the top Security card is trashed.
- Two same-turn deletions trigger only one response, and a real opponent-turn round trip rearms it on the next own turn.
- The IR was corrected so both turn-dependent outcomes live under the single `onDeletionOf` subscription. Before correction, repeated All-Turns evaluation trashed both opposing Security cards from one deletion.
- No injected timing, manual deletion verb, Digi-Egg Security fixture, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-061 --json` — Q3866, Q3867, and related Q5169 mapped; no errata or banlist entry.
- Focused EX7-061 plus EX10-059 peer suites — **33 passed**.
- `pnpm effects:sync:set` and `pnpm effects:check:set` — 74 EX7 records, three set-local semantic changes against base, zero changes outside EX7, synchronized.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-061.

### EX7-062 — HeavyMetaldramon

#### Result

Score: **8/10 provisional**. All 13 focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact dual-color identity, standard and trait evolution routes, mandatory hand trash, source-relative DP deletion, scaled play ceiling, trait union, optionality, and frequencies are recorded; the KB maps no card-specific Q&A, errata, or restriction. |
| Compiled IR | 2/2 | Both effects, exact filters/scaling, full coverage, empty residual, registration, and the restored Dark Dragon/Evil Dragon alternate route are asserted. |
| Observable behavior | 2/2 | Public evolution and production turn flows prove costs, draw/stack, hand payment, DP boundary, scaled ceilings, refusal, negatives, free play, and once-per-turn reset. |
| Peer/stack proof | 2/2 | EX7-056 and BT21-077 prove both alternate traits; Purple and Red standard peers, all three play traits, an over-ceiling near miss, and a cost-eligible trait miss are covered. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- The missing printed alternate evolution requirement was added: a level-5 Dark Dragon or Evil Dragon evolves for 4. Both branches pay exactly 4, preserve the source, perform the standard draw, trash exactly two chosen hand cards, delete an opposing 13000-DP Digimon, and preserve one at 13001 DP.
- Ordinary Purple and Red level-5 routes each pay exactly 5 and preserve the evolution stack; an off-color nonmatching source is rejected.
- Real End of Your Turn flows separately play Evil, Dark Dragon, and Evil Dragon cards exactly at the `8 - hand size` ceiling without paying their costs.
- A matching card one above the scaled ceiling opens no optional decision, and a cost-eligible nonmatching card stays in trash.
- Optional refusal leaves the candidate in trash. A full opponent-turn round trip proves the once-per-turn effect rearms on the next own End of Turn.
- The apparent over-ceiling failure was rejected as a fixture error: the first player skips the first-turn draw, so the original test had one fewer card in hand than claimed.
- No injected timing, manual effect verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-062 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-062 suite — **13 passed**.
- Effects sync/check — 74 EX7 records, four set-local semantic changes against base, zero changes outside EX7, synchronized.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-062.

### EX7-063 — Arisa Kinosaki

#### Result

Score: **8/10 provisional**. All 11 focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Tamer identity/cost, conditional Start of Main memory, deletion trigger, Token/Puppet union, suspension cost, level-3 Puppet play, optionality, and Security play are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Exact conditions, source/target filters, token allowance, suspension cost, free-play zones, Security self-play, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Real Start-of-Main, hand play, combat deletion, token combat, refusal, filter boundaries, and Security-check flows prove every clause, cost, and zone transition. |
| Peer/stack proof | 2/2 | BT11-035/BT13-035 prove Puppet deletion/play, a non-Puppet peer and EX7-025 prove both target exclusions, and TOKEN-Diaboromon proves the independent Token branch. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real turn entry gains exactly 1 memory when the opponent has a Digimon and gains none with an empty opposing field.
- Public hand play pays exactly 3 memory.
- An owned Puppet losing a real battle suspends Arisa and plays a level-3 Puppet from hand free. A non-Puppet deletion does not respond.
- An owned Diaboromon Token losing battle also triggers even though it lacks Puppet; the token disappears without entering trash.
- Optional refusal preserves Arisa unsuspended and the Puppet in hand.
- A level-3 non-Puppet and a level-4 Puppet are both rejected without paying the suspension cost.
- A real Security check removes the exact Arisa instance from Security and plays it without changing memory.
- No injected timing, manual deletion verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-063 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-063 suite — **11 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-063.

### EX7-064 — Shoto Kazama

#### Result

Score: **8/10 provisional**. All nine focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Tamer identity/cost, conditional memory, end-turn cost/keywords/duration/trait branch, Security play, Q3868/Q3869, and the EX2-007 banned pair effective 2025-03-28 are recorded. |
| Compiled IR | 2/2 | Exact condition, bound target, suspension cost, paired keyword grants, duration, Vortex Warriors unsuspend, Security self-play, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Real Start-of-Main, hand play, both end-turn trigger orders, duration round trip, refusal, and Security-check flows prove every printed clause. |
| Peer/stack proof | 2/2 | EX7-034 supplies the Vortex Warriors/Vortex interaction in both Q&A orders; a non-Vortex Digimon proves generic keyword eligibility and duration without the trait branch. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real turn entry gains exactly 1 memory with an opposing Digimon and none without one; public hand play pays exactly 3.
- Q3868 order: a suspended EX7-034 is selected, Shoto suspends, grants Piercing/Blocker, unsuspends it, then Vortex attacks.
- Q3869 order: Vortex attacks first, then the simultaneously triggered Shoto effect grants both keywords and unsuspends the attacker. Final orientations and Security counts distinguish the two orders.
- A non-Vortex target receives Piercing and Blocker through the opponent's turn; both expire after that turn ends.
- Optional refusal leaves Shoto unsuspended and grants no keyword.
- A real Security check plays the exact Shoto instance free without moving memory.
- Local banlist evidence records EX7-064 and EX2-007 as the prohibited pair effective 2025-03-28.
- No injected timing, manual suspension verb, private Main-phase cast, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-064 --json` — Q3868/Q3869 and banned-pair record mapped; no errata.
- Focused EX7-064 suite — **9 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-064.

### EX7-065 — Yuuki

#### Result

Score: **8/10 provisional**. All ten focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Tamer identity/cost, Start-of-Main condition, four-card Main boundary, suspension cost, trash evolution trait union/payment, optionality, and Security play are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Exact Main source/target zones, hand condition, Dark Dragon/Evil Dragon union, paid evolution, suspension cost, Security self-play, full coverage, empty residual, and registration are asserted. |
| Observable behavior | 2/2 | Real Start-of-Main, hand play, client-visible activation, trash evolution, refusal, hand/trait negatives, and Security-check flows prove every printed clause. |
| Peer/stack proof | 2/2 | EX7-056→EX7-060 and EX7-053→BT21-077 prove both trait branches with distinct levels/costs; BT10-022 proves the trait miss. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Real turn entry gains exactly 1 memory with an opposing Digimon and none without one; public hand play pays exactly 3.
- Yuuki’s Main action is discovered through the same activatable-effects payload exposed to clients, without private source/effect casts.
- At exactly four cards, the Dark Dragon route suspends Yuuki, moves EX7-060 from trash over EX7-056, pays exactly 3, draws, and preserves the source stack.
- The Evil Dragon route moves BT21-077 from trash over EX7-053, pays its exact catalog cost 4, draws, and preserves the source stack.
- At five cards the activation is absent. With no legal trait target it is also absent.
- Optional refusal preserves Yuuki unsuspended, the original top card, the trash target, and memory.
- A real Security check plays the exact Yuuki instance free without changing memory.
- No injected timing, private `cardSourceOf`/`effectsOf`, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-065 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-065 suite — **10 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-065.

### EX7-066 — Chaos Triangular

#### Result

Score: **8/10 provisional**. All eleven focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, trash-source buff and duration, Three Musketeers color waiver, distinct-name Main ceiling and placement, and Security ceiling are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Each printed clause maps to compiled IR, full coverage, empty residual, and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Option use, a real attack-cost digivolution-card trash, real turn progression, and real Security checks prove every printed clause and boundary. |
| Peer/stack proof | 2/2 | Mixed Three Musketeers names, repeated names, a nonmatching host, and EX7-059's real attack cost prove trait, stack, and distinct-name interactions. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- With a Three Musketeers Digimon in play, the red Option is usable without a red source; without that waiver it is rejected.
- Main deletes at the exact 9000 base ceiling plus 3000 per distinct Three Musketeers name, does not double-count repeated names, and places this Option under the chosen Three Musketeers Digimon.
- EX7-059 publicly attacks and trashes this card from its digivolution stack as its printed cost. A second publicly used copy grants the selected own Digimon +3000 through the opponent's turn and the modifier expires on the next own turn.
- Real Security checks delete an opposing 12000-DP Digimon and preserve a 12001-DP Digimon.
- Exact source/destination zones and card identities are asserted throughout.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-066 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-066 suite — **11 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-066.

### EX7-067 — Summon Frost

#### Result

Score: **8/10 provisional**. All ten focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost, all-opponent top-two trash, conditional Ice-Snow play, final restriction, Security activation, and Q3870 are recorded. |
| Compiled IR | 2/2 | All clauses map to ordered compiled actions with full coverage, empty residual, and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Option use, real turns, and a real Security check prove the trash, play, restriction, refusal, duration, and boundary clauses. |
| Peer/stack proof | 2/2 | Mixed opposing stacks plus level-3/5 Ice-Snow and level-3 non-Ice-Snow candidates prove stack, level, and trait behavior. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public Main use trashes the top two digivolution cards from every opposing stack and restricts both newly stackless and already-stackless opposing Digimon.
- If no digivolution card was trashed, a level-3 Ice-Snow Digimon may be played free. A level-5 Ice-Snow card and a level-3 non-Ice-Snow card remain in hand.
- The optional free play can be refused while the final restriction still resolves, matching Q3870's independent `Then` processing.
- The restriction remains through the opponent's turn and expires on the following own turn.
- A real Security check activates the same Main body and preserves the final restriction.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-067 --json` — Q3870 reconciled; no errata or banlist mapping.
- Focused EX7-067 suite — **10 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-067.

### EX7-068 — Wonder Stomp

#### Result

Score: **8/10 provisional**. All eight focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, Draw 1, optional level-3 Puppet play, and Security activation are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Both ordered Main actions and Security activation map to full compiled IR with empty residual and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Main use and a real Security check prove draw, free play, refusal, exact zones, and payment. |
| Peer/stack proof | 2/2 | Level-3 Puppet, level-4 Puppet, and level-3 non-Puppet fixtures prove the complete level/trait filter. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public Main use pays exactly 2, draws the exact top deck card, and may play a level-3 Puppet from hand without cost.
- Optional refusal preserves the Puppet in hand while Draw 1 still resolves.
- A level-4 Puppet and level-3 non-Puppet remain in hand after the draw.
- A real Security check activates the same Main body, draws, plays the Puppet free, and removes only the checked Security card.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-068 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-068 suite — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-068.

### EX7-069 — Wind Slicer

#### Result

Score: **8/10 provisional**. All eight focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, optional level-6-or-lower suspension, conditional own unsuspension, and Security activation are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Ordered Suspend/conditional Unsuspend and Security activation map to full compiled IR with empty residual and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Main use and a real Security check prove own/opponent selection, conditional result, refusal, ceiling, payment, and zones. |
| Peer/stack proof | 2/2 | Own and opponent level-3 fixtures plus a level-7 Digimon prove controller flexibility and the exact level ceiling. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public Main use pays exactly 2 and can suspend then unsuspend an own eligible Digimon.
- Suspending only an opponent's Digimon does not unsuspend an already-suspended own Digimon.
- A level-7 Digimon is excluded by the level-6 ceiling.
- Refusing the optional suspension leaves both boards unchanged.
- A real Security check activates Main and suspends the selected eligible opponent Digimon.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-069 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-069 suite — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-069.

### EX7-070 — Der Blitz

#### Result

Score: **8/10 provisional**. All eight focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, inherited effect-trash De-Digivolve, Three Musketeers color waiver, lowest-cost Main deletion/placement, and Security deletion are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | All inherited, Static, Main, and Security clauses map to full compiled IR with empty residual and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Option use, real EX7-059 attack cost, and a real Security check prove deletion, placement, waiver, inherited trigger, and exact zones. |
| Peer/stack proof | 2/2 | Mixed-cost opposing Digimon and a real EX7-059/Der Blitz stack prove lowest-cost selection and source-card behavior. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A Three Musketeers Digimon waives the black requirement; public Main use pays exactly 6, deletes the lowest-play-cost opponent, preserves the higher-cost Digimon, and places Der Blitz under the Musketeer.
- Without either a black source or Three Musketeers Digimon, the Option is rejected and remains in hand.
- EX7-059 publicly attacks and trashes Der Blitz from its stack as its printed cost, causing De-Digivolve 1 and moving the exact opposing top card to trash without passing level 3.
- A real Security check deletes the selected lowest-play-cost opponent and preserves the higher-cost one.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-070 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-070 suite — **8 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-070.

### EX7-071 — Hurricane Screw Shot

#### Result

Score: **8/10 provisional**. All six focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, inherited effect-trash memory gain, Three Musketeers waiver, level 3/4/5 Main deletions/placement, and Security deletions are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | All inherited, Static, Main, and Security clauses map to full compiled IR with empty residual and exclusive `registerIrCard` registration. |
| Observable behavior | 2/2 | Public Option use, real EX7-059 attack cost, and a real Security check prove memory, waiver, three deletions, placement, payment, and exact zones. |
| Peer/stack proof | 2/2 | A real EX7-059 stack plus opposing level 3 through 7 fixtures prove source-card behavior and exact level filtering. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A Three Musketeers Digimon waives the purple requirement; public Main use pays exactly 6, deletes one opposing level 3, 4, and 5, preserves level 6, and places Hurricane Screw Shot under the Musketeer.
- Without either a purple source or Three Musketeers Digimon, the Option is rejected and remains in hand.
- EX7-059 publicly attacks and trashes Hurricane Screw Shot from its stack as its printed cost, gaining exactly 1 memory and moving the exact card to trash.
- A real Security check deletes one level 3, 4, and 5 while preserving the level-6 and level-7 Digimon.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-071 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-071 suite — **6 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-071.

### EX7-072 — Seventh Fascination

#### Result

Score: **8/10 provisional**. All nine focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Exact Option identity/cost/trait, Trash/Your Turn trigger and cost, global delayed grant, Security deletion, and Q3871/Q3872/Q5728/Q5729 are recorded. |
| Compiled IR | 2/2 | Trash watcher, exact-name filter, deck-bottom cost, gained trigger/chooser/duration, and Security filter map to full IR with empty residual and exclusive `registerIrCard`. |
| Observable behavior | 2/2 | Public Option use, public evolution, real turn progression, and a real Security check prove every clause and all four rulings. |
| Peer/stack proof | 2/2 | Exact and near-name Lilithmon evolutions, two opposing Digimon, immune EX2-007, and a real Partition stack prove the critical interactions. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- Public Main use pays exactly 7 and grants every opposing Digimon one end-of-opponent-turn deletion; with two opposing Digimon, both gained effects resolve during a real turn transition.
- Q5728/Q5729: a public evolution into EX7-061 Lilithmon (X Antibody) triggers the card only from trash, returns its exact instance to deck bottom, preserves the legal evolution stack/cost, and activates Main. BT11-087 Lilithmon does not match; the optional cost can be refused.
- Q3871: EX2-007 receives a watcher but, while immune at trigger timing, does not activate it; the ordinary peer's watcher still resolves.
- Q3872: AD1-011 deletes itself through its gained effect and all stack cards go to trash without Partition resolving.
- A real Security check deletes the unsuspended target while preserving the attacker that became suspended by attacking.
- The former mocked registry/primitive suite was removed; no injected timing, private effect module, manual verb, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-072 --json` — Q3871, Q3872, Q5728, and Q5729 reconciled; no errata or banlist mapping.
- Focused EX7-072 suite — **9 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-072.

### EX7-073 — BeelStarmon (X Antibody)

#### Result

Score: **8/10 provisional**. All twelve focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Identity/stats/traits, standard and alternate evolution, X-Antibody exclusion, optional free Option use, both costed triggers, highest-level deletion, and Security trash are recorded; no card-specific KB entry exists. |
| Compiled IR | 2/2 | Both When Digivolving effects, When Attacking mirror, exact stack cost/filter, superlative target and Security action map to full IR with empty residual and exclusive `registerIrCard`. |
| Observable behavior | 2/2 | Public standard/alternate evolution and attack flows prove all clauses, costs, refusal, insufficient payment, exact zones, and continuation after failed deletion. |
| Peer/stack proof | 2/2 | EX7-013, EX7-058, EX7-059, Three Musketeers/nonmatching sources and an X-Antibody host prove the evolution and trait contracts across real stacks. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- EX7-013 takes the alternate route for exactly 1 memory; EX7-058 takes the standard Purple level-5 route for exactly 4, draws, and preserves its source stack.
- A level-6 Three Musketeers with X Antibody is rejected by the alternate requirement.
- When Digivolving may use EX7-066 free while leaving nonmatching EX7-068 in hand.
- Both public evolution and attack flows trash exactly two Three Musketeers digivolution cards, delete one highest-level opposing Digimon, and trash the exact top Security card.
- Security is still trashed after the cost when deletion is prevented or no opposing Digimon exists.
- One matching plus one nonmatching source cannot pay; refusing the optional cost prevents deletion and Security trash.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-073 --json` — no Q&A, errata, or banlist mapping.
- Focused EX7-073 suite — **12 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-073.

### EX7-074 — Vortex Resonance

#### Result

Score: **8/10 provisional**. All fourteen focused tests pass; collection delivery gates remain coordinator-owned.

| Area | Score | Evidence |
| --- | ---: | --- |
| Catalog and rules | 2/2 | Identity/cost/colors/trait, LIBERATOR Digimon-or-Tamer waiver, reveal/add/rest, reduced evolution, Security play/add-to-hand, and Q3873 are recorded. |
| Compiled IR | 2/2 | Static waiver scope, RevealAdd destinations, paid reduced evolution, Security zones/filter/order map to full IR with empty residual and exclusive `registerIrCard`. |
| Observable behavior | 2/2 | Public Main use, evolution, refusal, and real Security checks prove every printed clause, cost, destination, and boundary. |
| Peer/stack proof | 2/2 | LIBERATOR Digimon/Tamer/breeding fixtures, mixed reveal cards, legal evolution stack, and hand/trash Security candidates prove the shared filters. |
| Delivery gates | 0/2 | Set-wide closeout remains coordinator-owned. |

#### Evidence

- A black LIBERATOR Digimon and a red LIBERATOR Tamer each waive all printed colors; a breeding-area LIBERATOR does not, matching Q3873. No trait or matching color rejects use.
- Main reveals exactly three, adds one LIBERATOR, bottoms the rest, and may evolve a chosen own Digimon from hand with cost reduced by 4.
- The reduced evolution supports zero remaining cost and a printed cost-6 evolution paying exactly 2 after reduction; public evolution draws and preserves the source stack.
- Declining the optional evolution preserves the host and revealed LIBERATOR in hand.
- Real Security checks play an eligible cost-4-or-less LIBERATOR free from either hand or trash, leave higher-cost/nonmatching peers in place, and add the exact Vortex Resonance instance to hand.
- Refusing the optional Security play still adds Vortex Resonance to hand.
- No injected timing, manual effect verbs, legacy `registerCard`, or diagnostic output remains.

#### Verification

- `node tools/kb/query.mjs card EX7-074 --json` — Q3873 reconciled; no errata or banlist mapping.
- Focused EX7-074 suite — **14 passed**.
- Scoped Oxlint, Oxfmt, forbidden-hook scan, and `git diff --check` pass.

#### Retained seams

None found for EX7-074.

## Mechanisms

### BLAST-TAMER-BASE-MECHANISM

EX7-059 Q6391 permits Blast Digivolve over a Tamer with Three Musketeers in its text while ignoring normal digivolution conditions. Candidate validation still uses the card's alternate requirement to prevent Blast from becoming unrestricted.

For Blast only, and only when the current base is a Tamer, the alternate matcher ignores the requirement's level gate. Its identity gates remain mandatory, so BT18-093 qualifies through its printed Three Musketeers text while an unrelated Tamer does not.

The public regression opens a real Counter window, selects EX7-059 from hand, and observes the exact resulting Tamer-under-ACE stack without changing memory. Ordinary Blast and Blast DNA conformance suites remain green.

### DEFERRED-TOKEN-DELETION-MECHANISM

An effect-cost deletion triggers On Deletion immediately but defers activation until the causing effect finishes. Tokens leave the match instead of entering trash, so a deferred window cannot recollect their source afterward.

The engine now snapshots deleted Token instances into nested deferred On Deletion windows, as it already does for pooled rule deletions. Ordinary deleted cards are still recollected from their legal destination, preserving the existing activation-after-trigger checks.

EX7-030 Q3847 publicly deletes Familiar for Overclock, observes Familiar's -3000 DP together with Cendrillmon's -6000 DP, and completes the forced attack. Token, Overclock, and leave-prevention regressions remain green.

### EX7-004-OPT-RESET-MECHANISM

#### Outcome

The EX7-004 retained red is resolved. The card's inherited `[Your Turn] [Once Per Turn]` watcher now has green focused proof across a real turn boundary. No production engine edit was necessary: the existing `UseTracker.resetForNewTurn()` lifecycle was correct, and the retained red came from the test fixture's memory assertion.

The lane result is **8/10 under the worker-brief cap**: catalog/rules 2/2, IR fidelity 2/2, behavioral proof 2/2, stack/evolution proof 2/2, gates 0 by policy.

#### Contract and Q&A coverage

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-004. The inherited contract is:

`[Your Turn] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory.`

`node tools/kb/query.mjs card EX7-004` returned `EX7-004 Fluffymon (no knowledge-base entries)`. There are no card-specific Q&A IDs, errata, restrictions, or rulings to cover.

#### Red reproduction

Before the test correction:

```text
Tests 6 passed | 1 expected fail (7)
```

Instrumentation showed the watcher was reinstalled after the turn transition, its per-turn key count was `0`, and the next real attack emitted `effectTriggered` followed by `memoryChanged` from `3` to `4`. The failure expected the original `firstTurnMemory + 2`, which was `5`.

The fixture manually negated the memory gauge around hand-laid turn changes:

```ts
s.state.memory = -s.state.memory;
```

The real turn machine's pass/normalization therefore changed the baseline between the first and next attacks. The expected-fail label incorrectly attributed that baseline change to a watcher lifecycle failure.

#### Fix and green proof

The focused test now:

- uses `it(...)` instead of `it.fails(...)`;
- preserves the same-turn refusal assertion;
- runs the actual Active -> Draw -> Breeding -> Main turn machine for both intervening turns;
- asserts the reinstalled watcher's `oncePerTurnKey` exists and its `subtrigger` ledger count is `0` at the next owner's Main phase;
- captures the actual post-transition memory baseline and asserts the next public battle deletion adds exactly `1`.

The final attack still uses the real public `attack` intent and real combat deletion. The only test seam is the documented arbitrary-unsuspend bridge needed to restore a suspended defender; it does not fire the watcher or mutate the per-turn ledger.

#### Engine compatibility conclusion

The relevant production path is already correct:

1. `TurnStateMachine.activePhase()` calls `clearDurations("ownerTurnStart")`.
2. `GameEngine` handles that boundary with `tracker.resetForNewTurn()`.
3. Continuous recomputation removes and reinstalls the watcher while preserving its stable `oncePerTurnKey`.
4. The next `whenDeletesInBattle` event observes a zero-count ledger and fires once.

No change was made under `apps/api/src/engine/**` or `engine/testkit`. This preserves existing `UseTracker`, `SubTriggerRegistry`, continuous-recompute, and once-per-turn compatibility behavior. Assertions were strengthened rather than weakened.

#### Verification

- Red reproduction: focused EX7-004 test, `6 passed | 1 expected fail (7)`.
- Green focused proof: `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-004.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Engine regression: `pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism` — **225 files, 6,774 tests passed**. The run logged an existing AD1-002 unsupported-effect diagnostic but reported no failing tests.
- Typecheck: `pnpm typecheck` — shared, web, and API passed.
- Targeted style: Oxlint and Oxfmt check for `EX7-004.test.ts` passed.
- `git diff --check` passed.

No git writes were performed. No card module, shared/catalog data, ledger, RUN file, or existing EX7-004 report was edited.

### EX7-006-RECOLLECTION-MECHANISM

#### Outcome

The EX7-006 retained red is resolved as a false fixture expectation, not an engine recollection defect. The inherited `[When Attacking] [Once Per Turn]` effect is recollected after a real turn when its printed hand condition is satisfied. No production engine edit was necessary.

The lane result is **8/10 under the worker-brief cap**: catalog/rules 2/2, IR fidelity 2/2, behavioral proof 2/2, stack/evolution proof 2/2, gates 0 by policy.

#### Contract and Q&A coverage

Catalog source: `packages/shared/src/cards/data/cards.json`, EX7-006, Yaamon. The sole printed clause is:

`[When Attacking] [Once Per Turn] If you have 4 or fewer cards in your hand, this Digimon may digivolve into a Digimon card with the [Dark Dragon]/[Evil Dragon] trait in the trash.`

`node tools/kb/query.mjs card EX7-006` reports no knowledge-base entries. The JSON query reports `banlist: null`, `errata: null`, and `qa: []`; there are no card-specific Q&A IDs, restrictions, errata, or rulings to cover.

#### Red reproduction and root cause

Before correction, the focused test reported:

```text
Tests 6 passed | 1 expected fail (7)
```

The retained-red fixture seeded four cards in hand. The first effect-driven evolution into BT11-079 correctly drew the standard digivolution bonus card, and the next real turn correctly drew one card during Draw. Thus the next observed Main phase had five cards in hand, so EX7-006's `4 or fewer` condition correctly failed. The attack produced no second evolution; the watcher was not missing from the engine.

The old assertion also expected the stack to remain `[EX7-006, BT11-075]`, which was only valid while the incorrectly expected second evolution did not happen.

#### Fix and green proof

The focused fixture now seeds two hand cards. It asserts the observable hand boundary:

- before the first attack: 2 cards;
- after the effect-driven BT11-079 evolution's mandatory bonus draw: 3 cards;
- after the next real turn's draw: 4 cards.

The test now uses `it(...)` rather than `it.fails(...)`. It preserves the same-turn Once Per Turn refusal, then uses a real opponent turn and next owner turn. The next public attack recollects EX7-006, pays 4 memory for BT21-077, removes it from trash, and proves the final stack is `[EX7-006, BT11-075, BT11-079]` beneath BT21-077. Existing wrong-trait, wrong-color, over-four-hand, and optional-decline negatives remain unchanged.

The only test-only structural seam is the named arbitrary-unsuspend bridge needed to create a second same-turn public attack. It does not inject timing, fire an effect, or alter the collection/ledger state.

#### Engine compatibility conclusion

The existing path is correct and unchanged:

1. The attack opens the scoped `WhenAttacking` timing for the whole permanent, including its stack.
2. Effect-driven digivolution draws the standard bonus card and preserves the prior top card under the new top.
3. The real turn machine advances through Active, Draw, Breeding, and Main.
4. The next attack re-collects the stack's EX7-006 effect when the hand is exactly four.

No files under `apps/api/src/engine/**` or `engine/testkit` were changed. This preserves compatibility for inherited-effect collection, effect-driven digivolution, bonus draws, and Once Per Turn accounting. Assertions were strengthened rather than weakened.

#### Verification

- Red reproduction: focused EX7-006 test, **6 passed, 1 expected fail (7)**; the fixture had four seeded cards and crossed the printed hand boundary after the two legitimate draws.
- Green focused proof: `pnpm --filter @aegis/api exec vitest run src/cards/EX7/EX7-006.test.ts --maxWorkers=1 --no-file-parallelism` — **7 passed**.
- Full engine regression: `pnpm --filter @aegis/api run test:engine -- --maxWorkers=1 --no-file-parallelism` — **225 files, 6,774 tests passed**. The run logged an existing AD1-002 unsupported-effect diagnostic but reported no failing tests.
- `pnpm typecheck` — shared, web, and API passed.
- Targeted Oxlint/Oxfmt and `git diff --check` — passed.

No git writes were performed. No other card, shared/catalog, ledger, RUN, or unrelated file was edited.

### EX7-010-BREEDING-STATIC-MECHANISM

#### Conclusion

No shared engine fix is justified. The retained red was a false fixture, not a leaked
`GrantStatic` trait. EX7-010 is therefore closed at **8/10**, with Observable behavior **2/2**.

#### Red diagnosis

The original breeding probe attempted to play EX7-066, which is a **red** Three Musketeers
Option. After `ready()`, the EX7-010 permanent was in `inBreeding` and the continuous ledger
contained no `Three Musketeers` grant for it. Nevertheless, `applyIntent(playCard)` returned
`{ ok: true }`.

That result is correct for the fixture. The engine's printed Option color check includes the
player's battle-area and breeding-area Digimon/Tamer color sources, matching the Official Rule
Manual's color-requirement wording. EX7-010 is red, so EX7-066 can be played from this position
without using EX7-010's effect-granted trait. The `ok: true` result does not prove that Q3831's
trait grant leaked into breeding.

The existing generic static path is already bounded correctly:

- `YourTurn` routes to `staticModifier`, whose default source guard requires battle-area
  residency.
- EX7-010's IR target independently carries `zone: "battleArea"`.
- The permanent matcher distinguishes `inBreeding` from `battleArea`.
- The mechanism regression reads `grantedTraits(deputy.permanentId)` after recompute and gets
  `[]` for the breeding source.

#### Corrected proof

The public Q3831 negative now uses EX7-071, a **purple** Three Musketeers Option. Its own
conditional color waiver can only make the play legal when a Three Musketeers Digimon is
available. EX7-010 in breeding supplies neither a granted trait nor a purple color source, so
the public play is rejected with the exact reason `color-requirement-unmet`; its stack remains
empty. The battle-area positive remains EX7-066 and still proves the intended trait grant by
placing the Option under Deputymon.

The focused engine regression in
`apps/api/src/engine/cards/ex7BreedingStaticGrant.test.ts` asserts both the empty grant ledger
and the public rejection. No engine source file was changed in this lane, so no full engine
regression rerun was required by the coordinator checkpoint.

#### Verification

- EX7-010 focused card suite: **11 passed**.
- Focused mechanism regression: **1 passed**.
- Typecheck: **passed** for shared, API, and web.
- Oxlint, Oxfmt, and `git diff --check` on the bounded files: **passed**.

No ledger/RUN/catalog/card-module/shared-engine edits, git writes, commits, or pushes were made
for this mechanism lane.

### EX7-011-BY-CONDITION-MECHANISM

Serialized engine lane, 2026-09-09. Scope is only the EX7-011 no-legal-payload seam. No git write
was performed.

#### Rule and peer basis

EX7-011's `[On Play]` and `[When Digivolving]` text says, in substance, “By placing 1 Option with
the [Three Musketeers] trait from hand or trash as this Digimon's bottom digivolution card, delete
1 opposing Digimon with 6000 DP or less.” The indexed §15-7-5 rule permits executing the optional
processing condition regardless of whether the content after it can be executed.

The committed peer evidence is consistent but intentionally distinguishes activation costs:

- `ch15-02-timing-and-resolution.test.ts` and `interactionAudit.test.ts` cover payable optional
  conditions with empty later content.
- EX10-036 and BT15-009 use the explicit `allowCostWithoutTarget` flag for their ruling-specific
  cost-bearing Delete shapes.
- EX9-010 has the same unflagged optional Delete whose independent cost places a hand card under
  its own host, making it the closest compiled shape peer.
- EX2-051's suspend activation remains a negative control: a no-target Main activation is still
  not declarable. The generic fix must not turn all optional Delete costs into payable no-target
  activations.

#### Red reproduction and causal root cause

Before the fix, the EX7-011 focused lane reported:

```text
Test Files  1 passed (1)
Tests  7 passed | 1 expected fail (8)
```

The retained `it.fails` probe had a payable EX7-071 in hand and only a 7000-DP opposing Digimon.
The first intended assertion that was not met was the stack assertion: `[]` was received instead
of `['EX7-071']`. The card's 7-cost was paid, but the independent placement condition was skipped.

The cause was shared, not card IR. In `runAction.ts`, the Delete no-target preflight ran before the
optional prompt and generic cost payment. For a cost-bearing Delete with no candidate target it
returned `action.abortOnDecline === true`; EX7-011 therefore never reached `payCost`. The
declaration-time `canActivateEffect` board-target gate made the same target-only assumption for
this triggered optional shape.

#### Narrow generic fix

Added `allowsOptionalProcessingCostWithoutTarget` in
`apps/api/src/engine/effects/interpreter/processingCondition.ts`. It preserves the existing
explicit `allowCostWithoutTarget` escape hatch and infers only this compiled form:

```text
Delete + optional + abortOnDecline
  + place cost to digivolutionStack
  + host self
  + loose source from hand or trash
```

This describes an independent placement processing condition, not the target itself. The shared
predicate is used at both relevant gates:

- `runAction.ts:427-437`: the action can reach optional prompting and generic cost payment even
  when the Delete payload has zero candidates; the Delete handler then safely resolves zero
  targets.
- `effect.ts:822-826`: declaration-time board scanning does not suppress the same payable
  processing condition.

The predicate does not infer permission for suspend, deleteOwn, memory, or other activation-cost
families. Existing target-gating behavior remains for those families; EX2-051's no-target
negative-control test stayed green. No card module, shared IR/catalog, ledger, or RUN file changed.

#### Red-to-green proof

The card probe's assertions were preserved and `it.fails` was converted to ordinary `it` only after
the shared fix made it pass. The final public result is:

```text
memory: 10 -> 3
Megadramon stack: ['EX7-071']
EX7-071 in hand: false
opposing battle area: one permanent
opposing permanent DP: 7000
```

The focused mechanism regression in
`apps/api/src/engine/effects/interpreter/processingCondition.test.ts` repeats the same public
path. The final serial runs were:

```text
EX7-011 + mechanism/conformance/interaction suite: 4 files, 65 passed
full engine suite: 226 files, 6,775 passed
```

The full engine process still prints a pre-existing unsupported legacy `ActivateEffect` log for
AD1-002, but the suite is green and this lane added no debug residue.

#### Static gates

Oxlint passed for the five changed TypeScript files. Oxfmt check passed for those files, and
`git diff --check` passed. API typecheck initially exposed a concurrent duplicate-property edit
in EX7-014's lane; after that lane corrected its owned fixture, the coordinator reran API typecheck
successfully against the combined worktree.

#### Result

The EX7-011 §15-7-5 seam is resolved generically for its independent loose-card placement shape.
The card lane can claim Behavior **2/2** and total **8/10** under the worker brief's delivery-gate
cap. No retained engine gap remains for this seam.

### EX7-013-HAND-ADD-WATCHER-MECHANISM

#### Conclusion

Q3832 is a fixture-direction correction, not an engine seam. No production engine source was changed. The corrected public EX7-013 test is ordinary green and the card audit is promoted to 8/10 with Behavior 2/2.

#### Causal evidence

BT10-077 already registers an `[Opponent's Turn]` `whenEffectAddsToOpponentHand` watcher. The generic effect-draw primitive emits that event with the recipient seat and the five added instance IDs. Its watcher body then:

1. pays BT10-077's cost by trashing `BT1-104` from its own digivolution stack into seat 1's trash; and
2. makes the opponent, seat 0, trash five cards from seat 0's hand into seat 0's trash.

The original EX7-013 retained red did not model that result: it declined the optional BT10-077 activation and expected seat 0's hand cards to be stored in seat 1's trash alongside the cost card. That expectation conflated the cost payer's trash with the opponent's hand-trashing destination.

#### Regression proof

`apps/api/src/engine/cards/ex7HandAddWatcher.test.ts` uses a real BT10-077 permanent with `BT1-104` under it, drives the canonical effect-draw primitive through the testkit's `drawByEffect` affordance, and asserts the exact result: seat 0 retains `BT1-014`, seat 0's trash contains five cards, and seat 1's trash contains only `BT1-104`. The test also confirms one real `whenEffectAddsToOpponentHand` subscription is installed.

The helper is retained because the existing `advance.verb.draw` intentionally models the normal draw path, while this regression needs the canonical effect-driven hand-add path used by `ctx.fx.draw`. It changes no production behavior and preserves the normal-draw helper's semantics.

#### Scope and compatibility

Only `apps/api/src/engine/testkit/advance.ts`, the focused mechanism regression, the EX7-013 public test, this report, and the EX7-013 audit report were touched. No card module, production engine source, catalog, ledger, RUN file, commit, or push was changed. The existing watcher behavior and activation semantics remain intact.

### EX7-014-BREEDING-MOVE-RESTRICTION-MECHANISM

Lane scope: EX7-014 only. No git write was performed.

#### Contract

EX7-014's When Digivolving effect restricts the opponent from playing or moving Digimon
with 6000 DP or less until the end of that opponent's turn. Q3835 and Q6509 specifically
apply the restriction to an opponent effect that moves P-143 into breeding at end of turn.

#### Red reproduction

The public `EX7-014.test.ts` case was temporarily run as an ordinary test. Independently,
the assertion at line 476 failed: P-143 was found in seat 1's breeding area after its
end-turn move. The card restriction was present; the failure was in the generic movement
path, not the fixture direction.

#### Root cause

`PrimitivesEngine.movePermanentZone(..., "toBreeding")` checked leave-battle-area
restrictions but did not consult the continuous play/move blocker. Consequently an
effect-driven move bypassed `RestrictPlay` even though the restriction mode was
`playOrMove`.

#### Narrow fix and regression

The primitive now resolves the effect seat (`effectSeatStack` with permanent-owner
fallback) and calls `continuous.isPlayBlocked(effectSeat, card, "move", true)` before
extracting the permanent. The prior leave-restriction check and canonical move emission
remain unchanged.

`apps/api/src/engine/cards/ex7VolcanicdramonMechanism.test.ts` adds a generic regression
that creates the restriction through a real EX7-014 digivolution and drives the real turn
loop. It asserts P-143 remains in battle and breeding is empty. The test is marked with a
`FAILS-WHEN-REVERTED` note tied to removing the new gate.

#### Evidence

```text
Independent pre-fix red: 1 expected fail, 10 skipped
Mechanism regression after fix: 1/1 passed
Public EX7-014 lane after fix: 11/11 passed
Affected six-file suite: 420/420 passed
Full src/engine regression: 261 files, 7303/7303 passed
Oxlint: PASS
Oxfmt --check: PASS
git diff --check: PASS
```

The workspace `pnpm typecheck` passes for shared, web, and API with no diagnostics.

### EX7-014-DIGIXROS-REPLACEMENT-MECHANISM

Lane scope: EX7-014 only. No git write was performed.

#### Contract

When EX7-014 is selected as an EX3-014 DigiXros material, its All Turns replacement may
activate because the departure is not by its controller's effect. The replacement card is
played from hand without cost and is not retroactively included in the already-selected
DigiXros materials (Q3836, Q6718).

#### Red reproduction

The public `EX7-014.test.ts` DigiXros case was temporarily run as an ordinary test.
Independently, the assertion at line 514 failed because ST5-07 was not present as a
separate battle-area permanent after the DigiXros. This was a generic engine seam, not a
fixture-direction error.

#### Root cause

`applyDigiXros` relocated a field material through the synchronous relocation dependency
without first consulting leave-play replacements. That bypassed EX7-014's replacement
entirely. The replacement also needs player-action provenance: a DigiXros declaration is
the player's action, so an `otherThanYourEffect` replacement must not be classified as the
player's own effect.

#### Narrow fix and regression

The DigiXros dependency now optionally routes field-material relocation through an async
engine callback. The callback consults leave prevention with `playerAction: true`, rejects
the relocation if replaced, and otherwise delegates to the existing canonical relocation
primitive. The optional dependency preserves compatibility for direct callers that only
provide the existing synchronous dependency. Leave-prevention's new provenance option is
optional and leaves existing effect callers unchanged.

The mechanism regression uses a real EX3-014 DigiXros with EX7-014 as a selected field
material and ST5-07 as the matching replacement. It asserts all selected material
instances are on the EX3-014 stack, ST5-07 is a separate battle permanent, and ST5-07 is
not in the Xros stack. The test carries a `FAILS-WHEN-REVERTED` note for the bypass.

#### Evidence

```text
Independent pre-fix red: 1 expected fail, 10 skipped
Mechanism regression after fix: 1/1 passed
Public EX7-014 lane after fix: 11/11 passed
Affected six-file suite: 420/420 passed
Full src/engine regression: 261 files, 7303/7303 passed
Oxlint: PASS
Oxfmt --check: PASS
git diff --check: PASS
```

The workspace `pnpm typecheck` passes for shared, web, and API with no diagnostics.

#### Closeout review correction

The collection closeout review found that `applyDigiXros` ignored a `false` result from
the replacement-aware relocation callback. An outright leave prevention could therefore
leave the selected permanent in play while still reporting it as placed, retaining its
cost reduction, and including it in the On Play material count.

The action now records only successfully relocated materials. For each prevented field
move it restores that card's reduction to the paid play cost and passes the actual placed
count to On Play. A focused public-intent regression forces the production dependency's
prevented-relocation result and proves the field material remains in play, the DigiXros
stack remains empty, and BT10-061 pays its full printed cost.

### EX7-015-DIGIXROS-RESTRICTION-MECHANISM

#### Result

**Fixed and verified.** Q3840 now passes as an ordinary public card test.

#### Causal diagnosis

`RestrictCostReduction` records a seat-level play-cost block in the continuous
effect ledger. The normal modifier and pay-time paths already consult that
ledger. `validateDigiXros`, however, calculated the printed/continuously
adjusted base and then unconditionally subtracted DigiXros's per-material
reduction. That made the intrinsic DigiXros reduction bypass the generic
all-player play-cost restriction.

The pre-fix public fixture used BT12-074 (printed play cost 4) with one legal
BT10-008 material and 10 memory. The observed result was memory 8 (4 - 2),
while Q3840 requires memory 6: the play remains legal, but the material's
cost reduction is suppressed.

#### Narrow fix

`DigiXrosDeps` now has an optional `canReducePlayCost(state, seat)` predicate.
`GameEngine.digiXrosDeps()` binds it to
`!continuous.blocksCostReduction(seat, "play")`. The validator uses a zero
per-material reduction when the predicate is false, while preserving material
legality, placement, payment, and the existing finalize-cost hook.

The predicate is optional for compatibility with direct action consumers; in
its absence, prior unrestricted DigiXros behavior remains unchanged.

#### Regression proof

Red baseline before the fix:

- EX7-015 focused suite: **1 file passed; 5 passed, 1 expected fail**.
- The failing Q3840 assertion received memory 8 instead of 6.

Green after the fix:

- EX7-015 plus this mechanism test: **2 files passed; 8 passed**.
- Relevant interaction/conformance set: **3 files passed; 56 passed**.
- Full engine suite: **260 files passed; 7,301 passed**.
- Workspace/API typecheck: passed.
- Scoped Oxlint, Oxfmt check, and `git diff --check`: passed.

The mechanism test has two cases: the restricted path pays 4 and retains the
material under BT12-074; the unrestricted path still pays 2 after the same
single-material DigiXros reduction. The test includes a
`FAILS-WHEN-REVERTED` note tied to the new dependency predicate.

No retained seam remains for Q3840. No git write was performed, and no ledger,
RUN, REVIEW-NOTES, catalog, shared, or other-card file was edited.

### EX7-023-SOURCE-RELATIVE-RESTRICTION-MECHANISM

Serialized engine lane, 2026-09-09. Scope is exactly EX7-023. No git write was performed.

#### Contract

EX7-023's [Opponent's Turn] clause says that none of the opponent's Digimon with as many
or fewer digivolution cards as Hexeblaumon can suspend. Q3844 confirms this is live: with
one source on Hexeblaumon, an opposing one-source Digimon is initially restricted, but
after that Digimon gains a second source during the opponent's turn it can suspend.

#### Red reproduction

The pre-fix focused run was **1 file, 7 passed, 1 expected-fail retained red**. The
top-level Q3844 `it.fails` independently reached the initial restriction, legally evolved
the target through the public `digivolve` intent, and then failed the intended public attack
with `illegal-target`. The red was a generic engine seam, not a fixture-direction error.

#### Root cause

`runRestrictionAction` resolved the `count: "all"` target filter once and recorded one
restriction per matching permanent. For the continuous [Opponent's Turn] effect, that
captured the target's initial source count. The continuous ledger already supported live
player-scoped predicates, but source-relative `Restrict` did not use that path.

The interpreter normalizes printed `suspend` to effect-facing `beSuspended`. The individual
restriction lookup treated those spellings as equivalent, but the player-scoped lookup
compared them exactly. That second boundary would hide a dynamic `beSuspended` restriction
from combat's `suspend` consumer.

#### Narrow generic fix

The interpreter now infers dynamic handling only when all of these hold:

- the action is being resolved in a continuous pass;
- its target count is `all`; and
- its filter contains `digivolutionCardsCompareToSource`.

It then calls the existing `restrictPlayer` primitive with a live
`permanentMatchesFilter(..., ctx.source)` callback. One-shot and finite target restrictions
remain snapshot-based. The ledger's player-scoped read now uses the same
`suspend`/`beSuspended` equivalence set as individual restrictions.

#### Mechanism regression

`apps/api/src/engine/cards/ex7HexeblaumonMechanism.test.ts` uses a real EX7-023 source and
public intents. It asserts the one-source target is restricted, adds a second source by
public evolution, observes the restriction reopen, and successfully declares the attack.
It uses the real turn loop and no injected timing.

#### Evidence

```text
Mechanism regression: 1/1 passed
Public EX7-023 + mechanism: 2 files, 9/9 passed
Relevant conformance/effect suite: 6 files, 87/87 passed
Full src/engine regression: 262 files, 7304/7304 passed
Workspace typecheck: PASS (shared, web, API)
Oxlint: PASS with no warnings
Oxfmt --check: PASS
git diff --check: PASS
```

The public Q3844 test is now an ordinary green `it`; no assertion was weakened or removed.

### FUTURE-ENTRANT-RESTRICTION-MECHANISM

EX7-049 Q3855 requires a resolved all-target restriction to cover matching Digimon that enter later during the same duration. The card marks the restriction `whileMatchesTargetFilter`; the interpreter stores a player-scoped predicate instead of a snapshot of current permanent IDs.

The predicate re-evaluates the battle-area level filter for every queried permanent and applies the ordinary opponent-effect immunity gate using the source card's kind. This preserves Q3853 (an immune level 4 is unaffected) and Q3854 (breeding is outside the battle-area filter), while the duration sweep removes the player entry at the opponent-turn boundary.

Public proof plays a level 4 after Metallicdramon resolves, observes the live restriction, rejects its otherwise legal evolution, and separately proves that same evolution succeeds after expiry.

### TOKEN-PRINTED-KEYWORD-MECHANISM

#### Defect

`ContinuousEffectLedger.hasKeyword()` supports a live printed-keyword reader,
but `GameEngine` constructed the ledger with that dependency undefined. Combat
legality could parse a token's definition directly while the synchronized
observer/continuous API reported that the same token lacked its printed
keywords. EX7-058 exposed this split for the Volée & Zerdrücken token's
Blocker and Retaliation.

#### Fix

`GameEngine` now binds the ledger reader to the live permanent. It returns the
keywords printed on the top card plus keywords printed in every stack card's
inherited text, using the existing memoized `printedKeywordsOf` parser. The
reader includes breeding permanents, returns an empty set for departed ids,
and does not create temporary grants or mutate the continuous ledger.

#### Proof

- EX7-058 publicly creates the canonical token and observes both Blocker and
  Retaliation as ordinary passing assertions.
- The engine interaction suite continues to prove gained Retaliation behavior.
- The keyword parser suite remains green, including grant/reminder-text
  exclusions.

Verification: EX7-058, `interactionAudit`, and `combat/keywords` — **145/145
passed**; scoped Oxlint, Oxfmt, and `git diff --check` pass.

### Review notes and closed investigations

#### Coordinator decisions

- Official text and the committed catalog/rules knowledge base are authoritative.
- Card lanes may edit only their assigned card module, focused test, and evidence report.
- Engine gaps remain explicit retained reds until a serialized engine lane resolves them.

#### Engine seam queue

- EX7-058 resolved: the live continuous keyword reader now includes keywords printed on token/top-card definitions and inherited stack text. Volée & Zerdrücken exposes Blocker and Retaliation; 145 focused/mechanism regressions pass.
- EX7-018 resolved as a rules/fixture error: inherited Jamming correctly does not apply while Gekomon is the top card. A second public evolution places it in the stack and surfaces Jamming; no engine change was needed.
- EX7-005 resolved: its once-per-turn watcher resets through a continuous real turn loop. The prior limitation manually assigned the next phase; no engine change was needed.
- EX7-004 resolved: watcher re-arms correctly; the retained red used the wrong pre-transition memory baseline. No engine change was needed; mechanism report and 6,774-test engine regression confirm compatibility.
- EX7-006 resolved: recollection works. The retained red crossed the printed four-card hand limit after legitimate draws and expected an incomplete post-evolution stack. No engine change; mechanism report and 6,774-test regression green.

#### Fixture traps

- No Digi-Egg cards in deck or security.
- No injected timing may count as behavioral proof.
### EX7-010 — Q3831 breeding-area static grant

- The public battle-area trait-grant behavior passes.
- A retained `it.fails` proves the engine currently allows EX7-066 to use EX7-010's Three Musketeers grant while EX7-010 is in breeding, contrary to Q3831.
- Resolved as a false fixture: EX7-066 was independently legal by matching EX7-010's printed red color. Purple EX7-071 is rejected, no breeding trait is granted, and EX7-010 is promoted to 8/10 without an engine change.

### EX7-011 — §15-7-5 payable `by` condition

- Public play/evolution positives pass, including exact costs, draw, stack placement, threshold, decline, and Piercing.
- A retained `it.fails` expects the payable Option placement to occur even when no opposing Digimon meets the following deletion ceiling.
- Resolved by the serialized shared-resolver lane with a narrow predicate for self-hosted loose-card placement conditions; EX7-011 is promoted to 8/10 after focused, mechanism, full-engine, typecheck and static proof.

### EX7-013 — Q3832 hand-add watcher

- Resolved as a fixture-direction error: the fixture declined BT10-077's optional activation and expected seat 0's discarded hand cards in seat 1's trash.
- Corrected public behavior is green: seat 1 trashes its BT1-104 stack cost, then seat 0 trashes five cards from its own hand.
- A focused real-watcher mechanism regression proves the same event and zone direction; no production engine change was required.

### EX7-015 — Q3840 DigiXros cost reduction

- Resolved by passing the existing continuous play-cost-reduction policy into DigiXros validation.
- Under EX7-015, legal DigiXros materials are still placed under the played Digimon but apply zero cost reduction; unrestricted DigiXros retains its printed reduction.
- Focused, generic mechanism, conformance/interaction, full-engine, typecheck, and static gates are green.

### EX7-014 — Q3835 breeding move restriction

- Resolved by making the generic effect-driven move-to-breeding primitive honor active `playOrMove` restrictions before extraction.
- Q6509 effect-play behavior remains green and the full engine regression passes.

### EX7-023 — Q3844 dynamic suspension restriction

- Resolved by routing continuous all-target source-relative restrictions through the existing live player-scoped predicate ledger.
- The predicate re-evaluates both source and target stacks and consistently treats `suspend` and `beSuspended` as equivalent.
- Public Q3844, focused mechanism, proportional conformance, full-engine, typecheck, and static gates are green.

### EX7-014 — Q3836/Q6718 DigiXros replacement identity

- Resolved by consulting leave replacements before DigiXros consumes a field material and marking the declaration as a player action.
- EX7-014's replacement activates with the correct source identity; public card and dedicated mechanism tests are ordinary green.

### EX7-027 — inherited leave-prevention reset

- Resolved as a fixture error: the intervening public attack hit a 5000-DP Security Digimon, so the 1000-DP host correctly spent its newly reset prevention and second Puppet before the next opponent turn.
- Inert Option security isolates the intended re-suspension step. The next opponent attack consumes the second Puppet and preserves the host, proving reset through the real turn loop.
- Card plus leave-prevention/subtrigger mechanism suites pass 56/56; no engine change was required.

### EX7-028 — inherited for-the-turn modifier persistence

- Public battle deletion proves both Q3846 branches and optional refusal; public evolution proves exact legal and illegal stack boundaries.
- Resolved as a fixture error: the public BT1-039 host had only enough hand cards to pay its first three-card unsuspend cost, so the second resolution did not preserve the intended same-turn state.
- Funding both printed costs proves two public attacks while -4000 DP remains live, followed by real turn expiry and next-turn re-arm.
- Card plus modifier/subtrigger mechanism suites pass 73/73; no engine change was required.

### EX7-029 — On Play modifier lifetime

- Resolved as a fixture error: after public play the active player had no legal Main action, so production auto-passed and correctly expired both `untilYourTurnEnd` modifiers.
- Keeping a legal follow-up card in hand holds Main open. Both -8000 DP changes persist until the explicit end-phase intent and then expire.
- All 9 focused tests pass; no engine change was required.

### EX7-030 — Q3847 simultaneous Overclock triggers

- Resolved by retaining deleted Token instances as transient candidates when a nested On Deletion window is deferred behind its causing effect.
- Familiar's already-triggered effect now survives removal-from-game and combines with Cendrillmon's When Attacking effect for Q3847's observable 3000 DP.
- Focused/token/Overclock/prevention suites pass 38/38.

### EX7-018 — inherited static recomputation after evolution

- Resolved as a rules/fixture error: the former red expected an inherited effect while EX7-018 was the top card.
- A second legal public evolution places EX7-018 under EX7-022; the exact stack and inherited Jamming are both observable.
- No engine change was required.

### EX7-044 — RevealAdd place-under cleanup

- Resolved as an illegal-fixture error: BT1-001 through BT1-004 are Digi-Eggs, so rule processing correctly removed them from the main deck.
- The corrected public flow uses neutral Digimon, places the selected Option, returns every remaining revealed card to the chosen bottom destination/order, and performs the conditional deletion.
- EX7-044 and the shared reveal mechanism suite pass 126/126; no engine change was required.

### EX7-049 — Q3855 future-entrant evolution restriction

- Resolved with the interpreter's live player-scoped restriction path and an explicit `whileMatchesTargetFilter` marker on EX7-049.
- The predicate covers future qualifying battle-area level 4s while preserving Q3853 immunity and Q3854 breeding exclusion; the same evolution pair succeeds after expiry.
- Focused plus processing-condition mechanism tests pass 10/10.

### EX7-058 — token keyword registration

- Resolved by binding the live ledger's printed-keyword reader to top-card and inherited-stack definitions.
- Public evolution creates the canonical token with correct stats and now exposes both Blocker and Retaliation.
- Focused EX7-058, interaction, and keyword parser regressions are green.

### EX7-059 — Q6391 Tamer Blast Digivolve base

- Resolved in Blast validation: a Tamer base may ignore an alternate requirement's level gate during Blast, but must still satisfy its printed identity/text gates.
- Public Counter over BT18-093 now exposes and resolves EX7-059, while ordinary Blast Digivolve and Blast DNA regressions remain green.
- Focused and proportional Blast suites pass 54/54.
- Retained as a top-level `it.fails`; queue for serialized Blast Digivolve candidate validation that supports text-qualified Tamers while ignoring normal digivolution conditions.

### Source reconciliation

No catalog corrections identified yet. Card lanes report discrepancies to the coordinator and do not edit shared catalog data.

## Knowledge base index

Generated from the committed local knowledge base with `node tools/kb/query.mjs card <ID> --json` on 2026-09-09. Every listed Q&A must be covered by the corresponding card report/test; `none` is backed by the command result, not inference.

| Card | Q&A ids | Errata | Banlist |
| --- | --- | --- | --- |
| EX7-001 | none | none | none |
| EX7-002 | none | none | none |
| EX7-003 | none | none | none |
| EX7-004 | none | none | none |
| EX7-005 | none | none | none |
| EX7-006 | none | none | none |
| EX7-007 | Q3828 | none | none |
| EX7-008 | Q3829 | none | none |
| EX7-009 | none | none | none |
| EX7-010 | Q3830, Q3831 | none | none |
| EX7-011 | none | none | none |
| EX7-012 | none | none | none |
| EX7-013 | Q3832 | none | none |
| EX7-014 | Q3833, Q3834, Q3835, Q3836, Q4673, Q4674, Q4675, Q4676, Q6509, Q6718 | none | none |
| EX7-015 | Q3837, Q3838, Q3839, Q3840 | none | none |
| EX7-016 | Q3841 | none | none |
| EX7-017 | none | none | none |
| EX7-018 | none | none | none |
| EX7-019 | none | none | none |
| EX7-020 | none | none | none |
| EX7-021 | Q3842, Q6041 | none | none |
| EX7-022 | Q3843 | none | none |
| EX7-023 | Q3844 | none | none |
| EX7-024 | Q3845, Q4882 | none | none |
| EX7-025 | none | none | none |
| EX7-026 | none | none | none |
| EX7-027 | none | present | none |
| EX7-028 | Q3846 | none | none |
| EX7-029 | none | none | none |
| EX7-030 | Q3847 | present | none |
| EX7-031 | Q3848, Q5838 | none | none |
| EX7-032 | none | none | none |
| EX7-033 | none | none | none |
| EX7-034 | none | none | none |
| EX7-035 | Q3849 | none | none |
| EX7-036 | none | none | none |
| EX7-037 | Q3850 | none | none |
| EX7-038 | none | none | none |
| EX7-039 | none | none | none |
| EX7-040 | none | none | none |
| EX7-041 | Q3851 | none | none |
| EX7-042 | none | none | none |
| EX7-043 | Q3852, Q4558 | none | none |
| EX7-044 | Q4578 | none | none |
| EX7-045 | none | none | none |
| EX7-046 | none | none | none |
| EX7-047 | none | none | none |
| EX7-048 | Q4585 | none | none |
| EX7-049 | Q3853, Q3854, Q3855, Q3856, Q6719 | none | none |
| EX7-050 | Q3857 | none | none |
| EX7-051 | none | none | none |
| EX7-052 | Q3858, Q3859, Q3860 | none | none |
| EX7-053 | none | none | none |
| EX7-054 | Q3861, Q3862, Q3863 | none | none |
| EX7-055 | none | none | none |
| EX7-056 | none | none | none |
| EX7-057 | none | none | none |
| EX7-058 | Q3864, Q3865 | none | none |
| EX7-059 | Q6391 | none | none |
| EX7-060 | none | none | none |
| EX7-061 | Q3866, Q3867, Q5169 | none | none |
| EX7-062 | none | none | none |
| EX7-063 | none | none | none |
| EX7-064 | Q3868, Q3869 | none | present |
| EX7-065 | none | none | none |
| EX7-066 | none | none | none |
| EX7-067 | Q3870 | none | none |
| EX7-068 | none | none | none |
| EX7-069 | none | none | none |
| EX7-070 | none | none | none |
| EX7-071 | none | none | none |
| EX7-072 | Q3871, Q3872, Q5728, Q5729 | none | none |
| EX7-073 | none | none | none |
| EX7-074 | Q3873 | none | none |

## Open items

- No card is below 10/10, and `docs/audits/EX7-reaudit/SOURCE-RECONCILIATION.md` records no catalog correction (`7430b511f`).
- Contradiction inside one file, unresolved: `docs/audits/EX7-reaudit/REVIEW-NOTES.md` (`7430b511f`) says EX7-059's Q6391 Tamer Blast Digivolve base was resolved in Blast validation with focused and proportional Blast suites at 54/54, and then, in the following bullet of the same entry, says the case is "retained as a top-level `it.fails`" and queued for serialized Blast Digivolve candidate validation. The ledger scores EX7-059 at 10/10. Confirm against the current suite whether an `it.fails` marker still exists for this card.
- Contradiction, resolved in favour of the newer source: `docs/audits/EX7-AUDIT.md` (2026-09-05, `03b7cc52a`) contains a mid-file note that "Blast evolution still requires mapped runtime evidence" at `2c271deff`, while its own final validation section and the 2026-09-09 re-audit both report all 74 cards at 10/10. The re-audit wins; the note belongs to an earlier state of that file.
- Two cards were accepted at 7/10 provisional mid-run with retained expected failures (EX7-014 for Q3835/Q3836/Q6718 and EX7-027 for inherited leave-prevention reset). Both were later promoted to 8/10 by serialized lanes and then to 10/10 at delivery; the intermediate reds are closed.
- Engine changes shipped with this set touch shared behaviour outside EX7: `playOrMove` restrictions on effect-driven moves to breeding, DigiXros leave-replacement consultation and cost-reduction policy, continuous source-relative restriction predicates, deferred token deletion candidates, future-entrant evolution restrictions, and the live printed-keyword reader. Their mechanism reports are reproduced under Mechanisms; tests referencing them should link to `docs/audits/EX7.md#mechanisms`.

## History

- `docs/audits/EX7-AUDIT.md` — last at `03b7cc52a`, 2026-09-05. Card-by-card ledger with a final validation section at `fd50ecd45`; superseded by the 2026-09-09 re-audit.
- `docs/audits/EX7-REAUDIT-LEDGER.md` — last at `43e6f893d`, 2026-09-09. Winning scoring table; merged into the Card ledger section above.
- `docs/audits/EX7-reaudit/` — last at `7430b511f`, 2026-09-09. 74 per-card reports, 13 `*-MECHANISM.md` reports, `KB-INDEX.md`, `RUN.md`, `REVIEW-NOTES.md`, `SOURCE-RECONCILIATION.md` and `WORKER-BRIEF.md`. All merged above except the worker brief, which was process instruction only.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX7: commit `91bf6bedc`.
