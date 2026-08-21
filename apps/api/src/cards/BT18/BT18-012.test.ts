import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-012.js";

describe("BT18-012 Grumblemon", () => {
  it("deletes an opposing Digimon at 3000 DP or less on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-012", as: "grumblemon" }] }, 1: { battleArea: [{ card: "BT1-030", dp: 3000, as: "small" }, { card: "BT1-030", dp: 4000, as: "large" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    const smallId = s.perm("small").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grumblemon").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);
  });
});
