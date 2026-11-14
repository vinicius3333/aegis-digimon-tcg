import { ownHttpRouteBodies } from "./ownHttpRouteBodies.js";
import type { AccountStore } from "../dist/accounts/AccountStore.js";
import type { SocialService } from "../dist/social/SocialService.js";
import { socialRuntime } from "../dist/social/socialRuntime.js";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import express from "express";
import { LocalPresence, LocalDriver, Room, Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_MESSAGE_LIMITS } from "@aegis/shared/protocol/gameMessageLimits";
import type { Pool } from "pg";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { createSocialBrowserDatabase } from "./createSocialBrowserDatabase.js";
import { OwnedLocalPresence } from "./OwnedLocalPresence.js";

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
    for (const client of this.wss.clients) {
      try {
        client.terminate();
      } catch (error) {
        errors.push(error);
      }
    }
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
export async function startSocialOwnedBrowserServer({ connectionString, port }: Params) {
  getSealedTestPoolConfig(connectionString);
  if (retired) throw new Error("Social browser runtime process is retired");
  if (active) throw new Error("Social browser runtime is already owned");
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
  if (socialRuntime.service !== undefined) throw new Error("Foreign social runtime detected");
  active = true;
  let database: Awaited<ReturnType<typeof createSocialBrowserDatabase>> | undefined;
  let pool: Pool | undefined;
  let accounts: AccountStore | undefined;
  let service: SocialService | undefined;
  let http: ReturnType<typeof createServer> | undefined;
  let transport: OwnedTransport | undefined;
  let presence: OwnedLocalPresence | undefined;
  let driver: LocalDriver | undefined;
  let constructed = false;
  let server: Server | undefined;
  const socialRooms = new Set<{ onDispose(): Promise<void> }>();
  const httpBodies = ownHttpRouteBodies(express());
  let closing: Promise<void> | undefined;
  const listenerErrors: unknown[] = [];
  let started = false;
  let rejectListening: ((error: unknown) => void) | undefined;
  function onHttpError(error: Error) {
    retired = true;
    if (!started) {
      rejectListening?.(error);
    } else {
      listenerErrors.push(error);
      void close().catch(() => undefined);
    }
  }
  function close(): Promise<void> {
    closing ??= (async () => {
      httpBodies.retire();
      const errors = listenerErrors;
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
          errors.push(new Error("Social browser runtime ownership lost"));
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
      for (const room of socialRooms) await attempt(() => room.onDispose());
      if (service && socialRuntime.service === service) socialRuntime.service = undefined;
      if (presence) await attempt(() => presence!.shutdown());
      if (presence) await attempt(() => presence!.dispose());
      if (driver) await attempt(() => driver!.shutdown());
      if (database) await attempt(() => database!.close());
      if (errors.length > 0) retired = true;
      if (!retired) {
        if (ownedServer && ownedPresence && ownedDriver)
          previous = { server: ownedServer, presence: ownedPresence, driver: ownedDriver };
        active = false;
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, "Social browser cleanup failed");
    })();
    return closing;
  }
  try {
    const { AccountStore } = await import("../dist/accounts/AccountStore.js");
    const { AegisRoom } = await import("../dist/rooms/AegisRoom.js");
    const { SocialRoom } = await import("../dist/social/SocialRoom.js");
    const { SocialService } = await import("../dist/social/SocialService.js");
    const { resolveSocialInviteRoom } = await import("../dist/social/resolveSocialInviteRoom.js");
    const { ReplayLibrary } = await import("../dist/replays/ReplayLibrary.js");
    const { defineAegisRooms } = await import("../dist/rooms/defineAegisRooms.js");
    const { installAccountRoutes } = await import("../dist/accounts/routes.js");
    const { installPrivateRoomRoutes } = await import("../dist/rooms/privateRoomRoutes.js");
    const { installSpectatorRoutes } = await import("../dist/rooms/spectatorRoutes.js");
    await import("../dist/cards/index.js");
    database = await createSocialBrowserDatabase(connectionString);
    pool = database.pool;
    const initializedAccounts = new AccountStore(pool);
    accounts = initializedAccounts;
    await accounts.ensureReady();
    presence = new OwnedLocalPresence();
    const initializedService = new SocialService({
      accounts,
      presence,
      resolveRoom: resolveSocialInviteRoom,
    });
    service = initializedService;
    socialRuntime.service = initializedService;
    const replays = new ReplayLibrary(accounts);
    class FriendsRoom extends SocialRoom {
      override onCreate() {
        if (closing) throw new Error("Social browser runtime is closing");
        socialRooms.add(this);
        super.onCreate();
      }
      protected override createSocialService() {
        return initializedService;
      }
    }
    class PrivateRoom extends AegisRoom {
      protected override replays() {
        return replays;
      }
      protected override accounts() {
        return initializedAccounts;
      }
    }
    const app = httpBodies.app;
    app.use(express.json());
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", req.headers.origin ?? "*");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      next();
    });
    app.options("/{*path}", (_req, res) => {
      res.sendStatus(204);
    });
    installAccountRoutes(app, accounts);
    installPrivateRoomRoutes(app);
    installSpectatorRoutes(app);
    http = createServer(app);
    http.on("error", onHttpError);
    transport = new OwnedTransport({
      server: http,
      maxPayload: GAME_MESSAGE_LIMITS.maxMessageBytes,
    });
    driver = new LocalDriver();
    constructed = true;
    server = new Server({ transport, presence, driver, gracefullyShutdown: false });
    defineAegisRooms({
      define: new Proxy(server.define, {
        apply(target, _receiver, args) {
          return Reflect.apply(
            target,
            server,
            args.map((argument) =>
              argument === AegisRoom ? PrivateRoom : argument === SocialRoom ? FriendsRoom : argument,
            ),
          );
        },
      }),
    });
    const listeningFailed = new Promise<never>((_, reject) => {
      rejectListening = reject;
    });
    await Promise.race([server.listen(port, "127.0.0.1"), listeningFailed]);
    started = true;
    return {
      accounts,
      pool,
      close,
    };
  } catch (error) {
    retired = true;
    try {
      await close();
    } catch (cleanupError) {
      retired = true;
      throw new AggregateError([error, cleanupError], "Social browser startup and cleanup failed", {
        cause: error,
      });
    }
    throw error;
  }
}
