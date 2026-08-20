import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { permanentHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-093";

function hasTs(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some(
    (permanent) => !permanent.inBreeding && permanentHasTrait(ctx.game, permanent, "TS"),
  );
}

function ownHosts(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...Array.from(owner.battleArea), ...(owner.breeding === undefined ? [] : [owner.breeding])]
    .filter(
      (permanent) =>
        permanent.topCard !== undefined && ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon),
    )
    .map((permanent) => permanent.permanentId);
}

function linkedHost(ctx: EffectContext, source: CardSource) {
  for (const player of [ctx.game.player(source.ownerSeat), ctx.game.player(ctx.game.opponentOf(source.ownerSeat))]) {
    for (const permanent of player.battleArea) {
      if (permanent.linked.some((card) => card.instanceId === source.instanceId)) return permanent;
    }
  }
  return undefined;
}

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimon = Array.from(opponent.battleArea).filter(
    (permanent) =>
      !permanent.inBreeding &&
      permanent.topCard !== undefined &&
      ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon),
  );
  let deleted = 0;
  if (digimon.length > 0) {
    const lowest = Math.min(...digimon.map((permanent) => permanent.currentDP));
    deleted = await ctx.fx.deletePermanent(
      digimon.filter((permanent) => permanent.currentDP === lowest).map((permanent) => permanent.permanentId),
      "byEffect",
    );
  }
  if (deleted === 0) {
    const options = Array.from(opponent.battleArea).filter((permanent) => {
      if (!permanent.placedByEffect || permanent.topCard === undefined) return false;
      const kinds = ctx.game.definitionOf(permanent.topCard).kinds;
      return kinds.includes(CardKind.Option) && !kinds.includes(CardKind.Digimon) && !kinds.includes(CardKind.Tamer);
    });
    if (options.length > 0) {
      const candidates = options.map((permanent) => permanent.permanentId);
      const chosen =
        candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
      const chosenPermanent = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
      if (chosenPermanent?.topCard !== undefined)
        await ctx.fx.trash([chosenPermanent.topCard.instanceId], { byEffectSeat: source.ownerSeat });
    }
  }
  const hosts = ownHosts(ctx, source);
  if (hosts.length === 0 || !(await ctx.ask.optional(ctx, "Link Ignition Flare without paying the cost?"))) return;
  const chosen = hosts.length === 1 ? hosts : await ctx.ask.chooseTargets(ctx, { candidates: hosts, min: 1, max: 1 });
  if (chosen[0] !== undefined) await ctx.fx.link(chosen[0], [source.instanceId]);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "＜Use Req. ([TS] trait)＞",
          when: (ctx) => hasTs(ctx, source),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd),
        }),
      ];
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main]",
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security-main`,
          description: "[Security] Activate Main.",
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        {
          effectKey: `${cardId}/linked-attack-delete`,
          description: "[When Attacking] [Once Per Turn] Delete <= host DP.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: true,
          maxPerTurn: 1,
          canTrigger: (ctx) => linkedHost(ctx, source)?.permanentId === ctx.trigger.attackerPermanentId,
          canActivate: () => true,
          resolve: async (ctx) => {
            const host = linkedHost(ctx, source);
            if (host === undefined) return;
            const candidates = Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea)
              .filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon) &&
                  permanent.currentDP <= host.currentDP,
              )
              .map((permanent) => permanent.permanentId);
            if (candidates.length === 0) return;
            const chosen =
              candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen[0] === undefined) return;
            ctx.fx.enterEffectResolution?.(source.ownerSeat, [CardKind.Digimon]);
            try {
              await ctx.fx.deletePermanent([chosen[0]], "byEffect");
            } finally {
              ctx.fx.leaveEffectResolution?.();
            }
          },
        },
      ];
    return [];
  },
};

registerCard(module);
export default module;
