# EX1 Collection Audit

## Scope and catalog

The authoritative catalog query was:

```bash
node -e 'const c=require("./packages/shared/src/cards/data/cards.json"); console.log(c.filter(x=>x.cardId.startsWith("EX1-")).map(x=>x.cardId).join("\\n"))'
```

It returned exactly 73 cards, `EX1-001` through `EX1-073`, with no gaps. Each card was processed in ascending ID order. For each entry below, the card definition was inspected in `cards.json`, `node tools/kb/query.mjs card <ID>` was run, the direct module and colocated test were read, and the applicable shared interpreter/primitive and peer behavior were traced. The detailed clause-by-clause notes are retained in the range ledgers [001–025](../../apps/api/src/cards/EX1/AUDIT-001-025.md), [026–049](../../apps/api/src/cards/EX1/AUDIT-026-049.md), and [050–073](../../apps/api/src/cards/EX1/AUDIT-050-073.md).

All 73 modules register exactly once with `registerIrCard("<ID>", compiled)`, declare `coverage: "full"`, and have an empty `residual` array. Search evidence:

```bash
rg -n 'registerCard\\(' apps/api/src/cards/EX1   # no matches
rg -n 'RawUnparsed' apps/api/src/cards/EX1         # no matches
```

## Per-card evidence

| ID | Catalog name | KB result | Clause/implementation trace | Focused proof |
|---|---|---|---|---|
| EX1-001 | Agumon | Q3187–Q3188 | [001–025] entry: inherited reveal 3, one Tamer/Agumon add, bottom remainder, OPT | 1 pass |
| EX1-002 | Biyomon | Q3189 | [001–025] entry: inherited player-attack Draw 1, OPT; direct timing fix | 2 pass |
| EX1-003 | Birdramon | Q3190 | [001–025] entry: inherited player-attack delete, DP ≤3000 | 2 pass |
| EX1-004 | Greymon | Q3191 | [001–025] entry: exact Tai Kamiya hand play ≤3, optional OPT | 3 pass |
| EX1-005 | Tyrannomon | Q2082, Q2480, Q3192–Q3194 | [001–025] entry: Taiga play, green grant, inherited DP | 3 pass |
| EX1-006 | Garudamon | Q3195 | [001–025] entry: inherited player-attack memory +1, OPT | 2 pass |
| EX1-007 | Megadramon | none | [001–025] entry: up-to-2 delete ≤3000; Machine inherited Security Attack +1 | 2 pass |
| EX1-008 | MetalGreymon | Q3196–Q3197 | [001–025] entry: player-attack delete ≤4000; Machine/Dragonkin Piercing | 3 pass |
| EX1-009 | WarGreymon | Q3198–Q3199 | [001–025] entry: Blitz; Tamer-gated player-attack Blocker delete | 2 pass |
| EX1-010 | Phoenixmon | Q3200 | [001–025] entry: Security Attack +1; player-attack Draw 2 | 2 pass |
| EX1-011 | Gabumon | Q3201–Q3202 | [001–025] entry: inherited reveal 3, one Tamer/Gabumon add | 1 pass |
| EX1-012 | Gomamon | none | [001–025] entry: opponent bottom-source trash | 1 pass |
| EX1-013 | Veemon | none | [001–025] entry: Your Turn OPT unsuspend memory +1 | 1 pass |
| EX1-014 | ExVeemon | none | [001–025] entry: Jamming and Imperialdramon/Free inherited Jamming | 2 pass |
| EX1-015 | Garurumon | rules name-exactness | [001–025] entry: exact Matt Ishida hand play ≤3, optional OPT | 2 pass |
| EX1-016 | Ikkakumon | none | [001–025] entry: Your Turn attack unsuspended stackless Digimon | 2 pass |
| EX1-017 | WereGarurumon | none | [001–025] entry: digivolve Draw 1; 8-card hand attack memory +1 | 2 pass |
| EX1-018 | Zudomon | none | [001–025] entry: bottom-source trash; stackless attack permission | 2 pass |
| EX1-019 | Paildramon | none | [001–025] entry: Free-stack unsuspend; Imperialdramon cannot block | 2 pass |
| EX1-020 | Plesiomon | none | [001–025] entry: opponent source trash Draw 2 OPT; attack permission | 2 pass |
| EX1-021 | MetalGarurumon | none | [001–025] entry: hand-count memory; On Deletion bottom-deck and source trash | 2 pass |
| EX1-022 | Imperialdramon: Dragon Mode | Q3209 | [001–025] entry: Free-stack actions; distinct source colors DP scaling | 2 pass |
| EX1-023 | Elecmon | none | [001–025] entry: inherited deletion Security Attack −1 for turn | 1 pass |
| EX1-024 | Patamon | none | [001–025] entry: reveal 4, Angel/Archangel/Three Great Angels add | 1 pass |
| EX1-025 | Salamon | none | [001–025] entry: inherited 3-security attack Draw 1 OPT | 1 pass |
| EX1-026 | Gatomon | Q3210 | [026–049] entry: inherited 3-security attack −2000 for turn | 1 pass |
| EX1-027 | Leomon | Q3211 | [026–049] entry: Security Recovery +1 and post-check security count | 3 pass |
| EX1-028 | Angemon | Q3212 | [026–049] entry: inherited 3-security attack +1000 through opponent turn | 2 pass |
| EX1-029 | MagnaAngemon | Q3213–Q3214 | [026–049] entry: attack +4000; add-security memory +1 OPT | 2 pass |
| EX1-030 | Angewomon | Q3215–Q3216 | [026–049] entry: attack/security Digimon −3000; add-security −2000 | 2 pass |
| EX1-031 | Seraphimon | none | [026–049] entry: Recovery +1; suspended opponent-turn security +5000 | 2 pass |
| EX1-032 | Magnadramon | Q3217 | [026–049] entry: optional top-security trash unsuspend; attack Recovery | 2 pass |
| EX1-033 | Tentomon | Q3218–Q3222 | [026–049] entry: inherited attack evolution-cost reduction and consumption | 3 pass |
| EX1-034 | Palmon | none | [026–049] entry: deletion suspend opponent ≤5000 | 1 pass |
| EX1-035 | Kabuterimon | Q1594, Q3223–Q3224, Q3227 | [026–049] entry: optional attack Insectoid digivolve | 2 pass |
| EX1-036 | Togemon | none | [026–049] entry: opponent suspension inherited +2000 for turn OPT | 1 pass |
| EX1-037 | Kuwagamon | none | [026–049] entry: start-turn suspend; battle survival next-unsuspend restriction | 2 pass |
| EX1-038 | Stingmon | Q3225 | [026–049] entry: Piercing and Imperialdramon/Free inherited Piercing | 2 pass |
| EX1-039 | Lillymon | none | [026–049] entry: opponent suspension inherited Security Attack +1 | 1 pass |
| EX1-040 | MegaKabuterimon | Q3226–Q3229 | [026–049] entry: optional attack evolution; battle-survival memory +1 | 3 pass |
| EX1-041 | Dinobeemon | none | [026–049] entry: Free-stack suspend; Imperialdramon battle memory +1 | 3 pass |
| EX1-042 | Rosemon | none | [026–049] entry: opponent suspended scaling; attack suspend | 2 pass |
| EX1-043 | HerculesKabuterimon | Q3230 | [026–049] entry: Insectoid battle survival unsuspend; stack scaling | 5 pass |
| EX1-044 | Keramon | Q3231 | [026–049] entry: same-name other Digimon scaling | 1 pass |
| EX1-045 | Hagurumon | none | [026–049] entry: optional hand Machine/Cyborg trash then Draw 2 | 1 pass |
| EX1-046 | Kurisarimon | Q3232 | [026–049] entry: same-name deletion unsuspend OPT | 1 pass |
| EX1-047 | Guardromon | none | [026–049] entry: Blocker, Your Turn attack restriction, inherited trash/Draw | 2 pass |
| EX1-048 | Andromon | Q3233 | [026–049] entry: optional reveal/add Level 6 Machine; Blocker grant | 2 pass |
| EX1-049 | MetalTyrannomon | Q3234 | [026–049] entry: optional reveal/add Level 6 Machine; Reboot grant | 2 pass |
| EX1-050 | MetalMamemon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-051 | Infermon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-052 | Etemon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 4 pass |
| EX1-053 | MetalEtemon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-054 | Boltmon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-055 | Tapirmon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 1 pass |
| EX1-056 | DemiDevimon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-057 | Wizardmon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 1 pass |
| EX1-058 | Devimon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 1 pass |
| EX1-059 | Ogremon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-060 | LadyDevimon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-061 | Myotismon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 5 pass |
| EX1-062 | SkullGreymon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-063 | VenomMyotismon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 3 pass |
| EX1-064 | Piedmon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 1 pass |
| EX1-065 | Diaboromon | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 3 pass |
| EX1-066 | Analog Youth | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 9 pass |
| EX1-067 | Baptism by Fire! | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-068 | Ice Wall! | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 4 pass |
| EX1-069 | Ultimate Connection! | none | [050–073] entry: optional Level 5 Cyborg trash, transactional gain/draw; Security Main | 3 pass |
| EX1-070 | Fight for Your Pride! | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-071 | Win Rate: 60%! | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 7 pass |
| EX1-072 | Emergency Program Shutdown! | none | [050–073] entry: full printed clause mapping and trait/zone boundaries | 2 pass |
| EX1-073 | Machinedramon | none | [050–073] entry: full printed clause mapping, stack traits and source colors | 8 pass |

## Runtime and gate evidence

The focused command was run serially, one exact file per card:

```bash
pnpm --filter @aegis/api exec vitest run src/cards/EX1/EX1-<NNN>.test.ts
```

All 73 focused files passed. The serial run also executed `node tools/kb/query.mjs card <ID>` immediately before each focused test. During the audit, the following fidelity/fixture issues were corrected and independently committed: EX1-002 direct attack timing (`6134ece94`), EX1-008 direct attack timing and surviving negative fixture (`7fdf24527`), EX1-009 surviving negative Blocker fixture (`d7b34af8b`), EX1-010 direct attack timing (`fc74b5b70`), EX1-027 security threshold fixture (`8d660c704`), and EX1-069 declined-cost expectation (`4ac80f962`).

The final collection command and shared mechanism/regression suites remain the closeout gate; this ledger must not be treated as collection-complete until those commands, typecheck, style checks, and `git diff --check` are green on the final commit.
