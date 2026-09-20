import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertEmptySlot, validateManifest } from "./shared.mjs";
import { buildSlotCompose, generationForRevision, restoreComposeEnvironment } from "./deploy.mjs";

test("generation infrastructure isolates Redis and advertises exact owning process routes", () => {
  const blue = buildSlotCompose({
    slot: "g-111111111111",
    revision: "1111111111111111111111111111111111111111",
    apiEnvironment: restoreComposeEnvironment({
      DATABASE_URL: "unchanged-database",
      DISCORD_CLIENT_SECRET: "literal$$dollar$${variable}",
    }),
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  const green = buildSlotCompose({
    slot: "g-222222222222",
    revision: "2222222222222222222222222222222222222222",
    apiEnvironment: {},
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  assert.equal(blue.services.api2.environment.AEGIS_PROCESS_PATH, "api/g-111111111111/p2");
  assert.notEqual(blue.services.api1.environment.AEGIS_REDIS_URL, green.services.api1.environment.AEGIS_REDIS_URL);
  assert.equal(blue.services.api1.environment.DATABASE_URL, "unchanged-database");
  assert.equal(blue.services.api1.environment.DISCORD_CLIENT_SECRET, "literal$$dollar$${variable}");
  assert.deepEqual(blue.services.api1.volumes, ["/opt/aegis-rollout/routing:/deployment:ro"]);
});

test("a revision receives a stable Docker-safe generation identifier", () => {
  assert.equal(generationForRevision("ABCDEF0123456789abcdef0123456789abcdef01"), "g-abcdef012345");
  assert.throws(() => generationForRevision("not-a-git-object"), /revision/i);
});

test("one empty process or unverifiable count cannot authorize stopping a slot", () => {
  const empty = { slot: "blue", acceptingNewRooms: false, activeRooms: 0, connectedClients: 0 };
  assert.throws(() => assertEmptySlot([empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, activeRooms: 1 }, empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, activeRooms: undefined }, empty], "blue"));
  assert.throws(() => assertEmptySlot([empty, { ...empty, acceptingNewRooms: true }, empty], "blue"));
  assert.doesNotThrow(() => assertEmptySlot([empty, empty, empty], "blue"));
  assert.doesNotThrow(() =>
    validateManifest({
      version: 1,
      webRevision: "web-sha",
      active: { slot: "g-abcdef012345", revision: "api-sha" },
      draining: [
        { slot: "green", revision: "legacy-sha" },
        { slot: "g-123456789abc", revision: "older-sha" },
      ],
    }),
  );
  assert.throws(() =>
    validateManifest({ version: 1, active: { slot: "g-../secret", revision: "safe" }, draining: [] }),
  );
  assert.throws(() => validateManifest({ version: 1, active: { slot: "blue", revision: "../secret" }, draining: [] }));
});

test("cleanup command leaves a busy retiring process and manifest intact, and removes only a proven-empty slot", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-controller-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/state/routing`, { recursive: true });
  mkdirSync(`${root}/state/slots/blue`, { recursive: true });
  mkdirSync(`${root}/state/slots/g-123456789abc`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  writeFileSync(`${root}/state/slots/blue/compose.json`, "{}");
  writeFileSync(`${root}/state/slots/g-123456789abc/compose.json`, "{}");
  const manifest = {
    version: 1,
    active: { slot: "green", revision: "v2" },
    draining: [
      { slot: "blue", revision: "v1" },
      { slot: "g-123456789abc", revision: "v0" },
    ],
  };
  writeFileSync(`${root}/state/routing/manifest.json`, JSON.stringify(manifest));
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node\nconst fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');const dynamic=args.includes('aegis-g-123456789abc');if(args.includes('exec')) console.log(JSON.stringify({slot:dynamic?'g-123456789abc':'blue',revision:dynamic?'v0':'v1',acceptingNewRooms:false,activeRooms:!dynamic&&args.includes('api2')?Number(process.env.TEST_ROOMS):0,connectedClients:0}));\n`,
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
  assert.match(busy.stderr, /Cleanup pending.*blue.*leaving it running/);
  const busyCalls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(busyCalls.filter((args) => args.includes("down")).length, 1);
  assert.ok(busyCalls.find((args) => args.includes("down")).includes("aegis-g-123456789abc"));
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")).draining, [
    manifest.draining[0],
  ]);
  const empty = invoke(0);
  assert.equal(empty.status, 0, empty.stderr);
  const calls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(calls.filter((args) => args.includes("down")).length, 2);
  assert.ok(calls.some((args) => args.includes("down") && args.includes("aegis-blue")));
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")).draining, []);
});

test("cleanup refuses to stop a handoff generation while authoritative rooms remain", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-handoff-cleanup-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/state/routing`, { recursive: true });
  mkdirSync(`${root}/state/slots/blue`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  writeFileSync(`${root}/state/slots/blue/compose.json`, "{}");
  writeFileSync(
    `${root}/state/routing/manifest.json`,
    JSON.stringify({
      version: 1,
      capabilities: { liveRoomHandoff: true },
      active: { slot: "green", revision: "v2" },
      draining: [{ slot: "blue", revision: "v1" }],
    }),
  );
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');const script=args[args.indexOf('-e')+1]||'';
if(args.includes('exec')&&script.includes('/deployment/handoff/cleanup-safety')) console.log(JSON.stringify({slot:'blue',ownershipVerified:true,authoritativeRooms:1,inFlightTransfers:0,pendingTasks:0}));
else if(args.includes('exec')&&script.includes('/deployment/status')) console.log(JSON.stringify({slot:'blue',revision:'v1',acceptingNewRooms:false,activeRooms:0,connectedClients:0}));
else if(args.includes('exec')) console.log(JSON.stringify({slot:'blue',revision:'v1',acceptingNewRooms:false,activeRooms:0,connectedClients:0}));
`,
    { mode: 0o755 },
  );

  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./deploy.mjs", import.meta.url)), "cleanup", "--state", `${root}/state`],
    {
      env: {
        ...process.env,
        PATH: `${root}/bin:${process.env.PATH}`,
        TEST_DOCKER_LOG: `${root}/calls.jsonl`,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /still owns rooms/);
  const calls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.ok(calls.some((args) => args.includes("-e") && args[args.indexOf("-e") + 1].includes("cleanup-safety")));
  assert.equal(
    calls.some((args) => args.includes("down")),
    false,
  );
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")).draining, [
    { slot: "blue", revision: "v1" },
  ]);
});

test("handoff prepare CLI remains disabled until the manifest opts in", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-handoff-disabled-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/state/routing`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  writeFileSync(
    `${root}/state/routing/manifest.json`,
    JSON.stringify({ version: 1, active: { slot: "blue", revision: "v1" }, draining: [] }),
  );
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node\nrequire('node:fs').appendFileSync(process.env.TEST_DOCKER_LOG,'invoked\\n');\n`,
    { mode: 0o755 },
  );
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./deploy.mjs", import.meta.url)),
      "handoff-prepare",
      "--state",
      `${root}/state`,
      "--source-slot",
      "blue",
      "--destination-slot",
      "green",
      "--migration-id",
      "migration-disabled",
    ],
    {
      env: {
        ...process.env,
        PATH: `${root}/bin:${process.env.PATH}`,
        TEST_DOCKER_LOG: `${root}/calls.jsonl`,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not enabled by the deployment manifest/);
  assert.equal(existsSync(`${root}/calls.jsonl`), false);
});

test("deploy-web atomically publishes static content without touching API generations", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-web-controller-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/source`, { recursive: true });
  writeFileSync(`${root}/source/.env`, "");
  mkdirSync(`${root}/state/routing`, { recursive: true });
  writeFileSync(
    `${root}/state/routing/manifest.json`,
    JSON.stringify({ version: 1, active: { slot: "blue", revision: "old-api" }, draining: [] }),
  );
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');
if(args.includes('config')) console.log(JSON.stringify({services:{api:{environment:{AEGIS_API_URL:'https://aegis.test'}}}}));
if(args[0]==='create') console.log('static-extractor');
if(args[0]==='cp'){const destination=args.at(-1);fs.mkdirSync(destination+'/assets',{recursive:true});fs.writeFileSync(destination+'/index.html','new web');fs.writeFileSync(destination+'/assets/index.js','asset');}
`,
    { mode: 0o755 },
  );
  const revision = "3333333333333333333333333333333333333333";
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./deploy.mjs", import.meta.url)),
      "deploy-web",
      "--source",
      `${root}/source`,
      "--env-file",
      `${root}/source/.env`,
      "--state",
      `${root}/state`,
      "--revision",
      revision,
    ],
    {
      env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, TEST_DOCKER_LOG: `${root}/calls.jsonl` },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")), {
    version: 1,
    webRevision: revision,
    active: { slot: "blue", revision: "old-api" },
    draining: [],
  });
  assert.equal(readFileSync(`${root}/state/releases/${revision}/web/index.html`, "utf8"), "new web");
  const calls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(
    calls.some((args) => args.includes("up") || args.includes("down") || args.includes("exec")),
    false,
  );
});
