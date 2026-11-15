import { ownHttpRouteBodies } from "./ownHttpRouteBodies.js";
import { createServer } from "node:http";
import express from "express";
import type { Socket } from "node:net";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_MESSAGE_LIMITS } from "@aegis/shared/protocol/gameMessageLimits";
import { LocalDriver, Server, matchMaker } from "colyseus";
import { OwnedLocalPresence } from "./OwnedLocalPresence.js";
import { createSocialBrowserDatabase } from "./createSocialBrowserDatabase.js";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { ROOM_TYPE_TOURNAMENT } from "@aegis/shared/protocol/messages";

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

export async function startSealedSwissBrowserServer({ connectionString, port }: Params) {
  getSealedTestPoolConfig(connectionString);
  const { AccountStore } = await import("../dist/accounts/AccountStore.js");
  const { installAccountRoutes } = await import("../dist/accounts/routes.js");
  const { AegisRoom, roomRegistry } = await import("../dist/rooms/AegisRoom.js");
  const { ParticipantStore } = await import("../dist/tournaments/participants/ParticipantStore.js");
  const { SeriesStore } = await import("../dist/tournaments/series/SeriesStore.js");
  const { SwissProgram } = await import("../dist/tournaments/swiss/SwissProgram.js");
  const { SealedStore } = await import("../dist/tournaments/sealed/SealedStore.js");
  const { ReplayLibrary } = await import("../dist/replays/ReplayLibrary.js");
  await import("../dist/cards/index.js");
  const { SocialRoom } = await import("../dist/social/SocialRoom.js");
  const { SocialService } = await import("../dist/social/SocialService.js");
  const { socialRuntime } = await import("../dist/social/socialRuntime.js");
  const { resolveSocialInviteRoom } = await import("../dist/social/resolveSocialInviteRoom.js");
  const { ROOM_TYPE_SOCIAL } = await import("@aegis/shared/protocol/roomTypeSocial");
  if (
    Server.current !== undefined ||
    matchMaker.state !== undefined ||
    matchMaker.presence !== undefined ||
    matchMaker.driver !== undefined
  ) {
    throw new Error("Swiss browser requires a fresh Colyseus worker");
  }
  const previousSocialService = socialRuntime.service;
  let socialService: InstanceType<typeof SocialService> | undefined;
  const presence = new OwnedLocalPresence();
  let database: Awaited<ReturnType<typeof createSocialBrowserDatabase>> | undefined;
  const driver = new LocalDriver();
  let transport: OwnedTransport | undefined;
  let server: Server | undefined;
  let http: ReturnType<typeof createServer> | undefined;
  const socialRooms = new Set<{ onDispose(): Promise<void> }>();
  const httpBodies = ownHttpRouteBodies(express());
  let closing: Promise<void> | undefined;
  const close = () => {
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
      let httpClosed: Promise<void> | undefined;
      if (http) {
        const ownedHttp = http;
        httpClosed = new Promise<void>((resolve, reject) => {
          ownedHttp.close((error?: Error & { code?: unknown }) => {
            if (error && error.code !== "ERR_SERVER_NOT_RUNNING") reject(error);
            else resolve();
          });
        }).catch((error: unknown) => {
          errors.push(error);
        });
      }
      if (transport) await attempt(() => transport!.shutdown());
      if (transport) transport.closeWebSockets(errors);
      if (http) await attempt(() => http!.closeAllConnections());
      if (transport) await attempt(() => transport!.awaitWebSockets());
      if (httpClosed) await attempt(() => awaitOwnedClosure(httpClosed!, "HTTP"));
      await attempt(() => httpBodies.drain());
      if (server) await attempt(() => matchMaker.gracefullyShutdown());
      for (const room of socialRooms) await attempt(() => room.onDispose());
      if (socialService && socialRuntime.service === socialService) socialRuntime.service = previousSocialService;
      await attempt(() => presence.shutdown());
      await attempt(() => presence.dispose());
      await attempt(() => driver.shutdown());
      if (database) await attempt(() => database!.close());
      if (errors.length) throw new AggregateError(errors, "Swiss browser cleanup failed", { cause: errors[0] });
    })();
    return closing;
  };
  try {
    database = await createSocialBrowserDatabase(connectionString);
    const { pool } = database;
    const accounts = new AccountStore(pool);
    await accounts.ensureReady();
    socialService = new SocialService({ accounts, presence, resolveRoom: resolveSocialInviteRoom });
    socialRuntime.service = socialService;
    const initializedSocialService = socialService;
    class FixtureSocialRoom extends SocialRoom {
      override onCreate() {
        if (closing) throw new Error("Swiss browser runtime is closing");
        socialRooms.add(this);
        super.onCreate();
      }
      protected override createSocialService() {
        return initializedSocialService;
      }
    }
    const participants = new ParticipantStore(accounts);
    const series = new SeriesStore(accounts);
    const replays = new ReplayLibrary(accounts);
    const swiss = new SwissProgram(accounts, series);
    series.addResolutionListener(async ({ matchId }) => {
      const result = await swiss.onSeriesResolved(matchId);
      if (!result.ok) {
        throw new Error(result.reason);
      }
    });
    class TournamentRoom extends AegisRoom {
      protected override accounts() {
        return accounts;
      }
      protected override series() {
        return series;
      }
      protected override replays() {
        return replays;
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
    app.options("/{*path}", (_req, res) => res.sendStatus(204));
    installAccountRoutes(app, accounts, participants, series, swiss);
    http = createServer(app);
    transport = new OwnedTransport({
      server: http,
      maxPayload: GAME_MESSAGE_LIMITS.maxMessageBytes,
    });
    server = new Server({ presence, driver, transport, gracefullyShutdown: false });
    server
      .define(ROOM_TYPE_TOURNAMENT, TournamentRoom, {
        privateSealedRoom: false,
        allowUnlimitedSelection: false,
        allowFormatSelection: false,
        unlimitedRoom: false,
        private: false,
        botRoom: false,
        rankedRoom: false,
        tournamentRoom: true,
        manualRoom: false,
        betaBattleRoom: false,
      })
      .filterBy(["tournamentMatchId", "tournamentGameId"]);
    server.define(ROOM_TYPE_SOCIAL, FixtureSocialRoom);
    await server.listen(port, "127.0.0.1");
    return {
      accounts,
      pool,
      series,
      swiss,
      sealed: new SealedStore(accounts),
      rooms: roomRegistry,
      close,
    };
  } catch (error) {
    const failures = [error];
    try {
      await close();
    } catch (cleanupError) {
      failures.push(cleanupError);
    }
    if (failures.length > 1) {
      const failure = new AggregateError(failures, "Swiss browser startup and cleanup failed", {
        cause: error,
      });
      throw failure;
    }
    throw error;
  }
}
