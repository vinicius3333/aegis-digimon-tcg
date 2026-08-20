import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT18-069";

const hasKnightmonInName = (def: CardDefinition): boolean =>
  def.nameEn.includes("Knightmon") ||
  (typeof def.effectText === "string" && def.effectText.includes("Knightmon"));

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [End of Opponent's Turn][Once Per Turn] You may choose 1 of your opponent's Digimon.
    // Your opponent attacks with the chosen Digimon.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-opponents-turn-force-attack`,
          description:
            "[End of Opponent's Turn][Once Per Turn] You may choose 1 of your opponent's " +
            "Digimon. Your opponent attacks with the chosen Digimon.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => {
            // Must be opponent's turn (not own turn).
            if (ctx.game.state.turnSeat === source.ownerSeat) return false;
            return ctx.source.isOnBattleArea();
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // Q3007: no attack can be declared while one is in progress (guard in forceAttack).
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opponent.battleArea.some(
              (perm) =>
                !perm.inBreeding &&
                perm.topCard !== undefined &&
                (ctx.game.definitionOf(perm.topCard).kinds as string[]).includes(CardKind.Digimon),
            );
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponent = ctx.game.player(opponentSeat);
            const candidates = opponent.battleArea
              .filter(
                (perm) =>
                  !perm.inBreeding &&
                  perm.topCard !== undefined &&
                  (ctx.game.definitionOf(perm.topCard).kinds as string[]).includes(CardKind.Digimon),
              )
              .map((perm) => perm.permanentId);

            if (candidates.length === 0) return;

            // Q3005: choosing is optional — pass min:0.
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            // Q3006: forceAttack is a no-op if the Digimon can't attack.
            await ctx.fx.forceAttack(chosen[0]!);
          },
        }),
      ];
    }

    // [Inherited Effect][All Turns] Digimon with [Knightmon] in name/text get +2000 DP.
    // Continuous static re-derived each pass while this card is on the field.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ess-knightmon-dp-plus`,
          description:
            "[Inherited Effect][All Turns] All of your Digimon with [Knightmon] in their " +
            "names or text get +2000 DP.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const owner = ctx.game.player(ownerSeat);
            for (const perm of owner.battleArea) {
              if (perm.inBreeding || !perm.topCard) continue;
              const def = ctx.game.definitionOf(perm.topCard);
              if (!(def.kinds as string[]).includes(CardKind.Digimon)) continue;
              if (!hasKnightmonInName(def)) continue;
              ctx.fx.modifyDP(perm.permanentId, 2000, EffectDuration.Permanent);
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
