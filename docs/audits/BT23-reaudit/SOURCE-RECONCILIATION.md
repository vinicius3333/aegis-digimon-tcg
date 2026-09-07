# BT23 official source reconciliation

The independent audit found missing special evolution clauses in the committed catalog and direct IR. A heading-presence comparison across all 102 BT23 catalog cards against the official collection page found omissions for 032, 047 and 102. This check is a source-data diagnostic, not full behavioral acceptance.

## BT23-032 Shakkoumon

The [official card entry](https://world.digimoncard.com/cards/index.php?card_no=BT23-032&search=true) provides a level-4 CS alternate evolution for 3 and DNA evolution for 0 using a yellow level 4 plus a black or blue level 4. The direct IR now encodes both DNA alternatives and the CS requirement; the catalog retains those printed clauses. The module continues to register only through registerIrCard.

The omission previously let the shared legacy ordinary-evolution fallback accept Angemon plus level-3 Tentomon for a DNA cost of 4. That result is invalid. The 027 audit now uses legal Angemon/Ankylomon materials at cost 0; its negative/bonus-draw assertions are still undergoing review. No score is awarded to 032 by this source correction alone.

Coordinator validation at integration: shared/API/web typecheck passed; App Fusion/visibility/027/028/032/ch08 passed 6 files / 111 tests; the separate DNA engine suite passed 1 file / 1 test. Logs: typecheck-appfusion-projection.log, projection-dna-card-integration.log, dna-requirement-integration.log. These tests establish integration safety and the corrected dependency route, not complete 032 fidelity.

BT23-scoped effects sync initially exceeded its formatter's 30-second timeout. The unchanged retry and subsequent check passed, reporting seven semantic changes against baseline a924de971e0b43ad9ebd8f82a454d495ff880a60, zero semantic/byte changes outside BT23 and 102 synchronized records. Logs: effects-sync-requirements.log, effects-sync-requirements-retry.log, effects-check-requirements.log. Exact-name changes to 026/027 are separately pending integration.

## Remaining source corrections

[Examon's official collection entry](https://en.digimoncard.com/cardlist/index.php?category=508034&search=true) supplies a CS level-6 alternate for 5 and green/blue level-6 DNA for 0. [Mastemon's official entry](https://en.digimoncard.com/cardlist/?card_no=BT23-102&search=true) supplies a CS level-5 alternate for 5 and yellow/purple level-5 DNA for 0. Their catalog text is prepared in the working tree; direct IR and behavioral proofs remain queued. These cards remain incomplete.
