import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-085";
async function playLevelThree(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = [] as { instanceId: string }[];
  for (const host of ctx.game.player(source.ownerSeat).battleArea) {
    if (host.topCard === undefined) continue;
    const hostDefinition = ctx.game.definitionOf(host.topCard);
    if (
      !isDigimon(hostDefinition) ||
      !hostDefinition.colors.some((color) => color === CardColor.Blue || color === CardColor.Purple)
    )
      continue;
    candidates.push(
      ...host.stack.filter((card) => {
        const definition = ctx.game.definitionOf(card);
        return (
          isDigimon(definition) &&
          definition.level === 3 &&
          definition.colors.some((color) => color === CardColor.Blue || color === CardColor.Purple)
        );
      }),
    );
  }
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map(({ instanceId }) => instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 1) await ctx.fx.playInstances(chosen, { payCost: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-level-three`,
          description: "[On Play] Play a blue/purple level 3 from an own blue/purple Digimon's sources.",
          resolve: async (ctx) => playLevelThree(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-level-three`,
          description: "[When Digivolving] Play a blue/purple level 3 from an own blue/purple Digimon's sources.",
          resolve: async (ctx) => playLevelThree(ctx, source),
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory-on-effect-play`,
        description: "Inherited [All Turns][Once Per Turn] When you play a Digimon by an effect, gain 1 memory.",
        isInherited: true,
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/memory`,
            description: "BT11-085 inherited memory",
            matches: (subCtx) => {
              if (subCtx.trigger.playedByEffect !== true) return false;
              const id = subCtx.trigger.subjectPermanentId;
              return id !== undefined && subCtx.game.permanentById(id)?.controllerSeat === source.ownerSeat;
            },
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
