import { ownHttpRouteBodies } from "./ownHttpRouteBodies.js";
import type { AccountStore } from "../dist/accounts/AccountStore.js";
import type { getPrivateSealedResults } from "../dist/rooms/sealed/getPrivateSealedResults.js";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import express from "express";
import { LocalPresence, LocalDriver, Room, Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_MESSAGE_LIMITS } from "@aegis/shared/protocol/gameMessageLimits";
import type { Pool } from "pg";
import { createPrivateBrowserDatabase } from "./createPrivateBrowserDatabase.js";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";

let active = false;
let retired = false;
let previous: { server: Server; presence: LocalPresence; driver: LocalDriver } | undefined;

async function awaitOwnedClosure(receipt: Promise<void>, resource: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      receipt,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${resource} owned closure did not complete`)), 500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

class OwnedTransport extends WebSocketTransport {
  private readonly closed = new Promise<void>((resolve) => this.wss.once("close", resolve));
  private readonly sockets = new Set<Socket>();
  constructor(...args: ConstructorParameters<typeof WebSocketTransport>) {
    super(...args);
    this.server?.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.once("close", () => this.sockets.delete(socket));
    });
  }
  closeWebSockets(errors: unknown[]) {
    let failedClient = false;
    for (const client of this.wss.clients) {
      try {
        client.terminate();
      } catch (error) {
        errors.push(error);
        failedClient = true;
      }
    }
    if (failedClient)
      for (const socket of this.sockets) {
        try {
          socket.destroy();
        } catch (error) {
          errors.push(error);
        }
      }
    try {
      this.wss.close();
    } catch (error) {
      errors.push(error);
    }
  }
  awaitWebSockets() {
    return awaitOwnedClosure(this.closed, "WSS");
  }
}

type Params = { connectionString: string | undefined; port: number };
export async function startPrivateSealedBrowserServer({ connectionString, port }: Params) {
  getSealedTestPoolConfig(connectionString);
  if (retired) throw new Error("Private browser runtime process is retired");
  if (active) throw new Error("Private browser runtime is already owned");
  if (previous) {
    if (
      Server.current !== previous.server ||
      matchMaker.presence !== previous.presence ||
      matchMaker.driver !== previous.driver ||
      matchMaker.state !== matchMaker.MatchMakerState.SHUTTING_DOWN
    ) {
      throw new Error("Foreign Colyseus runtime detected");
    }
  } else if (
    Server.current !== undefined ||
    matchMaker.state !== undefined ||
    matchMaker.presence !== undefined ||
    matchMaker.driver !== undefined
  ) {
    throw new Error("Foreign Colyseus runtime detected");
  }
  active = true;
  let database: Awaited<ReturnType<typeof createPrivateBrowserDatabase>> | undefined;
  let pool: Pool | undefined;
  let accounts: AccountStore | undefined;
  let results: ReturnType<typeof getPrivateSealedResults> | undefined;
  let http: ReturnType<typeof createServer> | undefined;
  let transport: OwnedTransport | undefined;
  let presence: LocalPresence | undefined;
  let driver: LocalDriver | undefined;
  let constructed = false;
  let server: Server | undefined;
  const httpBodies = ownHttpRouteBodies(express());
  let closing: Promise<void> | undefined;
  function close(): Promise<void> {
    closing ??= (async () => {
      httpBodies.retire();
      const errors: unknown[] = [];
      async function attempt(operation: () => unknown) {
        try {
          await operation();
        } catch (error) {
          errors.push(error);
        }
      }
      const ownedPresence = presence;
      const ownedDriver = driver;
      const ownedServer =
        server ??
        (constructed &&
        Server.current?.options.presence === ownedPresence &&
        Server.current?.options.driver === ownedDriver
          ? Server.current
          : undefined);
      let httpClosed: Promise<void> | undefined;
      let resolveHttp: (() => void) | undefined;
      if (http)
        httpClosed = new Promise<void>((resolve) => {
          resolveHttp = resolve;
          http!.once("close", resolve);
        });
      if (transport) await attempt(() => transport!.shutdown());
      if (transport) transport.closeWebSockets(errors);
      if (http) {
        await attempt(() =>
          http!.close((error) => {
            if (error && !("code" in error && error.code === "ERR_SERVER_NOT_RUNNING")) {
              errors.push(error);
            }
            resolveHttp?.();
          }),
        );
        await attempt(() => http!.closeAllConnections());
      }
      if (transport) await attempt(() => transport!.awaitWebSockets());
      if (httpClosed) await attempt(() => awaitOwnedClosure(httpClosed!, "HTTP"));
      await attempt(() => httpBodies.drain());
      if (constructed) {
        if (
          !ownedServer ||
          matchMaker.presence !== ownedPresence ||
          matchMaker.driver !== ownedDriver ||
          Server.current !== ownedServer
        ) {
          errors.push(new Error("Private browser runtime ownership lost"));
        } else {
          const rooms: Room[] = [];
          await attempt(async () => {
            if (ownedDriver)
              for (const { roomId } of await ownedDriver.query({})) {
                const room = matchMaker.getLocalRoomById(roomId);
                if (room) rooms.push(room);
              }
          });
          const before = errors.length;
          await attempt(() => matchMaker.gracefullyShutdown());
          if (errors.length !== before) {
            for (const room of rooms) await attempt(() => room.disconnect());
          }
        }
      }
      if (presence) await attempt(() => presence!.shutdown());
      if (driver) await attempt(() => driver!.shutdown());
      if (results) await attempt(() => results!.close());
      if (database) await attempt(() => database!.close());
      if (errors.length > 0) retired = true;
      if (!retired) {
        if (ownedServer && ownedPresence && ownedDriver)
          previous = { server: ownedServer, presence: ownedPresence, driver: ownedDriver };
        active = false;
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, "Private browser cleanup failed");
    })();
    return closing;
  }
  try {
    const { getPrivateSealedResults } = await import("../dist/rooms/sealed/getPrivateSealedResults.js");
    const { AccountStore } = await import("../dist/accounts/AccountStore.js");
    const { AegisRoom, roomRegistry } = await import("../dist/rooms/AegisRoom.js");
    const { installPrivateSealedRoutes } = await import("../dist/rooms/sealed/installPrivateSealedRoutes.js");
    const { installPrivateRoomRoutes } = await import("../dist/rooms/privateRoomRoutes.js");
    const { installMatchQueueRoutes } = await import("../dist/matchmaking/installMatchQueueRoutes.js");
    const { installAccountRoutes } = await import("../dist/accounts/routes.js");
    const { PrivateSealedStore } = await import("../dist/rooms/sealed/PrivateSealedStore.js");
    await import("../dist/cards/index.js");
    database = await createPrivateBrowserDatabase(connectionString);
    pool = database.pool;
    const initializedAccounts = new AccountStore(pool);
    accounts = initializedAccounts;
    await accounts.ensureReady();
    results = getPrivateSealedResults({ accounts });
    class PrivateRoom extends AegisRoom {
      protected override accounts() {
        return initializedAccounts;
      }
    }
    const app = httpBodies.app;
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
    installMatchQueueRoutes({ app });
    installPrivateRoomRoutes(app);
    installPrivateSealedRoutes({ app, accounts });
    http = createServer(app);
    transport = new OwnedTransport({
      server: http,
      maxPayload: GAME_MESSAGE_LIMITS.maxMessageBytes,
    });
    presence = new LocalPresence();
    driver = new LocalDriver();
    constructed = true;
    server = new Server({ transport, presence, driver, gracefullyShutdown: false });
    server.define("aegis_private_sealed", PrivateRoom, { privateSealedRoom: true });
    server.define("aegis_private", PrivateRoom, {
      private: true,
      privateSealedRoom: false,
      betaBattleRoom: true,
    });
    await server.listen(port, "127.0.0.1");
    return {
      accounts,
      pool,
      sealed: new PrivateSealedStore(accounts),
      rooms: roomRegistry,
      close,
    };
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Private browser startup and cleanup failed", { cause: error });
    }
    throw error;
  }
}
