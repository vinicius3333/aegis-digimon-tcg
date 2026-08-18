// Trigger tags and per-turn frequency markers.

// Declarative intermediate representation (IR) for card effect text.
//
// The compiler pipeline is: effect text (English prose) -> this IR -> the
// runtime interpreter (apps/api/src/engine/effects/interpreter.ts) which
// dispatches each Action to the existing effect primitives.
//
// The IR is deliberately a closed, serializable, discriminated-union model so
// that `runtime effect records` can emit it as JSON (effects.json) and the
// server can load and interpret it without re-parsing prose at runtime. Every
// union is discriminated on a string literal field so both the parser (plain
// JS) and the interpreter (TS) agree on the shape by structure alone.
//
// Scope (v1): breadth over depth. The high-frequency triggers, keywords, and
// clause verbs from the 4,201-card corpus are modeled with typed params; the
// long tail is captured verbatim as `RawUnparsed` so nothing is silently lost
// and coverage is measurable.

/**
 * The closed set of trigger tags (the `[...]` window markers) after
 * normalization. Mirrors the corpus' ~27 distinct prose tags. `Static` is the
 * synthetic trigger for always-on continuous clauses that carry no tag (mapped
 * to EffectTiming.None by the interpreter). `Inherited`/`Security` are derived
 * from which text field the clause came from, not from a tag.
 */
export type EffectTrigger =
  | "OnPlay"
  | "BeforePayCost"
  | "WhenDigivolving"
  | "WhenAttacking"
  | "OnDeletion"
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
  | "Trash"
  | "Breeding"
  | "WhenMoving"
  | "Rule"
  | "Static"
  /** Fires on the surviving Digimon when it deletes an opponent's Digimon in battle. */
  | "WhenBattleDeleteOpponent"
  /** Fires when this card (an Option/Digimon in the battle area) is trashed while in the battle area. */
  | "whenTrashedFromBattleArea"
  /**
   * Fires on THIS card once an effect trashes it specifically from the security stack
   * (not a normal security check) — e.g. "when an effect trashes this card from the
   * security stack, you may play it without paying the cost" (BT15-037, BT18-098).
   * Maps to EffectTiming.OnDiscardSecurity, fired via GameEngine's
   * fireDiscardedFromSecurity once the card lands in trash (precedent: hand-written
   * ST22-10). Distinct from "Security" (a normal security-check reveal).
   */
  | "OnDiscardSecurity"
  /**
   * Fires on THIS Digimon (as attacker) when it is blocked — e.g. "[Your Turn] when
   * this Digimon is blocked, unsuspend it and gain 1 memory" (BT7-016). Maps to
   * EffectTiming.OnBlockAnyone, fired from combat/controller.ts's
   * switchDefenderToBlocker for every block regardless of who is watching; the
   * effect module itself must check it is the attacker (ctx.trigger.attackerPermanentId
   * equals its own permanent).
   */
  | "WhenBlocked";

/** Per-turn activation limit, from `[Once Per Turn]` / `[Twice Per Turn]`. */
export type EffectFrequency = "OncePerTurn" | "TwicePerTurn";
