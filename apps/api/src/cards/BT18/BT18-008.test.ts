import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-008.js";

describe("BT18-008 Goblimon", () => {
  it("deletes one opposing Digimon at 2000 DP or less on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 2000 } }, count: 1 } }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-008", as: "goblimon" }] }, 1: { battleArea: [{ card: "BT1-030", dp: 2000, as: "small" }, { card: "BT1-030", dp: 3000, as: "large" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    const smallId = s.perm("small").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);
  });
});
