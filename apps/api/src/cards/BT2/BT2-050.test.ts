import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-050.js";

describe("BT2-050 Argomon", () => {
  it("may suspend one of its Digimon to reduce its digivolution cost by 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-046", as: "base" }, { card: "BT2-043", as: "payer" }], hand: [{ card: "BT2-050", as: "evolving" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("payer").topCard!.instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("payer").isSuspended &&
        s.perm("base").topCard?.cardId === "BT2-050" &&
        s.state.memory === 3,
    );
    expect(s.state.memory).toBe(3);
  });

  it("gains Security Attack +1 for each other suspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-050", as: "argomon" }, { card: "BT1-010", suspended: true }, { card: "BT1-011", suspended: true }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("argomon"), "SecurityAttack")).toBe(2);
  });
});
