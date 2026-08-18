import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDeletion, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-015";

/** "Has ＜Save＞ in its text" — mirrors documented behavior HasSaveText. Full-width angle brackets only in JP; both forms in EN. */
const hasSaveText = (def: CardDefinition): boolean => {
  const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
  return hay.includes("＜Save＞") || hay.toLowerCase().includes("<save");
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Save＞ — [On Deletion] place this card under one of the controller's Tamers (optional).
    // Per P-115's compiled IR: { kind:"PlaceUnder", target:{isSelfRef:true}, underFilter:{controller:"mine", kind:["Tamer"]}, optional:true }
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save-place-under`,
          description:
            "＜Save＞ [On Deletion] Place this Digimon under one of your Tamers as a digivolution card (optional).",
          optional: true,
          resolve: async (ctx) => {
            // Find controller's Tamers (non-token).
            const owner = source.ownerSeat;
            const ownerPlayer = ctx.game.player(owner);
            // Battle area permanents that are Tamers (kinds includes Tamer).
            const tamerIds = ownerPlayer.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (def.kinds as string[]).includes("Tamer");
              })
              .map((p) => p.permanentId);

            if (tamerIds.length === 0) return;

            const destId =
              tamerIds.length === 1
                ? tamerIds[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: tamerIds, min: 1, max: 1 }))[0];
            if (destId === undefined) return;

            await ctx.fx.placeUnder(destId, [source.instanceId], { belowTop: true });
          },
        }),
      ];
    }

    // [Start of Your Main Phase] By trashing 1 card with ＜Save＞ in its text from your hand,
    // Draw 1, then suspend 1 of your opponent's Digimon.
    //   cost: trash 1 Save-text hand card (mandatory select); resolve: draw 1, suspend 1 opp Digimon if any.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-draw-suspend`,
          description:
            "[Start of Your Main Phase] By trashing 1 card with ＜Save＞ in its text from your hand, Draw 1 and suspend 1 of your opponent's Digimon.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const hand = ctx.game.player(source.ownerSeat).hand;
            return hand.some((c) => hasSaveText(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const saveCandidates = hand
              .filter((c) => hasSaveText(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (saveCandidates.length === 0) return;

            // Cost: trash exactly 1 card with <Save> from hand (canNoSelect=false → mandatory pick).
            const trashPicks = await ctx.ask.selectCards(ctx, {
              candidates: saveCandidates,
              min: 1,
              max: 1,
            });
            if (trashPicks.length === 0) return; // player declined (canNoSelect=false, but ask may return [])

            await ctx.fx.trash(trashPicks);

            // Resolve: draw 1.
            ctx.fx.draw(source.ownerSeat, 1);

            // Resolve: suspend 1 of opponent's Digimon (mandatory if opponent has one).
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = ctx.game.player(oppSeat).battleArea
              .filter((p) => !p.isSuspended && p.topCard !== undefined)
              .map((p) => p.permanentId);
            if (oppDigimon.length === 0) return;

            const suspendTargets = await ctx.ask.chooseTargets(ctx, {
              candidates: oppDigimon,
              min: 1,
              max: 1,
            });
            if (suspendTargets.length === 0) return;
            await ctx.fx.suspend(suspendTargets);
          },
        }),
      ];
    }

    // ESS ＜Piercing＞ — inherited static modifier.
    // Grants ＜Piercing＞ to the hosting permanent as long as it is on the battle area.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ess-piercing`,
          description: "[ESS] ＜Piercing＞ — inherited; this Digimon gains ＜Piercing＞.",
          isInherited: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantPierce(self.permanentId, EffectDuration.Permanent);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
