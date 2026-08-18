import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-094.js";

describe("BT6-094 Red Reamer", () => {
  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-094", as: "security", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes 1 opposing Digimon with 6000 DP or less when the opponent has fewer than 3", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-007"], hand: [{ card: "BT6-094", as: "option" }] },
      1: { battleArea: [{ card: "BT1-009", as: "low", dp: 3000 }, { card: "BT6-044", as: "high", dp: 12000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 6;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highId]);
  });

  it("uses only the 13000-DP branch when the opponent has 3 or more Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-007"], hand: [{ card: "BT6-094", as: "option" }] },
      1: { battleArea: [
        { card: "BT6-044", as: "chosen", dp: 12000 },
        { card: "BT1-009", as: "low", dp: 3000 },
        { card: "BT1-014", as: "other", dp: 4000 },
      ] },
    }, { autoSelectCards: true });
    s.state.memory = 6;
    const chosenId = s.perm("chosen").permanentId;
    const lowId = s.perm("low").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === chosenId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId)).toBe(true);
  });
});
