import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, colorWaiverStatic, security, securityStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT25-099 Gear Forest Village (Q6465-Q6470). */
const cardId = "BT25-099";

function eligibleTs(definition: CardDefinition, maximumLevel?: number): boolean {
  return (
    isDigimon(definition) &&
    (definition.types ?? []).includes("TS") &&
    definition.colors.some((color) => color === "Green" || color === "Black") &&
    (maximumLevel === undefined || (definition.level !== undefined && definition.level <= maximumLevel))
  );
}

function handCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  return ctx.game.player(source.ownerSeat).hand.filter((card) => eligibleTs(ctx.game.definitionOf(card)));
}

function securityCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...owner.hand, ...owner.trash].filter((card) => eligibleTs(ctx.game.definitionOf(card), 4));
}

function fieldTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (permanent) =>
        !permanent.inBreeding &&
        permanent.topCard !== undefined &&
        eligibleTs(ctx.game.definitionOf(permanent.topCard)),
    );
}

function hasBacchusmonOrCeresmon(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return (
      isDigimon(definition) && (definition.nameEn.includes("Bacchusmon") || definition.nameEn.includes("Ceresmon"))
    );
  });
}

async function chooseAndPlay(
  ctx: EffectContext,
  candidates: CardInstance[],
  options: { payCost: boolean; costDelta?: number },
): Promise<void> {
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length > 0) await ctx.fx.playInstances(chosen, options);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/no-face-up-security-waiver`,
          optional: false,
          description: "While you have no face-up security cards, ignore this card's color requirements.",
          when: (ctx) => !ctx.game.player(source.ownerSeat).security.some((card) => card.faceUp === true),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd),
        }),
        securityStatic({
          source,
          effectKey: `${cardId}/security-your-turn-ts-keywords`,
          optional: false,
          description: "[Security][Your Turn] Your green or black TS Digimon gain Alliance and conditional Piercing.",
          when: (ctx) => ctx.game.state.turnSeat === source.ownerSeat,
          resolve: async (ctx) => {
            const grantsPiercing = hasBacchusmonOrCeresmon(ctx, source);
            for (const permanent of fieldTargets(ctx, source)) {
              ctx.fx.grantKeyword(permanent.permanentId, "Alliance", EffectDuration.UntilEachTurnEnd);
              if (grantsPiercing) {
                ctx.fx.grantKeyword(permanent.permanentId, "Piercing", EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          optional: false,
          description:
            "[Main] Exchange the bottom security card for this face-up card, then play a reduced TS Digimon.",
          resolve: async (ctx) => {
            if (ctx.game.player(source.ownerSeat).security.length > 0) {
              await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: false });
            }
            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: false, faceUp: true });
            await chooseAndPlay(ctx, handCandidates(ctx, source), { payCost: true, costDelta: 3 });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-level-four`,
          description: "[Security] Play 1 level 4 or lower green or black TS Digimon from hand or trash for free.",
          resolve: async (ctx) => chooseAndPlay(ctx, securityCandidates(ctx, source), { payCost: false }),
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
