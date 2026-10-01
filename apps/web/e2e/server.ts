import { createServer } from "node:http";
import { Server, createEndpoint, createRouter } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_TYPE, ROOM_TYPE_BOT } from "@aegis/shared";
import { AegisRoom, roomRegistry } from "../../api/dist/rooms/AegisRoom.js";
import "../../api/dist/cards/index.js";
import { BotPlayer } from "../../api/dist/bot/BotPlayer.js";
import type { DecisionRequest } from "@aegis/shared";
import { Edge } from "./edge";

const EDGE_PORT = 2569;
const SERVER_PORT = 2570;

export async function startBrowserServer() {
  const queued: { bot: BotPlayer; request: DecisionRequest }[] = [];
  const originalDecision = BotPlayer.prototype.onDecisionRequested;
  const http = createServer();
  const server = new Server({ transport: new WebSocketTransport({ server: http }) });
  // Colyseus 404s unknown routes itself, so a second request listener would double-respond.
  server.router = createRouter({
    botJoin: createEndpoint("/bot/join", { method: "POST" }, async (context) => {
      const { roomId } = context.body as { roomId: string };
      return new Response("{}", { status: roomRegistry.get(roomId)?.addBot() ? 200 : 400 });
    }),
  });
  server.define(ROOM_TYPE, AegisRoom, { botRoom: false });
  server.define(ROOM_TYPE_BOT, AegisRoom, { botRoom: true });
  await server.listen(SERVER_PORT, "127.0.0.1");
  const edge = new Edge(EDGE_PORT, SERVER_PORT);
  await edge.start();
  // Test pacing only: hold each reactive answer until the browser has inspected the scene.
  BotPlayer.prototype.onDecisionRequested = function (request) {
    if (request.options?.timing === "AllTurns") queued.push({ bot: this, request });
    else originalDecision.call(this, request);
  };

  return {
    edge,
    /** Bypasses the edge, so it survives `edge.stop()`. */
    directEndpoint: `ws://127.0.0.1:${SERVER_PORT}`,
    pendingBotDecision: () => queued[0]?.request,
    releaseBotDecision: () => {
      const next = queued.shift();
      if (!next) throw new Error("No held bot decision");
      originalDecision.call(next.bot, next.request);
    },
    close: async () => {
      BotPlayer.prototype.onDecisionRequested = originalDecision;
      await edge.stop();
      await server.gracefullyShutdown(false);
    },
  };
}
