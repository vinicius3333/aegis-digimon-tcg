import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AccountStore } from "../accounts/AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { extractReplay } from "../replay/extract.js";
import { recordRoomMatch, type RecordedRoomMatch } from "../replay/roomMatch.fixture.js";
import type { ReplayRecord } from "../replay/types.js";
import { FeedbackStore, replayRetentionMs } from "./FeedbackStore.js";
import { issueBody, type IssueContext, type IssueTracker, type NewBugReport } from "./GitHubIssueTracker.js";
import { extractReplayFromLogDir } from "../replay/extract.js";
import { ReplayCapturer, type ReplayExtractor } from "./replayCapture.js";
import { installBugReportRoutes } from "./routes.js";

/**
 * A report filed from a match keeps a private copy of the match's replay, and the public issue
 * says only whether it did. The match is a real room match whose log lines are written to a temp
 * log directory exactly as the room wrote them.
 */

const UNKNOWN_MATCH = "00000000-0000-4000-8000-000000000000";

let match: RecordedRoomMatch;
let record: ReplayRecord;
let logDir: string;

beforeAll(async () => {
  match = await recordRoomMatch({ seed: 20261009, turnLimit: 2 });
  record = extractReplay(match.lines, match.matchId);
  logDir = mkdtempSync(join(tmpdir(), "aegis-bug-replay-"));
  // Two segments whose names do not sort in write order, plus another match's noise.
  const half = Math.floor(match.lines.length / 2);
  writeFileSync(join(logDir, "api-2026-10-09-ffff.jsonl"), match.lines.slice(0, half).join("\n") + "\n");
  writeFileSync(join(logDir, "api-2026-10-09-0000.jsonl"), match.lines.slice(half).join("\n") + '\n{"cut":');
  writeFileSync(join(logDir, "unrelated.log"), match.lines.join("\n"));
});

afterAll(() => rmSync(logDir, { recursive: true, force: true }));

type Filed = { report: NewBugReport; context: IssueContext | undefined; body: string };

type Harness = {
  accounts: AccountStore;
  feedback: FeedbackStore;
  url: string;
  cookie: string;
  filed: Filed[];
  close: () => Promise<void>;
};

let harness: Harness | undefined;

afterEach(async () => {
  await harness?.close();
  harness = undefined;
  vi.restoreAllMocks();
});

async function startHarness({
  replays,
  tracker = true,
  feedback,
}: {
  replays?: ReplayCapturer;
  tracker?: boolean;
  feedback?: (accounts: AccountStore) => FeedbackStore;
} = {}): Promise<Harness> {
  const accounts = new AccountStore(createMemoryPool());
  const store = feedback?.(accounts) ?? new FeedbackStore(accounts);
  const filed: Filed[] = [];
  const recording: IssueTracker = {
    file: async (report, context) => {
      filed.push({ report, context, body: issueBody(report, undefined, undefined, context) });
      return { number: 42, url: "https://github.com/example/repo/issues/42" };
    },
  };
  const app = express();
  app.use(express.json());
  installBugReportRoutes({
    app,
    store,
    tracker: tracker ? recording : undefined,
    replays,
    session: (req) => accounts.session(/aegis_session=([^;]+)/.exec(req.headers.cookie ?? "")?.[1]),
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const reporter = await accounts.accountForIdentity("discord", "reporter", "Tamer");
  const session = await accounts.issueSession(reporter);
  harness = {
    accounts,
    feedback: store,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    cookie: `aegis_session=${session.id}`,
    filed,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await accounts.close();
    },
  };
  return harness;
}

function submit(h: Harness, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${h.url}/bug-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: h.cookie },
    body: JSON.stringify({ summary: "broken", description: "it broke", ...body }),
  });
}

async function storedReplays(h: Harness) {
  return (
    await h.accounts.pool.query<{ report_id: number; input_count: number; record: ReplayRecord }>(
      "SELECT report_id, input_count, record FROM feedback_report_replays ORDER BY report_id",
    )
  ).rows;
}

/** An extractor that never finishes on its own and records whether it was told to stop. */
function stalledExtractor(): { extract: ReplayExtractor; aborted: () => boolean } {
  let signal: AbortSignal | undefined;
  return {
    extract: (_matchId, received) => {
      signal = received;
      return new Promise<never>(() => undefined);
    },
    aborted: () => signal?.aborted === true,
  };
}

describe("capturing the replay of a reported match", () => {
  it("stores the match's replay with the report and says so, without its contents, on the issue", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }) });

    const response = await submit(h, { matchId: match.matchId });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ number: 42, url: "https://github.com/example/repo/issues/42" });
    const rows = await storedReplays(h);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.report_id).toBe(1);
    expect(rows[0]!.input_count).toBe(record.inputs.length);
    expect(rows[0]!.record).toEqual(record);

    const [filed] = h.filed;
    expect(filed!.context).toEqual({ replay: { saved: true, reportId: 1, inputCount: record.inputs.length } });
    expect(filed!.body).toContain(
      `### Replay\nSaved privately with report \`#1\` (${record.inputs.length} inputs). Maintainers: \`pnpm replay fetch 1\`.`,
    );
    // The submitted report (stored and mirrored) is unchanged: the outcome travels beside it.
    expect(filed!.report).toEqual({
      reporterName: "Tamer",
      kind: "bug",
      summary: "broken",
      cardIds: [],
      description: "it broke",
      matchId: match.matchId,
    });
    // Nothing of the record reaches the public body: no deck card, no seed, no action.
    const deckCards = new Set([...record.seats[0].deck.mainDeck, ...record.seats[1].deck.mainDeck]);
    expect([...deckCards].filter((cardId) => filed!.body.includes(cardId))).toEqual([]);
    expect(filed!.body).not.toContain(String(record.seed));
    expect(filed!.body).not.toMatch(/mainDeck|intent|seat/i);
  });

  it("keeps no replay larger than its size cap and says so on the issue", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir, maxRecordChars: 1_000 }) });

    const response = await submit(h, { matchId: match.matchId });

    expect(response.status).toBe(201);
    expect(await storedReplays(h)).toEqual([]);
    expect(h.filed[0]!.body).toContain("### Replay\nReplay not available: too large to keep.");
  });

  it("files the report and says the replay is unavailable when the match is not in the logs", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }) });

    const response = await submit(h, { matchId: UNKNOWN_MATCH });

    expect(response.status).toBe(201);
    expect(await storedReplays(h)).toEqual([]);
    expect((await h.feedback.list()).items[0]).toMatchObject({ id: 1, githubStatus: "sent", hasReplay: false });
    expect(h.filed[0]!.body).toContain("### Replay\nReplay not available: logs not found.");
  });

  it("treats a match the logs cannot rebuild (no replay header) as logs not found", async () => {
    const headless = mkdtempSync(join(tmpdir(), "aegis-bug-replay-headless-"));
    try {
      const lines = match.lines.filter((line) => !line.includes('"replay.header"'));
      writeFileSync(join(headless, "api-2026-10-09-aaaa.jsonl"), lines.join("\n") + "\n");
      const h = await startHarness({ replays: new ReplayCapturer({ logDir: headless }) });

      expect((await submit(h, { matchId: match.matchId })).status).toBe(201);
      expect(await storedReplays(h)).toEqual([]);
      expect(h.filed[0]!.context).toEqual({ replay: { saved: false, reason: "logs_not_found" } });
      expect(h.filed[0]!.body).toContain("Replay not available: logs not found.");
      expect(h.filed[0]!.body).not.toContain(headless);
    } finally {
      rmSync(headless, { recursive: true, force: true });
    }
  });

  it("treats a missing log directory as logs not found", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir: join(logDir, "does-not-exist") }) });

    expect((await submit(h, { matchId: match.matchId })).status).toBe(201);
    expect(h.filed[0]!.body).toContain("Replay not available: logs not found.");
  });

  it("gives up after its time budget, stops the read, and still files the report", async () => {
    const stalled = stalledExtractor();
    const h = await startHarness({ replays: new ReplayCapturer({ logDir, timeoutMs: 50, extract: stalled.extract }) });

    const started = Date.now();
    const response = await submit(h, { matchId: match.matchId });

    expect(response.status).toBe(201);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(stalled.aborted()).toBe(true);
    expect(await storedReplays(h)).toEqual([]);
    expect(h.filed[0]!.body).toContain("### Replay\nReplay not available: timed out.");
  });

  it("reports an unexpected failure as an error, with no message, path or stack on the issue", async () => {
    const extract = vi.fn<ReplayExtractor>(async () => {
      throw new Error(`EACCES: permission denied, open '${logDir}/api-secret.jsonl'`);
    });
    const h = await startHarness({ replays: new ReplayCapturer({ logDir, extract }) });

    expect((await submit(h, { matchId: match.matchId })).status).toBe(201);
    expect(h.filed[0]!.body).toContain("Replay not available: error.");
    expect(h.filed[0]!.body).not.toMatch(/EACCES|api-secret|at .*\.ts/);
  });

  it("files the report without a replay when storing the replay fails", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }) });
    vi.spyOn(h.feedback, "saveReplay").mockRejectedValue(new Error("database offline"));

    const response = await submit(h, { matchId: match.matchId });

    expect(response.status).toBe(201);
    expect(h.filed[0]!.body).toContain("Replay not available: error.");
  });

  it("captures nothing and adds no Replay section when the report was not filed from a match", async () => {
    const extract = vi.fn<ReplayExtractor>(async () => record);
    const h = await startHarness({ replays: new ReplayCapturer({ logDir, extract }) });

    expect((await submit(h, {})).status).toBe(201);
    expect((await submit(h, { matchId: "not-a-match-id" })).status).toBe(201);

    expect(extract).not.toHaveBeenCalled();
    expect(h.filed.map((filed) => filed.context)).toEqual([{}, {}]);
    expect(h.filed[0]!.body).not.toContain("### Replay");
  });

  it("only scans for accepted reports: refused and rate-limited submissions never reach the logs", async () => {
    const extract = vi.fn<ReplayExtractor>(async () => record);
    const h = await startHarness({ replays: new ReplayCapturer({ logDir, extract }) });

    // The refused one still spends a token of the account's five per minute.
    expect((await submit(h, { matchId: match.matchId, summary: " " })).status).toBe(400);
    for (let i = 0; i < 4; i++) expect((await submit(h, { matchId: match.matchId })).status).toBe(201);
    expect((await submit(h, { matchId: match.matchId })).status).toBe(429);

    expect(extract).toHaveBeenCalledTimes(4);
  });

  it("still saves the replay when there is no GitHub mirror, keeping the response contract", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }), tracker: false });

    const response = await submit(h, { matchId: match.matchId });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ number: 1 });
    expect((await storedReplays(h)).map((row) => row.report_id)).toEqual([1]);
  });

  it("files reports without replays when capture is switched off", async () => {
    expect(ReplayCapturer.fromEnvironment({ AEGIS_REPLAY_CAPTURE_ENABLED: "false" })).toBeUndefined();
    expect(ReplayCapturer.fromEnvironment({ AEGIS_LOG_DIR: logDir })).toBeInstanceOf(ReplayCapturer);
    const h = await startHarness();

    expect((await submit(h, { matchId: match.matchId })).status).toBe(201);
    expect(h.filed[0]!.context).toEqual({});
    expect(h.filed[0]!.body).not.toContain("### Replay");
  });
});

describe("the capturer's bounds", () => {
  it("refuses to start more scans than its concurrency cap", async () => {
    const stalled = stalledExtractor();
    const capturer = new ReplayCapturer({ logDir, timeoutMs: 100, maxConcurrent: 1, extract: stalled.extract });

    const first = capturer.capture(match.matchId);
    expect(await capturer.capture(match.matchId)).toEqual({ failure: "busy" });
    expect(await first).toEqual({ failure: "timed_out" });
    // The slot is free again once the first scan gave up.
    expect(await new ReplayCapturer({ logDir, maxConcurrent: 1 }).capture(match.matchId)).toEqual(record);
  });

  it("skips segments last written before the scan window", async () => {
    const old = mkdtempSync(join(tmpdir(), "aegis-bug-replay-old-"));
    try {
      const path = join(old, "api-2026-10-08-aaaa.jsonl");
      writeFileSync(path, match.lines.join("\n") + "\n");
      const written = new Date(Date.now() - 13 * 60 * 60 * 1000);
      utimesSync(path, written, written);
      const signal = new AbortController().signal;

      expect(await extractReplayFromLogDir(old, match.matchId, { signal })).toEqual(record);
      await expect(
        extractReplayFromLogDir(old, match.matchId, { signal, modifiedAfter: Date.now() - 12 * 60 * 60 * 1000 }),
      ).rejects.toThrow(/No log lines/);
      expect(await new ReplayCapturer({ logDir: old }).capture(match.matchId)).toMatchObject({
        failure: "logs_not_found",
      });
    } finally {
      rmSync(old, { recursive: true, force: true });
    }
  });

  it("stops reading once its signal aborts", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(extractReplayFromLogDir(logDir, match.matchId, { signal: controller.signal })).rejects.toThrow(
      /abort/i,
    );
  });
});

describe("downloading a saved replay", () => {
  async function adminCookie(h: Harness): Promise<string> {
    const admin = await h.accounts.accountForIdentity("discord", "admin", "Vn");
    await h.accounts.pool.query("UPDATE accounts SET is_admin=true WHERE id=$1", [admin.id]);
    return `aegis_session=${(await h.accounts.issueSession(admin)).id}`;
  }

  function download(h: Harness, id: string, cookie?: string): Promise<Response> {
    return fetch(`${h.url}/account/feedback/${id}/replay`, { headers: cookie ? { Cookie: cookie } : {} });
  }

  it("gives administrators the stored record and nobody else", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }) });
    await submit(h, { matchId: match.matchId });
    await submit(h, {});

    const guest = await download(h, "1");
    expect(guest.status).toBe(401);
    expect(guest.headers.get("cache-control")).toBe("no-store");
    const player = await download(h, "1", h.cookie);
    expect(player.status).toBe(403);
    expect(await player.json()).toEqual({ error: "admin_required" });

    const cookie = await adminCookie(h);
    const response = await download(h, "1", cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(await response.json()).toEqual(record);

    const missing = await download(h, "2", cookie);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toEqual({ error: "replay_not_found" });
    expect((await download(h, "999", cookie)).status).toBe(404);
    for (const id of ["0", "abc", "1.5", "2147483648"]) expect((await download(h, id, cookie)).status).toBe(400);
  });

  it("marks which reports in the admin list have a replay", async () => {
    const h = await startHarness({ replays: new ReplayCapturer({ logDir }) });
    await submit(h, { matchId: match.matchId });
    await submit(h, {});

    const response = await fetch(`${h.url}/account/feedback`, { headers: { Cookie: await adminCookie(h) } });
    const page = (await response.json()) as Awaited<ReturnType<FeedbackStore["list"]>>;
    expect(page.items).toMatchObject([
      { id: 2, hasReplay: false, replayInputs: null },
      { id: 1, hasReplay: true, replayInputs: record.inputs.length },
    ]);
  });
});

describe("replay retention", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("reads the retention window from the environment, defaulting to 30 days", () => {
    expect(replayRetentionMs({})).toBe(30 * DAY);
    expect(replayRetentionMs({ AEGIS_REPLAY_RETENTION_DAYS: "7" })).toBe(7 * DAY);
    for (const invalid of ["0", "-3", "soon", ""]) {
      expect(replayRetentionMs({ AEGIS_REPLAY_RETENTION_DAYS: invalid })).toBe(30 * DAY);
    }
  });

  it("deletes replays older than the window when the next replay is saved", async () => {
    let now = 1_000 * DAY;
    const h = await startHarness({
      feedback: (accounts) => new FeedbackStore(accounts, { replayRetentionMs: 30 * DAY, now: () => now }),
    });
    const report = { kind: "bug" as const, summary: "s", description: "d", cardIds: [] };
    const first = await h.feedback.save(report, undefined, false);
    await h.feedback.saveReplay(first, record);
    now += 29 * DAY;
    const second = await h.feedback.save(report, undefined, false);
    await h.feedback.saveReplay(second, record);
    expect((await storedReplays(h)).map((row) => row.report_id)).toEqual([first, second]);

    now += 2 * DAY; // the first is now 31 days old, the second 2
    const third = await h.feedback.save(report, undefined, false);
    await h.feedback.saveReplay(third, record);

    expect((await storedReplays(h)).map((row) => row.report_id)).toEqual([second, third]);
    expect(await h.feedback.replay(first)).toBeUndefined();
    expect(await h.feedback.replay(second)).toEqual(record);
  });

  it("does not serve a replay past the window even before the next save prunes it", async () => {
    let now = 1_000 * DAY;
    const h = await startHarness({
      feedback: (accounts) => new FeedbackStore(accounts, { replayRetentionMs: 30 * DAY, now: () => now }),
    });
    const id = await h.feedback.save({ kind: "bug", summary: "s", description: "d", cardIds: [] }, undefined, false);
    await h.feedback.saveReplay(id, record);
    now += 31 * DAY;

    expect((await h.feedback.list()).items[0]).toMatchObject({ id, hasReplay: false, replayInputs: null });
    expect(await h.feedback.replay(id)).toBeUndefined();
    expect(await storedReplays(h)).toEqual([]);
  });

  it("goes with its report", async () => {
    const h = await startHarness();
    const id = await h.feedback.save({ kind: "bug", summary: "s", description: "d", cardIds: [] }, undefined, false);
    await h.feedback.saveReplay(id, record);

    await h.accounts.pool.query("DELETE FROM feedback_reports WHERE id=$1", [id]);

    expect(await storedReplays(h)).toEqual([]);
  });
});
