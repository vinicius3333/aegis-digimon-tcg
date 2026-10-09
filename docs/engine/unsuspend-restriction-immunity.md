# Unsuspend restrictions and immunity

Date: 2026-09-19

## Report and rules

Discord report `1550896941024542812` described BT16-102 Magnamon (X Antibody)
remaining suspended after BT24-095 Sonic Shot had affected its previous form.
Both the When Digivolving unsuspend and the opponent-turn All Turns reactivation
were reproduced as failing behavioral tests.

- Sonic Shot's catalog and [official card text](https://en.digimoncard.com/cardlist/?category=508035&search=true)
  restrict only the target's next unsuspend phase, not all unsuspend effects.
- Local BT16-102 Q2701 confirms the trailing unsuspend is independent of the
  Armor Form condition that grants DP and immunity.
- Local comprehensive rules §15-15-5-1/-2 and ST17-08 Q831 establish suppression
  of an existing opposing effect during immunity and reapplication when immunity
  ends, provided the effect's own duration has not ended.
- The [official comprehensive rules](https://world.digimoncard.com/rule/pdf/general_rule.pdf?20260401=),
  v4.2 dated 2026-08-18, retain those immunity provisions.

## Correction

Sonic Shot now uses `unsuspendDuringOwnUnsuspendPhase`, retaining its original
duration. The unsuspend verb checks this prohibition only during the target
controller's Active phase. General unsuspend prohibitions and any-player
unsuspend-phase prohibitions keep their distinct meanings.

Per-permanent restriction entries now retain their originating effect's seat and
source kinds. `hasRestriction` and `restrictionCount` suppress matching entries
while applicable immunity exists, without deleting them or changing their expiry.
Opponent-only immunity does not suppress the controller's own restrictions;
source-kind immunity does not suppress restrictions from other kinds. Immunity
entries themselves remain visible, preventing their self-suppression. Entries
installed directly without provenance retain their prior behavior. This does not
rewrite player-scoped restriction predicates or other immunity mechanisms.

## Behavioral evidence

- `BT16-102.test.ts`: real Security resolution before legal Magnamon evolution;
  opponent-turn security-removal reactivation; original phase lock returns after
  immunity ends, blocks the next natural unsuspend, then expires.
- `BT24-095.test.ts`: selected Tamer's own-phase restriction, unaffected other
  target, natural phase blocking and expiry, and the existing Link/Security suite.
- `unsuspendImmunity.test.ts`: effect unsuspend in Main; own/opponent Active
  phase distinction; original opposing restriction suppressed during immunity
  and restored after expiry; source-kind mismatch; own restriction under
  opponent-only immunity; blanket immunity at the restriction-ledger boundary.
- `unsuspendPhaseRestriction.test.ts`: Quartzmon still blocks effect unsuspension
  during the applicable phase and permits it during Main.

The original card regressions produced 10 passing and 2 failing tests. The valid
isolated immunity regression also failed with suppression disabled (one failure
and one passing phase control); it used the target controller's own Unsuspend.

## Validation

All commands used Vitest `--maxWorkers=1 --no-file-parallelism`.

- Full `src/cards/BT16` and `src/cards/BT24`, plus `unsuspendImmunity`,
  `unsuspendPhaseRestriction`, `whenUnsuspended`, `effects/continuous`,
  `effects/restrictionEnforcement`, `effects/restrictionConsumers.guard`,
  `effects/immunityAffectation`, `effects/grantedEffectImmunity`,
  `effects/progressMutationImmunity`, `effects/immunityGrantInstall`,
  `effects/ex12Gap8Immunity`, `effects/modifiers`, `continuousDpImmunity`,
  `opponentTurnImmunityDuration`, and `combat/restrictionProjection`:
  **227 files, 2,308 tests passed**.
- `pnpm typecheck`: passed across shared, API, and web.
- `src/cards/audit-docs.test.ts`: 4 tests passed.
- Changed-file `oxlint`, `oxfmt --check`, and `git diff --check`: passed.
- Independent Luna review: no remaining blocking findings.
- BT24 runtime snapshot synchronization: one semantic change, no semantic or
  byte changes outside BT24.

The existing uncommitted attack-timing and optional-effect work was preserved.
No Discord reply, report closure, deployment, or collection completion was made.
