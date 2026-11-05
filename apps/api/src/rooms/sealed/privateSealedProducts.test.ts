import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import { Pool } from "pg";
import { beforeAll, afterAll, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { installPrivateSealedRoutes } from "#api/rooms/sealed/installPrivateSealedRoutes";
import { getPrivateSealedResults } from "#api/rooms/sealed/getPrivateSealedResults";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Product SQL tests require isolated loopback Postgres 55439");
}
const schema = `private_products_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString });
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const accounts = new AccountStore(pool);
const app = express();
app.use(express.json());
installPrivateSealedRoutes({ app, accounts });
const server = createServer(app);
let base: string;

beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await accounts.ensureReady();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/private-sealed`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getPrivateSealedResults({ accounts }).close();
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});

async function send(path: string, body: unknown, cookie = "") {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

it("rejects forged upcoming and unknown products through HTTP", async () => {
  for (const setId of ["BT27", "unknown"]) {
    const response = await send("", { name: "Host", requestId: randomUUID(), setId });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "sealed_product_unavailable" });
  }
  expect((await pool.query("SELECT count(*) FROM private_sealed_series")).rows[0].count).toBe("0");
});

it("creates two real selected products, binds idempotency to the product, and prevents guest overrides", async () => {
  const series: {
    input: { name: string; requestId: string; setId: string };
    hostCookie: string;
    host: PrivateSealedView;
  }[] = [];
  for (const setId of ["EX13", "BT26"]) {
    const input = { name: "Host", requestId: randomUUID(), setId };
    const response = await send("", input);
    expect(response.status).toBe(200);
    const hostCookie = response.headers.get("set-cookie")!.split(";")[0]!;
    const host = (await response.json()) as PrivateSealedView;
    expect(host.pool.configuration.setId).toBe(setId);
    expect(host.pool.packs.flat().every((pull) => pull.cardId.startsWith(`${setId}-`))).toBe(true);
    series.push({ input, hostCookie, host });
    expect((await send(`/${host.code}/join`, { name: "Guest", setId: "BT4" })).status).toBe(400);
    const joined = await send(`/${host.code}/join`, { name: "Guest" });
    expect(joined.status).toBe(200);
    const guest = (await joined.json()) as PrivateSealedView;
    expect(guest.pool.configuration).toEqual(host.pool.configuration);
    expect(guest.pool.packs.flat().every((pull) => pull.cardId.startsWith(`${setId}-`))).toBe(true);
    expect((await send(`/${host.code}/join`, { name: "Third" })).status).toBe(409);
  }
  const { input, hostCookie, host } = series[0]!;
  const retry = await send("", input, hostCookie);
  expect(retry.status).toBe(200);
  expect(((await retry.json()) as PrivateSealedView).pool).toEqual(host.pool);
  const conflict = await send("", { ...input, setId: "BT26" }, hostCookie);
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toEqual({ error: "creation_conflict" });
});
