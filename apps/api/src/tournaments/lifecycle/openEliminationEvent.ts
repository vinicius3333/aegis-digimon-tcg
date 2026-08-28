import { appendTournamentEvent } from "../audit/index.js";
import { derivedUuid } from "../scheduler/DeadlineQueue.js";
import type { ParticipantStore } from "../participants/index.js";
import type { BotSeatingStore } from "../bots/index.js";
import type { BracketView, EliminationStore } from "../elimination/index.js";

/**
 * The one ordering that turns a registration list into a running single-elimination event.
 *
 * Three steps that must happen in this order and no other:
 *
 *  1. **Close check-in.** Everyone who showed up becomes `active` with their deck frozen; everyone
 *     who did not is dropped as a no-show. Only after this does "the confirmed field" mean anything.
 *  2. **Fill with bots, if the event published that it would.** Counted against the confirmed field,
 *     never against registrations, so a no-show produces a bye and not a machine in their seat.
 *     Below the minimum this reports `cancel` and NOTHING is drawn — an event two people short is
 *     cancelled, not completed with bots.
 *  3. **Draw the bracket.** By now the field is final, which is why the seeding never has to be
 *     revisited.
 *
 * This lives here rather than in any of the three stores because none of them should know about the
 * others; it is the seam the tournament manager will absorb when it takes over the lifecycle
 * commands. Idempotent throughout: each step is itself idempotent, so a retry after a partial
 * failure completes the sequence rather than repeating it.
 */
export type OpenEliminationOutcome =
  | { kind: "running"; bracket: BracketView; botsSeated: number }
  | { kind: "cancel"; reason: "below_minimum" }
  | { kind: "failed"; reason: string };

export async function openEliminationEvent(input: {
  tournamentId: string;
  participants: ParticipantStore;
  bots: BotSeatingStore;
  elimination: EliminationStore;
  now?: number;
}): Promise<OpenEliminationOutcome> {
  const now = input.now ?? Date.now();
  // An event that is already running is the finished state of this sequence, not a step to repeat.
  // Check-in itself refuses to close twice, so without this the retry would report a failure for a
  // tournament that is perfectly healthy.
  const published = await input.elimination.bracket(input.tournamentId);
  if (published)
    return { kind: "running", bracket: published, botsSeated: (await input.bots.bots(input.tournamentId)).length };

  const closed = await input.participants.closeCheckIn({ tournamentId: input.tournamentId, now });
  if (!closed.ok) return { kind: "failed", reason: closed.reason };

  const seated = await input.bots.fillAtClose({ tournamentId: input.tournamentId, now });
  if (seated.kind === "cancel") {
    // Recorded, not merely reported. `cancelled` is the state every other entry point gates on, so
    // writing it is what stops a later close from bot-filling an event that was cancelled precisely
    // because it had too few people.
    await input.participants.cancelTournament({
      tournamentId: input.tournamentId,
      reason: seated.reason,
      now,
      audit: async (client, before) => {
        await appendTournamentEvent(client, {
          tournamentId: input.tournamentId,
          actorKind: "system",
          actorId: "system",
          command: "cancel_tournament",
          commandId: derivedUuid(input.tournamentId, "cancel_below_minimum"),
          reason: "the confirmed field was below the minimum and bots could not fill it",
          reasonCode: seated.reason,
          subjectKind: "tournament",
          subjectId: input.tournamentId,
          before: { status: before.status },
          after: { status: "cancelled" },
          now,
        });
      },
    });
    return { kind: "cancel", reason: seated.reason };
  }
  if (seated.kind === "unavailable") return { kind: "failed", reason: seated.reason };

  const bracket = await input.elimination.createBracket({ tournamentId: input.tournamentId });
  if (!bracket.ok) return { kind: "failed", reason: bracket.reason };
  // The field the bracket was drawn from is not the field that registered, and which seats are
  // machines is the single fact a disputed result turns on. Recorded on its own connection, after
  // the seating committed: a failed audit must not undo a drawn bracket, and the derived command id
  // makes a retry a replay.
  if (seated.kind === "seated" && seated.participantIds.length > 0)
    await appendTournamentEvent(input.participants.pool, {
      tournamentId: input.tournamentId,
      actorKind: "system",
      actorId: "system",
      command: "bot_fill",
      commandId: derivedUuid(input.tournamentId, "bot_fill"),
      reason: "the published field was completed with bots at close",
      reasonCode: "bot_fill",
      subjectKind: "tournament",
      subjectId: input.tournamentId,
      after: { seatedBots: seated.participantIds.length },
      now,
    }).catch(() => undefined);
  return {
    kind: "running",
    bracket: bracket.value,
    botsSeated: seated.kind === "seated" ? seated.participantIds.length : 0,
  };
}
