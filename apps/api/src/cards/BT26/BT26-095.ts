import { EffectTiming, isDigiEgg, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-095 — Makoto Kuonji (BT26, Purple Tamer).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-095` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand face
 *   down under this Tamer, ＜Draw 1＞ and gain 1 memory.
 *   [All Turns] When any Digimon are deleted, by suspending this Tamer, ＜Draw 1＞ and
 *   trash 1 card in your hand. After, place 1 [BEATBREAK] trait non-Digi-Egg card from
 *   your trash face down under this Tamer.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — cost-then-benefit, identical in shape to BT26-089's
 *     "[Start of Your Main Phase] By placing 1 [trait] card from your hand under this
 *     Tamer, Draw 1 and gain 1 memory." Placement uses ctx.fx.placeUnder (the existing
 *     "face down under a permanent" primitive). No new primitive needed.
 *
 *   EffectTiming.None — [All Turns] static: installs ONE SubTrigger watcher anchored to
 *     this Tamer (`sourcePermanentId` only governs the watcher's lifetime — it lives
 *     until this Tamer leaves the field — per BT26-089/BT26-091's pattern; it is not a
 *     filter on the event's subject). "Any Digimon are deleted" — friend or foe, no
 *     controller restriction — maps to `onDeletionOf`, the event GameEngine/primitives/
 *     the security-check path all fire for every permanent deletion BEFORE the permanent
 *     is actually removed (see primitives.ts `deletePermanents`/GameEngine.ts ~2359), so
 *     `matches` reads the still-live permanent via `ctx.game.permanentById` to check its
 *     top card is a Digimon. The cost ("by suspending this Tamer") gates the whole
 *     ability — paid at most once per deletion event, no-op if already suspended, mirrors
 *     BT26-089's `suspendAndPlaceTopDeckCardUnderSelf` shape. The benefit ("Draw 1 and
 *     trash 1 card in your hand") mirrors BT22-073's "[When Digivolving] Draw 1 and trash
 *     1 card in your hand": draw first, then select 1 hand card to trash via
 *     `ctx.fx.trash` (skipped if the hand is empty after the draw). The "After" clause
 *     ("place 1 [BEATBREAK] trait non-Digi-Egg card from your trash face down under this
 *     Tamer") has no "may" qualifier in the printed text, so it is mandatory whenever an
 *     eligible trash card exists — modeled on `ctx.fx.placeUnder`, which (per
 *     `removeLooseInstance`) already handles cards sitting in the trash the same way
 *     BT26-089/BT26-091 use it for cards sitting in the hand; this lets the card just
 *     trashed by the prior clause feed straight into this pool.
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-095";

function hasBeatbreakTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("BEATBREAK");
}

function isBeatbreakNonDigiEgg(def: CardDefinition): boolean {
  return hasBeatbreakTrait(def) && !isDigiEgg(def);
}

/**
 * Mandatory cost for the [All Turns] clause: suspend this Tamer. Returns whether the
 * cost was paid (false when already suspended — the whole triggered ability then does
 * nothing, including the draw/trash/place-under clauses a caller chains on).
 */
async function suspendSelf(ctx: EffectContext): Promise<boolean> {
  const self = ctx.source.permanent();
  if (self === undefined || self.isSuspended) return false;
  await ctx.fx.suspend([self.permanentId]);
  return true;
}

/** "<Draw 1> and trash 1 card in your hand." */
async function drawAndTrashOneHandCard(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.draw(source.ownerSeat, 1);

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.handCount === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.trash(chosen);
}

/** "After, place 1 [BEATBREAK] trait non-Digi-Egg card from your trash face down under this Tamer." */
async function placeBeatbreakTrashCardUnderSelf(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const owner = ctx.game.player(source.ownerSeat);
  const candidates = owner.trash.filter((c) => isBeatbreakNonDigiEgg(ctx.game.definitionOf(c))).map((c) => c.instanceId);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates,
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.placeUnder(self.permanentId, chosen);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand face
    // down under this Tamer, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-beatbreak-draw-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand " +
            "face down under this Tamer, <Draw 1> and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.some((c) => hasBeatbreakTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.hand
              .filter((c) => hasBeatbreakTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.placeUnder(selfPerm.permanentId, chosen);
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [All Turns] When any Digimon are deleted, by suspending this Tamer, <Draw 1> and
    // trash 1 card in your hand. After, place 1 [BEATBREAK] trait non-Digi-Egg card from
    // your trash face down under this Tamer. See the module header for the onDeletionOf
    // watcher shape.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-any-digimon-deleted-suspend-draw-trash`,
          description:
            "[All Turns] When any Digimon are deleted, by suspending this Tamer, <Draw 1> " +
            "and trash 1 card in your hand. After, place 1 [BEATBREAK] trait non-Digi-Egg " +
            "card from your trash face down under this Tamer.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: any Digimon deleted -> suspend self, draw+trash, place BEATBREAK card under self`,
              matches: (subCtx) => {
                const deletedId = subCtx.trigger.deletedPermanentId;
                if (deletedId === undefined) return false;
                const deletedPerm = subCtx.game.permanentById(deletedId);
                if (deletedPerm === undefined || deletedPerm.topCard === undefined) return false;
                return isDigimon(subCtx.game.definitionOf(deletedPerm.topCard));
              },
              run: async (subCtx) => {
                const paid = await suspendSelf(subCtx);
                if (!paid) return;
                await drawAndTrashOneHandCard(subCtx, source);
                await placeBeatbreakTrashCardUnderSelf(subCtx, source);
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
