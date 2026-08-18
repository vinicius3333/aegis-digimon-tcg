#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDeploymentManifest,
  chooseBootstrapAction,
  chooseDeploymentAction,
  chooseDrainAction,
  emptyDeploymentState,
  oppositeSlot,
} from "./blue-green-deploy-lib.mjs";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolsDirectory, "..");
const deployRoot = process.env.AEGIS_DEPLOY_ROOT ?? "/var/lib/aegis-deploy";
const composeFile = process.env.AEGIS_DEPLOY_COMPOSE
  ?? join(repositoryRoot, "deploy/docker-compose.blue-green.yml");
const apiEnvironmentFile = process.env.AEGIS_API_ENV_FILE ?? "/etc/aegis-deploy/api.env";
const stateFile = join(deployRoot, "state.json");
const routerDirectory = join(deployRoot, "router");
const publicDirectory = join(deployRoot, "public");

await mkdir(routerDirectory, { recursive: true });
await mkdir(publicDirectory, { recursive: true });

const [commandName = "status", ...argumentsList] = process.argv.slice(2);

switch (commandName) {
  case "bootstrap":
    await bootstrap(parseBootstrapRequest(argumentsList));
    break;
  case "deploy":
    await deploy(parseDeploymentRequest(argumentsList));
    break;
  case "reconcile":
    await reconcile();
    break;
  case "rollback":
    await rollback();
    break;
  case "status":
    await printStatus();
    break;
  default:
    throw new Error(`Unknown command: ${commandName}`);
}

async function deploy(request) {
  let state = readState();
  if (state.draining && !containerRunning(`aegis-api-${state.draining.slot}`)) {
    await reconcile();
    state = readState();
  }
  await ensureStateApplied(state);
  if (state.bootstrap) {
    if (state.active?.revision === request.revision) {
      result("noop", { slot: state.active.slot, revision: request.revision, bootstrap: true });
      return;
    }
    throw new Error("Legacy bootstrap is still draining; deployment was not started");
  }
  const activeRooms = {};
  if (state.draining) {
    activeRooms[state.draining.slot] = (await apiStatus(state.draining.slot)).activeRooms;
  }
  const action = chooseDeploymentAction({ state, request, activeRooms });

  if (action.kind === "noop") {
    result("noop", { slot: action.slot, revision: request.revision });
    return;
  }
  if (action.kind === "queue") {
    state.pending = action.pending;
    writeState(state);
    result("queued", { revision: request.revision, waitingFor: state.draining?.slot });
    return;
  }

  await deployToSlot({ state, request, targetSlot: action.targetSlot });
}

async function bootstrap({ request, legacyApiContainer, legacyWebContainer }) {
  const state = readState();
  if (state.active || state.draining || Object.keys(state.slots).length > 0) {
    throw new Error("Bootstrap requires an empty deployment state");
  }

  docker(["pull", request.apiImage]);
  docker(["pull", request.webImage]);
  const slots = { blue: request };
  compose(["up", "-d", "--no-deps", "api-blue", "web-blue"], slots);
  try {
    await waitForReady("blue", request.revision);
    await waitForContainerHealth("aegis-web-blue");
  } catch (error) {
    await stopFailedCandidate("blue", slots);
    throw error;
  }

  const bootstrapped = {
    ...state,
    active: { slot: "blue", revision: request.revision },
    bootstrap: { legacyApiContainer, legacyWebContainer, zeroSince: null },
    slots,
  };
  writeState(bootstrapped);
  await ensureStateApplied(bootstrapped);
  result("bootstrapped", {
    active: bootstrapped.active,
    legacyApiContainer,
    legacyWebContainer,
  });
}

async function deployToSlot({ state, request, targetSlot }) {
  await assertSlotReplaceable(targetSlot, state);
  docker(["pull", request.apiImage]);
  docker(["pull", request.webImage]);

  const proposedSlots = {
    ...state.slots,
    [targetSlot]: request,
  };
  compose(["up", "-d", "--no-deps", `api-${targetSlot}`, `web-${targetSlot}`], proposedSlots);
  try {
    // Docker reports the container as started before Node has bound port 2567.
    // Wait for the compose healthcheck first so the controller's initial status
    // request cannot lose that startup race and abort an otherwise healthy deploy.
    await waitForContainerHealth(`aegis-api-${targetSlot}`);
    await waitForReady(targetSlot, request.revision);
    await waitForContainerHealth(`aegis-web-${targetSlot}`);
  } catch (error) {
    await stopFailedCandidate(targetSlot, proposedSlots);
    throw error;
  }

  const previousActive = state.active;
  const proposedState = {
    ...state,
    active: { slot: targetSlot, revision: request.revision },
    draining: previousActive ? { ...previousActive } : null,
    pending: null,
    slots: proposedSlots,
  };
  writeState(proposedState);
  await ensureStateApplied(proposedState);
  result("activated", {
    slot: targetSlot,
    revision: request.revision,
    draining: previousActive?.slot ?? null,
  });
}

async function reconcile() {
  const state = readState();
  if (state.bootstrap) {
    await reconcileBootstrap(state);
    return;
  }
  if (!state.draining) {
    await ensureStateApplied(state);
    if (state.pending) {
      await deployToSlot({
        state,
        request: state.pending,
        targetSlot: state.active ? oppositeSlot(state.active.slot) : "blue",
      });
      return;
    }
    result("idle", { active: state.active });
    return;
  }

  await ensureStateApplied(state);
  let status;
  if (containerRunning(`aegis-api-${state.draining.slot}`)) {
    status = await apiStatus(state.draining.slot);
  } else {
    status = { activeRooms: 0 };
  }
  const action = chooseDrainAction({ state, activeRooms: status.activeRooms });
  if (action.kind === "wait") {
    result("draining", action);
    return;
  }

  compose(["stop", `api-${action.slot}`, `web-${action.slot}`], state.slots);
  const pending = state.pending;
  state.draining = null;
  writeState(state);
  await publishRouting(state);
  result("cleaned", { slot: action.slot });

  if (pending) {
    const targetSlot = action.slot;
    await deployToSlot({ state, request: pending, targetSlot });
  }
}

async function reconcileBootstrap(state) {
  await ensureStateApplied(state);
  const connectionCount = legacyConnectionCount(state.bootstrap.legacyApiContainer);
  const stableMilliseconds = Number(process.env.AEGIS_LEGACY_ZERO_STABLE_MS ?? 120_000);
  if (!Number.isFinite(stableMilliseconds) || stableMilliseconds < 1_000) {
    throw new Error("AEGIS_LEGACY_ZERO_STABLE_MS must be at least 1000");
  }
  const action = chooseBootstrapAction({
    connectionCount,
    zeroSince: state.bootstrap.zeroSince,
    now: Date.now(),
    stableMilliseconds,
  });

  if (action.kind === "wait" || action.kind === "mark_zero") {
    const zeroSince = action.zeroSince;
    if (state.bootstrap.zeroSince !== zeroSince) {
      state.bootstrap.zeroSince = zeroSince;
      writeState(state);
    }
    result("legacy_draining", { connectionCount, zeroSince, remainingMilliseconds: action.remainingMilliseconds ?? null });
    return;
  }

  const retired = { ...state, bootstrap: null };
  writeState(retired);
  await ensureStateApplied(retired);
  docker(["stop", state.bootstrap.legacyApiContainer, state.bootstrap.legacyWebContainer]);
  result("legacy_retired", { active: retired.active });
}

async function rollback() {
  const state = readState();
  if (state.bootstrap) throw new Error("Rollback is unavailable until legacy bootstrap finishes");
  if (!state.active || !state.draining) {
    throw new Error("Rollback requires both an active and a draining slot");
  }

  const previousActive = state.active;
  const restored = state.draining;
  await waitForReady(restored.slot, restored.revision);
  await waitForContainerHealth(`aegis-web-${restored.slot}`);
  const rolledBack = {
    ...state,
    active: restored,
    draining: previousActive,
    pending: state.pending,
  };
  writeState(rolledBack);
  await ensureStateApplied(rolledBack);
  result("rolled_back", { active: restored, draining: previousActive });
}

async function printStatus() {
  const state = readState();
  const live = {};
  for (const slot of ["blue", "green"]) {
    try {
      live[slot] = await apiStatus(slot);
    } catch {
      live[slot] = { status: "stopped" };
    }
  }
  process.stdout.write(`${JSON.stringify({ state, live }, null, 2)}\n`);
}

async function publishRouting(state, { bootstrap = false } = {}) {
  if (!state.active) throw new Error("Cannot publish routing without an active slot");
  const templateName = bootstrap ? "Caddyfile.bootstrap.template" : "Caddyfile.router.template";
  const template = await readFile(join(repositoryRoot, `deploy/${templateName}`), "utf8");
  const legacyBotFallback = state.draining
    ? `\t\t\t@room_not_found status 404\n\t\t\thandle_response @room_not_found {\n\t\t\t\treverse_proxy aegis-api-${state.draining.slot}:2567\n\t\t\t}`
    : "";
  const caddyfile = template
    .replaceAll("{{ACTIVE_SLOT}}", state.active.slot)
    .replaceAll("{{LEGACY_BOT_FALLBACK}}", legacyBotFallback)
    .replaceAll("{{ACTIVE_REVISION}}", state.active.revision)
    .replaceAll("{{LEGACY_WEB_UPSTREAM}}", state.bootstrap?.legacyWebContainer ?? "");
  const manifest = `${JSON.stringify(buildDeploymentManifest(state), null, 2)}\n`;
  const nextCaddyfile = join(routerDirectory, "Caddyfile.next");
  const currentCaddyfile = join(routerDirectory, "Caddyfile");
  const nextManifest = join(publicDirectory, "manifest.json.next");
  const currentManifest = join(publicDirectory, "manifest.json");

  await writeFile(nextCaddyfile, caddyfile, { mode: 0o644 });
  await writeFile(nextManifest, manifest, { mode: 0o644 });

  const routerRunning = containerRunning("aegis-router");
  if (!routerRunning) {
    renameSync(nextCaddyfile, currentCaddyfile);
    renameSync(nextManifest, currentManifest);
    compose(["up", "-d", "--no-deps", "router"], state.slots);
    await waitForContainerHealth("aegis-router");
    return;
  }

  docker(["exec", "aegis-router", "caddy", "validate", "--config", "/etc/caddy/Caddyfile.next"]);
  const previous = existsSync(currentCaddyfile) ? readFileSync(currentCaddyfile, "utf8") : undefined;
  renameSync(nextCaddyfile, currentCaddyfile);
  try {
    docker(["exec", "aegis-router", "caddy", "reload", "--config", "/etc/caddy/Caddyfile"]);
    renameSync(nextManifest, currentManifest);
  } catch (error) {
    if (previous !== undefined) {
      writeFileSync(currentCaddyfile, previous, { mode: 0o644 });
      docker(["exec", "aegis-router", "caddy", "reload", "--config", "/etc/caddy/Caddyfile"]);
    }
    throw error;
  }
}

async function waitForReady(slot, revision) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const [status, readiness] = await Promise.all([
        apiStatus(slot),
        apiPublicRequest(slot, "/ready"),
      ]);
      if (readiness.status === "ready" && status.revision === revision && !status.acceptingNewRooms) return;
    } catch {
      // Container is still starting.
    }
    await delay(2_000);
  }
  throw new Error(`api-${slot} did not become ready for revision ${revision}`);
}

async function ensureStateApplied(state) {
  if (!state.active) return;
  await apiControl(state.active.slot, "activate");
  await publishRouting(state, { bootstrap: Boolean(state.bootstrap) });
  if (state.draining && containerRunning(`aegis-api-${state.draining.slot}`)) {
    await apiControl(state.draining.slot, "drain");
  }
}

async function assertSlotReplaceable(slot, state) {
  if (state.active?.slot === slot) throw new Error(`Refusing to replace active slot ${slot}`);
  if (!containerRunning(`aegis-api-${slot}`)) return;
  let status;
  try {
    status = await apiStatus(slot);
  } catch {
    throw new Error(`Refusing to replace running slot ${slot} because its room status is unknown`);
  }
  if (status.activeRooms > 0) {
    throw new Error(`Refusing to replace slot ${slot} with ${status.activeRooms} active room(s)`);
  }
  await apiControl(slot, "drain");
}

async function stopFailedCandidate(slot, slots) {
  if (!containerRunning(`aegis-api-${slot}`)) {
    compose(["stop", `web-${slot}`], slots);
    return;
  }
  try {
    const status = await apiStatus(slot);
    if (status.activeRooms > 0) return;
  } catch {
    // This is a newly created, start-draining candidate that never entered state.
  }
  compose(["stop", `api-${slot}`, `web-${slot}`], slots);
}

async function waitForContainerHealth(containerName) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const health = docker(["inspect", "-f", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", containerName], { capture: true }).trim();
    if (health === "healthy" || health === "running") return;
    await delay(1_000);
  }
  throw new Error(`${containerName} did not become healthy`);
}

async function apiStatus(slot) {
  return apiRequest(slot, "/deployment/status", "GET");
}

async function apiControl(slot, operation) {
  return apiRequest(slot, `/deployment/${operation}`, "POST");
}

function apiRequest(slot, path, method) {
  const source = [
    "const token=process.env.AEGIS_DEPLOYMENT_ADMIN_TOKEN;",
    `fetch('http://127.0.0.1:2567${path}',{method:'${method}',headers:{authorization:'Bearer '+token}})`,
    ".then(async response=>{const body=await response.text();if(!response.ok)throw new Error(response.status+' '+body);process.stdout.write(body)})",
    ".catch(error=>{console.error(error.message);process.exit(1)})",
  ].join("");
  const output = docker(["exec", `aegis-api-${slot}`, "node", "-e", source], { capture: true });
  return JSON.parse(output);
}

function apiPublicRequest(slot, path) {
  const source = [
    `fetch('http://127.0.0.1:2567${path}')`,
    ".then(async response=>{const body=await response.text();if(!response.ok)throw new Error(response.status+' '+body);process.stdout.write(body)})",
    ".catch(error=>{console.error(error.message);process.exit(1)})",
  ].join("");
  const output = docker(["exec", `aegis-api-${slot}`, "node", "-e", source], { capture: true });
  return JSON.parse(output);
}

function legacyConnectionCount(containerName) {
  const source = [
    "const fs=require('node:fs');",
    "let count=0;",
    "for(const path of ['/proc/net/tcp','/proc/net/tcp6']){",
    "if(!fs.existsSync(path))continue;",
    "for(const line of fs.readFileSync(path,'utf8').trim().split('\\n').slice(1)){",
    "const columns=line.trim().split(/\\s+/);",
    "if(columns[1]?.endsWith(':0A07')&&columns[3]==='01')count++;",
    "}",
    "}",
    "process.stdout.write(String(count));",
  ].join("");
  const output = docker(["exec", containerName, "node", "-e", source], { capture: true });
  const count = Number.parseInt(output.trim(), 10);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Could not count legacy API connections");
  return count;
}

function compose(argumentsList, slots) {
  return run("docker", ["compose", "-f", composeFile, ...argumentsList], {
    env: composeEnvironment(slots),
  });
}

function composeEnvironment(slots) {
  const fallback = slots.blue ?? slots.green;
  if (!fallback) throw new Error("At least one slot image must be configured");
  const blue = slots.blue ?? fallback;
  const green = slots.green ?? fallback;
  return {
    ...process.env,
    AEGIS_API_ENV_FILE: apiEnvironmentFile,
    AEGIS_DEPLOY_STATE_DIR: deployRoot,
    AEGIS_API_BLUE_IMAGE: blue.apiImage,
    AEGIS_WEB_BLUE_IMAGE: blue.webImage,
    AEGIS_BLUE_REVISION: blue.revision,
    AEGIS_API_GREEN_IMAGE: green.apiImage,
    AEGIS_WEB_GREEN_IMAGE: green.webImage,
    AEGIS_GREEN_REVISION: green.revision,
  };
}

function docker(argumentsList, options = {}) {
  return run("docker", argumentsList, options);
}

function run(executable, argumentsList, { capture = false, env = process.env } = {}) {
  return execFileSync(executable, argumentsList, {
    encoding: "utf8",
    env,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  }) ?? "";
}

function containerRunning(name) {
  try {
    return docker(["inspect", "-f", "{{.State.Running}}", name], { capture: true }).trim() === "true";
  } catch {
    return false;
  }
}

function readState() {
  if (!existsSync(stateFile)) return emptyDeploymentState();
  const state = JSON.parse(readFileSync(stateFile, "utf8"));
  if (state?.version !== 1) throw new Error("Unsupported deployment state version");
  return state;
}

function writeState(state) {
  const temporary = `${stateFile}.next`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, stateFile);
}

function parseDeploymentRequest(argumentsList) {
  const values = parseOptions(argumentsList, ["revision", "api-image", "web-image"]);
  const request = {
    revision: values.get("revision"),
    apiImage: values.get("api-image"),
    webImage: values.get("web-image"),
  };
  if (!/^[a-f0-9]{7,64}$/.test(request.revision ?? "")) throw new Error("Invalid revision");
  for (const [name, image] of [["api", request.apiImage], ["web", request.webImage]]) {
    if (!/^.+@sha256:[a-f0-9]{64}$/.test(image ?? "")) throw new Error(`Invalid ${name} image digest`);
  }
  return request;
}

function parseBootstrapRequest(argumentsList) {
  const values = parseOptions(argumentsList, [
    "revision",
    "api-image",
    "web-image",
    "legacy-api-container",
    "legacy-web-container",
  ]);
  const request = parseDeploymentRequest([
    "--revision", values.get("revision"),
    "--api-image", values.get("api-image"),
    "--web-image", values.get("web-image"),
  ]);
  const legacyApiContainer = values.get("legacy-api-container");
  const legacyWebContainer = values.get("legacy-web-container");
  for (const [name, value] of [["legacy API", legacyApiContainer], ["legacy web", legacyWebContainer]]) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(value ?? "")) throw new Error(`Invalid ${name} container name`);
  }
  return { request, legacyApiContainer, legacyWebContainer };
}

function parseOptions(argumentsList, allowedNames) {
  if (argumentsList.length % 2 !== 0) throw new Error("Every option requires a value");
  const allowed = new Set(allowedNames);
  const values = new Map();
  for (let index = 0; index < argumentsList.length; index += 2) {
    const key = argumentsList[index];
    const value = argumentsList[index + 1];
    const name = key?.startsWith("--") ? key.slice(2) : "";
    if (!allowed.has(name) || !value || values.has(name)) throw new Error(`Invalid option: ${key ?? "<missing>"}`);
    values.set(name, value);
  }
  return values;
}

function result(status, details) {
  process.stdout.write(`${JSON.stringify({ status, ...details })}\n`);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
