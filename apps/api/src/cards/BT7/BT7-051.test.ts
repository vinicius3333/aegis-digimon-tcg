import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-051.js";

describe("BT7-051 RhinoKabuterimon", () => {
  it("digivolves into an Insectoid or Ten Warriors card for 3 memory when attacking with a qualifying source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-051", under: ["BT6-049"], as: "rhino" }], hand: [{ card: "BT7-054", as: "ancient" }], deck: ["BT1-010"] },
      1: { security: ["BT1-101"] },
    }, { autoSelectCards: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("rhino").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("rhino").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
