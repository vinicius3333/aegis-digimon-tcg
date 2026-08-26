// Effect duration markers; mirrors `EffectDuration`, serialized as strings.

export type EffectDurationRef =
  | "forTheTurn" // until each turn end (the attacker's turn)
  | "forTheAttack" // compiler-emitted alias of untilEndOfAttack (UntilEndAttack)
  | "forThisAttack" // hand-authored alias of untilEndOfAttack (UntilEndAttack)
  | "untilYourTurnEnd" // UntilOwnerTurnEnd
  | "untilOpponentTurnEnd" // UntilOpponentTurnEnd
  | "untilOpponentNextTurnEnd" // current opponent turn does not count when resolving during it
  | "untilEndOfAttack"
  | "untilEndOfBattle"
  | "untilOpponentNextUnsuspendPhase"
  | "nextDigivolveThisTurn"
  | "endOfOpponentTurn" // until the end of the opponent's turn
  | "permanent"; // maps to the never-clearing EffectDuration.Permanent (WR-03 / ENG-02)
