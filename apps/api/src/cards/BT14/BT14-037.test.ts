import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-037.js";

describe("BT14-037", () => {
  it("has Blast Digivolve and recovers one security when at five or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", condition: { kind: "zoneCount", value: 5 } });
  });
  it("scales the opposing DP reduction with your security count", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "ModifyDP", amount: -1000, scaling: { unit: "security", per: 1 } }));

  it("recovers at five security and scales one opposing Digimon by the pre-recovery count", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT14-037", as: "magna" }], security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"], deck: ["BT1-006"] },
      1: { battleArea: [{ card: "BT14-028", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    const target = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
    await settle(() => s.state.players[0]!.security.length === 6 && target()?.currentDP === 1000);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(target()?.currentDP).toBe(1000);
  });
});
