// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-030")!;
const generatedWhenDigivolving = generated.effects.find((effect) => effect.trigger === "WhenDigivolving")!;

function hasAngelTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Angel" || t === "Archangel" || t === "Three Great Angels");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Search your security stack. You may play 1 level 5 or lower " +
            "Digimon card with the [Angel]/[Archangel] trait among them without paying the cost. " +
            "Then, shuffle your security stack, and 1 of your opponent's Digimon gets -7000 DP " +
            "until the end of the turn.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const security = [...owner.security];
            if (security.length === 0) return;

            const qualifying = security.filter((c) => {
              const def = ctx.game.definitionOf(c);
              if (!isDigimon(def)) return false;
              if ((def.level ?? 99) > 5) return false;
              return (def.types ?? []).some((t) => t === "Angel" || t === "Archangel");
            });
            const maxCount = Math.min(1, qualifying.length);
            let _played = false;
            if (maxCount > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: qualifying.map((c) => c.instanceId),
                min: 0,
                max: maxCount,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
                _played = true;
              }
            }

            if (owner.security.length > 0) {
              ctx.fx.shuffleSecurity(source.ownerSeat);
            }

            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const oppCandidates = Array.from(oppPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (oppCandidates.length > 0) {
              const targets = await ctx.ask.chooseTargets(ctx, {
                candidates: oppCandidates,
                min: 1,
                max: 1,
              });
              if (targets.length > 0) {
                ctx.fx.modifyDP(targets[0]!, -7000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -7000,
            duration: "untilEachTurnEnd",
            optional: true,
          },
        ],
      };
    }
    if (effect.trigger === "AllTurns") {
      return {
        ...effect,
        actions: effect.actions.map((action) =>
          action.kind === "Replacement"
            ? {
                ...action,
                cost: {
                  kind: "trashSecurityTop",
                  controller: "mine",
                  count: 1,
                  raw: "by trashing the top card of your security stack",
                },
              }
            : action,
        ),
      };
    }
    return effect;
  }),
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-030", compiled);
