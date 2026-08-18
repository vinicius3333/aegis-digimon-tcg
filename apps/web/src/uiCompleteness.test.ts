import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMBAT_PROMPT_EVENTS, DECISION_KINDS } from "@aegis/shared";
import { SUPPORTED_COMBAT_PROMPTS, SUPPORTED_DECISION_KINDS } from "./game/overlays";

const srcDir = dirname(fileURLToPath(import.meta.url));

/**
 * Intent wrappers legitimately called only from net/ (not dispatched by any
 * overlay/board handler): `ready` is the initial handshake, sent once from
 * net/useRoom.ts on room join, before any UI decision exists.
 */
const NET_ONLY_INTENTS = new Set(["ready"]);

function listFilesRecursively(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(full);
    return entry.isFile() ? [full] : [];
  });
}

function extractIntentWrapperNames(): string[] {
  const source = readFileSync(join(srcDir, "net/intents.ts"), "utf-8");
  const objectBody = source.slice(source.indexOf("export const intents = {"));
  const names: string[] = [];
  for (const match of objectBody.matchAll(/^\s{2}(\w+):\s*\(/gm)) {
    const name = match[1];
    if (name) names.push(name);
  }
  return names;
}

describe("UI decision-kind coverage", () => {
  it("the shared overlay renderer covers every DecisionRequest.kind", () => {
    expect(new Set(SUPPORTED_DECISION_KINDS)).toEqual(new Set(DECISION_KINDS));
  });
});

describe("UI combat-prompt coverage", () => {
  it("the shared overlay renderer handles every combat prompt event", () => {
    expect(new Set(SUPPORTED_COMBAT_PROMPTS)).toEqual(new Set(COMBAT_PROMPT_EVENTS));
  });
});

describe("client intent reachability", () => {
  const wrapperNames = extractIntentWrapperNames();
  const allFiles = listFilesRecursively(srcDir);
  const netFiles = allFiles.filter((f) => f.includes(`${srcDir}/net/`));
  const nonNetFiles = allFiles.filter((f) => !f.includes(`${srcDir}/net/`) && f !== join(srcDir, "uiCompleteness.test.ts"));

  it("found intent wrappers to check", () => {
    expect(wrapperNames.length).toBeGreaterThan(0);
  });

  for (const name of wrapperNames) {
    it(`intents.${name} is called from UI code (outside net/)${NET_ONLY_INTENTS.has(name) ? " or is an allowlisted net-only intent" : ""}`, () => {
      const callPattern = new RegExp(`intents\\.${name}\\(`);
      const calledOutsideNet = nonNetFiles.some((f) => callPattern.test(readFileSync(f, "utf-8")));
      if (NET_ONLY_INTENTS.has(name)) {
        const calledInNet = netFiles.some((f) => callPattern.test(readFileSync(f, "utf-8")));
        expect(calledOutsideNet || calledInNet).toBe(true);
      } else {
        expect(calledOutsideNet).toBe(true);
      }
    });
  }
});
