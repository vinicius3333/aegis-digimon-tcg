import { EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { Permanent } from "@aegis/shared";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { irCardModule } from "../../engine/effects/interpreter.js";


const cardId = "EX1-043";

const INSECTOID_TRAIT = "Insectoid";


function countInsectoidInStackFromGame(game: GameAccess, permanent: Permanent): number {
  let count = 0;
  for (const card of permanent.stack ?? []) {
    const def = game.definitionOf(card);
    if (def.types?.includes(INSECTOID_TRAIT)) {
      count++;
    }
  }
  return count;
}

// The YourTurn SubTrigger{whenDeletesInBattle} → Unsuspend clause is correct in
// the compiled IR. Delegate it to the interpreter.
const unsuspendIr: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Insectoid", "Ancient Insect"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "[Your Turn][Once Per Turn] When one of your Digimon with [Insectoid] or [Ancient Insect] in its traits deletes an opponent's Digimon in battle and survives, you may unsuspend this Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

const irBase = irCardModule(`${cardId}/__delegate`, unsuspendIr);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // "While on battle area during your turn + at least 1 Insectoid card in
    //  this Digimon's digivolution stack: this Digimon gains 1000*count DP
    //  until end of turn."
    //
    //     isInheritedEffect:false. changeValue: () => 1000 * count() where
    //     count() scans DigivolutionCards for Insectoid trait.
    //     condition: IsExistOnBattleArea && IsOwnerTurn && count() >= 1.
    const scalingDp: Effect[] =
      timing === EffectTiming.None
        ? [
            staticModifier({
              source,
              effectKey: `${cardId}/scaling-dp-per-insectoid-stack`,
              description:
                "While on battle area during your turn, this Digimon gains +1000 DP for each " +
                "Insectoid card in its digivolution stack (documented behavior).",
              when: (ctx) => {
                if (!ctx.source.isOnBattleArea()) return false;
                if (ctx.game.state.turnSeat !== source.ownerSeat) return false;
                const self = ctx.source.permanent();
                if (self === undefined) return false;
                return countInsectoidInStackFromGame(ctx.game, self) >= 1;
              },
              resolve: async (ctx) => {
                const self = ctx.source.permanent();
                if (self === undefined) return;
                const count = countInsectoidInStackFromGame(ctx.game, self);
                if (count === 0) return;
                ctx.fx.modifyDP(self.permanentId, 1000 * count, EffectDuration.UntilEachTurnEnd);
              },
            }),
          ]
        : [];

    return [...scalingDp, ...irBase.effectsForTiming(timing, source)];
  },
};

registerCard(module);
export default module;
