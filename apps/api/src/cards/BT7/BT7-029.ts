import { CardKind, EffectDuration, EffectTiming, isDigimon, type CompiledCard } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { irCardModule } from "../../engine/effects/interpreter.js";


const cardId = "BT7-029";
const SHARED_KEY = `${cardId}/bounce-hybrid`;

const addToHandCompiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          raw: "When an effect adds a card to your hand",
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
const addToHandModule = irCardModule(`${cardId}/__add-to-hand`, addToHandCompiled);

function hybridInstancesInOwnStack(source: CardSource, ctx: EffectContext): string[] {
  const self = source.permanent();
  if (!self) return [];
  return self.stack
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
      return traits.some((t) => t.toLowerCase() === "hybrid");
    })
    .map((c) => c.instanceId);
}

function opponentDigimonAtLevel(
  ctx: EffectContext,
  source: CardSource,
  level: number,
): Permanent[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  return Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && def.level === level;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving][Once Per Turn] bounce via Hybrid card return
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: SHARED_KEY,
          description:
            "[When Digivolving][Once Per Turn] You may return 1 card with [Hybrid] in its " +
            "traits from this Digimon's digivolution cards to your hand to return 1 of your " +
            "opponent's Digimon with the same level as the returned card to its owner's hand. " +
            "Trash all of the digivolution cards of that Digimon.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            hybridInstancesInOwnStack(source, ctx).length >= 1,
          resolve: async (ctx) => {
            await resolveBounce(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking][Once Per Turn] same body, shared hash
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: SHARED_KEY,
          description:
            "[When Attacking][Once Per Turn] You may return 1 card with [Hybrid] in its " +
            "traits from this Digimon's digivolution cards to your hand to return 1 of your " +
            "opponent's Digimon with the same level as the returned card to its owner's hand. " +
            "Trash all of the digivolution cards of that Digimon.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            hybridInstancesInOwnStack(source, ctx).length >= 1,
          resolve: async (ctx) => {
            await resolveBounce(ctx, source);
          },
        }),
      ];
    }

    return addToHandModule.effectsForTiming(timing, source);
  },
};

async function resolveBounce(ctx: EffectContext, source: CardSource): Promise<void> {
  const hybridIds = hybridInstancesInOwnStack(source, ctx);
  if (hybridIds.length === 0) return;

  const picked =
    hybridIds.length === 1
      ? [hybridIds[0]!]
      : await ctx.ask.selectCards(ctx, { candidates: hybridIds, min: 1, max: 1 });
  if (picked.length === 0) return;

  const pickedId = picked[0]!;
  const pickedCard = source.permanent()?.stack.find((card) => card.instanceId === pickedId);
  if (!pickedCard) return;
  const def = ctx.game.definitionOf(pickedCard);

  // Return Hybrid card to hand first
  await ctx.fx.returnToHand([pickedId]);

  // Find opponent Digimon at same level
  const level = def.level;
  if (level === undefined) return;

  const targets = opponentDigimonAtLevel(ctx, source, level);
  if (targets.length === 0) return;

  const targetIds = targets.map((p) => p.permanentId);
  const chosenTargetId =
    targetIds.length === 1
      ? targetIds[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates: targetIds, min: 1, max: 1 }))[0];
  if (!chosenTargetId) return;

  const target = targets.find((p) => p.permanentId === chosenTargetId);
  if (!target) return;

  // Trash all digivolution cards first (documented behavior: the Bounce mode trashes digivolution cards
  // as part of returning the permanent to hand)
  if (target.stack.length > 0) {
    await ctx.fx.trashDigivolutionCards(
      target.permanentId,
      target.stack.map((c) => c.instanceId),
      { byEffectSeat: source.ownerSeat },
    );
  }

  // Return opponent Digimon to hand
  if (target.topCard !== undefined) {
    await ctx.fx.returnToHand([target.topCard.instanceId]);
  }
}

registerCard(module);
export default module;
