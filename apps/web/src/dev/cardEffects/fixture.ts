import { CardInstance, GameState, Permanent, PlayerState, type DecisionRequest, type ServerEvent } from "@aegis/shared";

export interface CardEffectsFixture {
  state: GameState;
  decision?: DecisionRequest;
  events?: ServerEvent[];
  sessionId?: string;
}

export type CardEffectsFixtureBuilder = (
  cardId: string,
  effect: string | null,
  step: string | null,
) => CardEffectsFixture;

export function card(instanceId: string, cardId: string, ownerSeat: 0 | 1): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.ownerSeat = ownerSeat;
  return instance;
}

export function permanent(
  permanentId: string,
  cardId: string,
  controllerSeat: 0 | 1,
  currentDP: number,
  under: Array<{ instanceId: string; cardId: string }> = [],
): Permanent {
  const result = new Permanent();
  result.permanentId = permanentId;
  result.controllerSeat = controllerSeat;
  result.topCard = card(`${permanentId}-top`, cardId, controllerSeat);
  result.baseDP = currentDP;
  result.currentDP = currentDP;
  result.stack.push(...under.map((source) => card(source.instanceId, source.cardId, controllerSeat)));
  return result;
}

export function player(seat: 0 | 1, displayName: string, sessionId: string): PlayerState {
  const result = new PlayerState();
  result.seat = seat;
  result.displayName = displayName;
  result.sessionId = sessionId;
  result.connected = true;
  result.deckCount = 36;
  result.eggDeckCount = 4;
  result.securityCount = 5;
  return result;
}
