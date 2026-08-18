import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-069.js";

describe("BT11-069 MetalGreymon (X Antibody)", () => {
  it("gains both protections and deletes a 6000-DP-or-less Digimon with a matching source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-064", as: "base" }], hand: [{ card: "BT11-069", as: "metal" }] },
        1: { battleArea: [{ card: "BT1-015", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });
});
