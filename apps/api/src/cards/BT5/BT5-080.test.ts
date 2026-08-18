import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-080.js";

describe("BT5-080 Zanbamon", () => {
  it("deletes the opposing Digimon with Retaliation after losing a battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-080", as: "zanba" }] }, 1: { battleArea: [{ card: "BT4-073", as: "strong", suspended: true, dp: 13000 }] } });
    const strongId = s.perm("strong").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("zanba").permanentId, target: { kind: "permanent", permanentId: strongId } })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === strongId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === strongId)).toBe(false);
  });
});
