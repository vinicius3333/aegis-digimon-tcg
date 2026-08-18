/**
 * Continuous "DP-based deletion budget" bonuses (subsystem: static-continuous-effects) —
 * the producer side of the `AddToDPDeleteBudget` inherited modifier (BT19-011 WarGrowlmon:
 * "[All Turns] Add 3000 to this Digimon's DP deletion effects' maximums."). Unlike
 * {@link DeletionMaxDpLedger} (a printed numeric-cap raiser, owner-wide or self-scoped), this
 * ledger only ever accumulates SELF-scoped: the inherited ability's host permanent (whichever
 * permanent the WarGrowlmon-lineage card is currently stacked under, or WarGrowlmon itself when
 * it is the top card) is the sole key, matching the printed "this Digimon's" wording.
 *
 * Rebuilt from scratch on every continuous recompute (the producer is an `EffectTiming.None`
 * static, re-fired each pass), so it is cleared at the start of
 * {@link GameEngine.recomputeContinuousEffects} — mirrors {@link DeletionMaxDpLedger} exactly.
 */
export class DpDeleteBudgetLedger {
  private readonly bySourcePermanent = new Map<string, number>();

  add(sourcePermanentId: string, delta: number): void {
    this.bySourcePermanent.set(sourcePermanentId, (this.bySourcePermanent.get(sourcePermanentId) ?? 0) + delta);
  }

  /** The accumulated DP-delete-budget bonus for `sourcePermanentId` (0 when none was recorded). */
  bonusFor(sourcePermanentId: string): number {
    return this.bySourcePermanent.get(sourcePermanentId) ?? 0;
  }

  clear(): void {
    this.bySourcePermanent.clear();
  }
}
