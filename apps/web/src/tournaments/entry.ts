import type { ParticipantView, RegistrationStatus, TournamentStatus } from "@aegis/shared";
import type { TournamentDetail } from "./types";

/** Registration statuses that hold a seat; anything else has left the field. */
const OCCUPYING: readonly RegistrationStatus[] = ["registered", "checked_in", "active"];

/** Tournament statuses in which the server accepts a new participant. */
const REGISTRATION_OPEN: readonly TournamentStatus[] = ["registration"];

/** Tournament statuses in which the server accepts a check-in. */
const CHECK_IN_OPEN: readonly TournamentStatus[] = ["registration", "check_in"];

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
    drop: detail.status !== "finished" && detail.status !== "cancelled" && holdsSeat,
  };
}
