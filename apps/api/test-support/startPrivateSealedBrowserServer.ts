import { getPrivateSealedResults } from "../dist/rooms/sealed/getPrivateSealedResults.js";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { Server } from "colyseus";
import { Pool } from "pg";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { AegisRoom, roomRegistry } from "../dist/rooms/AegisRoom.js";
import { createGameTransport } from "../dist/connections/createGameTransport.js";
import { installPrivateSealedRoutes } from "../dist/rooms/sealed/installPrivateSealedRoutes.js";
import { installPrivateRoomRoutes } from "../dist/rooms/privateRoomRoutes.js";
import { installAccountRoutes } from "../dist/accounts/routes.js";
import { PrivateSealedStore } from "../dist/rooms/sealed/PrivateSealedStore.js";
import "../dist/cards/index.js";

type Params = { connectionString: string | undefined; port: number };
export async function startPrivateSealedBrowserServer({ connectionString, port }: Params) {
  const config = getSealedTestPoolConfig(connectionString);
  const schema = `private_browser_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool(config);
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
  const accounts = new AccountStore(pool);
  await accounts.ensureReady();
  class PrivateRoom extends AegisRoom {
    protected override accounts() {
      return accounts;
    }
  }
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  app.options("/{*path}", (_req, res) => {
    res.sendStatus(204);
  });
  installAccountRoutes(app, accounts);
  installPrivateRoomRoutes(app);
  installPrivateSealedRoutes({ app, accounts });
  const http = createServer(app);
  const server = new Server({ transport: createGameTransport({ server: http }), gracefullyShutdown: false });
  server.define("aegis_private_sealed", PrivateRoom, { privateSealedRoom: true });
  server.define("aegis_private", PrivateRoom, { private: true, privateSealedRoom: false, betaBattleRoom: true });
  await server.listen(port, "127.0.0.1");
  return {
    accounts,
    pool,
    sealed: new PrivateSealedStore(accounts),
    rooms: roomRegistry,
    close: async () => {
      await server.gracefullyShutdown(false);
      await getPrivateSealedResults({ accounts }).close();
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
