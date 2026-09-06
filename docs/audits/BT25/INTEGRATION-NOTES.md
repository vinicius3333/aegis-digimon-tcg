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
