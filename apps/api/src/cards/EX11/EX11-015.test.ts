import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-015.js";

describe("EX11-015 Frigimon", () => {
  it("legally evolves from an Ice-Snow level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-014", as: "base", dp: 2000 }],
          hand: [{ card: "EX11-015", as: "frigimon" }, { card: "EX11-057", as: "suzune" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("frigimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-015", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-015");
  });

  it("encodes the Ice-Snow evolution, one-or-fewer-Tamers condition, and inherited Jamming", () => {
    const compiled = runtimeCompiledCard("EX11-015")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Ice-Snow"], cost: 2, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        condition: { kind: "youHave", raw: "you have 1 or fewer Tamers" },
        target: expect.objectContaining({ count: 1 }),
      }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }));
  });
});
