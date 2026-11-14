import { createServer } from "node:http";
import type { Request, Response, NextFunction } from "express";
import { createRequire } from "node:module";

export async function startManualBrowserServer() {
  const { Server } = await import("colyseus");
  const { createGameTransport } = await import("../../api/dist/connections/createGameTransport.js");
  const { defineAegisRooms } = await import("../../api/dist/rooms/defineAegisRooms.js");
  const { installPrivateRoomRoutes } = await import("../../api/dist/rooms/privateRoomRoutes.js");
  const { installSpectatorRoutes } = await import("../../api/dist/rooms/spectatorRoutes.js");
  const requireApi = createRequire(new URL("../../api/package.json", import.meta.url));
  const express = requireApi("express") as typeof import("express");
  const app = express();
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.header("Access-Control-Allow-Origin", request.headers.origin ?? "*");
    response.header("Access-Control-Allow-Credentials", "true");
    response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
  });
  app.options("/{*path}", (_request: Request, response: Response) => response.sendStatus(204));
  app.use(express.json());
  installPrivateRoomRoutes(app);
  installSpectatorRoutes(app);
  const http = createServer(app);
  const server = new Server({ transport: createGameTransport({ server: http }) });
  defineAegisRooms(server);
  await server.listen(Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569), "127.0.0.1");
  return { close: () => server.gracefullyShutdown(false) };
}
