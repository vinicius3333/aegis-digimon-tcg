import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * EX4-030 — Kuzuhamon (EX4, Yellow Lv.6 Digimon).
 *
 *
 * Authoritative text:
 *   [Static] Also treated as having [Sakuyamon] in its name.
 *   [When Digivolving] You may use an Option card with a cost of 5 or less in
 *     your hand without paying the cost.
 *   [Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or
 *     more, you may play 1 [Taomon] or 1 level 4 or lower yellow or blue Digimon
 *     card from this Digimon's digivolution cards without paying the cost.
 *
 *   EffectTiming.None: rule implementation("Sakuyamon") → grantNameTrait("name","Sakuyamon",Permanent).
 *   EffectTiming.OnEnterFieldAnyone (WhenDigivolving): use 1 Option ≤5 from hand without cost
 *     → useOptionFromHand(chosenInstanceId, option.playCost).
 *   EffectTiming.OnUseOption (YourTurn/OncePerTurn/whenOptionUsed ≥2):
 *     install subscribeSubTrigger at None timing, fires when own option used cost ≥2,
 *     → play 1 Taomon or Lv.4-or-lower Blue/Yellow Digimon from digivolution stack without cost.
 */
const cardId = "EX4-030";

const compiled = {
  ...compiledEffects[cardId]!,
  effects: compiledEffects[cardId]!.effects.map((effect) => {
    if (effect.trigger === "Static") {
      return { ...effect, actions: effect.actions.map((action) => action.kind === "GrantStatic" ? { ...action, duration: "forTheTurn" as const } : action) };
    }
    if (effect.trigger === "WhenDigivolving") {
      return {
        ...effect,
        actions: [{ kind: "UseOptionWithoutCost" as const, filter: { controllerDefault: "mine", kind: ["Option"], playCostLte: 5 }, from: ["hand"], payCost: false, optional: true }],
      };
    }
    return effect;
  }),
  coverage: "full" as const,
  residual: [],
};

function isOptionCostAtMost5(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Option as string)) return false;
  return def.playCost !== undefined && def.playCost <= 5;
}

function isEligibleFromStack(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
  if (matchNameOrTrait(def, { tokens: ["Taomon"], match: "nameExact" })) return true;
  if (def.level === undefined || def.level > 4) return false;
  const colors = (def.colors as string[] | undefined) ?? [];
  return colors.includes("Blue") || colors.includes("Yellow");
}

function optionCandidatesFromHand(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isOptionCostAtMost5(ctx.game.definitionOf(c)));
}

function eligibleStackCandidates(ctx: EffectContext): string[] {
  const perm = ctx.source.permanent?.();
  if (perm === undefined) return [];
  return perm.stack.filter((c) => isEligibleFromStack(ctx.game.definitionOf(c))).map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Static] Also treated as having [Sakuyamon] in its name.
    // YourTurn/OncePerTurn whenOptionUsed watcher is also installed here via subscribeSubTrigger.
    if (timing === EffectTiming.None) {
      const nameEffect: Effect = staticModifier({
        source,
        effectKey: `${cardId}/static-sakuyamon-name`,
        description: "[Static] Also treated as having [Sakuyamon] in its name.",
        maxPerTurn: -1,
        when: (ctx) => ctx.source.isOnBattleArea(),
        resolve: async (ctx) => {
          const perm = ctx.source.permanent?.();
          if (perm === undefined) return;
          ctx.fx.grantNameTrait(perm.permanentId, "name", ["Sakuyamon"], EffectDuration.UntilEachTurnEnd);
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: { controller: "mine", kind: ["Option"], playCostLte: 5 },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerOptionCostAtLeast",
            value: 2,
            raw: "when you use an Option card with a cost of 2 or more",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  zone: "digivolutionCards",
                  or: [
                    { nameOrTrait: [{ tokens: ["Taomon"], match: "nameExact" }] },
                    { colors: ["Blue", "Yellow"], levelComparison: { op: "lte", value: 4 } },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
