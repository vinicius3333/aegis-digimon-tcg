import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST22-01";
const OPTION_TRAITS = ["Onmyōjutsu", "Plug-In"];
const TARGET_NAMES = ["Kyubimon", "Taomon", "Sakuyamon"];

function optionUsedDefinition(ctx: EffectContext, instanceId: string): CardDefinition | undefined {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  const cards: CardInstance[] = [...owner.trash, ...owner.hand];
  const card = cards.find((candidate) => candidate.instanceId === instanceId);
  return card === undefined ? undefined : ctx.game.definitionOf(card);
}

function isEligibleOption(definition: CardDefinition | undefined): boolean {
  return (
    definition?.kinds.includes(CardKind.Option) === true &&
    OPTION_TRAITS.some((trait) => definition.types?.includes(trait))
  );
}

function isEligibleDigivolution(definition: CardDefinition): boolean {
  return (
    definition.kinds.includes(CardKind.Digimon) &&
    TARGET_NAMES.some((name) => definition.nameEn.includes(name))
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-option-trait-digivolve`,
        description:
          "[Your Turn] [Once Per Turn] When you use an [Onmyōjutsu] or [Plug-In] Option, " +
          "this Digimon may digivolve into [Kyubimon], [Taomon], or [Sakuyamon] in hand " +
          "with the digivolution cost reduced by 3.",
        isInherited: true,
        maxPerTurn: 1,
        when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;

          ctx.fx.subscribeSubTrigger({
            event: "whenOptionUsed",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTiming: true,
            description: `${cardId}: digivolve after using an Onmyōjutsu or Plug-In Option`,
            matches: (subCtx) => {
              if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
              const usedId = subCtx.trigger?.subjectPermanentId;
              return usedId !== undefined && isEligibleOption(optionUsedDefinition(subCtx, usedId));
            },
            run: async (subCtx) => {
              const currentHost = source.permanent();
              if (currentHost === undefined) return;
              const hand = subCtx.game.player(source.ownerSeat).hand;
              const candidates = hand
                .filter((card) => isEligibleDigivolution(subCtx.game.definitionOf(card)))
                .map((card) => card.instanceId);
              if (candidates.length === 0) return;

              if (
                !(await subCtx.ask.optional(
                  subCtx,
                  "Digivolve this Digimon into a Kyubimon, Taomon, or Sakuyamon from your hand with the cost reduced by 3?",
                ))
              ) {
                return;
              }

              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;

              await subCtx.fx.digivolveFromInstance(currentHost.permanentId, chosen[0]!, {
                payCost: true,
                costDelta: -3,
                ignoreRequirements: true,
              });
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
