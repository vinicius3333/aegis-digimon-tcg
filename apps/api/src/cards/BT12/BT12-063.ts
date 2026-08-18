import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-063";

const TAMER_NAMES = ["Taiki Kudo", "Yuu Amano", "Tagiru Akashi"];

function isTamerTarget(def: CardDefinition): boolean {
  return TAMER_NAMES.some((n) => def.nameEn.includes(n));
}

function hasSaveText(def: CardDefinition): boolean {
  const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
  return hay.includes("＜Save＞") || hay.toLowerCase().includes("<save");
}

function ownerTamerIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isTamer(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

async function resolveRevealPlay(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length === 0) return;

  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  if (revealed.length === 0) return;

  // May play 1 [Taiki Kudo], [Yuu Amano], or [Tagiru Akashi] without paying its cost.
  const candidates = revealed.filter((c) => isTamerTarget(ctx.game.definitionOf(c))).map((c) => c.instanceId);

  const taken = new Set<string>();
  if (candidates.length > 0) {
    const picked = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
    for (const id of picked) taken.add(id);
    if (picked.length > 0) {
      await ctx.fx.playInstances(picked, { payCost: false });
    }
  }

  // Place remaining cards at bottom of deck.
  const rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3. May play 1 named Tamer without cost. Rest to deck bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. You may play 1 [Taiki Kudo], " +
            "[Yuu Amano], or [Tagiru Akashi] card among them without paying its cost. " +
            "Place the remaining cards at the bottom of your deck.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea() && ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => resolveRevealPlay(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same reveal-and-play effect.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-reveal`,
          description:
            "[When Digivolving] Reveal the top 3 cards of your deck. You may play 1 " +
            "[Taiki Kudo], [Yuu Amano], or [Tagiru Akashi] card among them without paying " +
            "its cost. Place the remaining cards at the bottom of your deck.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea() && ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => resolveRevealPlay(ctx, source),
        }),
      ];
    }

    // [On Deletion] ＜Save＞ — place this card under 1 of your Tamers.
    // Then place 1 Digimon with ＜Save＞ in its text from your trash under 1 of your Tamers.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-save`,
          description:
            "[On Deletion] ＜Save＞ — place this card under 1 of your Tamers. Then, place " +
            "1 Digimon card with ＜Save＞ in its text from your trash under 1 of your Tamers.",
          optional: false,
          canActivate: (ctx) => ownerTamerIds(ctx, source).length > 0,
          resolve: async (ctx) => {
            const tamerIds = ownerTamerIds(ctx, source);
            if (tamerIds.length === 0) return;

            // Step 1: ＜Save＞ — place this card under 1 of your Tamers (SaveProcess).
            const tamer1 = await ctx.ask.chooseTargets(ctx, {
              candidates: tamerIds,
              min: 1,
              max: 1,
            });
            const tamer1Id = tamer1[0];
            if (tamer1Id !== undefined) {
              await ctx.fx.placeUnder(tamer1Id, [ctx.source.instanceId]);
            }

            // Step 2: place 1 Digimon with ＜Save＞ in its text from trash under 1 of your Tamers.
            const trashCandidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && hasSaveText(def);
              })
              .map((c) => c.instanceId);
            if (trashCandidates.length === 0) return;

            const picked = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates,
              min: 1,
              max: 1,
            });
            if (picked.length === 0) return;

            const tamersNow = ownerTamerIds(ctx, source);
            if (tamersNow.length === 0) return;
            const tamer2 = await ctx.ask.chooseTargets(ctx, {
              candidates: tamersNow,
              min: 1,
              max: 1,
            });
            const tamer2Id = tamer2[0];
            if (tamer2Id !== undefined) {
              await ctx.fx.placeUnder(tamer2Id, picked);
            }
          },
        }),
      ];
    }

    // [Opponent's Turn][Inherited] ＜Blocker＞ while this Digimon has ＜Save＞ in its text.
    //     + top card HasSaveText.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker-save`,
          description: "[Opponent's Turn][Inherited] ＜Blocker＞ while this Digimon has ＜Save＞ in its text.",
          isInherited: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (ctx.source.isOwnersTurn()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return hasSaveText(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
