import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-101 — Cross Arts (BT26, White Option).
 *
 * Provisional port: no KB entry (errata/Q&A) exists yet for BT26-101
 * (`node tools/kb/query.mjs card BT26-101` returned no knowledge-base entries). implemented
 * from the printed card text only, mirroring the reviewed hand-written BT26-098 (Option
 * [Main] -> EffectTiming.OnUseOption, [Security] -> the `security` builder) and the
 * DP-threshold delete idiom from BT23-014.
 *
 * ＜Use Req. ([TS] trait)＞
 * [Main] If you have a Tamer with [Dan Yuki] or [Kanan Yuki] in its name, all of your
 *   [TS] trait Digimon gain ＜Blocker＞ and +3000 DP until your opponent's turn ends.
 *   Then, activate 1 of the effects below:
 *   ・Delete 1 of your opponent's Digimon with as much DP as 1 of your [TS] trait
 *     Digimon or less.
 *   ・1 of your [TS] trait Digimon unsuspends.
 * [Security] You may play 1 play cost 4 or lower [TS] card from your hand or trash
 *   without paying the cost.
 *
 * ＜Use Req. ([TS] trait)＞ is implemented as a hand-resident color-requirement waiver,
 * gated by having a [TS] trait card in the battle area.
 *
 * PROVISIONAL READING: the printed text reads as one sentence ending "...until your
 * opponent's turn ends." followed by a new sentence "Then, activate 1 of the effects
 * below:". Read that way, the Tamer-gated Blocker/+3000 DP grant is conditional on the
 * named Tamer, while "activate 1 of the effects below" is a separate, unconditional
 * step that always resolves. This mirrors the common Digimon-TCG pattern of a
 * conditional bonus clause followed by an unconditional modal choice. Flag for review
 * if a future BT26 Q&A says otherwise.
 */

const cardId = "BT26-101";

const NAMED_TAMER_TOKENS = ["Dan Yuki", "Kanan Yuki"];

/** Whether the controller has a Tamer permanent named [Dan Yuki] or [Kanan Yuki]. */
function hasNamedTamer(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.some((p: Permanent) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isTamer(def)) return false;
    return NAMED_TAMER_TOKENS.some((token) => def.nameEn.includes(token));
  });
}

/** The controller's battle-area [TS] trait Digimon permanents. */
function tsTraitDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.filter((p: Permanent) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && (def.types ?? []).includes("TS");
  });
}

function hasTsInPlay(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return (ctx.game.definitionOf(permanent.topCard).types ?? []).includes("TS");
  });
}

/**
 * Shared [Main] resolution body: the conditional Blocker/+3000 DP grant, then the
 * unconditional 1-of-2 modal choice (delete-by-DP or unsuspend). Shared with
 * [Security] since it activates the same "effects below".
 */
async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  if (hasNamedTamer(ctx, source)) {
    for (const perm of tsTraitDigimon(ctx, source)) {
      ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
      ctx.fx.modifyDP(perm.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
    }
  }

  const tsDigimon = tsTraitDigimon(ctx, source);
  if (tsDigimon.length === 0) return;

  const MODAL_OPTIONS = [
    "Delete 1 of your opponent's Digimon with as much DP as 1 of your [TS] trait Digimon or less.",
    "1 of your [TS] trait Digimon unsuspends.",
  ];
  const idx = await ctx.ask.chooseOption(ctx, MODAL_OPTIONS);

  if (idx === 0) {
    const referenceId =
      tsDigimon.length === 1
        ? tsDigimon[0]!.permanentId
        : (
            await ctx.ask.chooseTargets(ctx, {
              candidates: tsDigimon.map((p) => p.permanentId),
              min: 1,
              max: 1,
            })
          )[0];
    if (referenceId === undefined) return;
    const reference = ctx.game.permanentById(referenceId);
    if (reference === undefined) return;
    const threshold = reference.currentDP;

    const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
    const deleteCandidates = ctx.game
      .player(opponentSeat)
      .battleArea.filter((p: Permanent) => {
        if (p.topCard === undefined) return false;
        return isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= threshold;
      })
      .map((p) => p.permanentId);
    if (deleteCandidates.length === 0) return;

    const chosen =
      deleteCandidates.length === 1
        ? deleteCandidates
        : await ctx.ask.chooseTargets(ctx, { candidates: deleteCandidates, min: 1, max: 1 });
    if (chosen.length === 0) return;
    await ctx.fx.deletePermanent(chosen);
  } else if (idx === 1) {
    const chosen =
      tsDigimon.length === 1
        ? [tsDigimon[0]!.permanentId]
        : await ctx.ask.chooseTargets(ctx, {
            candidates: tsDigimon.map((p) => p.permanentId),
            min: 1,
            max: 1,
          });
    if (chosen.length === 0) return;
    await ctx.fx.unsuspend(chosen);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "＜Use Req. ([TS] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => hasTsInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] If you have a Tamer with [Dan Yuki] or [Kanan Yuki] in its name, " +
            "all of your [TS] trait Digimon gain <Blocker> and +3000 DP until your " +
            "opponent's turn ends. Then, activate 1 of the effects below: - Delete 1 " +
            "of your opponent's Digimon with as much DP as 1 of your [TS] trait " +
            "Digimon or less. - 1 of your [TS] trait Digimon unsuspends.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] You may play 1 play cost 4 or lower [TS] card from your hand " +
            "or trash without paying the cost.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = [...owner.hand, ...owner.trash].filter((card) => {
              const def = ctx.game.definitionOf(card);
              if (!(def.types ?? []).includes("TS")) return false;
              return def.playCost !== undefined && def.playCost <= 4;
            });
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
