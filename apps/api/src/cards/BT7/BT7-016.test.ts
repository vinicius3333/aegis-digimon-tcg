import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-062.js";
import "./BT7-016.js";

describe("BT7-016 EmperorGreymon", () => {
  it("unsuspends and gains 1 memory per Hybrid source when blocked, once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-016", under: ["BT7-011", "BT7-014"], as: "emperor" }] },
      1: { battleArea: [{ card: "BT5-062", as: "blocker" }], security: ["BT1-001"] },
    });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("emperor").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("emperor").isSuspended && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT7-016", as: "evolving" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("does not react when a different Digimon is blocked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-016", under: ["BT7-011", "BT7-014"], as: "emperor", suspended: true },
          { card: "BT7-014", as: "otherAttacker" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBlocked", {
      attackerPermanentId: s.perm("otherAttacker").permanentId,
    });

    expect(s.perm("emperor").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
