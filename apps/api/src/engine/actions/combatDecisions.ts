import type { GameState, Seat, IntentResult, RejectReason } from "@aegis/shared";
import type { GameStateAccess } from "../state/access.js";
import type { CombatController } from "../combat/controller.js";

/**
 * Combat-decision verb implementations: respondAlliance, respondEvade,
 * respondBarrier. These mirror the block.ts pattern — the CombatController holds
 * the open decision window, and these verbs validate the seat/window and then
 * resolve it.
 */

export interface CombatDecisionDeps {
  readonly state: GameState;
  readonly access: GameStateAccess;
  readonly combat: CombatController;
}

/** Choose an ally (or pass) for ＜Alliance＞ / ＜IceClad＞. */
export function applyRespondAlliance(
  deps: CombatDecisionDeps,
  seat: Seat,
  intent: { allyPermanentId?: string },
): IntentResult {
  const reason = validateRespondAlliance(deps, seat, intent.allyPermanentId);
  if (reason !== null) return { ok: false, reason };
  const accepted = deps.combat.resolveAlliance(seat, intent.allyPermanentId);
  return accepted ? { ok: true } : { ok: false, reason: "illegal-target" };
}

/** Accept or reject ＜Evade＞ suspension-to-prevent-deletion. */
export function applyRespondEvade(
  deps: CombatDecisionDeps,
  seat: Seat,
  intent: { permanentId: string; accept: boolean },
): IntentResult {
  const reason = validateRespondEvade(deps, seat, intent);
  if (reason !== null) return { ok: false, reason };
  const accepted = deps.combat.resolveEvade(seat, intent.permanentId, intent.accept);
  return accepted ? { ok: true } : { ok: false, reason: "illegal-target" };
}

/** Accept or reject ＜Barrier＞ trash-security-to-prevent-deletion. */
export function applyRespondBarrier(
  deps: CombatDecisionDeps,
  seat: Seat,
  intent: { permanentId: string; accept: boolean },
): IntentResult {
  const reason = validateRespondBarrier(deps, seat, intent);
  if (reason !== null) return { ok: false, reason };
  const accepted = deps.combat.resolveBarrier(seat, intent.permanentId, intent.accept);
  return accepted ? { ok: true } : { ok: false, reason: "illegal-target" };
}

// --- validation helpers ---

function validateRespondAlliance(
  deps: CombatDecisionDeps,
  seat: Seat,
  allyPermanentId: string | undefined,
): RejectReason | null {
  const { combat, access } = deps;

  if (!combat.hasOpenAllianceDecision) return "wrong-phase";
  if (combat.allianceDecisionSeat !== seat) return "not-your-turn";

  // Passing (no ally chosen) is always legal when a decision is open.
  if (allyPermanentId === undefined) return null;

  // Validate the chosen ally is still eligible on the live board.
  if (!combat.allianceDecisionEligibleAllyIds?.has(allyPermanentId)) return "illegal-target";

  const ally = access.permanentById(allyPermanentId);
  if (ally === undefined) return "illegal-target";
  if (ally.isSuspended) return "illegal-target";
  if (!access.isBattleAreaDigimon(ally)) return "illegal-target";
  if (access.controllerOf(ally) !== seat) return "illegal-target";

  // Must not be the permanent that triggered the Alliance/IceClad prompt.
  const sourceId = combat.allianceDecisionPermanentId;
  if (allyPermanentId === sourceId) return "illegal-target";

  return null;
}

function validateRespondEvade(
  deps: CombatDecisionDeps,
  seat: Seat,
  intent: { permanentId: string; accept: boolean },
): RejectReason | null {
  const { combat, access } = deps;

  if (!combat.hasOpenEvadeDecision) return "wrong-phase";
  if (combat.evadeDecisionPermanentId !== intent.permanentId) return "illegal-target";

  // Declining is always legal.
  if (!intent.accept) return null;

  const perm = access.permanentById(intent.permanentId);
  if (perm === undefined) return "illegal-target";
  if (perm.isSuspended) return "illegal-target"; // can't pay the suspend cost
  if (access.controllerOf(perm) !== seat) return "not-your-turn";

  return null;
}

function validateRespondBarrier(
  deps: CombatDecisionDeps,
  seat: Seat,
  intent: { permanentId: string; accept: boolean },
): RejectReason | null {
  const { combat, access } = deps;

  if (!combat.hasOpenBarrierDecision) return "wrong-phase";
  if (combat.barrierDecisionPermanentId !== intent.permanentId) return "illegal-target";

  // Declining is always legal.
  if (!intent.accept) return null;

  const perm = access.permanentById(intent.permanentId);
  if (perm === undefined) return "illegal-target";
  if (access.controllerOf(perm) !== seat) return "not-your-turn";
  if (access.securityCount(seat) === 0) return "illegal-target";

  return null;
}
