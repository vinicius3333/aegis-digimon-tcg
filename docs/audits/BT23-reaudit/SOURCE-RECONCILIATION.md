# BT23 official source reconciliation

The independent audit found missing special evolution clauses in the committed catalog and direct IR. A heading-presence comparison across all 102 BT23 catalog cards against the official collection page found omissions for 032, 047 and 102. This check is a source-data diagnostic, not full behavioral acceptance.

## BT23-032 Shakkoumon

The [official card entry](https://world.digimoncard.com/cards/index.php?card_no=BT23-032&search=true) provides a level-4 CS alternate evolution for 3 and DNA evolution for 0 using a yellow level 4 plus a black or blue level 4. The direct IR now encodes both DNA alternatives and the CS requirement; the catalog retains those printed clauses. The module continues to register only through registerIrCard.

The omission previously let the shared legacy ordinary-evolution fallback accept Angemon plus level-3 Tentomon for a DNA cost of 4. That result is invalid. The 027 audit now uses legal Angemon/Ankylomon materials at cost 0; its negative/bonus-draw assertions are still undergoing review. No score is awarded to 032 by this source correction alone.

Coordinator validation at integration: shared/API/web typecheck passed; App Fusion/visibility/027/028/032/ch08 passed 6 files / 111 tests; the separate DNA engine suite passed 1 file / 1 test. Logs: typecheck-appfusion-projection.log, projection-dna-card-integration.log, dna-requirement-integration.log. These tests establish integration safety and the corrected dependency route, not complete 032 fidelity.

BT23-scoped effects sync initially exceeded its formatter's 30-second timeout. The unchanged retry and subsequent check passed, reporting seven semantic changes against baseline a924de971e0b43ad9ebd8f82a454d495ff880a60, zero semantic/byte changes outside BT23 and 102 synchronized records. Logs: effects-sync-requirements.log, effects-sync-requirements-retry.log, effects-check-requirements.log. Exact-name changes to 026/027 are separately pending integration.

## Remaining source corrections

[Examon's official collection entry](https://en.digimoncard.com/cardlist/index.php?category=508034&search=true) supplies a CS level-6 alternate for 5 and green/blue level-6 DNA for 0. [Mastemon's official entry](https://en.digimoncard.com/cardlist/?card_no=BT23-102&search=true) supplies a CS level-5 alternate for 5 and yellow/purple level-5 DNA for 0. Their catalog text is prepared in the working tree; direct IR and behavioral proofs remain queued. These cards remain incomplete.

BT23-052 Consulmon: the catalog `linkEffect` carried a duplicated `[When Linking]` tag from the import. Removed the duplicate under coordinator ownership (text-only; no IR field depends on it). The double space in `effectText` between the Security and On Play clauses is left as imported.

BT23-013 Jesmon: `ALTERNATE_DIGIVOLUTION_OVERRIDES["BT23-013"]` in `packages/shared/src/effects/data.ts` used substring `names` for the printed exact `[SaviorHuckmon]` and `[Huckmon]` routes, so BaoHuckmon could take the cost-5 Huckmon route. Changed to `namesExact` under coordinator ownership (session 2 exact-name sweep).

Official "(Rule)" lines in BT23 (checked against logs/official-bt23.html, session 2): BT23-032 Angel type, BT23-042/043/045 Insectoid type, BT23-077 name alias [Sistermon Noir] plus Virus trait. The type and attribute halves are already present in the catalog `types`/`attributes` arrays. The 077 name alias was absent from both catalog text and module; the module now carries a `Rule` effect granting the name (same shape as BT6-084). The catalog `effectText` for these five cards omits the "(Rule)" sentence; it is left as imported because per-card tests assert the exact printed effect text, and the data fields carry the rule.

BT23-084 Erika Mishima: the catalog kept the `[Security]` clause inside `effectText` with no `securityEffectText`, unlike every peer Tamer. Moved the clause to `securityEffectText` under coordinator ownership (session 2); engine behaviour is driven by the module's `Security` trigger and is unchanged. 082/084 focused suites: 31 passed after the change.

Non-breaking spaces: several BT23 catalog `effectText` values carry U+00A0 (for example before "trait" in BT23-037, 041, 043, 053, 081, 087, 088). Some official entries print NBSP, some print ordinary spaces (BT23-088 differs). Tests normalise or pin as needed; a set-wide whitespace normalisation of the import is deferred to avoid churning exact-text assertions mid-audit.

BT23-100: `nameEn` was stored as "Hudie Net CafxE9" (import mojibake for é). Corrected to "Hudie Net Café" in the catalog, the 100 test and the ledger under coordinator ownership (session 2). The same import defect exists outside BT23 in BT10-101 and BT6-105 `nameEn`; left for those set audits.

BT23-099: catalog `effectText` read "with [Huckmon] in its name the field"; official text is "on the field". Corrected under coordinator ownership (session 2); the 099 test does not pin that fragment and stays green after a shared rebuild.
