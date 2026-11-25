import { describe, expect, it } from "vitest";
import type { ReplayFrame } from "#shared/replays";
import { decodeReplayFrames } from "#shared/replays/decodeReplayFrames";
import { encodeReplayFrames } from "#shared/replays/encodeReplayFrames";

type Board = Record<string, unknown>;

const jsonCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const card = (id: string, faceUp = true) => ({ instanceId: id, cardId: faceUp ? "BT1-010" : "", faceUp });

function framesOf(states: Board[]): ReplayFrame[] {
  return states.map((state, index) => ({ atMs: index * 100, events: [], state }) as unknown as ReplayFrame);
}

function boards(): Board[] {
  const first = {
    stateVersion: 1,
    memory: 3,
    pendingDecision: undefined,
    players: [
      { seat: 0, hand: [card("a"), card("b")], trash: [], battleArea: [{ permanentId: "p1", stack: [card("c")] }] },
      { seat: 1, hand: [card("x", false)], trash: [card("y")], battleArea: [] },
    ],
    series: { bestOf: 1, results: [] },
    winnerSeat: null,
  };
  const second = jsonCopy(first) as typeof first;
  second.stateVersion = 2;
  second.memory = -1;
  second.players[0]!.hand.push(card("d"));
  const third = jsonCopy(second) as typeof first & { label?: string };
  third.stateVersion = 3;
  third.players[0]!.hand.splice(0, 2);
  third.players[0]!.battleArea = [];
  third.label = "added";
  const fourth = jsonCopy(third) as Board;
  fourth.stateVersion = 4;
  delete fourth.label;
  delete fourth.series;
  return [first, second, third, fourth];
}

describe("replay frame patches", () => {
  it("rebuilds every frame exactly from the first state and the patches after it", () => {
    const frames = framesOf(boards());
    const file = jsonCopy(encodeReplayFrames(frames));

    expect(file[0]).toHaveProperty("state");
    expect(file.slice(1).every((frame) => !("state" in frame) && "patch" in frame)).toBe(true);
    expect(decodeReplayFrames(file)).toEqual(jsonCopy(frames));
  });

  it("stores a small change in much less space than the full state", () => {
    const states = boards();
    const big = { ...states[0]!, trash: Array.from({ length: 200 }, (_, index) => card(`t${index}`)) };
    const next = { ...big, stateVersion: 2, memory: 4 };
    const [full, changed] = encodeReplayFrames(framesOf([big, next]));

    expect(JSON.stringify(changed).length * 20).toBeLessThan(JSON.stringify(full).length);
  });

  it("shares the parts of the board that did not change between frames", () => {
    const decoded = decodeReplayFrames(jsonCopy(encodeReplayFrames(framesOf(boards()))));
    const players = (index: number) => (decoded[index]!.state as unknown as { players: Board[] }).players;

    expect(players(1)[1]).toBe(players(0)[1]);
    expect(players(1)[0]).not.toBe(players(0)[0]);
  });

  it("keeps a frame that changed nothing and accepts a full state on any frame", () => {
    const [first, second] = boards();
    const file = jsonCopy(encodeReplayFrames(framesOf([first!, first!, second!])));
    expect(file[1]).not.toHaveProperty("patch");
    const withKeyframe = [...file, { atMs: 400, events: [], state: jsonCopy(first) }];

    const decoded = decodeReplayFrames(withKeyframe);
    expect(decoded[1]!.state).toEqual(decoded[0]!.state);
    expect(decoded[3]!.state).toEqual(jsonCopy(first));
  });

  it.each([
    ["an empty list", []],
    ["a first frame without a state", [{ atMs: 0, events: [], patch: { r: 1 } }]],
    [
      "an index past the length",
      [
        { atMs: 0, events: [], state: { list: [] } },
        { atMs: 1, events: [], patch: { o: { list: { a: { 3: { r: 1 } }, n: 1 } } } },
      ],
    ],
    [
      "a negative length",
      [
        { atMs: 0, events: [], state: { list: [] } },
        { atMs: 1, events: [], patch: { o: { list: { a: {}, n: -1 } } } },
      ],
    ],
    [
      "an object patch on a number",
      [
        { atMs: 0, events: [], state: { memory: 1 } },
        { atMs: 1, events: [], patch: { o: { memory: { o: {} } } } },
      ],
    ],
    [
      "an unknown patch",
      [
        { atMs: 0, events: [], state: {} },
        { atMs: 1, events: [], patch: { z: 1 } },
      ],
    ],
  ])("rejects %s", (_name, frames) => {
    expect(() => decodeReplayFrames(JSON.parse(JSON.stringify(frames)))).toThrow(/replay/i);
  });

  it("rejects a file with more frames than a replay may hold before decoding any patch", () => {
    const frames = [
      { atMs: 0, events: [], state: {} },
      ...Array.from({ length: 20_000 }, () => ({ atMs: 0, events: [] })),
    ];

    expect(() => decodeReplayFrames(frames)).toThrow(/too many frames/);
  });

  it("stops a small file whose patches would copy a wide board at every frame", () => {
    const wide = Object.fromEntries(Array.from({ length: 1000 }, (_, index) => [`key${index}`, index]));
    const frames = [
      { atMs: 0, events: [], state: { ...wide, stateVersion: 0 } },
      ...Array.from({ length: 50 }, (_, index) => ({
        atMs: index + 1,
        events: [],
        patch: { o: { stateVersion: { r: index + 1 } } },
      })),
    ];

    expect(() => decodeReplayFrames(frames, 20_000)).toThrow(/copy too much/);
    expect(decodeReplayFrames(frames, 60_000)).toHaveLength(51);
  });

  it("rejects a patch key that would replace an object prototype", () => {
    const file =
      '[{"atMs":0,"events":[],"state":{}},{"atMs":1,"events":[],"patch":{"o":{"__proto__":{"r":{"polluted":true}}}}}]';

    expect(() => decodeReplayFrames(JSON.parse(file))).toThrow(/replay/i);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
