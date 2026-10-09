# Jamming lifecycle audit

## Status

Bounded public proof covers printed and inherited Jamming through real security
battles. This is not full keyword certification.

## Contract and providers

The reviewed §16-9 contract makes Jamming protect a Digimon from deletion when
it loses a security battle. ST19-07 is a printed provider; AD1-010 is an
inherited provider carried by a host. The focused cases use the current card
catalog and actual security battle path. The reviewed source is
`data/kb/rules/comprehensive.md` (SHA-256
`19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`).

## Public proof

`apps/api/src/engine/conformance/keyword-jamming-lifecycle.test.ts` proves a
Jamming attacker survives a stronger security Digimon, an ordinary attacker is
deleted under the same battle, and AD1-010's inherited Jamming preserves its
host. A fourth public case reveals ST1-16 from security and confirms its
effect-based deletion trashes the Jamming attacker and the option itself;
Jamming does not protect against that cause. No security primitive or
fabricated outcome is used.

Focused result: 1 file, 4 tests passing. Other provider shapes remain open.
