import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { Server } from "colyseus";
import { Pool } from "pg";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { ROOM_TYPE_TOURNAMENT } from "@aegis/shared/protocol/messages";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { installAccountRoutes } from "../dist/accounts/routes.js";
import { AegisRoom, roomRegistry } from "../dist/rooms/AegisRoom.js";
import { createGameTransport } from "../dist/connections/createGameTransport.js";
import { ParticipantStore } from "../dist/tournaments/participants/ParticipantStore.js";
import { SeriesStore } from "../dist/tournaments/series/SeriesStore.js";
import { SwissProgram } from "../dist/tournaments/swiss/SwissProgram.js";
import { SealedStore } from "../dist/tournaments/sealed/SealedStore.js";
import { ReplayLibrary } from "../dist/replays/ReplayLibrary.js";
import "../dist/cards/index.js";

type Params = { connectionString: string | undefined; port: number };

export async function startSealedSwissBrowserServer({ connectionString, port }: Params) {
  const config = getSealedTestPoolConfig(connectionString);
  const schema = `swiss_browser_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool(config);
  const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
  let server: Server | undefined;
  let schemaCreated = false;
  const close = async () => {
    try {
      await server?.gracefullyShutdown(false);
    } finally {
      try {
        await pool.end();
      } finally {
        try {
          if (schemaCreated) {
            await admin.query(`DROP SCHEMA ${schema} CASCADE`);
          }
        } finally {
          await admin.end();
        }
      }
    }
  };
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    schemaCreated = true;
    const accounts = new AccountStore(pool);
    await accounts.ensureReady();
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
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      next();
    });
    app.options("/{*path}", (_req, res) => res.sendStatus(204));
    installAccountRoutes(app, accounts, participants, series, swiss);
    const http = createServer(app);
    server = new Server({ transport: createGameTransport({ server: http }), gracefullyShutdown: false });
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
      const failure = new AggregateError(failures, "Swiss browser startup and cleanup failed", { cause: error });
      throw failure;
    }
    throw error;
  }
}
