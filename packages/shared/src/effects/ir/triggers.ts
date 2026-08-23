// Trigger tags and per-turn frequency markers.

/**
 * The closed set of trigger tags (the `[...]` window markers) after normalization, mirroring the
 * corpus' ~27 distinct prose tags. `Static` is the synthetic trigger for always-on continuous
 * clauses that carry no tag, mapped to EffectTiming.None. `Inherited`/`Security` come from which
 * text field the clause was in, not from a tag.
 */
export type EffectTrigger =
  | "OnPlay"
  | "BeforePayCost"
  | "WhenDigivolving"
  | "WhenAttacking"
  | "OnDeletion"
  /** Internal reactive deletion bus for effects watching any permanent's deletion. */
  | "OnDestroyedAnyone"
  | "EndOfAttack"
  | "AllTurns"
  | "YourTurn"
  | "OpponentsTurn"
  | "StartOfYourTurn"
  | "EndOfYourTurn"
  | "StartOfOpponentsTurn"
  | "EndOfOpponentsTurn"
  | "StartOfYourMainPhase"
  | "StartOfOpponentsMainPhase"
  | "EndOfAllTurns"
  | "Main"
  | "Security"
  | "Counter"
  | "Hand"
  /**
   * Fires when an effect adds cards to a player's hand (BT15-002's inherited clause). Maps to
   * EffectTiming.OnAddHand. Distinct from "Hand", which tags an effect the controller ACTIVATES
   * while the card sits in hand.
   */
  | "WhenEffectAddsToHand"
  | "Trash"
  | "Breeding"
  | "WhenMoving"
  | "WhenLinking"
  | "Rule"
  | "Static"
  /** Fires on the surviving Digimon when it deletes an opponent's Digimon in battle. */
  | "WhenBattleDeleteOpponent"
  /** Fires when this card is trashed while in the battle area. */
  | "whenTrashedFromBattleArea"
  /**
   * Fires when an effect trashes this card specifically FROM the security stack, not on a normal
   * security check (BT15-037, BT18-098). Maps to EffectTiming.OnDiscardSecurity, fired via
   * `fireDiscardedFromSecurity` once the card lands in trash. Distinct from "Security", which is a
   * normal security-check reveal.
   */
  | "OnDiscardSecurity"
  /** Fires while a security card is revealed, before the normal battle/trash resolution. */
  | "OnSecurityCheck"
  /** Fires while determining whether a pending attack will perform security checks. */
  | "OnDetermineDoSecurityCheck"
  /** Fires when a card leaves a security stack. */
  | "OnLoseSecurity"
  /** Fires when a card is added to a security stack. */
  | "OnAddSecurity"
  /**
   * Fires on THIS Digimon as attacker when it is blocked (BT7-016). Maps to
   * EffectTiming.OnBlockAnyone, fired from `switchDefenderToBlocker` for EVERY block regardless of
   * who is watching, so the effect module must check that it is the attacker —
   * `ctx.trigger.attackerPermanentId` equals its own permanent.
   */
  | "WhenBlocked";

/** Per-turn activation limit, from `[Once Per Turn]` / `[Twice Per Turn]`. */
export type EffectFrequency = "OncePerTurn" | "TwicePerTurn";
