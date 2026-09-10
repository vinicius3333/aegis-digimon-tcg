import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: exactly one audit document per card collection, at docs/audits/<SET>.md, with valid front
 * matter. No set-level audit lives anywhere else in the tree, and docs/audits/ holds only the
 * README, the per-set documents, and the cross-set engine directory.
 */

const CARDS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CARDS_DIR, "..", "..", "..", "..");
const AUDITS_DIR = join(REPO_ROOT, "docs", "audits");

/** Test-only bucket: it has a cards directory but is not a printed collection. */
const EXCLUDED_CARD_DIRS = new Set(["_a3"]);

const REQUIRED_FRONT_MATTER = ["set", "cards", "status", "verified_at", "catalog_commit", "evidence_commit"];

const setNames = readdirSync(CARDS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !EXCLUDED_CARD_DIRS.has(entry.name))
  .map((entry) => entry.name)
  .sort();

const parseFrontMatter = (content: string): Record<string, string> | undefined => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/u.exec(content);
  if (!match) return undefined;

  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    const separator = line.indexOf(":");
    if (separator === -1) return undefined;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
};

describe("audit documents", () => {
  it("has at least one card collection to check", () => {
    expect(setNames.length).toBeGreaterThan(0);
  });

  it("keeps one document per collection with complete front matter", () => {
    const missingDocs: string[] = [];
    const invalidFrontMatter: string[] = [];

    for (const set of setNames) {
      const docPath = join(AUDITS_DIR, `${set}.md`);
      if (!existsSync(docPath)) {
        missingDocs.push(`docs/audits/${set}.md`);
        continue;
      }

      const fields = parseFrontMatter(readFileSync(docPath, "utf8"));
      if (fields === undefined) {
        invalidFrontMatter.push(`docs/audits/${set}.md: missing or malformed front matter block`);
        continue;
      }

      const missingFields = REQUIRED_FRONT_MATTER.filter((field) => (fields[field] ?? "") === "");
      if (missingFields.length > 0) {
        invalidFrontMatter.push(`docs/audits/${set}.md: missing fields ${missingFields.join(", ")}`);
        continue;
      }

      if (fields.set !== set) {
        invalidFrontMatter.push(`docs/audits/${set}.md: set is "${fields.set}"; expected "${set}"`);
      }
    }

    expect(missingDocs).toEqual([]);
    expect(invalidFrontMatter).toEqual([]);
  });

  it("holds nothing in docs/audits besides README.md, <SET>.md, and engine/*.md", () => {
    const allowedDocs = new Set(["README.md", ...setNames.map((set) => `${set}.md`)]);
    const unexpected: string[] = [];

    for (const entry of readdirSync(AUDITS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== "engine") {
          unexpected.push(`docs/audits/${entry.name}/`);
          continue;
        }

        for (const engineEntry of readdirSync(join(AUDITS_DIR, "engine"), { withFileTypes: true })) {
          if (!engineEntry.isFile() || !engineEntry.name.endsWith(".md")) {
            unexpected.push(`docs/audits/engine/${engineEntry.name}`);
          }
        }
        continue;
      }

      if (!allowedDocs.has(entry.name)) unexpected.push(`docs/audits/${entry.name}`);
    }

    expect(unexpected).toEqual([]);
  });

  it("keeps no AUDIT.md inside apps/api/src/cards", () => {
    const strays = readdirSync(CARDS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(CARDS_DIR, entry.name, "AUDIT.md"))
      .filter((path) => existsSync(path) && statSync(path).isFile())
      .map((path) => path.slice(REPO_ROOT.length + 1));

    expect(strays).toEqual([]);
  });
});
