import { type IntentResult, type Seat } from "@aegis/shared";
import { logError } from "../../../logger.js";
import {
  applyDigivolve,
  applyDnaDigivolve,
  applyLinkCard,
  type DigivolveIntent,
  type DnaDigivolveIntent,
  type LinkCardIntent,
  validateDigivolve,
  validateDnaDigivolve,
  validateLinkCard,
} from "../../actions/index.js";
import { mapDigivolveReason, mapDnaDigivolveReason, mapLinkReason } from "../rejectionReasons.js";
import { digivolveDeps, dnaDigivolveDeps, linkCardDeps } from "../actionDeps.js";
import type { GameEngine } from "../../GameEngine.js";
import { continueMainVerb } from "./router.js";

export function handleDigivolve(engine: GameEngine, seat: Seat, intent: DigivolveIntent): IntentResult {
  const deps = digivolveDeps(engine);
  const check = validateDigivolve(engine.state, seat, intent, deps, { deferAffordability: true });
  if (!check.ok) {
    return { ok: false, reason: mapDigivolveReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyDigivolve(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] digivolve apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "digivolve",
        reason: err instanceof Error ? err.message : "digivolve-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the linkCard verb (subsystem: link; §6-5-1-4/§10-1 — the hand half only,
 * see actions/link.ts). Validates synchronously to produce the immediate
 * IntentResult the room returns to the client; on success, applies the action as a
 * continuation (the Link primitive can await the `whenLinked` SubTrigger bus),
 * matching the pattern of the other Main-phase verbs above.
 */
export function handleLinkCard(engine: GameEngine, seat: Seat, intent: LinkCardIntent): IntentResult {
  const deps = linkCardDeps(engine);
  const check = validateLinkCard(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapLinkReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyLinkCard(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] linkCard apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "linkCard",
        reason: err instanceof Error ? err.message : "linkCard-apply-error",
      });
    },
  );
  return { ok: true };
}

/**
 * Route the dnaDigivolve verb (subsystem: dna-digivolve; §8-2 DNA digivolution as a
 * player-declared action — see actions/dnaDigivolve.ts). Validates synchronously to
 * produce the immediate IntentResult the room returns to the client; on success, applies
 * the action as a continuation (the merge primitive draws and fires WhenDigivolving),
 * matching the pattern of the other Main-phase verbs above.
 */
export function handleDnaDigivolve(engine: GameEngine, seat: Seat, intent: DnaDigivolveIntent): IntentResult {
  const deps = dnaDigivolveDeps(engine);
  const check = validateDnaDigivolve(engine.state, seat, intent, deps);
  if (!check.ok) {
    return { ok: false, reason: mapDnaDigivolveReason(check.reason) };
  }
  continueMainVerb(
    engine,
    () => applyDnaDigivolve(engine.state, seat, intent, deps),
    () => {},
    (err) => {
      logError("[engine] dnaDigivolve apply failed:", err);
      engine.hooks.emit({
        kind: "actionRejected",
        intent: "dnaDigivolve",
        reason: err instanceof Error ? err.message : "dnaDigivolve-apply-error",
      });
    },
  );
  return { ok: true };
}
