import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-029.js";

describe("BT18-029 AncientMermaimon", () => {
  it("raises its return level ceiling for each other Digimon", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Return", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } }, { kind: "CostModifier", mode: "raiseCeiling", costType: "level", amount: 1, scaling: { unit: "cards", filter: { excludeSelf: true, kind: ["Digimon"] } } }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-029", as: "ancient" }], battleArea: [{ card: "BT1-030", as: "other" }] }, 1: { battleArea: [{ card: "BT1-019", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
