import { matchMaker } from "colyseus";
import { ROOM_TYPE } from "@aegis/shared";
import type { RoomHandoffStore } from "../db/roomHandoff/RoomHandoffStore.js";
import { roomRegistry } from "../rooms/AegisRoom.js";
import type { RoomHandoffRoomPort } from "./roomHandoff.js";

/** Colyseus bridge for the API coordinator; cross-process room calls remain server-private. */
export function createAegisRoomHandoffPorts(input: {
  store: Pick<RoomHandoffStore, "countPendingTasksByGeneration">;
  generationId: string;
}): RoomHandoffRoomPort {
  return {
    inspectSource: async ({ session }) =>
      matchMaker.remoteRoomCall<{ eligible: boolean; reasonCode?: string }>(
        session.owner.roomId,
        "inspectHandoffCompatibility",
        [session.sessionId],
      ),
    reserveDestination: async ({ ownerEpoch, reservationToken }) => {
      const listing = await matchMaker.createRoom(ROOM_TYPE, {
        handoffPrepared: true,
        handoffOwnerEpoch: ownerEpoch,
        handoffReservationToken: reservationToken,
      });
      if (!listing.roomId || !listing.processId) throw new Error("prepared_destination_unavailable");
      return {
        generationId: input.generationId,
        processId: listing.processId,
        roomId: listing.roomId,
      };
    },
    freezeSource: async ({ roomId, ownerEpoch, transferId }) =>
      matchMaker.remoteRoomCall<boolean>(roomId, "freezeForHandoff", [ownerEpoch, transferId]),
    saveSourceCheckpoint: async ({ roomId, ...input }) =>
      matchMaker.remoteRoomCall<boolean>(roomId, "saveStoppedMainCheckpoint", [input]),
    validateDestination: async ({ roomId, ...input }) =>
      matchMaker.remoteRoomCall<boolean>(roomId, "prepareFromHandoffCheckpoint", [input]),
    activateDestination: async ({ roomId, ownerEpoch }) =>
      matchMaker.remoteRoomCall<boolean>(roomId, "activatePreparedHandoff", [ownerEpoch]),
    disposeSource: async ({ roomId, ownerEpoch }) => {
      const [listing] = await matchMaker.query({ roomId });
      if (!listing) return true;
      return matchMaker.remoteRoomCall<boolean>(roomId, "disposeAfterHandoff", [ownerEpoch]);
    },
    unfreezeSource: async ({ roomId }) => matchMaker.remoteRoomCall<boolean>(roomId, "unfreezeAfterAbortedHandoff", []),
    discardDestination: async ({ roomId }) => {
      const [listing] = await matchMaker.query({ roomId });
      if (!listing) return true;
      const room = roomRegistry.get(roomId);
      if (room) {
        await room.disconnect();
        return true;
      }
      await matchMaker.remoteRoomCall<void>(roomId, "disconnect", []);
      return true;
    },
    authoritativePendingTasks: async (generationId) => {
      const pending = await input.store.countPendingTasksByGeneration(generationId);
      const counts = [pending.commands, pending.outbox, pending.transfers, pending.total];
      if (
        counts.some((count) => !Number.isSafeInteger(count) || count < 0) ||
        pending.total !== pending.commands + pending.outbox + pending.transfers
      )
        throw new Error("room_handoff_pending_task_count_invalid");
      return pending.total;
    },
  };
}
