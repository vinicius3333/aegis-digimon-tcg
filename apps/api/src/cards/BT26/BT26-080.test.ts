import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-080.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-080 compiled behavior", () => {
  it("proves dual-card keywords, TS waiver, Bacchusmon evolution, and both Main steps", () => {
    expect(compiled.coverage).toBe("partial");
    expect(compiled.residual).toHaveLength(1);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true }]);
    expect(compiled.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Succession" }),
    ]));
    expect(compiled.effects[0].actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } } });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "Attack", withoutSuspending: true, cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } } }] });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({ actions: [
      { kind: "Unsuspend", optional: true, target: { filter: { kind: ["Digimon"] }, count: 1 } },
      { kind: "Delete", target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true, superlative: "lowestDP" } } },
    ] });
  });

  it("encodes Q7112 as a source-relative live orientation filter", () => {
    expect(compiled.residual[0]).toContain("Behavioral proof is pending");
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], sameOrientationAsSource: true } },
    });
  });

  it("deletes only an opposing Digimon with the same live orientation", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-080", as: "source", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "same", suspended: true },
          { card: "BT1-011", as: "different", suspended: false },
        ],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenAttacking, s.perm("source"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });
});
