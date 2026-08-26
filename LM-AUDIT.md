# LM Audit Ledger

This ledger records source and focused-proof evidence for the LM collection. A card
is not 10/10 until its focused test has been run in the authorized serial test slot,
its applicable mechanism coverage is green, and collection evidence is refreshed.

## LM-023 — Sakuyamon: Maid Mode — pending focused execution

- Catalog and Q4024/Q4025: yellow Tamer or single-color Option placement is optional,
  revealed, and placed on top of security.
- Q5516: the Option cap is now `effectiveUseCostLte: 5`; loose-card selection queries
  the active hand-use cost ledger, so BT2-099's printed cost 9 is eligible after four
  Yellow Tamer reductions make its use cost 5.
- Q5517/Q5518: the existing `whenOptionUsed` watcher uses the real post-Main use event,
  rather than Security or Delay activation.
- Focused behavioral case for the Q5516 reduced-cost boundary is authored but deliberately
  unrun while the broad Vitest process holds the test slot.

## LM-024 — Shivamon — pending focused execution

- Catalog and Q4026: the direct `registerIrCard` IR independently applies the
  three-or-more suspend/own +3000 DP branch and the three-or-fewer suspended-opponent
  return branch, so exactly three security executes both.
- Q4027/Q4028: the all-turns grant is live only while the source is suspended and is
  specifically limited to opponent Digimon effects; the shared grant interpreter records a
  Digimon-source-qualified `beAffected` restriction.
- Existing focused behavioral cases cover security counts two, exactly three, and four; an
  own-Digimon suspension choice; and the suspension-to-unsuspension immunity transition.
  They remain unrun while PID 43774 holds the test slot. The security-Digimon example in Q4027
  is currently mechanism-traced rather than exercised as a card-level fixture, so this card
  remains below 10/10.
