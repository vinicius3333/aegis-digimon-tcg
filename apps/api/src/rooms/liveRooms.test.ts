import { afterEach, expect, it, vi } from "vitest";
import { ManualRoom } from "./ManualRoom.js";
import { liveRooms, liveRoomCounts } from "./liveRooms.js";
import { createDeploymentRuntime } from "../deployment/runtime.js";

afterEach(() => liveRooms.clear());
it("keeps manual rooms counted during draining and forgets them on disposal", async () => {
  const room = new ManualRoom();
  room.roomId = "manual-room";
  room.setPrivate = vi.fn(async () => {});
  room.setMetadata = vi.fn(async () => {});
  await room.onCreate({ manualPrivate: false });
  const runtime = createDeploymentRuntime({
    slot: "blue",
    revision: "test",
    adminToken: "",
    activeRooms: () => liveRoomCounts().activeRooms,
    connectedClients: () => liveRoomCounts().connectedClients,
    readiness: async () => true,
  });
  expect(runtime.drain().activeRooms).toBe(1);
  expect(liveRooms.get("manual-room")).toBe(room);
  room.onDispose();
  expect(runtime.status().activeRooms).toBe(0);
});
