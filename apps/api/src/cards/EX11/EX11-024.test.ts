import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-024.js";

describe("EX11-024 Cendrillmon", () => {
  it("evolves from a yellow level 5 and resolves the When Digivolving reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-022", as: "base", dp: 7000 }], hand: [{ card: "EX11-024", as: "cendrill" }, "EX11-019"] },
        1: { battleArea: [{ card: "EX11-019", as: "opponent", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const opponent = s.perm("opponent");
    const initialDP = opponent.currentDP;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("cendrill").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-024" && opponent.currentDP < initialDP, 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-024");
    expect(opponent.currentDP).toBeLessThan(initialDP);
  });

  it("encodes Alliance, Overclock, Puppet play, Familiar scaling, and per-own-Digimon DP scaling", () => {
    const compiled = runtimeCompiledCard("EX11-024")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Yellow"], cost: 3, isAlternate: true }]);
    expect(compiled.effects.slice(0, 2)).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
      expect.objectContaining({ keywords: [{ keyword: "Overclock", raw: "＜Overclock ([Puppet] Trait)＞" }] }),
    ]));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }),
          expect.objectContaining({ kind: "PlayToken", tokens: ["Familiar"], scaling: expect.objectContaining({ unit: "cards", per: 1 }) }),
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      scaling: { unit: "cards", per: 1 },
    });
  });
});
