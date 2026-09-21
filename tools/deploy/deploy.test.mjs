import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FIXED_SLOTS, assertEmptySlot, validateManifest } from "./shared.mjs";
import { buildSlotCompose, fixedSlotRotation, restoreComposeEnvironment } from "./deploy.mjs";

test("deployer image copies every local runtime module imported by deploy.mjs", () => {
  const deploySource = readFileSync(new URL("./deploy.mjs", import.meta.url), "utf8");
  const dockerfile = readFileSync(new URL("../../docker/Deployer.Dockerfile", import.meta.url), "utf8");
  const localImports = [...deploySource.matchAll(/from\s+["'](\.\/[^"']+)["']/g)].map((match) => match[1]);
  const copiedFiles = new Set(
    [...dockerfile.matchAll(/^COPY\s+(.+?)\s+\.\/$/gm)].flatMap((match) => match[1].split(/\s+/)),
  );

  for (const importPath of localImports) {
    const moduleName = importPath.slice(2);
    assert.ok(
      copiedFiles.has(`tools/deploy/${moduleName}`),
      `Deployer.Dockerfile must copy tools/deploy/${moduleName}`,
    );
  }
});

test("fixed slot infrastructure isolates Redis and advertises exact owning process routes", () => {
  const blue = buildSlotCompose({
    slot: "blue",
    revision: "1111111111111111111111111111111111111111",
    apiEnvironment: restoreComposeEnvironment({
      DATABASE_URL: "unchanged-database",
      DISCORD_CLIENT_SECRET: "literal$$dollar$${variable}",
    }),
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  const red = buildSlotCompose({
    slot: "red",
    revision: "2222222222222222222222222222222222222222",
    apiEnvironment: {},
    network: "aegis_default",
    state: "/opt/aegis-rollout",
  });
  assert.equal(blue.services.api2.environment.AEGIS_PROCESS_PATH, "api/blue/p2");
  assert.notEqual(blue.services.api1.environment.AEGIS_REDIS_URL, red.services.api1.environment.AEGIS_REDIS_URL);
  assert.equal(blue.services.api1.environment.DATABASE_URL, "unchanged-database");
  assert.equal(blue.services.api1.environment.DISCORD_CLIENT_SECRET, "literal$$dollar$${variable}");
  assert.deepEqual(blue.services.api1.volumes, ["/opt/aegis-rollout/routing:/deployment:ro"]);
});

test("fixed deployment slots rotate after the active slot and accept transitional g manifests", () => {
  assert.deepEqual(FIXED_SLOTS, ["blue", "red", "green"]);
  assert.deepEqual(fixedSlotRotation("blue"), ["red", "green", "blue"]);
  assert.deepEqual(fixedSlotRotation("red"), ["green", "blue", "red"]);
  assert.deepEqual(fixedSlotRotation("green"), ["blue", "red", "green"]);
  assert.deepEqual(fixedSlotRotation("g-abcdef012345"), FIXED_SLOTS);
  assert.doesNotThrow(() =>
    validateManifest({
      version: 1,
      active: { slot: "g-abcdef012345", revision: "api-sha" },
      draining: [{ slot: "green", revision: "legacy-sha" }],
    }),
  );
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

test("status inspects orphans read-only and cleanup recovers only verifiable empty partial slots", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-orphan-cleanup-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/state/routing`, { recursive: true });
  for (const slot of ["blue", "red", "green", "g-aaaaaaaaaaaa", "g-bbbbbbbbbbbb"])
    mkdirSync(`${root}/state/slots/${slot}`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  for (const slot of ["blue", "red", "green", "g-bbbbbbbbbbbb"])
    writeFileSync(`${root}/state/slots/${slot}/compose.json`, "{}");
  const manifest = { version: 1, active: { slot: "blue", revision: "active" }, draining: [] };
  writeFileSync(`${root}/state/routing/manifest.json`, JSON.stringify(manifest));
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');
const project=args[args.indexOf('-p')+1]||'';const slot=project.slice('aegis-'.length);
if(args.includes('ps')){const rows=slot==='red'?[{Service:'api1',State:'running'}]:slot==='green'?[{Service:'api1',State:'running'},{Service:'api2',State:'exited'}]:slot==='g-bbbbbbbbbbbb'?[{Service:'api1',State:'restarting'}]:slot==='blue'?[{Service:'api1',State:'running'},{Service:'api2',State:'running'},{Service:'api3',State:'running'}]:[];console.log(JSON.stringify(rows));}
if(args.includes('exec')){const service=args[args.indexOf('exec')+2];const script=args[args.indexOf('-e')+1]||'';const accepting=script.includes('/deployment/activate');console.log(JSON.stringify({slot,revision:'test',acceptingNewRooms:accepting,activeRooms:slot==='red'?1:0,connectedClients:0}));}
`,
    { mode: 0o755 },
  );
  const invoke = (action) =>
    spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./deploy.mjs", import.meta.url)), action, "--state", `${root}/state`],
      {
        env: {
          ...process.env,
          PATH: `${root}/bin:${process.env.PATH}`,
          TEST_DOCKER_LOG: `${root}/calls.jsonl`,
        },
        encoding: "utf8",
      },
    );

  const status = invoke("status");
  assert.equal(status.status, 0, status.stderr);
  const report = JSON.parse(status.stdout);
  assert.deepEqual(
    report.orphans.map(({ slot, state }) => [slot, state]),
    [
      ["g-aaaaaaaaaaaa", "unverifiable"],
      ["g-bbbbbbbbbbbb", "not-proven-empty"],
      ["green", "verified-empty"],
      ["red", "not-proven-empty"],
    ],
  );
  const statusCalls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(
    statusCalls.some((args) => args.includes("down") || args.some((arg) => String(arg).includes("/drain"))),
    false,
  );
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")), manifest);

  const cleanup = invoke("cleanup");
  assert.equal(cleanup.status, 1);
  assert.match(cleanup.stderr, /Cleanup pending.*g-aaaaaaaaaaaa.*g-bbbbbbbbbbbb.*red/);
  assert.equal(existsSync(`${root}/state/slots/blue`), true);
  assert.equal(existsSync(`${root}/state/slots/red`), true);
  assert.equal(existsSync(`${root}/state/slots/green`), false);
  assert.equal(existsSync(`${root}/state/slots/g-aaaaaaaaaaaa`), true);
  assert.equal(existsSync(`${root}/state/slots/g-bbbbbbbbbbbb`), true);
  const allCalls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const downCalls = allCalls.filter((args) => args.includes("down"));
  assert.equal(downCalls.length, 1);
  assert.ok(downCalls[0].includes("aegis-green"));
  assert.ok(
    allCalls.some(
      (args) =>
        args.includes("aegis-green") &&
        args.includes("-e") &&
        args[args.indexOf("-e") + 1].includes("/deployment/drain"),
    ),
  );
  assert.equal(
    allCalls.some((args) => args.includes("down") && args.includes("aegis-blue")),
    false,
  );
  assert.deepEqual(JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8")), manifest);
});

test("deploy migrates a legacy generation into a fixed slot and retains its live owner", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-fixed-migration-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/source`, { recursive: true });
  writeFileSync(`${root}/source/.env`, "");
  mkdirSync(`${root}/state/routing`, { recursive: true });
  mkdirSync(`${root}/state/slots/g-123456789abc`, { recursive: true });
  mkdirSync(`${root}/state/slots/blue`, { recursive: true });
  writeFileSync(`${root}/state/admin-token`, "test-private-token-at-least-32-characters");
  writeFileSync(`${root}/state/slots/g-123456789abc/compose.json`, "{}");
  writeFileSync(`${root}/state/slots/blue/compose.json`, "{}");
  writeFileSync(
    `${root}/state/routing/manifest.json`,
    JSON.stringify({
      version: 1,
      capabilities: { liveRoomHandoff: true },
      active: { slot: "g-123456789abc", revision: "old-api" },
      draining: [{ slot: "blue", revision: "retiring-blue" }],
    }),
  );
  writeFileSync(
    `${root}/bin/docker`,
    `#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync(process.env.TEST_DOCKER_LOG,JSON.stringify(args)+'\\n');
if(args.includes('config')) console.log(JSON.stringify({services:{api:{environment:{AEGIS_API_URL:'https://aegis.test'}}},networks:{default:{name:'aegis_default'}}}));
if(args[0]==='create') console.log('web-extractor');
if(args[0]==='cp'){const destination=args.at(-1);fs.mkdirSync(destination+'/assets',{recursive:true});fs.writeFileSync(destination+'/index.html','new web');fs.writeFileSync(destination+'/assets/app.js','asset');}
if(args.includes('exec')){const script=args[args.indexOf('-e')+1]||'';if(script.includes('/deployment/status')||script.includes('/deployment/activate')||script.includes('/deployment/drain')){const slot=args[args.indexOf('-p')+1].slice('aegis-'.length);const manifest=JSON.parse(fs.readFileSync(process.env.TEST_STATE+'/routing/manifest.json','utf8'));const accepting=script.includes('/deployment/activate')?true:script.includes('/deployment/drain')?false:manifest.active.slot===slot;const legacy=slot.startsWith('g-');const busy=legacy||slot==='blue';const slotRevision=legacy?'old-api':slot==='blue'?'retiring-blue':'4444444444444444444444444444444444444444';console.log(JSON.stringify({slot,revision:slotRevision,acceptingNewRooms:accepting,activeRooms:busy?1:0,connectedClients:busy?2:0}));}}
`,
    { mode: 0o755 },
  );

  const revision = "4444444444444444444444444444444444444444";
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./deploy.mjs", import.meta.url)),
      "deploy",
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
      env: {
        ...process.env,
        PATH: `${root}/bin:${process.env.PATH}`,
        TEST_DOCKER_LOG: `${root}/calls.jsonl`,
        TEST_STATE: `${root}/state`,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(readFileSync(`${root}/state/routing/manifest.json`, "utf8"));
  assert.deepEqual(manifest, {
    version: 1,
    webRevision: revision,
    active: { slot: "red", revision },
    draining: [
      { slot: "g-123456789abc", revision: "old-api" },
      { slot: "blue", revision: "retiring-blue" },
    ],
  });
  assert.equal(readFileSync(`${root}/state/slots/g-123456789abc/compose.json`, "utf8"), "{}");
  assert.equal(readFileSync(`${root}/state/slots/blue/compose.json`, "utf8"), "{}");
  const calls = readFileSync(`${root}/calls.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(
    calls.some((args) => args.includes("down")),
    false,
  );
});

test("deploy-web atomically publishes static content without touching API slots", (t) => {
  const root = mkdtempSync(`${tmpdir()}/aegis-web-controller-`);
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(`${root}/bin`);
  mkdirSync(`${root}/source`, { recursive: true });
  writeFileSync(`${root}/source/.env`, "");
  mkdirSync(`${root}/state/routing`, { recursive: true });
  writeFileSync(
    `${root}/state/routing/manifest.json`,
    JSON.stringify({
      version: 1,
      capabilities: { liveRoomHandoff: true },
      active: { slot: "blue", revision: "old-api" },
      draining: [],
    }),
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
