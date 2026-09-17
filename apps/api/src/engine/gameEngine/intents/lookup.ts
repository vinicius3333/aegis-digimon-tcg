import { peekCheckedCard } from "../../security/checkedCard.js";
import { Permanent, type CardInstance } from "@aegis/shared";
import type { GameEngine } from "../../GameEngine.js";
import { listCandidateInstances } from "../ruleProcess.js";

/**
 * Locate a CardInstance anywhere on the board (a permanent's top card, its
 * digivolution stack, or a linked card), returning the instance and the permanent
 * carrying it (undefined for a loose card not on a permanent). Used by
 * activateEffect to resolve the source of a `[Main]` ability.
 */
export function findInstance(
  engine: GameEngine,
  instanceId: string,
): { instance: CardInstance; permanent: Permanent | undefined } | undefined {
  for (const player of engine.state.players) {
    for (const permanent of player.battleArea) {
      const onPerm = instanceOnPermanent(engine, permanent, instanceId);
      if (onPerm !== undefined) return { instance: onPerm, permanent };
    }
    if (player.breeding !== undefined) {
      const onBreeding = instanceOnPermanent(engine, player.breeding, instanceId);
      if (onBreeding !== undefined) return { instance: onBreeding, permanent: player.breeding };
    }
    // A loose card in hand (no carrying permanent): reachable so a [Hand] activated ability
    // resolves. The activate verb's controller check falls back to the loose card's ownerSeat, so
    // a player can only activate their own hand card. permanent stays undefined (no field anchor).
    const inHand = player.hand.find((c) => c.instanceId === instanceId);
    if (inHand !== undefined) return { instance: inHand, permanent: undefined };
    // A loose card in trash: reachable so a `[Trash][Main]` activated ability resolves
    // (the eighth engine gap's activation-path half — the corresponding regression coverage).
    // permanent stays undefined; the `activated` builder's residency guard (isFromTrash vs.
    // not) is what keeps engine from also making an ordinary on-field-only [Main] ability
    // activatable once its card has been trashed.
    const inTrash = player.trash.find((c) => c.instanceId === instanceId);
    if (inTrash !== undefined) return { instance: inTrash, permanent: undefined };
  }
  return undefined;
}

/**
 * Locate a CardInstance anywhere the continuous-recompute pass reaches (battle area,
 * breeding, hand, trash, face-up security, a mid-resolution Option) — the superset
 * `findInstance` does NOT cover (findInstance is scoped to what `activateEffect` needs:
 * a permanent's own stack/linked cards, or a loose hand/trash card). Used by
 * `fireSubTrigger`'s context builder to bind `ctx.source` for an anchor-less watcher
 * (`SubTriggerInstall.sourceInstanceId`) installed by a hand/trash-resident card.
 */
export function findLooseInstance(engine: GameEngine, instanceId: string): CardInstance | undefined {
  return (
    peekCheckedCard(engine.state, instanceId)?.card ??
    listCandidateInstances(engine).find((c) => c.instanceId === instanceId)
  );
}

export function instanceOnPermanent(
  engine: GameEngine,
  permanent: Permanent,
  instanceId: string,
): CardInstance | undefined {
  if (permanent.topCard !== undefined && permanent.topCard.instanceId === instanceId) {
    return permanent.topCard;
  }
  for (const card of permanent.stack) {
    if (card.instanceId === instanceId) return card;
  }
  for (const card of permanent.linked) {
    if (card.instanceId === instanceId) return card;
  }
  return undefined;
}
