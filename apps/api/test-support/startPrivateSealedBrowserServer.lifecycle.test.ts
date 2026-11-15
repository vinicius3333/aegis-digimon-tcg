import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { Client, Pool } from "pg";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { startPrivateSealedBrowserServer } from "./startPrivateSealedBrowserServer.js";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

test("private helper drops its owned schema when account initialization fails", async (context) => {
  const admin = new Pool(getSealedTestPoolConfig(process.env.SEALED_TEST_DATABASE_URL));
  let schema: string | undefined;
  let fixturePool: Pool | undefined;
  let fixtureEnded = false;
  const failure = new Error("private browser account initialization failed");
  const initialization = context.mock.method(
    AccountStore.prototype,
    "ensureReady",
    async function (this: AccountStore) {
      fixturePool = this.pool;
      const originalEnd: (this: Pool) => Promise<void> = this.pool.end;
      context.mock.method(this.pool, "end", async () => {
        await originalEnd.call(this.pool);
        fixtureEnded = true;
      });
      const result = await this.pool.query<{ schema: string }>("SELECT current_schema() AS schema");
      schema = result.rows[0]?.schema;
      assert.match(schema ?? "", /^private_browser_[a-f0-9]{32}$/);
      throw failure;
    },
  );
  try {
    await assert.rejects(
      startPrivateSealedBrowserServer({
        connectionString: process.env.SEALED_TEST_DATABASE_URL,
        port: 0,
      }),
      (error) => error === failure,
    );
    initialization.mock.restore();
    assert.ok(schema);
    const result = await admin.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
    assert.equal(result.rowCount, 0);
  } finally {
    initialization.mock.restore();
    const cleanupErrors: unknown[] = [];
    async function attempt(operation: () => unknown) {
      try {
        await operation();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (fixturePool && !fixtureEnded) {
      const pool = fixturePool;
      await attempt(() => pool.end());
    }
    if (schema && /^private_browser_[a-f0-9]{32}$/.test(schema))
      await attempt(() => admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`));
    await attempt(() => admin.end());
    assert.deepEqual(cleanupErrors, []);
  }
});

for (const boundary of [
  "create",
  "express-setup",
  "transport-listen",
  "listen",
  "pool-end",
  "drop",
  "admin-end",
  "startup-cleanup",
] as const) {
  test(`private helper releases all owned database resources at ${boundary} failure`, async (context) => {
    if (!process.env.PRIVATE_BROWSER_LIFECYCLE_CHILD) {
      let output: string;
      try {
        output = execFileSync(
          process.execPath,
          [
            "--import=./test-support/ts-loader.mjs",
            "--test",
            "--test-name-pattern",
            context.name,
            import.meta.filename,
          ],
          { env: { ...childEnvironment, PRIVATE_BROWSER_LIFECYCLE_CHILD: "1" }, encoding: "utf8" },
        );
      } catch (error) {
        if (error && typeof error === "object") {
          if ("stdout" in error && (typeof error.stdout === "string" || Buffer.isBuffer(error.stdout)))
            process.stdout.write(error.stdout);
          if ("stderr" in error && (typeof error.stderr === "string" || Buffer.isBuffer(error.stderr)))
            process.stderr.write(error.stderr);
        }
        throw error;
      }
      assert.ok(output.split(/\r?\n/).includes(`SUCCESS boundary ${boundary}`));
      assert.doesNotMatch(output, /recursive|# SKIP/);
      return;
    }
    const inspector = new Pool(getSealedTestPoolConfig(process.env.SEALED_TEST_DATABASE_URL));
    const pools = new Set<Pool>();
    const ended = new Set<Pool>();
    let schema: string | undefined;
    let ownedAdmin: (() => Pool) | undefined;
    let server: (() => Server) | undefined;
    const failure = new Error(`injected ${boundary} failure`);
    const cleanupFailure = new Error("injected pool cleanup failure", { cause: failure });
    const owners = new WeakMap<object, Pool>();
    const pendingDrops = new WeakSet<Client>();
    const emit = Pool.prototype.emit;
    const query = Client.prototype.query;
    const end: (this: Pool) => Promise<void> = Pool.prototype.end;
    const shutdown = Server.prototype.gracefullyShutdown;
    const emitSpy = context.mock.method(
      Pool.prototype,
      "emit",
      function (this: Pool, event: string | symbol, ...args: unknown[]) {
        if ((event === "connect" || event === "acquire") && args[0] instanceof Client && this !== inspector)
          owners.set(args[0], this);
        return Reflect.apply(emit, this, [event, ...args]);
      },
    );
    const querySpy = context.mock.method(Client.prototype, "query", function (this: Client, ...args: unknown[]) {
      const sql = args[0];
      const owner = owners.get(this);
      if (owner && typeof sql === "string" && sql.startsWith("CREATE SCHEMA private_browser_")) {
        pools.add(owner);
        ownedAdmin = () => owner;
        schema = sql.slice("CREATE SCHEMA ".length);
        if (boundary === "create" || boundary === "startup-cleanup") throw failure;
      }
      const result = Reflect.apply(query, this, args);
      if (boundary === "drop" && owner === ownedAdmin?.() && typeof sql === "string") {
        if (sql.startsWith("DROP SCHEMA private_browser_")) {
          return Promise.resolve(result).then((value) => {
            pendingDrops.add(this);
            return value;
          });
        }
        if (sql === "COMMIT" && pendingDrops.has(this)) {
          return Promise.resolve(result).then(() => {
            pendingDrops.delete(this);
            throw failure;
          });
        }
      }
      return result;
    });
    const endSpy = context.mock.method(Pool.prototype, "end", async function (this: Pool) {
      await end.call(this);
      ended.add(this);
      if (
        (boundary === "pool-end" && this !== ownedAdmin?.()) ||
        ((boundary === "admin-end" || boundary === "startup-cleanup") && this === ownedAdmin?.())
      )
        throw cleanupFailure;
    });
    const ready = AccountStore.prototype.ensureReady;
    const readySpy = context.mock.method(AccountStore.prototype, "ensureReady", async function (this: AccountStore) {
      pools.add(this.pool);
      return ready.call(this);
    });
    const routeSpy =
      boundary === "express-setup"
        ? context.mock.method(express.application, "use", () => {
            throw failure;
          })
        : undefined;
    const transportSpy =
      boundary === "transport-listen"
        ? context.mock.method(WebSocketTransport.prototype, "listen", () => {
            throw failure;
          })
        : undefined;
    const listen = Server.prototype.listen;
    const listenSpy = context.mock.method(
      Server.prototype,
      "listen",
      function (this: Server, ...args: Parameters<Server["listen"]>) {
        server = () => this;
        if (boundary === "listen") return Promise.reject(failure);
        return listen.apply(this, args);
      },
    );
    try {
      const start = startPrivateSealedBrowserServer({
        connectionString: process.env.SEALED_TEST_DATABASE_URL,
        port: 0,
      });
      if (["close", "pool-end", "drop", "admin-end"].includes(boundary)) {
        const fixture = await start;
        await assert.rejects(
          fixture.close(),
          (error) =>
            error === failure ||
            (error instanceof Error && error.cause === failure) ||
            (error instanceof AggregateError && error.errors.includes(failure)),
        );
        await assert.rejects(
          fixture.close(),
          (error) =>
            error === failure ||
            (error instanceof Error && error.cause === failure) ||
            (error instanceof AggregateError && error.errors.includes(failure)),
        );
      } else {
        await assert.rejects(start, (error) => {
          if (boundary !== "startup-cleanup") return error === failure;
          assert.ok(error instanceof AggregateError);
          assert.equal(error.cause, failure);
          assert.equal(error.errors[0], failure);
          assert.equal(error.errors[1], cleanupFailure);
          assert.equal(error.errors.length, 2);
          return true;
        });
      }
      assert.ok(schema);
      assert.equal(pools.size, boundary === "create" || boundary === "startup-cleanup" ? 1 : 2);
      assert.equal([...pools].filter((pool) => !ended.has(pool)).length, 0, "every helper-owned pool ended");
      const result = await inspector.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
      assert.equal(result.rowCount, 0, "owned schema removed");
      console.log(`SUCCESS boundary ${boundary}`);
    } finally {
      routeSpy?.mock.restore();
      transportSpy?.mock.restore();
      querySpy.mock.restore();
      emitSpy.mock.restore();
      endSpy.mock.restore();
      readySpy.mock.restore();
      listenSpy.mock.restore();
      const cleanupErrors: unknown[] = [];
      async function attempt(operation: () => unknown) {
        try {
          await operation();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (typeof server === "function") {
        const currentServer = server();
        await attempt(() => shutdown.call(currentServer, false));
      }
      for (const pool of pools) if (!ended.has(pool)) await attempt(() => end.call(pool));
      if (schema && /^private_browser_[a-f0-9]{32}$/.test(schema))
        await attempt(() => inspector.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`));
      await attempt(() => inspector.end());
      assert.deepEqual(cleanupErrors, []);
    }
  });
}

for (const scenario of [
  "presence",
  "driver",
  "transport",
  "multiple",
  "startup-multiple",
  "room",
  "room-hook",
  "overlap",
  "sequential",
  "constructor",
  "http-close",
  "wss-client",
  "wss-client-pre",
  "wss-close",
  "http-close-pre",
  "foreign-live",
]) {
  test(`private helper isolates SDK ${scenario} teardown`, () => {
    let output: string;
    try {
      output = execFileSync(
        process.execPath,
        ["--import=./test-support/ts-loader.mjs", "test-support/privateSealedShutdownFaultWorker.ts", scenario],
        { env: childEnvironment, encoding: "utf8" },
      );
    } catch (error) {
      if (error && typeof error === "object") {
        if ("stdout" in error && (typeof error.stdout === "string" || Buffer.isBuffer(error.stdout)))
          process.stdout.write(error.stdout);
        if ("stderr" in error && (typeof error.stderr === "string" || Buffer.isBuffer(error.stderr)))
          process.stderr.write(error.stderr);
      }
      throw error;
    }
    assert.ok(output.split(/\r?\n/).includes(`SUCCESS scenario ${scenario}`));
    assert.doesNotMatch(output, /recursive|# SKIP/);
  });
}
