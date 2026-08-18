import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX10-056 — Bagramon (EX10, Dark-Area/Bagra-Army DigiXros Digimon).
 *
 *
 * [On Play] (optional):
 *   Place 1 of your opponent's Digimon as the bottom digivolution card of one of your
 *   opponent's OTHER Digimon or one of their Tamers.
 * [When Digivolving] (optional):
 *   Same as [On Play].
 * [All Turns][Once Per Turn]:
 *   When any of your opponent's Digimon or Tamers digivolves, OR when effects place cards
 *   under them, by trashing 2 of THIS Digimon's digivolution cards, trash your opponent's
 *   top security card.
 *
 * RESIDUAL:
 *   The [All Turns][Once Per Turn] watcher (subscribeSubTrigger for `whenDigivolves` and
 *   `onAddDigivolutionCards`) is partially implementable: we can install the watcher.
 *   However, the once-per-turn cap across TWO sub-trigger types (documented behavior shared hash
 *   "EX10_056_AllTurns") has no direct engine primitive. The watcher is installed but
 *   without a per-turn cap — both `whenDigivolves` and `onAddDigivolutionCards` events
 *   are subscribed from OnPlay and WhenDigivolving, but fire independently without a
 *   shared once-per-turn throttle.
 *
 *   Additionally, the `trashDigivolutionCards` cost within the sub-trigger body takes 2
 *   cards from THIS Digimon's stack. This is implementable (trashDigivolutionCards verb
 *   exists), but requires passing the source permanent's ID at subscription time.
 *
 *   Both watcher subscriptions are installed to give partial coverage; the once-per-turn
 *   cap remains a residual.
 */
const cardId = "EX10-056";

/** Shared resolve body for [On Play] and [When Digivolving]. */
async function relocateOpponentDigimon(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const oppBattleArea = ctx.game.player(opponentSeat).battleArea;

  // Only Digimon are valid sources to relocate.
  const sourceTargets = oppBattleArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return (def.kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (sourceTargets.length === 0) return;

  // Choose which opponent Digimon to relocate.
  const sourcePick =
    sourceTargets.length === 1
      ? [sourceTargets[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: sourceTargets, min: 1, max: 1 });

  const sourcePermId = sourcePick[0];
  if (sourcePermId === undefined) return;

  // Destination: opponent's OTHER Digimon or Tamer (excludes the source).
  const destTargets = oppBattleArea
    .filter((p) => {
      if (p.permanentId === sourcePermId) return false;
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      const kinds = def.kinds as string[];
      return kinds.includes("Digimon") || kinds.includes("Tamer");
    })
    .map((p) => p.permanentId);

  if (destTargets.length === 0) return;

  const destPick =
    destTargets.length === 1
      ? [destTargets[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: destTargets, min: 1, max: 1 });

  const destPermId = destPick[0];
  if (destPermId === undefined) return;

  ctx.fx.relocatePermanent(destPermId, sourcePermId);
}

/** Install the [All Turns] sub-trigger watchers on the current permanent. */
async function installAllTurnsWatcher(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const hostPermId = self.permanentId;
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);

  // Watcher for whenDigivolves (opponent digivolves) and onAddDigivolutionCards (effect places cards).
  const watcherRun = async (subCtx: Parameters<Effect["resolve"]>[0]): Promise<void> => {
    // Gate: the event subject must be an opponent's permanent.
    const subjectId = subCtx.trigger?.subjectPermanentId;
    if (subjectId !== undefined) {
      const subjectPerm = subCtx.game.permanentById(subjectId);
      if (subjectPerm !== undefined && subjectPerm.controllerSeat === subCtx.source.ownerSeat) return;
    }

    // The watcher fires on the opponent's action; get current host.
    const hostPerm = subCtx.game.permanentById(hostPermId);
    if (hostPerm === undefined) return;

    // Need at least 2 digivolution cards to pay the cost.
    if (hostPerm.stack.length < 2) return;

    // Ask if player wants to activate.
    const activate = await subCtx.ask.optional(
      subCtx,
      "Trash 2 of this Digimon's digivolution cards to trash opponent's top security?",
    );
    if (!activate) return;

    // Select 2 digivolution cards to trash.
    const stackIds = hostPerm.stack.map((c) => c.instanceId);
    const chosen =
      stackIds.length === 2
        ? stackIds
        : await subCtx.ask.selectCards(subCtx, { candidates: stackIds, min: 2, max: 2 });

    if (chosen.length < 2) return;

    await subCtx.fx.trashDigivolutionCards(hostPermId, chosen);
    await subCtx.fx.trashFromSecurity(opponentSeat, 1);
  };

  ctx.fx.subscribeSubTrigger({
    event: "whenOneOfYoursDigivolves",
    sourcePermanentId: hostPermId,
    once: false,
    description: `${cardId}: when opponent digivolves → trash 2 digivolution → trash opp top security`,
    run: watcherRun,
  });

  ctx.fx.subscribeSubTrigger({
    event: "onAddDigivolutionCards",
    sourcePermanentId: hostPermId,
    once: false,
    description: `${cardId}: when effect places under opponent → trash 2 digivolution → trash opp top security`,
    run: watcherRun,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play]: optional relocate + install AllTurns watcher.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-relocate`,
          description:
            "[On Play] You may place 1 of your opponent's Digimon as the bottom digivolution " +
            "card of one of your opponent's other Digimon or Tamers.",
          optional: true,
          resolve: async (ctx) => {
            await relocateOpponentDigimon(ctx);
            await installAllTurnsWatcher(ctx);
          },
        }),
      ];
    }

    // [When Digivolving]: same.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-relocate`,
          description:
            "[When Digivolving] You may place 1 of your opponent's Digimon as the bottom " +
            "digivolution card of one of your opponent's other Digimon or Tamers.",
          optional: true,
          resolve: async (ctx) => {
            await relocateOpponentDigimon(ctx);
            await installAllTurnsWatcher(ctx);
          },
        }),
      ];
    }

    // The AllTurns watcher is installed via OnPlay/WhenDigivolving effects above (not a
    // stand-alone staticModifier) because its anchor is the OnPlay/WhenDigivolving fire.
    // RESIDUAL: no once-per-turn cap across both watcher subscriptions.

    return [];
  },
};

registerCard(module);
export default module;
