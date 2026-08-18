import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-065.js";

describe("BT7-065 Dorugoramon", () => {
  it("places an X-Antibody card from hand to delete up to 2 Digimon within its source-count play-cost limit", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-065", under: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"], as: "dorugoramon" }], hand: [{ card: "BT7-056", as: "placed" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target1" }, { card: "BT1-011", as: "target2" }], security: ["BT1-012"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("dorugoramon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("dorugoramon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
  });
});
