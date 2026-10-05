#!/usr/bin/env node
// A candidate delivery envelope around the existing room/scorer configuration.
// This tool deliberately lives outside the executable engine fingerprint.
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  constants,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";

const SELF = fileURLToPath(import.meta.url);
const MAX_FRAME_BYTES = 16 * 1024 * 1024;
const PACKAGE_FILES = ["checkpoint.pt", "manifest.json", "provenance.json", "scorer.mjs"];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function digest(path) {
  return sha256(readFileSync(path));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validHash(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function execute(command, args) {
  return execFileSync(command, args, { encoding: "utf8", timeout: 30_000, maxBuffer: MAX_FRAME_BYTES }).trim();
}

export function checkScope(metadata, curriculum) {
  requireValue(metadata.schemaVersion === 4 && validHash(metadata.engineSha256), "Invalid observation/runtime schema");
  requireValue(
    Array.isArray(metadata.cardIds) && new Set(metadata.cardIds).size === 479,
    "Expected 479 unique card identities",
  );
  requireValue(metadata.cardIds.length === 479, "Duplicate vocabulary identities");
  for (const [set, count] of [
    ["BT26", 104],
    ["EX13", 77],
  ]) {
    for (let id = 1; id <= count; id++) {
      requireValue(metadata.cardIds.includes(`${set}-${String(id).padStart(3, "0")}`), `Missing ${set} identity ${id}`);
    }
  }
  requireValue(Array.isArray(metadata.statusFields) && Array.isArray(metadata.keywords), "Missing encoder field order");
  requireValue(Array.isArray(metadata.decks) && metadata.decks.length === 26, "Expected 26 catalog recipes");
  requireValue(
    curriculum.schemaVersion === 1 &&
      curriculum.engineSha256 === metadata.engineSha256 &&
      Array.isArray(curriculum.decks) &&
      curriculum.decks.length === 44 &&
      isDeepStrictEqual(curriculum.decks.slice(0, 26), metadata.decks),
    "Expected unchanged 26 catalog recipes plus 18 support recipes",
  );
  requireValue(
    new Set(curriculum.decks.map((deck) => deck.version)).size === 44 &&
      curriculum.decks.every((deck) => typeof deck.version === "string" && validHash(deck.sha256)),
    "Invalid recipe pins",
  );
}

function runtimeFiles(root) {
  const files = {};
  const visit = (relative) => {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = `${relative}/${entry.name}`;
      requireValue(!entry.isSymbolicLink(), `Unexpected runtime symlink: ${path}`);
      if (entry.isDirectory()) visit(path);
      else if (
        entry.name.endsWith(".js") ||
        entry.name.endsWith(".json") ||
        entry.name.endsWith(".py") ||
        entry.name === "pyproject.toml"
      )
        files[path] = digest(join(root, path));
    }
  };
  for (const folder of ["apps/api/dist", "packages/shared/dist"]) visit(folder);
  for (const entry of readdirSync(join(root, "tools/bot-training")).sort()) {
    if (entry.endsWith(".py") || entry === "pyproject.toml")
      files[`tools/bot-training/${entry}`] = digest(join(root, "tools/bot-training", entry));
  }
  files["pnpm-lock.yaml"] = digest(join(root, "pnpm-lock.yaml"));
  return files;
}

function describeRuntime(root) {
  const cli = join(root, "apps/api/dist/bot/training/cli.js");
  const metadata = JSON.parse(execute(process.execPath, [cli, "--describe"]));
  const curriculum = JSON.parse(execute(process.execPath, [cli, "--describe-curriculum"]));
  checkScope(metadata, curriculum);
  return { metadata, curriculum, files: runtimeFiles(root) };
}

function pythonIdentity(python) {
  const version = execute(python, ["--version"]);
  requireValue(/^Python 3\.(1[2-9]|[2-9][0-9])\./.test(version), "Python 3.12 or later is required");
  // Import package metadata only; do not import Torch, load a model, or allocate CUDA.
  const packages = JSON.parse(
    execute(python, [
      "-c",
      "import importlib.metadata,json;print(json.dumps({k:importlib.metadata.version(k) for k in ('torch','numpy','click')}))",
    ]),
  );
  checkPythonPackages(packages);
  // Retain the venv entry path: resolving its symlink would select global site-packages.
  return { path: resolve(python), executableSha256: digest(python), version, packages };
}

export function checkPythonPackages(packages) {
  // torch==2.7.1 permits its PEP 440 local build (the desktop uses +cu128).
  // Keep the complete reported build in the manifest; validatePackage compares it exactly.
  requireValue(
    typeof packages.torch === "string" &&
      /^2\.7\.1(?:\+[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/i.test(packages.torch) &&
      packages.numpy === "2.2.6" &&
      packages.click === "8.1.8",
    "Python dependencies differ from pyproject.toml",
  );
}

function checkProvenance(provenance) {
  requireValue(
    typeof provenance.sourceCommit === "string" && /^[a-f0-9]{40}$/.test(provenance.sourceCommit),
    "Missing source commit pin",
  );
  requireValue(
    validHash(provenance.sourceArchiveSha256) && validHash(provenance.originalCheckpointSha256),
    "Missing archive/original checkpoint pin",
  );
  requireValue(Array.isArray(provenance.evidence) && provenance.evidence.length > 0, "Missing provenance evidence");
  for (const receipt of provenance.evidence) {
    requireValue(
      typeof receipt.path === "string" && typeof receipt.role === "string" && validHash(receipt.sha256),
      "Invalid provenance receipt",
    );
    requireValue(digest(receipt.path) === receipt.sha256, `Provenance receipt changed: ${receipt.role}`);
  }
}

export function packCandidate({ runtime, checkpoint, checkpointSha256, provenance, output, version, python }) {
  requireValue(
    typeof version === "string" && /^[a-z0-9][a-z0-9._-]{0,100}$/.test(version),
    "Use a concrete version name",
  );
  requireValue(
    validHash(checkpointSha256) && digest(checkpoint) === checkpointSha256,
    "Checkpoint hash differs from declared candidate",
  );
  const source = readJson(provenance);
  checkProvenance(source);
  const root = realpathSync(runtime);
  const described = describeRuntime(root);
  const interpreter = pythonIdentity(python);
  const outputPath = resolve(output);
  mkdirSync(outputPath); // Never overwrite or reuse another version's directory.
  const destination = realpathSync(outputPath);
  copyFileSync(checkpoint, join(destination, "checkpoint.pt"), constants.COPYFILE_EXCL);
  requireValue(digest(join(destination, "checkpoint.pt")) === checkpointSha256, "Checkpoint changed while packaging");
  copyFileSync(provenance, join(destination, "provenance.json"), constants.COPYFILE_EXCL);
  requireValue(
    isDeepStrictEqual(readJson(join(destination, "provenance.json")), source),
    "Provenance changed while packaging",
  );
  copyFileSync(SELF, join(destination, "scorer.mjs"), constants.COPYFILE_EXCL);
  const manifest = {
    formatVersion: 1,
    status: "candidate",
    version,
    featureVersion: 7,
    policyTimeoutMs: 1000,
    checkpointSha256,
    metadata: described.metadata,
    curriculum: described.curriculum,
    runtime: {
      path: root,
      node: realpathSync(process.execPath),
      nodeVersion: process.version,
      python: interpreter,
      files: described.files,
    },
    files: Object.fromEntries(
      ["checkpoint.pt", "provenance.json", "scorer.mjs"].map((file) => [file, digest(join(destination, file))]),
    ),
    qualification: "pending; package integrity and queries do not establish acceptance",
  };
  writeFileSync(join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  for (const file of PACKAGE_FILES) chmodSync(join(destination, file), file === "scorer.mjs" ? 0o555 : 0o444);
  return {
    package: destination,
    manifestSha256: digest(join(destination, "manifest.json")),
    version,
    status: "candidate",
  };
}

export function validatePackage(directory, manifestSha256) {
  const root = realpathSync(directory);
  requireValue(
    validHash(manifestSha256) && digest(join(root, "manifest.json")) === manifestSha256,
    "Manifest differs from external pin",
  );
  const manifest = readJson(join(root, "manifest.json"));
  requireValue(
    manifest.formatVersion === 1 &&
      manifest.status === "candidate" &&
      manifest.featureVersion === 7 &&
      manifest.policyTimeoutMs === 1000,
    "Invalid candidate package contract",
  );
  requireValue(isDeepStrictEqual(readdirSync(root).sort(), PACKAGE_FILES), "Unexpected package contents");
  requireValue(
    isDeepStrictEqual(
      Object.keys(manifest.files).sort(),
      PACKAGE_FILES.filter((file) => file !== "manifest.json"),
    ),
    "Invalid package file map",
  );
  for (const [file, hash] of Object.entries(manifest.files))
    requireValue(validHash(hash) && digest(join(root, file)) === hash, `Package file changed: ${file}`);
  requireValue(manifest.files["checkpoint.pt"] === manifest.checkpointSha256, "Conflicting checkpoint pins");
  checkProvenance(readJson(join(root, "provenance.json")));
  requireValue(
    realpathSync(process.execPath) === manifest.runtime.node && process.version === manifest.runtime.nodeVersion,
    "Use the packaged Node executable/version",
  );
  requireValue(
    isDeepStrictEqual(pythonIdentity(manifest.runtime.python.path), manifest.runtime.python),
    "Python environment changed",
  );
  requireValue(
    isDeepStrictEqual(runtimeFiles(manifest.runtime.path), manifest.runtime.files),
    "Runtime files changed; use the pinned checkout",
  );
  const described = describeRuntime(manifest.runtime.path);
  requireValue(
    isDeepStrictEqual(described, {
      metadata: manifest.metadata,
      curriculum: manifest.curriculum,
      files: manifest.runtime.files,
    }),
    "Runtime/schema/recipe files changed; use the pinned checkout",
  );
  return manifest;
}

export function checkReady(ready, manifest) {
  requireValue(
    ready.type === "ready" &&
      ready.protocolVersion === 1 &&
      ready.featureVersion === manifest.featureVersion &&
      ready.checkpointSha256 === manifest.checkpointSha256 &&
      isDeepStrictEqual(ready.metadata, manifest.metadata),
    "Loaded checkpoint/version/runtime differs from package",
  );
}

export function candidateEnvironment(directory, pin, manifest, environment) {
  requireValue(environment.NODE_ENV !== "production", "Candidate packages cannot launch production");
  return {
    ...environment,
    PATH: `${dirname(manifest.runtime.node)}:${environment.PATH ?? ""}`,
    AEGIS_BOT_CHECKPOINT: join(directory, "checkpoint.pt"),
    AEGIS_BOT_PYTHON: join(directory, "scorer.mjs"),
    AEGIS_BOT_DELIVERY_PACKAGE: directory,
    AEGIS_BOT_DELIVERY_MANIFEST_SHA256: pin,
  };
}

function forwardSignals(child) {
  const terminate = () => child.kill("SIGTERM");
  const interrupt = () => child.kill("SIGINT");
  process.on("SIGTERM", terminate);
  process.on("SIGINT", interrupt);
  child.once("exit", () => {
    process.off("SIGTERM", terminate);
    process.off("SIGINT", interrupt);
  });
}

export async function guardedScorer(manifest, args, input = process.stdin, output = process.stdout) {
  const expected = [
    join(manifest.runtime.path, "tools/bot-training/inference.py"),
    "--checkpoint",
    join(process.env.AEGIS_BOT_DELIVERY_PACKAGE, "checkpoint.pt"),
    "--device",
    "cpu",
  ];
  requireValue(
    isDeepStrictEqual(args, expected),
    "Unexpected scorer invocation; only the pinned CPU checkpoint is allowed",
  );
  const child = spawn(manifest.runtime.python.path, args, { stdio: ["pipe", "pipe", "inherit"] });
  forwardSignals(child);
  let buffer = Buffer.alloc(0);
  let ready = false;
  const timer = setTimeout(() => child.kill("SIGTERM"), 25_000);
  try {
    await new Promise((resolvePromise, reject) => {
      child.once("error", reject);
      child.once("close", (code) =>
        code === 0 && ready
          ? resolvePromise()
          : reject(new Error(`Guarded scorer exited before/after readiness (${code})`)),
      );
      child.stdout.on("data", (chunk) => {
        if (ready) return;
        buffer = Buffer.concat([buffer, chunk]);
        try {
          requireValue(buffer.length <= MAX_FRAME_BYTES, "Oversized scorer ready frame");
          const newline = buffer.indexOf(10);
          if (newline < 0) return;
          checkReady(JSON.parse(buffer.subarray(0, newline).toString("utf8")), manifest);
          ready = true;
          clearTimeout(timer);
          output.write(buffer);
          child.stdout.pipe(output);
          input.pipe(child.stdin);
        } catch (error) {
          child.kill("SIGTERM");
          reject(error);
        }
      });
      child.stdin.on("error", reject);
    });
  } finally {
    clearTimeout(timer);
    input.unpipe(child.stdin);
    child.stdout.unpipe(output);
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

async function main(args) {
  requireValue(/^v26\./.test(process.version), "Use supported Node 26");
  if (args[0]?.endsWith("/inference.py")) {
    const manifest = validatePackage(
      process.env.AEGIS_BOT_DELIVERY_PACKAGE,
      process.env.AEGIS_BOT_DELIVERY_MANIFEST_SHA256,
    );
    candidateEnvironment(
      process.env.AEGIS_BOT_DELIVERY_PACKAGE,
      process.env.AEGIS_BOT_DELIVERY_MANIFEST_SHA256,
      manifest,
      process.env,
    );
    await guardedScorer(manifest, args);
    return;
  }
  const command = args[0];
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      runtime: { type: "string" },
      checkpoint: { type: "string" },
      "checkpoint-sha256": { type: "string" },
      provenance: { type: "string" },
      output: { type: "string" },
      version: { type: "string" },
      python: { type: "string" },
      package: { type: "string" },
      "manifest-sha256": { type: "string" },
      "allow-candidate": { type: "boolean", default: false },
      queries: { type: "string" },
      request: { type: "string" },
    },
  });
  if (command === "pack") {
    const request = values.request
      ? readJson(values.request)
      : { ...values, checkpointSha256: values["checkpoint-sha256"] };
    console.log(JSON.stringify(packCandidate(request)));
    return;
  }
  requireValue(
    ["validate", "launch", "probe"].includes(command),
    "Use pack, validate, probe, or launch (see delivery.md)",
  );
  const directory = realpathSync(values.package);
  const pin = values["manifest-sha256"];
  const manifest = validatePackage(directory, pin);
  if (command === "validate") {
    console.log(
      JSON.stringify({
        status: manifest.status,
        version: manifest.version,
        checkpointSha256: manifest.checkpointSha256,
        engineSha256: manifest.metadata.engineSha256,
        modelLoaded: false,
      }),
    );
    return;
  }
  requireValue(
    values["allow-candidate"],
    "Candidate use requires explicit --allow-candidate; no qualification is implied",
  );
  const environment = candidateEnvironment(directory, pin, manifest, process.env);
  if (command === "probe") {
    requireValue(values.queries && values.output, "Probe requires --queries and a fresh --output directory");
    const windows = readJson(values.queries);
    requireValue(Array.isArray(windows) && windows.length > 0, "Supply explicit real inference windows");
    mkdirSync(values.output);
    Object.assign(process.env, environment);
    const { InferenceClient } = await import(
      pathToFileURL(join(manifest.runtime.path, "apps/api/dist/bot/training/inferenceClient.js"))
    );
    const client = await InferenceClient.start({
      command: manifest.runtime.node,
      args: [
        join(directory, "scorer.mjs"),
        join(manifest.runtime.path, "tools/bot-training/inference.py"),
        "--checkpoint",
        join(directory, "checkpoint.pt"),
        "--device",
        "cpu",
      ],
      metadata: manifest.metadata,
      requestTimeoutMs: 2000,
    });
    const choices = [];
    try {
      requireValue(client.checkpointSha256 === manifest.checkpointSha256, "Probe model identity mismatch");
      for (const window of windows) choices.push(await client.choose(window, new AbortController().signal));
      writeFileSync(
        join(values.output, "queries.json"),
        JSON.stringify(
          {
            status: "candidate",
            acceptance: false,
            version: manifest.version,
            manifestSha256: pin,
            checkpointSha256: client.checkpointSha256,
            engineSha256: manifest.metadata.engineSha256,
            queriesSha256: digest(values.queries),
            choices,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    } finally {
      await client.close();
    }
    return;
  }
  console.error(
    `Launching candidate ${manifest.version}; checkpoint ${manifest.checkpointSha256}; qualification remains pending`,
  );
  const child = spawn(manifest.runtime.node, [join(manifest.runtime.path, "apps/api/dist/index.js")], {
    cwd: join(manifest.runtime.path, "apps/api"),
    env: environment,
    stdio: "inherit",
  });
  forwardSignals(child);
  child.once("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once("close", (code) => {
    process.exitCode = code ?? 1;
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SELF)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
