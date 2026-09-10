# EX3 re-audit review notes

## Coordinator decisions

- Printed text, catalog errata, local card Q&A, compiled IR, and observable public-intent behavior are required evidence.
- Card modules must register behavior exclusively through `registerIrCard(cardId, compiled)`.

## Engine seam queue

- None identified at initialization.
- Closed: `gained-on-deletion-before-would-leave-replacement-ordering` (EX3-013/Q2212). The production engine already held the trigger before the replacement; a public Gaia Force regression now proves the ordering, and red-before removal of the mechanism made both Q2212 tests fail.
- Closed: `simultaneous-play-event-collapse` (EX3-026/030/031, cross-card Q3664 provenance). Multi-card effect plays now defer the per-entrant `whenPlayed` bus and emit one final event with the complete played set while preserving individual On Play and enter-field windows. Independent coordinator rerun passed 36/36 across the mechanism regression and all three focused card files.
- Closed: `opponent-turn-effect-origin-dna` (EX3-063/Q2891). BT20-016's production All Turns deletion replacement supplies the real public opponent-turn DNA path; EX3-063 gains Blitz but its owner's attack intent is rejected as `not-your-turn`.
- Closed: `opponent-empty-security-reveal` (EX3-070/Q3435). Exact Security IR plus real Security with no owner Digimon and public Main with no opposing Digimon compositionally prove both independent no-target halves; coordinator rerun passed 7/7 without injected timing or an invalid attack setup.

## Knowledge-base reconciliation

- Q3372 and Q3373 are returned for EX3-007 but describe EX3-048's reveal effect. They are recorded as a local KB indexing defect and are not used to alter EX3-007 behavior; card-local proof for EX3-007 passed independently.

## Fixture traps

- Follow the shared worker brief; no Digi-Egg cards in deck or security and no injected timing as behavioral proof.
