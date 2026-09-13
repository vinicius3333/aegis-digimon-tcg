# Link parameter audit

## Status

Bounded public proof covers paid Link activation and Link Max capacity using
real Appmon providers. This is not full keyword certification.

## Contract and providers

The reviewed §16-40 contract (`comprehensive-0259`,
`data/kb/rules/comprehensive.md`, SHA-256
`19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`)
distinguishes a Link card's printed memory cost
from the host's Link Max capacity. BT21-041 has Link cost 1; EX10-073 carries
printed Link +1, raising the base capacity from one to two.
BT26-086 prints Link +6, raising the base capacity to seven; its amount is a
capacity grant rather than a six-memory payment.

## Public proof

`apps/api/src/engine/conformance/keyword-link-parameters.test.ts` uses public
`linkCard` intents to prove exact linked instance identity, payment, hand
removal, insufficient-memory refusal, and two physical links surviving under
Link Max +1. No link primitive or IR-only mirror is used.

The inventory's structured amount 6 is BT26-086's printed Link +6 capacity
grant, not a verified Link card payment cost; no current cost-6 provider is
claimed here.

Focused result: 1 file, 5 tests passing. Other Link costs and providers remain
open.
