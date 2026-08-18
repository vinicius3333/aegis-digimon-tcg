import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-018.js";

describe("P-018 Devimon", () => {
  it("deletes a level 3 opponent Digimon and leaves a level 4 target", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-018", as: "devimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "level3" }, { card: "BT1-027", as: "level4" }] } }, { autoSelectCards: true });
    const p1 = s.state.players[1]!;
    const level3 = s.perm("level3");
    const level4 = s.perm("level4");
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === level3.permanentId));
    expect(p1.battleArea.some((p) => p.permanentId === level3.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === level4.permanentId)).toBe(true);
  });
});
