import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-021.js";

describe("EX11-021 Kokeshimon", () => {
  it("legally evolves from a Puppet level 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-019", as: "base", dp: 2000 }], hand: [{ card: "EX11-021", as: "kokeshi" }, "EX11-061"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("kokeshi").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-021", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-021");
  });

  it("encodes conditional Mirai play and the cost-gated inherited EndAttack", () => {
    const compiled = runtimeCompiledCard("EX11-021")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Puppet"], cost: 2, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveFewOrEqual", count: 1 } }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOpponentAttacks",
        optional: true,
        abortOnDecline: true,
        actions: [expect.objectContaining({ kind: "Delete", cost: true, target: expect.objectContaining({ filter: expect.objectContaining({ excludeSelf: true }) }) }), { kind: "EndAttack" }],
      }],
    }));
  });
});
