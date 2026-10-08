import { ReplayLibrary } from "../replays/ReplayLibrary.js";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { AccountStore } from "./AccountStore.js";
import { installAccountRoutes } from "./routes.js";

type Harness = {
  url: string;
  cookie: string;
  store: AccountStore;
  close: () => Promise<void>;
};

let harness: Harness;

async function startHarness(): Promise<Harness> {
  const store = new AccountStore(createMemoryPool());
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, store);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const account = await store.accountForIdentity(
    "discord",
    "avatar-owner",
    "Tamer",
    "https://example.com/provider.png",
  );
  const session = await store.issueSession(account);
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    cookie: `aegis_session=${session.id}`,
    store,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function putAvatar(avatarId: unknown, authenticated = true): Promise<Response> {
  return fetch(`${harness.url}/account/profile/avatar`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Cookie: harness.cookie } : {}),
    },
    body: JSON.stringify({ avatarId }),
  });
}

async function putDisplayName(displayName: unknown, authenticated = true): Promise<Response> {
  return fetch(`${harness.url}/account/profile/display-name`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: harness.cookie } : {}) },
    body: JSON.stringify({ displayName }),
  });
}

beforeEach(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await harness.close();
  await harness.store.close();
});

describe("PUT /account/profile/avatar", () => {
  it("persists an allowlisted Digimon while keeping the provider avatar", async () => {
    const updated = await putAvatar("tyrannomon");
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      avatarId: "tyrannomon",
      avatarUrl: "https://example.com/provider.png",
    });

    const sessionResponse = await fetch(`${harness.url}/auth/me`, { headers: { Cookie: harness.cookie } });
    expect(await sessionResponse.json()).toMatchObject({ avatarId: "tyrannomon" });
  });

  it("#5255 restores the provider avatar and keeps that choice in a new session read", async () => {
    expect((await putAvatar("tyrannomon")).status).toBe(200);
    const reset = await putAvatar(null);
    expect(reset.status).toBe(200);
    expect(await reset.json()).toMatchObject({ avatarId: null, avatarUrl: "https://example.com/provider.png" });
    const session = await fetch(`${harness.url}/auth/me`, { headers: { Cookie: harness.cookie } });
    expect(await session.json()).toMatchObject({ avatarId: null, avatarUrl: "https://example.com/provider.png" });
    expect((await putAvatar(undefined)).status).toBe(400);
  });

  it("rejects unknown ids without changing the account", async () => {
    const rejected = await putAvatar("../outside");
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toEqual({ error: "invalid avatar" });

    const sessionResponse = await fetch(`${harness.url}/auth/me`, { headers: { Cookie: harness.cookie } });
    expect(await sessionResponse.json()).toMatchObject({ avatarId: null });
  });

  it("requires an authenticated account", async () => {
    expect((await putAvatar("tyrannomon", false)).status).toBe(401);
  });
});

describe("PUT /account/profile/display-name", () => {
  it("renames the authenticated account and exposes it through the session", async () => {
    const response = await putDisplayName("  New   Tamer ");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ displayName: "New Tamer" });
    expect(await (await fetch(`${harness.url}/auth/me`, { headers: { Cookie: harness.cookie } })).json()).toMatchObject(
      { displayName: "New Tamer" },
    );
  });

  it("returns stable validation and uniqueness errors while allowing repeated changes", async () => {
    expect((await putDisplayName("x")).status).toBe(400);
    await harness.store.accountForIdentity("discord", "taken-owner", "Already Taken");
    const taken = await putDisplayName("already taken");
    expect(taken.status).toBe(409);
    expect(await taken.json()).toEqual({ error: "display_name_taken" });
    expect((await putDisplayName("Available Name")).status).toBe(200);
    expect((await putDisplayName("Another Name")).status).toBe(200);
  });

  it("rate limits excessive nickname changes", async () => {
    const statuses = [];
    for (let index = 0; index < 11; index++) statuses.push((await putDisplayName(`Tamer ${index}`)).status);
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });

  it("requires an authenticated account", async () => {
    expect((await putDisplayName("New Tamer", false)).status).toBe(401);
  });
});

async function putPreferences(changes: unknown, authenticated = true): Promise<Response> {
  return fetch(`${harness.url}/account/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: harness.cookie } : {}) },
    body: JSON.stringify(changes),
  });
}

async function getPreferences(): Promise<unknown> {
  return (await fetch(`${harness.url}/account/preferences`, { headers: { Cookie: harness.cookie } })).json();
}

describe("/account/preferences", () => {
  it("starts empty and merges each partial update into the stored preferences", async () => {
    expect(await getPreferences()).toEqual({});
    expect((await putPreferences({ darkMode: true, locale: "pt-BR" })).status).toBe(200);
    const merged = await putPreferences({ sleeve: "omnimon" });
    expect(await merged.json()).toEqual({ darkMode: true, locale: "pt-BR", sleeve: "omnimon" });
    await putPreferences({ darkMode: false });
    expect(await getPreferences()).toEqual({ darkMode: false, locale: "pt-BR", sleeve: "omnimon" });
  });

  it("stores the Digi-Egg sleeve beside the main sleeve", async () => {
    expect((await putPreferences({ sleeve: "omnimon", eggSleeve: "gold" })).status).toBe(200);
    expect(await getPreferences()).toEqual({ sleeve: "omnimon", eggSleeve: "gold" });
    expect((await putPreferences({ eggSleeve: "x".repeat(65) })).status).toBe(400);
  });

  it("stores the deck builder layout", async () => {
    const layout = { deckShare: 0.6, deckView: "list", deckSort: "level" };
    expect((await putPreferences(layout)).status).toBe(200);
    expect(await getPreferences()).toEqual(layout);
  });

  it("rejects wrong types, unknown keys and long values without changing anything", async () => {
    await putPreferences({ darkMode: true });
    for (const invalid of [
      { darkMode: "yes" },
      { theme: "dark" },
      { locale: "x".repeat(65) },
      ["darkMode"],
      { deckShare: 2 },
      { deckShare: "0.5" },
      { deckView: "table" },
      { deckSort: "x".repeat(65) },
    ]) {
      const rejected = await putPreferences(invalid);
      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toEqual({ error: "invalid preferences" });
    }
    expect(await getPreferences()).toEqual({ darkMode: true });
  });

  it("requires an authenticated account", async () => {
    expect((await putPreferences({ darkMode: true }, false)).status).toBe(401);
    expect((await fetch(`${harness.url}/account/preferences`)).status).toBe(401);
  });
});

it("links a recent match only to the authenticated owner's saved recording", async () => {
  const session = await harness.store.session(harness.cookie.split("=")[1]);
  const owner = session!.account;
  const library = new ReplayLibrary(harness.store, {
    async put() {},
    async get() {
      return Buffer.from("archive");
    },
    async remove() {},
  });
  const summary = {
    id: "recording-id",
    players: [owner.displayName, "Opponent"] as [string, string],
    mode: "casual" as const,
    startedAt: 1,
    finishedAt: 2,
    winnerSeat: 0,
    frameCount: 2,
  };
  await harness.store.recordRecentMatch(owner.id, "room-id", {
    id: summary.id,
    mode: "casual",
    opponentName: "Opponent",
    opponentKind: "human",
    result: "win",
    reason: "surrender",
    finishedAt: 2,
  });
  const other = await harness.store.accountForIdentity("email", "other-replay@test.invalid", "Other");
  await library.save(other.id, {
    kind: "ready",
    summary,
    viewerSeat: 1,
    data: Buffer.from("archive").toString("base64"),
  });
  const profile = () => fetch(`${harness.url}/account/profile`, { headers: { Cookie: harness.cookie } });
  expect(await (await profile()).json()).toMatchObject({ matches: [{ replay: null }] });
  const saved = await library.save(owner.id, {
    kind: "ready",
    summary,
    viewerSeat: 0,
    data: Buffer.from("archive").toString("base64"),
  });
  const response = await profile();
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ matches: [{ replay: { id: saved.id, visibility: "private" } }] });
  await library.remove(owner.id, saved.id);
  expect(await (await profile()).json()).toMatchObject({ matches: [{ replay: null }] });
});
