import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-086.js";

describe("BT5-086 Omnimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-086")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("unsuspends itself and gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-004", as: "base", suspended: true }], hand: [{ card: "BT5-086", as: "evolving" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));

    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("trashes a level 6 source to prevent deletion by an opponent's effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-086", as: "omni", under: [{ card: "AD1-004", as: "level6" }, "BT5-024"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const level6Id = s.inst("level6").instanceId;
    const omnimonPermanentId = s.perm("omni").permanentId;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await (s.engine as any).primitives.deletePermanent([omnimonPermanentId], "byEffect");
    await settle(() => s.state.players[0]?.trash.some((card) => card.instanceId === level6Id) === true);

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === omnimonPermanentId)).toBe(true);
    expect(s.perm("omni").stack.some((card) => card.instanceId === level6Id)).toBe(false);
    expect(s.perm("omni").stack.map((card) => card.cardId)).toEqual(["BT5-024"]);
  });
});
