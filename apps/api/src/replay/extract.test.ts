import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractReplay, extractReplayFromLogDir, ReplayExtractionError } from "./extract.js";
import { CHAT_TEXT, HUMAN_NAME, HUMAN_SESSION, recordRoomMatch, type RecordedRoomMatch } from "./roomMatch.fixture.js";
import { REPLAY_FORMAT } from "./types.js";

let first: RecordedRoomMatch;
let second: RecordedRoomMatch;

beforeAll(async () => {
  first = await recordRoomMatch({ seed: 20260914 });
  second = await recordRoomMatch({ seed: 7 });
});

/** The two matches' lines interleaved, as one process serving both rooms would write them. */
function interleaved(): string[] {
  const lines: string[] = [];
  for (let index = 0; index < Math.max(first.lines.length, second.lines.length); index++) {
    if (index < first.lines.length) lines.push(first.lines[index]!);
    if (index < second.lines.length) lines.push(second.lines[index]!);
  }
  return lines;
}

describe("extractReplay", () => {
  it("builds a versioned record of the match and nothing else", () => {
    const record = extractReplay(first.lines, first.matchId);

    expect(record).toMatchObject({
      format: REPLAY_FORMAT,
      matchId: first.matchId,
      seed: 20260914,
      rules: { deckFormat: "standard", unlimited: false, betaBattle: false },
    });
    expect(record.seats[0].bot).toBeUndefined();
    expect(record.seats[1].bot).toBe(true);
    expect(record.seats[0].deck.mainDeck).toHaveLength(50);
    expect(record.inputs.slice(0, 4).map((input) => input.kind)).toEqual(["seat", "intent", "seat", "startMatch"]);
  });

  it("ignores other matches and malformed or truncated lines", () => {
    const noisy = [
      "not json at all",
      first.lines[3]!.slice(0, 40), // a write cut off mid-line
      JSON.stringify({ matchId: first.matchId, data: "no array" }),
      JSON.stringify({ matchId: first.matchId, data: ["intent.received", { seat: 0, intent: { type: "ready" } }] }),
      ...interleaved(),
      '{"matchId":"' + first.matchId + '","data":["intent.received",{"seat":0,',
    ];

    expect(extractReplay(noisy, first.matchId)).toEqual(extractReplay(first.lines, first.matchId));
    expect(extractReplay(noisy, second.matchId)).toEqual(extractReplay(second.lines, second.matchId));
  });

  it("keeps no chat, session, name or room identity", () => {
    const serialized = JSON.stringify(extractReplay(first.lines, first.matchId));
    const roomIds = first.lines.map((line) => (JSON.parse(line) as { roomId?: string }).roomId).filter(Boolean);

    expect(first.lines.join("\n")).toContain(CHAT_TEXT); // the room did log the chat
    expect(first.lines.join("\n")).toContain(HUMAN_SESSION);
    const secrets = [CHAT_TEXT, HUMAN_SESSION, HUMAN_NAME, "sessionId", "displayName", "roomCode", "chat", ...roomIds];
    expect(secrets.filter((secret) => serialized.includes(secret as string))).toEqual([]);
  });

  it("fails clearly without the header that carries the seed", () => {
    const headless = first.lines.filter((line) => !line.includes('"replay.header"'));

    expect(() => extractReplay(headless, first.matchId)).toThrow(ReplayExtractionError);
    expect(() => extractReplay(headless, first.matchId)).toThrow(/seed/);
    expect(() => extractReplay(second.lines, first.matchId)).toThrow(/No replay.header/);
  });

  it("fails clearly when a seat never got a deck", () => {
    const botless = first.lines.filter((line) => !(line.includes('"replay.seat"') && line.includes('"bot":true')));

    expect(() => extractReplay(botless, first.matchId)).toThrow(ReplayExtractionError);
    expect(() => extractReplay(botless, first.matchId)).toThrow(/seat 1/);
  });
});

describe("extractReplayFromLogDir", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "aegis-replay-"));
    // Segment names carry a random UUID, so they do not sort in the order they were written:
    // here the later half of the match sorts first.
    const lines = interleaved();
    const half = Math.floor(lines.length / 2);
    writeFileSync(join(dir, "api-2026-10-09-ffff.jsonl"), lines.slice(0, half).join("\n") + "\n");
    writeFileSync(join(dir, "api-2026-10-09-0000.jsonl"), lines.slice(half).join("\n") + '\n{"truncated":');
    writeFileSync(join(dir, "unrelated.log"), first.lines.join("\n"));
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("reads every api-*.jsonl segment and orders the match by its own ordinal", async () => {
    expect(await extractReplayFromLogDir(dir, first.matchId)).toEqual(extractReplay(first.lines, first.matchId));
    expect(await extractReplayFromLogDir(dir, second.matchId)).toEqual(extractReplay(second.lines, second.matchId));
  });
});
