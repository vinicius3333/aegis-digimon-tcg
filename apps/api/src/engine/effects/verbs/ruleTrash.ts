import { Zone, CardInstance } from "@aegis/shared";
import { applyOverflow, extractPermanentAt, insertCard } from "../../state/access.js";
import type { Primitives } from "../EffectContext.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Rule-driven trashing of a permanent, with no effect as the source.
 */

export function createRuleTrashVerbs(pc: PrimitivesContext) {
  const { engine, dropPermanentLedgers, ledger, player, state } = pc;

  const trashPermanentByRule: Primitives["trashPermanentByRule"] = async (permanentIds) => {
    const wanted = new Set(permanentIds);
    const moved: CardInstance[] = [];
    for (const owner of state.players) {
      for (let index = owner.battleArea.length - 1; index >= 0; index -= 1) {
        const permanent = owner.battleArea[index];
        if (permanent === undefined || !wanted.has(permanent.permanentId)) continue;
        const extracted = extractPermanentAt(owner, index);
        if (extracted === undefined) continue;
        dropPermanentLedgers(extracted.permanentId);
        const cards = [...extracted.stack, ...(extracted.topCard ? [extracted.topCard] : []), ...extracted.linked];
        for (const card of cards) {
          card.faceUp = true;
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          moved.push(card);
        }
      }
    }
    if (moved.length === 0) return [];
    ledger.dropSourceInstances(
      state,
      moved.map((card) => card.instanceId),
    );
    applyOverflow(engine.memory, moved, state.turnSeat);
    engine.emit({
      kind: "cardsMoved",
      instanceIds: moved.map((card) => card.instanceId),
      from: Zone.BattleArea,
      to: Zone.Trash,
    });
    return moved;
  };

  return { trashPermanentByRule };
}
