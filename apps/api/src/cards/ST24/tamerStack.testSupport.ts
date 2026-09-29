import { CARD_ID_VIEW_TAG, Zone, type CardInstance, type Permanent } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { settle, type EngineSetup } from "../../engine/testkit/harness.js";

/** Digivolution-card instance ids, bottom first. */
export function stackIds(permanent: Permanent): string[] {
  return permanent.stack.map(({ instanceId }) => instanceId);
}

/** Whether each seat's synchronized view carries the card's identity. */
export function identityVisibility(s: EngineSetup, card: CardInstance): { owner: boolean; opponent: boolean } {
  // eslint-disable-next-line no-new -- a StateView only tracks state attached to an encoder, as a room's is.
  new Encoder(s.state);
  return {
    owner: s.engine.makeStateView(card.ownerSeat as 0 | 1)!.hasTag(card, CARD_ID_VIEW_TAG),
    opponent: s.engine.makeStateView((1 - card.ownerSeat) as 0 | 1)!.hasTag(card, CARD_ID_VIEW_TAG),
  };
}

/**
 * Play ST24-12 Falcomon from seat 0's hand (seeding one when absent) and pay its [On Play]
 * cost of trashing the bottom face-down card from under a Tamer. Returns every card id any
 * decision of that play offered, and the card the cost trashed.
 */
export async function trashBottomTamerCardWithFalcomon(
  s: EngineSetup,
): Promise<{ offeredInstanceIds: string[]; trashed: CardInstance | undefined }> {
  const player = s.state.players[0]!;
  const falcomon = player.hand.find(({ cardId }) => cardId === "ST24-12") ?? s.give(0, Zone.Hand, "ST24-12");
  // A recovery target, so the optional return has something to do and its cost is paid.
  s.give(0, Zone.Trash, "ST24-08");
  const trashBefore = new Set(player.trash.map(({ instanceId }) => instanceId));
  const decisionsBefore = s.decisions.length;
  s.state.memory = 3;
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: falcomon.instanceId });
  if (!result.ok) throw new Error(`Falcomon play rejected: ${JSON.stringify(result)}`);
  await settle(() =>
    player.trash.some(({ instanceId }) => !trashBefore.has(instanceId) && instanceId !== falcomon.instanceId),
  );
  await settle(() => s.state.pendingDecision === undefined);
  return {
    offeredInstanceIds: s.decisions
      .slice(decisionsBefore)
      .flatMap(({ req }) => [...(req.options?.candidateInstanceIds ?? []), ...(req.options?.visibleInstanceIds ?? [])]),
    trashed: player.trash.find(({ instanceId }) => !trashBefore.has(instanceId) && instanceId !== falcomon.instanceId),
  };
}
