import { EffectTiming, type IntentResult, type RejectReason, type Seat } from "@aegis/shared";
import { logError } from "../../../logger.js";
import {
  applyHatchEgg,
  applyMoveFromBreeding,
  type HatchEggIntent,
  type MoveFromBreedingIntent,
} from "../../actions/breeding.js";
import { mapBreedingReason } from "../rejectionReasons.js";
import { breedingDeps } from "../actionDeps.js";
import type { GameEngine } from "../../GameEngine.js";
import { prepareSubjectFrozenSubTrigger } from "../subTriggers.js";

/**
 * Route the hatchEgg verb (subsystem: breeding). Applies the action synchronously
 * (breeding has no cost / draw / awaited effect), and on success closes the open
 * breeding window — the turn player's single breeding action is spent (§6-4-1).
 */
export function handleHatchEgg(engine: GameEngine, seat: Seat, intent: HatchEggIntent): IntentResult {
  void intent;
  if (engine.breeding.isActionSpent) return { ok: false, reason: breedingActionSpentReason(engine) };
  const result = applyHatchEgg(engine.state, seat, breedingDeps(engine));
  if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
  // "[All Turns] when YOU hatch [a Digi-Egg] in the breeding area" (BT17-093). Fired from
  // engine sync intent handler without awaiting; the breeding window stays open until the
  // fire settles (see handleMoveFromBreeding).
  const fired = engine.fireSubTrigger("whenHatch", { subjectPermanentId: result.outcome.permanentId }).catch((err) => {
    logError("[engine] hatchEgg fire failed:", err);
  });
  engine.breeding.actionTaken(seat, fired);
  return { ok: true };
}

/**
 * Route the moveFromBreeding verb (subsystem: breeding). Applies the action and, on
 * success, closes the open breeding window (the single breeding action is spent).
 */
export function handleMoveFromBreeding(engine: GameEngine, seat: Seat, intent: MoveFromBreedingIntent): IntentResult {
  if (engine.breeding.isActionSpent) return { ok: false, reason: breedingActionSpentReason(engine) };
  const result = applyMoveFromBreeding(engine.state, seat, intent, breedingDeps(engine));
  if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
  const movedPermanentId = result.outcome.permanentId;
  // The DP ledger skips a permanent while it is in breeding (Q4252), so ledger entries that
  // already cover battle-area Digimon (player-wide modifiers) only land once it is recomputed.
  engine.modifiers.recomputeDP(engine.state, movedPermanentId);
  // The breeding -> battle move fires the OnMove timing, the broad entry timing/bus, then
  // the two movement SubTrigger events below so reactive watchers execute (both fired unconditionally:
  // a watcher's sourceFilter (isSelfRef / controller matching) gates which side reacts):
  //   whenMovedFromBreeding         — "when one of YOUR Digimon moves from breeding" (BT16-082)
  //   whenOpponentMovedFromBreeding — "when your OPPONENT moves a Digimon from breeding" (BT5-044, BT11-087)
  // This handler must return its IntentResult synchronously, so the fires are chained into one
  // promise: sequential internal ordering (each begins only after the previous settles) with a
  // single .catch(logError) so a thrown error surfaces as a log instead of an unhandled rejection.
  // Un-awaited/uncaught fires here previously risked exactly the race P-130's fix eliminated for
  // movePermanentZone: a nested fire clobbering the then-shared engine trigger field out of order
  // (each window now carries its own trigger payload in its environment).
  // The chain is handed to the breeding window, which closes only once it settles: closing it
  // synchronously let the turn machine open Main and fire [Start of Your Main Phase] while
  // BT16-082's move watcher was still resolving.
  // The move is the trigger event: arm its watchers before the OnMove windows, whose rule
  // processing can delete the moved Digimon before they activate (Q2670). The recompute
  // first installs the moved Digimon's own battle-area watchers (Q2668).
  const fired = engine
    .recomputeContinuousEffects()
    .then(async () => {
      const subject = { subjectPermanentId: movedPermanentId };
      const movedWatchers = prepareSubjectFrozenSubTrigger(engine, "whenMovedFromBreeding", subject);
      const opponentMovedWatchers = prepareSubjectFrozenSubTrigger(engine, "whenOpponentMovedFromBreeding", subject);
      await engine.fireTiming(EffectTiming.OnMove, { movedPermanentId });
      await engine.fireTiming(EffectTiming.OnEnterFieldAnyone, { ...subject, entryCause: "move" });
      await engine.fireSubTrigger("onEnterFieldAnyone", { ...subject, entryCause: "move" });
      await movedWatchers();
      await opponentMovedWatchers();
    })
    .catch((err) => {
      logError("[engine] moveFromBreeding fire failed:", err);
    });
  engine.breeding.actionTaken(seat, fired);
  return { ok: true };
}

/**
 * The turn's one breeding action is already taken and its triggers are still settling
 * (BT16-082's reveal, BT17-093's hatch watcher). A decision those triggers opened is the
 * more specific refusal, matching the breeding verbs' own validation order.
 */
export function breedingActionSpentReason(engine: GameEngine): RejectReason {
  return engine.state.pendingDecision !== undefined ? "decision-pending" : "wrong-phase";
}

/**
 * Handle an endPhase during the Breeding phase: the turn player chooses to do
 * nothing, closing the breeding window (§6-4-1-3). Rejected when it is not engine
 * seat's open breeding window.
 */
export function handleBreedingSkip(engine: GameEngine, seat: Seat): IntentResult {
  if (engine.state.gameOver) return { ok: false, reason: "illegal-target" };
  if (engine.state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
  if (engine.state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
  return engine.breeding.skip(seat) ? { ok: true } : { ok: false, reason: "wrong-phase" };
}
