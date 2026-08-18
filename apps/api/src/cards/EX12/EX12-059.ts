import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX12-059 — Machinedramon (EX12, Black Lv.6 Digimon).
 *
 * [Hand/Counter] ＜Blast Digivolve＞ (keyword only — no action body)
 * [Static] ＜Reboot＞, ＜Fragment (2)＞
 * [On Play] / [When Digivolving] / [When Attacking] (once per turn for whenAttacking):
 *   By placing 2 Lv.5 or lower [Machine], [Cyborg], or [ME] trait cards from your hand or
 *   trash as this Digimon's bottom digivolution cards, de-digivolve 1 of your opponent's
 *   Digimon by 3.
 *   After, your opponent's effects can't trash any of your Digimon's stacked cards until
 *   their turn ends.
 *
 * RESIDUAL:
 *   "your opponent's effects can't trash any of your Digimon's stacked cards until their
 *   turn ends" — `ctx.fx.stackTrashLock` is optional on the Primitives interface; absent in
 *   test fakes. Iterated over all controller Digimon calling stackTrashLock when present.
 *   If the primitive is absent (undefined), the stackTrashLock body is silently skipped.
 */
const cardId = "EX12-059";

const ALLOWED_TRAITS = new Set(["Machine", "Cyborg", "ME"]);

function hasAllowedTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => ALLOWED_TRAITS.has(t));
}

function isLevelFiveOrLower(def: CardDefinition): boolean {
  return def.level === undefined || def.level <= 5;
}

/** Shared resolve body for [On Play], [When Digivolving], [When Attacking]. */
async function placeAndDeDigivolve(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const seat = ctx.source.ownerSeat;
  const player = ctx.game.player(seat);

  // Candidates from hand and trash matching Lv.5 or lower + Machine/Cyborg/ME trait.
  const handCandidates = Array.from(player.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isLevelFiveOrLower(def) && hasAllowedTrait(def);
  });
  const trashCandidates = Array.from(player.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isLevelFiveOrLower(def) && hasAllowedTrait(def);
  });
  const allCandidates = [...handCandidates, ...trashCandidates];

  if (allCandidates.length < 2) {
    return;
  }

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: allCandidates.map((c) => c.instanceId),
    min: 2,
    max: 2,
  });

  if (chosen.length < 2) return;

  await ctx.fx.placeUnder(self.permanentId, chosen);

  // De-digivolve 1 opponent Digimon by 3.
  const opponentSeat = ctx.game.opponentOf(seat);
  const oppDigimon = ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return (def.kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (oppDigimon.length > 0) {
    const ddTarget =
      oppDigimon.length === 1
        ? oppDigimon[0]!
        : (await ctx.ask.chooseTargets(ctx, { candidates: oppDigimon, min: 1, max: 1 }))[0];

    if (ddTarget !== undefined) {
      ctx.fx.deDigivolve(ddTarget, 3);
    }
  }

  // Stack-trash lock: opponent can't trash any of YOUR Digimon's stacked cards until their turn ends.
  // Applied to all controller's battle-area Digimon; `stackTrashLock` is optional.
  if (ctx.fx.stackTrashLock !== undefined) {
    const myDigimon = ctx.game.player(seat).battleArea;
    for (const perm of myDigimon) {
      if (perm.topCard === undefined) continue;
      const def = ctx.game.definitionOf(perm.topCard);
      if ((def.kinds as string[]).includes("Digimon")) {
        ctx.fx.stackTrashLock(perm.permanentId, EffectDuration.UntilOpponentTurnEnd);
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Blast Digivolve＞ keyword in Hand timing.
    // The IR uses Hand + Counter separately; static keyword grants are handled by the
    // continuous subsystem reading `effect.keywords`. Here we grant it as a static.
    // (The engine reads grantKeyword from static effects for keyword-only grants.)

    // ＜Reboot＞ and ＜Fragment (2)＞ static grants + BlastDigivolve.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reboot`,
          description: "＜Reboot＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/fragment`,
          description: "＜Fragment (2)＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Fragment", EffectDuration.UntilEachTurnEnd, 2);
            }
          },
        }),
      ];
    }

    // [On Play]: place 2 Machine/Cyborg/ME ≤Lv5 as digivolution cards → dedigivolve opp by 3 + stack-trash lock.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-dedigivolve`,
          description:
            "[On Play] By placing 2 Lv.5 or lower [Machine]/[Cyborg]/[ME] cards from your hand or " +
            "trash as this Digimon's bottom digivolution cards, de-digivolve 1 of your opponent's Digimon " +
            "by 3. After, your opponent's effects can't trash any of your Digimon's stacked cards " +
            "until their turn ends.",
          resolve: placeAndDeDigivolve,
        }),
      ];
    }

    // [When Digivolving]: same body.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-dedigivolve`,
          description:
            "[When Digivolving] By placing 2 Lv.5 or lower [Machine]/[Cyborg]/[ME] cards from your " +
            "hand or trash as this Digimon's bottom digivolution cards, de-digivolve 1 of your " +
            "opponent's Digimon by 3. After, stack-trash lock until opponent's turn end.",
          resolve: placeAndDeDigivolve,
        }),
      ];
    }

    // [When Attacking] (once per turn): same body.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-place-dedigivolve`,
          description:
            "[When Attacking] By placing 2 Lv.5 or lower [Machine]/[Cyborg]/[ME] cards from your " +
            "hand or trash as this Digimon's bottom digivolution cards, de-digivolve 1 of your " +
            "opponent's Digimon by 3. After, stack-trash lock until opponent's turn end.",
          maxPerTurn: 1,
          resolve: placeAndDeDigivolve,
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
