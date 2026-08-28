import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-047.js";

describe("BT14-047", () => {
  it("suspends an opposing Digimon and prevents opposing Digimon at 5000 DP or less from unsuspending on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend" },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { count: "all", filter: { dp: { op: "lte", value: 5000 } } },
          },
        ],
      });
  });

  it("suspends one opposing Digimon on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-047", as: "dokugumon" }] }, 1: { battleArea: [{ card: "BT14-042", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.isSuspended));
    expect(s.state.players[1]!.battleArea.some((p) => p.isSuspended)).toBe(true);
  });

  it("naturally prevents a qualifying opposing Digimon from unsuspending next turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-047", as: "dokugumon" }] },
        1: { battleArea: [{ card: "BT14-042", as: "target" }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
