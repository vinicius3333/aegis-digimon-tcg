import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-178.js";

describe("P-178 Sagittarimon", () => {
  it("encodes Veemon Armor digivolution and Armor Purge", () => {
    const card = runtimeCompiledCard("P-178")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Veemon"], cost: 2, isAlternate: true }]);
    expect(card.effects[0]).toMatchObject({ keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] });
  });

  it("reduces an opponent by 3000 DP on digivolution and deletes an opponent at 4000 DP or less when attacking", () => {
    const card = runtimeCompiledCard("P-178")!;
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: -3000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
        },
      ],
    });
  });

  it("exposes Armor Purge on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-178", as: "sagitta" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("sagitta"), "Armor Purge")).toBe(true);
  });
});
