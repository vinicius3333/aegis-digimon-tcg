import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-082 — Yellow Tamer (BT23, Makiko Date).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When any of your Digimon digivolve into a Digimon with the [Beastkin],
//   [Holy Beast], [Cherub] or [CS] trait, by returning this Tamer to the hand, you may
//   play 1 [Lopmon] or level 3 Digimon card with the [CS] trait from your hand without
//   paying the cost.
// [Security] Play this card without paying the cost.
//
const cardId = "BT23-082";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            for (const p of opponent.battleArea) {
              if (p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard))) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digivolve-play`,
          description:
            "[Your Turn] When one of your Digimon digivolves into a [Beastkin], [Holy Beast], [Cherub] or [CS] Digimon, by returning this Tamer to the hand, you may play 1 [Lopmon] or level 3 [CS] Digimon from your hand without paying the cost.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || !ctx.source.isOwnersTurn()) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: digivolve into Beastkin/Holy Beast/Cherub/CS -> return self and play Lopmon/CS level 3`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject?.controllerSeat !== source.ownerSeat || subject.topCard === undefined) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                if (!isDigimon(def)) return false;
                const traits = def.types ?? [];
                return ["Beastkin", "Holy Beast", "Cherub", "CS"].some((trait) => traits.includes(trait));
              },
              run: async (subCtx) => {
                const host = subCtx.game.permanentById(self.permanentId);
                if (host === undefined || host.topCard === undefined) return;
                const hand = subCtx.game.player(source.ownerSeat).hand;
                const candidates = hand
                  .filter((card) => {
                    const def = subCtx.game.definitionOf(card);
                    return (
                      isDigimon(def) &&
                      (def.nameEn === "Lopmon" || (def.level === 3 && (def.types ?? []).includes("CS")))
                    );
                  })
                  .map((card) => card.instanceId);
                if (candidates.length === 0) return;
                if (!(await subCtx.ask.optional(subCtx, "Return this Tamer to your hand to play a matching Digimon?")))
                  return;
                const returned = await subCtx.fx.returnToHand([host.topCard.instanceId]);
                if (returned.length === 0) return;
                const chosen =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.selectCards(subCtx, { candidates, min: 1, max: 1 });
                if (chosen.length === 1) await subCtx.fx.playInstances(chosen, { payCost: false });
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
