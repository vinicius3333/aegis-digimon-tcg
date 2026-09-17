import { Permanent } from "@aegis/shared";
import { setTopCard } from "../../state/access.js";
import { findInstance, findLooseInstance } from "../intents.js";
import type { GameEngine } from "../../GameEngine.js";
import { buildEffectContext, cardSourceOf } from "../effectContext.js";

/**
 * Resolve only `wouldBePlayed` replacements before an effect-driven DigiXros picker.
 * The ordinary BeforePayCost reducers remain at the canonical payment point; engine early seam
 * exists so a replacement can grant its material zones before the picker builds candidates.
 */
export async function prepareDigiXrosPlay(engine: GameEngine, instanceId: string): Promise<string[]> {
  const prepared = await prepareDigiXrosPlays(engine, [instanceId]);
  return prepared[instanceId] ?? [];
}

export async function prepareDigiXrosPlays(
  engine: GameEngine,
  instanceIds: readonly string[],
): Promise<Record<string, string[]>> {
  const targets: Permanent[] = [];
  for (const instanceId of instanceIds) {
    const instance = findLooseInstance(engine, instanceId);
    if (instance === undefined) continue;
    const source = cardSourceOf(engine, instance);
    const playTarget = new Permanent();
    playTarget.permanentId = `pending-play-${instance.instanceId}`;
    playTarget.controllerSeat = source.ownerSeat;
    setTopCard(playTarget, instance);
    playTarget.inBreeding = false;
    playTarget.baseDP = source.definition.dp ?? 0;
    playTarget.currentDP = playTarget.baseDP;
    targets.push(playTarget);
  }
  if (targets.length === 0) return {};
  const handledByPlay: Record<string, string[]> = Object.fromEntries(
    targets.map((target) => [target.topCard!.instanceId, []]),
  );
  await engine.subTriggers.activateInsteadReplacementsFor(
    "wouldBePlayed",
    targets,
    (sourcePermanentId, sourceInstanceId, targetInstanceId) => {
      const pendingInstance = findLooseInstance(engine, targetInstanceId ?? targets[0]!.topCard!.instanceId);
      const pendingOwnerSeat = pendingInstance?.ownerSeat ?? targets[0]!.controllerSeat;
      const resident =
        engine.access.permanentById(sourcePermanentId) ??
        (engine.state.players[pendingOwnerSeat]?.breeding?.permanentId === sourcePermanentId
          ? engine.state.players[pendingOwnerSeat]?.breeding
          : undefined);
      const sourceCard = findInstance(engine, sourceInstanceId ?? "")?.instance ?? resident?.topCard;
      if (sourceCard === undefined) return undefined;
      return {
        ...buildEffectContext(engine, cardSourceOf(engine, sourceCard), {
          wouldBePlayedInstanceId: targetInstanceId ?? targets[0]!.topCard!.instanceId,
          wouldBePlayedCardId:
            findLooseInstance(engine, targetInstanceId ?? targets[0]!.topCard!.instanceId)?.cardId ??
            targets[0]!.topCard!.cardId,
          wouldBePlayedAsOption: false,
        }),
        selections: new Map(),
      };
    },
    {
      hasFired: (key) => engine.tracker.count(key, "replacement") > 0,
      markFired: (key) => engine.tracker.register(key, "replacement"),
    },
    (replacement, targetInstanceIds) => {
      // The static picker represents the same printed ability. An offered source stays
      // handled after refusal so it cannot receive a second activation offer for engine play.
      if (replacement.sourcePermanentId !== undefined) {
        for (const pendingId of targetInstanceIds ?? []) {
          (handledByPlay[pendingId] ??= []).push(replacement.sourcePermanentId);
        }
      }
    },
  );
  return handledByPlay;
}
