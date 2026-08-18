import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-070 — X Antibody Proto Form (EX5, White Option).
 *
 * Rule: This card is also treated as having [X Antibody] in its name.
 * Static: Ignore color requirements if you have a Digimon in play.
 * [Security] Add this card to hand.
 * [Main] 1 of your Digimon without [X Antibody] in digivolution cards may
 *   digivolve into an [X Antibody] trait Digimon from hand, cost -1.
 *   If it did, place this card as its bottom digivolution card.
 * Inherited [All Turns]: When Digimon leaves (not by owner), return
 *   1 Digimon from digi cards to hand + place 1 [X Antibody] on top of security.
 */
const cardId = "EX5-070";

const X_ANTIBODY_NAMES = new Set(["X Antibody", "XAntibody"]);

function hasXAntibodyName(name: string): boolean {
  return X_ANTIBODY_NAMES.has(name);
}

function hasXAntibodyTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "X Antibody" || t === "XAntibody");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // Static: ignore color requirements if you have a Digimon.
    if (timing === EffectTiming.None) {
      out.push({
        effectKey: `${cardId}/static-color`,
        description: "Ignore color requirements if you have a Digimon. Also treated as [X Antibody].",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: () => true,
        resolve: async (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          if (mine.some((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))) {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          }
        },
      });
    }

    // [Security] Add this card to hand.
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      );
    }

    // [Main] Digivolve into X Antibody trait, cost -1, place self as bottom digi.
    if (timing === EffectTiming.OnUseOption) {
      out.push({
        effectKey: `${cardId}/main-digivolve`,
        description:
          "[Main] 1 of your Digimon without [X Antibody] in its digivolution cards may digivolve into a Digimon card with the [X Antibody] trait in your hand with the digivolution cost reduced by 1. If it did, place this card as its bottom digivolution card.",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          const hand = ctx.game.player(source.ownerSeat).hand;
          return mine.some((p) => {
            if (p.topCard === undefined) return false;
            if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
            const stack = p.stack as unknown as { instanceId: string }[];
            if (stack.some((c) => hasXAntibodyName(ctx.game.definitionOf(c as unknown as import("@aegis/shared").CardInstance).nameEn))) return false;
            return hand.some((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasXAntibodyTrait(def);
            });
          });
        },
        resolve: async (ctx) => {
          const mine = ctx.game.player(source.ownerSeat).battleArea;
          const hand = ctx.game.player(source.ownerSeat).hand;

          const candidates = mine
            .filter((p) => {
              if (p.topCard === undefined) return false;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              const stack = p.stack as unknown as { instanceId: string }[];
              if (stack.some((c) => hasXAntibodyName(ctx.game.definitionOf(c as unknown as import("@aegis/shared").CardInstance).nameEn))) return false;
              return hand.some((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && hasXAntibodyTrait(def);
              });
            })
            .map((p) => p.permanentId);
          if (candidates.length === 0) return;

          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
          if (chosen.length === 0) return;
          const hostId = chosen[0]!;
          const hostPerm = ctx.game.permanentById(hostId);
          if (!hostPerm) return;

          const intoCandidates = hand
            .filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasXAntibodyTrait(def);
            })
            .map((c) => c.instanceId);
          if (intoCandidates.length === 0) return;

          const into = await ctx.ask.selectCards(ctx, { candidates: intoCandidates, min: 1, max: 1 });
          if (into.length === 0) return;

          ctx.fx.changeEvoCost(
            ({ target, into: intoCard }) => {
              if (target.controllerSeat !== source.ownerSeat) return false;
              if (intoCard === undefined) return false;
              return intoCard.cardId === into[0]!;
            },
            -1,
            { setFixed: false },
          );

          await ctx.fx.digivolveFromInstance(hostId, into[0]!, { payCost: true });

          await ctx.fx.placeUnder(hostId, [ctx.source.instanceId], { belowTop: false });
        },
      });
    }

    // Inherited [All Turns]: When Digimon leaves → return Digimon + place X Antibody on security.
    if (timing === EffectTiming.OnLeaveFieldAnyone) {
      out.push({
        effectKey: `${cardId}/inh-leave-play`,
        description:
          "Inherited: [All Turns] When this Digimon would leave the battle area other than by one of your effects, from this Digimon's digivolution cards, return 1 Digimon card to the hand and place 1 [X Antibody] on top of your security stack.",
        optional: false,
        isInherited: true,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: (ctx) => {
          const host = source.permanent();
          if (!host) return false;
          return (
            host.stack.some((c) => isDigimon(ctx.game.definitionOf(c))) ||
            host.stack.some((c) => hasXAntibodyName(ctx.game.definitionOf(c).nameEn))
          );
        },
        resolve: async (ctx) => {
          const host = source.permanent();
          if (!host) return;

          const digiCands = host.stack
            .filter((c) => isDigimon(ctx.game.definitionOf(c)))
            .map((c) => c.instanceId);
          if (digiCands.length > 0) {
            const chosen = await ctx.ask.selectCards(ctx, { candidates: digiCands, min: 1, max: 1 });
            if (chosen.length > 0) {
              await ctx.fx.returnToHand(chosen);
            }
          }

          const xCands = host.stack
            .filter((c) => hasXAntibodyName(ctx.game.definitionOf(c).nameEn))
            .map((c) => c.instanceId);
          if (xCands.length > 0) {
            const chosen = await ctx.ask.selectCards(ctx, { candidates: xCands, min: 1, max: 1 });
            if (chosen.length > 0) {
              await ctx.fx.addSecurity(source.ownerSeat, chosen, { toTop: true, faceUp: false });
            }
          }
        },
      });
    }

    return out;
  },
};

registerCard(module);
export default module;
