import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-182.js";

describe("P-182 WarGreymon", () => {
  it("encodes MetalGreymon and ADVENTURE alternate digivolution requirements", () => {
    expect(runtimeCompiledCard("P-182")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 5 },
    ]);
  });

  it("encodes Security Attack +1, Blocker, and DP-relative deletion", () => {
    const card = runtimeCompiledCard("P-182")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
  });

  it("adds 1000 DP per color among your Digimon and Tamers", () => {
    expect(runtimeCompiledCard("P-182")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine", kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
  });

  it("exposes Security Attack +1 and Blocker on the live WarGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-182", as: "wargrey" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("wargrey"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("wargrey"), "Blocker")).toBe(true);
  });
});
