import { Schema, ArraySchema, type, view } from "@colyseus/schema";
import type { Seat } from "./enums.js";

/** View tag that reveals a physical card's identity to an authorized viewer. */
export const CARD_ID_VIEW_TAG = 2;

/**
 * A specific physical card in the match. Static card facts (DP, cost, colors,
 * level, effect text) come from CardDefinition in @aegis/shared/cards, looked up
 * by cardId; the instance carries only per-copy runtime data.
 */
export class CardInstance extends Schema {
  @type("string") instanceId!: string; // unique within the match
  @view(CARD_ID_VIEW_TAG) @type("string") cardId!: string; // e.g. "BT7-089"; key into CardDefinition registry
  @type("uint8") ownerSeat!: Seat; // who owns it (not necessarily who controls it)
  @type("boolean") faceUp = true; // false => redacted for opponents (see Visibility)
  /** Owner-visible activated abilities available while this loose card is in hand. */
  @type("string") activatableEffectsJson = "";
  // Server-projected hand affordances, re-derived every continuous recompute by
  // GameEngine.syncHandAffordances and false/empty for every card outside the turn
  // player's hand. The client must not reconstruct play legality from card text:
  // turn, phase, open decisions, play prohibitions, colour requirements and memory
  // are already resolved here — the same contract as Permanent.attackablePermanentIds.
  @type("boolean") playableFromHand = false;
  // Memory this card would cost to play right now, with every ACTIVE CONTINUOUS cost modifier
  // already applied — the exact figure `validatePlayCard` checked affordability against, kept
  // instead of being collapsed into `playableFromHand`. -1 means "not projected": the card is
  // outside the turn player's Main-phase hand, or its only route is a material declaration
  // (DigiXros / Assembly) whose reduction comes from materials nobody has chosen yet.
  //
  // An UPPER BOUND, not a ruling. A card with a [BeforePayCost] hook can still reduce this at
  // pay time, and resolving those means prompting the player and mutating the board, so they
  // are deliberately not simulated here. The client presents it as a prediction.
  @type("int8") projectedPlayCost = -1;
  // Own permanents this hand card may legally digivolve onto right now.
  @type(["string"]) digivolveTargetPermanentIds = new ArraySchema<string>();
}
