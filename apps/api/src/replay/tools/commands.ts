import { replayRetentionMs } from "../../bugs/FeedbackStore.js";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractReplayFromLogDir } from "../extract.js";
import { runReplay } from "../run.js";
import type { ReplayCommand } from "./args.js";
import { usageFor } from "./args.js";
import { fetchReplayFromApi, fetchReplayFromDb, hasDatabaseConfig, type FetchLike, type Queryable } from "./fetch.js";
import { listInputs } from "./inputs.js";
import { readRecord, writeJson } from "./records.js";
import { renderScaffold, writeScaffold } from "./scaffold.js";
import { formatSummary, summarizeRun } from "./summary.js";

/** Everything a command touches outside the file system, so tests can run commands in-process. */
export interface CommandIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  /** The directory relative paths resolve against (where the user ran pnpm). */
  cwd: string;
  /** Open the database `fetch` reads; returns it with a function that closes it. */
  connect?: (env: NodeJS.ProcessEnv) => Promise<{ db: Queryable; close(): Promise<void> }>;
  fetch?: FetchLike;
}

const REPLAY_DIR = fileURLToPath(new URL("..", import.meta.url));
const API_DIR = fileURLToPath(new URL("../../..", import.meta.url));
/** Default outputs go to `<repo>/replays/` (git-ignored) wherever pnpm was run from. */
const REPLAYS_DIR = fileURLToPath(new URL("../../../../../replays/", import.meta.url));
/** `apps/api/logs`, the API's default log directory (`logger.ts`), without importing the logger. */
const DEFAULT_LOG_DIR = fileURLToPath(new URL("../../../logs", import.meta.url));

/** Default `pg` connection, configured exactly as `AccountStore` reads it. */
async function connectPostgres(env: NodeJS.ProcessEnv) {
  const { Pool } = await import("pg");
  const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : new Pool({});
  return { db: pool as unknown as Queryable, close: () => pool.end() };
}

/** Run one parsed command; resolves to the process exit code. */
export async function runCommand(command: ReplayCommand, io: CommandIo): Promise<number> {
  const path = (file: string) => resolve(io.cwd, file);
  switch (command.command) {
    case "help":
      io.out(usageFor(command.topic));
      return 0;

    case "fetch": {
      const out = command.out ? path(command.out) : resolve(REPLAYS_DIR, `report-${command.reportId}.json`);
      let fetched;
      if (command.url) {
        fetched = await fetchReplayFromApi(command.url, io.env.AEGIS_SESSION, command.reportId, io.fetch);
      } else {
        if (!hasDatabaseConfig(io.env)) {
          io.err(
            "fetch reads the database the API uses: set DATABASE_URL (or PGHOST/PGDATABASE), or pass --url <apiBase> with AEGIS_SESSION.",
          );
          return 2;
        }
        const { db, close } = await (io.connect ?? connectPostgres)(io.env);
        try {
          fetched = await fetchReplayFromDb(db, command.reportId, Date.now() - replayRetentionMs(io.env));
        } finally {
          await close();
        }
      }
      if (fetched.warning) io.err(`warning: ${fetched.warning}`);
      writeJson(out, fetched.record);
      io.out(`Wrote ${out} (match ${fetched.record.matchId}, ${fetched.record.inputs.length} inputs)`);
      return 0;
    }

    case "extract": {
      const logDir = path(command.logDir ?? io.env.AEGIS_LOG_DIR ?? DEFAULT_LOG_DIR);
      const out = command.out ? path(command.out) : resolve(REPLAYS_DIR, `${command.matchId}.json`);
      const record = await extractReplayFromLogDir(logDir, command.matchId);
      writeJson(out, record);
      io.out(`Wrote ${out} (match ${record.matchId}, ${record.inputs.length} inputs, from ${logDir})`);
      return 0;
    }

    case "inputs": {
      const record = readRecord(path(command.file));
      for (const line of listInputs(record, command)) io.out(line);
      return 0;
    }

    case "run": {
      const record = readRecord(path(command.file));
      if (command.until !== undefined && command.until > record.inputs.length)
        io.err(`note: --until ${command.until} is past the last input; replaying all ${record.inputs.length}.`);
      const run = await runReplay(record, command.until !== undefined ? { untilInput: command.until } : {});
      const summary = summarizeRun(record, run, command.until);
      if (command.json) io.out(JSON.stringify(summary, null, 2));
      else for (const line of formatSummary(summary)) io.out(line);
      return summary.divergences.length > 0 ? 1 : 0;
    }

    case "scaffold": {
      const record = readRecord(path(command.file));
      const scaffold = renderScaffold(record, {
        until: command.until,
        testPath: path(command.out),
        replayDir: REPLAY_DIR,
        ...(command.issue !== undefined ? { issue: command.issue } : {}),
      });
      writeScaffold(scaffold);
      io.out(`Wrote ${scaffold.testPath}`);
      io.out(`Wrote ${scaffold.fixturePath} (inputs 0..${command.until} of ${record.inputs.length})`);
      io.out(`Run it: pnpm --filter @aegis/api exec vitest run ${relative(API_DIR, scaffold.testPath)}`);
      return 0;
    }
  }
}
