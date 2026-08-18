import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-001.js";

describe("BT3-001 Poromon", () => {
  it("deletes an opposing 1000 DP Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "host", under: ["BT3-001"] }] },
      1: { battleArea: [{ card: "BT1-011", as: "target" }], security: ["BT1-012"] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011"), 5000);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
  });
});
