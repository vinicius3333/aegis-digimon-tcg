import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-099 — Training Manual (BT26, Green Option).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-099
// (`node tools/kb/query.mjs card BT26-099` returned no knowledge-base entries). implemented
// from the printed card text only, mirroring the structurally identical hand-written
// EX9-069 ([Your Turn] whenCardPlacedInDigivolution SubTrigger idiom) and BT15-083
// (reveal-3/add-1-to-hand/return-rest-to-bottom idiom).
//
// ＜Use Req. ([DM] trait)＞
// [Main] Reveal the top 3 cards of your deck. Add 1 [DM] card among them to the hand.
//   Return the rest to the bottom of the deck. Then, place this card in the battle area.
// [All Turns] When face-down cards are placed in any of your Digimon's digivolution
//   cards, ＜Delay＞ (comprehensive rules §16-17: while this card is in the battle area,
//   you may trash it — an optional activation — to activate the effect below; you can't
//   activate it the turn this card enters play):
//   ・Any of those Digimon may digivolve into a level 6 or lower [DM] trait Digimon card
//     in the hand without paying the cost.
// [Security] Activate this card's [Main] effects.
//
// ＜Use Req.＞ is NOT wired in the engine yet (documented gap; see BT25-098's identical
// note) — there is no primitive that expresses "waive color requirements ONLY while a
// [DM] trait card is on the field" (`ctx.fx.waiveColorRequirement` waives unconditionally,
// which would be a behavioral bug here, not a faithful port). Left undeclared; flag if the
// engine gains conditional Use Req. support.
//
// The [All Turns]/＜Delay＞ shape here matches the same family as BT19-099/BT20-100
// (compiled IR: AllTurns+Delay routes to a continuous EffectTiming.None SubTrigger, not
// the trash-cost OnDeclaration ability those same files reserve for a [Main]＜Delay＞
// clause — see interpreter.ts CAP-E14). Those two IR precedents omit the trash-as-cost
// step entirely in their SubTrigger body, but comprehensive rules §16-17-1 is explicit
// that ＜Delay＞'s activation cost IS trashing the card sitting in the battle area,
// §16-17-2 that activating it is optional, and §16-17-3 that it can't fire the turn the
// card entered play — so this port implements the trash-cost + turn-guard explicitly
// (mirroring BT7-102's ＜Delay＞ `enterFieldTurnCount` guard) inside the continuous
// SubTrigger's `run` body. Flag for review if a future ruling on this family says
// otherwise.

const cardId = "BT26-099";

/** [DM]-trait card (any kind — the [Main] "Add 1 [DM] card" clause is not Digimon-only). */
function hasDMTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("DM");
}

/** Level 6 or lower [DM] trait Digimon card (the ＜Delay＞ bullet's digivolve target). */
function isFreeDigivolveTarget(def: CardDefinition): boolean {
  return isDigimon(def) && def.level !== undefined && def.level <= 6 && hasDMTrait(def);
}

/**
 * The [Main] resolution body, shared by the Option's own [Main] window and its
 * [Security] "Activate this card's [Main] effects" clause.
 */
async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const ownerSeat = source.ownerSeat;
  const revealed = await ctx.fx.reveal(ownerSeat, 3);

  if (revealed.length > 0) {
    const matches = revealed.filter((c) => hasDMTrait(ctx.game.definitionOf(c)));

    let kept: string[] = [];
    if (matches.length > 0) {
      const picked = await ctx.ask.selectCards(ctx, {
        candidates: matches.map((c) => c.instanceId),
        min: 0,
        max: 1,
      });
      kept = picked;
      if (picked.length > 0) await ctx.fx.returnToHand(picked);
    }

    // Return the rest to the bottom of the deck.
    const keptSet = new Set(kept);
    const rest = revealed.filter((c) => !keptSet.has(c.instanceId)).map((c) => c.instanceId);
    if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
  }

  // "Then, place this card in the battle area." — the ＜Delay＞ placement: the resolving
  // Option becomes a battle-area permanent instead of going to the trash.
  await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Reveal the top 3 cards of your deck. Add 1 [DM] card among them to the
    // hand. Return the rest to the bottom of the deck. Then, place this card in the
    // battle area.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Reveal the top 3 cards of your deck. Add 1 [DM] card among them to " +
            "the hand. Return the rest to the bottom of the deck. Then, place this card " +
            "in the battle area.",
          optional: false,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    // [All Turns] When face-down cards are placed in any of your Digimon's digivolution
    // cards, ＜Delay＞: while this Option-permanent is in the battle area, you may trash
    // it (optional; can't the turn it enters play) to let that Digimon digivolve into a
    // level 6 or lower [DM] trait Digimon card in the hand without paying the cost.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-delay`,
          description:
            "[All Turns] When face-down cards are placed in any of your Digimon's " +
            "digivolution cards, <Delay> - Any of those Digimon may digivolve into a " +
            "level 6 or lower [DM] trait Digimon card in the hand without paying the cost.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}: face-down card placed under one of your Digimon — ` +
                "<Delay>: trash this card to digivolve that Digimon for free.",
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const addedIds = subCtx.trigger?.addedDigivolutionCardInstanceIds ?? [];
                return addedIds.some((instanceId) => {
                  const added = subject.stack.find((card) => card.instanceId === instanceId);
                  return added !== undefined && !added.faceUp;
                });
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined) return;

                // §16-17-3: can't activate <Delay> the turn this card entered play.
                if (selfPerm.enterFieldTurnCount === subCtx.game.state.turnCount) return;

                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return;

                const owner = subCtx.game.player(source.ownerSeat);
                const candidates = Array.from(owner.hand)
                  .filter((c) => isFreeDigivolveTarget(subCtx.game.definitionOf(c)))
                  .map((c) => c.instanceId);
                if (candidates.length === 0) return;

                // §16-17-2: activating <Delay> is optional processing.
                const activate = await subCtx.ask.optional(
                  subCtx,
                  "Trash this card so that Digimon may digivolve into a level 6 or " +
                    "lower [DM] trait Digimon card in your hand without paying the cost?",
                );
                if (!activate) return;

                // "By trashing that card, the effect ... will activate" (§16-17-1).
                const deletedCount = await subCtx.fx.deletePermanent([selfPerm.permanentId]);
                if (deletedCount === 0) return;

                let chosen: string;
                if (candidates.length === 1) {
                  chosen = candidates[0]!;
                } else {
                  const picked = await subCtx.ask.selectCards(subCtx, {
                    candidates,
                    min: 1,
                    max: 1,
                  });
                  if (picked.length === 0) return;
                  chosen = picked[0]!;
                }

                await subCtx.fx.digivolveFromInstance(subject.permanentId, chosen, {
                  payCost: false,
                });
              },
            });
          },
        }),
      ];
    }

    // [Security] Activate this card's [Main] effects.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effects.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
