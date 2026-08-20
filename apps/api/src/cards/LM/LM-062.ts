import { EffectTiming, isDigimon, CardColor } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";

const cardId = "LM-062";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/color-waiver-no-breathing`,
          description:
            "You may also use this card if you don't have [Breathing Training] in the battle area, " +
            "ignoring its color requirements.",
          when: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return !Array.from(owner.battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              return ctx.game.definitionOf(p.topCard).nameEn === "Breathing Training";
            });
          },
          resolve: async () => {},
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-reveal`,
          description:
            "[Main] Reveal the top 2 cards of your deck. Add 1 yellow or purple card among " +
            "them to the hand. Return the rest to the bottom of the deck. Then, place this " +
            "card in the battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 2);
            if (deckCards.length > 0) {
              const candidates = deckCards.filter((c) => {
                const def = ctx.game.definitionOf(c);
                return def.colors.includes(CardColor.Yellow) || def.colors.includes(CardColor.Purple);
              });
              let added: string[] = [];
              if (candidates.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                added = chosen;
              }
              const rest = deckCards.filter((c) => !added.includes(c.instanceId));
              if (rest.length > 0) {
                await ctx.fx.returnToDeck(rest.map((c) => c.instanceId), { toTop: false });
              }
            }
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
        activated({
          source,
          effectKey: `${cardId}/delay-digivolve`,
          description:
            "＜Delay＞ [Main] You may digivolve 1 of your Digimon into a yellow or purple " +
            "Digimon from hand with the cost reduced by 2.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const targets = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            const perm = ctx.game.permanentById(chosen[0]!);
            if (perm === undefined || perm.topCard === undefined) return;
            const handTargets = Array.from(owner.hand)
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && (def.colors.includes(CardColor.Yellow) || def.colors.includes(CardColor.Purple));
              })
              .map((c) => c.instanceId);
            if (handTargets.length === 0) return;
            const intoCard = await ctx.ask.selectCards(ctx, {
              candidates: handTargets,
              min: 0,
              max: 1,
            });
              if (intoCard.length > 0) {
                await ctx.fx.digivolveFromInstance(chosen[0]!, intoCard[0]!, {
                  payCost: true,
                  costDelta: -2,
                  ignoreRequirements: true,
                });
              }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] Reveal the top 2 cards of your deck. Add 1 yellow or purple card among " +
            "them to the hand. Return the rest to the bottom of the deck. Then, place this card " +
            "in the battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 2);
            if (deckCards.length > 0) {
              const candidates = deckCards.filter((c) => {
                const def = ctx.game.definitionOf(c);
                return def.colors.includes(CardColor.Yellow) || def.colors.includes(CardColor.Purple);
              });
              let added: string[] = [];
              if (candidates.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                added = chosen;
              }
              const rest = deckCards.filter((c) => !added.includes(c.instanceId));
              if (rest.length > 0) {
                await ctx.fx.returnToDeck(rest.map((c) => c.instanceId), { toTop: false });
              }
            }
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

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHaveNone",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Breathing Training"], match: "name" }],
            },
            raw: "you don't have [Breathing Training] in the battle area",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 2,
          add: [{ filter: { controllerDefault: "mine", colors: ["Purple", "Yellow"] }, count: 1, to: "hand" }],
          rest: "deckBottom",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Purple", "Yellow"] },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 2,
          add: [{ filter: { controllerDefault: "mine", colors: ["Purple", "Yellow"] }, count: 1, to: "hand" }],
          rest: "deckBottom",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
