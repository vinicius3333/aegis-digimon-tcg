# Astra integration notes

These are review findings and queued work, not scores or passing evidence.

## First wave: BT25-001–012

- Ordinary evolution always draws a bonus card. Assert the effect's additional
  draw separately. `Permanent.stack` excludes `topCard`; source order must be
  exact. A legal-looking injected stack is weaker than a public evolution with
  source transitions asserted.
- A repeated activation test must retain a legal second payload. Empty hands or
  illegal higher-level targets can make broken once-per-turn logic appear correct.
- Pagumon's trigger requires a Three Musketeers card actually added underneath.
  Evolving an Avian/TS host into a Musketeer does not put the new top underneath.
  Use a public source-placement effect and inspect the emitted source identity.
- A negative trait test must otherwise be legal: BT24-029's level-5 status already
  prevents normal evolution from level-3 BT25-009, so that pair alone cannot
  prove the Sea Animal exclusion.
- Shared `ActionBase` lacked the runtime-supported
  `preserveOncePerTurnOnDecline`. Add its type and remove the ad hoc cast in
  `runAction`; existing SubTrigger decline-budget tests are the mechanism gate.
- 009/010/012 use exact `match: trait` for printed substring families. The
  definition matcher distinguishes `trait` from `traitContains`. Keep TS/Shaman
  exact, match Beast/Animal/Sovereign (and Avian/Bird where printed) as substrings,
  and scope the Sea Animal exclusion to its family branch. Analogous committed
  P-207 Q5398/Q5399 spells out the independent family-versus-TS alternatives.
  Official English BT25 list confirms the committed wording:
  <https://world.digimoncard.com/cards/?category=522036&search=true>.
- Apply the same substring review to queued BT25-051 and BT25-055.

## Next batch: BT25-013–016

- 013: Q6255 explicitly allows paid hand trash followed by declined retrieval;
  exercise both actual play and actual evolution. Q6257 checks the resulting
  Digimon's blue color, so test non-blue-to-blue and blue-to-non-blue transitions.
  Existing inherited fixture places level 4 under level 3; replace with a legal
  level-5 host. Separate wrong color from wrong kind in retrieval candidates.
- 014: Q6258 allows activation with no deletable target; Q6259 makes selection
  mandatory if one exists; Q6260 permits selecting a protected eligible target
  and then drawing. Current inherited fixture's source ordering needs review.
  Prove both Flame and TS costs, alternate evolution, and actual attack deletion.
- 015: existing battle test title claims no repeat but inspect whether a second
  battle happens. Add Q6261 simultaneous battle deletion negative. Raid and
  Fortitude need observable keyword behavior, natural When Digivolving, and a
  legal level-6 inherited host (existing host is level 3).
- 016: retain existing Q6262–Q6264 attack-DP timing tests. Replace the inherited
  level-3-over-level-5 fixture with legal evolution and security checks. Cover both
  named destination alternatives, refusal, and entry-buff duration.

## Queued batch: BT25-017–020

- 017: Q6265/Q6266 evaluate the played/evolved subject after evolution. Test both
  color transitions with otherwise legal Apollomon in hand; separate attack
  refusal from paid deletion refusal, no-target payment, and 7000 DP boundary.
  Prove inherited extra security check on a legal level-6 host.
- 018: Q6267 defers zero-DP rule deletion until the whole entry effect finishes.
  Include the played Digimon in own-Digimon scaling, exclude Tamers/breeding,
  and prove the subsequent comparison uses changed DP. Q6268/Q6269 require an
  attack after either accepted DNA evolution or declined DNA evolution. Test
  12000 DP opponent-only play discount threshold and inherited live battle.
- 019: both protection branches apply at exactly five opponent memory; one
  applies on each side. Q6272–Q6277 require targetability, source-kind immunity,
  previously applied effects becoming ineffective, later reactivation when
  protection expires, and granted triggers not firing while suppressed. Any
  shared engine gap belongs to Astra with mechanism regression. Remove
  `@ts-nocheck` and preserve literal trigger types in the mapped entry effects.
- 020: 13000 DP discount is either player's battle-area Digimon. Q6279 allows
  direct battle against an immune target. Q6280/Q6281 constrain Piercing during
  multiple battles in one attack; Q6283 covers security battles; Q6284–Q6286
  require correct ordering and a win even when deletion is prevented. Keep TS
  winner gating and once-per-turn suppression causal with a second legal win.

## Current work after the 874-test integration pass

- 001–018, 021, 022: independent per-card approval recorded in the ledger. Revalidate after any affected shared change and again at final collection closeout.
- 019: root is tracing the existing 444-test immunity mechanism results to Q6272–Q6277; actual memory/source-kind effects, Reboot, Blocker and expiry already pass. Keep below 10 until that review closes.
- 020: Luna D owns a public Q6280/Q6281 regression. `combat/controller.ts` currently disables Piercing for all direct effect battles. A direct battle during the same attack may need to preserve eligibility until the ordinary battle ends; root owns any fix. No defect is yet confirmed by a red regression.
- 023: latest 12 focused tests add exact one-own-Tamer versus opponent-Tamer counting and legal neutral inheritance. Root final review pending.
- 024: official trash-source correction and causal bonus-versus-effect draw proof committed; 15 focused and full integration tests passed. Final card review pending.
- 025: 14 focused tests now use legal Lv6 inherited hosts. Q6289 pauses at the inherited choice and asserts the revealed Security effect already resolved. Actual Blocker behavior remains to be checked; metadata alone does not prove it.
- 026: Luna E owns exact public Blocker rejection during an open window, control without the inheritance, complete attack, optional trash-evolution refusal, hand-zone negative, actual blue-to-red evolution, restriction use and expiry.
- 027: initial worker edits were paused before root review. Not approved.
- 028: Luna C is replacing illegal opponent and inherited stacks, separating accepted-once from decline/retry, proving dynamic restrictions and Q6293 pending-entry ordering, and inherited Digimon/Tamer targets and duration. Its DNA trigger is All Turns on play/evolution, not end of turn.
- 029: queued after 028; official name-family discrepancy is in `OFFICIAL-SOURCE-CHECK.md` and awaits serialized catalog correction.
