import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { displayVersion } from "./version.mjs";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const tag = displayVersion(manifest.version);
const requested = process.argv[2];

function run(program, args, options = {}) {
  return execFileSync(program, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
  }).trim();
}

try {
  if (requested !== tag) throw new Error(`Confirm the exact tag: pnpm release:publish -- ${tag}`);
  run("node", ["tools/release/version.mjs", "check"], { inherit: true });
  if (run("git", ["status", "--porcelain"])) throw new Error("The worktree must be clean");
  if (run("git", ["tag", "--list", tag])) throw new Error(`${tag} already exists locally`);
  try {
    run("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`]);
    throw new Error(`${tag} already exists on origin`);
  } catch (error) {
    if (error.message.includes("already exists")) throw error;
    if (error.status !== 2) throw new Error("Could not verify the remote tag state");
  }
  const notes = run("node", ["tools/release/render-notes.mjs"]);
  run("git", ["tag", "-a", tag, "-m", `${tag} release`], { inherit: true });
  run("git", ["push", "origin", tag], { inherit: true });
  run("gh", ["release", "create", tag, "--prerelease", "--title", tag, "--notes", notes], { inherit: true });
} catch (error) {
  console.error(`[release] ${error.message}`);
  process.exitCode = 1;
}
