import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-022.js";

describe("BT7-022 KendoGarurumon", () => {
  it("digivolves onto a blue Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-087", as: "base" }], hand: [{ card: "BT7-022", as: "evolving" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Jamming"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-022");
  });

  it("gains Jamming when it has a Hybrid source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-021", as: "base" }], hand: [{ card: "BT7-022", as: "evolving" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Jamming"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });
});
