import type { CardColor, CardDefinition, Seat } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";

/**
 * Identifies the specific card producing an effect. TS analogue of the source
 * `CardSource`, exposing the same helpers used throughout the source effect
 * scripts (card-module contract).
 *
 * The concrete factory is `createCardSource` in engine/cards/CardSource.ts
 * (card-data-model): it resolves the static half (cardId, ownerSeat, definition,
 * hasColor) from the card-data table and delegates the live-state half
 * (permanent/isOnBattleArea/isOwnersTurn) to an injected lookup the engine
 * supplies per triggering card.
 */
export interface CardSource {
  readonly instanceId: string;
  readonly cardId: string;
  readonly ownerSeat: Seat;
  readonly definition: CardDefinition;

  /** The Permanent this card is on, or undefined (source PermanentOfThisCard). */
  permanent(): Permanent | undefined;
  /** source the effect runtime.IsExistOnBattleArea(card) */
  isOnBattleArea(): boolean;
  /**
   * source the effect runtime.IsExistOnBreedingArea(card) — the card is in the raising area.
   * Optional on the port: a fake CardSource that never exercises a [Breeding] effect may omit
   * it (the breeding builder treats absent as not-in-breeding).
   */
  isOnBreedingArea?(): boolean;
  /**
   * Is this card instance currently loose in its owner's trash? (§15-14-3-1's `[Trash]`
   * residency.) Optional on the port: a fake CardSource that never exercises a `[Trash]`
   * effect may omit it (the `inTrash`/`activated` builders treat absent as not-in-trash).
   */
  isInTrash?(): boolean;
  /**
   * Is this card instance currently in its owner's hand? (§15-14-2-1's `{Hand}` residency —
   * source `the effect runtime.IsExistOnHand(card)` / `card.Owner.HandCards.Contains(card)`.)
   * Optional on the port: a fake CardSource that never exercises a `[Hand]` effect may omit it
   * (the `activated` builder treats absent as not-in-hand).
   */
  isInHand?(): boolean;
  /** Is this card currently face-up in its owner's security stack? */
  isInSecurity?(): boolean;
  /** source the effect runtime.IsOwnerTurn(card) */
  isOwnersTurn(): boolean;
  /** source cardSource.HasCardColor(...) */
  hasColor(color: CardColor): boolean;
}
