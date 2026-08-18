// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT13-109 — Belphemon (BT13, Red Option).
 *
 *
 * Printed text (no errata):
 *   [Main] Delete 1 of your opponent's level 6 or higher Digimon. Then, you may
 *   digivolve 1 of your Digimon into a [Belphemon: Sleep Mode] in your trash without
 *   paying the cost.
 *   [Security] By trashing 1 Digimon card in your hand, delete 1 of your opponent's
 *   Digimon with the same level as the trashed card or lower.
 */
const cardId = "BT13-109";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Delete Lv6+ opponent Digimon, then optionally digivolve into
    // Belphemon: Sleep Mode from trash.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete-digivolve`,
          description:
            "[Main] Delete 1 of your opponent's level 6 or higher Digimon. Then, you may " +
            "digivolve 1 of your Digimon into a [Belphemon: Sleep Mode] in your trash " +
            "without paying the cost.",
          optional: false,
          canActivate: (ctx: any) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p: any) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && (def as any).level >= 6;
            });
          },
          resolve: async (ctx: any) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const candidates = opp.battleArea
              .filter((p: any) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && (def as any).level >= 6;
              })
              .map((p: any) => p.permanentId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            if (selected.length > 0) {
              await ctx.fx.deletePermanent(selected);
            }

            // Optionally digivolve into Belphemon: Sleep Mode from trash.
            const owner = ctx.game.player(source.ownerSeat);
            const belpheTrash = owner.trash.filter((c: any) =>
              matchNameOrTrait(ctx.game.definitionOf(c), { tokens: ["Belphemon: Sleep Mode"], match: "nameExact" }),
            );
            const belpheTrashIds = belpheTrash.map((c: any) => c.instanceId);

            const ownerDigimon = owner.battleArea.filter(
              (p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );

            if (belpheTrashIds.length > 0 && ownerDigimon.length > 0) {
              const digimonIds = ownerDigimon.map((p: any) => p.permanentId);
              const dBase = await ctx.ask.selectPermanents(ctx, {
                candidates: digimonIds,
                min: 0,
                max: 1,
              });

              if (dBase.length > 0) {
                const belId = belpheTrash[0].instanceId;
                await ctx.fx.digivolveFromInstance(dBase[0], belId, { payCost: false, ignoreRequirements: true });
              }
            }
          },
        }),
      ];
    }

    // [Security] Trash 1 Digimon from hand to delete opponent Digimon with
    // same level as trashed or lower.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-trash-and-delete`,
          description:
            "[Security] By trashing 1 Digimon card in your hand, delete 1 of your opponent's " +
            "Digimon with the same level as the trashed card or lower.",
          optional: false,
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            const handDigimon = owner.hand.filter((c: any) =>
              isDigimon(ctx.game.definitionOf(c)),
            );

            if (handDigimon.length === 0) return;

            const handDigimonIds = handDigimon.map((c: any) => c.instanceId);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: handDigimonIds,
              min: 0,
              max: 1,
            });

            if (selected.length === 0) return;

            const trashedDef = ctx.game.definitionOf(handDigimon.find((c: any) => c.instanceId === selected[0])!);
            const trashedLevel = (trashedDef as any).level ?? 0;

            await ctx.fx.trash(selected);

            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const candidates = opp.battleArea
              .filter((p: any) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && (def as any).level <= trashedLevel;
              })
              .map((p: any) => p.permanentId);

            if (candidates.length === 0) return;

            const target = await ctx.ask.selectPermanents(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            if (target.length > 0) {
              await ctx.fx.deletePermanent(target);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
