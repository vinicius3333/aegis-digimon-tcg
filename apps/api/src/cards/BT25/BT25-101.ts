import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-101";
const linkHostName = "Vulcanusmon";

/** Link grants are continuous; mirror the IR `toDuration("permanent")` mapping (refreshes each turn). */
const linkGrantDuration = EffectDuration.UntilEachTurnEnd;

/** Does a card definition carry the [TS] trait? (source CardSource.HasTSTraits). */
function hasTsTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t.toUpperCase() === "TS");
}

/**
 * §16-42-1 gate for ＜Use Req. ([TS] trait)＞: true only while the controller has a
 * [TS] trait card in the battle area (matching the corpus' `youHave` default zone —
 * interpreter.ts `countMatching` scans battleArea for this condition shape, and
 * mirrors §4-21-2's own "on your field" color-requirement wording).
 */
function hasTsTraitInPlay(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    if (hasTsTrait(ctx.game.definitionOf(permanent.topCard))) return true;
  }
  return false;
}

/**
 * This Option is currently LINKED to a Digimon iff it sits on a host permanent. An
 * Option can only be on a permanent via that permanent's `linked` list (it is never a
 * top card or a digivolution source), so `source.permanent()` defined == linked.
 * source gate: the effect runtime.IsExistLinked(card).
 */
function linkedHost(source: CardSource): ReturnType<CardSource["permanent"]> {
  return source.permanent();
}

/** Owner battle-area Digimon permanent ids (the link targets for the [Main]). */
function ownerDigimonPermanentIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    if (isDigimon(ctx.game.definitionOf(permanent.topCard))) ids.push(permanent.permanentId);
  }
  return ids;
}

/**
 * The [Main] body, shared by the [Main] (OnUseOption) clause and the [Security]
 *   1. If you have a [TS] card in hand, you MAY trash 1 of them (canNoSelect: true).
 *   2. Only on a successful trash: Draw 2, then you MAY link this card or 1 [TS]-trait
 *      card from your trash to 1 of your Digimon (without paying the cost).
 */
async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const ownerSeat = source.ownerSeat;
  const owner = ctx.game.player(ownerSeat);

  // (1) "By trashing 1 [TS]-trait card from your hand" — the binding cost (Q6475).
  const tsHandIds = Array.from(owner.hand)
    .filter((c) => hasTsTrait(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
  if (tsHandIds.length === 0) return; // no [TS] card to trash => nothing after "after".

  // canNoSelect: true -> the controller may decline (min 0); choosing 0 pays no cost.
  const toTrash = await ctx.ask.selectCards(ctx, { candidates: tsHandIds, min: 0, max: 1 });
  if (toTrash.length === 0) return; // declined to pay => no Draw / link (Q6475).
  await ctx.fx.trash(toTrash);

  // (2a) "After ... <Draw 2>".
  await ctx.fx.draw(ownerSeat, 2);

  // (2b) "you may link this card or 1 [TS]-trait card from your trash to 1 of your
  //      Digimon on the field without paying the cost."
  const hostIds = ownerDigimonPermanentIds(ctx, source);
  if (hostIds.length === 0) return;

  const tsTrashIds = Array.from(owner.trash)
    .filter((c) => hasTsTrait(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  const willLink = await ctx.ask.optional(
    ctx,
    "Link this card or a [TS]-trait card from your trash to 1 of your Digimon?",
  );
  if (!willLink) return;

  // Pick the link SOURCE: this card (always available), or a [TS]-trait card from the
  // trash. Only prompt when both are possible; otherwise default to this card.
  let linkSourceInstanceId = source.instanceId;
  if (tsTrashIds.length > 0) {
    const choice = await ctx.ask.chooseOption(ctx, ["This card", "A [TS]-trait card from your trash"]);
    if (choice !== 0) {
      const picked = await ctx.ask.selectCards(ctx, { candidates: tsTrashIds, min: 1, max: 1 });
      if (picked[0] === undefined) return;
      linkSourceInstanceId = picked[0];
    }
  }

  // Pick the host Digimon and link (the link verb owns <Link>/cost/zone legality).
  const chosenHost =
    hostIds.length === 1 ? hostIds : await ctx.ask.chooseTargets(ctx, { candidates: hostIds, min: 1, max: 1 });
  if (chosenHost.length === 0) return;
  await ctx.fx.link(chosenHost[0]!, [linkSourceInstanceId]);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Continuous / static window: <Use Req.>, the two link keyword grants, and the
    // survival replacement install.
    if (timing === EffectTiming.None) {
      return [
        // <Use Req. ([TS] trait)> — while you have a [TS] trait card in play, you may
        // use/play this card ignoring its color requirements (source UseRequirements,
        // §16-42-1). Recorded as a color-requirement waiver on this card; the play/use
        // color-cost check reads it. Gated on `hasTsTraitInPlay` — bug fix: this
        // previously waived unconditionally, with no "in play" check at all.
        // `colorWaiverStatic` (not `staticModifier`): this card is HAND-resident when the
        // waiver needs to apply (it gates this card's own play), so it must not carry the
        // on-field base guard (see builders.ts).
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "<Use Req. ([TS] trait)> Ignore this card's color requirements.",
          optional: false,
          when: (ctx) => hasTsTraitInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),

        // [Link] <Security A. +1> — only while this card is linked to a Digimon.
        staticModifier({
          source,
          effectKey: `${cardId}/link-security-attack`,
          description: "[Link] <Security A. +1>",
          optional: false,
          isLinked: true,
          when: () => linkedHost(source) !== undefined,
          resolve: async (ctx) => {
            const host = linkedHost(source);
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "SecurityAttack", linkGrantDuration, 1);
          },
        }),

        // [Link] <Reboot> — only while this card is linked to a Digimon.
        staticModifier({
          source,
          effectKey: `${cardId}/link-reboot`,
          description: "[Link] <Reboot>",
          optional: false,
          isLinked: true,
          when: () => linkedHost(source) !== undefined,
          resolve: async (ctx) => {
            const host = linkedHost(source);
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "Reboot", linkGrantDuration);
          },
        }),

        // [Link] [All Turns] When this [Vulcanusmon] would leave the battle area, by
        // trashing 1 of its link cards, it doesn't leave. Installed as a "prevent"
        // replacement on the host while linked (the engine consults it at the
        // would-leave-play seam and runs `apply`, which pays the trash-a-link-card cost).
        staticModifier({
          source,
          effectKey: `${cardId}/link-survival`,
          description:
            "[Link] [All Turns] When this [Vulcanusmon] would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
          optional: false,
          isLinked: true,
          when: (ctx) => {
            const host = linkedHost(source);
            if (host === undefined || host.topCard == null) return false;
            return ctx.game.definitionOf(host.topCard).nameEn === linkHostName;
          },
          resolve: async (ctx) => {
            const host = linkedHost(source);
            if (host === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: host.permanentId,
              mode: "prevent",
              description:
                "[All Turns] By trashing 1 of this Vulcanusmon's link cards, it doesn't leave the battle area.",
              protects: (_subCtx, leavingId) => leavingId === host.permanentId,
              preventCheck: async (subCtx, leavingId) => {
                if (leavingId !== host.permanentId) return false;
                const hostNow = subCtx.game.permanentById(host.permanentId);
                if (hostNow === undefined) return false;
                const linkCards = Array.from(hostNow.linked).map((c) => c.instanceId);
                if (linkCards.length === 0) return false;
                const toTrash = await subCtx.ask.selectCards(subCtx, {
                  candidates: linkCards,
                  min: 1,
                  max: 1,
                });
                if (toTrash.length === 0) return false;
                await subCtx.fx.trash(toTrash);
                return true;
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
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effects.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    // [Main] By trashing 1 [TS]-trait card from your hand, <Draw 2>. After, you may
    // link this card or 1 [TS]-trait card from your trash to 1 of your Digimon on the
    // field without paying the cost.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] By trashing 1 [TS]-trait card from your hand, <Draw 2>. After, you may link this card or 1 [TS]-trait card from your trash to 1 of your Digimon on the field without paying the cost.",
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
