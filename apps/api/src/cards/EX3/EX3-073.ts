import { EffectDuration, EffectTiming, isDigimon, type CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

const cardId = "EX3-073";

function isDragonModeCard(c: CardInstance, ctx: EffectContext): boolean {
  const def = ctx.game.definitionOf(c);
  return matchNameOrTrait(def, { tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" });
}

function dragonModeStackIds(ctx: EffectContext): string[] {
  const perm = ctx.source.permanent?.();
  if (perm === undefined) return [];
  return perm.stack.filter((c) => isDragonModeCard(c, ctx)).map((c) => c.instanceId);
}

function isWormmon(ctx: EffectContext, c: CardInstance): boolean {
  const def = ctx.game.definitionOf(c);
  return matchNameOrTrait(def, { tokens: ["Wormmon"], match: "nameExact" });
}

function isVeemon(ctx: EffectContext, c: CardInstance): boolean {
  const def = ctx.game.definitionOf(c);
  return matchNameOrTrait(def, { tokens: ["Veemon"], match: "nameExact" });
}

function trashCandidates(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  return ctx.game
    .player(ownerSeat)
    .trash.filter((c) => isDigimon(ctx.game.definitionOf(c)) && (isWormmon(ctx, c) || isVeemon(ctx, c)))
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Static] ＜Piercing＞ — re-granted each static pass while on the battle area.
    if (timing === EffectTiming.None) {
      return [
        {
          effectKey: `${cardId}/static-piercing`,
          description: "[Static] ＜Piercing＞",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: () => true,
          resolve: async (ctx) => {
            const permanent = ctx.source.permanent?.();
            if (permanent === undefined) return;
            ctx.fx.grantPierce(permanent.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        },
      ];
    }

    // [When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's
    // digivolution cards to the bottom of its owner's deck, disable all opponent Security effects
    // for the turn.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-dragon-mode-disable-security`,
          description:
            "[When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's " +
            "digivolution cards to the bottom of its owner's deck, none of your opponent's [Security] " +
            "effects can activate for the turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return dragonModeStackIds(ctx).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = dragonModeStackIds(ctx);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            // Cost: return the chosen Dragon Mode card to deck bottom.
            await ctx.fx.returnToDeck(chosen, { toTop: false });

            // Effect: every Digimon this player attacks with suppresses opposing Security effects.
            ctx.fx.disableSecurityEffectsForSeat(ownerSeat, "any", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.
    //   Wormmon and Veemon (each up to 1).
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-wormmon-veemon`,
          description:
            "[On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.",
          optional: true,
          canActivate: (ctx) => trashCandidates(ctx, ownerSeat).length > 0,
          resolve: async (ctx) => {
            // Play up to 1 Wormmon from trash
            const wormmonCandidates = ctx.game
              .player(ownerSeat)
              .trash.filter((c) => isDigimon(ctx.game.definitionOf(c)) && isWormmon(ctx, c))
              .map((c) => c.instanceId);

            if (wormmonCandidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: wormmonCandidates,
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }

            // Play up to 1 Veemon from trash
            const veemonCandidates = ctx.game
              .player(ownerSeat)
              .trash.filter((c) => isDigimon(ctx.game.definitionOf(c)) && isVeemon(ctx, c))
              .map((c) => c.instanceId);

            if (veemonCandidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: veemonCandidates,
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
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
