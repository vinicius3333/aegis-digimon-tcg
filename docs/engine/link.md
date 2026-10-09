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

## Digimon recipient enforcement (#4864)

The September 19, 2026 report paired BT25-036 Craftmon with P-217 Haru
Shinkai. Both carry the `[Appmon]` trait, but Haru is a Tamer. Comprehensive
Rules §6-5-1-4 and §10-1-3-1 require a Link recipient to be one of the
controller's Digimon in the battle area; satisfying the linked card's trait
requirement does not change that card-kind requirement.

`validateLinkCard` previously checked ownership, top-card presence and the
printed Link requirement without checking that the recipient's top card was a
Digimon. Because `syncLinkTargets` delegates to that validator, the same gap
both published Haru as a legal target and accepted a forged `linkCard` intent.
The validator now rejects non-Digimon recipients before evaluating the printed
requirement, keeping projections and authoritative intent handling aligned.

`BT25-036.test.ts` proves the reported pair through public intents: Craftmon's
target projection contains a real Appmon Digimon but excludes Haru, a direct
intent against Haru returns `illegal-target` without paying memory, and the same
physical Craftmon still links to the valid Digimon for its printed cost. The
shared parameter tests now use an actual Digimon host instead of the Tamer
fixture that had accidentally encoded the invalid behavior.

The relevant Oracle VPS containers had already been replaced when the incident
was investigated, so no match log from the reported 2026-09-19 04:17:47 UTC
window remained available. Inspection was read-only and no production state was
changed.
