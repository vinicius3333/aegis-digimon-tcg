import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMBAT_PROMPT_EVENTS, DECISION_KINDS, SERVER_EVENT_KINDS, type ServerEventKind } from "@aegis/shared";
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

/**
 * The event kinds one `switch (event.kind)` narrates, read out of the source rather than
 * copied into a list here: a hand-kept list drifts from the switch silently, which is the
 * exact failure this suite exists to catch. A branch whose first statement is `return null`
 * narrates nothing, so it does not count as covered.
 */
function narratedEventKinds(relativePath: string, functionName: string): Set<string> {
  const source = readFileSync(join(srcDir, relativePath), "utf-8");
  const start = source.indexOf(`export function ${functionName}`);
  if (start < 0) throw new Error(`${functionName} not found in ${relativePath}`);
  const rest = source.slice(start);
  const body = rest.slice(0, rest.indexOf("\n}\n"));
  const parts = body.split(/case "(\w+)":/);
  const narrated = new Set<string>();
  for (let i = 1; i < parts.length; i += 2) {
    // A fall-through case has an empty branch and shares the next one, which is why an
    // empty branch counts as narrated.
    if (!parts[i + 1]!.trim().startsWith("return null")) narrated.add(parts[i]!);
  }
  return narrated;
}

/**
 * Event kinds that reach no narration surface on purpose. Each entry says why, because
 * the only difference between a deliberate silence and a forgotten event is this note.
 */
const DELIBERATELY_SILENT: Partial<Record<ServerEventKind, string>> = {
  // Terminates the ＜Alliance＞ prompt overlay and carries no outcome: the event says the
  // decision was answered, not whether an ally joined, so a log line could only repeat
  // that something was decided. The ally's own effects narrate themselves.
  allianceResolved: "window terminator carrying no outcome to report",
  // The offending client gets a transient toast; nobody else is told, and a rejected
  // intent changed no game state, so it is not match history.
  actionRejected: "shown as a toast to the one client that caused it",
  // Rendered as the deck's shuffle animation (deckChrome.ts). It names no card and says
  // nothing a line of text would say better.
  deckShuffled: "rendered by the deck chrome animation",
  // Raised as the framed effect notice (notices.ts) the moment the effect starts
  // resolving; the log narrates the same effect once it resolves (effectResolved).
  effectTriggered: "shown as the effect notice; the log line belongs to effectResolved",
};

describe("server event coverage", () => {
  const logged = narratedEventKinds("game/boardModel.ts", "describeEvent");
  const fed = narratedEventKinds("game/opponentActionFeed.ts", "opponentActionFromEvent");
  const surfaced = new Set<string>([...logged, ...fed, ...SUPPORTED_COMBAT_PROMPTS]);

  it("every ServerEvent kind reaches a surface or is deliberately silent", () => {
    const unreached = SERVER_EVENT_KINDS.filter((kind) => !surfaced.has(kind) && !(kind in DELIBERATELY_SILENT));
    expect(unreached).toEqual([]);
  });

  it("nothing stays on the silent list once a surface narrates it", () => {
    const stale = Object.keys(DELIBERATELY_SILENT).filter((kind) => surfaced.has(kind));
    expect(stale).toEqual([]);
  });

  it("reads the real switches, not an empty file", () => {
    expect(logged.size).toBeGreaterThan(0);
    expect(fed.size).toBeGreaterThan(0);
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
  const nonNetFiles = allFiles.filter(
    (f) => !f.includes(`${srcDir}/net/`) && f !== join(srcDir, "uiCompleteness.test.ts"),
  );

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
