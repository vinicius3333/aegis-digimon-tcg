import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-071.js";
import "../index.js";
describe("BT21-071 Scopemon", () => {
  it("gains memory after placing an Appmon or Three Musketeers card", () => {
    for (const e of compiled.effects.filter((effect) => ["OnPlay", "WhenDigivolving"].includes(effect.trigger)))
      expect(e.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place" },
      });
  });

  it("draws 2 and trashes 2 when linked", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects[0]).toEqual({
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      ],
    });
  });

  it("keeps the evolution requirement and complete coverage metadata", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places an Appmon under an own Digimon and gains memory on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [{ card: "BT21-071", as: "scopemon" }, { card: "BT21-041", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scopemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("appmon").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });
});
