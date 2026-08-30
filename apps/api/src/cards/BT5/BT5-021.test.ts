import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-021.js";

describe("BT5-021 Syakomon", () => {
  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
    expect((s.engine as any).continuous.blocksCostReduction(1, "play")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);
  });

  it("prevents an opponent's Digisorption reduction during a real digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] },
        1: {
          battleArea: [
            { card: "BT1-072", as: "base" },
            { card: "BT1-072", as: "suspendCost", suspended: true },
          ],
          hand: [{ card: "BT3-054", as: "blossomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -10;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blossomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-072");
    expect(s.perm("suspendCost").isSuspended).toBe(true);
  });

  it("does not apply while Syakomon is only a digivolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-023", as: "host", under: ["BT5-021"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();

    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);
  });

  it("does not suppress an explicitly fixed-cost effect digivolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] },
      1: { battleArea: [{ card: "BT1-072", as: "base" }], hand: [{ card: "BT3-054", as: "blossomon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("blossomon").instanceId, {
      costOverride: 1,
      ignoreRequirements: true,
      payCost: true,
    });
    expect(s.perm("base").topCard.cardId).toBe("BT3-054");
  });
});
