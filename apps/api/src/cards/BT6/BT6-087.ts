import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-087 — Tai Kamiya (BT6, Red Tamer).
 *
 * [Your Turn] When one of your Digimon with [Agumon] or [Greymon] in its name
 * moves from the breeding area to the battle area, gain 1 memory and Draw 1.
 *
 * [Main][Once Per Turn] Digivolve your [Agumon] into 1 [Agumon - Bond of Bravery]
 * in your hand for its digivolution cost, ignoring its level. If you do, trash the
 * top 2 cards of your security stack. Then, if you have 1+ security cards, delete
 * that Digimon at the end of the turn.
 *
 * [Security] Play this card without paying its memory cost.
 */
const cardId = "BT6-087";

const BOND_OF_BRAVERY = "Agumon - Bond of Bravery";

function hasAgumonOrGreymonName(def: CardDefinition): boolean {
  return def.nameEn.includes("Agumon") || def.nameEn.includes("Greymon");
}

function isBondOfBravery(def: CardDefinition): boolean {
  return def.nameEn === BOND_OF_BRAVERY;
}

function isExactAgumon(def: CardDefinition): boolean {
  return def.nameEn === "Agumon" && def.colors.includes(CardColor.Red);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Your Turn] OnMove: memory +1 and Draw 1
    if (timing === EffectTiming.OnMove) {
      out.push({
        effectKey: `${cardId}/on-move-memory-draw`,
        description:
          "[Your Turn] When one of your Digimon with [Agumon] or [Greymon] in its name moves from the breeding area to the battle area, gain 1 memory and Draw 1.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          if (!ctx.source.isOwnersTurn()) return false;
          const movedId = ctx.trigger.movedPermanentId;
          if (!movedId) return false;
          const perm = ctx.game.permanentById(movedId);
          if (!perm) return false;
          const def = ctx.game.definitionOf(perm.topCard);
          if (!def || !isDigimon(def)) return false;
          return hasAgumonOrGreymonName(def);
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          await ctx.fx.draw(source.ownerSeat, 1);
          ctx.fx.gainMemory(1);
        },
      });
    }

    // [Main][Once Per Turn] Digivolve into Bond of Bravery
    if (timing === EffectTiming.OnDeclaration) {
      out.push({
        effectKey: `${cardId}/main-digivolve-bond-of-bravery`,
        description:
          "[Main][Once Per Turn] Digivolve your [Agumon] into 1 [Agumon - Bond of Bravery] in your hand for its digivolution cost, ignoring its level. If you do, trash top 2 security. Delete that Digimon at end of turn if you have 1+ security.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: 1,
        canTrigger: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          const hand = ctx.game.player(source.ownerSeat).hand;
          if (!hand.some((c) => isBondOfBravery(ctx.game.definitionOf(c)))) return false;
          return ctx.game.player(source.ownerSeat).battleArea.some((p) => {
            const def = ctx.game.definitionOf(p.topCard);
            return def && isDigimon(def) && isExactAgumon(def);
          });
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          const battleArea = ctx.game.player(source.ownerSeat).battleArea;
          const agumonPerms = battleArea.filter((p) => {
            const def = ctx.game.definitionOf(p.topCard);
            return def && isDigimon(def) && isExactAgumon(def);
          });
          if (agumonPerms.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, {
            candidates: agumonPerms.map((p) => p.permanentId),
            min: 1,
            max: 1,
          });
          if (chosen.length === 0) return;
          const targetId = chosen[0]!;
          const bondCards = Array.from(ctx.game.player(source.ownerSeat).hand).filter((card) =>
            isBondOfBravery(ctx.game.definitionOf(card))
          );
          if (bondCards.length === 0) return;
          const bondInstanceId = bondCards.length === 1
            ? bondCards[0]!.instanceId
            : (await ctx.ask.selectCards(ctx, {
                candidates: bondCards.map((card) => card.instanceId),
                min: 1,
                max: 1,
              }))[0];
          if (bondInstanceId === undefined) return;
          const result = await ctx.fx.digivolveFromInstance(targetId, bondInstanceId, {
            payCost: true,
            costOverride: 3,
            ignoreRequirements: true,
          });
          if (!result) return;
          // trash top 2 security
          const owner = ctx.game.player(source.ownerSeat);
          const secCount = Math.min(2, owner.security.length);
          for (let i = 0; i < secCount; i++) {
            await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
          }
          // delayed delete at end of turn if security remaining
          if (owner.security.length >= 1) {
            ctx.fx.subscribeSubTrigger({
              event: "endOfTurn",
              sourcePermanentId: result.permanentId,
              once: true,
              description: `Delete ${result.permanentId} at end of turn (BT6-087)`,
              run: async (subCtx) => {
                await subCtx.fx.deletePermanent([result.permanentId]);
              },
            });
          }
        },
      });
    }

    // [Security] Play this Tamer
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
