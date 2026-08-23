import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
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
});
