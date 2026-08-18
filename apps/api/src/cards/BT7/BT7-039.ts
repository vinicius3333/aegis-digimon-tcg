import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-039";
const inheritedCompiled = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
} as unknown as CompiledCard;
const inheritedModule = irCardModule(cardId, inheritedCompiled);

function yellowDigimonLv4OrLowerInHand(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game.player(source.ownerSeat).hand
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return (
        def.kinds.includes(CardKind.Digimon) &&
        def.colors.includes(CardColor.Yellow) &&
        def.level !== undefined &&
        def.level <= 4
      );
    })
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Place up to 2 yellow Lv.<=4 Digimon from hand
    // under this Digimon, then draw for each placed.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-under-and-draw`,
          description:
            "[When Digivolving] If this Digimon has 1 digivolution card, you may place " +
            "up to 2 level 4 or lower yellow Digimon cards from your hand at the bottom " +
            "of this Digimon's digivolution cards in any order. Then, <Draw 1> for each " +
            "Digimon card you placed.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (yellowDigimonLv4OrLowerInHand(ctx, source).length === 0) return false;
            const self = source.permanent();
            if (!self) return false;
            return self.stack.length === 1;
          },
          resolve: async (ctx) => {
            const candidates = yellowDigimonLv4OrLowerInHand(ctx, source);
            if (candidates.length === 0) return;

            const maxSelect = Math.min(2, candidates.length);

            // canNoSelect=true, canEndNotMax=true: select 0..maxSelect
            let selected = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: maxSelect,
              visibleCards: ctx.game.player(source.ownerSeat).hand
                .filter((card) => candidates.includes(card.instanceId))
                .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            });
            if (selected.length === 0) return;
            if (selected.length > 1 && ctx.ask.orderCards !== undefined) {
              selected = await ctx.ask.orderCards(ctx, {
                candidates: selected,
                visibleCards: ctx.game.player(source.ownerSeat).hand
                  .filter((card) => selected.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "stackBottom",
              });
            }

            const self = source.permanent();
            if (!self) return;

            // Place selected cards at bottom of digivolution cards
            await ctx.fx.placeUnder(self.permanentId, [...selected].reverse());

            // Draw 1 for each card placed
            await ctx.fx.draw(source.ownerSeat, selected.length);
          },
        }),
      ];
    }

    return inheritedModule.effectsForTiming(timing, source);
  },
};

registerCard(module);
export default module;
