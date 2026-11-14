import { CardKind, Phase, type Seat } from "@aegis/shared/schema/enums";
import type { GameState } from "@aegis/shared/schema/GameState";
import type { IntentResult } from "@aegis/shared/protocol/intents";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";

type Params = { state: GameState; seat: Seat; instanceId: string };

export function validateSealedRookie({ state, seat, instanceId }: Params): IntentResult {
  if (state.gameOver || state.rulesPolicy !== GameRulesPolicy.SEALED.value) {
    return { ok: false, reason: "illegal-target" };
  }
  if (state.pendingDecision) {
    return { ok: false, reason: "decision-pending" };
  }
  if (state.turnSeat !== seat) {
    return { ok: false, reason: "not-your-turn" };
  }
  if (state.phase !== Phase.Breeding) {
    return { ok: false, reason: "wrong-phase" };
  }
  const player = state.players[seat];
  if (!player || player.breeding) {
    return { ok: false, reason: "breeding-occupied" };
  }
  const card = player.hand.find((candidate) => candidate.instanceId === instanceId);
  const definition = card ? getCardDefinition(card.cardId) : undefined;
  if (!definition || definition.level !== 3 || !definition.kinds.includes(CardKind.Digimon)) {
    return { ok: false, reason: "illegal-target" };
  }
  return { ok: true };
}
