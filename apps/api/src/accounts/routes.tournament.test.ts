import type { AddressInfo } from "node:net";
import express from "express";
import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AEGIS_LIGHTNING_PRESET, BANDAI_GENERAL_PRESET } from "../tournaments/rules/index.js";
import { AccountStore } from "./AccountStore.js";
import { installAccountRoutes } from "./routes.js";

// Route-level coverage without a new dependency: the real Express app on an ephemeral port, driven
// by global fetch, backed by the same in-memory Postgres the store tests use.

type Harness = {
  url: string;
  cookie: string;
  store: AccountStore;
  close: () => Promise<void>;
};

let harness: Harness;

async function startHarness(): Promise<Harness> {
  const store = new AccountStore(new (newDb().adapters.createPg().Pool)() as never);
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, store);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const account = await store.accountForIdentity("discord", "organizer", "Organizer");
  await store.pool.query("UPDATE accounts SET is_admin=true WHERE id=$1", [account.id]);
  const admin = await store.accountForIdentity("discord", "organizer", "Organizer");
  const session = await store.issueSession(admin);
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    cookie: `aegis_session=${session.id}`,
    store,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/**
 * A decoded JSON response body. Assertions walk it to arbitrary depth, which is the point of a
 * wire-level test: typing it as the DTO would assert the shape the route is supposed to prove.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- deliberate: see above
type ResponseBody = any;

async function post(path: string, body: unknown): Promise<{ status: number; body: ResponseBody }> {
  const response = await fetch(`${harness.url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: harness.cookie },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

async function get(path: string): Promise<{ status: number; body: ResponseBody }> {
  const response = await fetch(`${harness.url}${path}`, { headers: { Cookie: harness.cookie } });
  return { status: response.status, body: await response.json() };
}

function futureStart(): number {
  return Date.now() + 86_400_000;
}

beforeEach(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await harness.close();
});

describe("POST /tournaments", () => {
  it("still accepts the pre-program payload and creates a legacy lightning bracket", async () => {
    const created = await post("/tournaments", {
      name: "Legacy Cup",
      block: "BT10",
      startsAt: futureStart(),
      maxPlayers: 8,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      structure: "single_elimination",
      bestOf: 1,
      topCutEnabled: false,
      topCutSize: null,
      allowBots: false,
      rulesetPreset: "aegis_lightning",
      // A row created through the route always freezes a ruleset; only rows that predate the
      // program read back with a null version, from the migration backfill.
      rulesetVersion: AEGIS_LIGHTNING_PRESET.version,
      status: "registration",
      block: "BT10",
      banlistPolicy: { mode: "none" },
      banlistCards: [],
    });
  });

  it("keeps the deprecated registrations alias alongside registeredCount", async () => {
    const created = await post("/tournaments", { name: "Legacy Cup", startsAt: futureStart(), maxPlayers: 8 });
    expect(created.body.registeredCount).toBe(0);
    expect(created.body.registrations).toBe(0);
  });

  it("accepts the full creation input and returns the frozen ruleset and banlist", async () => {
    const created = await post("/tournaments", {
      name: "Regional Qualifier",
      structure: "swiss",
      topCut: true,
      bestOf: 3,
      startsAt: futureStart(),
      maxPlayers: 64,
      allowBots: false,
      rulesetPreset: "bandai_general",
      banlist: { mode: "as_of_set", setId: "bt7" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      structure: "swiss",
      topCutEnabled: true,
      bestOf: 3,
      rulesetPreset: "bandai_general",
      rulesetVersion: BANDAI_GENERAL_PRESET.version,
      banlistPolicy: { mode: "as_of_set", setId: "BT7" },
    });
    expect(created.body.rules.match.swissDurationMs).toBe(2_700_000);
    expect(created.body.rules.standings.winRateFloor).toBe(0.33);
    expect(created.body.banlistCards.length).toBeGreaterThan(0);
  });

  it("defaults an omitted banlist to the current list rather than rejecting the official preset", async () => {
    const created = await post("/tournaments", {
      name: "Regional Qualifier",
      structure: "swiss",
      topCut: true,
      bestOf: 3,
      startsAt: futureStart(),
      maxPlayers: 64,
      rulesetPreset: "bandai_general",
    });
    expect(created.status).toBe(201);
    expect(created.body.banlistPolicy).toEqual({ mode: "current" });
    expect(created.body.banlistCards.length).toBeGreaterThan(0);
  });

  it("rejects an invalid combination with its reason code", async () => {
    const rejected = await post("/tournaments", {
      name: "Bot Regional",
      structure: "swiss",
      topCut: true,
      bestOf: 3,
      startsAt: futureStart(),
      maxPlayers: 64,
      allowBots: true,
      rulesetPreset: "bandai_general",
      banlist: { mode: "current" },
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.reasons).toEqual([{ code: "bots_require_custom_ruleset", field: "allowBots" }]);
  });

  it("rejects a start time in the past with its reason code", async () => {
    const rejected = await post("/tournaments", {
      name: "Yesterday Cup",
      startsAt: Date.now() - 86_400_000,
      maxPlayers: 8,
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.reasons.map((reason: { code: string }) => reason.code)).toEqual(["starts_at_in_past"]);
  });

  it("rejects a malformed body before any reason code applies", async () => {
    const rejected = await post("/tournaments", { name: "Broken", startsAt: futureStart(), maxPlayers: 8, bestOf: 2 });
    expect(rejected.status).toBe(400);
    expect(rejected.body.reasons).toBeUndefined();
  });

  it("requires a session", async () => {
    const response = await fetch(`${harness.url}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Session", startsAt: futureStart(), maxPlayers: 8 }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects an authenticated non-admin", async () => {
    const account = await harness.store.accountForIdentity("discord", "player", "Player");
    const session = await harness.store.issueSession(account);
    const response = await fetch(`${harness.url}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `aegis_session=${session.id}` },
      body: JSON.stringify({ name: "Player Cup", startsAt: futureStart(), maxPlayers: 8 }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "admin_required" });
  });
});

describe("GET /tournaments", () => {
  it("lists the summary fields and the deprecated alias", async () => {
    await post("/tournaments", { name: "Legacy Cup", startsAt: futureStart(), maxPlayers: 8 });
    const listed = await get("/tournaments");
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]).toMatchObject({
      name: "Legacy Cup",
      status: "registration",
      structure: "single_elimination",
      registeredCount: 0,
      registrations: 0,
      banlistPolicy: { mode: "none" },
    });
    // The list stays a summary: the heavy frozen snapshots belong to the detail view.
    expect(listed.body[0].banlistCards).toBeUndefined();
  });

  it("returns the frozen snapshots and the bracket on the detail view", async () => {
    const created = await post("/tournaments", {
      name: "Regional Qualifier",
      structure: "swiss",
      topCut: true,
      bestOf: 3,
      startsAt: futureStart(),
      maxPlayers: 64,
      rulesetPreset: "bandai_general",
      banlist: { mode: "as_of_set", setId: "BT10" },
    });
    const detail = await get(`/tournaments/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: created.body.id,
      rulesetPreset: "bandai_general",
      banlistPolicy: { mode: "as_of_set", setId: "BT10" },
      matches: [],
    });
    expect(detail.body.rules.timeout.eliminationExtraTurns).toBe(5);
    expect(detail.body.banlistCards).toEqual(created.body.banlistCards);
  });

  it("404s an unknown tournament", async () => {
    const response = await fetch(`${harness.url}/tournaments/00000000-0000-0000-0000-0000000000ff`);
    expect(response.status).toBe(404);
  });
});

describe("DELETE /tournaments/:id", () => {
  it("lets an admin delete another organizer's event", async () => {
    const organizer = await harness.store.accountForIdentity("discord", "other-organizer", "Other Organizer");
    const tournament = await harness.store.createTournament(organizer.id, {
      name: "Other Cup",
      block: "BT10",
      startsAt: futureStart(),
      maxPlayers: 8,
    });

    const response = await fetch(`${harness.url}/tournaments/${tournament.id}`, {
      method: "DELETE",
      headers: { Cookie: harness.cookie },
    });
    expect(response.status).toBe(204);
    expect(await harness.store.tournament(tournament.id)).toBeUndefined();
  });
});
