import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-189.js";

describe("P-189 Dimetromon", () => {
  it("plays an optional LIBERATOR card costing 4 or less from hand or trash in Security", () => {
    expect(runtimeCompiledCard("P-189")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand", "trash"],
          payCost: false,
          target: {
            count: 1,
            filter: { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it("grants Progress and gains one memory once per turn when your opponent's security is removed", () => {
    const card = runtimeCompiledCard("P-189")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Progress", raw: "＜Progress＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });

  it("exposes Progress on the live security tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-189", as: "tamer" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tamer"), "Progress")).toBe(true);
  });
});
