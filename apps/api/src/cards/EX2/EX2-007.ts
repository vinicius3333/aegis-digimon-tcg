import { EffectDuration, EffectTiming, type CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "EX2-007";
const D_REAPER = "D-Reaper";
const ADR_02_NAME = "ADR-02 Searcher";
const MOTHER_D_REAPER = "Mother D-Reaper";

function hasDReaperTrait(def: CardDefinition): boolean {
  return (def.forms as string[] | undefined)?.includes(D_REAPER) ?? false;
}

function hasOtherMotherDReaper(ctx: EffectContext, source: CardSource): boolean {
  const self = source.permanent();
  for (const perm of ctx.game.player(source.ownerSeat).battleArea) {
    if (self !== undefined && perm.permanentId === self.permanentId) continue;
    const topDef = ctx.game.definitionOf(perm.topCard);
    if (topDef.nameEn === MOTHER_D_REAPER) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // ----- STATIC: Can't Attack (documented behavior) --------------------------
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/cant-attack`,
          description: "Can't Attack (documented behavior)",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.restrict(self.permanentId, "attack", EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }

    // ----- STATIC: Unaffected by opponent's effects (documented behavior) ------
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/unaffected`,
          description: "Isn't affected by opponent's effects (documented behavior)",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.restrict(self.permanentId, "beAffected", EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }

    // ----- [Main][Once Per Turn] Place ADR-02 Searcher under this (documented behavior)
    if (timing === EffectTiming.OnDeclaration) {
      out.push({
        effectKey: `${cardId}/main-place-adr02`,
        description:
          "[Main][Once Per Turn] If you don't have another Mother D-Reaper in play, place 1 ADR-02 Searcher from your hand or battle area under this as its bottom digivolution card.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: 1,
        canTrigger: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          return !hasOtherMotherDReaper(ctx, ctx.source);
        },
        canActivate: (ctx) => {
          const player = ctx.game.player(ctx.source.ownerSeat);
          return player.hand.some((card) => ctx.game.definitionOf(card).nameEn === ADR_02_NAME) ||
            player.battleArea.some((permanent) =>
              permanent.topCard !== undefined &&
              ctx.game.definitionOf(permanent.topCard).nameEn === ADR_02_NAME,
            );
        },
        resolve: async (ctx) => {
          const player = ctx.game.player(ctx.source.ownerSeat);
          const hand = player.hand;
          const adr02 = hand.filter(
            (c) => ctx.game.definitionOf(c).nameEn === ADR_02_NAME,
          );
          const field = player.battleArea.filter((permanent) =>
            permanent.topCard !== undefined &&
            ctx.game.definitionOf(permanent.topCard).nameEn === ADR_02_NAME,
          );
          if (adr02.length === 0 && field.length === 0) return;
          const self = ctx.source.permanent();
          if (self === undefined) return;

          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: [
              ...adr02.map((card) => card.instanceId),
              ...field.map((permanent) => permanent.topCard!.instanceId),
            ],
            min: 1,
            max: 1,
          });
          if (chosen.length === 0) return;
          const fieldChoice = field.find((permanent) => permanent.topCard?.instanceId === chosen[0]);
          if (fieldChoice !== undefined) {
            // The Searcher's top card becomes Mother's bottom source; its own sources
            // are trashed as part of leaving the battle area. This is relocation, not
            // deletion, so no [On Deletion] window is produced.
            if (ctx.fx.relocatePermanentByEffect !== undefined) {
              await ctx.fx.relocatePermanentByEffect(self.permanentId, fieldChoice.permanentId, {
                belowTop: false,
                shedOwnCards: true,
              });
            } else {
              ctx.fx.relocatePermanent(self.permanentId, fieldChoice.permanentId, {
                belowTop: false,
                shedOwnCards: true,
              });
            }
            return;
          }
          await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: false });
        },
      });
    }

    // ----- [Your Turn] Play-cost reduction for D-Reaper cards (documented behavior)
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description:
            "[Your Turn] Reduce play cost of your D-Reaper cards by number of this Digimon's digivolution cards (documented behavior)",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const self = ctx.source.permanent();
            return (self?.stack.length ?? 0) >= 1;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const n = self.stack.length;
            ctx.fx.changePlayCost(
              (facts) =>
                facts.controllerSeat === ctx.source.ownerSeat &&
                hasDReaperTrait(facts.def),
              -n,
            );
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
