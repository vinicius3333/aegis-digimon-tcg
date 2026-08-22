import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-025.js";

describe("EX11-025 FunBeemon", () => {
  it("legally evolves from a Royal Base level 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-003", as: "base", dp: 0 }], hand: [{ card: "EX11-025", as: "funbeemon" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("funbeemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-025", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-025");
  });

  it("encodes Security Reboot, face-up bottom placement, and inherited DP", () => {
    const compiled = runtimeCompiledCard("EX11-025")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" }, target: { count: "all" } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", amount: 1, toTop: true },
        { kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], toTop: false, faceUp: true, optional: true },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({ isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
