import { EffectDuration, EffectTiming, isDigimon, type CompiledCard } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST13-06";

// KB Q776: floor(stack / 4) scales both deletions and security trash.
// KB Q777: Blitz and the scaled body are one effect, so the attack opportunity opens only
// after deletion/security trash finish. The engine naturally opens Blitz after the timing window.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
          raw: "when a card is removed from a player's security stack",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 6 },
        { color: "Black", level: 6 },
      ],
    },
  ],
};

const baseModule = irCardModule(cardId, compiled);
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.WhenDigivolving) return effects;

    effects.push(
      whenDigivolving({
        source,
        effectKey: `${cardId}/dna-blitz-scaled-removal`,
        description:
          "[When DNA Digivolving] Blitz; per 4 sources, delete a cost-20-or-less Digimon and trash top security.",
        canActivate: (ctx) => ctx.trigger.isDnaDigivolve === true,
        resolve: async (ctx) => {
          if (ctx.trigger.isDnaDigivolve !== true) return;
          const self = source.permanent();
          if (self === undefined) return;

          ctx.fx.grantKeyword(self.permanentId, "Blitz", EffectDuration.UntilEachTurnEnd);
          const amount = Math.floor(self.stack.length / 4);
          if (amount === 0) return;

          const opponent = ctx.game.opponentOf(source.ownerSeat);
          const candidates = Array.from(ctx.game.player(opponent).battleArea)
            .filter((permanent) => {
              const definition = ctx.game.definitionOf(permanent.topCard);
              return isDigimon(definition) && definition.playCost <= 20;
            })
            .map((permanent) => permanent.permanentId);
          const deleteCount = Math.min(amount, candidates.length);
          if (deleteCount > 0) {
            const chosen =
              candidates.length === deleteCount
                ? candidates
                : await ctx.ask.chooseTargets(ctx, {
                    candidates,
                    min: deleteCount,
                    max: deleteCount,
                  });
            if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
          }

          await ctx.fx.trashFromSecurity(opponent, amount, { fromTop: true });
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
