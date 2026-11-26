import { EffectTiming } from "@aegis/shared";
import { EffectQueueZone } from "@aegis/shared/protocol/EffectQueueZone";
import type { CardSource } from "#api/engine/effects/CardSource";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import type { GameEngine } from "#api/engine/GameEngine";
import type { CollectedEffect } from "#api/engine/effects/collect";
import { isPubliclyVisibleSource } from "#api/engine/effects/isPubliclyVisibleSource";
import { presentsAsInherited } from "#api/engine/effects/presentsAsInherited";
import { orderingSeatOf } from "#api/engine/effects/stack";
import { EMPTY_EFFECT_QUEUE_JSON } from "#api/engine/gameEngine/EMPTY_EFFECT_QUEUE_JSON";

type Params = { engine: GameEngine };

const MINIMUM_SHOWN_EFFECTS = 2;

export function publishEffectQueue({ engine }: Params): void {
  const slots = [...engine.effectQueueReaders].reverse().flatMap((read) => read());
  const entries: EffectQueueEntry[] = [];
  for (const [slotIndex, slot] of slots.entries()) {
    const position = entries.length + 1;
    for (const collected of slot.effects) {
      entries.push({
        ...buildPublicIdentity(collected),
        sourceZone: getSourceZone(collected.source),
        seat: orderingSeatOf(collected),
        position,
        ...(slot.effects.length > 1 ? { lastPosition: position + slot.effects.length - 1 } : {}),
        ...(slotIndex === 0 && slot.isResolving ? { isResolving: true } : {}),
      });
    }
  }
  const wasShown = engine.state.effectQueueJson !== EMPTY_EFFECT_QUEUE_JSON;
  const shown = entries.length >= MINIMUM_SHOWN_EFFECTS || (wasShown && entries.length > 0) ? entries : [];
  const json = JSON.stringify(shown);
  if (engine.state.effectQueueJson !== json) {
    engine.state.effectQueueJson = json;
  }
}

function getSourceZone(source: CardSource): EffectQueueZone {
  if (source.isOnBattleArea?.() === true) {
    return EffectQueueZone.BATTLE_AREA.value;
  }
  if (source.isOnBreedingArea?.() === true) {
    return EffectQueueZone.BREEDING.value;
  }
  if (source.isInTrash?.() === true) {
    return EffectQueueZone.TRASH.value;
  }
  if (source.isInSecurity?.() === true) {
    return EffectQueueZone.SECURITY.value;
  }
  if (source.isInHand?.() === true) {
    return EffectQueueZone.HAND.value;
  }
  return EffectQueueZone.HIDDEN.value;
}

function buildPublicIdentity(collected: CollectedEffect): Partial<EffectQueueEntry> {
  if (!isPubliclyVisibleSource(collected.source)) {
    return {};
  }
  const sourcePermanentId = collected.conferredToPermanentId ?? collected.source.permanent()?.permanentId;
  const timing =
    collected.effect.timingOverride ??
    collected.printedTiming ??
    collected.effect.irTrigger ??
    collected.timingLabel ??
    (collected.timing === undefined ? undefined : EffectTiming[collected.timing]);
  return {
    sourceCardId: collected.presentedSourceCardId ?? collected.source.cardId,
    ...(sourcePermanentId === undefined ? {} : { sourcePermanentId }),
    ...(timing === undefined ? {} : { timing }),
    ...(presentsAsInherited(collected) ? { isInherited: true } : {}),
  };
}
