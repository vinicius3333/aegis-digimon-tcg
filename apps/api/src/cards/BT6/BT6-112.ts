import { EffectTiming, type CardDefinition } from "@aegis/shared";
import type { CardKind, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT6-112";
const THREE_MUSKETEERS = "Three Musketeers";

function threeMusketeersCount(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Digimon" as CardKind)) return false;
  const types = def.types as string[] | undefined;
  return types?.includes(THREE_MUSKETEERS) ?? false;
}

function cost7Option(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Option" as CardKind)) return false;
  return def.playCost === 7;
}

function trashCount(ctx: EffectContext, owner: Seat): number {
  const player = ctx.game.player(owner);
  let count = 0;
  for (const card of player.trash) {
    const def = ctx.game.definitionOf(card);
    if (threeMusketeersCount(def)) count++;
    else if (cost7Option(def)) count++;
  }
  return count;
}

function isCost7Option(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Option" as CardKind)) return false;
  return def.playCost === 7;
}

function meetsOptionColorRequirement(
  ctx: EffectContext,
  instanceId: string,
  def: CardDefinition,
): boolean {
  if (ctx.game.colorRequirementWaived?.(instanceId) === true) return true;
  const required = def.optionColorRequirements ?? def.colors;
  const available = new Set<string>();
  const owner = ctx.game.player(ctx.source.ownerSeat);
  for (const permanent of [...owner.battleArea, owner.breeding]) {
    if (permanent?.topCard === undefined) continue;
    const colors = ctx.game.effectiveColors?.(permanent) ?? ctx.game.definitionOf(permanent.topCard).colors;
    for (const color of colors) available.add(color);
  }
  return required.every((color) => available.has(color));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // ----- STATIC: Play-cost reduction (documented behavior) ------------------
    if (timing === EffectTiming.None) {
      out.push(
        // HAND-resident play-cost static: digivolveCostStatic carries NO on-field base guard
        // (staticModifier requires the source on the battle area, which makes a from-HAND
        // self-cost reducer ineffective). Scope is kept by the `when` hand check + the cost predicate.
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description:
            "Reduce play cost by number of Three Musketeers Digimon + cost-7 Options in your trash (documented behavior)",
          when: (ctx) => {
            const hand = ctx.game.player(ctx.source.ownerSeat).hand;
            return hand.some((c) => c.instanceId === ctx.source.instanceId);
          },
          resolve: async (ctx) => {
            const n = trashCount(ctx, ctx.source.ownerSeat);
            if (n === 0) return;
            // CardSourceCondition: cardSource == card (line 78)
            // RootCondition: root == Hand (line 83)
            ctx.fx.changePlayCost(
              (facts) =>
                facts.controllerSeat === ctx.source.ownerSeat && facts.def.cardId === cardId,
              -n,
            );
          },
        }),
      );
    }

    // ----- [On Play] Return + PlayOption (documented behavior) ----------------
    if (timing === EffectTiming.OnPlay) {
      out.push({
        effectKey: `${cardId}/on-play-return-play-option`,
        description:
          "[On Play] Return 1 Option card with a memory cost of 7 from your trash to your hand. Then, use 1 Option card with a memory cost of 7 in your hand without paying its memory cost (documented behavior)",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => ctx.source.isOnBattleArea(),
        canActivate: () => true,
        resolve: async (ctx) => {
          const owner = ctx.game.player(ctx.source.ownerSeat);

          const trashOptions = owner.trash.filter((c) =>
            isCost7Option(ctx.game.definitionOf(c)),
          );
          if (trashOptions.length > 0) {
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: trashOptions.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.returnToHand(chosen);
            }
          }

          const handOptions = owner.hand.filter((c) =>
            isCost7Option(ctx.game.definitionOf(c)) &&
            meetsOptionColorRequirement(ctx, c.instanceId, ctx.game.definitionOf(c)),
          );
          if (handOptions.length > 0) {
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: handOptions.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.useOptionFromHand(ctx, chosen[0]!, 0);
            }
          }
        },
      });
    }

    return out;
  },
};

registerCard(module);
export default module;
