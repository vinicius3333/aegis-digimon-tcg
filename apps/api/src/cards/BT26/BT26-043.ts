import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-043 — Piximon (BT26, Green Lv.5 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-043 as of this port
// (`node tools/kb/query.mjs card BT26-043` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.4 w/[DM] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   ＜Blocker＞ — printed keyword, parsed automatically from effectText by the engine's
//     combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant (same treatment
//     as BT26-023's ＜Jamming＞).
//   [On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then,
//     by placing your deck's top card face down as this Digimon's bottom digivolution
//     card, for each of this Digimon's face-down digivolution cards, 1 of your
//     opponent's Digimon or Tamers can't unsuspend until their turn ends.
//   Inherited: [All Turns] [Once Per Turn] When any of your Digimon are played, you
//     may suspend 1 of your opponent's Digimon.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body, mandatory) —
//     "Suspend 1 of your opponent's Digimon or Tamers." mirrors BT26-042's suspend
//     target pool (`isDigimonOrTamer` via `def.kinds.includes(CardKind.Tamer)`,
//     `ctx.fx.suspend`). "Then, by placing your deck's top card face down as this
//     Digimon's bottom digivolution card" has no discretionary component (the card is
//     always the deck's actual top card, not a choice), so it is read literally off
//     `ctx.game.player(seat).deck[0]` and placed via `ctx.fx.placeUnder(self, [id],
//     { belowTop: false })` — the same deck-top-to-stack-bottom idiom as BT26-023's
//     ＜Training＞ clause and BT11-061's `ctx.fx.placeUnder`, but with `belowTop: false`
//     (a literal true-bottom placement) matching BT11-061's own "bottom digivolution
//     card" reading rather than BT26-023's Training-specific `belowTop: true` parity
//     choice. "For each of this Digimon's face-down digivolution cards, 1 of your
//     opponent's Digimon or Tamers can't unsuspend until their turn ends" counts the
//     stack's face-down cards the same way interpreter.ts's own <Delay> qualifier does
//     (`stack.filter((c) => c.faceUp !== true).length`), then applies
//     `ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOpponentTurnEnd)` once per
//     face-down card (BT26-042's lock idiom, repeated N times with a fresh target pick
//     each time).
//
//   Inherited (EffectTiming.OnStartTurn, isInherited: true) — "[All Turns] [Once Per
//     Turn] When any of your Digimon are played, you may suspend 1 of your opponent's
//     Digimon." Modeled on BT26-002's inherited reinstall shape (`turnTiming` +
//     `maxPerTurn: 1` reinstalling a one-shot `subscribeSubTrigger` on "whenPlayed",
//     `expiresOnTurnEndOf` the CURRENT turn's seat), but omitting BT26-002's
//     `isOwnersTurn()` gate — "[All Turns]" reinstalls every turn (both players'),
//     unlike BT26-002's "[Your Turn]". The "whenPlayed" SubTrigger event (confirmed in
//     `SubTriggerEventName`, EffectContext.ts) fires for every card played — manual
//     hand plays included (GameEngine.ts's OnStartMainPhase/OnDeclaration play seams),
//     not just effect-driven ones — so `subCtx.trigger.playedByEffect` is left
//     unchecked here (EX5-062 checks it only because that ability is effect-play
//     specific; this one is not). The watcher's `matches` gates the played subject to
//     a Digimon controlled by this card's owner (mirrors BT26-002's "your Tamers"
//     gate, swapped to Digimon/CardKind.Digimon), and the "may suspend" is optional
//     (min 0) via `chooseOne`.

const cardId = "BT26-043";

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
}

function opponentDigimonTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

async function chooseOne(ctx: EffectContext, candidates: Permanent[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.permanentId;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  return chosen[0];
}

/**
 * "Suspend 1 of your opponent's Digimon or Tamers. Then, by placing your deck's top
 * card face down as this Digimon's bottom digivolution card, for each of this
 * Digimon's face-down digivolution cards, 1 of your opponent's Digimon or Tamers
 * can't unsuspend until their turn ends." Shared by [On Play] and [When Digivolving].
 */
async function resolveSuspendPlaceAndLock(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

  const suspendTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (suspendTargetId !== undefined) {
    await ctx.fx.suspend([suspendTargetId]);
  }

  const self = source.permanent();
  if (self === undefined) return;

  const topOfDeck = ctx.game.player(source.ownerSeat).deck[0];
  if (topOfDeck !== undefined) {
    await ctx.fx.placeUnder(self.permanentId, [topOfDeck.instanceId], { belowTop: false });
  }

  const afterPlace = ctx.game.permanentById(self.permanentId);
  const faceDownCount = afterPlace?.stack.filter((c) => c.faceUp !== true).length ?? 0;
  for (let i = 0; i < faceDownCount; i++) {
    const lockTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
    if (lockTargetId === undefined) break;
    ctx.fx.restrict(lockTargetId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/suspend-place-lock`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or " +
            "Tamers. Then, by placing your deck's top card face down as this Digimon's " +
            "bottom digivolution card, for each of this Digimon's face-down " +
            "digivolution cards, 1 of your opponent's Digimon or Tamers can't " +
            "unsuspend until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendPlaceAndLock(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/suspend-place-lock`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or " +
            "Tamers. Then, by placing your deck's top card face down as this Digimon's " +
            "bottom digivolution card, for each of this Digimon's face-down " +
            "digivolution cards, 1 of your opponent's Digimon or Tamers can't " +
            "unsuspend until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendPlaceAndLock(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [All Turns] [Once Per Turn] When any of your Digimon are played,
    // you may suspend 1 of your opponent's Digimon.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-on-ally-digimon-played-suspend`,
          description:
            "[All Turns] [Once Per Turn] When any of your Digimon are played, you may " +
            "suspend 1 of your opponent's Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            const ownerSeat = ctx.source.ownerSeat;
            // "[All Turns]": the current turn seat is the owner's turn when
            // isOwnersTurn() holds, else the opponent's — used only to expire the
            // one-shot watcher at the end of whichever turn it was installed in.
            const currentTurnSeat = ctx.source.isOwnersTurn()
              ? ownerSeat
              : ctx.game.opponentOf(ownerSeat);

            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self?.permanentId,
              once: true,
              expiresOnTurnEndOf: currentTurnSeat,
              description: `${cardId}: may suspend 1 opponent Digimon when any of your Digimon are played`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                const opponentSeat = subCtx.game.opponentOf(ownerSeat);
                const candidates = opponentDigimonTargets(subCtx, opponentSeat);
                if (candidates.length === 0) return;
                const accept = await subCtx.ask.optional(
                  subCtx,
                  "Piximon: suspend 1 of your opponent's Digimon?",
                );
                if (!accept) return;
                const targetId = await chooseOne(subCtx, candidates);
                if (targetId === undefined) return;
                await subCtx.fx.suspend([targetId]);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
