# EX12 strict card-by-card audit

Scope: EX12-001 through EX12-077, audited independently in ascending order with the
`verify-card-implementation` workflow. A card receives 10/10 only after its complete
catalog record, local KB results, direct IR module, shared runtime semantics, peer risks,
and observable behavioral tests have been checked. Collection gates do not substitute
for the individual evidence below.

## EX12-001 — Nyaromon — 10/10

- **Printed contract:** Yellow level 2 Digi-Egg, Lesser/VB. Its inherited
  `[End of Your Turn]` effect requires the host to have the VB trait, optionally DNA
  digivolves that host together with any one other own Digimon into a VB Digimon card
  in hand, pays the destination's DNA cost, and then independently allows the resulting
  Digimon to attack.
- **KB evidence:** `node tools/kb/query.mjs card EX12-001`; Q6722 confirms that the
  resulting Digimon's `[When Digivolving]` and `[When Attacking]` effects both trigger
  before the inherited effect finishes and can be activated in either order. Comprehensive
  Rules 15-4-2 through 15-4-4 define simultaneous triggering and pending activation.
- **Implementation trace:** `EndOfYourTurn` + `isInherited` maps the timing and source;
  `selfHasTrait(VB)` gates the host; `DnaDigivolve.materials.filter.includesSelf` pins the
  host while `count: 2` selects one other own Digimon; `into` restricts the hand result to
  VB; `payCost: true` preserves the destination recipe/cost; `bindResultAs: dnaResult`
  scopes the following optional `Attack` to the new permanent. The shared DNA handler
  pre-fills self, excludes it from partner selection, and calls `canDnaDigivolve` against
  the destination's printed material requirements.
- **Correction:** removed the erroneous VB trait filter from the material pool. It had
  required both materials to be VB even though the printed text permits any other
  Digimon. The host remains VB-gated and fixed as a material.
- **Behavioral proof:** the colocated suite now uses non-VB EX12-054 as a legal partner;
  proves the realistic EX12-042 + EX12-054 to EX12-044 evolution stack; observes both
  EX12-044 timing effects from Q6722 via the combined DP change; verifies zero paid DNA
  cost, host-trait rejection, invalid level/material rejection, missing-partner rejection,
  refusal of the DNA action, and independent refusal of the resulting attack.
- **Peer/mechanism proof:** EX12-044 supplies the real VB DNA destination and four printed
  color recipes; EX12-054 is the mixed-trait comparison; the focused
  `filter.includesSelf on DnaDigivolve materials` capability test verifies the shared
  source-pinning seam.
- **Verification:** `EX12-001.test.ts` — 7/7 passed; focused DNA capability regression —
  1/1 passed. No residual IR, unsupported behavior, or unresolved card-specific ambiguity.
