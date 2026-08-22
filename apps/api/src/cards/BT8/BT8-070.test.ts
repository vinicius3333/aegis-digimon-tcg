import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-070.js";

describe("BT8-070 BlackWarGreymon", () => {
  it("publishes and applies one combined play-cost-6 budget for opposing Digimon and Tamers", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-065", under: ["BT1-021"], as: "base" }], hand: [{ card: "BT8-070", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-009", as: "digimon" }, { card: "BT8-093", as: "tamer" }, { card: "BT1-015", as: "tooExpensive" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooExpensive").topCard?.cardId).toBe("BT1-015");
  });

  it("may unsuspend once when its digivolution effect deletes an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-065", under: ["BT1-021"], as: "base", suspended: true }],
        hand: [{ card: "BT8-070", as: "evolving" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009") &&
      !s.perm("base").isSuspended
    );

    expect(s.perm("base").isSuspended).toBe(false);
  });
});
