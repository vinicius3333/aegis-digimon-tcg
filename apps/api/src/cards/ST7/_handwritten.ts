import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, onPlay, security, staticModifier, whenAttacking } from "../../engine/effects/builders.js";

function opposing(ctx: EffectContext, source: CardSource, maxDp = Infinity) {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        permanent.currentDP <= maxDp,
    );
}

async function deleteOne(ctx: EffectContext, source: CardSource, maxDp: number): Promise<number> {
  const numericBonus = ctx.fx.deletionMaxDpBonus?.(source.ownerSeat, source.permanent()?.permanentId) ?? 0;
  const candidates = opposing(ctx, source, maxDp + numericBonus).map(({ permanentId }) => permanentId);
  if (!candidates.length) return 0;
  const [picked] =
    candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  return picked ? ctx.fx.deletePermanent([picked]) : 0;
}

function staticKeyword(source: CardSource, cardId: string, keyword: string, amount?: number): Effect {
  return staticModifier({
    source,
    effectKey: `${cardId}/${keyword}`,
    description: `<${keyword}${amount ? ` +${amount}` : ""}>`,
    resolve: async (ctx) => {
      const self = source.permanent();
      if (!self) return;
      if (keyword === "Piercing") ctx.fx.grantPierce(self.permanentId, EffectDuration.Permanent);
      else ctx.fx.grantKeyword(self.permanentId, keyword, EffectDuration.Permanent, amount);
    },
  });
}

function deletionWatcher(source: CardSource, cardId: string, run: (ctx: EffectContext) => Promise<void>): Effect {
  return staticModifier({
    source,
    effectKey: `${cardId}/opponent-deletion`,
    description: "[Your Turn][Once Per Turn] When an opposing Digimon is deleted.",
    isInherited: true,
    maxPerTurn: 1,
    when: () => source.isOwnersTurn(),
    resolve: async (ctx) => {
      const host = source.permanent();
      if (!host) return;
      ctx.fx.subscribeSubTrigger({
        event: "onDeletionOf",
        sourcePermanentId: host.permanentId,
        once: false,
        oncePerTurnKey: `${source.instanceId}/${cardId}`,
        description: `${cardId}: opposing deletion`,
        matches: (subCtx) => {
          const id = subCtx.trigger.deletedPermanentId;
          const deleted = id === undefined ? undefined : subCtx.game.permanentById(id);
          return (
            !subCtx.trigger.deletedPermanentIds?.includes(host.permanentId) &&
            deleted?.controllerSeat !== source.ownerSeat &&
            deleted?.topCard !== undefined &&
            isDigimon(subCtx.game.definitionOf(deleted.topCard))
          );
        },
        run,
      });
    },
  });
}

export function st7Module(cardId: string): EffectModule {
  return {
    cardId,
    effectsForTiming(timing, source) {
      switch (cardId) {
        case "ST7-02":
          return timing === EffectTiming.OnAllyAttack
            ? [
                whenAttacking({
                  source,
                  effectKey: `${cardId}/inherited-dp`,
                  description: "[When Attacking] When attacking a player, get +2000 DP for the turn.",
                  isInherited: true,
                  when: (ctx) => ctx.trigger.targetPermanentId === undefined,
                  resolve: async (ctx) => {
                    const host = source.permanent();
                    if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
                  },
                }),
              ]
            : [];
        case "ST7-03": {
          // This is an on-field [Your Turn] activated effect, not an Option card
          // effect. OnDeclaration is the engine window used by Digimon/Tamer [Main]
          // abilities and exposes the alternate digivolve action to the UI.
          if (timing === EffectTiming.OnDeclaration)
            return [
              activated({
                source,
                effectKey: `${cardId}/digivolve-gallantmon`,
                description: "Digivolve into Gallantmon for cost 4 while the opponent has a level 6 or higher Digimon.",
                optional: true,
                canActivate: (ctx) =>
                  source.isOwnersTurn() &&
                  opposing(ctx, source).some((p) => (ctx.game.definitionOf(p.topCard!).level ?? 0) >= 6),
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const cards = ctx.game
                    .player(source.ownerSeat)
                    .hand.filter((card) => ctx.game.definitionOf(card).nameEn === "Gallantmon");
                  if (!cards.length) return;
                  const [picked] = await ctx.ask.selectCards(ctx, {
                    candidates: cards.map(({ instanceId }) => instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (picked)
                    await ctx.fx.digivolveFromInstance(self.permanentId, picked, {
                      payCost: true,
                      costOverride: 4,
                      ignoreRequirements: true,
                    });
                },
              }),
            ];
          return timing === EffectTiming.None
            ? [
                deletionWatcher(source, cardId, async (ctx) => {
                  await ctx.fx.draw(source.ownerSeat, 1);
                }),
              ]
            : [];
        }
        case "ST7-04":
          return timing === EffectTiming.None
            ? [
                staticKeyword(source, cardId, "Blocker"),
                staticModifier({
                  source,
                  effectKey: `${cardId}/cannot-attack-player`,
                  description: "[Your Turn] This Digimon can't attack players.",
                  when: () => source.isOwnersTurn(),
                  resolve: async (ctx) => {
                    const self = source.permanent();
                    if (self) ctx.fx.restrict(self.permanentId, "attackPlayers", EffectDuration.Permanent);
                  },
                }),
              ]
            : [];
        case "ST7-05":
          return timing === EffectTiming.None
            ? [deletionWatcher(source, cardId, async (ctx) => ctx.fx.gainMemory(1))]
            : [];
        case "ST7-06":
        case "ST7-07": {
          const limit = cardId === "ST7-06" ? 4000 : 5000;
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/on-play`,
                description: `Delete an opposing ${limit} DP or lower Digimon.`,
                resolve: (ctx) => deleteOne(ctx, source, limit).then(() => undefined),
              }),
            ];
          if (cardId === "ST7-06" && timing === EffectTiming.SecuritySkill)
            return [
              security({
                source,
                effectKey: `${cardId}/security`,
                description: "Play this card after the battle.",
                resolve: async (ctx) => {
                  // A Security play is still performed by this card owner's effect.
                  // Player-level locks such as BT8-097 Crimson Blaze therefore stop it
                  // before the card leaves security (BT8-097 Q1774/Q4661).
                  if (ctx.fx.isPlayProhibited?.(source.ownerSeat, source.cardId, "play") === true) {
                    return;
                  }
                  await ctx.fx.playInstances([source.instanceId], { payCost: false });
                },
              }),
            ];
          return [];
        }
        case "ST7-08":
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/delete`,
                description: "Delete an opposing 3000 DP or lower Digimon.",
                resolve: (ctx) => deleteOne(ctx, source, 3000).then(() => undefined),
              }),
            ];
          return timing === EffectTiming.None
            ? [
                deletionWatcher(source, cardId, async (ctx) => {
                  const host = source.permanent();
                  if (host)
                    ctx.fx.grantKeyword(host.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1, {
                      continuous: false,
                    });
                }),
              ]
            : [];
        case "ST7-09":
          if (timing === EffectTiming.None) return [staticKeyword(source, cardId, "SecurityAttack", 1)];
          return timing === EffectTiming.OnAllyAttack
            ? [
                whenAttacking({
                  source,
                  effectKey: `${cardId}/attack`,
                  description: "Delete 4000 DP or lower; if none was deleted, get +3000 DP.",
                  resolve: async (ctx) => {
                    const self = source.permanent();
                    const candidates = opposing(ctx, source, 4000).map(({ permanentId }) => permanentId);
                    if (candidates.length === 0) {
                      if (self) ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
                      return;
                    }
                    const [picked] =
                      candidates.length === 1
                        ? candidates
                        : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
                    // Q690/Q691: a valid target is mandatory. Choosing a protected target
                    // still satisfies this branch, even when the deletion itself is prevented.
                    if (picked !== undefined) await ctx.fx.deletePermanent([picked]);
                  },
                }),
              ]
            : [];
        case "ST7-10":
          return timing === EffectTiming.None
            ? [staticKeyword(source, cardId, "SecurityAttack", 1), staticKeyword(source, cardId, "Piercing")]
            : [];
        case "ST7-12": {
          const resolve = async (ctx: EffectContext) => {
            const candidates = opposing(ctx, source).filter((permanent) => permanent.currentDP <= 8000);
            const byId = new Map(candidates.map((p) => [p.permanentId, p]));
            const selected = await ctx.ask.chooseTargets(ctx, {
              candidates: [...byId.keys()],
              min: candidates.length > 0 ? 1 : 0,
              max: candidates.length,
            });
            const total = selected.reduce((sum, id) => sum + (byId.get(id)?.currentDP ?? 0), 0);
            // Never silently reinterpret an over-cap response as a different subset.
            if (selected.length === 0 || total > 8000) return;
            await ctx.fx.deletePermanent(selected);
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Delete opposing Digimon totaling 8000 DP or less.",
                resolve,
              }),
            ];
          if (timing === EffectTiming.SecuritySkill)
            return [
              security({
                source,
                effectKey: `${cardId}/security`,
                description: "Activate this card's Main effect.",
                resolve,
              }),
            ];
          return [];
        }
      }
      return [];
    },
  };
}
