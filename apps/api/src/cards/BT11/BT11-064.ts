import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-064";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/evo-reduction-per-color`,
        description:
          "[Your Turn] When this Digimon digivolves into a Greymon-named card, reduce cost by 1 per color of that card.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          for (let colorCount = 1; colorCount <= 7; colorCount += 1) {
            ctx.fx.changeEvoCost(
              ({ target, into }) =>
                target.permanentId === host.permanentId &&
                into !== undefined &&
                into.nameEn.includes("Greymon") &&
                into.colors.length === colorCount,
              -colorCount,
            );
          }
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-leave-prevention`,
        description: "Inherited: place X Antibody at deck bottom to prevent a Greymon/Omnimon host leaving by effect.",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeReplacement({
            event: "wouldLeavePlay",
            sourcePermanentId: host.permanentId,
            mode: "prevent",
            description: "BT11-064 inherited leave prevention",
            causeAllows: (cause) => cause === "byEffect",
            protects: (subCtx, leavingId) => {
              const leaving = subCtx.game.permanentById(leavingId);
              return (
                leavingId === host.permanentId &&
                leaving?.topCard !== undefined &&
                ["Greymon", "Omnimon"].some((name) => subCtx.game.definitionOf(leaving.topCard!).nameEn.includes(name))
              );
            },
            preventCheck: async (subCtx) => {
              const current = subCtx.game.permanentById(host.permanentId);
              if (current === undefined) return false;
              const candidates = current.stack.filter((card) =>
                subCtx.game.definitionOf(card).nameEn.includes("X Antibody"),
              );
              if (
                candidates.length === 0 ||
                !(await subCtx.ask.optional(subCtx, "Bottom-deck X Antibody to prevent leaving?"))
              )
                return false;
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: candidates.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
              });
              return (await subCtx.fx.returnToDeck(chosen, { toTop: false })).length === 1;
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
