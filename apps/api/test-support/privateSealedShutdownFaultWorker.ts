import { once } from "node:events";
import { connect, type Socket } from "node:net";
import assert from "node:assert/strict";
import { test } from "node:test";
import { LocalPresence, LocalDriver, Room, Server, matchMaker } from "colyseus";
import { Pool } from "pg";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { getPrivateSealedResults } from "../dist/rooms/sealed/getPrivateSealedResults.js";
import { getSealedTestPoolConfig } from "./getSealedTestPoolConfig.js";
import { startPrivateSealedBrowserServer } from "./startPrivateSealedBrowserServer.js";

const scenario = process.argv[2];
test(`owned SDK teardown ${scenario}`, async (context) => {
  if (scenario === "foreign-live") {
    const foreign = new Server({ transport: new WebSocketTransport(), gracefullyShutdown: false });
    class ForeignRoom extends Room {}
    foreign.define("foreign_live_probe", ForeignRoom);
    await foreign.listen(0, "127.0.0.1");
    const listing = await matchMaker.createRoom("foreign_live_probe", {});
    const live = matchMaker.getLocalRoomById(listing.roomId);
    const presence = matchMaker.presence;
    const driver = matchMaker.driver;
    let queries = 0;
    let connects = 0;
    const querySpy = context.mock.method(Pool.prototype, "query", () => {
      queries++;
      throw new Error("unexpected PG query");
    });
    const connectSpy = context.mock.method(Pool.prototype, "connect", () => {
      connects++;
      throw new Error("unexpected PG connect");
    });
    try {
      assert.ok(live);
      await assert.rejects(
        startPrivateSealedBrowserServer({ connectionString: process.env.SEALED_TEST_DATABASE_URL, port: 0 }),
        /Foreign Colyseus runtime/,
      );
      assert.equal(queries, 0);
      assert.equal(connects, 0);
      assert.equal(Server.current, foreign);
      assert.equal(matchMaker.presence, presence);
      assert.equal(matchMaker.driver, driver);
      assert.equal(matchMaker.getLocalRoomById(listing.roomId), live);
      assert.ok((await driver.query({})).some((room) => room.roomId === listing.roomId));
    } finally {
      querySpy.mock.restore();
      connectSpy.mock.restore();
      await foreign.gracefullyShutdown(false);
    }
    console.log(`SUCCESS scenario ${scenario}`);
    return;
  }
  const inspector = new Pool(getSealedTestPoolConfig(process.env.SEALED_TEST_DATABASE_URL));
  const failure = new Error(`owned ${scenario} failure`);
  const secondFailure = new Error("owned second cleanup failure");
  const startupFailure = new Error("owned startup failure");
  const events: string[] = [];
  const pools = new Set<Pool>();
  const ended = new Set<Pool>();
  const schemas = new Set<string>();
  const query = Pool.prototype.query;
  const end: (this: Pool) => Promise<void> = Pool.prototype.end;
  const presenceShutdown = LocalPresence.prototype.shutdown;
  const driverShutdown = LocalDriver.prototype.shutdown;
  const transportShutdown = WebSocketTransport.prototype.shutdown;
  const listen = Server.prototype.listen;
  const ready = AccountStore.prototype.ensureReady;
  let ownedServer: (() => Server) | undefined;
  const sockets: Socket[] = [];
  const socketReceipts = new Map<Socket, Promise<void>>();
  const rawErrors: Array<{ error: Error; owned: boolean }> = [];
  let assertNetworkClosed: (() => Promise<void>) | undefined;
  let closing: Promise<void> | undefined;
  let fixture: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>> | undefined;
  let disposeResults: (() => Promise<void>) | undefined;
  let room: Room | undefined;
  const restores: Array<() => void> = [];
  const querySpy = context.mock.method(Pool.prototype, "query", function (this: Pool, ...args: unknown[]) {
    const sql = args[0];
    if (typeof sql === "string" && sql.startsWith("CREATE SCHEMA private_browser_")) {
      schemas.add(sql.slice("CREATE SCHEMA ".length));
      pools.add(this);
    }
    return Reflect.apply(query, this, args);
  });
  restores.push(() => querySpy.mock.restore());
  const endSpy = context.mock.method(Pool.prototype, "end", async function (this: Pool) {
    events.push("pool");
    await end.call(this);
    ended.add(this);
  });
  restores.push(() => endSpy.mock.restore());
  const readySpy = context.mock.method(AccountStore.prototype, "ensureReady", async function (this: AccountStore) {
    pools.add(this.pool);
    await ready.call(this);
    const results = getPrivateSealedResults({ accounts: this });
    const closeResults = results.close.bind(results);
    disposeResults = closeResults;
    const resultsSpy = context.mock.method(results, "close", async () => {
      events.push("results");
      if (scenario === "multiple" || scenario === "startup-multiple") throw secondFailure;
      await closeResults();
    });
    restores.push(() => resultsSpy.mock.restore());
  });
  restores.push(() => readySpy.mock.restore());
  const listenSpy = context.mock.method(
    Server.prototype,
    "listen",
    function (this: Server, ...args: Parameters<Server["listen"]>) {
      ownedServer = () => this;
      if (scenario === "startup-multiple") return Promise.reject(startupFailure);
      return listen.apply(this, args);
    },
  );
  restores.push(() => listenSpy.mock.restore());
  const presenceSpy = context.mock.method(LocalPresence.prototype, "shutdown", function (this: LocalPresence) {
    events.push("presence");
    if (["presence", "multiple", "startup-multiple"].includes(scenario ?? "")) throw failure;
    return presenceShutdown.call(this);
  });
  restores.push(() => presenceSpy.mock.restore());
  const driverSpy = context.mock.method(LocalDriver.prototype, "shutdown", async function (this: LocalDriver) {
    events.push("driver");
    if (scenario === "driver") throw failure;
    await driverShutdown.call(this);
  });
  restores.push(() => driverSpy.mock.restore());
  const transportSpy = context.mock.method(
    WebSocketTransport.prototype,
    "shutdown",
    function (this: WebSocketTransport) {
      events.push("transport");
      if (scenario === "transport") throw failure;
      return transportShutdown.call(this);
    },
  );
  restores.push(() => transportSpy.mock.restore());
  if (scenario === "constructor") {
    const boot = Reflect.get(Server.prototype, "bootRuntime");
    assert.equal(typeof boot, "function");
    Object.defineProperty(Server.prototype, "bootRuntime", {
      configurable: true,
      writable: true,
      value: function (this: Server) {
        ownedServer = () => this;
        Reflect.apply(boot, this, []);
        throw failure;
      },
    });
    restores.push(() =>
      Object.defineProperty(Server.prototype, "bootRuntime", { configurable: true, writable: true, value: boot }),
    );
  }
  try {
    const start = startPrivateSealedBrowserServer({ connectionString: process.env.SEALED_TEST_DATABASE_URL, port: 0 });
    if (scenario === "constructor") {
      await assert.rejects(start, (error) => error === failure);
    } else if (scenario === "startup-multiple") {
      await assert.rejects(start, (error) => {
        assert.ok(error instanceof AggregateError);
        assert.equal(error.cause, startupFailure);
        assert.equal(error.errors[0], startupFailure);
        assert.ok(error.errors[1] instanceof AggregateError);
        assert.deepEqual(error.errors[1].errors, [failure, secondFailure]);
        return true;
      });
    } else {
      fixture = await start;
      assert.ok(ownedServer);
      if (scenario === "room" || scenario === "room-hook") {
        class ShutdownRoom extends Room {
          override onBeforeShutdown() {
            events.push("hook");
            assert.equal(this.locked, true);
            if (scenario === "room-hook") throw failure;
            super.onBeforeShutdown();
          }
          override onDispose() {
            events.push("dispose");
          }
        }
        ownedServer().define("owned_shutdown_probe", ShutdownRoom);
        const listing = await matchMaker.createRoom("owned_shutdown_probe", {});
        room = matchMaker.getLocalRoomById(listing.roomId);
        assert.ok(room);
      }
      if (scenario === "overlap") {
        const count = schemas.size;
        await assert.rejects(
          startPrivateSealedBrowserServer({ connectionString: process.env.SEALED_TEST_DATABASE_URL, port: 0 }),
          /runtime/,
        );
        assert.equal(schemas.size, count);
        assert.equal(Server.current, ownedServer());
      }
      if (scenario === "http-close") {
        const http = ownedServer().transport.server;
        assert.ok(http);
        const close = http.close.bind(http);
        const spy = context.mock.method(http, "close", function (...args: Parameters<typeof http.close>) {
          close(...args);
          throw failure;
        });
        restores.push(() => spy.mock.restore());
      }
      if (["wss-client", "wss-client-pre", "wss-close"].includes(scenario ?? "")) {
        const http = ownedServer().transport.server;
        const address = http?.address();
        assert.ok(http && address && typeof address !== "string");
        const wss: unknown = Reflect.get(ownedServer().transport, "wss");
        assert.ok(typeof wss === "object" && wss !== null);
        assert.ok("clients" in wss && wss.clients instanceof Set);
        assert.ok("handleUpgrade" in wss && typeof wss.handleUpgrade === "function");
        const handleUpgrade = wss.handleUpgrade;
        const clients: Set<unknown> = wss.clients;
        http.removeAllListeners("upgrade");
        http.on("upgrade", (request, stream, head) => {
          Reflect.apply(handleUpgrade, wss, [request, stream, head, () => {}]);
        });
        for (let index = 0; index < 2; index++) {
          const socket = connect(address.port, "127.0.0.1");
          sockets.push(socket);
          socketReceipts.set(socket, new Promise<void>((resolve) => socket.once("close", () => resolve())));
          await once(socket, "connect");
          const upgraded = once(socket, "data");
          socket.write(
            "GET /owned-shutdown-probe HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n",
          );
          const [response] = await upgraded;
          assert.match(String(response), /101 Switching Protocols/);
        }
        assert.equal(clients.size, 2, "two actual upgraded clients");
        let wssClosed = false;
        assert.ok("once" in wss && typeof wss.once === "function");
        Reflect.apply(wss.once, wss, [
          "close",
          () => {
            wssClosed = true;
          },
        ]);
        assertNetworkClosed = async () => {
          await Promise.all(sockets.map((socket) => socketReceipts.get(socket)));
          assert.ok(events.includes("second-client"), "second upgraded client termination attempted");
          assert.equal(clients.size, 0);
          assert.equal(wssClosed, true, "actual WSS close receipt");
          assert.equal(http.listening, false);
          assert.ok(sockets.every((socket) => socket.destroyed));
        };
        const second = [...clients][1];
        assert.ok(
          typeof second === "object" &&
            second !== null &&
            "terminate" in second &&
            typeof second.terminate === "function",
        );
        const secondTerminate = second.terminate;
        Object.defineProperty(second, "terminate", {
          configurable: true,
          value: () => {
            events.push("second-client");
            return Reflect.apply(secondTerminate, second, []);
          },
        });
        restores.push(() => {
          Reflect.deleteProperty(second, "terminate");
        });
        const client = [...clients][0];
        assert.ok(
          typeof client === "object" &&
            client !== null &&
            "terminate" in client &&
            typeof client.terminate === "function",
        );
        if (scenario === "wss-close") {
          assert.ok("close" in wss && typeof wss.close === "function");
          const close = wss.close;
          let calls = 0;
          Object.defineProperty(wss, "close", {
            configurable: true,
            value: (...args: unknown[]) => {
              if (++calls === 1) throw failure;
              return Reflect.apply(close, wss, args);
            },
          });
          restores.push(() => {
            Reflect.deleteProperty(wss, "close");
          });
        }
        const terminate = client.terminate.bind(client);
        const descriptor = Object.getOwnPropertyDescriptor(client, "terminate");
        if (scenario !== "wss-close")
          Object.defineProperty(client, "terminate", {
            configurable: true,
            value: () => {
              if (scenario !== "wss-client-pre") terminate();
              throw failure;
            },
          });
        restores.push(() => {
          if (descriptor) Object.defineProperty(client, "terminate", descriptor);
          else Reflect.deleteProperty(client, "terminate");
        });
      }
      if (scenario === "http-close-pre") {
        const http = ownedServer().transport.server;
        const address = http?.address();
        assert.ok(http && address && typeof address !== "string");
        const socket = connect(address.port, "127.0.0.1");
        sockets.push(socket);
        socketReceipts.set(socket, new Promise<void>((resolve) => socket.once("close", () => resolve())));
        await once(socket, "connect");
        socket.on("error", (error: Error) => {
          rawErrors.push({ error, owned: Boolean(closing) && events.includes("http-force") });
        });
        socket.write("GET / HTTP/1.1\r\nHost: localhost\r\n");
        await new Promise((resolve) => setImmediate(resolve));
        const force = http.closeAllConnections.bind(http);
        const forceSpy = context.mock.method(http, "closeAllConnections", () => {
          events.push("http-force");
          force();
        });
        const spy = context.mock.method(http, "close", () => {
          throw failure;
        });
        restores.push(
          () => spy.mock.restore(),
          () => forceSpy.mock.restore(),
        );
        assertNetworkClosed = async () => {
          await Promise.all(sockets.map((socket) => socketReceipts.get(socket)));
          assert.ok(events.includes("http-force"));
          assert.ok(socket.destroyed);
        };
      }
      const first = fixture.close();
      closing = first;
      const observed = Promise.race([
        first,
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("owned cleanup deadline: nested disposal blocked later resources")),
            1200,
          );
          first.then(
            () => clearTimeout(timer),
            () => clearTimeout(timer),
          );
        }),
      ]);
      assert.equal(fixture.close(), first);
      if (["room", "overlap", "sequential"].includes(scenario ?? "")) await first;
      else
        await assert.rejects(observed, (error) => {
          if (scenario === "multiple") {
            assert.ok(error instanceof AggregateError);
            assert.deepEqual(error.errors, [failure, secondFailure]);
          } else if (scenario === "http-close" || scenario === "http-close-pre") {
            assert.ok(error instanceof AggregateError);
            if (scenario === "http-close") assert.deepEqual(error.errors, [failure, failure]);
            else {
              assert.ok(
                events.includes("http-force"),
                "independent HTTP force-close attempted after synchronous failure",
              );
              assert.equal(error.errors[0], failure);
              assert.equal(error.errors[1], failure);
              assert.match(String(error.errors[2]), /HTTP.*closure/);
            }
          } else assert.equal(error, failure);
          return true;
        });
      await assertNetworkClosed?.();
      assert.equal(fixture.close(), first);
      if (scenario === "room" || scenario === "room-hook") {
        assert.deepEqual(
          events.filter((event) => event === "hook" || event === "dispose"),
          ["hook", "dispose"],
        );
        assert.equal(matchMaker.getLocalRoomById(room!.roomId), undefined);
      }
      assert.equal(events.filter((event) => event === "presence").length, 1);
      assert.equal(events.filter((event) => event === "driver").length, 1);
      assert.equal(events.filter((event) => event === "results").length, 1);
      assert.ok(events.indexOf("results") < events.indexOf("pool"));
      if (scenario === "sequential") {
        const next = await startPrivateSealedBrowserServer({
          connectionString: process.env.SEALED_TEST_DATABASE_URL,
          port: 0,
        });
        await next.close();
      } else if (!["room", "overlap"].includes(scenario ?? "")) {
        const count = schemas.size;
        await assert.rejects(
          startPrivateSealedBrowserServer({ connectionString: process.env.SEALED_TEST_DATABASE_URL, port: 0 }),
          /retired/,
        );
        assert.equal(schemas.size, count);
      }
    }
    for (const schema of schemas) {
      assert.equal((await inspector.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])).rowCount, 0);
    }
    assert.equal([...pools].filter((pool) => !ended.has(pool)).length, 0);
  } finally {
    const cleanupErrors: unknown[] = [];
    async function attempt(operation: () => unknown) {
      try {
        await operation();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    for (const restore of restores) await attempt(restore);
    if (room && matchMaker.getLocalRoomById(room.roomId)) await attempt(() => room!.disconnect());
    if (ownedServer) {
      const presence = ownedServer().options.presence;
      const driver = ownedServer().options.driver;
      if (matchMaker.state !== matchMaker.MatchMakerState.SHUTTING_DOWN)
        await attempt(() => matchMaker.gracefullyShutdown());
      const transport = ownedServer().transport;
      const wss: unknown = Reflect.get(transport, "wss");
      let wssClosed: Promise<void> | undefined;
      if (typeof wss === "object" && wss !== null) {
        if ("clients" in wss && wss.clients instanceof Set) {
          const clients: Set<unknown> = wss.clients;
          for (const client of clients)
            await attempt(() => {
              assert.ok(
                typeof client === "object" &&
                  client !== null &&
                  "terminate" in client &&
                  typeof client.terminate === "function",
              );
              Reflect.apply(client.terminate, client, []);
            });
        }
        if ("close" in wss && typeof wss.close === "function") {
          const close = wss.close;
          wssClosed = new Promise<void>((resolve) => {
            try {
              Reflect.apply(close, wss, [
                (error?: Error) => {
                  if (error && error.message !== "The server is not running") cleanupErrors.push(error);
                  resolve();
                },
              ]);
            } catch (error) {
              cleanupErrors.push(error);
              resolve();
            }
          });
        }
      }
      for (const socket of sockets) await attempt(() => socket.destroy());
      const http = transport.server;
      let httpClosed: Promise<void> | undefined;
      if (http) {
        httpClosed = new Promise<void>((resolve) => {
          try {
            http.close((error) => {
              if (error && !("code" in error && error.code === "ERR_SERVER_NOT_RUNNING")) cleanupErrors.push(error);
              resolve();
            });
          } catch (error) {
            cleanupErrors.push(error);
            resolve();
          }
        });
        await attempt(() => http.closeAllConnections());
      }
      if (wssClosed) await attempt(() => wssClosed);
      if (httpClosed) await attempt(() => httpClosed);
      for (const receipt of socketReceipts.values()) await attempt(() => receipt);
      if (closing) await attempt(() => closing!.catch(() => {}));
      if (presence instanceof LocalPresence) await attempt(() => presenceShutdown.call(presence));
      if (driver instanceof LocalDriver) await attempt(() => driverShutdown.call(driver));
    }
    for (const socket of sockets) await attempt(() => socket.destroy());
    if (disposeResults) await attempt(disposeResults);
    for (const pool of pools)
      if (!ended.has(pool) && Reflect.get(pool, "ended") !== true) await attempt(() => end.call(pool));
    for (const schema of schemas) {
      assert.match(schema, /^private_browser_[a-f0-9]{32}$/);
      await attempt(() => inspector.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`));
    }
    await attempt(() => inspector.end());
    for (const { error, owned } of rawErrors)
      await attempt(() => {
        assert.ok(owned, "raw socket error must follow owned force-close");
        assert.ok("code" in error && error.code === "ECONNRESET", "only owned ECONNRESET is expected");
      });
    assert.deepEqual(cleanupErrors, []);
  }
  console.log(`SUCCESS scenario ${scenario}`);
});
