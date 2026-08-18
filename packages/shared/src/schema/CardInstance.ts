import { Schema, ArraySchema, type } from "@colyseus/schema";
import type { Seat } from "./enums.js";

/**
 * A specific physical card in the match. Static card facts (DP, cost, colors,
 * level, effect text) come from CardDefinition in @aegis/shared/cards, looked up
 * by cardId; the instance carries only per-copy runtime data.
 */
export class CardInstance extends Schema {
  @type("string") instanceId!: string; // unique within the match
  @type("string") cardId!: string; // e.g. "BT7-089"; key into CardDefinition registry
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
  // Own permanents this hand card may legally digivolve onto right now.
  @type(["string"]) digivolveTargetPermanentIds = new ArraySchema<string>();
}
