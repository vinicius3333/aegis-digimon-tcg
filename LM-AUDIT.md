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

## LM-025 — Cyberdramon — pending focused execution

- Catalog contract maps to the direct `registerIrCard` module: optional free play of one
  revealed black cost-4-or-lower Tamer, ordered top-or-bottom return of the remainder, then
  an opponent De-Digivolve 1 only when a Tamer is present; inherited attack De-Digivolve 1 is
  once per turn.
- Existing focused behavioral fixtures cover successful Tamer play plus Then De-Digivolve,
  the no-revealed-Tamer negative, free play at zero memory, and inherited once-per-turn use.
- No local rulings add ambiguity. The focused suite is unrun while PID 43774 holds the serial
  slot, so this card remains below 10/10.

## LM-026 — Megidramon — pending focused execution

- Catalog and Q4029/Q4030 map to a self-bound optional leave replacement that plays a
  qualifying Guilmon from this stack or trash and relocates Megidramon beneath it; the
  existing interpreter path keeps the relocation out of Overflow's leaving-area handling.
- The rule-name alias is an executable name grant. The inherited `DeletionMaxDpModifier` raises
  only this host's numeric DP deletion ceiling, matching Q4031 and excluding nonnumeric
  DP-reference effects as Q4032 requires.
- Existing behavioral focused cases cover the 11000 threshold, both Guilmon source zones and
  final stack order, the ChaosGallantmon alias, and modifier positive/negative boundaries.
  They are deliberately unrun under PID 43774; the card remains below 10/10.
