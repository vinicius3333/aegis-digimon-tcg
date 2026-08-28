// Engine enums shared by the server, client, and card modules.
// Ordering is significant where the original code depends on it; do not reorder.

// CardColor order matches documented behavior enum CardColor. String-valued so the
// generated card data (cards.json) stores readable names that are directly
// assignable to CardColor. Declaration order is preserved; do not reorder.
export enum CardColor {
  Red = "Red",
  Blue = "Blue",
  Yellow = "Yellow",
  Green = "Green",
  White = "White",
  Black = "Black",
  Purple = "Purple",
  None = "None",
}

// CardKind matches documented behavior enum CardKind. String-valued for the same
// reason as CardColor.
export enum CardKind {
  Digimon = "Digimon",
  Tamer = "Tamer",
  Option = "Option",
  DigiEgg = "DigiEgg",
}

// Turn phases match documented behavior enum phase.
export enum Phase {
  Active = "Active",
  Draw = "Draw",
  Breeding = "Breeding",
  Main = "Main",
  End = "End",
  None = "None",
}

// Zones a card instance can live in.
export enum Zone {
  Deck = "deck",
  Hand = "hand",
  BattleArea = "battleArea",
  Breeding = "breeding",
  Security = "security",
  Trash = "trash",
  EggDeck = "eggDeck",
  /** Face-down Delay Option cards waiting to activate (Comprehensive Rules §16-17). */
  Delay = "delay",
}

// Effect timing windows. Subset of the source ~60-value EffectTiming; extend as
// the card implementation surfaces cards that need additional windows.
export enum EffectTiming {
  OnStartTurn,
  OnStartMainPhase,
  OnEndMainPhase,
  OnEndTurn,
  OnDraw,
  OnAddHand,
  OnPlay,
  WhenDigivolving,
  OnEnterFieldAnyone,
  OnLeaveFieldAnyone,
  WhenPermanentWouldBeDeleted,
  OnDestroyedAnyone,
  OnUseAttack,
  OnAllyAttack,
  OnAttackTargetChanged,
  OnBlockAnyone,
  OnEndAttack,
  OnEndBattle,
  OnGetDamage,
  OnSecurityCheck,
  OnDetermineDoSecurityCheck,
  OnLoseSecurity,
  OnAddSecurity,
  OnTappedAnyone,
  OnUnTappedAnyone,
  OnUseOption,
  SecuritySkill,
  OnDeclaration,
  AfterPayCost,
  BeforePayCost,
  RulesTiming,
  /** A permanent moved between the breeding and battle areas (CardObjectController.MovePermanent). */
  OnMove,
  /** This card was trashed from the security stack BY AN EFFECT (not by a security check). */
  OnDiscardSecurity,
  /** A Digimon deleted an opponent's Digimon in battle (attacker won the battle). */
  OnBattleDeleteOpponent,
  /** A card in the battle area was trashed by an effect (BT19-095; CAP-F5). */
  WhenTrashedFromBattleArea,
  None,
  /**
   * §11-3 Counter Timing: the window, opened after an attack's When Attacking
   * effects resolve and before block timing, where the non-turn (defending)
   * player may activate a [Counter] effect. Appended as the FINAL member (after
   * `None`) so every preceding implicit ordinal is unchanged — the same
   * append-only precedent as `EffectDuration.Permanent`.
   */
  OnCounterTiming,
  /** A card has just become a link card and resolves its printed [When Linking] effect. */
  OnLinking,
}

// Readable card-text aliases used by public behavioral tests and card-facing callers.
// Namespace constants preserve the enum's existing numeric values and reverse mappings.
export namespace EffectTiming {
  export const StartOfYourMainPhase = EffectTiming.OnStartMainPhase;
  export const StartOfYourTurn = EffectTiming.OnStartTurn;
  export const EndOfYourTurn = EffectTiming.OnEndTurn;
  export const EndOfOpponentsTurn = EffectTiming.OnEndTurn;
  export const EndOfAllTurns = EffectTiming.OnEndTurn;
  export const EndOfAttack = EffectTiming.OnEndAttack;
  export const OnDeletion = EffectTiming.OnDestroyedAnyone;
  export const Security = EffectTiming.SecuritySkill;
  export const WhenMoving = EffectTiming.OnMove;
}

// Duration of a temporary modifier; mirrors documented behavior EffectDuration.
export enum EffectDuration {
  UntilEachTurnEnd,
  UntilOpponentTurnEnd,
  UntilOwnerTurnEnd,
  UntilEndAttack,
  UntilEndBattle,
  UntilOwnerActivePhase,
  UntilCalculateFixedCost,
  UntilNextUntap,
  /**
   * A genuinely-permanent grant (name/trait/color) installed by a resolved
   * (triggered, non-static) effect. No boundary sweep ever clears it. Appended
   * as the FINAL member so every preceding implicit ordinal is unchanged.
   */
  Permanent,
}

// Seat index. The match is always exactly two seats.
export type Seat = 0 | 1;
