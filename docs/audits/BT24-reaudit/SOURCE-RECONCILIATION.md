# BT24 source reconciliation

The catalog contains 102 BT24 records, matching the ledger. Comparison to the retained catalog-kb-snapshot.json found one changed source field: BT24-056 effectText. Its historical official-image reconciliation is recorded in [BT24-056-source-gap.md](BT24-056-source-gap.md). That correction removed invented App Fusion/revival clauses; current runtime must continue to match the corrected printed protection and Link contract.

On this restart, a fresh web-tool request for the official BT24-056 PNG failed to open. This is not fresh official-image verification. The prior evidence record is retained with its original attribution; no additional catalog change or claim of fresh visual verification has been made.

The post-main-merge effects baseline is da5c7733c. `pnpm effects:sync:set -- --set BT24 --base da5c7733c` reports all 102 records already synchronized and zero semantic/byte changes outside BT24. The original audit baseline remains in RUN.md for historical attribution.

## BT24-086 printed rule restored, 2026-09-08

Fresh official English card-list verification: [BT24 card list](https://en.digimoncard.com/cardlist/?category=508035&search=true), BT24-086 entry, states that The Crossroad Witch is also treated as Shuu Yulin and has the DigiPolice trait. The catalog already included the trait but omitted the name rule. Restored the printed rule to effectText and added the supported static alias-table entry because this printed word order is outside the existing generic parser. Q5674 confirms that the inherited Shuu effect can play this card itself from digivolution cards; it is not limited to self-play and must still permit other Shuu Yulin cards.

This source gap was exposed by005's real-turn MindLink reset. Previous claims that leaving086 linked was correct were rejected against Q5674. No special-case change to086's inherited target is justified.
