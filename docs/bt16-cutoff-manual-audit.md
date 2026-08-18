# BT16 Cutoff Manual Card Audit

This tracker records the card-by-card audit required for the product range released no later than BT16:

- BT1 through BT16
- EX1 through EX6
- ST1 through ST10 and ST12 through ST17 (ST11 does not exist)
- RB1 and LM

Each card must be checked against `packages/shared/src/cards/data/cards.json`, the local KB query, its direct TypeScript module, and its colocated behavioral proof. Trait and evolution-stack interactions are recorded when the card's text makes them relevant.

## Completed cards

| Card | Catalog and implementation result | Behavioral proof | KB/rulings |
| --- | --- | --- | --- |
| BT11-001 Yokomon | Inherited On Deletion draws only while a red Tamer is on the owner's field; module uses the deletion payload and owner-scoped red-Tamer filter. | `BT11-001.test.ts`: positive host deletion and no-red-Tamer negative path. | No local KB entry. |
| BT11-002 Wanyamon | Inherited Once Per Turn When Attacking draws only with a blue Tamer; self-scoped attack timing and owner-scoped color filter match the catalog. | `BT11-002.test.ts`. | No local KB entry. |
| BT11-003 Tokomon | Your Turn/Once Per Turn inherited draw listens to a newly played owner's Angel, Archangel, or Fallen Angel Digimon and rejects opponent/non-Digimon subjects. | `BT11-003.test.ts`. | No local KB entry. |
| BT11-004 Tanemon | Your Turn/Once Per Turn inherited draw installs an owner-scoped green-Tamer play watcher; the source remains stack-inherited. | `BT11-004.test.ts`. | No local KB entry. |
| BT11-005 Koromon | Opponent's Turn/Once Per Turn inherited draw requires the host name to contain Greymon and a deleted opponent Digimon in the effect-deletion payload, matching Q2046 simultaneous-deletion ruling. | `BT11-005.test.ts`. | Q2046 verified via `tools/kb/query.mjs`. |
| BT11-006 Tsunomon | Your Turn/Once Per Turn +1000 DP reacts only to an effect-trashing a card from the owner's hand; rules-based trash is not represented by the hand-trash effect event. | `BT11-006.test.ts`. | Q2047 and Q2048 verified via `tools/kb/query.mjs`. |
| BT11-007 Biyomon | On Play reveals three, independently selects one red Vaccine Digimon and one red Tamer, then bottoms every remainder with ordering; inherited deletion memory gain requires a red Tamer. | `BT11-007.test.ts`. | Q2049–Q2052 verified via `tools/kb/query.mjs`. |
| BT11-008 Bearmon | Your Turn/Once Per Turn inherited +3000 DP is installed on the host and fires only when that host's attack target switches. | `BT11-008.test.ts`. | Q2053 verified via `tools/kb/query.mjs`. |
| BT11-009 Shoutmon + StarSword | DigiXros text, errata-correct Material Save 1, rule names, -3000 DP, and the conditional 2000-DP deletion are represented; the conditional branch keys off the DigiXros material count. | `BT11-009.test.ts`. | Q2054 and the 2023-02-17 errata verified via `tools/kb/query.mjs`. |
| BT11-010 Grizzlymon | Raid is granted as a permanent keyword; inherited target-switch +3000 DP is host-scoped and Once Per Turn. | `BT11-010.test.ts`. | Q2055 verified via `tools/kb/query.mjs`. |
| BT11-011 Birdramon | Blocker is granted permanently; inherited On Deletion optionally plays one owner red Tamer costing 4 or less without payment. | `BT11-011.test.ts`: Blocker and inherited red-Tamer play paths. | No local KB entry. |
| BT11-012 Shoutmon X3 | Material Save 2, optional Start of Your Turn self-delete for memory, and On Play reveal-three search for up to two Xros Heart/Blue Flare cards with ordered bottom-deck remainder are implemented. | `BT11-012.test.ts`: optional start-turn and reveal/search paths. | Q2056 (add as many as available) and Q2057 (start-turn optional) verified. |
| BT11-013 Garudamon | Blocker is granted permanently; inherited On Deletion optionally plays one owner red Tamer costing 4 or less without payment. | `BT11-013.test.ts`. | No local KB entry. |
| BT11-014 GrapLeomon | Raid is granted permanently; inherited Your Turn/Once Per Turn target-switch trigger trashes the opponent's top security card and is host-scoped. | `BT11-014.test.ts`: Raid and target-switch security path. | No local KB entry. |
| BT11-015 OmniShoutmon | When Digivolving deletes one opposing Digimon at 4000 DP or less, or two when Shoutmon is in the evolution stack; On Deletion supports Save; inherited Your Turn Shoutmon-name gate grants Security Attack +1. | `BT11-015.test.ts`: one/two deletion branches, Save, and inherited name gate. | No local KB entry. |
| BT11-016 Phoenixmon | Once-per-turn opponent-security removal reactivation and On Deletion red Avian/Bird/Beast/Animal/Sovereign play are implemented with exact Sea Animal exclusion and +2000 DP per red Tamer. | `BT11-016.test.ts`: nine focused tests cover trait matching, exclusion, scaling, first security removal, and once-per-turn behavior. | Q2058–Q2061 verified. |
| BT11-017 Marsmon | Raid and When Digivolving Blitz are granted; Your Turn/Once Per Turn target-switch trigger unsuspends this Digimon and gains one memory per owner red Tamer. | `BT11-017.test.ts`: Blitz and target-switch scaling paths. | Q2062 (blocking counts as target switch) verified. |
| BT11-018 Shoutmon DX | Rule names OmniShoutmon/ZeigGreymon and Material Save 2 are granted; On Play deletes an opposing Digimon up to 8000 DP, restricts one remaining opponent Digimon through its turn, and End of Attack optionally self-deletes for memory. | `BT11-018.test.ts`: deletion, attack restriction, self-delete, and rule-name behavior. | Q2063 and Q3062 verified. |
| BT11-019 Shoutmon X7 | Rush and Material Save 4 are granted; On Play deletes an opposing Digimon at or below this Digimon's DP; All Turns adds +1000 DP per two evolution cards. | `BT11-019.test.ts`: DP-stack scaling and deletion threshold. | No local KB entry. |
| BT11-020 Gaomon | On Play reveals three, adds one Gaogamon-name Digimon and one blue Tamer when available, and trashes the rest; inherited attack trigger with an owner Tamer returns an opposing level-3 Digimon to hand once per turn. | `BT11-020.test.ts`: both-category and single-category reveal paths. | Q2064 (partial category still works) and Q2065 (must add both when available) verified. |

The remaining cards are intentionally not marked complete until the same evidence is recorded for each one.
