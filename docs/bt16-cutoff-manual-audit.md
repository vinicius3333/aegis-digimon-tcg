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

The remaining cards are intentionally not marked complete until the same evidence is recorded for each one.
