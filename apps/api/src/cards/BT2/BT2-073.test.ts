import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-073.js";

describe("BT2-073 Garurumon", () => {
  it("gains 1 memory when another own Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q1026 gains only 1 memory when two other Digimon are deleted together", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "first" },
          { card: "BT2-070", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId, s.perm("second").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("gains only 1 memory across separate deletion timings in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "first" },
          { card: "BT2-070", as: "second" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not trigger when an opponent's Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-075", as: "host", under: ["BT2-073"] }] },
      1: { battleArea: [{ card: "BT2-068", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("does not activate while Garurumon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-073", as: "garurumon" },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

    expect(s.state.memory).toBe(0);
  });
});
