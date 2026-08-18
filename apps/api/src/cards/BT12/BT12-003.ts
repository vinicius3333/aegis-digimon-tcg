import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-003";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-tamer-suspended-dp`,
      description: "[Your Turn][Once Per Turn] When a yellow or red Tamer suspends, give an opposing Digimon -1000 DP.",
      isInherited: true,
      maxPerTurn: 1,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host === undefined) return;
        ctx.fx.subscribeSubTrigger({
          event: "whenSuspended",
          sourcePermanentId: host.permanentId,
          once: false,
          description: `${cardId}: red/yellow Tamer suspended`,
          matches: (subCtx) => {
            const subject = subCtx.trigger.suspendedPermanentId === undefined ? undefined : subCtx.game.permanentById(subCtx.trigger.suspendedPermanentId);
            if (subject?.topCard === undefined || subject.controllerSeat !== source.ownerSeat) return false;
            const def = subCtx.game.definitionOf(subject.topCard);
            return isTamer(def) && def.colors.some((color) => color === CardColor.Red || color === CardColor.Yellow);
          },
          run: async (subCtx) => {
            const opponent = subCtx.game.player(subCtx.game.opponentOf(source.ownerSeat));
            const candidates = opponent.battleArea.filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard))).map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await subCtx.ask.selectPermanents(subCtx, { candidates, min: 1, max: 1 });
            if (chosen[0] !== undefined) subCtx.fx.modifyDP(chosen[0], -1000, EffectDuration.UntilEachTurnEnd);
          },
        });
      },
    })];
  },
};
registerCard(module);
export default module;
