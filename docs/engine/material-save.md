# Material Save parameter audit

## Status

Bounded public lifecycle proof covers the printed Material Save 1 through 4
amount family using BT11-009, BT19-025, BT10-013, and BT11-019. This is not
full keyword certification or a claim over all twelve catalog providers.

## Contract and providers

The reviewed §16-21 contract permits up to the printed amount of cards named
by the deleted Digimon's own DigiXros requirement to be placed under one of
the controller's Tamers. The selected cards remain distinct instances; the
deleted host and unselected materials go to trash. The focused providers are
BT19-025 (amount 2, Blue Flare materials) and BT10-013 (amount 3, five named
Xros Heart materials).

The catalog inventory also contains amount 1 providers BT10-111, BT11-009 and
BT19-063, and amount 4 providers BT11-019 and BT19-014. Those shapes are
inventory only here and are not represented by the focused proof.

## Public proof

`apps/api/src/engine/conformance/keyword-material-save-parameters.test.ts`
drives real losing battles through public `attack` intents. It proves exact
source instance placement for Material Save 1 and 2, explicit refusal and
trashing with a Tamer available, no-Tamer ineligibility, and the Material Save
3 and 4 upper bounds: exactly the printed number of eligible
materials are placed while the host and remaining two materials are trashed.
No deletion primitive, fabricated decision, or IR-only assertion is used.

Focused result: `pnpm --filter @aegis/api exec vitest run
src/engine/conformance/keyword-material-save-parameters.test.ts` — 1 file,
6 tests passing. Other providers, inherited behavior, and broader keyword
certification remain open.
