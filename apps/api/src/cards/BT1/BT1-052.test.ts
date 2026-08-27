import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-052.js";

describe("BT1-052 Seasarmon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-052", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "attacker" }] },
      1: { security: ["BT1-080"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-052");
  });

  it("is still deleted when it loses a battle against a Digimon in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-080", as: "target", dp: 20000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-052")).toBe(true);
  });
});
