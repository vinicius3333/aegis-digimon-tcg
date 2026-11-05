import { Permanent } from "@aegis/shared/schema/Permanent";
import { Zone, type Seat } from "@aegis/shared/schema/enums";
import type { IntentResult } from "@aegis/shared/protocol/intents";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import type { GameEngine } from "#api/engine/GameEngine";
import { validateSealedRookie } from "#api/engine/actions/validateSealedRookie";
import { extractCardAt, setBreeding, setTopCard } from "#api/engine/state/access";
import { breedingDeps } from "#api/engine/gameEngine/actionDeps";

type Params = { engine: GameEngine; seat: Seat; instanceId: string };

export function handleSealedRookie({ engine, seat, instanceId }: Params): IntentResult {
  if (engine.breeding.isActionSpent || !engine.breeding.isOpen) {
    return { ok: false, reason: "wrong-phase" };
  }
  const check = validateSealedRookie({ state: engine.state, seat, instanceId });
  if (!check.ok) {
    return check;
  }
  const player = engine.state.players[seat]!;
  const index = player.hand.findIndex((card) => card.instanceId === instanceId);
  const card = extractCardAt(player, Zone.Hand, index)!;
  card.faceUp = true;
  const permanent = new Permanent();
  const deps = breedingDeps(engine);
  permanent.permanentId = deps.nextPermanentId();
  permanent.controllerSeat = seat;
  permanent.inBreeding = true;
  permanent.baseDP = getCardDefinition(card.cardId)!.dp;
  permanent.currentDP = permanent.baseDP;
  setTopCard(permanent, card);
  setBreeding(player, permanent);
  deps.emit?.({ kind: "cardsMoved", instanceIds: [card.instanceId], from: Zone.Hand, to: Zone.Breeding });
  engine.breeding.actionTaken(seat);
  return { ok: true };
}
