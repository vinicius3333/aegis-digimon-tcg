/* Which entry actions the tournament's published state can support.

   The plan's rule is that the UI never offers an action the server would refuse for a reason the
   client can already see. This module is that check — and only that check. It is NOT authorization:
   the server re-decides every call and its reason codes stay the last word, so anything this file
   cannot prove is left OFFERED rather than hidden.

   The one thing the payload cannot prove is identity. `ParticipantView` carries no account id (see
   `apps/api/.../ParticipantStore.ts#toParticipantView`), so the only join back to the signed-in
   player is the display name. That is ambiguous when two humans share one, so a duplicate name
   yields "unknown" — and unknown always means "offer it and let the server answer", never
   "hide it", so a name clash can cost a wasted request but never a lost action. */

import type { ParticipantView, RegistrationStatus, TournamentStatus } from "@aegis/shared";
import type { TournamentDetail } from "./types";

/** Registration statuses that hold a seat; anything else has left the field. */
const OCCUPYING: readonly RegistrationStatus[] = ["registered", "checked_in", "active"];

/** Tournament statuses in which the server accepts a new participant. */
const REGISTRATION_OPEN: readonly TournamentStatus[] = ["registration"];

/** Tournament statuses in which the server accepts a check-in. */
const CHECK_IN_OPEN: readonly TournamentStatus[] = ["registration", "check_in"];

/**
 * The signed-in player's participant row, or undefined when it cannot be identified — either
 * because nothing matches or because more than one human shares the display name.
 */
export function ownParticipant(
  participants: readonly ParticipantView[],
  displayName: string | undefined,
): ParticipantView | undefined {
  if (!displayName) return undefined;
  const matches = participants.filter(
    (participant) => participant.kind === "human" && participant.displayName === displayName,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export type EntryActions = { register: boolean; checkIn: boolean; drop: boolean };

export function entryActions(detail: TournamentDetail, own: ParticipantView | undefined): EntryActions {
  const identified = own !== undefined;
  const holdsSeat = own !== undefined && OCCUPYING.includes(own.status);
  const full = detail.registeredCount >= detail.maxPlayers;

  return {
    // A seat is only offered while registration is open, the field has room, and we cannot
    // already see the player holding one.
    register: REGISTRATION_OPEN.includes(detail.status) && !full && !holdsSeat && own?.status !== "disqualified",
    // Check-in needs a seat. Unidentified means we cannot rule one out.
    checkIn: CHECK_IN_OPEN.includes(detail.status) && (!identified || own.status === "registered"),
    // Dropping needs a seat too, and there is nothing to drop from once the event has ended.
    drop: detail.status !== "finished" && detail.status !== "cancelled" && (!identified || holdsSeat),
  };
}
