import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-014.js";

describe("BT14-014", () => {
  it("has Blast Digivolve", () => expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }));
  it("deletes an opposing 6000 DP or lower Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } });
  });

  it("deletes one opposing Digimon at 6000 DP or less on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT14-014", as: "metalgreymon" }] },
      1: { battleArea: [{ card: "BT1-020", as: "low" }, { card: "BT14-068", as: "high" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalgreymon").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
  });
});
