# BT24-056 source discrepancy — confirmed and corrected; behavioral audit open

Inspected 2026-09-06 against initial commit a924de971e0b43ad9ebd8f82a454d495ff880a60.

The committed catalog effectText has an App Fusion recipe and an incomplete sentence fragment about playing an Appmon from trash. The direct module turns this into optional unrestricted Appmon revival on both play and evolution; focused tests assert that revival. The historical range report explicitly awarded those clauses full credit.

The official English card image has Blocker; play/evolution protection for one System, Life, or Transmutation Digimon against opponent return-to-hand/deck effects through opponent turn end; Appmon Link costing two; linked deletion up to play cost five; and +3000 link DP. It has no revival or App Fusion clause. Its evolution circles show black level-three cost two and multicolor Standard grade cost two. The committed catalog includes only the first route.

Sources inspected: [official BT24 card list](https://world.digimoncard.com/cards/?category=522033&search=true), [official card image](https://world.digimoncard.com/images/cardlist/card/BT24-056.png). Image downloaded with curl and visually inspected at /tmp/bt24-056-official.png. Local KB query `node tools/kb/query.mjs card BT24-056` has no dedicated entry.

Correction: removed the invented App Fusion recipe and revival from the source catalog/direct IR, and synchronized only BT24. The any-color Standard route uses the existing trait matcher, which includes forms (`Stnd.`); no shared engine change is needed. The source catalog evolution-cost schema retains its black level-three circle; the compiled route supplies the printed grade circle. The official image is the source for that route.

Validation: 12 focused tests pass. Together with BT24-005, catalog synchronization, candidate-legality, interpreter, primitives and subtrigger suites, 510 tests pass across seven files (`/tmp/bt24-first-mechanisms.log`). The set-scoped synchronization reports one semantic record change and no changes outside BT24 (`/tmp/bt24-effects-sync.log`).

Remaining evidence: public opponent hand/deck return attempts, actual Blocker combat, link target/refusal boundaries, and complete collection delivery gates. Score remains provisional, below 10/10.
