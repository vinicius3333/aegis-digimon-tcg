# BT26-037–BT26-072 independent re-audit

Date: 2026-09-05  
Scope: direct catalog, local KB, direct IR module, colocated behavioral test, and shared primitive/trigger paths.

The catalog source was `packages/shared/src/cards/data/cards.json`. Every card below has a direct module and focused test, uses `registerIrCard("<ID>", compiled)` exclusively, and reports `coverage: "full"` with `residual: []`. The KB command was run for every card; all commands exited 0. No errata or restrictions were returned. Q&A IDs are recorded where present.

## Results

| Card                                | Printed behavior traced                                                                                                | KB          | Focused result | Score |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | -------------: | ----: |
| BT26-037 Weatherdramon              | App Fusion, Assembly -2, Blocker, Seven Code Detach, own-stack level-3 Link, linked battle                             | Q7014–Q7017 |         9 pass | 10/10 |
| BT26-038 Kuwagamon                  | any-Digimon suspend, Insectoid/Titan +3000 DP, inherited battle-win evolution                                          | Q7018–Q7023 |         7 pass | 10/10 |
| BT26-039 Sunflowmon                 | ≤1 Tamer exact Yoshino play; inherited opponent unsuspend restriction                                                  | —           |        11 pass | 10/10 |
| BT26-040 Drimogemon                 | Training, Piercing, opponent suspend, face-down stack placement and scaling                                            | —           |        11 pass | 10/10 |
| BT26-041 Hudiemon                   | security handoff, Recovery +1, optional suspend, inherited battle-win memory                                           | —           |        10 pass | 10/10 |
| BT26-042 Okuwamon                   | opponent Digimon/Tamer suspend and lock; inherited Piercing/+3000                                                      | Q7031–Q7033 |        11 pass | 10/10 |
| BT26-043 Piximon                    | Blocker, opponent suspend, face-down deck-top stack, per-face-down unsuspend lock                                      | Q7034       |         6 pass | 10/10 |
| BT26-044 Lilamon                    | optional suspend/lock; inherited Once Per Turn hand evolution on opponent suspend/Tamer trash                          | Q7035       |         7 pass | 10/10 |
| BT26-045 GranKuwagamon              | hand-size play reduction, free Insectoid/Titan play, inherited Alliance/Piercing/Vortex                                | Q7036–Q7038 |         7 pass | 10/10 |
| BT26-046 Gryphonmon                 | suspended-Digimon reduction, Piercing/Vortex, opponent lock, own battle-deletion protection, Avian Rule trait          | Q7039       |         6 pass | 10/10 |
| BT26-047 TyrantKabuterimon          | Assembly -6 with four distinct levels, immediate battle, suspension cost and immunity/+3000                            | Q7040–Q7049 |        11 pass | 10/10 |
| BT26-048 BloomLordmon               | face-down bottom trash cost, free Ver.4 play, inherited opponent DP reduction                                          | Q7050–Q7051 |         7 pass | 10/10 |
| BT26-049 Rosemon                    | suspend 2; inherited opponent suspend/Tamer-trash play/use with count-based reduction                                  | —           |         7 pass | 10/10 |
| BT26-050 Rosemon: Burst Mode        | Burst Digivolve/Yoshino return, suspend 2 and lock 2, bottom suspended Digimon and trash security                      | Q7052–Q7055 |         9 pass | 10/10 |
| BT26-051 Gomimon                    | Seven Code Detach; inherited linked Social/Tool/Open/Seven Code Collision/+3000                                        | —           |         6 pass | 10/10 |
| BT26-052 Pristimon                  | reveal 3; add Glowing Dawn and black BEATBREAK slots without reuse; bottom remainder; inherited Reboot                 | —           |         7 pass | 10/10 |
| BT26-053 Wolvermon                  | Blocker; target-switch Once Per Turn face-down Tamer cost and Glowing Dawn Option use                                  | —           |        10 pass | 10/10 |
| BT26-054 Andromon                   | optional exact CS Tamer play excluding duplicate names; inherited free CS evolution after CS stack placement           | —           |         6 pass | 10/10 |
| BT26-055 Giromon                    | Fragment 2; optional face-down placement; optional Ver.3 deletion and lowest-cost opponent deletion                    | Q7058       |        10 pass | 10/10 |
| BT26-056 Cerberusmon: Werewolf Mode | Jamming/Reboot/Blocker, Titan replay on deletion, Dark Animal Rule, dual evolution, dual Option                        | Q7059       |        10 pass | 10/10 |
| BT26-057 Bearcatmon                 | face-down Tamer cost, opposing Digimon-effect immunity/+3000, shared target-switch/Tamer-trash unsuspend, dual Option  | Q7060–Q7066 |         8 pass | 10/10 |
| BT26-058 HiAndromon                 | Reboot/Blocker, CS immunity, CS leave-play replacement by stack rotation                                               | —           |         9 pass | 10/10 |
| BT26-059 Plutomon                   | strict hand reduction, once-per-turn Titan trash play, all-turn lowest-level deletion on hand trash                    | Q7074–Q7078 |        11 pass | 10/10 |
| BT26-060 Chronomon: Destroy Mode    | Chronomon/Giant Slayer alternate routes, Reboot/Blocker/Security Attack, top five from three stacks, deck-add deletion | Q7079–Q7087 |        10 pass | 10/10 |
| BT26-061 Chiropmon                  | reveal 3; Glowing Dawn and purple BEATBREAK slots, bottom remainder; inherited Draw then Trash                         | —           |         7 pass | 10/10 |
| BT26-062 Ghostmon                   | optional Ghost/NSo hand cost, Draw 1 and memory; inherited Your Turn +2000; NSo evolution                              | —           |        10 pass | 10/10 |
| BT26-063 Tellermon                  | Appmon evolution, Seven Code Detach, linked reveal and top/bottom choice, lowest-level linked deletion                 | —           |        14 pass | 10/10 |
| BT26-064 DemiDevimon                | reveal Fallen Angel/Undead/Wizard/Demon Lord and TS slots, bottom remainder                                            | —           |         6 pass | 10/10 |
| BT26-065 Falcomon                   | reveal exact Keenan/DATA SQUAD and purple Ravemon/Avian/Bird slots                                                     | Q7088       |         8 pass | 10/10 |
| BT26-066 Salamon                    | ≤5 hand Start Main Titan trash evolution with cost reduction                                                           | Q7089       |         8 pass | 10/10 |
| BT26-067 Wizardmon                  | Draw then mandatory hand trash; end-turn self-bottom and reduced Iliad replay                                          | —           |        11 pass | 10/10 |
| BT26-068 Devimon                    | ≤5 hand both-player Draw 2; inherited opponent-hand-add costed discard                                                 | —           |        10 pass | 10/10 |
| BT26-069 Dobermon                   | hand-trash conditional Draw; costed hand-trash and level boundary deletion                                             | Q7090–Q7091 |        11 pass | 10/10 |
| BT26-070 NightChiropmon             | Draw then Trash; two bottom face-down Tamer cost; reduced Glowing Dawn Option; inherited Retaliation                   | Q7092–Q7093 |        14 pass | 10/10 |
| BT26-071 Flarerizamon               | optional own deletion cost and opponent level ≤4 deletion; NSo evolution                                               | —           |         7 pass | 10/10 |
| BT26-072 Peckmon                    | Blocker; hand trash or Keenan-under placement cost; opponent level ≤4 deletion                                         | Q7094–Q7097 |         8 pass | 10/10 |

## BT26-070 correction

The initial focused failure used a BT26-075 host with `autoAcceptOptional` and stopped settling as soon as the host left play. BT26-075 has `<Ascension>`; accepting Ascension first moves its top card out of trash and cancels its pending inherited effects (KB Q7100), so Retaliation correctly did not resolve. The focused suite now includes a legal purple Lv.5 BT26-074 host carrying BT26-070, plus manual BT26-075 ordering cases: Ascension first keeps the opponent alive, while On Deletion first allows inherited Retaliation to delete it. No shared engine change was required; tracing the actual `resolveDeletionReactions` callback disproved the suspected trigger-forwarding gap.

## BT26-052 strengthened proof

The focused test now proves the inherited Reboot through the public turn flow: a suspended host carrying BT26-052 is actually unsuspended during the opponent's Active phase. It also proves the reveal color boundary with a valid black Glowing Dawn/BEATBREAK card and a yellow Glowing Dawn/BEATBREAK near-match; only the black card enters hand and the yellow card bottoms. The focused file passes 7/7.

## Verification commands

```text
node tools/kb/query.mjs card BT26-037 --json ... card BT26-072 --json
  PASS individually for all 36 cards

pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-037.test.ts ... BT26-072.test.ts
  36 files pass; BT26-070 has 14 passing tests

pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-052.test.ts --pool=threads --no-file-parallelism
  PASS (1 file, 7 tests)
```

The direct modules in this range are full IR and registration-compliant. No unresolved printed clause remains for this range.

## Integrated verification — 2026-09-06

All cards in this range passed in the final 104-file, 993-test collection run. The current per-card test counts and collection recalculation are recorded in `BT26-REAUDIT-20260905.md`. The detailed inspection above and the linked direct tests supply clause evidence; passing counts alone do not establish fidelity.
