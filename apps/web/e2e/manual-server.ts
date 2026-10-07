import { createServer } from "node:http";
import { Server, createEndpoint, createRouter } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_TYPE_MANUAL, ROOM_TYPE_MANUAL_PRIVATE } from "@aegis/shared";
import { ManualRoom } from "../../api/dist/rooms/ManualRoom.js";
import { roomCodeDirectory } from "../../api/dist/rooms/AegisRoom.js";

export async function startManualServer() {
  const port = Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569);
  const server = new Server({ transport: new WebSocketTransport({ server: createServer() }) });
  server.router = createRouter({
    lookup: createEndpoint("/room/lookup", { method: "POST" }, async ({ body }) => {
      const code = (body as { roomCode: string }).roomCode;
      const roomId = await roomCodeDirectory().resolve(code);
      return new Response(JSON.stringify(roomId ? { roomId } : { error: "room not found" }), {
        status: roomId ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  });
  server.define(ROOM_TYPE_MANUAL, ManualRoom, { manualPrivate: false });
  server.define(ROOM_TYPE_MANUAL_PRIVATE, ManualRoom, { manualPrivate: true });
  await server.listen(port, "127.0.0.1");
  return { endpoint: `ws://127.0.0.1:${port}`, close: () => server.gracefullyShutdown(false) };
}
