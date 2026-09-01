# BT13 Audit Completion

Final status: **112/112 cards verified at reproducible 10/10** on 2026-09-01.

The authoritative detailed ledger is `docs/audits/BT13-AUDIT.md`. It records the catalog and rules trace, direct IR registration, card-local behavioral evidence, final corrections, and bounded delivery gates.

## Final corrections

- BT13-019 now limits its free-play selection to Digimon cards.
- BT13-030 uses only the printed Your Turn play watcher, including its own play, without a duplicate On Play return effect.
- BT13-092 gives the hand-card choice to the Burst Mode controller and moves the opponent's top security card to hand.
- Natural-path tests cover the strengthened digivolve, play, attack, turn, security, and watcher flows.

## Persistence contract

Run `pnpm effects:sync:set -- --set BT13` to update the 112 BT13 records in `effects.json`. Run `pnpm effects:check:set -- --set BT13 --base origin/main` to verify that every record matches its runtime registration and that no semantic record outside BT13 changed.

The final scoped check reported 93 BT13 changes and zero outside the set. The catalog contract passed 115 tests.

## Delivery gates

- Changed/evidence suites: 17 files, 99 tests.
- Full collection: 113 files, 727 tests.
- Mechanism suites: 11 files, 700 tests.
- State synchronization: 2 files, 7 tests.
- Synchronizer: 5 unit tests.
- Serial workspace typecheck passed.
- Oxfmt and Oxlint passed for the changed source, tests, tools, and docs.
- The generated JSON raw-scope check and `git diff --check` passed.

Every BT13 production module uses one matching `registerIrCard` registration and no legacy `registerCard` registration.
