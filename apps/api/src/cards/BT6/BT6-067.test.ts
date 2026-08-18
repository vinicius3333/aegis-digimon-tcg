import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-067.js";

describe("BT6-067 Gankoomon", () => {
  it("deletes all opposing Digimon tied for lowest play cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT6-067", as: "evolving" }] },
      1: { battleArea: ["BT1-010", "BT1-011", "BT2-020"] },
    }, { autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]?.topCard.cardId).toBe("BT2-020");
  });

  it("gains Security Attack +1 only while the opponent has an unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-067", as: "gankoomon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("gankoomon"), "SecurityAttack")).toBe(1);

    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("gankoomon"), "SecurityAttack")).toBe(0);
  });
});
