import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-019.js";

describe("BT18-019 Millenniummon", () => {
  it("deletes one opposing Digimon on play and retains the DNA-only return clause", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }, { kind: "GainMemory", condition: { kind: "isDnaDigivolving" }, scaling: { unit: "namedCount", countSource: "returnedDistinctLevels" } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", cost: { kind: "return", target: { filter: { nameOrTrait: [{ tokens: ["Kimeramon"], match: "name" }, { tokens: ["Machinedramon"], match: "name" }] }, count: 2, distinctNames: true } } }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-019", as: "millennium" }] }, 1: { battleArea: [{ card: "BT1-030", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("millennium").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
