import { createRequire } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGateway } from "./gateway.mjs";

const { WebSocketServer, WebSocket } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("ws");

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("cutover retains established sockets, routes reconnect to the old owner, and keeps old assets", async (t) => {
  const state = mkdtempSync(`${tmpdir()}/aegis-gateway-`);
  const servers = [];
  const sockets = [];
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    await Promise.all(servers.map((server) => new Promise((done) => server.close(done))));
    rmSync(state, { recursive: true });
  });
  for (const directory of ["routing", "assets", "releases/v1/web", "releases/v2/web", "releases/web-v3/web"])
    mkdirSync(`${state}/${directory}`, { recursive: true });
  writeFileSync(`${state}/releases/v1/web/index.html`, "old web");
  writeFileSync(`${state}/releases/v2/web/index.html`, "new web");
  writeFileSync(`${state}/releases/web-v3/web/index.html`, "independent web");
  writeFileSync(`${state}/assets/old-abc123.js`, "old chunk");
  writeFileSync(`${state}/admin-token`, "private secret");
  const publish = (active, draining, webRevision) => {
    writeFileSync(
      `${state}/routing/next.json`,
      JSON.stringify({ version: 1, active, draining, ...(webRevision ? { webRevision } : {}) }),
    );
    renameSync(`${state}/routing/next.json`, `${state}/routing/manifest.json`);
  };
  const origins = new Map();
  for (const slot of ["blue", "green", "g-333333333333", "red"]) {
    for (const index of [1, 2, 3]) {
      const server = createServer((request, response) => {
        response.setHeader("content-type", "application/json");
        if (request.url === "/ready") return response.end(JSON.stringify({ status: "ready" }));
        if (request.url === "/matchmake/reconnect/old-room" && slot === "green") {
          response.statusCode = 400;
          return response.end(JSON.stringify({ code: 4212 }));
        }
        response.end(JSON.stringify({ slot, index, path: request.url, forwarded: request.headers["x-forwarded-for"] }));
      });
      const wss = new WebSocketServer({ server });
      wss.on("connection", (socket, request) => {
        sockets.push(socket);
        socket.on("message", (message) => socket.send(`${slot}:${index}:${request.url}:${message}`));
      });
      servers.push(server);
      origins.set(`${slot}:${index}`, await listen(server));
    }
  }
  publish({ slot: "blue", revision: "v1" }, []);
  const gateway = createGateway({ state, upstreamFor: (slot, index) => origins.get(`${slot}:${index}`) });
  servers.push(gateway);
  const origin = await listen(gateway);
  const socket = new WebSocket(origin.replace("http:", "ws:") + "/api/blue/p2/process/old-room?sessionId=one");
  sockets.push(socket);
  await once(socket, "open");
  const echo = async (message) => {
    const receipt = once(socket, "message");
    socket.send(message);
    return String((await receipt)[0]);
  };
  assert.match(await echo("before"), /^blue:2:.*:before$/);
  publish({ slot: "green", revision: "v2" }, [{ slot: "blue", revision: "v1" }]);
  assert.match(await echo("after"), /^blue:2:.*:after$/);
  assert.equal(socket.readyState, WebSocket.OPEN);
  assert.equal(await (await fetch(origin)).text(), "new web");
  assert.equal(await (await fetch(`${origin}/assets/old-abc123.js`)).text(), "old chunk");
  const reconnected = new WebSocket(
    origin.replace("http:", "ws:") + "/api/blue/p2/process/old-room?sessionId=reconnect",
  );
  sockets.push(reconnected);
  await once(reconnected, "open");
  const receipt = once(reconnected, "message");
  reconnected.send("resumed");
  assert.match(String((await receipt)[0]), /^blue:2:.*:resumed$/);
  assert.equal((await fetch(`${origin}/api/blue/matchmake/create/aegis`, { method: "POST" })).status, 503);
  assert.equal((await fetch(`${origin}/api/blue/p1/matchmake/joinOrCreate/aegis`, { method: "POST" })).status, 503);
  const oldJoin = await (await fetch(`${origin}/api/blue/matchmake/joinById/old-room`, { method: "POST" })).json();
  assert.equal(oldJoin.slot, "blue");
  const created = await (await fetch(`${origin}/api/green/matchmake/create/aegis`, { method: "POST" })).json();
  assert.equal(created.slot, "green");
  const legacy = await (await fetch(`${origin}/matchmake/reconnect/old-room`, { method: "POST", body: "{}" })).json();
  assert.equal(legacy.slot, "blue");
  const failedActive = servers[3];
  await new Promise((done) => failedActive.close(done));
  const legacyDuringRestart = await (
    await fetch(`${origin}/matchmake/reconnect/old-room`, { method: "POST", body: "{}" })
  ).json();
  assert.equal(legacyDuringRestart.slot, "blue");
  assert.equal((await fetch(`${origin}/api/blue/p1/deployment/status`)).status, 404);
  assert.equal((await fetch(`${origin}/deployment/status`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/%2e%2e%2fadmin-token`)).status, 404);
  // A double slash in a stripped path must never replace the configured upstream host.
  const doubled = await (await fetch(`${origin}/api/green//evil.example/health`)).json();
  assert.equal(doubled.slot, "green");
  assert.equal(doubled.path, "//evil.example/health");
  const manifest = await fetch(`${origin}/deployment/manifest.json`);
  assert.equal(manifest.headers.get("cache-control"), "no-store");
  assert.equal((await manifest.json()).active.slot, "green");
  await Promise.all([servers[4], servers[5]].map((server) => new Promise((done) => server.close(done))));
  await new Promise((done) => setTimeout(done, 2100));
  const legacyDuringOutage = await (
    await fetch(`${origin}/matchmake/reconnect/old-room`, { method: "POST", body: "{}" })
  ).json();
  assert.equal(legacyDuringOutage.slot, "blue");
  publish(
    { slot: "g-333333333333", revision: "v3" },
    [
      { slot: "green", revision: "v2" },
      { slot: "blue", revision: "v1" },
    ],
    "web-v3",
  );
  await new Promise((done) => setTimeout(done, 2100));
  const dynamic = await fetch(`${origin}/api/g-333333333333/matchmake/create/aegis`, { method: "POST" });
  assert.equal(dynamic.status, 200);
  assert.equal((await dynamic.json()).slot, "g-333333333333");
  assert.equal(await (await fetch(origin)).text(), "independent web");
  const currentManifest = await (await fetch(`${origin}/deployment/manifest.json`)).json();
  assert.equal(currentManifest.active.slot, "g-333333333333");
  const legacyBundleManifest = await (
    await fetch(`${origin}/deployment/manifest.json`, { headers: { "x-aegis-web-revision": "v2" } })
  ).json();
  assert.deepEqual(legacyBundleManifest, {
    version: 1,
    active: { slot: "green", revision: "web-v3" },
    draining: [],
  });
  publish(
    { slot: "red", revision: "v4" },
    [
      { slot: "g-333333333333", revision: "v3" },
      { slot: "green", revision: "v2" },
      { slot: "blue", revision: "v1" },
    ],
    "web-v4",
  );
  await new Promise((done) => setTimeout(done, 2100));
  const red = await (await fetch(`${origin}/api/red/matchmake/create/aegis`, { method: "POST" })).json();
  assert.equal(red.slot, "red");
  const oldGeneration = await (await fetch(`${origin}/api/g-333333333333/p2/health`)).json();
  assert.equal(oldGeneration.slot, "g-333333333333");
  const migratedManifest = await (await fetch(`${origin}/deployment/manifest.json`)).json();
  assert.equal(migratedManifest.active.slot, "red");
  assert.equal(migratedManifest.draining[0].slot, "g-333333333333");
});
