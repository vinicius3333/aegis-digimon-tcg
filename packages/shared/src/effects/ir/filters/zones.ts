// Who a clause refers to, and where the referenced cards live.

export type Controller = "mine" | "opponent" | "any";

export type ZoneRef =
  | "battleArea"
  | "hand"
  | "trash"
  | "deck"
  | "security"
  | "breeding"
  | "digivolutionCards"
  /** All cards under any of the controller's Tamers. */
  | "underMyTamers"
  /** Alias for `underMyTamers` (BT19-026 PlayWithoutCost). */
  | "underTamers"
  /** Cards under the specific Tamer executing this effect. */
  | "underThisTamer"
  /** Alias for `underMyTamers` (BT19-081 PlaceUnder). */
  | "underTamer"
  /** Digivolution cards under Tamers only, unlike `digivolutionCards` which spans all permanents. */
  | "digivolutionCardsUnderTamers"
  /** ＜Link＞ cards. As a `filter.zone`, resolves to the link cards of matching hosts, not the hosts. */
  | "linked"
  /** Digivolution cards and ＜Link＞ cards together, as one pool (BT25-085). */
  | "digivolutionCardsOrLinkCards"
  /** Pseudo-source selector: hosted candidates must belong to the resolving Digimon. */
  | "thisDigimon"
  /** The prior reveal step's batch (`ctx.lastRevealedCards`), not a real zone. */
  | "revealed";
