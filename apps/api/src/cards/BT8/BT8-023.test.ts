import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-023.js";

describe("BT8-023 Submarimon", () => {
  it("trashes a bottom source, then gives a source-less Digimon -3000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT8-023", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-009", under: [{ card: "BT1-001", as: "bottom" }], as: "withSource" }, { card: "BT1-015", as: "sourceLess" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("withSource").permanentId, s.perm("sourceLess").permanentId);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sourceLess").currentDP === 1000);
    expect(s.state.players[1]!.trash.some(card => card.instanceId === s.inst("bottom").instanceId)).toBe(true);
  });
});
