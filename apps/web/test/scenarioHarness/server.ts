/**
 * Boots a real Colyseus server in-process, hosting the real `AegisRoom` (the
 * same class the production api runs — apps/api/src/index.ts wires it up
 * identically), on an OS-assigned ephemeral port. Scenario tests connect to
 * it with a real colyseus.js client over a real websocket; nothing here is
 * mocked.
 */
import { createServer, type Server as HttpServer } from "node:http";
import { Server as ColyseusServer } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_TYPE, ROOM_TYPE_PRIVATE } from "@aegis/shared";
import { AegisRoom } from "@aegis-api/rooms/AegisRoom.js";
// Side-effect import: registers every implemented card EffectModule, exactly as
// apps/api/src/index.ts does at real server boot.
import "@aegis-api/cards/index.js";

export interface TestServer {
  endpoint: string;
  close: () => Promise<void>;
}

/** Starts a fresh AegisRoom-hosting Colyseus server on an ephemeral port. */
export async function startTestServer(): Promise<TestServer> {
  const httpServer: HttpServer = createServer();
  const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define(ROOM_TYPE, AegisRoom);
  gameServer.define(ROOM_TYPE_PRIVATE, AegisRoom);

  await gameServer.listen(0);
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("test server failed to bind an ephemeral port");
  }

  return {
    endpoint: `ws://127.0.0.1:${address.port}`,
    close: async () => {
      await gameServer.gracefullyShutdown(false);
      httpServer.close();
    },
  };
}
