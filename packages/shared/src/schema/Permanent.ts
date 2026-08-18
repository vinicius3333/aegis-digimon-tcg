import { Schema, ArraySchema, type } from "@colyseus/schema";
import { CardInstance } from "./CardInstance.js";
import type { Seat } from "./enums.js";

/**
 * A field position: a top card plus its digivolution stack and any linked cards.
 * Mirrors documented behavior.
 */
export class Permanent extends Schema {
  @type("string") permanentId!: string;
  @type("uint8") controllerSeat!: Seat;
  @type(CardInstance) topCard!: CardInstance; // the active Digimon/Tamer
  @type([CardInstance]) stack = new ArraySchema<CardInstance>(); // digivolution cards (bottom..below top)
  @type([CardInstance]) linked = new ArraySchema<CardInstance>(); // linked cards (Link mechanic)
  @type("int32") baseDP = 0; // from topCard's CardDefinition
  @type("int32") currentDP = 0; // baseDP + active modifiers
  @type("boolean") isSuspended = false;
  @type("boolean") inBreeding = false; // true while in the breeding/raising area
  // The turnCount at which this permanent entered the field. Drives the
  // ＜Delay＞ option-activation gate "you can't activate this effect the turn this card enters
  // play" (CanDeclareOptionDelayEffect: EnterFieldTurnCount != current TurnCount).
  @type("uint32") enterFieldTurnCount = 0;
  // Set true when this permanent was JUST burst-digivolved (Comprehensive Rules §8-3-2-1),
  // consumed as PENDING PROCESSING (§18-1) at the engine's real OnEndTurn firing point later
  // that same turn: the card then stacked immediately under the top is trashed. Cleared
  // unconditionally once that firing point evaluates it, so it never survives past the turn it
  // was set on. A plain flag rather than an `enterFieldTurnCount`-style turnCount marker: unlike
  // enter-field (which tests may check turns after the fact), this is always consumed at the
  // very next OnEndTurn, and `turnCount` is commonly left at its 0 default in scenario setup —
  // a value indistinguishable from "never happened" had it been reused as the sentinel here.
  @type("boolean") burstDigivolvePendingTrash = false;
  // True iff this permanent was placed onto the field BY AN EFFECT rather than through a
  // normal play (Comprehensive Rules §17-1-3-2-2 exempts an effect-placed Option card from
  // the rule-check sweep that otherwise trashes any Option sitting in the battle area). Set
  // by the one path that places an Option as a battle-area permanent (`placeOptionAsPermanent`,
  // engine/effects/primitives.ts) and left false everywhere else (the default for every
  // other permanent-creation path, none of which currently need to distinguish "by an
  // effect" from "by a normal play"). Considered and rejected reusing `enterFieldTurnCount`
  // as an implicit marker: it records WHEN a permanent entered, not WHY, and is legitimately
  // 0 for a permanent placed on turn 0 by either route, so it cannot carry this distinction.
  @type("boolean") placedByEffect = false;
  // JSON array of {instanceId,effectKey,description} — populated server-side for the
  // turn player's battle-area permanents during Main phase; empty string otherwise.
  @type("string") activatableEffectsJson = "";
  // Resolved active keyword names (printed on the top card plus continuous grants),
  // re-derived each continuous-recompute pass so the client can drive keyword-gated
  // affordances (e.g. a ＜Vortex＞ attack) and hints without embedding rules logic.
  @type(["string"]) keywords = new ArraySchema<string>();
  // Active keywords supplied by effects rather than printed intrinsically on the
  // top card. Rendered as transient board badges so gained abilities stay visible
  // without duplicating every keyword already legible on the card art.
  @type(["string"]) grantedKeywords = new ArraySchema<string>();
  // Server-resolved aliases that apply only while this permanent is chosen as a
  // DigiXros material. Kept separate from normal names because the grant must not
  // affect any other name-based rule or UI affordance.
  @type(["string"]) digiXrosNames = new ArraySchema<string>();
  // Server-projected opponent permanents this Digimon may legally attack right now.
  // The client must not reconstruct combat rules from suspension or card text: grants
  // such as ST12-08 and target-scoped restrictions are already resolved here.
  @type(["string"]) attackablePermanentIds = new ArraySchema<string>();
  // Player/security targeting is projected separately because restrictions can forbid
  // attacking players while still allowing attacks on Digimon.
  @type("boolean") canAttackPlayer = false;
  // The same two projections for a ＜Vortex＞ declaration, which is validated under
  // different rules and so cannot be derived from the plain ones: §16-33-1 makes
  // ＜Vortex＞ a same-turn-attack grant in its own right (a Digimon that entered this
  // turn may Vortex-attack but not attack normally), while §16-33 restricts the target
  // to opponent Digimon unless a grant relaxes it. Empty/false whenever the permanent
  // has no ＜Vortex＞.
  @type(["string"]) vortexAttackablePermanentIds = new ArraySchema<string>();
  @type("boolean") canVortexAttackPlayer = false;
}
