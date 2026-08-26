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

## LM-027 — Red Scramble — pending focused execution

- Direct IR keeps ordinary red-Digimon evolution legality (`ignoreRequirements: false`), excludes
  burst/DNA forms by using the ordinary hand Digivolve action, and places the resolved Option in
  battle after the optional evolution attempt, matching Q4033-Q4035.
- The opponent-Digimon start-turn gate arms Delay; its nonoptional trash-to-deck-top return runs
  before the optional small red-trash play, matching Q4036/Q4037. Security independently performs
  optional small-red play then returns Red Scramble to hand.
- Existing behavioral cases cover cost reduction, Delay ordering, size cap, no-opponent gate,
  empty-trash Q4036 activation, and Security follow-up. They remain unrun under PID 43774, so
  this card is below 10/10.

## LM-028 — Blue Scramble — pending focused execution

- The direct IR is the blue-scoped analogue of the Scramble contract: ordinary legal blue
  hand evolution with cost reduced by three, battle-area placement, opponent-Digimon-gated
  Delay, mandatory blue-trash return before optional 2000-DP-or-lower revival, and Security
  play followed by self hand return. Q4038-Q4042 align with these paths.
- Existing behavioral tests cover cost reduction and post-use placement, Delay ordering and
  opponent absence, Security positive and above-2000 negative boundaries. They remain unrun
  under PID 43774, so this card is below 10/10.

## LM-029 — Yellow Scramble — pending focused execution

- Catalog, direct IR, and existing behavioral fixtures agree on the yellow Scramble contract:
  legal yellow evolution at minus three, placement, opponent-gated Delay with mandatory
  yellow-trash return before optional low-DP play, and Security play/hand return.
- KB Q4043-Q4047 match that contract. Q4737/Q4738 are indexed under LM-029 in the local KB but
  describe an absent `[Your Turn]` Option-use/unsuspend clause; the same rulings and wording are
  implemented for EX8-037, so this is a knowledge-base card-association conflict rather than
  sufficient authority to add unprinted LM-029 behavior. It remains explicitly unresolved.
- Existing focused scenarios are behavioral but unrun under PID 43774. The unresolved KB linkage
  and absent authoritative printed clause keep LM-029 below 10/10.

## LM-030 — Green Scramble — pending focused execution

- Catalog and Q4048-Q4052 align with the direct `registerIrCard` IR: ordinary legal green
  hand evolution at minus three and self placement, followed by opponent-Digimon-gated Delay
  whose mandatory green-trash-to-deck-top return precedes the optional small-green revival.
- Security independently offers the optional 2000-DP-or-lower green play, then returns Green
  Scramble to hand. Existing behavioral fixtures cover the legal cost reduction and placement,
  Delay order and no-opponent negative, Security positive and over-2000 negative boundaries.
- Those proofs remain deliberately unrun while PID 43774 holds the test slot, so LM-030 remains
  below 10/10.

## LM-031 — Black Scramble — pending focused execution

- Catalog and Q4053-Q4057 align with direct compiled IR: black Digimon-only ordinary legal hand
  evolution at minus three, followed by self placement; this excludes altered evolution routes and
  Tamers because the executable target is a black Digimon and `Digivolve` retains requirements.
- The opponent-Digimon-gated Delay performs the mandatory black-trash deck-top return before its
  optional 2000-DP-or-lower play; Security is the independent optional play followed by self hand
  return. Existing behavioral fixtures prove those positive and no-opponent/over-2000 boundaries.
- The focused fixtures remain unrun under PID 43774, so LM-031 remains below 10/10.

## LM-032 — Purple Scramble — pending focused execution

- Catalog and Q4058-Q4062 align with the direct IR: purple Digimon-only ordinary legal hand
  evolution reduced by three and self placement, excluding altered routes and Tamers; the
  opponent-Digimon-gated Delay mandates a purple-trash return before optional small-purple play.
- Security's optional 2000-DP-or-lower purple revival and self hand return are separately
  compiled. Existing behavioral tests cover the positive paths plus no-opponent and over-2000
  negative boundaries.
- The focused suite is intentionally unrun while PID 43774 holds the test slot, so LM-032 remains
  below 10/10.

## LM-033 — Garnet Memory Boost! — pending focused execution

- Catalog and Q4063/Q4064 map to a self-bound Static `WaiveColorRequirement` with
  `alsoColor: black`, not a blanket waiver. The interpreter's option-legality path includes both
  battle and breeding area colour sources, and keeps a red-or-black source mandatory.
- Main correctly reveals three, adds one red-or-black Digimon, bottoms the rest, then places the
  Option; Delay separately gains two memory; Security places it. The focused module proves red,
  black battle, black breeding, and no-colour-source paths, and the shared Delay suite exercises
  cost/payment removal and the two-memory payload.
- All focused proof remains unrun under PID 43774, so LM-033 remains below 10/10.

## LM-034 — Wisteria Memory Boost! — pending focused execution

- Catalog and Q4065/Q4066 map to the direct Static `WaiveColorRequirement` with
  `alsoColor: red`; interpreter legality treats a blue or red source in battle or breeding as
  satisfying the printed blue requirement, without converting the effect into a blanket waiver.
- Main reveals three, adds one blue-or-red Digimon, bottoms the rest, and places the Option;
  Delay separately gains two memory and Security places it. Focused fixtures cover blue, red
  battle, red breeding, no eligible source, reveal results, and Security, while the shared Delay
  suite covers activation/payment/result behavior. The stale Q&A reference in the test comment
  was corrected from Q4063/Q4064 to Q4065/Q4066.
- Proof is deliberately unrun under PID 43774, so LM-034 remains below 10/10.
