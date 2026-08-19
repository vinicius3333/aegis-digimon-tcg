import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, inTrash } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

// BT26-078 — Cherubimon (BT26, Purple/Green Lv.6 Digimon, Cherub/Titan/TS).
//
// The committed KB contains Q7105-Q7108 (2026-08-18), confirming text matching, Trash-only
// activation, the opponent-memory boundary, and the combined card/trait filter semantics.
//
// Printed text:
//   [Digivolve] Lv.5 w/[TS] trait: Cost 5
//   [Trash] [Your Turn] When any of your [Chronomon] text or [Titan] trait Digimon are
//     played, if your opponent has 5 or more memory, by returning this card to the
//     bottom of the deck, 1 of them gains ＜Rush＞ and ＜Execute＞ for the turn.
//   [On Play] [When Digivolving] By deleting this Digimon, you may play 1 play cost 12
//     or lower [Chronomon] text or [Titan] trait card from your trash without paying
//     the cost.
//
// Clause mapping:
//   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
//     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
//     here.
//
//   [Trash] [Your Turn] "When ... are played ... by returning this card to the bottom
//     of the deck, 1 of them gains <Rush> and <Execute>" — now implemented. Previously
//     RESIDUAL: `[Trash]` timings dispatch to EffectTiming.None (interpreter.ts
//     builderForTrigger's `case "Trash"`), but a trash-resident card had no permanentId
//     to anchor a `whenPlayed` SubTrigger watcher to — `subscribeSubTrigger` required a
//     live battle-area Permanent. The engine now supports an anchor-less
//     `sourceInstanceId` fallback (the corresponding regression coverage,
//     eighth gap): a watcher installed by a loose CardInstance binds `ctx.source` from
//     that instance wherever it currently sits (hand/trash), so this card's own
//     `Static`-equivalent `inTrash` builder (base guard: `ctx.source.isInTrash()`) can
//     install the watcher explicitly with `sourceInstanceId: ctx.source.instanceId`.
//
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, mandatory) — "By
//     deleting this Digimon, you may play 1 play cost 12 or lower [Chronomon] text or
//     [Titan] trait card from your trash without paying the cost." Modeled on BT15-041's
//     "by deleting this Digimon, you may play ... without paying the cost" shape: one
//     all-or-nothing optional prompt gates the whole clause (delete-then-play), since
//     paying the self-delete cost for no payoff is never desirable and the printed "may"
//     reads naturally as "you may activate this at all". The [Chronomon] text / [Titan]
//     trait filter mirrors BT26-011's `effectText.includes("Chronomon")` /
//     `types.includes(...)` idiom (BT26-011 has the identical "[Chronomon] in its text or
//     the [X] trait" phrasing), and the trash-play-without-cost primitive mirrors
//     BT26-098's security clause (`ctx.fx.playInstances(chosen, { payCost: false })`).

const cardId = "BT26-078";

/** Turn-relative memory `seat` currently has (positive favors `ctx.game.state.turnSeat`). */
function memoryFor(ctx: EffectContext, seat: Seat): number {
  const m = ctx.game.state.memory;
  return seat === ctx.game.state.turnSeat ? m : -m;
}

/** "[Chronomon] text or [Titan] trait" (BT26-011's identical phrase/idiom). */
function hasChronomonTextOrTitanTrait(def: CardDefinition): boolean {
  return matchNameOrTrait(def, { tokens: ["Chronomon"], match: "text" }) || (def.types ?? []).includes("Titan");
}

/**
 * [On Play] [When Digivolving] By deleting this Digimon, you may play 1 play cost 12 or
 * lower [Chronomon] text or [Titan] trait card from your trash without paying the cost.
 */
async function resolveDeleteToPlayFromTrash(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  const owner = ctx.game.player(source.ownerSeat);
  const candidates = Array.from(owner.trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    return def.playCost <= 12 && hasChronomonTextOrTitanTrait(def);
  });
  if (candidates.length === 0) return;

  const willActivate = await ctx.ask.optional(
    ctx,
    "Delete this Digimon to play 1 play cost 12 or lower [Chronomon] text or [Titan] " +
      "trait card from your trash without paying the cost?",
  );
  if (!willActivate) return;

  await ctx.fx.deletePermanent([self.permanentId]);

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.playInstances(chosen, { payCost: false });
}

/**
 * [Trash] [Your Turn] When any of your [Chronomon] text or [Titan] trait Digimon are
 * played, if your opponent has 5 or more memory, by returning this card to the bottom
 * of the deck, 1 of them gains ＜Rush＞ and ＜Execute＞ for the turn.
 *
 * Installed while this card sits in the trash (the `inTrash` builder's base guard
 * re-derives it every continuous recompute, same as any other `EffectTiming.None`
 * effect). `ctx.source.permanent()` is undefined here (no battle-area anchor), so the
 * `whenPlayed` watcher is installed with the anchor-less `sourceInstanceId` fallback
 * instead of `sourcePermanentId` — see EffectContext.ts's `SubTriggerInstall.
 * sourceInstanceId` and the eighth engine-gap fix.
 */
function installTrashResidentWatcher(ctx: EffectContext, source: CardSource): void {
  ctx.fx.subscribeSubTrigger({
    event: "whenPlayed",
    sourceInstanceId: ctx.source.instanceId,
    once: false,
    description: `${cardId}: [Trash][Your Turn] a matching Digimon is played -> optional Rush/Execute.`,
    matches: (subCtx) => {
      const subjectId = subCtx.trigger?.subjectPermanentId;
      if (subjectId === undefined) return false;
      const subject = subCtx.game.permanentById(subjectId);
      if (subject === undefined || subject.controllerSeat !== source.ownerSeat) return false;
      if (subject.topCard === undefined) return false;
      return hasChronomonTextOrTitanTrait(subCtx.game.definitionOf(subject.topCard));
    },
    run: async (subCtx) => {
      const opponent = subCtx.game.opponentOf(source.ownerSeat);
      if (memoryFor(subCtx, opponent) < 5) return;
      const subjectId = subCtx.trigger?.subjectPermanentId;
      if (subjectId === undefined) return;
      const willActivate = await subCtx.ask.optional(
        subCtx,
        "By returning this card to the bottom of the deck, 1 of them gains ＜Rush＞ and " + "＜Execute＞ for the turn?",
      );
      if (!willActivate) return;
      await subCtx.fx.returnToDeck([subCtx.source.instanceId]);
      subCtx.fx.grantKeyword(subjectId, "Rush", EffectDuration.UntilEachTurnEnd);
      subCtx.fx.grantKeyword(subjectId, "Execute", EffectDuration.UntilEachTurnEnd);
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By deleting this Digimon, you may play 1 play cost 12 or lower
    // [Chronomon] text or [Titan] trait card from your trash without paying the cost.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-to-play-from-trash`,
          description:
            "[On Play] By deleting this Digimon, you may play 1 play cost 12 or lower " +
            "[Chronomon] text or [Titan] trait card from your trash without paying the " +
            "cost.",
          optional: false,
          resolve: async (ctx) => {
            await resolveDeleteToPlayFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-to-play-from-trash`,
          description:
            "[When Digivolving] By deleting this Digimon, you may play 1 play cost 12 " +
            "or lower [Chronomon] text or [Titan] trait card from your trash without " +
            "paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await resolveDeleteToPlayFromTrash(ctx, source);
          },
        }),
      ];
    }

    // EffectTiming.None: [Trash] [Your Turn] "when a matching Digimon is played..." — see
    // installTrashResidentWatcher above and the header comment for the eighth-gap fix that
    // makes this installable.
    if (timing === EffectTiming.None) {
      return [
        inTrash({
          source,
          effectKey: `${cardId}/trash-your-turn-played-watcher`,
          description:
            "[Trash] [Your Turn] When any of your [Chronomon] text or [Titan] trait Digimon " +
            "are played, if your opponent has 5 or more memory, by returning this card to " +
            "the bottom of the deck, 1 of them gains ＜Rush＞ and ＜Execute＞ for the turn.",
          when: (ctx) => ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            installTrashResidentWatcher(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
