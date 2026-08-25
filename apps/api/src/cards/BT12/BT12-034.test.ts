import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-034.js";

describe("BT12-034 Agumon", () => {
  it("has only the printed zero-cost Koromon evolution route", () => {
    expect(digivolutionRequirementsFor("BT12-034")).toContainEqual({
      namesExact: ["Koromon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("reveals four and mandatorily adds both Greymon and Marcus branches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-034", as: "agumon" }],
          deck: ["BT12-038", "BT12-092", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-038", "BT12-092"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("adds the single available search branch", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-034", as: "agumon" }], deck: ["BT12-092", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-092"]);
  });

  it("inherited effect responds once to an owned red or yellow Tamer suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-038", as: "host", under: ["BT12-034"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    await advance(s.engine).verb.unsuspend([s.perm("marcus").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
  });
});
