import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-032.js";

describe("BT18-032 Luxmon", () => {
  it("reduces one opposing Digimon by 2000 when its host attacks", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-032"] }] }, 1: { battleArea: [{ card: "BT1-030", dp: 5000, as: "target" }] } });
    s.state.memory = 0;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId)!.currentDP === 3000);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId)!.currentDP).toBe(3000);
  });
});
