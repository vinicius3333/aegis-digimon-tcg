import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

const cardId = "BT18-010";

const hasHybridOrTenWarriors = (def: CardDefinition): boolean =>
  cardHasTrait(def, "Hybrid") || cardHasTrait(def, "Ten Warriors");

const isRedTamerWithInherited = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes(CardKind.Tamer) &&
  (def.colors as string[]).includes("Red") &&
  typeof def.inheritedEffectText === "string" &&
  def.inheritedEffectText.trim().length > 0;

const isDigimonOrTamerDef = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes(CardKind.Digimon) ||
  (def.kinds as string[]).includes(CardKind.Tamer);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3, add 1 [Hybrid]/[Ten Warriors] + 1 red Tamer with inherited to hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-add`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the " +
            "[Hybrid]/[Ten Warriors] trait and 1 red Tamer card with an inherited effect " +
            "among them to your hand. Return the rest to the bottom of the deck.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return ctx.source.isOnBattleArea() && owner.deck.length >= 1;
          },
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
            if (revealed.length === 0) return;

            // Q2912: must add as many as possible — force min=1 when candidates exist.
            const hybridCandidates = revealed.filter((c) =>
              hasHybridOrTenWarriors(ctx.game.definitionOf(c)),
            );
            const hybridPicked =
              hybridCandidates.length > 0
                ? await ctx.ask.selectCards(ctx, {
                    candidates: hybridCandidates.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  })
                : [];

            // Red Tamer with inherited effect: exclude already-selected hybrid card.
            const tamerCandidates = revealed.filter(
              (c) =>
                !hybridPicked.includes(c.instanceId) &&
                isRedTamerWithInherited(ctx.game.definitionOf(c)),
            );
            const tamerPicked =
              tamerCandidates.length > 0
                ? await ctx.ask.selectCards(ctx, {
                    candidates: tamerCandidates.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  })
                : [];

            const toHand = [...hybridPicked, ...tamerPicked];
            const rest = revealed
              .map((c) => c.instanceId)
              .filter((id) => !toHand.includes(id));

            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
            if (toHand.length > 0) {
              await ctx.fx.returnToHand(toHand);
            }
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When any of your Digimon or Tamers digivolve into a Digimon
    // with the [Hybrid]/[Ten Warriors] trait, gain 1 memory.
    // Continuous static that re-installs the SubTrigger watcher each recompute pass.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digivolve-hybrid-gain-memory`,
          description:
            "[Your Turn][Once Per Turn] When any of your Digimon or Tamers digivolve into " +
            "a Digimon with the [Hybrid]/[Ten Warriors] trait, gain 1 memory.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: selfPermanent.permanentId,
              once: false,
              oncePerTiming: true,
              description:
                `${cardId} [Your Turn][Once Per Turn] digivolve into ` +
                "[Hybrid]/[Ten Warriors] → gain 1 memory",
              matches: (subCtx) => {
                if (subCtx.game.state.turnSeat !== source.ownerSeat) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (!subjectId) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (!subject) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                if (!subject.topCard) return false;
                const topDef = subCtx.game.definitionOf(subject.topCard);
                if (!hasHybridOrTenWarriors(topDef)) return false;
                // DigivolveFromCondition: a digivolution card (the prior top) must be Digimon/Tamer.
                return subject.stack.some((c) =>
                  isDigimonOrTamerDef(subCtx.game.definitionOf(c)),
                );
              },
              run: async (subCtx) => {
                subCtx.fx.gainMemory(1);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
