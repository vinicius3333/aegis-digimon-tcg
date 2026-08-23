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
