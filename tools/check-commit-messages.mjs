import { execFileSync } from "node:child_process";
import { parseConventionalCommit } from "./release-lib.mjs";

const [baseRef] = process.argv.slice(2);
const runGit = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const range = baseRef ? `${runGit(["merge-base", "HEAD", baseRef])}..HEAD` : "HEAD~1..HEAD";
const rawCommits = runGit(["log", "--format=%s%x1f%b%x1e", range]);
const invalid = rawCommits
  .split("\x1e")
  .filter(Boolean)
  .map((entry) => entry.split("\x1f"))
  .filter(([subject, body]) => !parseConventionalCommit(subject, body))
  .map(([subject]) => subject);

if (invalid.length) {
  throw new Error(
    `Use Conventional Commits. Invalid commit subject(s):\n${invalid.map((subject) => `- ${subject}`).join("\n")}`,
  );
}

console.log("All checked commits follow Conventional Commits.");
