import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { Pool } from "pg";
import { Server } from "colyseus";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { startSealedSwissBrowserServer } from "./startSealedSwissBrowserServer.js";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
const admin = new Pool(getSealedTestPoolConfig(connectionString));
const schemas = async () =>
  (
    await admin.query<{ nspname: string }>(
      "SELECT nspname FROM pg_namespace WHERE nspname LIKE 'swiss_browser_%' ORDER BY nspname",
    )
  ).rows.map((row) => row.nspname);

async function assertNoLeakedSchema(context: TestContext, run: () => Promise<void>) {
  const before = await schemas();
  const owned = new Set<string>();
  const originalQuery = Pool.prototype.query;
  context.mock.method(Pool.prototype, "query", function (this: Pool, ...args: unknown[]) {
    const schema =
      typeof args[0] === "string" ? /^CREATE SCHEMA (swiss_browser_[0-9a-f]{32})$/.exec(args[0])?.[1] : undefined;
    if (schema) {
      owned.add(schema);
      console.log(`created owned schema ${schema}`);
    }
    return Reflect.apply(originalQuery, this, args);
  });
  try {
    await run();
    assert.deepEqual(await schemas(), before);
  } finally {
    for (const schema of (await schemas()).filter((name) => owned.has(name))) {
      assert.match(schema, /^swiss_browser_[0-9a-f]{32}$/);
      console.log(`cleanup owned schema ${schema}`);
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  }
}

test("Swiss startup and shutdown isolate and clean their own schema", async (suite) => {
  try {
    await suite.test("cleans schema when account readiness fails", async (t) => {
      t.mock.method(AccountStore.prototype, "ensureReady", async () => {
        throw new Error("readiness failure");
      });
      await assertNoLeakedSchema(t, async () => {
        await assert.rejects(startSealedSwissBrowserServer({ connectionString, port: 0 }), /readiness failure/);
      });
    });
    await suite.test("cleans schema when Colyseus listen fails", async (t) => {
      t.mock.method(Server.prototype, "listen", async () => {
        throw new Error("listen failure");
      });
      await assertNoLeakedSchema(t, async () => {
        await assert.rejects(startSealedSwissBrowserServer({ connectionString, port: 0 }), /listen failure/);
      });
    });
    await suite.test("preserves startup and cleanup errors while removing its own schema", async (t) => {
      const startupError = new Error("listen failure");
      const cleanupError = new Error("shutdown failure");
      t.mock.method(Server.prototype, "listen", async () => {
        throw startupError;
      });
      const original = Server.prototype.gracefullyShutdown;
      t.mock.method(Server.prototype, "gracefullyShutdown", async function (this: Server) {
        await original.call(this, false);
        throw cleanupError;
      });
      await assertNoLeakedSchema(t, async () => {
        await assert.rejects(startSealedSwissBrowserServer({ connectionString, port: 0 }), (error: unknown) => {
          assert.ok(error instanceof AggregateError);
          assert.equal(error.cause, startupError);
          assert.deepEqual(error.errors, [startupError, cleanupError]);
          return true;
        });
      });
    });
    await suite.test("creates a fresh isolated schema and cleans even when shutdown fails", async (t) => {
      await assertNoLeakedSchema(t, async () => {
        const backend = await startSealedSwissBrowserServer({ connectionString, port: 0 });
        const schema = (await backend.pool.query("SELECT current_schema() AS schema")).rows[0].schema;
        assert.match(schema, /^swiss_browser_[0-9a-f]{32}$/);
        assert.equal((await backend.pool.query("SHOW search_path")).rows[0].search_path, schema);
        console.log(`fresh owned schema ${schema}`);
        const original = Server.prototype.gracefullyShutdown;
        t.mock.method(Server.prototype, "gracefullyShutdown", async function (this: Server) {
          await original.call(this, false);
          throw new Error("shutdown failure");
        });
        await assert.rejects(backend.close(), /shutdown failure/);
        assert.equal(backend.pool.ended, true);
      });
    });
  } finally {
    await admin.end();
  }
});
