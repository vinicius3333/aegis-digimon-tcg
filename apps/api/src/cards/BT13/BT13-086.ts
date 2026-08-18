import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { beforePayCost, onPlay, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-086";

const isAkihiroKurata = (def: CardDefinition): boolean =>
  def.nameEn === "Akihiro Kurata" || def.nameEn === "AkihiroKurata";

const isProtoGizmon = (def: CardDefinition): boolean =>
  def.nameEn === "ProtoGizmon";

const isLv4Digimon = (def: CardDefinition): boolean => {
  if (!isDigimon(def)) return false;
  return def.level === 4;
};

/** Owner's battle-area level-4 Digimon permanents (eligible delete targets). */
const lv4DigimonPermanents = (game: GameAccess, source: CardSource): Permanent[] => {
  const owner = game.player(source.ownerSeat);
  const result: Permanent[] = [];
  for (const p of owner.battleArea as Iterable<Permanent>) {
    if (p.topCard === undefined) continue;
    if (isLv4Digimon(game.definitionOf(p.topCard))) result.push(p);
  }
  return result;
};

/** Owner's trash instances matching a predicate. */
const trashInstanceIds = (game: GameAccess, source: CardSource, pred: (def: CardDefinition) => boolean): string[] => {
  const owner = game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const c of owner.trash as Iterable<CardInstance>) {
    if (pred(game.definitionOf(c))) ids.push(c.instanceId);
  }
  return ids;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // When you would play this card, by deleting 1 of your level 4 Digimon, reduce the play cost
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-delete-lv4-minus-6`,
          description:
            "When you would play this card, by deleting 1 of your level 4 Digimon, reduce the " +
            "play cost by 6.",
          optional: true,
          when: (ctx) => {
            // Gate: card must be in hand (not yet played).
            if (ctx.source.permanent() !== undefined) return false;
            return true;
          },
          canActivate: (ctx) => lv4DigimonPermanents(ctx.game, source).length > 0,
          resolve: async (ctx) => {
            const targets = lv4DigimonPermanents(ctx.game, source);
            if (targets.length === 0) return;

            const wantToDelete = await ctx.ask.optional(
              ctx,
              "Delete 1 of your level 4 Digimon to reduce the play cost by 6?",
            );
            if (!wantToDelete) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const deleted = await ctx.fx.deletePermanent(chosen);
            if (deleted === 0) return;

            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 6;
          },
        }),
      ];
    }

    // [All Turns] <Blocker> (continuous static keyword grant, always on).
    // [All Turns] Can't digivolve (CanNotDigivolveStaticSelfEffect — must be on field).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-blocker`,
          description: "＜Blocker＞",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/static-cant-digivolve`,
          description: "[All Turns] This Digimon can't digivolve.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.restrict(self.permanentId, "digivolve", EffectDuration.Permanent);
          },
        }),
      ];
    }

    // [On Play] Play 1 [Akihiro Kurata] from your trash without paying the cost.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-play-akihiro-kurata`,
          description: "[On Play] Play 1 [Akihiro Kurata] from your trash without paying the cost.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return trashInstanceIds(ctx.game, source, isAkihiroKurata).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = trashInstanceIds(ctx.game, source, isAkihiroKurata);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    // [On Deletion] You may play 1 [ProtoGizmon] from your trash without paying the cost.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-protogizmon`,
          description:
            "[On Deletion] You may play 1 [ProtoGizmon] from your trash without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            trashInstanceIds(ctx.game, source, isProtoGizmon).length > 0,
          resolve: async (ctx) => {
            const candidates = trashInstanceIds(ctx.game, source, isProtoGizmon);
            if (candidates.length === 0) return;
            const wantToPlay = await ctx.ask.optional(
              ctx,
              "Play 1 [ProtoGizmon] from your trash without paying the cost?",
            );
            if (!wantToPlay) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
