import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT2/BT2-055.js";
import "./BT5-068.js";
import "./BT5-069.js";

describe("BT5-068 BlackMachGaogamon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-068")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Reboot without immediately unsuspending and gives its host +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-068", as: "mach", suspended: true },
          { card: "BT5-069", as: "host", under: ["BT5-068"] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("mach"), "Reboot")).toBe(true);
    expect(s.perm("mach").isSuspended).toBe(true);
    expect(s.perm("mach").currentDP).toBe(7_000);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("recomputes the inherited +2000 DP after a real digivolution into a Reboot Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-068", as: "base" }],
        hand: [{ card: "BT5-069", as: "blackWarGreymon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blackWarGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-069" && s.perm("base").currentDP === 14_000);

    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT5-068");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(s.perm("base").baseDP).toBe(12_000);
    expect(s.perm("base").currentDP).toBe(14_000);
  });

  it("applies the inherited bonus only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-069", as: "host", under: ["BT5-068"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(14_000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12_000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(14_000);
  });

  it("gets +2000 DP when Reboot is granted by another inherited source later in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT2-064",
            as: "host",
            under: ["BT5-068", "BT2-055"],
          },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(s.perm("host").baseDP).toBe(12_000);
    expect(s.perm("host").currentDP).toBe(14_000);
  });
});
