import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-047.js";

describe("BT7-047 MetalKabuterimon", () => {
  it("digivolves onto a green Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-089", as: "base" }], hand: [{ card: "BT7-047", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-047");
  });

  it("suspends an opposing 6000-DP-or-less Digimon with a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-046", as: "base" }], hand: [{ card: "BT7-047", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
