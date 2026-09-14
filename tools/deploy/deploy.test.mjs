import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertEmptySlot, validateManifest } from "./shared.mjs";
import { buildSlotCompose, restoreComposeEnvironment } from "./deploy.mjs";

test("slot infrastructure isolates Redis and advertises exact owning process routes", () => {
  const blue = buildSlotCompose({
    slot: "blue",
    revision: "v1",
    apiEnvironment: restoreComposeEnvironment({
      DATABASE_URL: "unchanged-database",
      DISCORD_CLIENT_SECRET: "literal$$dollar$${variable}",
    }),
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  const green = buildSlotCompose({
    slot: "green",
    revision: "v2",
    apiEnvironment: {},
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  assert.equal(blue.services.api2.environment.AEGIS_PROCESS_PATH, "api/blue/p2");
  assert.notEqual(blue.services.api1.environment.AEGIS_REDIS_URL, green.services.api1.environment.AEGIS_REDIS_URL);
  assert.equal(blue.services.api1.environment.DATABASE_URL, "unchanged-database");
  assert.equal(blue.services.api1.environment.DISCORD_CLIENT_SECRET, "literal$$dollar$${variable}");
  assert.deepEqual(blue.services.api1.volumes, ["/opt/aegis-rollout/routing:/deployment:ro"]);
});

test("one empty process or unverifiable count cannot authorize stopping a slot", () => {
  const empty = { slot: "blue", acceptingNewRooms: false, activeRooms: 0, connectedClients: 0 };
  assert.throws(() => assertEmptySlot([empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, activeRooms: 1 }, empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, activeRooms: undefined }, empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, acceptingNewRooms: true }, empty], "blue"));
  assert.doesNotThrow(() => assertEmptySlot([empty, empty, empty], "blue"));
  assert.throws(() => validateManifest({ version: 1, active: { slot: "blue", revision: "../secret" }, draining: [] }));
});

test("cleanup command leaves a busy retiring process and manifest intact, and removes only a proven-empty slot", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-controller-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/state/routing`, { recursive: true });
  mkdirSync(`${root}/state/slots/blue`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  writeFileSync(`${root}/state/slots/blue/compose.json`, "{}");
  const manifest = {
    version: 1,
    active: { slot: "green", revision: "v2" },
    draining: [{ slot: "blue", revision: "v1" }],
  };
  writeFileSync(`${root}/state/routing/manifest.json`, JSON.stringify(manifest));
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');if(args.includes('exec')) console.log(JSON.stringify({slot:'blue',revision:'v1',acceptingNewRooms:false,activeRooms:args.includes('api2')?Number(process.env.TEST_ROOMS):0,connectedClients:0}));\n`,
    { mode: 0o755 },
  );
  const invoke = (rooms) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./deploy.mjs", import.meta.url)), "cleanup", "--state", `${root}/state`],
      {
        env: {
          ...process.env,
          PATH: `${root}/bin:${process.env.PATH}`,
          TEST_DOCKER_LOG: `${root}/calls.jsonl`,
          TEST_ROOMS: String(rooms),
        },
        encoding: "utf8",
      },
    );
  const busy = invoke(1);
  assert.equal(busy.status, 1);
  assert.match(busy.stderr, /leaving it running/);
  assert.ok(
    readFileSync(`${root}/calls.jsonl`, "utf8")
      .split("\n")
      .filter(Boolean)
      .every((line) => !JSON.parse(line).includes("down")),
  );
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")), manifest);
  const empty = invoke(0);
  assert.equal(empty.status, 0, empty.stderr);
  const calls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(calls.filter((args) => args.includes("down")).length, 1);
  assert.ok(calls.filter((args) => args.includes("down")).every((args) => args.includes("aegis-blue")));
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")).draining, []);
});
