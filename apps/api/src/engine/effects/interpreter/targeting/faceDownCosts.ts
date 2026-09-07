import { CardKind, type CardInstance, type Cost, type Permanent } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";

/** Eligible cost stacks, with face-down cards ordered from the bottom (Q4785). */
export function bottomFaceDownCostStacks(ctx: EffectContext, cost: Cost): { host: Permanent; cards: CardInstance[] }[] {
  if (cost.kind !== "trashBottomFaceDownUnderTamer" && cost.kind !== "trashBottomFaceDownUnderDigimon") return [];
  const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
  const kind = cost.kind === "trashBottomFaceDownUnderTamer" ? CardKind.Tamer : CardKind.Digimon;
  return Array.from(ctx.game.player(seat).battleArea).flatMap((host) => {
    if (host.topCard === undefined || !ctx.game.definitionOf(host.topCard).kinds.includes(kind)) return [];
    const cards = host.stack.filter((card) => card.faceUp === false);
    return cards.length === 0 ? [] : [{ host, cards }];
  });
}
