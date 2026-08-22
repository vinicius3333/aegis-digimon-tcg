import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11-009 Tyrannomon", () => {
  it("encodes the alternate Reptile evolution and conditional optional play", () => {
    const compiled = runtimeCompiledCard("EX11-009")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Reptile"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: expect.objectContaining({ filter: expect.objectContaining({ nameOrTrait: [{ match: "name", tokens: ["Ryutaro Williams"] }] }), count: 1 }),
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] }, raw: "you have 1 or fewer Tamers" },
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000, duration: "permanent" })],
    });
  });

  it("evolves from a Reptile and plays Ryutaro without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "base", dp: 1000 }],
          hand: [{ card: "EX11-009", as: "tyrannomon" }, { card: "EX11-056", as: "ryutaro" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const base = s.perm("base");

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("tyrannomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "EX11-009", 600);
    expect(base.topCard?.cardId).toBe("EX11-009");
  });
});
