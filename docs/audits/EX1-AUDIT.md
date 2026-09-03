# EX1 Collection Audit

## Scope and catalog

The authoritative catalog query was:

```bash
node -e 'const c=require("./packages/shared/src/cards/data/cards.json"); console.log(c.filter(x=>x.cardId.startsWith("EX1-")).map(x=>x.cardId).join("\\n"))'
```

It returned exactly 73 cards, `EX1-001` through `EX1-073`, with no gaps. Each card was processed in ascending ID order. For each entry below, the card definition was inspected in `cards.json`, `node tools/kb/query.mjs card <ID>` was run, the direct module and colocated test were read, and the applicable shared interpreter/primitive and peer behavior were traced. This file is the authoritative, self-contained EX1 ledger; superseded range notes were removed after their execution-pending claims were reconciled here.

All 73 modules register exactly once with `registerIrCard("<ID>", compiled)`, declare `coverage: "full"`, and have an empty `residual` array. Search evidence:

```bash
rg -n 'registerCard\\(' apps/api/src/cards/EX1   # no matches
rg -n 'RawUnparsed' apps/api/src/cards/EX1         # no matches
```

## Per-card evidence

| ID | Catalog name | KB result | Clause/implementation trace | Focused proof | Score |
|---|---|---|---|---|---|
| EX1-001 | Agumon | Q3187–Q3188 | inherited reveal 3, one Tamer/Agumon add, bottom remainder; non-red Agumon-name union and second-attack OPT boundary pass | 2 tests passed | 10/10 |
| EX1-002 | Biyomon | Q3189 | [001–025] entry: inherited player-attack Draw 1, OPT; direct timing fix | 2 tests passed | 10/10 |
| EX1-003 | Birdramon | Q3190 | [001–025] entry: inherited player-attack delete, DP ≤3000 | 2 tests passed | 10/10 |
| EX1-004 | Greymon | Q3191 | [001–025] entry: exact Tai Kamiya hand play ≤3, optional OPT | 3 tests passed | 10/10 |
| EX1-005 | Tyrannomon | Q2082, Q2480, Q3192–Q3194 | [001–025] entry: Taiga play, green grant, inherited DP | 3 tests passed | 10/10 |
| EX1-006 | Garudamon | Q3195 | [001–025] entry: inherited player-attack memory +1, OPT | 2 tests passed | 10/10 |
| EX1-007 | Megadramon | none | [001–025] entry: up-to-2 delete ≤3000; Machine inherited Security Attack +1 | 2 tests passed | 10/10 |
| EX1-008 | MetalGreymon | Q3196–Q3197 | [001–025] entry: player-attack delete ≤4000; Machine/Dragonkin Piercing | 3 tests passed | 10/10 |
| EX1-009 | WarGreymon | Q3198–Q3199 | [001–025] entry: Blitz; Tamer-gated player-attack Blocker delete | 2 tests passed | 10/10 |
| EX1-010 | Phoenixmon | Q3200 | [001–025] entry: Security Attack +1; player-attack Draw 2 | 2 tests passed | 10/10 |
| EX1-011 | Gabumon | Q3201–Q3202 | [001–025] entry: inherited reveal 3, one Tamer/Gabumon add | 1 tests passed | 10/10 |
| EX1-012 | Gomamon | none | [001–025] entry: opponent bottom-source trash | 1 tests passed | 10/10 |
| EX1-013 | Veemon | Q3203 | Your Turn main-phase unsuspend memory +1; opponent-turn rejection and second-unsuspend OPT boundary pass | 3 tests passed | 10/10 |
| EX1-014 | ExVeemon | none | [001–025] entry: Jamming and Imperialdramon/Free inherited Jamming | 2 tests passed | 10/10 |
| EX1-015 | Garurumon | rules name-exactness | [001–025] entry: exact Matt Ishida hand play ≤3, optional OPT | 2 tests passed | 10/10 |
| EX1-016 | Ikkakumon | none | [001–025] entry: Your Turn attack unsuspended stackless Digimon | 2 tests passed | 10/10 |
| EX1-017 | WereGarurumon | none | [001–025] entry: digivolve Draw 1; 8-card hand attack memory +1 | 2 tests passed | 10/10 |
| EX1-018 | Zudomon | none | [001–025] entry: bottom-source trash; stackless attack permission | 2 tests passed | 10/10 |
| EX1-019 | Paildramon | Q3204–Q3206 | [001–025] entry: Free-stack unsuspend; Imperialdramon cannot block | 2 tests passed | 10/10 |
| EX1-020 | Plesiomon | none | [001–025] entry: opponent source trash Draw 2 OPT; attack permission | 2 tests passed | 10/10 |
| EX1-021 | MetalGarurumon | Q3207–Q3208 | [001–025] entry: hand-count memory; On Deletion bottom-deck and source trash | 2 tests passed | 10/10 |
| EX1-022 | Imperialdramon: Dragon Mode | Q3209 | [001–025] entry: Free-stack actions; distinct source colors DP scaling | 2 tests passed | 10/10 |
| EX1-023 | Elecmon | none | [001–025] entry: inherited deletion Security Attack −1 for turn | 1 tests passed | 10/10 |
| EX1-024 | Patamon | none | reveal 4; OR trait alternatives Angel, Archangel, or Three Great Angels; no-match bottom-deck boundary tested | 5 tests passed | 10/10 |
| EX1-025 | Salamon | none | [001–025] entry: inherited 3-security attack Draw 1 OPT | 1 tests passed | 10/10 |
| EX1-026 | Gatomon | Q3210 | [026–049] entry: inherited 3-security attack −2000 for turn | 1 tests passed | 10/10 |
| EX1-027 | Leomon | Q3211 | [026–049] entry: Security Recovery +1 and post-check security count | 3 tests passed | 10/10 |
| EX1-028 | Angemon | Q3212 | [026–049] entry: inherited 3-security attack +1000 through opponent turn | 2 tests passed | 10/10 |
| EX1-029 | MagnaAngemon | Q3213–Q3214 | [026–049] entry: attack +4000; add-security memory +1 OPT | 2 tests passed | 10/10 |
| EX1-030 | Angewomon | Q3215–Q3216 | [026–049] entry: attack/security Digimon −3000; add-security −2000 | 2 tests passed | 10/10 |
| EX1-031 | Seraphimon | none | [026–049] entry: Recovery +1; suspended opponent-turn security +5000 | 2 tests passed | 10/10 |
| EX1-032 | Magnadramon | Q3217 | [026–049] entry: optional top-security trash unsuspend; attack Recovery | 2 tests passed | 10/10 |
| EX1-033 | Tentomon | Q3218–Q3222 | [026–049] entry: inherited attack evolution-cost reduction and consumption | 3 tests passed | 10/10 |
| EX1-034 | Palmon | none | [026–049] entry: deletion suspend opponent ≤5000 | 1 tests passed | 10/10 |
| EX1-035 | Kabuterimon | Q1594, Q3223–Q3224, Q3227 | [026–049] entry: optional attack Insectoid digivolve | 2 tests passed | 10/10 |
| EX1-036 | Togemon | none | [026–049] entry: opponent suspension inherited +2000 for turn OPT | 1 tests passed | 10/10 |
| EX1-037 | Kuwagamon | none | [026–049] entry: start-turn suspend; battle survival next-unsuspend restriction | 2 tests passed | 10/10 |
| EX1-038 | Stingmon | Q3225 | [026–049] entry: Piercing and Imperialdramon/Free inherited Piercing | 2 tests passed | 10/10 |
| EX1-039 | Lillymon | none | [026–049] entry: opponent suspension inherited Security Attack +1 | 1 tests passed | 10/10 |
| EX1-040 | MegaKabuterimon | Q3226–Q3229 | [026–049] entry: optional attack evolution; battle-survival memory +1 | 3 tests passed | 10/10 |
| EX1-041 | Dinobeemon | none | [026–049] entry: Free-stack suspend; Imperialdramon battle memory +1 | 3 tests passed | 10/10 |
| EX1-042 | Rosemon | none | [026–049] entry: opponent suspended scaling; attack suspend | 2 tests passed | 10/10 |
| EX1-043 | HerculesKabuterimon | Q3230 | [026–049] entry: Insectoid battle survival unsuspend; stack scaling | 5 tests passed | 10/10 |
| EX1-044 | Keramon | Q3231 | [026–049] entry: same-name other Digimon scaling | 1 tests passed | 10/10 |
| EX1-045 | Hagurumon | none | [026–049] entry: optional hand Machine/Cyborg trash then Draw 2 | 1 tests passed | 10/10 |
| EX1-046 | Kurisarimon | Q3232 | [026–049] entry: same-name deletion unsuspend OPT | 1 tests passed | 10/10 |
| EX1-047 | Guardromon | none | [026–049] entry: Blocker, Your Turn attack restriction, inherited trash/Draw | 2 tests passed | 10/10 |
| EX1-048 | Andromon | Q3233 | [026–049] entry: optional reveal/add Level 6 Machine; Blocker grant | 2 tests passed | 10/10 |
| EX1-049 | MetalTyrannomon | Q3234 | [026–049] entry: optional reveal/add Level 6 Machine; Reboot grant | 2 tests passed | 10/10 |
| EX1-050 | MetalMamemon | Q3235 | [050–073] On Digivolving may reveal top 3; add one level-6 Machine Digimon to hand, trash rest; inherited Your Turn Machine delete of opponent Digimon with play cost ≤5; optional reveal and inherited source/trait gates tested. | 2 tests passed | 10/10 |
| EX1-051 | Infermon | Q3236–Q3238 | [050–073] Opponent’s Turn OPT reacts to opponent battle-area level ≥5 evolution for memory +1; inherited All Turns gives other same-name-as-live-host Digimon +2000 DP; breeding, host-name, and deletion timing boundaries tested. | 2 tests passed | 10/10 |
| EX1-052 | Etemon | Q3239 | [050–073] Your Turn evolution into hand Etemon-name Digimon costs −1; inherited Your Turn Etemon-name host grants Jamming; breeding and name gates tested. | 4 tests passed | 10/10 |
| EX1-053 | MetalEtemon | errata 2021-12-10 | [050–073] Opponent’s Turn self +1000 per own-trash Etemon-name Digimon; On Deletion De-Digivolve 1 opponent Digimon; errata turn scope, trash scaling, and source removal tested. | 2 tests passed | 10/10 |
| EX1-054 | Boltmon | none | [050–073] Static Reboot plus When Digivolving De-Digivolve 1 opponent Digimon; target/count and keyword behavior tested. | 2 tests passed | 10/10 |
| EX1-055 | Tapirmon | Q3240 | [050–073] Inherited Your Turn OPT Draw 1 when another own Digimon is deleted; exclude-self, simultaneous deletion and once-per-turn boundaries tested. | 1 test passed | 10/10 |
| EX1-056 | DemiDevimon | Q3241–Q3242 | [050–073] Retaliation; Your Turn while no own Myotismon-name Digimon, self cannot attack Digimon (player attacks remain legal); target restriction and blocked-player boundary tested. | 2 tests passed | 10/10 |
| EX1-057 | Wizardmon | none | [050–073] Retaliation and inherited Your Turn Rush grant to all own Retaliation Digimon; controller/turn/trait grant tested. | 1 test passed | 10/10 |
| EX1-058 | Devimon | Q3243–Q3244 | [050–073] Inherited On Deletion mandatory return of one own-trash Purple Digimon level ≤4 to hand, including self; zone/color/level boundary tested. | 1 test passed | 10/10 |
| EX1-059 | Ogremon | none | [050–073] When Attacking optional hand-trash grants Security Attack +1; inherited optional hand-trash grants +2000 DP, each for turn; separate costs/refusal tested. | 2 tests passed | 10/10 |
| EX1-060 | LadyDevimon | Q3245 | [050–073] Optional When Digivolving trash top 3; inherited Your Turn OPT memory +1 when own Digimon is played from trash; optionality, origin and repetition tested. | 2 tests passed | 10/10 |
| EX1-061 | Myotismon | Q3246 | [050–073] Your Turn own Myotismon-name evolution cost −1; inherited Your Turn Myotismon-name host grants Retaliation Digimon attacks against unsuspended opponent level ≤4; breeding and host-name gates tested. | 5 tests passed | 10/10 |
| EX1-062 | SkullGreymon | Q3247–Q3248 | [050–073] Security Attack +1; End of Attack self-delete; On Deletion optional trash play exact Agumon suspended without cost; source-leaving timing and Agumon Expert/Bond exact-name boundaries tested. | 2 tests passed | 10/10 |
| EX1-063 | VenomMyotismon | Q3249 | [050–073] Retaliation; When Attacking OPT plays own-trash Purple Digimon level ≤4 with printed Retaliation, suppressing On Play; inherited-only Retaliation excluded and suppression tested. | 3 tests passed | 10/10 |
| EX1-064 | Piedmon | Q3250 | [050–073] On Play deletes four opponent unsuspended Digimon level ≤4; Your Turn OPT Draw 1 after opponent Digimon deletion; simultaneous count/once-per-turn boundary tested. | 1 test passed | 10/10 |
| EX1-065 | Diaboromon | Q3251–Q3253 | [050–073] Security may play one Diaboromon Token at battle end; Opponent’s Turn own Diaboromon gain Blocker; source loss, losing battle, and security ordering tested. | 3 tests passed | 10/10 |
| EX1-066 | Analog Youth | Q3254 | [050–073] On Play reveal 3/add one Digimon/trash rest; All Turns own level ≥5 sourced Digimon deletion may suspend self, memory +1, hatch; Security plays self; occupied breeding and optional cost tested. | 9 tests passed | 10/10 |
| EX1-067 | Baptism by Fire! | none | [050–073] Main deletes one opponent Digimon with Blocker and DP ≤6000; Security activates Main; conjunction and Security reuse tested. | 2 tests passed | 10/10 |
| EX1-068 | Ice Wall! | Q2120–Q2121, Q3255–Q3257 | [050–073] Main grants opponent Digimon When Attacking lose 2 memory through opponent’s next turn, including later entrants; Security gains 2; controller, duration, Blitz, immunity and later-entry boundaries tested. | 4 tests passed | 10/10 |
| EX1-069 | Ultimate Connection! | none | Main Option cost 1 may trash own-hand level-5 Cyborg Digimon, then gain 2 memory and Draw 1; Security activates Main; optional transaction/refusal and Security reuse tested. | 3 tests passed | 10/10 |
| EX1-070 | Fight for Your Pride! | none | [050–073] Main plays one own-trash Purple Digimon level ≤4 free, then conditionally grants own Digimon Blocker through opponent’s next turn when own Myotismon-name exists; Security only plays Digimon; zones, condition and duration tested. | 2 tests passed | 10/10 |
| EX1-071 | Win Rate: 60%! | Q1688, Q1736, Q3258–Q3264, Q3359 | [050–073] Tamer-gated color waiver; Main next battle-area evolution may trash same-color hand Digimon for −4, including multicolor/DNA rules; Security returns self; declaration order and pay-time boundaries tested. | 7 tests passed | 10/10 |
| EX1-072 | Emergency Program Shutdown! | Q3265–Q3266 | [050–073] Main opponent Option-use restriction through opponent’s next turn; Security restriction for turn then self returns hand; Security effects and already-placed Delay remain legal; duration tested. | 2 tests passed | 10/10 |
| EX1-073 | Machinedramon | Q3267–Q3268, Q6030; errata 2021-11-26 | [050–073] On Play may place up to five unique-number level-5 Red/Black Cyborg Digimon from hand/trash under self and gain memory per card; All Turns DP reduction immunity; deletion replacement may trash two own level-5 stack cards per deletion; source/color/unique/optional/repeat boundaries tested. | 8 tests passed | 10/10 |

## Runtime and gate evidence

The focused command was run serially, one exact file per card:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-<NNN>.test.ts
```

All 73 focused files passed. The serial run also executed `node tools/kb/query.mjs card <ID>` immediately before each focused test. During the audit, the following fidelity/fixture issues were corrected and independently committed: EX1-002 direct attack timing (`6134ece94`), EX1-008 direct attack timing and surviving negative fixture (`7fdf24527`), EX1-009 surviving negative Blocker fixture (`d7b34af8b`), EX1-010 direct attack timing (`fc74b5b70`), EX1-027 security threshold fixture (`8d660c704`), and EX1-069 declined-cost expectation (`4ac80f962`).

The final collection command and shared mechanism/regression suites remain the closeout gate; this ledger must not be treated as collection-complete until those commands, typecheck, style checks, and `git diff --check` are green on the final commit.
