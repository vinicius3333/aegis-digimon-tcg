/* The target arrow that stays up (`TargetArrow.cs`). The reference client does not
   draw an attack arrow once and drop it: the arrow advances twice,
   then persists, re-solving both ends every frame so it keeps pointing at the
   cards as they move, suspend and resize.

   Two things earn one, and both are named by the protocol:
   - an attack, from `attackDeclared` until the combat that closes it, and
   - an effect the viewer is targeting, from the open `chooseTargets` decision's
     own `sourceCardId` to the targets that have actually been picked.

   Nothing here decides legality or measures anything: it reads the event log and
   the open decision, and the caller measures the elements the ids name. */

import type { DecisionRequest, Seat, ServerEvent } from "@aegis/shared";
import { eventIdentity } from "../net/eventIdentity";
import { eventsAfter } from "./boardModel";

export function attackDeclarationKey(event: Extract<ServerEvent, { kind: "attackDeclared" }>): string {
  return `attack:${eventIdentity(event)}:${event.attackerPermanentId}`;
}

export type TrackingArrowKind = "attack" | "effect";

/** Where an arrow ends: a permanent on the board, or a player's security stack. */
export type ArrowEndpoint = { kind: "permanent"; permanentId: string } | { kind: "security"; seat: Seat };

export interface TrackingArrow {
  kind: TrackingArrowKind;
  /** Changes whenever a different arrow takes over, which restarts the sweeps. */
  key: string;
  from: { kind: "permanent"; permanentId: string };
  to: readonly ArrowEndpoint[];
}

/**
 * Events that close an attack. A block redirects rather than ends it, so the arrow
 * survives one and is re-pointed by the `blocked` event itself. `attackEnded` is the only
 * close an attack with no battle and no checked card sends (＜Security Attack -1＞).
 */
function closesAttack(event: ServerEvent): boolean {
  return (
    event.kind === "attackEnded" ||
    event.kind === "combatResolved" ||
    event.kind === "securityChecked" ||
    event.kind === "turnEnded" ||
    event.kind === "phaseChanged"
  );
}

/**
 * The open attack arrow after `event`: a declaration puts one up, a redirect and a block
 * re-aim the one already up, and anything that ends the attack takes it down.
 */
function advanceArrow(arrow: TrackingArrow | null, event: ServerEvent): TrackingArrow | null {
  if (closesAttack(event)) return null;
  if (event.kind === "attackDeclared") {
    // A player attack names no seat: the stack under attack is the other one's.
    const target: ArrowEndpoint =
      event.target.kind === "player"
        ? { kind: "security", seat: (event.seat === 0 ? 1 : 0) as Seat }
        : { kind: "permanent", permanentId: event.target.permanentId };
    // A redirect re-aims the arrow the declaration already put up, the way a block does:
    // keeping the key stops the sweeps from replaying for an attack that never restarted.
    if (event.redirected === true && arrow !== null) return { ...arrow, to: [target] };
    return {
      kind: "attack",
      key: attackDeclarationKey(event),
      from: { kind: "permanent", permanentId: event.attackerPermanentId },
      to: [target],
    };
  }
  if (event.kind === "blocked" && arrow !== null) {
    return { ...arrow, to: [{ kind: "permanent", permanentId: event.blockerPermanentId }] };
  }
  return arrow;
}

/**
 * The attack arrow currently live, or null when no declared attack is still open.
 * A declaration on a player points at that player's security stack; a declaration
 * on a Digimon points at the permanent, and a block moves the point to the blocker.
 */
export function activeAttackArrow(events: readonly ServerEvent[]): TrackingArrow | null {
  let arrow: TrackingArrow | null = null;
  for (const event of events) {
    arrow = advanceArrow(arrow, event);
  }
  return arrow;
}

/** Preserve an open declaration even after it falls out of the room's 100-event log. */
export function createAttackArrowTracker() {
  let arrow: TrackingArrow | null = null;
  let previous: ServerEvent | undefined;
  return {
    read(events: readonly ServerEvent[]): TrackingArrow | null {
      if (events.length === 0) {
        arrow = null;
        previous = undefined;
      }
      for (const event of eventsAfter(events, previous)) arrow = advanceArrow(arrow, event);
      previous = events.at(-1);
      return arrow;
    },
  };
}

/** The latest declaration, including its redirects, retained across its close seam. */
export function mostRecentAttackArrow(events: readonly ServerEvent[]): TrackingArrow | null {
  let arrow: TrackingArrow | null = null;
  let latest: TrackingArrow | null = null;
  for (const event of events) {
    arrow = advanceArrow(arrow, event);
    if (arrow) latest = arrow;
  }
  return latest;
}

/**
 * The arrow from the card whose effect is asking for targets to the targets the
 * viewer has picked so far. Drawn only for the seat being asked, and only for
 * picks the server itself offered as candidates.
 */
export function effectTargetArrow({
  decision,
  picks,
  viewerSeat,
  sourcePermanentId,
}: {
  decision: DecisionRequest | undefined;
  picks: readonly string[];
  viewerSeat: Seat;
  /** The source card's own board position, when it has one; without it there is no tail to draw from. */
  sourcePermanentId: string | undefined;
}): TrackingArrow | null {
  if (
    !decision ||
    decision.options?.selectionContext === "attackSource" ||
    (decision.kind !== "chooseTargets" && decision.options?.selectionContext !== "attackTarget") ||
    decision.seat !== viewerSeat
  )
    return null;
  if (!sourcePermanentId) return null;
  const candidates = new Set(decision.options?.candidateInstanceIds ?? []);
  const to = picks
    .filter((id) => candidates.has(id))
    .map((id) =>
      decision.options?.selectionContext === "attackTarget" && (id === "player" || id === "opponent")
        ? { kind: "security" as const, seat: (1 - viewerSeat) as Seat }
        : { kind: "permanent" as const, permanentId: id },
    );
  if (to.length === 0) return null;
  return {
    kind: "effect",
    key: `effect:${decision.decisionId}:${picks.join(",")}`,
    from: { kind: "permanent", permanentId: sourcePermanentId },
    to,
  };
}
