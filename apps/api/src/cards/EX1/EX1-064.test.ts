import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-064.js";

describe("EX1-064 Piedmon", () => {
  it("deletes up to 4 unsuspended level-4-or-lower Digimon and draws only once for the simultaneous deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
            { card: "BT1-011", as: "three" },
            { card: "BT1-012", as: "four" },
            { card: "EX1-061", as: "level5" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([
      s.perm("level5").permanentId,
      s.perm("suspended").permanentId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("deletes the available target when fewer than four legal targets exist", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "onlyTarget" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does nothing and draws nothing when there are no legal targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX1-061", as: "levelFive" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-064"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once for separate opponent deletions in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-064"));

    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("second").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
