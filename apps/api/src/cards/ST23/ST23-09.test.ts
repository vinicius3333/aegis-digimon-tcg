import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-09.js";

describe("ST23-09 Fenriloogamon", () => {
  it("deletes the opponent's lowest-DP Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-08", as: "base" }], hand: [{ card: "ST23-09", as: "fenriloogamon" }], deck: ["BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "low", dp: 3000 }, { card: "BT1-009", as: "high", dp: 5000 }], deck: ["BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    await s.ready();
    const lowId = s.perm("low").topCard!.instanceId;
    const highId = s.perm("high").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("fenriloogamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-09" && s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-09");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === highId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowId)).toBe(true);
  });
});
