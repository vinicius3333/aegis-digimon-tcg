import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { Server } from "colyseus";
import { Client, Pool } from "pg";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { startSocialOwnedBrowserServer } from "./startSocialOwnedBrowserServer.js";

const connectionString = "postgres://postgres@127.0.0.1:55439/aegis_sealed_test";
for (const scenario of ["occupied", "sequential", "runtime", "startup", "overlap", "foreign", "wrong-url"]) {
  test(`social lifecycle ${scenario}`, { timeout: 15000 }, async (context) => {
    if (!process.env.SOCIAL_LIFECYCLE_CHILD) {
      const env: NodeJS.ProcessEnv = { ...process.env, SOCIAL_LIFECYCLE_CHILD: "1" };
      delete env.NODE_TEST_CONTEXT;
      const started = performance.now();
      const child = spawnSync(
        process.execPath,
        ["--import=./test-support/ts-loader.mjs", "--test", "--test-name-pattern", context.name, import.meta.filename],
        { env, encoding: "utf8", timeout: 14000 },
      );
      const receipt = JSON.stringify({
        parentPid: process.pid,
        childPid: child.pid,
        elapsedMs: performance.now() - started,
        status: child.status,
        signal: child.signal,
        error: child.error && {
          ...child.error,
          name: child.error.name,
          message: child.error.message,
          stack: child.error.stack,
        },
        stdout: child.stdout,
        stderr: child.stderr,
      });
      assert.equal(child.status, 0, receipt);
      assert.ok(child.stdout.includes(`COMPLETE ${scenario}`));
      return;
    }
    const admin = new Pool({ connectionString });
    const schemas = async () => (await admin.query("SELECT nspname FROM pg_namespace ORDER BY nspname")).rows;
    const errors: unknown[] = [];
    const fixtures = new Set<Awaited<ReturnType<typeof startSocialOwnedBrowserServer>>>();
    let before: Awaited<ReturnType<typeof schemas>> | undefined;
    try {
      before = await schemas();
      let allocations = 0;
      const query = Client.prototype.query;
      context.mock.method(Client.prototype, "query", function (this: Client, ...args: unknown[]) {
        if (typeof args[0] === "string" && args[0].startsWith("CREATE SCHEMA social_browser_")) allocations++;
        return Reflect.apply(query, this, args);
      });
      const start = (port = 0) => startSocialOwnedBrowserServer({ connectionString, port });
      if (scenario === "occupied") {
        const occupied = createServer();
        await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve));
        const address = occupied.address();
        assert.ok(address && typeof address !== "string");
        try {
          await assert.rejects(start(address.port), (error: Error & { code?: string }) => error.code === "EADDRINUSE");
          await assert.rejects(start(), /retired/);
          assert.equal(allocations, 1);
        } finally {
          await new Promise<void>((resolve) => occupied.close(() => resolve()));
        }
      } else if (scenario === "startup") {
        const failure = new Error("identity startup failure");
        context.mock.method(AccountStore.prototype, "ensureReady", async () => {
          throw failure;
        });
        await assert.rejects(start(), (error) => error === failure);
        await assert.rejects(start(), /retired/);
        assert.equal(allocations, 1);
      } else if (scenario === "foreign") {
        const foreign = new Server({ gracefullyShutdown: false });
        await assert.rejects(start(), /Foreign/);
        assert.equal(Server.current, foreign);
        assert.equal(allocations, 0);
      } else if (scenario === "wrong-url") {
        let connects = 0;
        const connect = context.mock.method(Pool.prototype, "connect", () => {
          connects++;
          throw new Error("unexpected Pool allocation");
        });
        await assert.rejects(
          startSocialOwnedBrowserServer({ connectionString: "postgres://postgres@127.0.0.1:5432/production", port: 0 }),
          /isolated/,
        );
        assert.equal(allocations, 0);
        assert.equal(connects, 0);
        connect.mock.restore();
      } else {
        const fixture = await start();
        fixtures.add(fixture);
        const owner = Server.current;
        assert.ok(owner);
        const http = Reflect.get(owner, "transport").server;
        assert.ok(http);
        assert.equal(http.listening, true);
        if (scenario === "runtime") {
          const fault = new Error("runtime listener fault");
          http.emit("error", fault);
          await assert.rejects(fixture.close(), (error) => error === fault);
          await assert.rejects(fixture.close(), (error) => error === fault);
          fixtures.delete(fixture);
          await assert.rejects(start(), /retired/);
          assert.equal(allocations, 1);
        } else {
          if (scenario === "overlap") {
            await assert.rejects(start(), /already owned/);
            await assert.rejects(startSocialOwnedBrowserServer({ connectionString: undefined, port: 0 }), /isolated/);
            assert.equal(Server.current, owner);
            assert.equal(allocations, 1);
            assert.equal(http.listening, true);
          }
          await fixture.close();
          fixtures.delete(fixture);
          if (scenario === "sequential") {
            const next = await start();
            fixtures.add(next);
            await next.close();
            fixtures.delete(next);
            assert.equal(allocations, 2);
          }
        }
        assert.equal(http.listening, false);
      }
    } catch (error) {
      errors.push(error);
    } finally {
      context.mock.restoreAll();
      for (const fixture of fixtures) {
        try {
          await fixture.close();
        } catch (error) {
          errors.push(error);
        }
      }
      try {
        if (before)
          assert.deepEqual(await schemas(), before, "all preexisting schemas preserved and owned schemas removed");
      } catch (error) {
        errors.push(error);
      } finally {
        try {
          await admin.end();
        } catch (error) {
          errors.push(error);
        }
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1)
      throw new AggregateError(errors, "Social lifecycle assertions and cleanup failed", { cause: errors[0] });
    console.log(`COMPLETE ${scenario}`);
  });
}
