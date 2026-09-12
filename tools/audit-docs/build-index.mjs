import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Rewrites the status index table in docs/audits/README.md from the front matter of every
 * docs/audits/<SET>.md. Run with --check to fail instead of writing when the table is stale.
 */

const root = resolve(import.meta.dirname, "..", "..");
const auditsDir = join(root, "docs", "audits");
const readmePath = join(auditsDir, "README.md");
const startMarker = "<!-- index:start -->";
const endMarker = "<!-- index:end -->";
const requiredFields = ["set", "cards", "status", "verified_at", "catalog_commit", "evidence_commit"];
const checkOnly = process.argv.includes("--check");

const parseFrontMatter = (content) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/u.exec(content);
  if (!match) return { fields: undefined, problem: "missing front matter block" };

  const fields = {};
  for (const line of match[1].split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    const separator = line.indexOf(":");
    if (separator === -1) return { fields: undefined, problem: `front matter line is not "key: value": ${line}` };
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  const missing = requiredFields.filter((field) => (fields[field] ?? "") === "");
  if (missing.length > 0) return { fields: undefined, problem: `missing front matter fields: ${missing.join(", ")}` };
  return { fields, problem: undefined };
};

const naturalKey = (set) => {
  const match = /^([A-Za-z]+)(\d*)$/u.exec(set);
  if (!match) return [set, 0];
  return [match[1], match[2] === "" ? 0 : Number(match[2])];
};

const compareSets = (left, right) => {
  const [leftPrefix, leftNumber] = naturalKey(left);
  const [rightPrefix, rightNumber] = naturalKey(right);
  if (leftPrefix !== rightPrefix) return leftPrefix < rightPrefix ? -1 : 1;
  return leftNumber - rightNumber;
};

const fileNames = readdirSync(auditsDir)
  .filter((name) => name.endsWith(".md") && name !== "README.md")
  .sort();

const problems = [];
const rows = [];
for (const fileName of fileNames) {
  const { fields, problem } = parseFrontMatter(readFileSync(join(auditsDir, fileName), "utf8"));
  if (problem !== undefined) {
    problems.push(`docs/audits/${fileName}: ${problem}`);
    continue;
  }

  const expectedSet = fileName.slice(0, -".md".length);
  if (fields.set !== expectedSet) {
    problems.push(`docs/audits/${fileName}: front matter set is "${fields.set}"; expected "${expectedSet}"`);
    continue;
  }

  rows.push(fields);
}

if (problems.length > 0) {
  console.error("Audit documents with invalid front matter:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

rows.sort((left, right) => compareSets(left.set, right.set));

const headings = ["Set", "Cards", "Status", "Verified at", "Doc"];
const cells = rows.map((row) => [row.set, row.cards, row.status, row.verified_at, `[${row.set}.md](${row.set}.md)`]);
const widths = headings.map((heading, column) =>
  Math.max(3, heading.length, ...cells.map((row) => row[column].length)),
);
const formatRow = (row) => `| ${row.map((cell, column) => cell.padEnd(widths[column])).join(" | ")} |`;
const table = [formatRow(headings), formatRow(widths.map((width) => "-".repeat(width))), ...cells.map(formatRow)].join(
  "\n",
);

const readme = readFileSync(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
if (start === -1 || end === -1 || end < start) {
  console.error(`docs/audits/README.md is missing the ${startMarker} / ${endMarker} markers.`);
  process.exit(1);
}

const body = rows.length === 0 ? "No audit documents yet." : table;
const updated = `${readme.slice(0, start + startMarker.length)}\n\n${body}\n\n${readme.slice(end)}`;

if (updated === readme) {
  console.log(`Status index is current (${rows.length} sets).`);
  process.exit(0);
}

if (checkOnly) {
  console.error("docs/audits/README.md status index is stale. Run `pnpm audit:index`.");
  process.exit(1);
}

writeFileSync(readmePath, updated);
console.log(`Wrote status index for ${rows.length} sets to docs/audits/README.md.`);
