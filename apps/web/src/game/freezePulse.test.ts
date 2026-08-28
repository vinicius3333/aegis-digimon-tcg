import { describe, expect, it } from "vitest";
import { freezeKind, freezePulses, type FreezeFlags } from "./freezePulse";

const FREE: FreezeFlags = { cannotAttack: false, cannotBlock: false };
const NO_ATTACK: FreezeFlags = { cannotAttack: true, cannotBlock: false };
const NO_BLOCK: FreezeFlags = { cannotAttack: false, cannotBlock: true };
const LOCKED: FreezeFlags = { cannotAttack: true, cannotBlock: true };

describe("freezeKind", () => {
  it("names the attack lock that just landed", () => {
    expect(freezeKind(FREE, NO_ATTACK)).toBe("cannotAttack");
  });

  it("names the block lock that just landed", () => {
    expect(freezeKind(FREE, NO_BLOCK)).toBe("cannotBlock");
  });

  it("reports the attack lock when both land at once", () => {
    expect(freezeKind(FREE, LOCKED)).toBe("cannotAttack");
  });

  it("stays quiet while a lock merely persists", () => {
    expect(freezeKind(NO_ATTACK, NO_ATTACK)).toBeUndefined();
  });

  it("stays quiet when a lock lifts", () => {
    expect(freezeKind(NO_ATTACK, FREE)).toBeUndefined();
  });

  it("still fires for the second lock landing on an already-restricted card", () => {
    expect(freezeKind(NO_ATTACK, LOCKED)).toBe("cannotBlock");
  });
});

describe("freezePulses", () => {
  it("raises one pulse per permanent that was just locked, keyed in order", () => {
    const previous = new Map<string, FreezeFlags>([
      ["a", FREE],
      ["b", FREE],
      ["c", NO_ATTACK],
    ]);
    const next = new Map<string, FreezeFlags>([
      ["a", NO_ATTACK],
      ["b", NO_BLOCK],
      ["c", NO_ATTACK],
    ]);
    expect(freezePulses({ previous, next, nextKey: 10 })).toEqual([
      { permanentId: "a", kind: "cannotAttack", key: 11 },
      { permanentId: "b", kind: "cannotBlock", key: 12 },
    ]);
  });

  it("says nothing about a permanent that arrived already restricted", () => {
    const previous = new Map<string, FreezeFlags>();
    const next = new Map<string, FreezeFlags>([["fresh", LOCKED]]);
    expect(freezePulses({ previous, next, nextKey: 0 })).toEqual([]);
  });

  it("says nothing about a permanent that left the board", () => {
    const previous = new Map<string, FreezeFlags>([["gone", FREE]]);
    const next = new Map<string, FreezeFlags>();
    expect(freezePulses({ previous, next, nextKey: 0 })).toEqual([]);
  });

  it("says nothing when no restriction moved", () => {
    const board = new Map<string, FreezeFlags>([
      ["a", FREE],
      ["b", LOCKED],
    ]);
    expect(freezePulses({ previous: board, next: board, nextKey: 0 })).toEqual([]);
  });
});
