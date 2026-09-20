/* Reads of a decision request and of the state it points at: which cards a prompt shows,
   what colors and sources they carry, and how to find a permanent or instance by id. */

import {
  getCardDefinition,
  effectiveExactNames,
  canAssignDistinctColors,
  type CardInstance,
  type DecisionRequest,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";

/** Map every visible card instance to its card id (board, breeding, trash, your hand). */
export function buildInstanceIndex(state: GameState, viewerSeat: Seat): Map<string, string> {
  const index = new Map<string, string>();
  const add = (ci: CardInstance | undefined) => {
    if (ci && ci.instanceId && ci.cardId) index.set(ci.instanceId, ci.cardId);
  };
  const addPermanent = (perm: Permanent | undefined) => {
    if (!perm) return;
    add(perm.topCard);
    // A Colyseus state patch can briefly expose a permanent before all of its
    // collection fields have been materialized on the client. The board only
    // needs the cards that are present, so skip a missing collection instead
    // of taking the whole game screen down during that render.
    perm.stack?.forEach(add);
    perm.linked?.forEach(add);
    if (perm.permanentId && perm.topCard?.cardId) index.set(perm.permanentId, perm.topCard.cardId);
  };
  state.players.forEach((player, seat) => {
    player.battleArea.forEach(addPermanent);
    addPermanent(player.breeding);
    player.trash.forEach(add);
    // Deck and egg deck are absent by design — the server never encodes them (see
    // HIDDEN_ZONE_VIEW_TAG), so there is nothing to index. A deck card whose identity an
    // effect legitimately reveals arrives in the decision payload instead, which
    // `decisionVisibleCards` already prefers over this index.
    if (seat === viewerSeat) player.hand.forEach(add);
  });
  return index;
}

/** The zone a decision candidate sits in, viewer-relative, as the prompt groups them. */
export type CandidateZone =
  | "hand"
  | "trash"
  | "opponentTrash"
  | "battle"
  | "opponentBattle"
  | "digivolutionCards"
  | "opponentDigivolutionCards"
  | "breeding"
  | "security"
  | "delay";

/** Map every visible card instance to the zone it sits in, so a prompt can group its candidates. */
export function buildInstanceZoneIndex(state: GameState, viewerSeat: Seat): Map<string, CandidateZone> {
  const zones = new Map<string, CandidateZone>();
  const add = (ci: CardInstance | undefined, zone: CandidateZone) => {
    if (ci?.instanceId) zones.set(ci.instanceId, zone);
  };
  // A prompt that reaches under a Digimon ("from its digivolution cards") must not read as
  // the battle area, so the cards beneath a top card get their own zone.
  const addPermanent = (perm: Permanent | undefined, zone: CandidateZone, stackZone: CandidateZone) => {
    if (!perm) return;
    add(perm.topCard, zone);
    perm.stack?.forEach((ci) => add(ci, stackZone));
    perm.linked?.forEach((ci) => add(ci, zone));
    if (perm.permanentId) zones.set(perm.permanentId, zone);
  };
  state.players.forEach((player, seat) => {
    const mine = seat === viewerSeat;
    player.battleArea.forEach((perm) =>
      addPermanent(perm, mine ? "battle" : "opponentBattle", mine ? "digivolutionCards" : "opponentDigivolutionCards"),
    );
    addPermanent(player.breeding, "breeding", "breeding");
    player.trash.forEach((ci) => add(ci, mine ? "trash" : "opponentTrash"));
    player.delayZone?.forEach((ci) => add(ci, "delay"));
    player.security?.forEach((ci) => add(ci, "security"));
    if (mine) player.hand.forEach((ci) => add(ci, "hand"));
  });
  return zones;
}

/** Resolve decision cards from the request first; zone state can lag a reveal decision by one patch. */
export function decisionVisibleCards(
  options: DecisionRequest["options"],
  instanceIndex: ReadonlyMap<string, string>,
  artIndex?: ReadonlyMap<string, string>,
  zoneIndex?: ReadonlyMap<string, CandidateZone>,
): { instanceId: string; cardId?: string; artId?: string; zone?: CandidateZone }[] {
  const authoritative = new Map((options?.visibleCards ?? []).map((card) => [card.instanceId, card]));
  const visible = options?.visibleInstanceIds ?? options?.candidateInstanceIds ?? [];
  return visible.map((instanceId) => {
    const revealed = authoritative.get(instanceId);
    const cardId = revealed?.cardId ?? instanceIndex.get(instanceId);
    const artId = revealed?.artId ?? artIndex?.get(instanceId);
    const zone = zoneIndex?.get(instanceId);
    return { instanceId, cardId, ...(cardId && artId ? { artId } : {}), ...(zone ? { zone } : {}) };
  });
}

/** Resolve candidate colors from the same authoritative identities used to render a decision. */
export function decisionCardColors(cards: readonly { instanceId: string; cardId?: string }[]): Map<string, string[]> {
  const colors = new Map<string, string[]>();
  for (const card of cards) {
    if (card.cardId !== undefined) {
      colors.set(card.instanceId, getCardDefinition(card.cardId)?.colors ?? []);
    }
  }
  return colors;
}

/** Whether adding a decision candidate can still assign one distinct color to every pick. */
export function differentColorsAllowCandidate(
  candidateInstanceId: string,
  picks: readonly string[],
  colorsByInstance: ReadonlyMap<string, readonly string[]>,
  enabled: boolean,
): boolean {
  if (!enabled || picks.includes(candidateInstanceId)) return true;
  const candidateColors = colorsByInstance.get(candidateInstanceId) ?? [];
  if (candidateColors.length === 0) return true;
  return canAssignDistinctColors([
    ...picks.map((instanceId) => colorsByInstance.get(instanceId) ?? []),
    candidateColors,
  ]);
}

/** Whether adding a candidate preserves a printed different-name selection requirement. */
export function distinctNamesAllow(
  candidateInstanceId: string,
  picks: readonly string[],
  cardIdByInstance: ReadonlyMap<string, string | undefined>,
  enabled: boolean,
): boolean {
  if (!enabled || picks.includes(candidateInstanceId)) return true;
  const namesFor = (instanceId: string): string[] => {
    const cardId = cardIdByInstance.get(instanceId);
    const definition = cardId === undefined ? undefined : getCardDefinition(cardId);
    return definition === undefined ? [] : effectiveExactNames(definition).map((name) => name.toLowerCase());
  };
  const names = namesFor(candidateInstanceId);
  return names.length > 0 && picks.every((id) => !namesFor(id).some((name) => names.includes(name)));
}

/** Whether a decision candidate has a card number not already represented in the picks. */
export function distinctCardIdsAllow(
  candidateInstanceId: string,
  picks: readonly string[],
  cardIdByInstance: ReadonlyMap<string, string | undefined>,
  enabled: boolean,
): boolean {
  if (!enabled || picks.includes(candidateInstanceId)) return true;
  const candidateCardId = cardIdByInstance.get(candidateInstanceId);
  if (candidateCardId === undefined) return false;
  return picks.every((pickedId) => cardIdByInstance.get(pickedId) !== candidateCardId);
}

/** Index permanent source counts by either identifier a public decision may carry. */
export function decisionSourceCounts(permanents: readonly Permanent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const permanent of permanents) {
    const count = permanent.stack.length;
    counts.set(permanent.permanentId, count);
    if (permanent.topCard?.instanceId) counts.set(permanent.topCard.instanceId, count);
  }
  return counts;
}

export interface DecisionPermanentDetails {
  currentDP: number;
  isSuspended: boolean;
}

/** Live board details for distinguishing otherwise-identical decision candidates. */
export function decisionPermanentDetails(permanents: readonly Permanent[]): Map<string, DecisionPermanentDetails> {
  const details = new Map<string, DecisionPermanentDetails>();
  for (const permanent of permanents) {
    const value = {
      currentDP: permanent.currentDP,
      isSuspended: permanent.isSuspended,
    };
    details.set(permanent.permanentId, value);
    if (permanent.topCard?.instanceId) details.set(permanent.topCard.instanceId, value);
  }
  return details;
}

/** Card id on top of a permanent anywhere on the board, by permanentId. */
export function permCardId(state: GameState, permanentId: string): string | undefined {
  for (const player of state.players) {
    for (const perm of player.battleArea) if (perm.permanentId === permanentId) return perm.topCard?.cardId;
    if (player.breeding?.permanentId === permanentId) return player.breeding.topCard?.cardId;
  }
  return undefined;
}

/** Locate a visible card instance in hand or on the board by instanceId. */
export function instanceCardId(state: GameState, instanceId: string): string | undefined {
  const onPermanent = (perm: Permanent): CardInstance | undefined =>
    [perm.topCard, ...perm.stack, ...perm.linked].find((c) => c?.instanceId === instanceId);
  for (const player of state.players) {
    const inHand = player.hand.find((card) => card.instanceId === instanceId);
    if (inHand) return inHand.cardId;
    for (const perm of player.battleArea) {
      const found = onPermanent(perm);
      if (found) return found.cardId;
    }
    if (player.breeding) {
      const found = onPermanent(player.breeding);
      if (found) return found.cardId;
    }
  }
  return undefined;
}

/** Locate a permanent anywhere on the board by permanentId. */
export function findPermanentInState(state: GameState, permanentId: string): Permanent | undefined {
  for (const player of state.players) {
    const inBattle = player.battleArea.find((p) => p.permanentId === permanentId);
    if (inBattle) return inBattle;
    if (player.breeding?.permanentId === permanentId) return player.breeding;
  }
  return undefined;
}
