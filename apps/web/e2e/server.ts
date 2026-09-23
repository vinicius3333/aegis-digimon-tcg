import { createServer } from "node:http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_TYPE, ROOM_TYPE_BOT } from "@aegis/shared";
import { AegisRoom, roomRegistry } from "../../api/dist/rooms/AegisRoom.js";
import "../../api/dist/cards/index.js";
import { BotPlayer } from "../../api/dist/bot/BotPlayer.js";
import type { DecisionRequest } from "@aegis/shared";

export async function startBrowserServer() {
  const queued: { bot: BotPlayer; request: DecisionRequest }[] = [];
  const originalDecision = BotPlayer.prototype.onDecisionRequested;
  // Test pacing only: keep the real policy and engine, but release each reactive
  // answer after the browser has inspected the open security scene.
  const http = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4175");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.url === "/bot/join" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { roomId } = JSON.parse(body);
      const room = roomRegistry.get(roomId);
      response.writeHead(room?.addBot() ? 200 : 400).end("{}");
      return;
    }
    response.writeHead(404).end();
  });
  const server = new Server({ transport: new WebSocketTransport({ server: http }) });
  server.define(ROOM_TYPE, AegisRoom, { botRoom: false });
  server.define(ROOM_TYPE_BOT, AegisRoom, { botRoom: true });
  await server.listen(2569, "127.0.0.1");
  BotPlayer.prototype.onDecisionRequested = function (request) {
    if (request.options?.timing === "AllTurns") queued.push({ bot: this, request });
    else originalDecision.call(this, request);
  };

  return {
    pendingBotDecision: () => queued[0]?.request,
    releaseBotDecision: () => {
      const next = queued.shift();
      if (!next) throw new Error("No held bot decision");
      originalDecision.call(next.bot, next.request);
    },
    close: async () => {
      BotPlayer.prototype.onDecisionRequested = originalDecision;
      await server.gracefullyShutdown(false);
    },
  };
}
