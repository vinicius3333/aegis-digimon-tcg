import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore } from "../accounts/AccountStore.js";
import { installAccountRoutes } from "../accounts/routes.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import {
  MAX_BUG_REPORT_DESCRIPTION,
  MAX_BUG_REPORT_SUMMARY,
  type IssueTracker,
  type NewBugReport,
} from "./GitHubIssueTracker.js";

type Harness = {
  url: string;
  cookie: string;
  filed: NewBugReport[];
  close: () => Promise<void>;
};

let harness: Harness;

async function startHarness(tracker?: IssueTracker, filed: NewBugReport[] = []): Promise<Harness> {
  const store = new AccountStore(createMemoryPool());
  const app = express();
  app.use(express.json());
  installAccountRoutes(
    app,
    store,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    tracker,
  );
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));

  const reporter = await store.accountForIdentity("discord", "reporter", "Tamer");
  const session = await store.issueSession(reporter);

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    cookie: `aegis_session=${session.id}`,
    filed,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function recordingTracker(filed: NewBugReport[]): IssueTracker {
  return {
    file: async (report) => {
      filed.push(report);
      return { number: 42, url: "https://github.com/example/repo/issues/42" };
    },
  };
}

function submit(body: unknown, cookie?: string): Promise<Response> {
  return fetch(`${harness.url}/bug-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const filed: NewBugReport[] = [];
  harness = await startHarness(recordingTracker(filed), filed);
});

afterEach(async () => {
  await harness.close();
});

describe("submitting a bug report", () => {
  it("files an anonymous report, crediting no account", async () => {
    const response = await submit({ summary: "broken", description: "broken" });
    expect(response.status).toBe(201);
    expect(harness.filed[0]).toEqual({ summary: "broken", cardIds: [], description: "broken" });
    expect(harness.filed[0]).not.toHaveProperty("reporterName");
  });

  // The anonymous budget is small on purpose: an address is all there is to meter by.
  it("meters anonymous reporters harder than accounts", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await submit({ summary: "broken", description: "broken" })).status).toBe(201);
    }
    const refused = await submit({ summary: "broken", description: "broken" });
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: "too_many_requests" });

    // The account bucket is untouched by what an anonymous caller spent.
    expect((await submit({ summary: "broken", description: "broken" }, harness.cookie)).status).toBe(201);
  });

  it("files every field the reporter filled in", async () => {
    const response = await submit(
      {
        summary: "  On-play never fires  ",
        cardIds: ["bt1-010"],
        description: "  Play it, nothing happens  ",
        opponentDeck: " Red Hybrid ",
        attachmentUrl: "https://cdn.discordapp.com/attachments/1/2/clip.mp4",
        clientRevision: "abc123",
        userAgent: "Mozilla/5.0 (Macintosh)",
      },
      harness.cookie,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ number: 42, url: "https://github.com/example/repo/issues/42" });
    expect(harness.filed).toEqual([
      {
        reporterName: "Tamer",
        summary: "On-play never fires",
        cardIds: ["BT1-010"],
        description: "Play it, nothing happens",
        opponentDeck: "Red Hybrid",
        attachmentUrl: "https://cdn.discordapp.com/attachments/1/2/clip.mp4",
        clientRevision: "abc123",
        userAgent: "Mozilla/5.0 (Macintosh)",
      },
    ]);
  });

  it("accepts a report that names no card and fills in nothing optional", async () => {
    const response = await submit({ summary: "memory desyncs", description: "it desyncs" }, harness.cookie);
    expect(response.status).toBe(201);
    expect(harness.filed[0]).toEqual({
      reporterName: "Tamer",
      summary: "memory desyncs",
      cardIds: [],
      description: "it desyncs",
    });
  });

  it("refuses a blank summary", async () => {
    const response = await submit({ summary: "  ", description: "broken" }, harness.cookie);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "empty_summary" });
    expect(harness.filed).toHaveLength(0);
  });

  it("refuses a summary past the length budget", async () => {
    const response = await submit(
      { summary: "x".repeat(MAX_BUG_REPORT_SUMMARY + 1), description: "broken" },
      harness.cookie,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "summary_too_long" });
  });

  it("refuses a blank description", async () => {
    const response = await submit({ summary: "broken", cardIds: ["BT1-010"], description: "   " }, harness.cookie);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "empty_description" });
    expect(harness.filed).toHaveLength(0);
  });

  it("refuses a description past the length budget", async () => {
    const response = await submit(
      { summary: "broken", description: "x".repeat(MAX_BUG_REPORT_DESCRIPTION + 1) },
      harness.cookie,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "description_too_long" });
  });

  it("refuses a card id that names no card", async () => {
    const response = await submit(
      { summary: "broken", cardIds: ["NOT-A-CARD"], description: "broken" },
      harness.cookie,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unknown_card" });
  });

  // The link is published under the project's name, so a stranger does not get to choose the host.
  it("refuses an attachment link that is not a Discord link", async () => {
    for (const attachmentUrl of ["https://evil.example.com/clip.mp4", "http://discord.com/x", "not a url"]) {
      const response = await submit({ summary: "broken", description: "broken", attachmentUrl }, harness.cookie);
      expect([attachmentUrl, response.status]).toEqual([attachmentUrl, 400]);
      expect(await response.json()).toEqual({ error: "invalid_attachment_url" });
    }
    expect(harness.filed).toHaveLength(0);
  });

  it("trims the context the client carries instead of refusing an odd one", async () => {
    await submit(
      { summary: "broken", description: "broken", clientRevision: "r".repeat(400), userAgent: "u".repeat(900) },
      harness.cookie,
    );
    expect(harness.filed[0]!.clientRevision).toHaveLength(60);
    expect(harness.filed[0]!.userAgent).toHaveLength(300);
  });

  it("reports a tracker that refused the issue rather than losing it silently", async () => {
    await harness.close();
    harness = await startHarness({
      file: () => Promise.reject(new Error("GitHub refused the issue: 403")),
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await submit({ summary: "broken", description: "broken" }, harness.cookie);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "tracker_unavailable" });
    vi.restoreAllMocks();
  });

  it("says reports are unavailable when the deployment configured no tracker", async () => {
    await harness.close();
    harness = await startHarness(undefined);

    const response = await submit({ summary: "broken", description: "broken" }, harness.cookie);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "reports_unavailable" });
    const limits = (await (await fetch(`${harness.url}/bug-reports/limits`)).json()) as { enabled: boolean };
    expect(limits.enabled).toBe(false);
  });
});
