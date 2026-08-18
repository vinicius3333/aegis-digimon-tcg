import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-102";

/** Opponent battle-area Digimon permanent ids (source IsPermanentExistsOnOpponentBattleAreaDigimon). */
function opponentDigimonPermanentIds(ctx: EffectContext, source: CardSource): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const ids: string[] = [];
  for (const permanent of opponent.battleArea) {
    if (permanent.topCard == null) continue;
    if (isDigimon(ctx.game.definitionOf(permanent.topCard))) ids.push(permanent.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [Main] Suspend 1 of your opponent's Digimon. Then, place this card in your
    //     battle area. (source OptionSkill clause.)
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-suspend-then-place`,
          description:
            "[Main] Suspend 1 of your opponent's Digimon. Then, place this card in your battle area.",
          optional: false,
          // OnUseOption window is already scoped to this instance by the play flow).
          resolve: async (ctx) => {
            const candidates = opponentDigimonPermanentIds(ctx, source);
            if (candidates.length > 0) {
              // Mode.Tap). With candidates present the source forces exactly 1.
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates,
                min: 1,
                max: 1,
              });
              ctx.fx.suspend(chosen);
            }

            // "Then, place this card in your battle area." — the <Delay> placement:
            // the resolving Option becomes a battle-area permanent instead of going to
            // the trash (source PlaceDelayOptionCards).
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    // (2) [Main] <Delay> - Gain 2 memory. (source OnDeclaration clause.)
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/delay-gain-2-memory`,
          description:
            "[Main] <Delay> (Trash this card in your battle area to activate the effect below. " +
            "You can't activate this effect the turn this card enters play.) - Gain 2 memory.",
          optional: false,
          // CanDeclareOptionDelayEffect: on field AND entered play on an EARLIER turn
          // (the ＜Delay＞ gate — can't activate the turn this permanent entered play).
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const self = source.permanent();
            return self !== undefined && self.enterFieldTurnCount !== ctx.game.state.turnCount;
          },
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const self = source.permanent();
            return self !== undefined && self.enterFieldTurnCount !== ctx.game.state.turnCount;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            // DeletePeremanentAndProcessAccordingToResult([this]) -> on success, AddMemory(2).
            await ctx.fx.deletePermanent([self.permanentId]);
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    }

    // (3) [Security] Place this card in its owner's battle area.
    //     (source PlaceSelfDelayOptionSecurityEffect.)
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-place-in-battle-area`,
          description: "[Security] Place this card in its owner's battle area.",
          optional: false,
          resolve: async (ctx) => {
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
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
