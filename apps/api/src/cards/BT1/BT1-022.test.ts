import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-022.js";

describe("BT1-022 Garudamon", () => {
  it("has Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-022", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
  });

  it("draws 1 when its host is blocked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-023", under: ["BT1-022"], as: "attacker", dp: 7000 }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 6000 }], security: ["BT1-011"] },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, {
      type: "declareBlock",
      blockerPermanentId: s.perm("blocker").permanentId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("drawn").instanceId,
    ));

    expect(s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("drawn").instanceId,
    )).toBe(true);
  });
});
