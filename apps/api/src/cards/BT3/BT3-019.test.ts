import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-019.js";

describe("BT3-019 RagnaLoardmon", () => {
  it("places a Legend-Arms card under itself, gains 3 memory, and has its keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base" }],
          hand: [
            { card: "BT3-019", as: "evolving" },
            { card: "BT3-016", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const materialId = s.inst("material").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((c) => c.instanceId === materialId));
    await settle();
    await s.engine.recomputeContinuousEffects();
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.some((c) => c.instanceId === materialId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
  });

  it("does not gain memory when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base" }],
          hand: [
            { card: "BT3-019", as: "evolving" },
            { card: "BT3-016", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack).toHaveLength(1);
  });
});
