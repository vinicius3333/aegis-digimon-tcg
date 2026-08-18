import { ArraySchema } from "@colyseus/schema";
import {
  CardKind,
  Permanent,
  Zone,
  EffectTiming,
  requireCardDefinition,
  type CardInstance,
  type GameState,
  type PlayerState,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { findPermanentInState, takeTop } from "../state/access.js";

/**
 * Breeding/hatch effect verbs (subsystem: effect-primitives; sources: documented behavior hatch +
 * breeding-area helpers, Comprehensive Rules §4-17 "Hatching a Digi-Egg" and §6-4
 * "Breeding Phase").
 *
 * These are the EFFECT-DRIVEN forms of the breeding mechanic — a card effect that hatches
 * a Digi-Egg or that places the top of the Digi-Egg deck under a Digimon as a digivolution
 * card. They are NOT the breeding-PHASE player verbs: there is no Phase.Breeding gate and no
 * once-per-turn breeding limit (the effect's own timing/condition gates that). The battle
 * ↔ breeding MOVE verb (P-130/P-143) already lives in primitives.ts as `movePermanentZone`;
 * what was genuinely missing — and what this module adds — is the Digi-Egg-DECK seam: the
 * existing loose-card helpers (`removeLooseInstance`/`placeUnder`) never scan `eggDeck`, so a
 * hatch or an egg-deck place-under had no faithful primitive to compose.
 *
 * Server-authoritative: the engine performs the zone move from the real Digi-Egg deck into
 * the real breeding slot / digivolution stack. A client never supplies a breeding-area
 * mutation; it only signals the intent to use the effect.
 */

/** What the breeding verbs need from the engine (a narrow port, same seam as PrimitivesEngine). */
export interface BreedingEngine {
  readonly state: GameState;
  emit(event: ServerEvent): void;
  nextPermanentId(): string;
  fireTiming?: (
    timing: EffectTiming,
    trigger?: import("./EffectContext.js").TriggerInfo,
  ) => Promise<void>;
  fireSubTrigger?: (
    event: import("./EffectContext.js").SubTriggerEventName,
    payload?: import("./EffectContext.js").TriggerInfo,
  ) => Promise<void>;
}

export interface BreedingVerbs {
  hatch: (seat: Seat) => Permanent | undefined;
  placeUnderFromEggDeck: (
    targetPermanentId: string,
    seat: Seat,
    opts?: { belowTop?: boolean },
  ) => Promise<CardInstance | undefined>;
  placeAsTopFromEggDeck: (
    targetPermanentId: string,
    seat: Seat,
  ) => Promise<CardInstance | undefined>;
}

export function createBreedingVerbs(engine: BreedingEngine): BreedingVerbs {
  const state = engine.state;
  const playerOf = (seat: Seat): PlayerState | undefined =>
    state.players.find((p) => p.seat === seat);
  const permanentById = (permanentId: string): Permanent | undefined =>
    findPermanentInState(state, permanentId);

  /**
   * Hatch: flip the top card of `seat`'s Digi-Egg deck and place it into the EMPTY breeding
   * slot as a fresh permanent (Comprehensive Rules §4-17-1). No-op (returns undefined) when
   * the Digi-Egg deck is empty or the breeding slot is already occupied — breeding is
   * single-occupancy and §6-4 only hatches into an empty area. The hatched Digi-Egg becomes
   * the breeding permanent's top card (face-up, unsuspended, inBreeding), seeded with the
   * definition DP (0 for a Digi-Egg, which has no DP).
   */
  const hatch = (seat: Seat): Permanent | undefined => {
    const owner = playerOf(seat);
    if (owner === undefined) return undefined;
    if (owner.breeding !== undefined) return undefined; // breeding slot occupied
    if (owner.eggDeck.length === 0) return undefined; // empty Digi-Egg deck
    const egg = takeTop(owner, Zone.EggDeck)!;
    egg.faceUp = true;
    const permanent = new Permanent();
    permanent.permanentId = engine.nextPermanentId();
    permanent.controllerSeat = owner.seat;
    permanent.topCard = egg;
    permanent.stack = new ArraySchema<CardInstance>();
    permanent.linked = new ArraySchema<CardInstance>();
    const def = requireCardDefinition(egg.cardId);
    const dp = def.kinds.includes(CardKind.Digimon) ? def.dp : 0;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
    permanent.isSuspended = false;
    permanent.inBreeding = true;
    owner.breeding = permanent;
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [egg.instanceId],
      from: Zone.EggDeck,
      to: Zone.Breeding,
    });
    return permanent;
  };

  /**
   * Place the TOP card of `seat`'s Digi-Egg deck under `targetPermanentId` as a digivolution
   * card (BT13-007 / EX6-006 "place the top card of your Digi-Egg deck as this Digimon's
   * bottom digivolution card"). By default the card goes to the BOTTOM of the stack
   * (`stack[0]`); `belowTop` inserts it directly beneath the current top instead. No-op
   * (returns undefined) when the Digi-Egg deck is empty or the host permanent is missing.
   * The placed card becomes face-down (a digivolution card is not revealed).
   */
  const placeUnderFromEggDeck = async (
    targetPermanentId: string,
    seat: Seat,
    opts?: { belowTop?: boolean },
  ): Promise<CardInstance | undefined> => {
    const owner = playerOf(seat);
    if (owner === undefined || owner.eggDeck.length === 0) return undefined;
    const host = permanentById(targetPermanentId);
    if (host === undefined) return undefined;
    const egg = takeTop(owner, Zone.EggDeck)!;
    egg.faceUp = false;
    if (opts?.belowTop) host.stack.push(egg);
    else host.stack.unshift(egg);
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [egg.instanceId],
      from: Zone.EggDeck,
      to: Zone.BattleArea,
    });
    // Same SubTrigger seam placeUnder uses: a card was added to the host's digivolution cards.
    await engine.fireSubTrigger?.("onAddDigivolutionCards", {
      subjectPermanentId: targetPermanentId,
      addedDigivolutionCardInstanceIds: [egg.instanceId],
    });
    return egg;
  };

  /**
   * Place the TOP card of `seat`'s Digi-Egg deck as `targetPermanentId`'s TOP digivolution card
   * (BT22-007 "place [Mother Eater]s as this Digimon's TOP digivolution cards"). Distinct from
   * `placeUnderFromEggDeck` (which goes to the BOTTOM): the card goes to the END of the stack
   * (the topmost digivolution card, just beneath the permanent's top card) and is REVEALED
   * (face-up — KB Q4856 "you must reveal the card to be placed"). No-op (returns undefined) when
   * the Digi-Egg deck is empty or the host permanent is missing.
   */
  const placeAsTopFromEggDeck = async (
    targetPermanentId: string,
    seat: Seat,
  ): Promise<CardInstance | undefined> => {
    const owner = playerOf(seat);
    if (owner === undefined || owner.eggDeck.length === 0) return undefined;
    const host = permanentById(targetPermanentId);
    if (host === undefined) return undefined;
    const egg = takeTop(owner, Zone.EggDeck)!;
    egg.faceUp = true; // revealed (Q4856)
    host.stack.push(egg); // top of the digivolution stack
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [egg.instanceId],
      from: Zone.EggDeck,
      to: Zone.BattleArea,
    });
    await engine.fireSubTrigger?.("onAddDigivolutionCards", {
      subjectPermanentId: targetPermanentId,
      addedDigivolutionCardInstanceIds: [egg.instanceId],
    });
    return egg;
  };

  return { hatch, placeUnderFromEggDeck, placeAsTopFromEggDeck };
}
