import type { Seat } from "@aegis/shared";
import type { StateSnapshot } from "../../net/presentedState";
import type { HeldDeletion } from "./types";

/**
 * The deleted permanent as the board last showed it, from the newest snapshot that still
 * has it. The batch that deletes it never does, so the search walks back from there; with
 * no snapshot to find it in, the card cannot be held and leaves as the board says.
 */
export function heldDeletionFrom({
  snapshots,
  seat,
  permanentId,
}: {
  snapshots: readonly StateSnapshot[];
  /** The owner when the event names one; otherwise both seats are searched. */
  seat: Seat | undefined;
  permanentId: string;
}): HeldDeletion | undefined {
  for (let cursor = snapshots.length - 1; cursor >= 0; cursor -= 1) {
    const players = snapshots[cursor]!.state.players;
    for (const [playerSeat, player] of players.entries()) {
      if (seat !== undefined && playerSeat !== seat) continue;
      const index = player.battleArea.findIndex((permanent) => permanent.permanentId === permanentId);
      if (index < 0) continue;
      return { seat: playerSeat as Seat, permanent: player.battleArea[index]!, index, trash: player.trash };
    }
  }
  return undefined;
}
