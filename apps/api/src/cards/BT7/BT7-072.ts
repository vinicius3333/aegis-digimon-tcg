import { EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { irCardModule } from "../../engine/effects/interpreter.js";


const cardId = "BT7-072";

const EYESMON_SCATTER_NAME = "Eyesmon: Scatter Mode";

function countEyesmonScatterInTrash(game: GameAccess, ownerSeat: number): number {
  const trash = game.player(ownerSeat as never).trash;
  let count = 0;
  for (const card of trash) {
    const def = game.definitionOf(card);
    if (def.nameEn === EYESMON_SCATTER_NAME || def.nameEn === "Eyesmon:ScatterMode") {
      count++;
    }
  }
  return count;
}

// The PlayWithoutCost (from trash) clause is correct in the compiled IR.
// Delegate it to the interpreter.
const playFromTrashIr: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: { isSelfRef: true },
          raw: "When this card is trashed from your hand",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
              from: ["trash"],
              optional: true,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "trash",
                  nameOrTrait: [{ tokens: ["Eyesmon: Scatter Mode"], match: "nameExact" }],
                },
                raw: "Eyesmon: Scatter Mode is in your trash",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

const irBase = irCardModule(`${cardId}/__delegate`, playFromTrashIr);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // "While on battle area during your turn + at least 1 Eyesmon: Scatter Mode
    //  in trash: this Digimon gains 2000*count DP until end of turn."
    //
    //     isInheritedEffect:false. changeValue: () => 2000 * count() where
    //     count() scans TrashCards for the name.
    //     condition: IsExistOnBattleArea && IsOwnerTurn && count() >= 1.
    const scalingDp: Effect[] =
      timing === EffectTiming.None
        ? [
            staticModifier({
              source,
              effectKey: `${cardId}/scaling-dp-per-scatter-mode`,
              description:
                "While on battle area during your turn, this Digimon gains +2000 DP for each " +
                "[Eyesmon: Scatter Mode] in your trash (documented behavior).",
              when: (ctx) => {
                if (!ctx.source.isOnBattleArea()) return false;
                if (ctx.game.state.turnSeat !== source.ownerSeat) return false;
                return countEyesmonScatterInTrash(ctx.game, source.ownerSeat as number) >= 1;
              },
              resolve: async (ctx) => {
                const self = ctx.source.permanent();
                if (self === undefined) return;
                const count = countEyesmonScatterInTrash(ctx.game, source.ownerSeat as number);
                if (count === 0) return;
                ctx.fx.modifyDP(self.permanentId, 2000 * count, EffectDuration.UntilEachTurnEnd);
              },
            }),
          ]
        : [];

    // Delegate the hand-trash watcher and self-play clause to the interpreter.
    return [...scalingDp, ...irBase.effectsForTiming(timing, source)];
  },
};

registerCard(module);
export default module;
