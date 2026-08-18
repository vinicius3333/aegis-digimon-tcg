import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-214 — Betamon (X Antibody), P, Blue Lv.3 Digimon.
 *
 * source: documented behavior.
 *
 * Clauses:
 *   1. EffectTiming.None: Alternative digivolution condition + Decode keyword.
 *   2. OnPlay / WhenDigivolving (shared, optional):
 *      a. Tuck this Digimon under a different Digimon with [Seadramon] in text.
 *      b. Select a Seadramon-text Digimon to compare levels.
 *      c. Return opponent Digimon with level <= selected Seadramon's level to deck bottom.
 *   3. EffectTiming.WhenRemoveField (inherited): Prevent this Digimon from leaving
 *      by trashing 2 same-level digivolution cards.
 */
const cardId = "P-214";

/** Owner battle-area Digimon permanent ids with "Seadramon" in name (excluding self). */
function seadramonIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const self = source.permanent();
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    if (self !== undefined && p.permanentId === self.permanentId) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(top))) continue;
    if (ctx.game.definitionOf(top).nameEn.includes("Seadramon")) ids.push(p.permanentId);
  }
  return ids;
}

/** Owner battle-area Digimon ids with "Seadramon" in name (including self). */
function allSeadramonIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(top))) continue;
    if (ctx.game.definitionOf(top).nameEn.includes("Seadramon")) ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) EffectTiming.None: Alternative digivolution condition + Decode keyword.
    if (timing === EffectTiming.None) {
      return [
        // Alt digivolve: onto Betamon/ModokiBetamon for 0 cost (handled by card data).
        staticModifier({
          source,
          effectKey: `${cardId}/alt-digivolve-condition`,
          description:
            "Digivolve onto Betamon or ModokiBetamon for 0 cost, ignoring color requirements.",
          resolve: async (_ctx) => {
            // The digivolutionRequirement in card data handles the alt digivolve.
          },
        }),
        // Decode keyword
        staticModifier({
          source,
          effectKey: `${cardId}/decode-keyword`,
          description:
            "<Decode> (Return Betamon or ModokiBetamon from trash to digivolution stack.)",
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Decode", EffectDuration.Permanent);
          },
        }),
        // ESS: Prevent leaving by trashing 2 same-level digivolution cards.
        staticModifier({
          source,
          effectKey: `${cardId}/ess-prevent-leave`,
          description:
            "[All Turns] When this Digimon with [Seadramon] in its text would leave the " +
            "battle area by your opponent's effects, by trashing 2 same-level cards in its " +
            "digivolution cards, it doesn't leave.",
          isInherited: true,
          resolve: async (ctx) => {
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              description: "Prevent leaving by trashing 2 same-level digivolution cards",
              mode: "prevent",
              sourcePermanentId: source.permanent()?.permanentId,
              causeAllows: (cause, resolvingSeat) => {
                if (cause !== "byEffect") return false;
                return resolvingSeat !== undefined && resolvingSeat !== source.ownerSeat;
              },
              protects: (_checkCtx, leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;
                return leavingPermanentId === self.permanentId;
              },
              preventCheck: async (checkCtx, _leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;

                const stack = self.stack;
                const hasPair = stack.some((c1, i) =>
                  stack.some((c2, j) =>
                    i !== j &&
                    ctx.game.definitionOf(c1).level !== undefined &&
                    ctx.game.definitionOf(c1).level === ctx.game.definitionOf(c2).level,
                  ),
                );
                if (!hasPair) return false;

                const wantToUse = await checkCtx.ask.optional(
                  checkCtx,
                  "Trash 2 same-level digivolution cards to prevent this Digimon from leaving?",
                );
                if (!wantToUse) return false;

                const allIds = stack.map((c) => c.instanceId);
                const chosen = await checkCtx.ask.selectCards(checkCtx, {
                  candidates: allIds,
                  min: 2,
                  max: 2,
                });
                if (chosen.length !== 2) return false;

                const lvlA = ctx.game.definitionOf(
                  stack.find((c) => c.instanceId === chosen[0])!,
                ).level;
                const lvlB = ctx.game.definitionOf(
                  stack.find((c) => c.instanceId === chosen[1])!,
                ).level;
                if (lvlA === undefined || lvlA !== lvlB) return false;

                await checkCtx.fx.trashDigivolutionCards(self.permanentId, chosen);
                return chosen.length === 2;
              },
            });
          },
        }),
      ];
    }

    // (2) OnPlay: Tuck this card under Seadramon-text Digimon, then return opp Digimon
    //     with level <= chosen Seadramon's level.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-tuck-and-return`,
          description:
            "[On Play] By placing this Digimon as the bottom digivolution card of any of your " +
            "other Digimon with [Seadramon] in its text, return 1 of your opponent's Digimon " +
            "with as high or lower a level as 1 of your Digimon with [Seadramon] in its text " +
            "to the bottom of the deck.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => seadramonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            await tuckAndReturn(ctx, source);
          },
        }),
      ];
    }

    // (3) WhenDigivolving: Same tuck-and-return as OnPlay.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-tuck-and-return`,
          description:
            "[When Digivolving] By placing this Digimon as the bottom digivolution card of " +
            "any of your other Digimon with [Seadramon] in its text, return 1 of your " +
            "opponent's Digimon with as high or lower a level as 1 of your Digimon with " +
            "[Seadramon] in its text to the bottom of the deck.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => seadramonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            await tuckAndReturn(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Shared OnPlay/WhenDigivolving tuck-and-return sequence.
 *
 * 1. Select a Seadramon-text Digimon (not self) to tuck this card under.
 * 2. Select a Seadramon-text Digimon to get its level.
 * 3. Select opponent Digimon with level <= that level, return to deck bottom.
 */
async function tuckAndReturn(ctx: EffectContext, source: CardSource): Promise<void> {
  // Step 1: Select tuck target (Seadramon-text, not self)
  const tuckTargets = seadramonIds(ctx, source);
  if (tuckTargets.length === 0) return;

  const chosenTarget = await ctx.ask.chooseTargets(ctx, {
    candidates: tuckTargets,
    min: 1,
    max: 1,
  });
  if (chosenTarget.length === 0) return;

  const destId = chosenTarget[0]!;
  const self = source.permanent();
  if (self === undefined) return;

  const moved = ctx.fx.relocatePermanent(destId, self.permanentId, { belowTop: false });
  if (!moved) return;

  // Step 2: Select a Seadramon to get its level for comparison
  const seadramonAll = allSeadramonIds(ctx, source);
  if (seadramonAll.length === 0) return;

  const chosenSeadramon = await ctx.ask.chooseTargets(ctx, {
    candidates: seadramonAll,
    min: 1,
    max: 1,
  });
  if (chosenSeadramon.length === 0) return;

  const seadramonP = ctx.game.permanentById(chosenSeadramon[0]!);
  if (seadramonP === undefined || seadramonP.topCard === undefined) return;
  const level = ctx.game.definitionOf(seadramonP.topCard).level;
  if (level === undefined || level <= 0) return;

  // Step 3: Select opponent Digimon with level <= selected level
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const eligibleOppIds = opponent.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
      const defLevel = ctx.game.definitionOf(p.topCard).level;
      return defLevel !== undefined && defLevel <= level;
    })
    .map((p) => p.permanentId);

  if (eligibleOppIds.length === 0) return;

  const chosenOpp = await ctx.ask.chooseTargets(ctx, {
    candidates: eligibleOppIds,
    min: 1,
    max: 1,
  });
  if (chosenOpp.length === 0) return;

  const oppP = ctx.game.permanentById(chosenOpp[0]!);
  if (oppP === undefined || oppP.topCard === undefined) return;

  await ctx.fx.returnToDeck([oppP.topCard.instanceId], { toTop: false });
}

registerCard(module);
export default module;
