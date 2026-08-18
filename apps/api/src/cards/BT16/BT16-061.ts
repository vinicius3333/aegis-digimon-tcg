import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT16-061";

const SOC_TRAIT = "SoC";
const X_ANTIBODY_TRAIT = "X Antibody";
const BEAST_DRAGON_TRAIT = "Beast Dragon";
const UNDEAD_TRAIT = "Undead";

function hasSocTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(SOC_TRAIT);
}

function hasXAntibodyOrSocTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return types.includes(X_ANTIBODY_TRAIT) || types.includes(SOC_TRAIT);
}

function isBeastDragonOrUndeadOrSocDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  const types = def.types ?? [];
  return (
    types.includes(BEAST_DRAGON_TRAIT) ||
    types.includes(UNDEAD_TRAIT) ||
    types.includes(SOC_TRAIT)
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ───────────────────────────── EffectTiming.None ─────────────────────────────
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/collision`,
          description: "＜Collision＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Collision", EffectDuration.UntilEachTurnEnd);
          },
        }),

        // [All Turns] whenAttackTargetSwitched (documented behavior: OnAttackTargetChanged):
        // Install a continuous watcher. When the attack target is switched on a battle
        // involving this Digimon, if it has a [SoC] Tamer in its digivolution stack,
        // you may digivolve into a Beast Dragon / Undead / SoC Digimon from hand for free.
        // KB Q2649: digivolution requirements (level, color) still apply.
        staticModifier({
          source,
          effectKey: `${cardId}/when-attack-target-switched-install`,
          description:
            "[All Turns] whenAttackTargetSwitched: if this Digimon has a [SoC] Tamer in " +
            "its digivolution stack, digivolve into a Beast Dragon/Undead/SoC Digimon from " +
            "hand without paying the cost.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenAttackTargetSwitched",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: whenAttackTargetSwitched → digivolve into Beast Dragon/Undead/SoC`,
              matches: (subCtx) => {
                // The attacker (subject) must be this Digimon.
                const trigger = subCtx.trigger;
                return (
                  trigger?.attackerPermanentId === self.permanentId ||
                  trigger?.subjectPermanentId === self.permanentId
                );
              },
              run: async (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return;

                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined) return;

                // Gate: this Digimon must have a [SoC] Tamer in its digivolution stack.
                const hasSocTamerInStack = selfPerm.stack.some((card) => {
                  const def = subCtx.game.definitionOf(card);
                  return isTamer(def) && hasSocTrait(def);
                });
                if (!hasSocTamerInStack) return;

                const owner = subCtx.game.player(subCtx.source.ownerSeat);
                const candidates = owner.hand.filter((card) =>
                  isBeastDragonOrUndeadOrSocDigimon(subCtx.game.definitionOf(card)),
                );
                if (candidates.length === 0) return;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return;

                await subCtx.fx.digivolveFromInstance(
                  selfPerm.permanentId,
                  chosen[0]!,
                  { payCost: false },
                );
              },
            });
          },
        }),
      ];
    }

    // ─────────────── EffectTiming.OnBattleDeleteOpponent ─────────────────────────
    // [All Turns][Inherited][Once Per Turn]:
    // When this Digimon deletes an opponent's Digimon in battle, you may play 1 card
    // with the [X Antibody] or [SoC] trait and a play cost of 5 or less from your
    // trash without paying the cost.
    // The combat controller fires OnBattleDeleteOpponent with attackerPermanentId
    // (winner) and deletedPermanentId (loser).
    if (timing === EffectTiming.OnBattleDeleteOpponent) {
      return [
        {
          effectKey: `${cardId}/deletes-digimon-play-from-trash`,
          description:
            "[All Turns] (inherited) [Once Per Turn] When this Digimon deletes another " +
            "Digimon in battle, you may play 1 card with the [X Antibody] or [SoC] trait " +
            "and a play cost of 5 or less from your trash without paying the cost.",
          optional: true,
          isInherited: true,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined) return false;
            return ctx.trigger?.attackerPermanentId === self.permanentId;
          },
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.trash.some((card) => {
              const def = ctx.game.definitionOf(card);
              return hasXAntibodyOrSocTrait(def) && def.playCost >= 0 && def.playCost <= 5;
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.trash.filter((card) => {
              const def = ctx.game.definitionOf(card);
              return hasXAntibodyOrSocTrait(def) && def.playCost >= 0 && def.playCost <= 5;
            });
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
