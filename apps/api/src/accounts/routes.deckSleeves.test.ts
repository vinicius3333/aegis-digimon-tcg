import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { AccountStore } from "./AccountStore.js";
import { installAccountRoutes } from "./routes.js";

let url: string;
let cookie: string;
let store: AccountStore;
let close: () => Promise<void>;

beforeEach(async () => {
  store = new AccountStore(createMemoryPool());
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, store);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const account = await store.accountForIdentity("discord", "sleeve-owner", "Tamer");
  cookie = `aegis_session=${(await store.issueSession(account)).id}`;
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(async () => {
  await close();
  await store.close();
});

function putDeck(body: Record<string, unknown>): Promise<Response> {
  return fetch(`${url}/account/decks/sleeved`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "Sleeved", mainDeck: ["BT1-010"], eggDeck: ["BT1-001"], ...body }),
  });
}

async function savedDeck() {
  const response = await fetch(`${url}/account/decks`, { headers: { Cookie: cookie } });
  return ((await response.json()) as Array<{ sleeveId?: string; eggSleeveId?: string }>)[0];
}

describe("PUT /account/decks/:id sleeves", () => {
  it("stores the deck's own main and Digi-Egg sleeves", async () => {
    expect((await putDeck({ sleeveId: "alphamon", eggSleeveId: "gold" })).status).toBe(200);
    expect(await savedDeck()).toMatchObject({ sleeveId: "alphamon", eggSleeveId: "gold" });
  });

  it("clears a sleeve sent as null back to the global choice", async () => {
    await putDeck({ sleeveId: "alphamon", eggSleeveId: "gold" });
    expect((await putDeck({ sleeveId: null, eggSleeveId: null })).status).toBe(200);
    const deck = await savedDeck();
    expect(deck?.sleeveId).toBeUndefined();
    expect(deck?.eggSleeveId).toBeUndefined();
  });

  it.each([
    ["a number", 7],
    ["an empty id", ""],
    ["an over-long id", "x".repeat(65)],
    ["an object", { id: "gold" }],
  ])("rejects %s as either sleeve", async (_case, value) => {
    expect((await putDeck({ sleeveId: value })).status).toBe(400);
    expect((await putDeck({ eggSleeveId: value })).status).toBe(400);
  });
});

describe("saved deck format", () => {
  it("round-trips historical and Pauper format preferences through create, update and list", async () => {
    const first = await putDeck({ format: "BT13" });
    expect(first.status).toBe(200);
    expect(await savedDeck()).toMatchObject({ format: "BT13" });
    expect((await putDeck({ format: "pauper" })).status).toBe(200);
    expect(await savedDeck()).toMatchObject({ format: "pauper" });
    for (const format of ["BT13:pauper", "BT13:unlimited"]) {
      expect((await putDeck({ format })).status).toBe(200);
      expect(await savedDeck()).toMatchObject({ format });
    }
  });
  it("defaults legacy decks to Standard and rejects malformed formats", async () => {
    expect((await putDeck({})).status).toBe(200);
    expect(await savedDeck()).toMatchObject({ format: "standard" });
    for (const format of ["BT999", "LM", "BT13:standard", "BT13:invalid", "BT13:pauper:unlimited", 13, {}, null]) {
      expect((await putDeck({ format })).status).toBe(400);
    }
  });
});
