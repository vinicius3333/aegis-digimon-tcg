import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-066.js";

describe("BT7-066 AncientVolcanomon", () => {
  it("de-digivolves an opposing Digimon by up to 3 cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT7-066", as: "evolving" }] }, 1: { battleArea: [{ card: "BT7-066", under: ["BT1-001", "BT1-009", "BT1-010", "BT1-011"], as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    // `under` is declared bottom-most first. Removing AncientVolcanomon and the next
    // 2 cards therefore exposes the last declared source, BT1-011.
    expect(s.perm("target").topCard?.cardId).toBe("BT1-011");
  });
});
