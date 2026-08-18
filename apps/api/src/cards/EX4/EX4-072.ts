import { EffectTiming, EffectDuration, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX4-072 — X Antibody PF (EX4, White Option).
 *
 * Rule: This card is also treated as [Plug-In] in name.
 * Static: Ignore color requirements if you have a Tamer in play.
 * [Main] Choose 1 of your Lv.6 Gallantmon/Sakuyamon/MegaGargomon. From hand,
 *   ignoring digivolution requirements and without paying cost, it may digivolve
 *   into a Lv.6 Digimon with a different name that includes the chosen name.
 * [Security] Return 1 Digimon from trash to hand + add this card to hand.
 */
const cardId = "EX4-072";

const VALID_NAMES = new Set(["Gallantmon", "Sakuyamon", "MegaGargomon"]);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // Static: rename + ignore color requirement.
    if (timing === EffectTiming.None) {
      out.push({
        effectKey: `${cardId}/static-name-and-color`,
        description: "This card is also treated as [Plug-In]. Ignore color requirements if you have a Tamer.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: () => true,
        resolve: async (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          if (mine.some((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)))) {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          }
        },
      });
    }

    // [Main] Choose Lv6 → digivolve into different name-includes card from hand.
    if (timing === EffectTiming.OnUseOption) {
      out.push({
        effectKey: `${cardId}/main-digivolve`,
        description:
          "[Main] Choose 1 of your level 6 Digimon with [Gallantmon], [Sakuyamon] or [MegaGargomon] in its name. Ignoring digivolution requirements and without paying the cost, it may digivolve into a level 6 Digimon card in your hand with a different name that includes the chosen Digimon's name.",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          return mine.some((p) => {
            if (p.topCard === undefined) return false;
            const def = ctx.game.definitionOf(p.topCard);
            return isDigimon(def) && VALID_NAMES.has(def.nameEn) && (def.level ?? 0) >= 6;
          });
        },
        resolve: async (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          const candidates = mine
            .filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && VALID_NAMES.has(def.nameEn) && (def.level ?? 0) >= 6;
            })
            .map((p) => p.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
          if (chosen.length === 0) return;
          const targetPerm = ctx.game.permanentById(chosen[0]!);
          if (!targetPerm || targetPerm.topCard === undefined) return;
          const chosenName = ctx.game.definitionOf(targetPerm.topCard).nameEn;
          const hand = ctx.game.player(source.ownerSeat).hand;
          const intoCandidates = hand.filter((c) => {
            const def = ctx.game.definitionOf(c);
            return (
              isDigimon(def) &&
              (def.level ?? 0) === 6 &&
              def.nameEn !== chosenName &&
              def.nameEn.includes(chosenName)
            );
          });
          if (intoCandidates.length === 0) return;
          const intoIds = intoCandidates.map((c) => c.instanceId);
          const picked = await ctx.ask.selectCards(ctx, { candidates: intoIds, min: 0, max: 1 });
          if (picked.length === 0) return;
          await ctx.fx.digivolveFromInstance(targetPerm.permanentId, picked[0]!, {
            payCost: false,
            ignoreRequirements: true,
          });
        },
      });
    }

    // [Security] Return 1 Digimon from trash + add this to hand.
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Return 1 Digimon card from your trash to your hand, and add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            const digiTrash = trash
              .filter((c) => isDigimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (digiTrash.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: digiTrash, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
              }
            }
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
