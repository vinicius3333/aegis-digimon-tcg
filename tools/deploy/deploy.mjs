import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, rmSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SLOTS, readManifest, validateManifest, assertEmptySlot } from "./shared.mjs";

function run(program, args, { capture = false } = {}) {
  return new Promise((resolveResult, reject) => {
    const process = spawn(program, args, { stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    if (capture) process.stdout.on("data", (bytes) => (output += bytes));
    // Captured Compose config and Docker arguments can contain secrets; never print them on failure.
    if (capture) process.stderr.resume();
    process.on("error", () => reject(new Error(`${program} could not start`)));
    process.on("close", (code) =>
      code === 0 ? resolveResult(output.trim()) : reject(new Error(`${program} failed (${code})`)),
    );
  });
}

function atomicJson(path, value, mode = 0o600) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { mode });
  renameSync(temporary, path);
}

export function buildSlotCompose({ slot, revision, apiEnvironment, network, state }) {
  if (!SLOTS.includes(slot)) throw new Error("Invalid slot");
  const services = {
    redis: {
      image: "redis:7-alpine",
      restart: "unless-stopped",
      command: [
        "redis-server",
        "--save",
        "",
        "--appendonly",
        "yes",
        "--appendfsync",
        "everysec",
        "--maxmemory",
        "256mb",
        "--maxmemory-policy",
        "noeviction",
      ],
      cpus: 0.5,
      mem_limit: "384m",
      volumes: ["redis_data:/data"],
      networks: { default: { aliases: [`aegis-${slot}-redis`] } },
      healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: "5s", timeout: "3s", retries: 10 },
      logging: { driver: "json-file", options: { "max-size": "20m", "max-file": "3" } },
    },
  };
  for (const index of [1, 2, 3]) {
    services[`api${index}`] = {
      image: `aegis-api:${revision}`,
      restart: "unless-stopped",
      cpus: 1.25,
      mem_limit: "1500m",
      stop_grace_period: "60s",
      environment: Object.fromEntries(
        Object.entries({
          ...apiEnvironment,
          AEGIS_REVISION: revision,
          AEGIS_DEPLOYMENT_SLOT: slot,
          AEGIS_PROCESS_PATH: `api/${slot}/p${index}`,
          AEGIS_REDIS_URL: `redis://aegis-${slot}-redis:6379`,
          AEGIS_DEPLOYMENT_MANIFEST: "/deployment/manifest.json",
          AEGIS_DEPLOYMENT_START_DRAINING: "false",
        }).map(([key, value]) => [key, typeof value === "string" ? value.replaceAll("$", () => "$$") : value]),
      ),
      volumes: [`${state}/routing:/deployment:ro`],
      depends_on: { redis: { condition: "service_healthy" } },
      networks: { default: { aliases: [`aegis-${slot}-api${index}`] } },
      healthcheck: {
        test: [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:2567/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))",
        ],
        interval: "5s",
        timeout: "3s",
        retries: 12,
        start_period: "10s",
      },
      logging: { driver: "json-file", options: { "max-size": "20m", "max-file": "3" } },
    };
  }
  return { services, networks: { default: { external: true, name: network } }, volumes: { redis_data: {} } };
}

/** Compose config emits escaped dollars so its output can itself be reloaded. */
export function restoreComposeEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).map(([key, value]) => [
      key,
      typeof value === "string" ? value.replaceAll("$$", () => "$") : value,
    ]),
  );
}

export async function controller({ action, source, envFile, state, revision }) {
  mkdirSync(state, { recursive: true, mode: 0o755 });
  for (const directory of ["routing", "releases", "assets"])
    mkdirSync(`${state}/${directory}`, { recursive: true, mode: 0o755 });
  mkdirSync(`${state}/slots`, { recursive: true, mode: 0o700 });
  const lock = `${state}/deploy.lock`;
  try {
    mkdirSync(lock);
  } catch {
    throw new Error("Another deploy is active, or its lock needs operator recovery; no services changed");
  }
  try {
    writeFileSync(
      `${lock}/owner.json`,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), action }),
    );
    const adminTokenPath = `${state}/admin-token`;
    if (!existsSync(adminTokenPath)) throw new Error("Install the private admin-token before deployment");
    const adminToken = readFileSync(adminTokenPath, "utf8").trim();
    if (adminToken.length < 32) throw new Error("Deployment admin token must have at least 32 characters");
    const slotPath = (slot) => `${state}/slots/${slot}/compose.json`;
    const compose = (slot, args, capture = false) =>
      run("docker", ["compose", "-p", `aegis-${slot}`, "-f", slotPath(slot), ...args], { capture });
    const admin = async (slot, index, path, method = "GET") => {
      const script = `fetch('http://127.0.0.1:2567${path}', {method:'${method}',headers:{authorization:'Bearer '+process.env.AEGIS_DEPLOYMENT_ADMIN_TOKEN}}).then(async r=>{if(!r.ok)throw Error('admin request rejected');console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))`;
      const raw = await compose(slot, ["exec", "-T", `api${index}`, "node", "-e", script], true);
      return JSON.parse(raw);
    };
    const statuses = (slot) => Promise.all([1, 2, 3].map((index) => admin(slot, index, "/deployment/status")));
    const setAccepting = (slot, accepting) =>
      Promise.all(
        [1, 2, 3].map((index) => admin(slot, index, `/deployment/${accepting ? "activate" : "drain"}`, "POST")),
      );
    const installedManifest = () => (existsSync(`${state}/routing/manifest.json`) ? readManifest(state) : undefined);
    const publish = (manifest) => atomicJson(`${state}/routing/manifest.json`, validateManifest(manifest), 0o644);
    async function cleanupSlot(slot) {
      const manifest = installedManifest();
      if (manifest?.active.slot === slot) throw new Error("Cannot remove the active slot");
      if (!existsSync(slotPath(slot))) return;
      await setAccepting(slot, false);
      assertEmptySlot(await statuses(slot), slot);
      // Every process is closed to creation, including internal creation, before the zero-room check.
      await compose(slot, ["down", "--volumes"]);
      rmSync(`${state}/slots/${slot}`, { recursive: true });
      if (manifest?.draining.some((entry) => entry.slot === slot)) {
        publish({ ...manifest, draining: manifest.draining.filter((entry) => entry.slot !== slot) });
      }
      console.log(`${slot}: empty slot removed; immutable web assets retained`);
    }
    if (action === "status") {
      const manifest = readManifest(state);
      console.log(
        JSON.stringify(
          {
            manifest,
            processes: await Promise.all(
              [manifest.active, ...manifest.draining].map(async ({ slot }) => ({
                slot,
                statuses: await statuses(slot),
              })),
            ),
          },
          null,
          2,
        ),
      );
      return;
    }
    if (action === "cleanup") {
      for (const { slot } of readManifest(state).draining) await cleanupSlot(slot);
      return;
    }
    if (action === "rollback") {
      const manifest = readManifest(state);
      const previous = manifest.draining[0];
      if (!previous) throw new Error("No retained slot is available to roll back");
      await setAccepting(previous.slot, true);
      publish({ version: 1, active: previous, draining: [manifest.active] });
      await setAccepting(manifest.active.slot, false);
      console.log(`Rolled back to ${previous.revision}; both versions' rooms retained`);
      return;
    }
    if (action !== "deploy") throw new Error("Expected deploy, status, cleanup, or rollback");
    const before = installedManifest();
    revision ??= await run("git", ["-c", `safe.directory=${source}`, "-C", source, "rev-parse", "HEAD"], {
      capture: true,
    });
    validateManifest({ version: 1, active: { slot: "blue", revision }, draining: [] });
    if (before?.active.revision === revision) {
      console.log(`Revision ${revision} already active; no running services recreated`);
      return;
    }
    const slot = before?.active.slot === "blue" ? "green" : "blue";
    if (existsSync(slotPath(slot))) await cleanupSlot(slot);
    const config = JSON.parse(
      await run(
        "docker",
        ["compose", "--env-file", envFile, "-f", `${source}/docker-compose.prod.yml`, "config", "--format", "json"],
        { capture: true },
      ),
    );
    const apiEnvironment = restoreComposeEnvironment(config.services.api.environment);
    apiEnvironment.AEGIS_DEPLOYMENT_ADMIN_TOKEN = adminToken;
    // Docker builds run serially; there is no build or recreation of active-slot services.
    console.log(`Building immutable revision ${revision} for ${slot}`);
    await run("docker", [
      "build",
      "--label",
      `org.opencontainers.image.revision=${revision}`,
      "-t",
      `aegis-api:${revision}`,
      "-f",
      `${source}/apps/api/Dockerfile`,
      source,
    ]);
    await run("docker", [
      "build",
      "--label",
      `org.opencontainers.image.revision=${revision}`,
      "--build-arg",
      `VITE_AEGIS_API_URL=${apiEnvironment.AEGIS_API_URL.replace(/^http/, "ws")}`,
      "--build-arg",
      `VITE_AEGIS_REVISION=${revision}`,
      "--build-arg",
      "VITE_AEGIS_DEPLOYMENT_MODE=slots",
      "-t",
      `aegis-static:${revision}`,
      "-f",
      `${source}/apps/web/Dockerfile`,
      source,
    ]);
    const release = `${state}/releases/${revision}`;
    mkdirSync(release, { recursive: true, mode: 0o755 });
    const extractor = await run("docker", ["create", `aegis-static:${revision}`], { capture: true });
    try {
      mkdirSync(`${release}/web`, { recursive: true, mode: 0o755 });
      await run("docker", ["cp", `${extractor}:/usr/share/caddy/.`, `${release}/web`]);
      if (!existsSync(`${release}/web/index.html`)) throw new Error("Static web extraction failed");
      cpSync(`${release}/web/assets`, `${state}/assets`, { recursive: true });
    } finally {
      await run("docker", ["rm", extractor], { capture: true });
    }
    mkdirSync(`${state}/slots/${slot}`, { recursive: true, mode: 0o700 });
    atomicJson(
      slotPath(slot),
      buildSlotCompose({ slot, revision, apiEnvironment, network: config.networks.default.name, state }),
    );
    await compose(slot, ["up", "-d", "--wait", "--wait-timeout", "120"]);
    const ready = await statuses(slot);
    if (
      ready.some(
        (status) =>
          status.slot !== slot || status.revision !== revision || status.acceptingNewRooms || status.activeRooms !== 0,
      )
    ) {
      throw new Error("Idle slot admission, revision, or room verification failed; active slot untouched");
    }
    // Prove Redis-backed matchmaking is initialized, not merely PG readiness.
    for (const index of [1, 2, 3]) {
      await compose(
        slot,
        [
          "exec",
          "-T",
          `api${index}`,
          "node",
          "-e",
          "fetch('http://127.0.0.1:2567/matchmake/aegis').then(async r=>{if(!r.ok||!Array.isArray(await r.json()))process.exit(1)}).catch(()=>process.exit(1))",
        ],
        true,
      );
    }
    await setAccepting(slot, true);
    const current = installedManifest();
    publish({ version: 1, active: { slot, revision }, draining: current ? [current.active] : [] });
    if (current) await setAccepting(current.active.slot, false);
    const after = await statuses(slot);
    if (after.some((status) => !status.acceptingNewRooms))
      throw new Error("Published slot needs admission recovery; run status/rollback");
    console.log(`ACTIVE ${slot} ${revision}; existing rooms retained on ${current?.active.slot ?? "no previous slot"}`);
    // Cleanup is optional. A busy old slot must never fail the successful cutover or be killed.
    if (current) {
      try {
        await cleanupSlot(current.active.slot);
      } catch {
        console.log(`${current.active.slot}: cleanup pending; old processes remain running`);
      }
    }
  } finally {
    rmSync(lock, { recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action = "status", ...args] = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? fallback : args[index + 1];
  };
  const source = resolve(option("source", "/source"));
  controller({
    action,
    source,
    envFile: resolve(option("env-file", `${source}/.env`)),
    state: resolve(option("state", "/opt/aegis-rollout")),
    revision: option("revision"),
  }).catch((error) => {
    console.error(`[aegis/deploy] ${error.message}`);
    process.exitCode = 1;
  });
}
